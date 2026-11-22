import express from 'express';
import db from '../db.js';
import { verifyAuthToken } from './auth.js';
import {
  canonicalizeDepartment,
  getAuthoritativeSubjectDepartment,
  isClassAuthorizedForHod
} from './marks.js';

export { isClassAuthorizedForHod };

const router = express.Router();

/**
 * Canonicalizes a person's name or coordinator field by:
 * 1. Stripping verified, explicit designation suffixes found in production
 *    (e.g. ',TF/Eng', ', AP/Phy', ' TF/Maths', ', AP/Tamil', ' AP/Chem').
 * 2. Removing leading honorific titles (Mr, Mrs, Ms, Dr, Prof).
 * 3. Normalizing case, and stripping non-alphanumeric punctuation and spaces.
 * Strictly accepts only valid strings and returns an alphanumeric string.
 * Unknown designation suffixes and arbitrary words are NOT stripped.
 */
function canonicalizePersonName(rawName) {
  if (!rawName || typeof rawName !== 'string') return '';
  let trimmed = rawName.trim();
  if (!trimmed) return '';

  // Explicit allowlist of verified production designation suffixes
  trimmed = trimmed.replace(/(?:,\s*|\s+)(?:tf\/eng|ap\/phy|tf\/maths|ap\/tamil|ap\/chem)$/i, '').trim();
  if (!trimmed) return '';

  return trimmed
    .toLowerCase()
    .replace(/^(dr|mrs|mr|ms|prof)\.?\s*/i, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Checks if a faculty staff member is the verified coordinator or assistant coordinator
 * of the target class using classes.class_coordinator and classes.asst_coordinator.
 * Uses strict equality on canonical title-stripped names and exact staff IDs.
 * Does NOT use substring matching, partial matching or fuzzy matching.
 */
function isFacultyClassCoordinator(targetClass, staff) {
  if (!targetClass || !staff) return false;

  const staffId = (staff.id && typeof staff.id === 'string') ? staff.id.trim().toLowerCase() : '';
  const staffNameCanonical = canonicalizePersonName(staff.name);
  const staffShortCanonical = canonicalizePersonName(staff.short_name);

  const checkMatch = (rawCoord) => {
    if (!rawCoord || typeof rawCoord !== 'string') return false;
    const cleanCoord = rawCoord.trim();
    if (!cleanCoord) return false;

    // 1. Exact Staff ID match (only where the stored coordinator field actually contains a staff ID)
    if (staffId && cleanCoord.toLowerCase() === staffId) return true;

    const coordCanonical = canonicalizePersonName(cleanCoord);
    if (!coordCanonical) return false;

    // 2. Exact Title-Stripped Canonical Name Match against staff.name
    if (staffNameCanonical && coordCanonical === staffNameCanonical) return true;

    // 3. Exact Title-Stripped Canonical Name Match against staff.short_name
    if (staffShortCanonical && coordCanonical === staffShortCanonical) return true;

    return false;
  };

  return checkMatch(targetClass.class_coordinator) || checkMatch(targetClass.asst_coordinator);
}

// ─────────────────────────────────────────────────────────────
// Mandatory Authentication Middleware for all /api/students routes
// ─────────────────────────────────────────────────────────────
router.use((req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required: Missing Bearer token.'
    });
  }

  const token = authHeader.slice(7).trim();
  const verified = verifyAuthToken(token);
  if (!verified || !verified.id) {
    return res.status(401).json({
      error: 'Authentication required: Invalid or expired token.'
    });
  }

  req.authUser = verified;
  next();
});

