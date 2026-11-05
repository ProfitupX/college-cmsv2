import express from 'express';
import db from '../db.js';
import { verifyAuthToken, computePasswordFingerprint, isValidAdminFingerprint } from './auth.js';

const router = express.Router();

// ── Security & Authentication Context Hygiene ─────────────────
// Never allow raw incoming client headers to spoof authenticated identity
router.use((req, _res, next) => {
  delete req.headers['x-user-id'];
  delete req.headers['x-staff-id'];
  delete req.headers['x-user-role'];
  next();
});

// Server-side authentication context resolver
// Derives identity from server middleware context or verified HMAC-SHA256 Bearer token
export function getAuthenticatedUser(req) {
  // 1. Direct server middleware context (if attached by test harness or upstream middleware)
  if (req.user && typeof req.user === 'object' && req.user.id) {
    return {
      id: String(req.user.id),
      role: req.user.role ? String(req.user.role).toLowerCase() : undefined,
      department: req.user.department ? String(req.user.department) : undefined,
      name: req.user.name ? String(req.user.name) : undefined,
      email: req.user.email ? String(req.user.email) : undefined,
      pwf: req.user.pwf ? String(req.user.pwf) : undefined
    };
  }
  if (req.user && typeof req.user === 'string' && req.user.trim()) {
    return { id: req.user.trim() };
  }
  if (req.session?.user && req.session.user.id) {
    return {
      id: String(req.session.user.id),
      role: req.session.user.role ? String(req.session.user.role).toLowerCase() : undefined,
      department: req.session.user.department ? String(req.session.user.department) : undefined,
      name: req.session.user.name ? String(req.session.user.name) : undefined,
      email: req.session.user.email ? String(req.session.user.email) : undefined,
      pwf: req.session.user.pwf ? String(req.session.user.pwf) : undefined
    };
  }

  // 2. Cryptographically verified Bearer token from Authorization header
  const authHeader = req.headers['authorization'];
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const rawToken = authHeader.slice(7).trim();
    const verified = verifyAuthToken(rawToken);
    if (verified && verified.id) {
      return {
        id: String(verified.id),
        email: verified.email ? String(verified.email) : undefined,
        role: verified.role ? String(verified.role).toLowerCase() : undefined,
        pwf: verified.pwf ? String(verified.pwf) : undefined
      };
    }
  }

  return null;
}

/**
 * Resolves acting staff record from database or existing hardcoded administrative accounts.
 * Hardcoded accounts (ADMIN, PRIN, VP) are explicitly recognized without requiring DB records.
 * Validates token password fingerprint against current database password hash (or admin credentials).
 * Rejects missing, outdated or mismatched fingerprints with 401 Unauthorized.
 * Never leaks the password hash in the returned record.
 */
export async function resolveActingStaff(database, userOrId, tokenFingerprintArg) {
  if (!userOrId) return null;

  let userId;
  let tokenFingerprint = tokenFingerprintArg;
  if (typeof userOrId === 'object' && userOrId !== null) {
    userId = userOrId.id;
    if (!tokenFingerprint && userOrId.pwf) {
      tokenFingerprint = userOrId.pwf;
    }
  } else {
    userId = userOrId;
  }

  if (!userId) return null;
  const uid = String(userId).trim();

  // Validate fingerprint presence
  if (!tokenFingerprint || typeof tokenFingerprint !== 'string' || !tokenFingerprint.trim()) {
    const authError = new Error('Unauthorized: Authentication token is missing password fingerprint. Please log in again.');
    authError.status = 401;
    throw authError;
  }
  const cleanFingerprint = tokenFingerprint.trim();

  // 1. Explicit handling for existing hardcoded administrative accounts
  if (uid === 'ADMIN' || uid === 'PRIN' || uid === 'VP') {
    if (!isValidAdminFingerprint(uid, cleanFingerprint)) {
      const authError = new Error('Unauthorized: Administrative authentication token is invalid or outdated. Please log in again.');
      authError.status = 401;
      throw authError;
    }

    if (uid === 'ADMIN') {
      return {
        id: 'ADMIN',
        name: 'Admin User',
        role: 'admin',
        department: 'College Administration'
      };
    }
    if (uid === 'PRIN') {
      return {
        id: 'PRIN',
        name: 'Dr. C. Mathalai Sundaram',
        role: 'principal',
        department: 'College Administration'
      };
    }
    if (uid === 'VP') {
      return {
        id: 'VP',
        name: 'Dr. M. Sathya',
        role: 'vice_principal',
        department: 'College Administration'
      };
    }
  }

  // 2. Query staff registry from MySQL including password hash
  const [rows] = await database.execute(
    'SELECT id, name, role, department, password FROM staffs WHERE id = ? OR LOWER(email) = LOWER(?)',
    [uid, uid]
  );
  if (!rows || rows.length === 0) {
    return null; // User not found in staff registry
  }

  const staff = rows[0];
  const currentDbFingerprint = computePasswordFingerprint(staff.password);

  if (!currentDbFingerprint || currentDbFingerprint !== cleanFingerprint) {
    const authError = new Error('Unauthorized: Password has been changed or token fingerprint is invalid. Please log in again.');
    authError.status = 401;
    throw authError;
  }

  // 3. Return sanitized staff object — NEVER leak or return the password hash!
  return {
    id: staff.id,
    name: staff.name,
    role: staff.role,
    department: staff.department
  };
}

// Canonical attendance mark calculation rule:
// >=95% -> 5, 90-94% -> 3, 85-89% -> 2, 80-84% -> 1, <80% -> 0
function getAttendanceMark(pct) {
  const p = Math.round(Number(pct) || 0);
  if (p >= 95) return 5;
  if (p >= 90) return 3;
  if (p >= 85) return 2;
  if (p >= 80) return 1;
  return 0;
}

// ─────────────────────────────────────────────────────────────
// Authoritative Department Definitions and Resolution
// RULE: The Subject's Department HOD ALWAYS has authority over freeze, unfreeze, and unlock approvals!
// ─────────────────────────────────────────────────────────────
export const CANONICAL_DEPARTMENTS = {
  CSE: 'Computer Science and Engineering',
  IT: 'Information Technology',
  ECE: 'Electronics and Communication Engineering',
  EEE: 'Electrical and Electronics Engineering',
  MECH: 'Mechanical Engineering',
  CIVIL: 'Civil Engineering',
  AIDS: 'Artificial Intelligence and Data Science',
  SH: 'Science and Humanities'
};

export function canonicalizeDepartment(dept) {
  if (!dept || typeof dept !== 'string') return null;
  const s = dept.trim().toLowerCase();
  if (!s) return null;

  // 1. Computer Science and Engineering
  if (s === 'cse' || s === 'cs' || s.includes('computer science')) {
    return CANONICAL_DEPARTMENTS.CSE;
  }
  // 2. Information Technology
  if (s === 'it' || s.includes('information technology') || s === 'infotech') {
    return CANONICAL_DEPARTMENTS.IT;
  }
  // 3. Artificial Intelligence and Data Science
  if (s === 'aids' || s === 'ai&ds' || s === 'ai & ds' || s === 'ad' || (s.includes('artificial') && s.includes('intelligence')) || s.includes('data science')) {
    return CANONICAL_DEPARTMENTS.AIDS;
  }
  // 4. Electronics and Communication Engineering
  if (s === 'ece' || s === 'ec' || s.includes('electronics and communication') || s.includes('electronics & communication')) {
    return CANONICAL_DEPARTMENTS.ECE;
  }
  // 5. Electrical and Electronics Engineering
  if (s === 'eee' || s === 'ee' || s.includes('electrical and electronics') || s.includes('electrical & electronics')) {
    return CANONICAL_DEPARTMENTS.EEE;
  }
  // 6. Mechanical Engineering
  if (s === 'mech' || s === 'me' || s.includes('mechanical')) {
    return CANONICAL_DEPARTMENTS.MECH;
  }
  // 7. Civil Engineering
  if (s === 'civil' || s === 'ce' || s.includes('civil')) {
    return CANONICAL_DEPARTMENTS.CIVIL;
  }
  // 8. Science and Humanities
  if (s === 's&h' || s === 's & h' || s === 'sh' || s.includes('science and humanities') || s.includes('science & humanities') || s === 'first year' || s.includes('maths') || s.includes('physics') || s.includes('chemistry') || s.includes('humanities')) {
    return CANONICAL_DEPARTMENTS.SH;
  }

  return null;
}

