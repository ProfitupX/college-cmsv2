import express from 'express';
import db from '../db.js';
import { getStaffMatchingKeys } from '../deduplicate_staff.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// GET /api/admin/staffs
// List all staffs for the Admin Panel
// ─────────────────────────────────────────────────────────────
router.get('/staffs', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, name, short_name, email, role, department, is_password_changed FROM staffs ORDER BY name ASC'
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /admin/staffs error:', err);
    res.status(500).json({ error: 'Failed to fetch staffs.' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/admin/credentials
// List all staff credentials (including email, password, role)
// ─────────────────────────────────────────────────────────────
router.get('/credentials', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, name, short_name, designation, role, email, password, employee_id, department, is_password_changed FROM staffs ORDER BY name ASC'
    );
    // Deduplicate by email so Manage Staffs displays a single unified entry per person
    const seen = new Map();
    rows.forEach(r => { if (!r.password) r.password = 'faculty123'; });
    rows.forEach(r => {
      const key = (r.email || '').toLowerCase().trim() || r.id;
      if (!seen.has(key)) {
        seen.set(key, { ...r });
      } else {
        const existing = seen.get(key);
        // Prioritize any changed or non-default password so it reflects directly in Manage Staffs
        const existingHasChanged = existing.is_password_changed || (existing.password && existing.password !== 'faculty123');
        const rHasChanged = r.is_password_changed || (r.password && r.password !== 'faculty123');

        if (rHasChanged && !existingHasChanged) {
          existing.password = r.password;
          existing.is_password_changed = r.is_password_changed || 1;
        }

        if (r.role === 'hod') existing.role = 'hod';
        if (r.employee_id && !existing.employee_id) existing.employee_id = r.employee_id;
        if (r.designation && !existing.designation) existing.designation = r.designation;
        if (r.department && !existing.department) existing.department = r.department;
      }
    });
    res.json(Array.from(seen.values()));
  } catch (err) {
    console.error('GET /admin/credentials error:', err);
    res.status(500).json({ error: 'Failed to fetch staff credentials.' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/admin/credentials
// Create a new staff account credential
// ─────────────────────────────────────────────────────────────
router.post('/credentials', async (req, res) => {
  try {
    const { id, name, short_name, designation, email, password, role, employee_id, department } = req.body;
    if (!id || !name || !email) {
      return res.status(400).json({ error: 'Staff ID, Name, and Email are required.' });
    }

    const pwdValue = password || null;

    await db.execute(
      `INSERT INTO staffs (id, name, short_name, designation, role, email, password, employee_id, department)
       VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, 'faculty123'), ?, ?)
       ON DUPLICATE KEY UPDATE
         name=VALUES(name), short_name=VALUES(short_name), designation=VALUES(designation),
         role=VALUES(role), email=VALUES(email),
         password=IF(VALUES(password) IS NOT NULL AND VALUES(password) != '', VALUES(password), password),
         employee_id=VALUES(employee_id), department=VALUES(department)`,
      [id, name, short_name || null, designation || null, role || 'faculty', email, pwdValue, employee_id || null, department || null]
    );

    res.status(201).json({ success: true, message: 'Staff credential saved successfully.' });
  } catch (err) {
    console.error('POST /admin/credentials error:', err);
    res.status(500).json({ error: err.message || 'Failed to save staff credential.' });
  }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/admin/credentials/:id
// Update email, password, role, etc. for a staff account
// ─────────────────────────────────────────────────────────────
router.put('/credentials/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, password, name, short_name, designation, role, employee_id, department } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    let sql = `UPDATE staffs SET email = ?, role = ?`;
    const params = [email, role || 'faculty'];

    if (password) {
      sql += `, password = ?, is_password_changed = 0`;
      params.push(password);
    }
    if (name) {
      sql += `, name = ?`;
      params.push(name);
    }
    if (short_name !== undefined) {
      sql += `, short_name = ?`;
      params.push(short_name);
    }
    if (designation !== undefined) {
      sql += `, designation = ?`;
      params.push(designation);
    }
    if (employee_id !== undefined) {
      sql += `, employee_id = ?`;
      params.push(employee_id);
    }
    if (department !== undefined) {
      sql += `, department = ?`;
      params.push(department);
    }

    sql += ` WHERE id = ?`;
    params.push(id);

    const [result] = await db.execute(sql, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Staff member not found.' });
    }

    res.json({ success: true, message: 'Staff credentials updated successfully.' });
  } catch (err) {
    console.error('PUT /admin/credentials error:', err);
    res.status(500).json({ error: err.message || 'Failed to update staff credentials.' });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/admin/credentials/:id
// Delete staff account
// ─────────────────────────────────────────────────────────────
router.delete('/credentials/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.execute('DELETE FROM staffs WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Staff member not found.' });
    }

    res.json({ success: true, message: 'Staff account deleted successfully.' });
  } catch (err) {
    console.error('DELETE /admin/credentials error:', err);
    res.status(500).json({ error: 'Failed to delete staff account.' });
  }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/admin/reset-password
// Admin can reset a staff member's password
// ─────────────────────────────────────────────────────────────
router.put('/reset-password', async (req, res) => {
  try {
    const { staffId, newPassword } = req.body;
    if (!staffId || !newPassword) {
      return res.status(400).json({ error: 'staffId and newPassword are required.' });
    }

    const [staffRows] = await db.execute('SELECT email FROM staffs WHERE id = ?', [staffId]);
    const staffEmail = (staffRows[0]?.email || '').trim().toLowerCase();

    let result;
    if (staffEmail) {
      [result] = await db.execute(
        'UPDATE staffs SET password = ?, is_password_changed = 0 WHERE id = ? OR (LOWER(email) = ? AND email != "")',
        [newPassword, staffId, staffEmail]
      );
    } else {
      [result] = await db.execute(
        'UPDATE staffs SET password = ?, is_password_changed = 0 WHERE id = ?',
        [newPassword, staffId]
      );
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Staff member not found.' });
    }

    res.json({ success: true, message: 'Password reset successfully.' });
  } catch (err) {
    console.error('PUT /admin/reset-password error:', err);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/admin/staff-classes
// Returns all staff members and all classes and subjects they teach / coordinate
// ─────────────────────────────────────────────────────────────
router.get('/staff-classes', async (req, res) => {
  try {
    const [staffs] = await db.query(`
      SELECT id, name, designation, department, email, employee_id, role, class_role
      FROM staffs
      ORDER BY name ASC
    `);

    const [subjects] = await db.query(`
      SELECT s.id, s.code, s.name, s.type, s.ltpc, s.total_hours, s.faculty_id,
             c.id AS class_id, c.name AS class_name, c.year_label, c.semester, c.department AS class_department
      FROM subjects s
      JOIN classes c ON c.id = s.class_id
      ORDER BY FIELD(c.year_label, 'IV', 'III', 'II', 'I'), c.name ASC, s.code ASC
    `);

    const [classes] = await db.query(`
      SELECT id, name, year_label, semester, department, class_coordinator, asst_coordinator
      FROM classes
      ORDER BY FIELD(year_label, 'IV', 'III', 'II', 'I'), name ASC
    `);

    // Unified deduplication across all departments & years
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
          const deptB = (otherStaff?.department || '').toLowerCase();
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

    const unifiedList = [];

    for (const members of clusters.values()) {
      // Pick primary record
      members.sort((a, b) => {
        const score = (x) => {
          let s = 0;
          if (x.role === 'admin' || x.role === 'principal' || x.role === 'vice_principal') s += 100;
          if (x.role === 'hod') s += 50;
          if (x.employee_id && x.employee_id.startsWith('NSCET-')) s += 30;
          if (x.id && x.id.startsWith('FAC')) s += 20;
          if (x.email && !x.email.includes('.it@') && !x.email.includes('.sh@') && !x.email.includes('.cse@')) s += 10;
          return s;
        };
        return score(b) - score(a);
      });

      const primary = { ...members[0] };
      const aliasIds = members.map(m => m.id);
      
      // Preserve elevated leadership and coordinator roles if any member has them
      if (members.some(m => m.role === 'admin')) primary.role = 'admin';
      else if (members.some(m => m.role === 'principal')) primary.role = 'principal';
      else if (members.some(m => m.role === 'vice_principal')) primary.role = 'vice_principal';
      else if (members.some(m => m.role === 'hod')) primary.role = 'hod';

      if (members.some(m => m.class_role)) {
        primary.class_role = members.find(m => m.class_role)?.class_role;
      }

      if (members.some(m => m.designation && m.designation !== 'Faculty')) {
        const des = members.find(m => m.designation && m.designation !== 'Faculty')?.designation;
        if (des) primary.designation = des;
      }

      unifiedList.push({
        ...primary,
        aliasIds,
        teachingSubjects: [],
        coordinatedClasses: []
      });
    }

    // Sort unified list alphabetically by name
    unifiedList.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    // Map teaching subjects across all alias IDs
    subjects.forEach(sub => {
      const match = unifiedList.find(st => 
        st.aliasIds.includes(sub.faculty_id) || 
        (sub.faculty_id && st.id === sub.faculty_id)
      );
      if (match) {
        match.teachingSubjects.push(sub);
      }
    });

    // Map coordinated classes using normalized name matching
    classes.forEach(cls => {
      const normCoord = (cls.class_coordinator || '').toLowerCase().replace(/[^a-z]/g, '');
      const normAsst = (cls.asst_coordinator || '').toLowerCase().replace(/[^a-z]/g, '');

      unifiedList.forEach(st => {
        const normName = (st.name || '').toLowerCase().replace(/^(dr|mr|mrs|ms|prof)\.?\s*/i, '').replace(/[^a-z]/g, '');
        const isCoord = normCoord && normName && (normCoord.includes(normName) || normName.includes(normCoord));
        const isAsst = normAsst && normName && (normAsst.includes(normName) || normName.includes(normAsst));

        if (isCoord || isAsst) {
          st.coordinatedClasses.push({
            id: cls.id,
            name: cls.name,
            year_label: cls.year_label,
            semester: cls.semester,
            department: cls.department,
            roleType: isCoord ? 'Class In-charge' : 'Assistant Coordinator'
          });
        }
      });
    });

    res.json(unifiedList);
  } catch (err) {
    console.error('GET /admin/staff-classes error:', err);
    res.status(500).json({ error: 'Failed to fetch staff classes.' });
  }
});

export default router;
