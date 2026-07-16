import express from 'express';
import db from '../db.js';

const router = express.Router();

// GET /api/staffs
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT id, name, short_name, designation, role, email, employee_id, class_role, department FROM staffs ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    console.error('GET /staffs error:', err);
    res.status(500).json({ error: 'Failed to fetch staffs.' });
  }
});

// POST /api/staffs
router.post('/', async (req, res) => {
  const conn = await db.getConnection();
  try {
    const data = Array.isArray(req.body) ? req.body : [req.body];
    if (data.length === 0) return res.status(400).json({ error: 'No data provided.' });

    await conn.beginTransaction();
    for (const item of data) {
      const { id, name, short_name, designation, email, role, employee_id, department } = item;
      if (!id || !name || !email) throw new Error(`Missing required fields for staff ${id || 'unknown'}`);
      
      await conn.execute(
        `INSERT INTO staffs (id, name, short_name, designation, role, email, employee_id, department)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
           name=VALUES(name), short_name=VALUES(short_name), designation=VALUES(designation),
           role=VALUES(role), email=VALUES(email), employee_id=VALUES(employee_id), department=VALUES(department)`,
        [id, name, short_name || null, designation || null, role || 'faculty', email, employee_id || null, department || null]
      );
    }
    await conn.commit();
    res.status(201).json({ success: true, count: data.length });
  } catch (err) {
    await conn.rollback();
    console.error('POST /staffs error:', err);
    res.status(400).json({ error: err.message || 'Failed to add staffs.' });
  } finally {
    conn.release();
  }
});

// PUT /api/staffs/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, short_name, designation, email, role, employee_id, department } = req.body;
    await db.execute(
      `UPDATE staffs SET name=?, short_name=?, designation=?, email=?, role=?, employee_id=?, department=? WHERE id = ?`,
      [name, short_name || null, designation || null, email, role || 'faculty', employee_id || null, department || null, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('PUT /staffs error:', err);
    res.status(500).json({ error: 'Failed to update staff.' });
  }
});

// DELETE /api/staffs/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM staffs WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /staffs error:', err);
    res.status(500).json({ error: 'Failed to delete staff. Make sure they have no linked subjects or sessions.' });
  }
});

export default router;
