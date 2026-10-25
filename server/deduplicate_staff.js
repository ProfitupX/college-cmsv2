import db from './db.js';

export function getStaffMatchingKeys(st) {
  if (!st) return [];
  const keys = new Set();

  // 1. Cleaned full name tokenized & sorted
  let rawName = (st.name || '').toLowerCase().replace(/^(dr|mr|mrs|ms|prof)\.?\s*/i, '').trim();
  const tokens = rawName.split(/[\s\.\-_]+/).filter(t => t.length > 0);
  if (tokens.length > 0) {
    keys.add('name_tokens:' + [...tokens].sort().join('_'));
    const longTokens = tokens.filter(t => t.length >= 4);
    if (longTokens.length > 0) {
      keys.add(`root_name:${longTokens.sort().join('_')}`);
    }
  }

  // 2. Email root
  if (st.email) {
    let emailPrefix = st.email.toLowerCase().split('@')[0];
    emailPrefix = emailPrefix.replace(/(\.it|\.cse|\.ece|\.mech|\.civil|\.eee|\.sh|\.aids|\.phy|\.chem|\.maths|\.eng|\.tamil|\.pd)$/i, '');
    emailPrefix = emailPrefix.replace(/^[a-z][\._]/, '').replace(/[\._][a-z]$/, '');
    const cleanEmail = emailPrefix.replace(/[^a-z]/g, '');
    if (cleanEmail.length >= 4) {
      keys.add('email_root:' + cleanEmail);
    }
  }

  // 3. Compact full name
  let compactName = (st.name || '').toLowerCase()
    .replace(/^(dr|mr|mrs|ms|prof)\.?\s*/i, '')
    .replace(/[^a-z]/g, '');
  if (compactName.length >= 5) {
    keys.add('compact_name:' + compactName);
    const strippedInitials = compactName.replace(/^[a-z]{1,2}(?=[a-z]{4,})/, '');
    if (strippedInitials.length >= 4) {
      keys.add('stripped_name:' + strippedInitials);
    }
  }

  return Array.from(keys);
}

export async function runStaffDeduplication() {
  console.log('🔄 Checking and merging duplicate staff accounts across all departments...');
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [staffs] = await conn.query('SELECT id, name, designation, department, email, employee_id, role, class_role, is_password_changed FROM staffs ORDER BY id ASC');

    // Build connected components using Disjoint Set Union (DSU)
    const parent = new Map();
    staffs.forEach(s => parent.set(s.id, s.id));

    function find(x) {
      if (parent.get(x) !== x) parent.set(x, find(parent.get(x)));
      return parent.get(x);
    }

    function union(x, y) {
      const rx = find(x), ry = find(y);
      if (rx !== ry) parent.set(rx, ry);
    }

    const keyToStaff = new Map();

    staffs.forEach(s => {
      const keys = getStaffMatchingKeys(s);
      keys.forEach(k => {
        if (!keyToStaff.has(k)) {
          keyToStaff.set(k, s.id);
        } else {
          const otherId = keyToStaff.get(k);
          const otherStaff = staffs.find(x => x.id === otherId);
          const deptA = (s.department || '').toLowerCase();
          const deptB = (otherStaff.department || '').toLowerCase();
          const deptMatch = deptA === deptB || deptA.includes('science') || deptB.includes('science');

          if (deptMatch) {
            union(s.id, otherId);
          }
        }
      });
    });

    const clusters = new Map();
    staffs.forEach(s => {
      const root = find(s.id);
      if (!clusters.has(root)) clusters.set(root, []);
      clusters.get(root).push(s);
    });

    let mergedCount = 0;

    for (const members of clusters.values()) {
      if (members.length <= 1) continue;

      // Select primary staff record
      members.sort((a, b) => {
        const score = (x) => {
          let s = 0;
          if (x.role === 'hod') s += 50;
          if (x.employee_id && x.employee_id.startsWith('NSCET-')) s += 30;
          if (x.id && x.id.startsWith('FAC')) s += 20;
          if (x.is_password_changed === 1) s += 15;
          if (x.email && !x.email.includes('.it@') && !x.email.includes('.sh@') && !x.email.includes('.cse@')) s += 10;
          if (x.employee_id && !x.employee_id.startsWith('SH')) s += 10;
          return s;
        };
        return score(b) - score(a);
      });

      const primary = members[0];
      const duplicates = members.slice(1);

      console.log(`\n📌 Primary: [${primary.id}] ${primary.name} (${primary.email}, Emp: ${primary.employee_id}, Dept: ${primary.department}, Role: ${primary.role})`);

      for (const dup of duplicates) {
        console.log(`   Merging Duplicate: [${dup.id}] ${dup.name} (${dup.email}, Emp: ${dup.employee_id})`);

        // 1. Reassign subjects
        const [subRes] = await conn.execute('UPDATE subjects SET faculty_id = ? WHERE faculty_id = ?', [primary.id, dup.id]);
        if (subRes.affectedRows > 0) {
          console.log(`     Reassigned ${subRes.affectedRows} subjects to ${primary.id}`);
        }

        // 2. Reassign marks sessions
        const [msRes] = await conn.execute('UPDATE marks_sessions SET staff_id = ? WHERE staff_id = ?', [primary.id, dup.id]);
        if (msRes.affectedRows > 0) {
          console.log(`     Reassigned ${msRes.affectedRows} marks sessions to ${primary.id}`);
        }

        // 3. Reassign marks history if any
        try {
          await conn.execute('UPDATE marks_history SET staff_id = ? WHERE staff_id = ?', [primary.id, dup.id]);
        } catch (_) {}

        // 4. Reassign mark unlock requests if any
        try {
          await conn.execute('UPDATE mark_unlock_requests SET staff_id = ? WHERE staff_id = ?', [primary.id, dup.id]);
        } catch (_) {}

        // 5. Update classes coordinators
        await conn.execute('UPDATE classes SET class_coordinator = ? WHERE class_coordinator = ? OR class_coordinator = ?', [primary.name, dup.id, dup.name]);
        await conn.execute('UPDATE classes SET asst_coordinator = ? WHERE asst_coordinator = ? OR asst_coordinator = ?', [primary.name, dup.id, dup.name]);

        // 6. Delete duplicate record from staffs
        await conn.execute('DELETE FROM staffs WHERE id = ?', [dup.id]);
        mergedCount++;
      }

      // Upgrade primary privileges if duplicate had higher privileges
      const anyHod = members.some(m => m.role === 'hod');
      const anyClassCoord = members.some(m => m.class_role === 'Class Coordinator' || m.role === 'class_coordinator');
      if (anyHod && primary.role !== 'hod') {
        await conn.execute("UPDATE staffs SET role = 'hod' WHERE id = ?", [primary.id]);
      }
      if (anyClassCoord && !primary.class_role) {
        await conn.execute("UPDATE staffs SET class_role = 'Class Coordinator' WHERE id = ?", [primary.id]);
      }
    }

    await conn.commit();
    console.log(`\n✅ Staff deduplication complete! Successfully merged ${mergedCount} duplicate accounts.`);
    return mergedCount;
  } catch (err) {
    await conn.rollback();
    console.error('❌ Staff deduplication failed (rolled back):', err.message);
    throw err;
  } finally {
    conn.release();
  }
}

// Run if executed directly
if (process.argv[1]?.endsWith('deduplicate_staff.js')) {
  runStaffDeduplication().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
