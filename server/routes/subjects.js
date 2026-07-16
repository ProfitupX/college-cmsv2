import express from 'express';
import db from '../db.js';

const router = express.Router();

// GET /api/subjects?classId=CL001
// GET /api/subjects?facultyId=FAC001
router.get('/', async (req, res) => {
  try {
    const { classId, facultyId } = req.query;
    let sql = `
      SELECT s.id, s.code, s.name, s.acronym, s.type, s.department,
             s.semester, s.faculty_id, s.class_id,
             f.name AS faculty_name, f.designation AS faculty_designation
      FROM subjects s
      LEFT JOIN staffs f ON f.id = s.faculty_id
    `;
    const params = [];
    const where = [];

    if (classId)   { where.push('s.class_id = ?');   params.push(classId); }
    if (facultyId) { where.push('s.faculty_id = ?'); params.push(facultyId); }
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY s.code ASC';

    const [rows] = await db.execute(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('GET /subjects error:', err);
    res.status(500).json({ error: 'Failed to fetch subjects.' });
  }
});

// POST /api/subjects
router.post('/', async (req, res) => {
  const conn = await db.getConnection();
  try {
    const data = Array.isArray(req.body) ? req.body : [req.body];
    if (data.length === 0) return res.status(400).json({ error: 'No data provided.' });

    await conn.beginTransaction();
    for (const item of data) {
      const { id, code, name, acronym, type, department, semester, faculty_id, class_id } = item;
      if (!id || !code || !name) throw new Error(`Missing required fields for subject ${id || 'unknown'}`);
      
      await conn.execute(
        `INSERT INTO subjects (id, code, name, acronym, type, department, semester, faculty_id, class_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
           code=VALUES(code), name=VALUES(name), acronym=VALUES(acronym), type=VALUES(type), 
           department=VALUES(department), semester=VALUES(semester), faculty_id=VALUES(faculty_id), class_id=VALUES(class_id)`,
        [id, code, name, acronym || null, type || 'Theory', department || null, semester || null, faculty_id || null, class_id || null]
      );
    }
    await conn.commit();
    res.status(201).json({ success: true, count: data.length });
  } catch (err) {
    await conn.rollback();
    console.error('POST /subjects error:', err);
    res.status(400).json({ error: err.message || 'Failed to add subjects.' });
  } finally {
    conn.release();
  }
});

// PUT /api/subjects/:id
router.put('/:id', async (req, res) => {
  try {
    const { code, name, acronym, type, department, semester, faculty_id, class_id } = req.body;
    await db.execute(
      `UPDATE subjects SET code=?, name=?, acronym=?, type=?, department=?, semester=?, faculty_id=?, class_id=? WHERE id = ?`,
      [code, name, acronym || null, type || 'Theory', department || null, semester || null, faculty_id || null, class_id || null, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('PUT /subjects error:', err);
    res.status(500).json({ error: 'Failed to update subject.' });
  }
});

// DELETE /api/subjects/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM subjects WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /subjects error:', err);
    res.status(500).json({ error: 'Failed to delete subject. It may have existing marks sessions.' });
  }
});

export default router;
