import express from 'express';
import db from '../db.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// GET /api/admin/staffs
// List all staffs for the Admin Panel
// ─────────────────────────────────────────────────────────────
router.get('/staffs', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, name, short_name, email, role, department FROM staffs ORDER BY name ASC'
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
      'SELECT id, name, short_name, designation, role, email, password, employee_id, department FROM staffs ORDER BY name ASC'
    );
    res.json(rows);
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

    const defaultPwd = password || 'faculty123';

    await db.execute(
      `INSERT INTO staffs (id, name, short_name, designation, role, email, password, employee_id, department)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name=VALUES(name), short_name=VALUES(short_name), designation=VALUES(designation),
         role=VALUES(role), email=VALUES(email), password=VALUES(password),
         employee_id=VALUES(employee_id), department=VALUES(department)`,
      [id, name, short_name || null, designation || null, role || 'faculty', email, defaultPwd, employee_id || null, department || null]
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
      sql += `, password = ?`;
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

    const [result] = await db.execute(
      'UPDATE staffs SET password = ? WHERE id = ?',
      [newPassword, staffId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Staff member not found.' });
    }

    res.json({ success: true, message: 'Password reset successfully.' });
  } catch (err) {
    console.error('PUT /admin/reset-password error:', err);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

export default router;
