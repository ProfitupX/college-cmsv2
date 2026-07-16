import express from 'express';
import db from '../db.js';

const router = express.Router();

// GET /api/classes
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT c.*, COUNT(s.id) AS student_count
      FROM classes c
      LEFT JOIN students s ON s.class_id = c.id
      GROUP BY c.id
      ORDER BY c.id
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /classes error:', err);
    res.status(500).json({ error: 'Failed to fetch classes.' });
  }
});

// POST /api/classes (Supports single object or array for bulk)
router.post('/', async (req, res) => {
  const conn = await db.getConnection();
  try {
    const data = Array.isArray(req.body) ? req.body : [req.body];
    if (data.length === 0) return res.status(400).json({ error: 'No data provided.' });

    await conn.beginTransaction();
    for (const item of data) {
      const { id, name, department, semester, year_label, section, room_no, academic_year, batch, class_coordinator, asst_coordinator } = item;
      if (!id || !name) throw new Error(`ID and Name required for class ${id || 'unknown'}`);
      
      await conn.execute(
        `INSERT INTO classes (id, name, department, semester, year_label, section, room_no, academic_year, batch, class_coordinator, asst_coordinator)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
           name=VALUES(name), department=VALUES(department), semester=VALUES(semester), year_label=VALUES(year_label),
           section=VALUES(section), room_no=VALUES(room_no), academic_year=VALUES(academic_year), batch=VALUES(batch),
           class_coordinator=VALUES(class_coordinator), asst_coordinator=VALUES(asst_coordinator)`,
        [id, name, department || null, semester || null, year_label || null, section || null, room_no || null, academic_year || null, batch || null, class_coordinator || null, asst_coordinator || null]
      );
    }
    await conn.commit();
    res.status(201).json({ success: true, count: data.length });
  } catch (err) {
    await conn.rollback();
    console.error('POST /classes error:', err);
    res.status(400).json({ error: err.message || 'Failed to add classes.' });
  } finally {
    conn.release();
  }
});

// PUT /api/classes/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, department, semester, year_label, section, room_no, academic_year, batch, class_coordinator, asst_coordinator } = req.body;
    await db.execute(
      `UPDATE classes SET name=?, department=?, semester=?, year_label=?, section=?, room_no=?, academic_year=?, batch=?, class_coordinator=?, asst_coordinator=?
       WHERE id = ?`,
      [name, department || null, semester || null, year_label || null, section || null, room_no || null, academic_year || null, batch || null, class_coordinator || null, asst_coordinator || null, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('PUT /classes error:', err);
    res.status(500).json({ error: 'Failed to update class.' });
  }
});

// DELETE /api/classes/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM classes WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /classes error:', err);
    res.status(500).json({ error: 'Failed to delete class. Make sure it has no students or subjects assigned.' });
  }
});

export default router;