// ─────────────────────────────────────────────────────────────
// GET /api/students
// Query params: classId (optional for admin/leadership, required for hod/faculty), subjectId (optional)
// ─────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { classId, subjectId } = req.query;
    const authUser = req.authUser;
    const userRole = (authUser.role || '').toLowerCase();

    const cleanClassId = classId && typeof classId === 'string'
      ? classId.trim()
      : (classId ? String(classId).trim() : '');

    // 1. Unscoped Global Roster (without classId)
    if (!cleanClassId) {
      if (['admin', 'principal', 'vice_principal'].includes(userRole)) {
        const [rows] = await db.execute(
          'SELECT id, s_no, roll_no, name, class_id FROM students ORDER BY s_no ASC'
        );
        return res.json(rows);
      }

      return res.status(403).json({
        error: 'Access denied: A valid class ID is required.'
      });
    }

    // 2. Administrative and Leadership Scoped Access
    if (['admin', 'principal', 'vice_principal'].includes(userRole)) {
      const [rows] = await db.execute(
        'SELECT id, s_no, roll_no, name, class_id FROM students WHERE class_id = ? ORDER BY s_no ASC',
        [cleanClassId]
      );
      return res.json(rows);
    }

    // 3. Target Class Existence Check for HOD and Faculty/Staff
    const [classRows] = await db.execute(
      'SELECT id, name, department, class_coordinator, asst_coordinator FROM classes WHERE id = ? LIMIT 1',
      [cleanClassId]
    );
    if (classRows.length === 0) {
      return res.status(403).json({
        error: 'Access denied: The requested class does not exist or has an invalid mapping.'
      });
    }
    const targetClass = classRows[0];

    // 4. Department HOD Authorization
    if (userRole === 'hod') {
      let isAuthorized = false;

      const [staffRows] = await db.execute(
        'SELECT id, name, short_name, class_role, department FROM staffs WHERE id = ? LIMIT 1',
        [authUser.id]
      );
      const staffRecord = staffRows[0] || {};
      const hodDept = staffRecord.department;
      const hodCanonical = canonicalizeDepartment(hodDept);
      const isCoordinator = isFacultyClassCoordinator(targetClass, staffRecord);

      if (subjectId) {
        const cleanSubjectId = typeof subjectId === 'string' ? subjectId.trim() : String(subjectId).trim();
        let [subRows] = await db.execute(
          'SELECT id, code, name, department, class_id, faculty_id FROM subjects WHERE id = ? LIMIT 1',
          [cleanSubjectId]
        );
        if (subRows.length === 0) {
          [subRows] = await db.execute(
            'SELECT id, code, name, department, class_id, faculty_id FROM subjects WHERE code = ? AND class_id = ? LIMIT 1',
            [cleanSubjectId, cleanClassId]
          );
        }
        if (subRows.length === 0) {
          return res.status(403).json({
            error: 'Access denied: Invalid or unmapped subject.'
          });
        }

        const sub = subRows[0];

        // Require subject.class_id to be present and exactly equal to requested classId
        if (!sub.class_id || String(sub.class_id) !== String(cleanClassId)) {
          return res.status(403).json({
            error: 'Access denied: Subject does not belong to the requested class or has no valid class mapping.'
          });
        }

        // 4a. Assigned faculty authorization (HOD assigned to teach this subject in this class)
        if (sub.faculty_id && String(sub.faculty_id) === String(authUser.id)) {
          isAuthorized = true;
        }

        // 4b. Class coordinator authority
        if (!isAuthorized && isCoordinator) {
          isAuthorized = true;
        }

        // 4c. Subject HOD or Class HOD authority
        if (!isAuthorized) {
          // Subject HOD authorization (using established marks.js department resolution)
          if (hodCanonical) {
            const authDept = getAuthoritativeSubjectDepartment(sub, targetClass);
            if (authDept && authDept === hodCanonical) {
              isAuthorized = true;
            }
          }

          // Class HOD authorization (using standardized PG programme owning department mapping)
          if (!isAuthorized && isClassAuthorizedForHod(targetClass, hodDept)) {
            isAuthorized = true;
          }

          if (!isAuthorized) {
            return res.status(403).json({
              error: "Access denied: You do not have permission to view students from another department's academic programme."
            });
          }
        }
      } else {
        // Fallback when subjectId is not provided:
        // Check class-level HOD authority, coordinator assignment, or assigned teaching subjects
        if (isClassAuthorizedForHod(targetClass, hodDept)) {
          isAuthorized = true;
        }

        if (!isAuthorized && isCoordinator) {
          isAuthorized = true;
        }

        if (!isAuthorized) {
          const [assignedSubs] = await db.execute(
            'SELECT id FROM subjects WHERE class_id = ? AND faculty_id = ? LIMIT 1',
            [cleanClassId, authUser.id]
          );
          if (assignedSubs.length > 0) {
            isAuthorized = true;
          }
        }

        if (!isAuthorized) {
          return res.status(403).json({
            error: "Access denied: You do not have permission to view students from another department's academic programme."
          });
        }
      }

      // If authorized as HOD, fetch students
      const [rows] = await db.execute(
        'SELECT id, s_no, roll_no, name, class_id FROM students WHERE class_id = ? ORDER BY s_no ASC',
        [cleanClassId]
      );
      return res.json(rows);
    }

    // 5. Faculty, Staff, and Class Coordinator Scoped Authorization
    if (userRole === 'faculty' || userRole === 'staff' || userRole === 'class_coordinator') {
      const [staffRows] = await db.execute(
        'SELECT id, name, short_name, class_role, department FROM staffs WHERE id = ? LIMIT 1',
        [authUser.id]
      );
      if (staffRows.length === 0) {
        return res.status(403).json({
          error: 'Access denied: Staff member not found in staff registry.'
        });
      }
      const staffRecord = staffRows[0];
      const isCoordinator = isFacultyClassCoordinator(targetClass, staffRecord);

      if (subjectId) {
        const cleanSubjectId = typeof subjectId === 'string' ? subjectId.trim() : String(subjectId).trim();
        let [subRows] = await db.execute(
          'SELECT id, code, name, department, class_id, faculty_id FROM subjects WHERE id = ? LIMIT 1',
          [cleanSubjectId]
        );
        if (subRows.length === 0) {
          [subRows] = await db.execute(
            'SELECT id, code, name, department, class_id, faculty_id FROM subjects WHERE code = ? AND class_id = ? LIMIT 1',
            [cleanSubjectId, cleanClassId]
          );
        }
        if (subRows.length === 0) {
          return res.status(403).json({
            error: 'Access denied: Invalid or unmapped subject.'
          });
        }

        const sub = subRows[0];

        // Require subject.class_id to be present and exactly equal to requested classId
        if (!sub.class_id || String(sub.class_id) !== String(cleanClassId)) {
          return res.status(403).json({
            error: 'Access denied: Subject does not belong to the requested class or has no valid class mapping.'
          });
        }

        const isAssigned = sub.faculty_id && String(sub.faculty_id) === String(authUser.id);
        if (!isAssigned && !isCoordinator) {
          return res.status(403).json({
            error: 'Access denied: You are not assigned to this subject and are not the class coordinator.'
          });
        }
      } else {
        // When subjectId is omitted: permit only verified coordinator or faculty with assigned subject(s) in this class
        if (!isCoordinator) {
          const [assignedSubs] = await db.execute(
            'SELECT id FROM subjects WHERE class_id = ? AND faculty_id = ? LIMIT 1',
            [cleanClassId, authUser.id]
          );
          if (assignedSubs.length === 0) {
            return res.status(403).json({
              error: 'Access denied: You do not coordinate this class and have no assigned subjects in it.'
            });
          }
        }
      }

      // If authorized as Faculty/Staff, fetch students
      const [rows] = await db.execute(
        'SELECT id, s_no, roll_no, name, class_id FROM students WHERE class_id = ? ORDER BY s_no ASC',
        [cleanClassId]
      );
      return res.json(rows);
    }

    // 6. Unknown / Unsupported Roles
    return res.status(403).json({
      error: 'Access denied: Unsupported or unrecognized user role.'
    });

  } catch (err) {
    console.error('GET /students error:', err);
    res.status(500).json({ error: 'Failed to fetch students.' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/students
// Admin only
// ─────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  if ((req.authUser?.role || '').toLowerCase() !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Admin role required to create students.' });
  }

  const conn = await db.getConnection();
  try {
    const data = Array.isArray(req.body) ? req.body : [req.body];
    if (data.length === 0) return res.status(400).json({ error: 'No data provided.' });

    await conn.beginTransaction();
    for (const item of data) {
      let { id, s_no, roll_no, name, class_id } = item;
      
      // Auto-generate ID if missing
      if (!id && roll_no) {
        id = `ST_${roll_no}`;
      }

      if (!id || !roll_no || !name || !class_id) {
        throw new Error(`Missing required fields for student ${name || roll_no || 'unknown'}. Please check your CSV columns (id, s_no, roll_no, name, class_id).`);
      }
      
      try {
        await conn.execute(
          `INSERT INTO students (id, s_no, roll_no, name, class_id)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE 
             s_no=VALUES(s_no), roll_no=VALUES(roll_no), name=VALUES(name), class_id=VALUES(class_id)`,
          [id, s_no || 0, roll_no, name, class_id]
        );
      } catch (dbErr) {
        if (dbErr.code === 'ER_NO_REFERENCED_ROW_2' && dbErr.message.includes('class_id')) {
          throw new Error(`Invalid class_id "${class_id}" for student ${name}. Please use correct Class ID (e.g., CL_CSE_III).`);
        }
        throw dbErr;
      }
    }
    await conn.commit();
    res.status(201).json({ success: true, count: data.length });
  } catch (err) {
    await conn.rollback();
    console.error('POST /students error:', err);
    res.status(400).json({ error: err.message || 'Failed to add students.' });
  } finally {
    conn.release();
  }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/students/:id
// Admin only
// ─────────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  if ((req.authUser?.role || '').toLowerCase() !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Admin role required to update students.' });
  }

  try {
    const { s_no, roll_no, name, class_id } = req.body;
    await db.execute(
      `UPDATE students SET s_no=?, roll_no=?, name=?, class_id=? WHERE id = ?`,
      [s_no || 0, roll_no, name, class_id, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('PUT /students error:', err);
    res.status(500).json({ error: 'Failed to update student.' });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/students/:id
// Admin only
// ─────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  if ((req.authUser?.role || '').toLowerCase() !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Admin role required to delete students.' });
  }

  try {
    await db.execute('DELETE FROM students WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /students error:', err);
    res.status(500).json({ error: 'Failed to delete student. They may have existing marks.' });
  }
});

export default router;
