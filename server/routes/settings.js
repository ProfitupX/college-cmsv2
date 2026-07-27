import express from 'express';
import db from '../db.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// GET /api/settings/:key
// Get a specific setting (like marks_entry_deadline)
// ─────────────────────────────────────────────────────────────
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const [rows] = await db.execute(
      'SELECT setting_value FROM system_settings WHERE setting_key = ?',
      [key]
    );
    
    if (rows.length === 0) {
      return res.json({ value: null });
    }
    res.json({ value: rows[0].setting_value });
  } catch (err) {
    console.error('GET /settings error:', err);
    res.status(500).json({ error: 'Failed to fetch setting.' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/settings/:key
// Set a system setting (HOD only logic applied in frontend)
// ─────────────────────────────────────────────────────────────
router.post('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    if (!value) return res.status(400).json({ error: 'Value is required' });

    // Insert or update
    await db.execute(
      `INSERT INTO system_settings (setting_key, setting_value) 
       VALUES (?, ?) 
       ON DUPLICATE KEY UPDATE setting_value = ?`,
      [key, value, value]
    );

    // If setting a deadline, create a notification for all staff
    if (key === 'marks_entry_deadline') {
      const deadlineDate = new Date(value).toLocaleDateString('en-IN');
      await db.execute(
        `INSERT INTO notifications (target_role, title, message, link)
         VALUES ('faculty', 'Marks Entry Deadline Set', ?, '/dashboard')`,
        [`The HOD has set the marks entry deadline to ${deadlineDate}. Please complete your entries before the deadline.`]
      );
    }

    res.json({ success: true, message: 'Setting updated successfully.' });
  } catch (err) {
    console.error('POST /settings error:', err);
    res.status(500).json({ error: 'Failed to update setting.' });
  }
});

export default router;