export function inferDepartmentFromSubjectCode(code) {
  if (!code || typeof code !== 'string') return null;
  const c = code.trim().toUpperCase();

  // 1. Longest / specific prefixes (3 characters)
  // Ensures CBM -> ECE (not CB -> CSE), CEC -> ECE (not CE -> Civil)
  if (/^(CBM|CEC)/.test(c)) {
    return CANONICAL_DEPARTMENTS.ECE;
  }
  if (/^CCS/.test(c)) {
    return CANONICAL_DEPARTMENTS.CSE;
  }
  if (/^(CME|CRA|OME|OML)/.test(c)) {
    return CANONICAL_DEPARTMENTS.MECH;
  }
  if (/^OGI/.test(c)) {
    return CANONICAL_DEPARTMENTS.CIVIL;
  }
  if (/^OHS/.test(c)) {
    return CANONICAL_DEPARTMENTS.SH;
  }

  // 2. Standard 2-character prefixes
  if (/^(MA|PH|CY|GE|HS|BS|UC|EN)/.test(c)) {
    return CANONICAL_DEPARTMENTS.SH;
  }
  if (/^(CS|CB)/.test(c)) {
    return CANONICAL_DEPARTMENTS.CSE;
  }
  if (/^(IT|CW)/.test(c)) {
    return CANONICAL_DEPARTMENTS.IT;
  }
  if (/^AD/.test(c)) {
    return CANONICAL_DEPARTMENTS.AIDS;
  }
  if (/^EC/.test(c)) {
    return CANONICAL_DEPARTMENTS.ECE;
  }
  if (/^EE/.test(c)) {
    return CANONICAL_DEPARTMENTS.EEE;
  }
  if (/^ME/.test(c)) {
    return CANONICAL_DEPARTMENTS.MECH;
  }
  if (/^(CE|AG|GI)/.test(c)) {
    return CANONICAL_DEPARTMENTS.CIVIL;
  }

  return null;
}

export function getAuthoritativeSubjectDepartment(subject) {
  if (!subject) return null;

  // 1. Primary source: subjects.department
  const rawDept = subject.department || subject.sub_dept;
  if (rawDept && typeof rawDept === 'string' && rawDept.trim()) {
    const canonical = canonicalizeDepartment(rawDept);
    if (canonical) return canonical;
  }

  // 2. Authoritative Fallback: Subject Code Prefix
  const fromCode = inferDepartmentFromSubjectCode(subject.code);
  if (fromCode) return fromCode;

  return null;
}

export function getDepartmentAliases(canonicalDept) {
  if (!canonicalDept) return [];
  switch (canonicalDept) {
    case CANONICAL_DEPARTMENTS.CSE:
      return ['Computer Science and Engineering', 'CSE', 'Computer Science & Engineering', 'CS'];
    case CANONICAL_DEPARTMENTS.IT:
      return ['Information Technology', 'IT'];
    case CANONICAL_DEPARTMENTS.ECE:
      return ['Electronics and Communication Engineering', 'ECE', 'Electronics & Communication Engineering', 'EC'];
    case CANONICAL_DEPARTMENTS.EEE:
      return ['Electrical and Electronics Engineering', 'EEE', 'Electrical & Electronics Engineering', 'EE'];
    case CANONICAL_DEPARTMENTS.MECH:
      return ['Mechanical Engineering', 'MECH', 'Mech', 'ME'];
    case CANONICAL_DEPARTMENTS.CIVIL:
      return ['Civil Engineering', 'CIVIL', 'Civil', 'CE'];
    case CANONICAL_DEPARTMENTS.AIDS:
      return ['Artificial Intelligence and Data Science', 'AI&DS', 'AIDS', 'AI & DS', 'AD'];
    case CANONICAL_DEPARTMENTS.SH:
      return ['Science and Humanities', 'S&H', 'First Year', 'Science & Humanities', 'S & H'];
    default:
      return [canonicalDept];
  }
}

export async function getDepartmentHod(database, canonicalDept) {
  const aliases = getDepartmentAliases(canonicalDept);
  const placeholders = aliases.map(() => '?').join(', ');
  const [rows] = await database.execute(
    `SELECT id, name, email, department, role
     FROM staffs
     WHERE role = 'hod' AND (
       department IN (${placeholders})
       OR LOWER(department) LIKE ?
     )
     ORDER BY id ASC
     LIMIT 1`,
    [...aliases, `%${canonicalDept.toLowerCase()}%`]
  );
  return rows[0] || null;
}

// Helper to resolve accurate department for notification targeting:
// MANDATORY RULE: The Subject's Department HOD ALWAYS has authority!
function resolveSubjectDepartment(sub) {
  const authDept = getAuthoritativeSubjectDepartment(sub);
  if (authDept) return authDept;
  return 'College Administration';
}

