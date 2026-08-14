import express from 'express';
import db from '../db.js';

const router = express.Router();

// GET /api/students?classId=CL001
router.get('/', async (req, res) => {
  try {
    const { classId } = req.query;
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
