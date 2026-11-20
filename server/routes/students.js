import express from 'express';
import db from '../db.js';
import { verifyAuthToken } from './auth.js';

const router = express.Router();

/**
 * Checks if a class belongs to an HOD's department or their owning PG programme.
 */
function isClassAuthorizedForHod(cls, hodDept) {
  if (!cls || !hodDept) return false;
  const dStr = String(hodDept).trim().toLowerCase();
  const clsDept = String(cls.department || '').trim().toLowerCase();
  const clsName = String(cls.name || '').trim().toUpperCase();
  const clsId = String(cls.id || '').trim();

  // 1. Direct department match (UG or matching department field)
  if (clsDept === dStr) return true;

  // 2. PG Programme Owning Department match
  const isCseHod = dStr.includes('computer') || dStr === 'cse';
  const isEceHod = dStr.includes('electronics') || dStr === 'ece';
  const isCivilHod = dStr.includes('civil');
  const isMechHod = dStr.includes('mechanical') || dStr === 'mech';

  // CSE owns M.E. CSE
  if (isCseHod) {
    if (clsId === 'CL_1794306342' || (clsName.includes('CSE') && (clsName.includes('ME') || clsName.includes('M.E.')))) return true;
  }
  // ECE owns M.E. EST
  if (isEceHod) {
    if (clsId === 'CL_1794909437' || clsName.includes('EST') || clsName.includes('EMBEDDED')) return true;
  }
  // Civil owns M.E. Structural Engineering
  if (isCivilHod) {
    if (clsId === 'CL_1794909933' || clsId === 'CL_1794909988' || (/\bSE\b/.test(clsName) && (clsName.includes('ME') || clsName.includes('M.E.'))) || clsName.includes('STRUCTURAL')) return true;
  }
  // Mechanical owns M.E. Manufacturing Engineering
  if (isMechHod) {
    if (clsId === 'CL_1794910479' || clsId === 'CL_1794910622' || clsName.includes('MFE') || clsName.includes('MANUFACTURING')) return true;
  }

  return false;
}

// GET /api/students?classId=CL001
router.get('/', async (req, res) => {
  try {
    const { classId, subjectId } = req.query;

    // Check token if present for role-based authorization
    let authUser = null;
    const authHeader = req.headers['authorization'];
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      const verified = verifyAuthToken(token);
      if (verified && verified.id) {
        authUser = verified;
      }
    }

    // Role-based access control for HOD
    if (authUser && authUser.role === 'hod' && authUser.id) {
      let isSubjectAuthorized = false;

      // When subjectId is provided, verify subject-specific faculty assignment in the database
      if (classId && subjectId) {
        const [subRows] = await db.execute(
          'SELECT id, class_id, faculty_id FROM subjects WHERE id = ? LIMIT 1',
          [subjectId]
        );
        if (subRows.length > 0) {
          const sub = subRows[0];
          // 1. Subject exists (subRows.length > 0)
          // 2. Subject belongs to requested class
          // 3. Faculty assigned to that subject matches authenticated user
          if (String(sub.class_id) === String(classId) && String(sub.faculty_id) === String(authUser.id)) {
            isSubjectAuthorized = true;
          }
        }
      }

      // If subject assignment is not verified, apply existing HOD department-based authorization
      if (!isSubjectAuthorized) {
        // Fetch HOD's registered department from staffs table to prevent spoofing
        const [staffRows] = await db.execute('SELECT department FROM staffs WHERE id = ? LIMIT 1', [authUser.id]);
        const hodDept = staffRows[0]?.department;

        if (hodDept && classId) {
          const [classRows] = await db.execute('SELECT id, name, department FROM classes WHERE id = ? LIMIT 1', [classId]);
          if (classRows.length > 0) {
            const cls = classRows[0];
            if (!isClassAuthorizedForHod(cls, hodDept)) {
              return res.status(403).json({
                error: "Access denied: You do not have permission to view students from another department's academic programme."
              });
            }
          }
        }
      }
    }

    let sql = 'SELECT id, s_no, roll_no, name, class_id FROM students';
    const params = [];
    if (classId) {
      sql += ' WHERE class_id = ?';
      params.push(classId);
    }
    sql += ' ORDER BY s_no ASC';
    const [rows] = await db.execute(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('GET /students error:', err);
    res.status(500).json({ error: 'Failed to fetch students.' });
  }
});

// POST /api/students
router.post('/', async (req, res) => {
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

// PUT /api/students/:id
router.put('/:id', async (req, res) => {
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

// DELETE /api/students/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM students WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /students error:', err);
    res.status(500).json({ error: 'Failed to delete student. They may have existing marks.' });
  }
});

export default router;
