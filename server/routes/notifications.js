import express from 'express';
import db from '../db.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// GET /api/notifications/:role/:userId
// Fetch notifications for a user based on their role and ID
// ─────────────────────────────────────────────────────────────
router.get('/:role/:userId', async (req, res) => {
  try {
    const { role, userId } = req.params;
    const { department } = req.query;
    
    // Notifications targeted at this specific user OR their role generally
    const [rows] = await db.execute(
      `SELECT * FROM notifications 
       WHERE target_id = ? OR (target_role = ? AND (target_department = ? OR target_department IS NULL))
       ORDER BY created_at DESC 
       LIMIT 50`,
      [userId, role, department || null]
    );
    
    res.json(rows);
  } catch (err) {
    console.error('GET /notifications error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/notifications/:id/read
// Mark a notification as read
// ─────────────────────────────────────────────────────────────
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute(
      'UPDATE notifications SET is_read = TRUE WHERE id = ?',
      [id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('PUT /notifications/:id/read error:', err);
    res.status(500).json({ error: 'Failed to mark notification read.' });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/notifications/:id
// Delete a notification
// ─────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute(
      'DELETE FROM notifications WHERE id = ?',
      [id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /notifications/:id error:', err);
    res.status(500).json({ error: 'Failed to delete notification.' });
  }
});

export default router;
