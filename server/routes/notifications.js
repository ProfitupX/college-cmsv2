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

    const isLeadership = ['admin', 'principal', 'vice_principal'].includes(role);
    const isAcademicStaff = ['faculty', 'class_coordinator', 'hod'].includes(role);

    // Build role matching set:
    // Every user matches their own role, plus global broadcasts: 'all', 'all_staff'
    const matchingRoles = new Set([role, 'all', 'all_staff']);

    if (isAcademicStaff) {
      matchingRoles.add('staff');
      // All coordinators and HoDs are teaching faculty, so they receive faculty notices (e.g. deadline reminders)
      matchingRoles.add('faculty');
      if (role === 'faculty') {
        matchingRoles.add('class_coordinator');
      }
    }

    if (isLeadership) {
      matchingRoles.add('admin');
      matchingRoles.add('staff');
      matchingRoles.add('faculty');
      matchingRoles.add('hod');
      matchingRoles.add('class_coordinator');
    }

    const rolesArray = Array.from(matchingRoles);
    const placeholders = rolesArray.map(() => '?').join(', ');

    let deptCondition = '';
    const params = [userId, ...rolesArray];

    if (isLeadership) {
      // Leadership has institution-wide visibility
      deptCondition = '1=1';
    } else if (department && department.trim() !== '') {
      deptCondition = '(target_department IS NULL OR target_department = "" OR target_department = ? OR target_department = "Science and Humanities")';
      params.push(department);
    } else {
      deptCondition = '(target_department IS NULL OR target_department = "")';
    }

    const query = `
      SELECT * FROM notifications 
      WHERE (target_id = ?) 
         OR (target_role IN (${placeholders}) AND (${deptCondition}))
      ORDER BY created_at DESC 
      LIMIT 50
    `;

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('GET /notifications error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/notifications
// Create a new notification (broadcast, alert, or test notification)
// ─────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { target_role, target_department, target_id, title, message, link } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required.' });
    }

    const [result] = await db.execute(
      `INSERT INTO notifications (target_role, target_department, target_id, title, message, link, is_read)
       VALUES (?, ?, ?, ?, ?, ?, FALSE)`,
      [
        target_role || 'all',
        target_department || null,
        target_id || null,
        title,
        message,
        link || '/dashboard'
      ]
    );

    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error('POST /notifications error:', err);
    res.status(500).json({ error: 'Failed to create notification.' });
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