// ─────────────────────────────────────────────────────────────
// POST /api/marks/submit
// Body: {
//   subjectId, classId, staffId, sessionLabel,
//   components: [{ typeId, label, maxMarks, icon, color, sortOrder }],
//   marks:      [{ studentId, componentIndex, marksObtained }]
// }
// ─────────────────────────────────────────────────────────────
router.post('/submit', async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { subjectId, classId, staffId, sessionLabel, components, marks, totalHours, internal2TotalHours, attendance, actionType, remedialAction } = req.body;

    if (!subjectId || !classId || !staffId || !components) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    // Fetch subject details for accurate hours splits & subject type detection
    const [subRows] = await conn.execute(
      'SELECT id, code, name, type, ltpc, total_hours, int1_hours, int2_hours, lab_hours, department FROM subjects WHERE id = ? OR code = ?',
      [subjectId, subjectId]
    );
    const subObj = subRows.length > 0 ? subRows[0] : {};
    const isPureLabSubmission = Boolean(
      subObj.type === 'Practical' ||
      subObj.type === 'Laboratory' ||
      subObj.type === 'Lab' ||
      (subObj.name && subObj.name.toLowerCase().includes('laboratory') && !['Lab-cum-Theory', 'Theory-cum-Lab', 'Lab cum Theory', 'Theory cum Lab'].includes(subObj.type))
    );

    const effInt1Hours = parseInt(req.body.int1Hours ?? subObj.int1_hours ?? 30, 10) || 30;
    const effInt2Hours = parseInt(req.body.int2Hours ?? subObj.int2_hours ?? 30, 10) || 30;
    const effLabHours  = parseInt(req.body.labHours ?? subObj.lab_hours ?? 0, 10) || 0;

    let sessionTotalHours = parseInt(totalHours, 10) || 0;
    if (sessionLabel === 'internal1') {
      sessionTotalHours = effInt1Hours;
    } else if (sessionLabel === 'internal2') {
      sessionTotalHours = effInt2Hours;
    } else if (isPureLabSubmission) {
      sessionTotalHours = effLabHours || (sessionTotalHours > 0 ? sessionTotalHours : subObj.total_hours || 60);
    } else if (!sessionTotalHours) {
      sessionTotalHours = 30;
    }

    // 1.5 Find existing session to perform safe in-place UPDATE (avoids foreign-key CASCADE wipe)
    const [existingSessions] = await conn.execute(
      `SELECT id, status FROM marks_sessions WHERE subject_id = ? AND class_id = ? AND session_label = ? ORDER BY id DESC`,
      [String(subjectId), String(classId), String(sessionLabel)]
    );
    const existingSession = existingSessions.length > 0 ? existingSessions[0] : null;

    // Guard locked/frozen session: values must NEVER change unless explicitly unlocked by authorized staff
    if (existingSession && (existingSession.status === 'locked' || existingSession.status === 'frozen')) {
      if (existingSession.status !== 'unlocked') {
        await conn.rollback();
        return res.status(403).json({ error: 'This marks sheet is locked and frozen. Values cannot be changed unless explicitly unlocked by authorized HOD or Admin.' });
      }
    }

    if (existingSession && actionType === 'clear' && (existingSession.status === 'locked' || existingSession.status === 'frozen')) {
      await conn.rollback();
      return res.status(403).json({ error: 'Cannot clear a locked or frozen marks sheet.' });
    }

    // If components is empty and user explicitly requests clear
    if (components.length === 0) {
      if (existingSession && actionType === 'clear') {
        await conn.execute(`DELETE FROM marks WHERE session_id = ?`, [existingSession.id]);
        await conn.execute(`DELETE FROM session_attendance WHERE session_id = ?`, [existingSession.id]);
        await conn.execute(`DELETE FROM assessment_components WHERE session_id = ?`, [existingSession.id]);
        await conn.execute(`UPDATE marks_sessions SET status = 'draft', avg_score = 0, updated_at = NOW() WHERE id = ?`, [existingSession.id]);
        await conn.commit();
        return res.json({ success: true, message: 'Marks sheet cleared successfully.' });
      }
      const hasAttendance = attendance && Array.isArray(attendance) && attendance.some(a => (a.hoursAttended || a.actualTakenHours || a.internalExamMark || a.labMark || a.labAttendance));
      if (!hasAttendance) {
        await conn.commit();
        return res.json({ success: true, message: 'No changes made.' });
      }
    }

    // 1. Calculate total max and avg score
    const totalMax = components.reduce((s, c) => s + (parseFloat(c.maxMarks) || 0), 0);

    // avg = (sum of converted marks) / studentCount
    const studentIds = [...new Set(marks.map((m) => m.studentId))];
    const studentCount = studentIds.length;

    // Anna Univ 25th Regulation attendance rule:
    // 95–100% → 5 marks, 90–95% → 3 marks, 85–90% → 2 marks, 80–85% → 1 mark, <80% → 0 marks
    const getAttendanceMark = (pct) => {
      if (pct >= 95) return 5;
      if (pct >= 90) return 3;
      if (pct >= 85) return 2;
      if (pct >= 80) return 1;
      return 0; // Below 80% is 0 mark
    };

    // Group marks by student to compute converted total per student
    const studentTotals = {};
    for (const m of marks) {
      if (!studentTotals[m.studentId]) studentTotals[m.studentId] = 0;

      const comp = components[m.componentIndex];
      if (comp) {
        const conductedMax = parseFloat(comp.conductedMax) || 100;
        const weight = parseFloat(comp.maxMarks) || 0;
        const val = parseFloat(m.marksObtained) || 0;
        const converted = conductedMax > 0 ? (Math.min(val, conductedMax) / conductedMax) * weight : 0;
        studentTotals[m.studentId] += converted;
      }
    }

    if (attendance && Array.isArray(attendance)) {
      const tHours = parseInt(totalHours, 10) || 0;

      // Find max actual hours entered across the class
      let maxActualHours = 0;
      for (const a of attendance) {
        const raw = parseInt(a.actualTakenHours !== undefined && a.actualTakenHours !== '' ? a.actualTakenHours : (a.hoursAttended || 0), 10) || 0;
        if (raw > maxActualHours) maxActualHours = raw;
      }

      for (const a of attendance) {
        if (!studentTotals[a.studentId]) studentTotals[a.studentId] = 0;
        const rawHours = parseInt(a.actualTakenHours !== undefined && a.actualTakenHours !== '' ? a.actualTakenHours : (a.hoursAttended || 0), 10) || 0;
        const labHrs = parseInt(a.labAttendance, 10) || 0;
        let attMark = 0;

        if (a.attendanceMark !== undefined && a.attendanceMark !== null && !isNaN(parseFloat(a.attendanceMark))) {
          attMark = parseFloat(a.attendanceMark);
        } else if (sessionLabel === 'internal2') {
          const i1Attd = parseInt(a.int1AttendanceHours, 10) || 0;
          const cumAttd = i1Attd + rawHours + labHrs;
          const i1Max = parseInt(req.body.int1Hours, 10) || Math.ceil(tHours / 2) || 0;
          const i2Max = parseInt(req.body.int2Hours, 10) || Math.floor(tHours / 2) || 0;
          const lMax = parseInt(req.body.labHours, 10) || 0;
          const cumPrescribedMax = (i1Max + i2Max + lMax) || tHours || 0;
          const cumConductedBase = Math.max(cumPrescribedMax, maxActualHours > 0 ? maxActualHours + i1Max + lMax : cumPrescribedMax);

          const pct = cumConductedBase > 0 ? (cumAttd / cumConductedBase) * 100 : 0;
          attMark = getAttendanceMark(pct);
        } else {
          // If actual attended hours (e.g. 45) exceeds total prescribed hours (e.g. 30),
          // convert proportionally based on the conducted hours
          const conductedBase = Math.max(tHours, maxActualHours);
          const pct = conductedBase > 0 ? (rawHours / conductedBase) * 100 : 0;
          attMark = getAttendanceMark(pct);
        }
        studentTotals[a.studentId] += attMark;
      }
    }

    let labAvgScore = 0;
    if (isPureLabSubmission && attendance && Array.isArray(attendance)) {
      let lSum = 0;
      let lCount = 0;
      attendance.forEach(a => {
        const v = parseFloat(a.labMark !== undefined && a.labMark !== null && a.labMark !== '' ? a.labMark : a.internalExamMark);
        if (!isNaN(v)) { lSum += v; lCount++; }
      });
      labAvgScore = lCount > 0 ? (lSum / lCount) : 0;
    }
    const avgScore = isPureLabSubmission ? labAvgScore : ((Object.values(studentTotals).reduce((s, t) => s + t, 0) / (studentCount || 1)) || 0);

    // 2. Safe Session Upsert (never wipe or change sessionId if it already exists)
    const statusVal = actionType === 'frozen' ? 'locked' : (existingSession?.status === 'locked' ? 'locked' : 'draft');
    let sessionId;

    if (existingSession) {
      sessionId = existingSession.id;
      await conn.execute(
        `UPDATE marks_sessions
         SET staff_id = ?, total_max = ?, total_hours = ?, internal2_total_hours = ?,
             status = ?, avg_score = ?, student_count = ?, remedial_action = ?, updated_at = NOW()
         WHERE id = ?`,
        [
          String(staffId),
          totalMax,
          parseInt(sessionTotalHours, 10) || 0,
          parseInt(internal2TotalHours, 10) || 0,
          statusVal,
          avgScore,
          studentCount,
          remedialAction || '',
          sessionId
        ]
      );
    } else {
      const [sessionResult] = await conn.execute(
        `INSERT INTO marks_sessions
           (subject_id, class_id, staff_id, session_label, total_max, total_hours, internal2_total_hours, status, avg_score, student_count, remedial_action)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          String(subjectId),
          String(classId),
          String(staffId),
          sessionLabel || 'Internal Assessment',
          totalMax,
          parseInt(sessionTotalHours, 10) || 0,
          parseInt(internal2TotalHours, 10) || 0,
          statusVal,
          avgScore,
          studentCount,
          remedialAction || ''
        ]
      );
      sessionId = sessionResult.insertId;
    }

    // 3. Safe Component In-Place Update (keeps existing component IDs stable)
    const [existingComps] = await conn.execute(
      `SELECT id, type_id, sort_order FROM assessment_components WHERE session_id = ? ORDER BY sort_order`,
      [sessionId]
    );

    const componentIdMap = {}; // index → DB id
    for (let i = 0; i < components.length; i++) {
      const c = components[i];
      if (existingComps[i]) {
        const compId = existingComps[i].id;
        await conn.execute(
          `UPDATE assessment_components
           SET type_id = ?, label = ?, conducted_max = ?, max_marks = ?, icon = ?, color = ?, sort_order = ?
           WHERE id = ?`,
          [c.typeId || 'written_test', c.label || c.name || 'Component', parseFloat(c.conductedMax) || 100, parseFloat(c.maxMarks) || 0, c.icon || '', c.color || '', i, compId]
        );
        componentIdMap[i] = compId;
      } else {
        const [compResult] = await conn.execute(
          `INSERT INTO assessment_components
             (session_id, type_id, label, conducted_max, max_marks, icon, color, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [sessionId, c.typeId || 'written_test', c.label || c.name || 'Component', parseFloat(c.conductedMax) || 100, parseFloat(c.maxMarks) || 0, c.icon || '', c.color || '', i]
        );
        componentIdMap[i] = compResult.insertId;
      }
    }

    // Clean up trailing components only if components array explicitly shrank
    if (existingComps.length > components.length) {
      for (let i = components.length; i < existingComps.length; i++) {
        await conn.execute(`DELETE FROM assessment_components WHERE id = ?`, [existingComps[i].id]);
      }
    }

    // Resolve staff name for audit trail
    let staffName = req.body.staffName || req.body.userName || '';
    if (!staffName && staffId) {
      try {
        const [stRows] = await conn.execute(`SELECT name FROM staffs WHERE id = ?`, [staffId]);
        if (stRows.length > 0) staffName = stRows[0].name;
      } catch (_) {}
    }

    // Fetch existing marks and attendance snapshots to calculate audit deltas
    const oldMarksMap = new Map();
    const oldAttMap = new Map();
    if (existingSession) {
      try {
        const [oldMarksRows] = await conn.execute(
          `SELECT student_id, component_id, marks_obtained FROM marks WHERE session_id = ?`,
          [sessionId]
        );
        oldMarksRows.forEach(r => {
          oldMarksMap.set(`${r.student_id}_${r.component_id}`, r.marks_obtained !== null && r.marks_obtained !== undefined ? parseFloat(r.marks_obtained) : null);
        });

        const [oldAttRows] = await conn.execute(
          `SELECT student_id, hours_attended, actual_taken_hours, attendance_mark, internal_exam_mark, lab_attendance, lab_mark FROM session_attendance WHERE session_id = ?`,
          [sessionId]
        );
        oldAttRows.forEach(r => {
          oldAttMap.set(String(r.student_id), r);
        });
      } catch (oldFetchErr) {
        console.warn('Old records snapshot notice:', oldFetchErr.message);
      }
    }

    const auditLogEntries = [];

    // 4. Safe Marks Upsert (ON DUPLICATE KEY UPDATE) with Audit Delta Logging
    for (const m of marks) {
      const compDbId = componentIdMap[m.componentIndex];
      if (compDbId === undefined) continue;
      const sId = String(m.studentId);
      const key = `${sId}_${compDbId}`;
      const oldVal = oldMarksMap.has(key) ? oldMarksMap.get(key) : null;
      const hasNew = m.marksObtained !== null && m.marksObtained !== '' && m.marksObtained !== undefined && !isNaN(parseFloat(m.marksObtained));
      const newVal = hasNew ? parseFloat(m.marksObtained) : null;

      if (oldVal !== newVal) {
        auditLogEntries.push([
          sessionId,
          sId,
          compDbId,
          'marks_obtained',
          oldVal !== null ? String(oldVal) : null,
          newVal !== null ? String(newVal) : null,
          String(staffId),
          String(staffName || staffId),
          String(actionType || 'save')
        ]);
      }

      if (!hasNew) {
        await conn.execute(
          `DELETE FROM marks WHERE session_id = ? AND component_id = ? AND student_id = ?`,
          [sessionId, compDbId, sId]
        );
      } else {
        await conn.execute(
          `INSERT INTO marks (session_id, component_id, student_id, marks_obtained)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE marks_obtained = VALUES(marks_obtained)`,
          [sessionId, compDbId, sId, newVal]
        );
      }
    }

    // 5. Insert Attendance & Internal Exam
    if (attendance && Array.isArray(attendance)) {
      const tHours = parseInt(totalHours, 10) || 30;

      for (const a of attendance) {
        const rawHours = parseInt(a.hoursAttended !== undefined && a.hoursAttended !== '' ? a.hoursAttended : (a.actualTakenHours || 0), 10) || 0;
        const labHrs = parseInt(a.labAttendance, 10) || 0;
        let attMark = 0;
        const savedHours = Math.max(0, rawHours);

        if (sessionLabel === 'internal2') {
          const i1Attd = parseInt(a.int1AttendanceHours, 10) || 0;
          const i1Max = parseInt(req.body.int1Hours, 10) || 30;
          const i2Max = parseInt(req.body.int2Hours, 10) || 30;
          const lMax = parseInt(req.body.labHours, 10) || 0;

          if (i1Attd > 0) {
            const cumPrescribedMax = (i1Max + i2Max) || tHours || 60;
            const cappedI2 = Math.min(i2Max, Math.max(0, rawHours));
            const cumAttd = Math.min(cumPrescribedMax, Math.min(i1Max, i1Attd) + cappedI2);

            const pct = cumPrescribedMax > 0 ? Math.min(100, Math.round((cumAttd / cumPrescribedMax) * 100)) : 0;
            attMark = getAttendanceMark(pct);
          } else {
            // When Internal 1 is not recorded / 0, calculate against Internal 2's prescribed hours
            const activeMax = i2Max || tHours || 30;
            const cappedI2 = Math.min(activeMax, Math.max(0, rawHours));
            const pct = activeMax > 0 ? Math.min(100, Math.round((cappedI2 / activeMax) * 100)) : 0;
            attMark = getAttendanceMark(pct);
          }
        } else {
          // Internal 1: Calculate attendance mark percentage
          const prescribedHours = parseInt(req.body.int1Hours, 10) || tHours || 30;
          const cappedHours = Math.min(prescribedHours, Math.max(0, rawHours));
          const pct = prescribedHours > 0 ? Math.min(100, Math.round((cappedHours / prescribedHours) * 100)) : 0;
          attMark = getAttendanceMark(pct);
        }

        // If client explicitly passed a calculated attendanceMark, use it as fallback
        if (a.attendanceMark !== undefined && a.attendanceMark !== null && !isNaN(parseFloat(a.attendanceMark)) && parseFloat(a.attendanceMark) > 0) {
          attMark = parseFloat(a.attendanceMark);
        }

        // Track attendance & exam audit deltas
        const sId = String(a.studentId);
        const oldRec = oldAttMap.get(sId);

        const oldAttMark = oldRec && oldRec.attendance_mark !== null && oldRec.attendance_mark !== undefined ? parseFloat(oldRec.attendance_mark) : null;
        const newAttMark = attMark !== null && attMark !== undefined ? parseFloat(attMark) : null;
        if (oldAttMark !== newAttMark) {
          auditLogEntries.push([
            sessionId,
            sId,
            null,
            'attendance_mark',
            oldAttMark !== null ? String(oldAttMark) : null,
            newAttMark !== null ? String(newAttMark) : null,
            String(staffId),
            String(staffName || staffId),
            String(actionType || 'save')
          ]);
        }

        const oldHours = oldRec && oldRec.hours_attended !== null && oldRec.hours_attended !== undefined ? parseInt(oldRec.hours_attended, 10) : null;
        const newHours = parseInt(savedHours, 10);
        if (oldHours !== newHours) {
          auditLogEntries.push([
            sessionId,
            sId,
            null,
            'hours_attended',
            oldHours !== null ? String(oldHours) : null,
            String(newHours),
            String(staffId),
            String(staffName || staffId),
            String(actionType || 'save')
          ]);
        }

        const oldExam = oldRec && oldRec.internal_exam_mark !== null && oldRec.internal_exam_mark !== undefined && oldRec.internal_exam_mark !== '' ? parseFloat(oldRec.internal_exam_mark) : null;
        const newExam = (a.internalExamMark !== undefined && a.internalExamMark !== null && a.internalExamMark !== '' && !isNaN(parseFloat(a.internalExamMark))) ? parseFloat(a.internalExamMark) : null;
        if (oldExam !== newExam) {
          auditLogEntries.push([
            sessionId,
            sId,
            null,
            'internal_exam_mark',
            oldExam !== null ? String(oldExam) : null,
            newExam !== null ? String(newExam) : null,
            String(staffId),
            String(staffName || staffId),
            String(actionType || 'save')
          ]);
        }

        const oldLab = oldRec && oldRec.lab_mark !== null && oldRec.lab_mark !== undefined && oldRec.lab_mark !== '' ? parseFloat(oldRec.lab_mark) : null;
        const newLab = (a.labMark !== undefined && a.labMark !== null && a.labMark !== '' && !isNaN(parseFloat(a.labMark))) ? parseFloat(a.labMark) : null;
        if (oldLab !== newLab) {
          auditLogEntries.push([
            sessionId,
            sId,
            null,
            'lab_mark',
            oldLab !== null ? String(oldLab) : null,
            newLab !== null ? String(newLab) : null,
            String(staffId),
            String(staffName || staffId),
            String(actionType || 'save')
          ]);
        }

        await conn.execute(
          `INSERT INTO session_attendance (session_id, student_id, hours_attended, actual_taken_hours, attendance_mark, internal_exam_mark, lab_attendance, lab_mark)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             hours_attended = VALUES(hours_attended),
             actual_taken_hours = VALUES(actual_taken_hours),
             attendance_mark = VALUES(attendance_mark),
             internal_exam_mark = VALUES(internal_exam_mark),
             lab_attendance = VALUES(lab_attendance),
             lab_mark = VALUES(lab_mark)`,
          [
            sessionId,
            String(a.studentId),
            savedHours,
            savedHours,
            attMark,
            (a.internalExamMark !== undefined && a.internalExamMark !== null && a.internalExamMark !== '' && !isNaN(parseFloat(a.internalExamMark)))
              ? parseFloat(a.internalExamMark)
              : (isPureLabSubmission && a.labMark !== undefined && a.labMark !== null && a.labMark !== '' && !isNaN(parseFloat(a.labMark)) ? parseFloat(a.labMark) : null),
            (a.labAttendance !== undefined && a.labAttendance !== null && a.labAttendance !== '' && !isNaN(parseInt(a.labAttendance, 10)))
              ? parseInt(a.labAttendance, 10)
              : (isPureLabSubmission ? savedHours : (labHrs > 0 ? labHrs : null)),
            (a.labMark !== undefined && a.labMark !== null && a.labMark !== '' && !isNaN(parseFloat(a.labMark)))
              ? parseFloat(a.labMark)
              : (isPureLabSubmission && a.internalExamMark !== undefined && a.internalExamMark !== null && a.internalExamMark !== '' && !isNaN(parseFloat(a.internalExamMark)) ? parseFloat(a.internalExamMark) : null)
          ]
        );
      }
    }

    // 5.4 Persist individual mark changes to marks_audit_logs
    if (auditLogEntries.length > 0) {
      try {
        for (const entry of auditLogEntries) {
          await conn.execute(
            `INSERT INTO marks_audit_logs
              (session_id, student_id, component_id, field_name, old_value, new_value, user_id, user_name, action_type)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            entry
          );
        }
      } catch (auditErr) {
        console.warn('marks_audit_logs insert note:', auditErr.message);
      }
    }

    // 5.5 Record safe audit snapshot in marks_history for recovery
    try {
      await conn.execute(
        `INSERT INTO marks_history (session_id, subject_id, class_id, session_label, staff_id, action_type, snapshot)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          sessionId,
          String(subjectId),
          String(classId),
          String(sessionLabel),
          String(staffId),
          actionType || 'save',
          JSON.stringify({
            studentCount,
            marksCount: marks.length,
            avgScore,
            totalMax,
            savedAt: new Date().toISOString()
          })
        ]
      );
    } catch (histErr) {
      console.warn('marks_history audit log notice:', histErr.message);
    }

    await conn.commit();

    // 6. Notifications for Freeze action
    if (actionType === 'frozen') {
      try {
        let effClassId = classId;
        if (!effClassId && sessionId) {
          const [sessRows] = await db.execute('SELECT class_id FROM marks_sessions WHERE id = ?', [sessionId]);
          if (sessRows.length > 0 && sessRows[0].class_id) effClassId = sessRows[0].class_id;
        }

        const [subRows] = await db.execute(`
          SELECT s.code, s.name, s.department AS sub_dept, s.class_id,
                 c.department AS class_dept, c.year_label, c.name AS class_name, c.class_coordinator
          FROM subjects s
          LEFT JOIN classes c ON c.id = COALESCE(?, s.class_id)
          WHERE s.id = ?
        `, [effClassId || null, subjectId]);
        const sub = subRows.length > 0 ? subRows[0] : null;
        const subName = sub ? `${sub.code} ${sub.name}` : 'A Subject';
        let coordNotified = false;

        // Resolve true department: ALWAYS the class department
        const dept = resolveSubjectDepartment(sub);

        // Fetch staff name who froze the marks
        const [freezerRows] = await db.execute('SELECT name FROM staffs WHERE id = ?', [staffId]);
        const freezerName = freezerRows[0]?.name || 'the subject staff';

        // Notify HOD of the CLASS department ONLY
        await db.execute(
          `INSERT INTO notifications (target_role, target_department, title, message, link) VALUES ('hod', ?, 'Marks Frozen', ?, '/dashboard')`,
          [dept, `Marks for ${subName} (${sub?.class_name || 'Class'}) have been frozen by ${freezerName}.`]
        );

        // Notify College Administration / Leadership
        await db.execute(
          `INSERT INTO notifications (target_role, title, message, link) VALUES ('admin', 'Subject Marks Finalized', ?, '/dashboard')`,
          [`Marks for ${subName} (${sub?.class_name || sessionLabel}) have been frozen and finalized by ${freezerName}.`]
        );

        // Notify Specific Class Coordinator
        if (sub && sub.class_id) {
          const [classRows] = await db.execute('SELECT name, department, class_coordinator FROM classes WHERE id = ?', [sub.class_id]);
          if (classRows.length > 0 && classRows[0].class_coordinator) {
            const coordStr = classRows[0].class_coordinator.trim();
            const cleanName = coordStr.split(/,|\s+(?:TF|AP|Prof|Dr|HoD)\//)[0].trim();
            const [coordStaffs] = await db.query(
              'SELECT id FROM staffs WHERE INSTR(?, name) > 0 OR INSTR(name, ?) > 0 LIMIT 1',
              [coordStr, cleanName]
            );
            if (coordStaffs.length > 0) {
              await db.execute(
                `INSERT INTO notifications (target_id, title, message, link) VALUES (?, 'Class Subject Marks Frozen', ?, '/reports')`,
                [coordStaffs[0].id, `Marks for ${subName} (${classRows[0].name}) have been frozen. You can now view the updated class performance.`]
              );
              coordNotified = true;
            }
          }
        }
        if (!coordNotified) {
          await db.execute(
            `INSERT INTO notifications (target_role, target_department, title, message, link) VALUES ('class_coordinator', ?, 'Class Subject Marks Frozen', ?, '/reports')`,
            [dept, `Marks for ${subName} (${sub?.class_name || 'Class'}) have been frozen. You can now view the updated class performance.`]
          );
        }
      } catch (notifErr) {
        console.error('Failed to send freeze notifications:', notifErr);
      }
    }

    res.json({ success: true, sessionId, avgScore, studentCount });
  } catch (err) {
    await conn.rollback();
    console.error('POST /marks/submit error:', err);
    res.status(500).json({ error: 'Failed to save marks: ' + err.message });
  } finally {
    conn.release();
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/marks/sessions?classId=CL001&staffId=FAC001
// Returns all sessions with subject + staff info
// ─────────────────────────────────────────────────────────────
router.get('/sessions', async (req, res) => {
  try {
    const { classId, staffId, subjectId, sessionLabel, department } = req.query;
    let sql = `
      SELECT ms.id, ms.session_label, ms.total_max, ms.status,
             ms.avg_score, ms.student_count, ms.created_at, ms.subject_id, ms.class_id,
             sub.name AS subject, sub.code AS subject_code, sub.acronym, sub.department AS subject_department,
             cl.name  AS class_name, cl.department AS class_department, cl.year_label, cl.semester,
             st.name  AS staff_name, st.designation AS staff_designation
      FROM marks_sessions ms
      JOIN subjects sub ON sub.id = ms.subject_id
      JOIN classes  cl  ON cl.id  = ms.class_id
      LEFT JOIN staffs st ON st.id = ms.staff_id
    `;
    const params = [];
    const where = [];
    if (classId)      { where.push('ms.class_id = ?');   params.push(classId); }
    if (staffId) {
      const [aliasRows] = await db.query(
        `SELECT id FROM staffs WHERE id = ? OR email = (SELECT email FROM staffs WHERE id = ? LIMIT 1)`,
        [staffId, staffId]
      );
      const fStaffIds = Array.from(new Set([staffId, ...aliasRows.map(r => r.id)]));
      if (staffId === 'S_CHITRA' || staffId === 'FAC002') fStaffIds.push('S_CHITRA', 'FAC002');
      if (staffId === 'S_NAVEENKARTHICK' || staffId === 'FAC_IT_103') fStaffIds.push('S_NAVEENKARTHICK', 'FAC_IT_103');
      if (staffId === 'S_MAREESWARI' || staffId === 'FAC006') fStaffIds.push('S_MAREESWARI', 'FAC006');
      if (staffId === 'S_KARUNYA' || staffId === 'FAC010' || staffId === 'FAC026') fStaffIds.push('S_KARUNYA', 'FAC010', 'FAC026');
      if (staffId === 'S_RICHARD' || staffId === 'FAC017') fStaffIds.push('S_RICHARD', 'FAC017');
      if (staffId === 'S_KESAVA' || staffId === 'FAC005') fStaffIds.push('S_KESAVA', 'FAC005');
      if (staffId === 'S_UDHAYA' || staffId === 'FAC004') fStaffIds.push('S_UDHAYA', 'FAC004');
      if (staffId === 'S_BHAVANI' || staffId === 'FAC_IT_101') fStaffIds.push('S_BHAVANI', 'FAC_IT_101');
      if (staffId === 'S_VENNIMALAI' || staffId === 'FAC052') fStaffIds.push('S_VENNIMALAI', 'FAC052');
      if (staffId === 'S_RATHIMALA' || staffId === 'FAC016') fStaffIds.push('S_RATHIMALA', 'FAC016');
      if (staffId === 'S_JENIFER' || staffId === 'FAC021') fStaffIds.push('S_JENIFER', 'FAC021');

      const sPlaceholders = fStaffIds.map(() => '?').join(',');
      where.push(`ms.staff_id IN (${sPlaceholders})`);
      params.push(...fStaffIds);
    }
    if (subjectId)    { where.push('ms.subject_id = ?'); params.push(subjectId); }
    if (sessionLabel) { where.push('ms.session_label = ?'); params.push(sessionLabel); }
    if (department) {
      if (department === 'Science and Humanities' || department === 'First Year' || department.toLowerCase().includes('science')) {
        where.push(`(cl.department = 'Science and Humanities' OR cl.department = 'First Year' OR cl.year_label = 'I' OR sub.department = 'Science and Humanities')`);
      } else {
        where.push(`(cl.department LIKE ? OR sub.department LIKE ?)`);
        params.push(`%${department}%`, `%${department}%`);
      }
    }
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY ms.created_at DESC';

    const [rows] = await db.execute(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('GET /marks/sessions error:', err);
    res.status(500).json({ error: 'Failed to fetch sessions.' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/marks/sessions/:id
// Returns one session with its components and all student marks
// ─────────────────────────────────────────────────────────────
router.get('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Session info
    const [sessions] = await db.execute(
      `SELECT ms.*, sub.name AS subject, sub.code, cl.name AS class_name,
              st.name AS staff_name, st.designation AS staff_designation, st.department AS staff_department
       FROM marks_sessions ms
       LEFT JOIN subjects sub ON sub.id = ms.subject_id
       LEFT JOIN classes  cl  ON cl.id  = ms.class_id
       LEFT JOIN staffs st ON st.id = ms.staff_id
       WHERE ms.id = ?`, [id]
    );
    if (!sessions.length) return res.status(404).json({ error: 'Session not found.' });

    // Components
    const [components] = await db.execute(
      'SELECT * FROM assessment_components WHERE session_id = ? ORDER BY sort_order', [id]
    );

    // Marks joined with student info
    const [marks] = await db.execute(
      `SELECT m.student_id, m.component_id, m.marks_obtained,
              s.name AS student_name, s.roll_no, s.s_no
       FROM marks m
       JOIN students s ON s.id = m.student_id
       WHERE m.session_id = ?
       ORDER BY s.s_no, m.component_id`, [id]
    );

    // Attendance & Internal Exam
    const [attendanceRows] = await db.execute(
      'SELECT student_id, hours_attended, actual_taken_hours, attendance_mark, internal_exam_mark, lab_attendance, lab_mark FROM session_attendance WHERE session_id = ?', [id]
    );
    const attendance = {};
    const attendanceMarks = {};
    const internalExam = {};
    const labData = {};
    attendanceRows.forEach(r => {
      const rawHrs = r.actual_taken_hours !== null && r.actual_taken_hours !== undefined ? r.actual_taken_hours : r.hours_attended;
      attendance[r.student_id] = rawHrs;
      const rawHrsNum = parseInt(rawHrs || 0, 10);
      const dbMark = (r.attendance_mark !== null && r.attendance_mark !== undefined) ? parseFloat(r.attendance_mark) : null;
      if (dbMark !== null && dbMark > 0) {
        attendanceMarks[r.student_id] = dbMark;
      } else if (rawHrsNum > 0) {
        const isInt2 = String(sessions[0]?.session_label || '').toLowerCase().trim() === 'internal2';
        const sInt2Max = parseInt(sessions[0]?.int2_hours, 10) || parseInt(sessions[0]?.total_hours, 10) || 30;
        const sInt1Max = parseInt(sessions[0]?.int1_hours, 10) || parseInt(sessions[0]?.total_hours, 10) || 30;
        const sTargetMax = isInt2 ? sInt2Max : sInt1Max;
        const pct = sTargetMax > 0 ? Math.min(100, Math.round((rawHrsNum / sTargetMax) * 100)) : 0;
        attendanceMarks[r.student_id] = getAttendanceMark(pct);
      } else {
        attendanceMarks[r.student_id] = 0;
      }
      internalExam[r.student_id] = r.internal_exam_mark;
      labData[r.student_id] = {
        labAttendance: r.lab_attendance,
        labMark: r.lab_mark
      };
    });

    res.json({ session: sessions[0], components, marks, attendance, attendanceMarks, internalExam, labData });
  } catch (err) {
    console.error('GET /marks/sessions/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch session details.' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/marks/unlock-session
// Instant unlock for HOD/Admin (bypasses request queue)
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// POST /api/marks/reset-session
// Cleanly purges/resets all marks, attendance, and components for a session
// ─────────────────────────────────────────────────────────────
router.post('/reset-session', async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { sessionId, classId, subjectId, sessionLabel } = req.body;
    let sIds = [];

    if (sessionId) {
      sIds.push(sessionId);
    }

    if (classId && subjectId) {
      const query = sessionLabel && sessionLabel !== 'all'
        ? 'SELECT id FROM marks_sessions WHERE class_id = ? AND subject_id = ? AND session_label = ?'
        : 'SELECT id FROM marks_sessions WHERE class_id = ? AND subject_id = ?';
      const params = sessionLabel && sessionLabel !== 'all'
        ? [classId, subjectId, sessionLabel]
        : [classId, subjectId];
      const [sess] = await conn.execute(query, params);
      for (const s of sess) {
        if (!sIds.includes(s.id)) sIds.push(s.id);
      }
    }

    // Guard: locked or frozen sessions can NEVER be purged by reset
    for (const id of sIds) {
      const [sessRows] = await conn.execute(`SELECT id, status FROM marks_sessions WHERE id = ?`, [id]);
      if (sessRows.length > 0 && (sessRows[0].status === 'locked' || sessRows[0].status === 'frozen')) {
        await conn.rollback();
        return res.status(403).json({ error: 'Cannot reset locked or frozen marks sessions. Unlock must be approved by HOD first.' });
      }
    }

    for (const id of sIds) {
      await conn.execute('DELETE FROM marks WHERE session_id = ?', [id]);
      await conn.execute('DELETE FROM session_attendance WHERE session_id = ?', [id]);
      await conn.execute('DELETE FROM mark_unlock_requests WHERE session_id = ?', [id]);
      await conn.execute('DELETE FROM assessment_components WHERE session_id = ?', [id]);
      await conn.execute('DELETE FROM marks_sessions WHERE id = ?', [id]);
    }

    await conn.commit();
    res.json({ success: true, message: `Marks session(s) completely reset and cleared (${sIds.length} sessions).` });
  } catch (err) {
    await conn.rollback();
    console.error('POST /marks/reset-session error:', err);
    res.status(500).json({ error: 'Failed to reset marks session: ' + err.message });
  } finally {
    conn.release();
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/marks/sessions/:id
// ─────────────────────────────────────────────────────────────
router.delete('/sessions/:id', async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const sId = req.params.id;
    const [sessRows] = await conn.execute(`SELECT id, status FROM marks_sessions WHERE id = ?`, [sId]);
    if (sessRows.length > 0 && (sessRows[0].status === 'locked' || sessRows[0].status === 'frozen')) {
      await conn.rollback();
      return res.status(403).json({ error: 'Cannot delete locked or frozen marks sessions. Unlock must be approved by HOD first.' });
    }
    await conn.execute('DELETE FROM marks WHERE session_id = ?', [sId]);
    await conn.execute('DELETE FROM session_attendance WHERE session_id = ?', [sId]);
    await conn.execute('DELETE FROM mark_unlock_requests WHERE session_id = ?', [sId]);
    await conn.execute('DELETE FROM assessment_components WHERE session_id = ?', [sId]);
    await conn.execute('DELETE FROM marks_sessions WHERE id = ?', [sId]);
    await conn.commit();
    res.json({ success: true, message: 'Session deleted successfully.' });
  } catch (err) {
    await conn.rollback();
    console.error('DELETE /marks/sessions/:id error:', err);
    res.status(500).json({ error: 'Failed to delete session: ' + err.message });
  } finally {
    conn.release();
  }
});

router.post('/unlock-session', async (req, res) => {
  try {
    const sessionId = req.body?.sessionId?.sessionId || req.body?.sessionId;
    if (!sessionId) return res.status(400).json({ error: 'Missing sessionId.' });

    // Derive acting user identity strictly from verified server authentication context
    const authUser = getAuthenticatedUser(req);
    if (!authUser || !authUser.id) {
      return res.status(401).json({ error: 'Authentication required to unlock session. Marks remain frozen.' });
    }

    // Retrieve marks session and associated subject
    const [sessRows] = await db.execute(
      `SELECT ms.id, ms.subject_id, ms.status, s.code, s.name, s.department AS sub_dept
       FROM marks_sessions ms
       LEFT JOIN subjects s ON s.id = ms.subject_id
       WHERE ms.id = ?`,
      [sessionId]
    );

    if (sessRows.length === 0) {
      return res.status(404).json({ error: 'Marks session not found.' });
    }

    const session = sessRows[0];
    const authoritativeDept = getAuthoritativeSubjectDepartment({
      department: session.sub_dept,
      code: session.code,
      name: session.name
    });

    if (!authoritativeDept) {
      return res.status(400).json({ error: 'Cannot unlock marks sheet: Subject does not have a valid department mapping. Marks remain frozen.' });
    }

    // Validate acting staff from database or privileged administrative registry
    let staff;
    try {
      staff = await resolveActingStaff(db, authUser.id, authUser.pwf);
    } catch (authErr) {
      return res.status(authErr.status || 401).json({ error: authErr.message || 'Unauthorized authentication context.' });
    }
    if (!staff) {
      return res.status(403).json({ error: 'Unauthorized: User not found in staff registry. Marks remain frozen.' });
    }
    const staffRole = (staff.role || '').toLowerCase();
    const staffDeptCanonical = canonicalizeDepartment(staff.department);

    const isPrivileged = staffRole === 'admin' || staffRole === 'principal' || staffRole === 'vice_principal';
    const isAuthorizedHod = staffRole === 'hod' && staffDeptCanonical === authoritativeDept;

    if (!isPrivileged && !isAuthorizedHod) {
      return res.status(403).json({
        error: `Unauthorized: Only the HOD of ${authoritativeDept} or Admin can directly unlock this marks sheet. Your department is ${staff.department || 'unassigned'}. Marks remain frozen.`
      });
    }

    await db.execute(`UPDATE marks_sessions SET status = 'draft' WHERE id = ?`, [sessionId]);
    res.json({ success: true, message: 'Sheet unlocked successfully.' });
  } catch (err) {
    if (err.status === 401) {
      return res.status(401).json({ error: err.message });
    }
    console.error('POST /marks/unlock-session error:', err);
    res.status(500).json({ error: 'Failed to unlock sheet: ' + err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/marks/request-unlock
// Staff requests permission from Subject Department HOD to edit a locked sheet
// ─────────────────────────────────────────────────────────────
router.post('/request-unlock', async (req, res) => {
  try {
    const { sessionId, subjectId, classId, reason } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId.' });
    }

    // Derive requesting staff identity strictly from verified authentication context
    const authUser = getAuthenticatedUser(req);
    if (!authUser || !authUser.id) {
      return res.status(401).json({ error: 'Authentication required to submit unlock request. Marks remain frozen.' });
    }

    let requestingStaff;
    try {
      requestingStaff = await resolveActingStaff(db, authUser.id, authUser.pwf);
    } catch (authErr) {
      return res.status(authErr.status || 401).json({ error: authErr.message || 'Unauthorized authentication context.' });
    }
    if (!requestingStaff) {
      return res.status(403).json({ error: 'Unauthorized: User not found in staff registry. Marks remain frozen.' });
    }
    const requestingStaffId = requestingStaff.id;

    let effSubjectId = subjectId;
    let effClassId = classId;
    const [sessRows] = await db.execute('SELECT id, subject_id, class_id, status FROM marks_sessions WHERE id = ?', [sessionId]);
    if (sessRows.length === 0) {
      return res.status(404).json({ error: 'Marks session not found.' });
    }
    if (sessRows[0].class_id) effClassId = sessRows[0].class_id;
    if (sessRows[0].subject_id) effSubjectId = sessRows[0].subject_id;

    if (!effSubjectId) {
      return res.status(400).json({ error: 'Cannot submit unlock request: No subject is associated with this session. Marks remain frozen.' });
    }

    // 1. Retrieve the actual subject associated with the unlock request
    const [subRows] = await db.execute(
      `SELECT id, code, name, department, class_id FROM subjects WHERE id = ?`,
      [effSubjectId]
    );

    if (subRows.length === 0) {
      return res.status(404).json({ error: 'Subject associated with this marks sheet not found.' });
    }
    const subject = subRows[0];

    // 2. Identify authoritative department using existing subject mapping (department primary, code prefix fallback)
    const authoritativeDept = getAuthoritativeSubjectDepartment(subject);
    if (!authoritativeDept) {
      console.error(`[Unlock Request Failed]: Subject ${subject.code} ${subject.name} (ID: ${subject.id}) has missing or ambiguous department mapping.`);
      return res.status(400).json({
        error: `Cannot submit unlock request: Subject "${subject.code} ${subject.name}" does not have a valid department mapping. Marks remain frozen. Please contact administration.`
      });
    }

    // 3. Retrieve the authorized HOD for that subject department
    const hod = await getDepartmentHod(db, authoritativeDept);
    if (!hod) {
      console.error(`[Unlock Request Failed]: No active HOD assigned for subject department: ${authoritativeDept}.`);
      return res.status(400).json({
        error: `Cannot submit unlock request: No HOD is currently assigned for the ${authoritativeDept} department. Marks remain frozen. Please contact administration.`
      });
    }

    // Resolve class information for recording
    const [classRows] = await db.execute(
      `SELECT c.id, c.name, c.department, c.year_label
       FROM classes c
       WHERE c.id = ? OR c.id = ?`,
      [effClassId || '', subject.class_id || '']
    );
    const targetClass = classRows[0] || null;
    const finalClassId = targetClass?.id || effClassId || subject.class_id || '';

    // Update marks_sessions status to unlock_requested
    await db.execute(
      `UPDATE marks_sessions SET status = 'unlock_requested' WHERE id = ?`,
      [sessionId]
    );

    // Insert into mark_unlock_requests with guaranteed class_id and verified requesting staff ID
    await db.execute(
      `INSERT INTO mark_unlock_requests (session_id, subject_id, class_id, staff_id, reason, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [sessionId, effSubjectId, finalClassId, requestingStaffId, reason || 'Requesting edit permission for marks sheet']
    );

    // Get verified staff details for notification
    const staffName = requestingStaff.name || authUser.name || 'A staff member';
    const staffDept = requestingStaff.department ? ` (${requestingStaff.department})` : '';
    const subjectTitle = `${subject.code} ${subject.name}`;

    // 4. Assign unlock request to that subject department's HOD via targeted notification
    await db.execute(
      `INSERT INTO notifications (target_role, target_department, target_id, title, message, link)
       VALUES ('hod', ?, ?, 'Marks Unlock Request', ?, '/dashboard#unlocks')`,
      [
        authoritativeDept,
        hod.id,
        `${staffName}${staffDept} requested to unlock marks for ${subjectTitle} (${authoritativeDept}).`
      ]
    );

    res.json({
      success: true,
      message: `Unlock request submitted to ${authoritativeDept} HOD (${hod.name}) successfully.`,
      targetDepartment: authoritativeDept,
      hodName: hod.name
    });
  } catch (err) {
    if (err.status === 401) {
      return res.status(401).json({ error: err.message });
    }
    console.error('POST /marks/request-unlock error:', err);
    res.status(500).json({ error: 'Failed to submit unlock request: ' + err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/marks/unlock-requests
// Returns pending unlock requests routed to the SUBJECT department HOD
// ─────────────────────────────────────────────────────────────
router.get('/unlock-requests', async (req, res) => {
  try {
    // Derive acting user identity strictly from verified authentication context
    const authUser = getAuthenticatedUser(req);
    if (!authUser || !authUser.id) {
      return res.status(401).json({ error: 'Authentication required to view unlock requests.' });
    }

    // Validate acting staff from database or privileged administrative registry
    let staff;
    try {
      staff = await resolveActingStaff(db, authUser.id, authUser.pwf);
    } catch (authErr) {
      return res.status(authErr.status || 401).json({ error: authErr.message || 'Unauthorized authentication context.' });
    }
    if (!staff) {
      return res.status(403).json({ error: 'Unauthorized: User not found in staff registry.' });
    }
    const staffRole = (staff.role || '').toLowerCase();
    const isPrivileged = staffRole === 'admin' || staffRole === 'principal' || staffRole === 'vice_principal';
    const isHod = staffRole === 'hod';

    if (!isPrivileged && !isHod) {
      return res.status(403).json({ error: 'Unauthorized: Regular faculty are not authorized to view pending unlock requests.' });
    }

    let sql = `
      SELECT ur.id, ur.session_id, ur.subject_id, ur.class_id, ur.staff_id,
             ur.reason, ur.status, ur.requested_at,
             COALESCE(st.name, ur.staff_id) AS staff_name,
             st.department AS staff_department,
             COALESCE(sub.name, ms.session_label, 'Subject') AS subject_name,
             sub.code AS subject_code,
             sub.department AS raw_subject_department,
             COALESCE(cl.name, 'Class') AS class_name,
             cl.department AS class_department,
             cl.year_label AS class_year,
             ms.session_label,
             ms.status AS session_status
      FROM mark_unlock_requests ur
      LEFT JOIN marks_sessions ms ON ms.id = ur.session_id
      LEFT JOIN staffs st ON (st.id = ur.staff_id OR LOWER(st.email) = LOWER(ur.staff_id))
      LEFT JOIN subjects sub ON (sub.id = ur.subject_id OR sub.id = ms.subject_id)
      LEFT JOIN classes cl ON cl.id = COALESCE(NULLIF(ur.class_id, ''), ms.class_id, sub.class_id)
      WHERE ur.status = 'pending'
      ORDER BY ur.requested_at DESC
    `;

    const [rows] = await db.execute(sql);

    // Enrich each request with authoritative subject department
    const enriched = rows.map(r => {
      const authDept = getAuthoritativeSubjectDepartment({
        department: r.raw_subject_department,
        code: r.subject_code,
        name: r.subject_name
      });
      return {
        ...r,
        subject_department: authDept || r.raw_subject_department || 'Unassigned'
      };
    });

    // If acting user is an HOD:
    // Derive department strictly from the authenticated staff record.
    // Client-supplied query parameter 'department' is NEVER trusted for HODs.
    if (isHod) {
      const hodDeptCanonical = canonicalizeDepartment(staff.department);
      if (!hodDeptCanonical) {
        return res.json([]);
      }
      const filtered = enriched.filter(r => canonicalizeDepartment(r.subject_department) === hodDeptCanonical);
      return res.json(filtered);
    }

    // If acting user is Admin / Principal / Vice Principal:
    // College-wide access is permitted. If an optional department filter is specified, apply it.
    const { department } = req.query;
    if (department && department.trim() && department.trim().toLowerCase() !== 'all') {
      const targetCanonical = canonicalizeDepartment(department.trim());
      const filtered = enriched.filter(r => {
        if (!targetCanonical) return false;
        return canonicalizeDepartment(r.subject_department) === targetCanonical;
      });
      return res.json(filtered);
    }

    res.json(enriched);
  } catch (err) {
    if (err.status === 401) {
      return res.status(401).json({ error: err.message });
    }
    console.warn('GET /marks/unlock-requests error:', err.message);
    res.status(500).json({ error: 'Failed to fetch unlock requests: ' + err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/marks/approve-unlock
// Subject department HOD approves or rejects unlock request
// ─────────────────────────────────────────────────────────────
router.post('/approve-unlock', async (req, res) => {
  try {
    const { requestId, sessionId, action } = req.body; // action = 'approve' | 'reject'
    if (!requestId || !sessionId || !action) {
      return res.status(400).json({ error: 'Missing required parameters.' });
    }

    if (action !== 'approve' && action !== 'reject') {
      return res.status(400).json({ error: 'Invalid action. Must be "approve" or "reject".' });
    }

    // Derive acting user identity strictly from verified server authentication context
    const authUser = getAuthenticatedUser(req);
    if (!authUser || !authUser.id) {
      return res.status(401).json({ error: 'Authentication required to approve or reject unlock requests. Marks remain frozen.' });
    }

    // 1. Fetch unlock request and associated subject
    const [reqRows] = await db.execute(
      `SELECT ur.id, ur.session_id, ur.subject_id, ur.class_id, ur.staff_id, ur.status,
              sub.code AS subject_code, sub.name AS subject_name, sub.department AS sub_dept,
              ms.status AS session_status
       FROM mark_unlock_requests ur
       LEFT JOIN subjects sub ON sub.id = ur.subject_id
       LEFT JOIN marks_sessions ms ON ms.id = ur.session_id
       WHERE ur.id = ?`,
      [requestId]
    );

    if (reqRows.length === 0) {
      return res.status(404).json({ error: 'Unlock request not found.' });
    }
    const reqData = reqRows[0];

    if (reqData.status !== 'pending') {
      return res.status(400).json({ error: `This unlock request has already been ${reqData.status}.` });
    }

    // 2. Identify authoritative subject department
    const authoritativeDept = getAuthoritativeSubjectDepartment({
      department: reqData.sub_dept,
      code: reqData.subject_code,
      name: reqData.subject_name
    });

    if (!authoritativeDept) {
      return res.status(400).json({
        error: 'Cannot process unlock request: Subject does not have a valid department mapping. Marks remain frozen.'
      });
    }

    // 3. Validate acting staff from database or privileged administrative registry
    let staff;
    try {
      staff = await resolveActingStaff(db, authUser.id, authUser.pwf);
    } catch (authErr) {
      return res.status(authErr.status || 401).json({ error: authErr.message || 'Unauthorized authentication context.' });
    }
    if (!staff) {
      return res.status(403).json({ error: 'Unauthorized: User not found in staff registry. Marks remain frozen.' });
    }
    const staffRole = (staff.role || '').toLowerCase();
    const staffDeptCanonical = canonicalizeDepartment(staff.department);

    const isPrivileged = staffRole === 'admin' || staffRole === 'principal' || staffRole === 'vice_principal';
    const isAuthorizedHod = staffRole === 'hod' && staffDeptCanonical === authoritativeDept;

    if (!isPrivileged && !isAuthorizedHod) {
      return res.status(403).json({
        error: `Unauthorized: Only the HOD of ${authoritativeDept} or Admin can ${action} this unlock request. Your department is ${staff.department || 'unassigned'}. Marks remain frozen.`
      });
    }

    const newSessionStatus = action === 'approve' ? 'unlocked' : 'locked';
    const newRequestStatus = action === 'approve' ? 'approved' : 'rejected';

    await db.execute(
      `UPDATE marks_sessions SET status = ? WHERE id = ?`,
      [newSessionStatus, sessionId]
    );

    await db.execute(
      `UPDATE mark_unlock_requests
       SET status = ?, actioned_at = CURRENT_TIMESTAMP, actioned_by = ?
       WHERE id = ?`,
      [newRequestStatus, staff.id, requestId]
    );

    // Notify requesting faculty member directly
    try {
      if (reqData.staff_id) {
        const subTitle = reqData.subject_code ? `${reqData.subject_code} ${reqData.subject_name || ''}` : 'the subject';
        const actionTitle = action === 'approve' ? 'Marks Unlock Approved' : 'Marks Unlock Declined';
        const actionMsg = action === 'approve'
          ? `Your request to edit marks for ${subTitle} was approved by ${authoritativeDept} HOD (${staff.name}). You may now modify and re-freeze the marks sheet.`
          : `Your request to edit marks for ${subTitle} was declined by ${authoritativeDept} HOD (${staff.name}).`;
        const actionLink = action === 'approve' ? `/marks-entry?classId=${reqData.class_id || ''}` : '/reports';

        await db.execute(
          `INSERT INTO notifications (target_id, title, message, link) VALUES (?, ?, ?, ?)`,
          [reqData.staff_id, actionTitle, actionMsg, actionLink]
        );
      }
    } catch (notifErr) {
      console.error('Failed to notify staff on unlock decision:', notifErr);
    }

    res.json({ success: true, message: `Request ${action}d successfully by ${staff.name}.` });
  } catch (err) {
    if (err.status === 401) {
      return res.status(401).json({ error: err.message });
    }
    console.error('POST /marks/approve-unlock error:', err);
    res.status(500).json({ error: 'Failed to process unlock action: ' + err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/marks/class-summary?classId=CL001&sessionLabel=internal1
// Consolidated class data for Class Coordinator & Reports
// ─────────────────────────────────────────────────────────────
router.get('/class-summary', async (req, res) => {
  try {
    const { classId, sessionLabel = 'internal1' } = req.query;
    if (!classId) return res.status(400).json({ error: 'Missing classId' });

    // Class info
    const [clsRows] = await db.execute('SELECT * FROM classes WHERE id = ?', [classId]);
    if (!clsRows.length) return res.status(404).json({ error: 'Class not found' });
    const classObj = clsRows[0];

    // Subjects in class
    const [subjects] = await db.execute(
      `SELECT s.*, st.name AS staff_name
       FROM subjects s
       LEFT JOIN staffs st ON st.id = s.faculty_id
       WHERE s.class_id = ?
       ORDER BY s.code`,
      [classId]
    );

    // Merge system_settings subject_allocations configured from Admin Panel
    try {
      const [settingRows] = await db.execute("SELECT setting_value FROM system_settings WHERE setting_key = 'subject_allocations'");
      if (settingRows.length > 0 && settingRows[0].setting_value) {
        const allocs = typeof settingRows[0].setting_value === 'string'
          ? JSON.parse(settingRows[0].setting_value)
          : settingRows[0].setting_value;
        if (allocs && typeof allocs === 'object') {
          for (const sub of subjects) {
            const cleanId = String(sub.id || '').replace(/[\s\-]+/g, '');
            const cleanCode = String(sub.code || '').replace(/[\s\-]+/g, '');
            const classKey = `${sub.code}_${classId}`;
            const cleanClassKey = `${cleanCode}_${classId}`;
            const idClassKey = `${sub.id}_${classId}`;
            const a = allocs[classKey] || allocs[cleanClassKey] || allocs[idClassKey] ||
                      allocs[sub.id] || allocs[cleanId] || allocs[sub.code] || allocs[cleanCode] ||
                      Object.values(allocs).find(x => x && (x.id === sub.id || (x.code === sub.code && (!x.class_id || x.class_id === classId))));
            if (a) {
              const a1 = (a.int1_hours !== undefined && a.int1_hours !== null && a.int1_hours !== '') ? a.int1_hours : a.int1;
              const a2 = (a.int2_hours !== undefined && a.int2_hours !== null && a.int2_hours !== '') ? a.int2_hours : a.int2;
              const alb = (a.lab_hours !== undefined && a.lab_hours !== null && a.lab_hours !== '') ? a.lab_hours : a.lab;
              const atot = (a.total_hours !== undefined && a.total_hours !== null && a.total_hours !== '') ? a.total_hours : a.total;

              if (a1 !== undefined && a1 !== null && a1 !== '') sub.int1_hours = parseInt(a1, 10);
              if (a2 !== undefined && a2 !== null && a2 !== '') sub.int2_hours = parseInt(a2, 10);
              if (alb !== undefined && alb !== null && alb !== '') sub.lab_hours = parseInt(alb, 10);
              if (atot !== undefined && atot !== null && atot !== '') sub.total_hours = parseInt(atot, 10);
            }
          }
        }
      }
    } catch (allocErr) {
      console.warn('Note: subject_allocations merge notice in class-summary:', allocErr.message);
    }

    // Students in class
    const [students] = await db.execute(
      'SELECT id, s_no, roll_no, name FROM students WHERE class_id = ? ORDER BY s_no',
      [classId]
    );

    // Sessions for this class and sessionLabel
    const [sessions] = await db.execute(
      'SELECT * FROM marks_sessions WHERE class_id = ? AND session_label = ?',
      [classId, sessionLabel]
    );

    const sessionIds = sessions.map(s => s.id);
    let allAttendance = [];
    let allComponents = [];
    let allMarks = [];

    if (sessionIds.length > 0) {
      const placeholders = sessionIds.map(() => '?').join(',');
      const [att] = await db.execute(
        `SELECT * FROM session_attendance WHERE session_id IN (${placeholders})`,
        sessionIds
      );
      allAttendance = att;

      const [comps] = await db.execute(
        `SELECT * FROM assessment_components WHERE session_id IN (${placeholders})`,
        sessionIds
      );
      allComponents = comps;

      const [mks] = await db.execute(
        `SELECT * FROM marks WHERE session_id IN (${placeholders})`,
        sessionIds
      );
      allMarks = mks;
    }

    res.json({
      classObj,
      subjects,
      students,
      sessions,
      allAttendance,
      allComponents,
      allMarks
    });
  } catch (err) {
    console.error('GET /marks/class-summary error:', err);
    res.status(500).json({ error: 'Failed to fetch class summary.' });
  }
});




// ─────────────────────────────────────────────────────────────
// GET /api/marks/audit-logs/:sessionId
// Audit logs showing historical mark changes (old value, new value, user, timestamp)
// ─────────────────────────────────────────────────────────────
router.get('/audit-logs/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { studentId } = req.query;
    let sql = `
      SELECT al.id, al.session_id, al.student_id, al.component_id, al.field_name,
             al.old_value, al.new_value, al.user_id, al.user_name, al.action_type, al.created_at,
             s.name AS student_name, s.roll_no,
             ac.label AS component_label
      FROM marks_audit_logs al
      LEFT JOIN students s ON s.id = al.student_id
      LEFT JOIN assessment_components ac ON ac.id = al.component_id
      WHERE al.session_id = ?
    `;
    const params = [sessionId];
    if (studentId) {
      sql += ' AND al.student_id = ?';
      params.push(studentId);
    }
    sql += ' ORDER BY al.created_at DESC, al.id DESC';
    const [rows] = await db.execute(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('GET /marks/audit-logs error:', err);
    res.status(500).json({ error: 'Failed to fetch audit logs.' });
  }
});

export default router;
