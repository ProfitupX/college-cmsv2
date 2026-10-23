import express from 'express';
import db from '../db.js';

const router = express.Router();

// Helper to resolve department name and its aliases
function getDepartmentAliases(dept) {
  if (!dept || typeof dept !== 'string') return [];
  const clean = dept.trim();
  const lower = clean.toLowerCase();

  if (lower.includes('computer') || lower === 'cse') {
    return ['Computer Science and Engineering', 'CSE'];
  }
  if (lower.includes('information') || lower === 'it') {
    return ['Information Technology', 'IT'];
  }
  if (lower.includes('artificial') || lower.includes('data science') || lower === 'aids' || lower === 'ai&ds') {
    return ['Artificial Intelligence and Data Science', 'AIDS', 'AI&DS', 'AI and DS'];
  }
  if (lower.includes('electronics') || lower === 'ece') {
    return ['Electronics and Communication Engineering', 'ECE'];
  }
  if (lower.includes('electrical') || lower === 'eee') {
    return ['Electrical and Electronics Engineering', 'EEE'];
  }
  if (lower.includes('mechanical') || lower === 'mech') {
    return ['Mechanical Engineering', 'MECH'];
  }
  if (lower.includes('civil')) {
    return ['Civil Engineering', 'CIVIL'];
  }
  if (lower.includes('science') || lower.includes('humanities') || lower === 's&h' || lower.includes('first year')) {
    return ['Science and Humanities', 'S&H', 'First Year'];
  }
  return [clean];
}

// Ensure target_department column exists in notifications table
let columnVerified = false;
async function ensureTargetDepartmentColumn() {
  if (columnVerified) return true;
  try {
    const [cols] = await db.query("SHOW COLUMNS FROM notifications LIKE 'target_department'");
    if (cols.length === 0) {
      await db.query(
        "ALTER TABLE notifications ADD COLUMN target_department VARCHAR(150) NULL DEFAULT NULL AFTER target_role"
      );
      console.log('✅ Added missing target_department column to notifications table.');
    }
    columnVerified = true;
    return true;
  } catch (err) {
    console.warn('Notice: notifications schema check:', err.message);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/notifications/:role/:userId
// Fetch strictly filtered notifications for a user based on role & department
// ─────────────────────────────────────────────────────────────
router.get('/:role/:userId', async (req, res) => {
  try {
    const { role, userId } = req.params;
    const { department } = req.query;

    await ensureTargetDepartmentColumn();

    const isLeadership = ['admin', 'principal', 'vice_principal'].includes(role);
    const aliases = getDepartmentAliases(department);

    if (isLeadership) {
      // Leadership sees personal notifications, leadership alerts, and college-wide broadcasts
      const [rows] = await db.query(
        `SELECT * FROM notifications 
         WHERE target_id = ? 
            OR target_role IN ('admin', 'principal', 'vice_principal', 'all', 'all_staff')
         ORDER BY created_at DESC 
         LIMIT 50`,
        [userId]
      );
      return res.json(rows);
    }

    // Build department matching condition
    let deptClause = '';
    const deptParams = [];
    if (aliases.length > 0) {
      const aliasPlaceholders = aliases.map(() => '?').join(', ');
      deptClause = `(target_department IS NULL OR target_department = '' OR target_department = 'all' OR target_department IN (${aliasPlaceholders}))`;
      deptParams.push(...aliases);
    } else {
      deptClause = `(target_department IS NULL OR target_department = '' OR target_department = 'all')`;
    }

    if (role === 'hod') {
      // HOD: ONLY receives personal notifications, HOD notifications for THEIR department, and college-wide announcements
      const [rows] = await db.query(
        `SELECT * FROM notifications 
         WHERE (target_id = ?) 
            OR (target_role = 'hod' AND (${deptClause}))
            OR (target_role IN ('all', 'all_staff') AND (${deptClause}))
         ORDER BY created_at DESC 
         LIMIT 50`,
        [userId, ...deptParams, ...deptParams]
      );
      return res.json(rows);
    }

    if (role === 'class_coordinator') {
      // Class Coordinator: Receives personal, coordinator notices for their department, staff notices, and college-wide
      // NEVER receives HOD notices
      const [rows] = await db.query(
        `SELECT * FROM notifications 
         WHERE (target_id = ?) 
            OR (target_role IN ('class_coordinator', 'faculty', 'staff') AND (${deptClause}))
            OR (target_role IN ('all', 'all_staff') AND (${deptClause}))
         ORDER BY created_at DESC 
         LIMIT 50`,
        [userId, ...deptParams, ...deptParams]
      );
      return res.json(rows);
    }

    // Regular Faculty: ONLY receives personal, faculty/staff notices for their department, and college-wide
    // NEVER receives HOD or Class Coordinator notifications
    const [rows] = await db.query(
      `SELECT * FROM notifications 
       WHERE (target_id = ?) 
          OR (target_role IN ('faculty', 'staff') AND (${deptClause}))
          OR (target_role IN ('all', 'all_staff') AND (${deptClause}))
       ORDER BY created_at DESC 
       LIMIT 50`,
      [userId, ...deptParams, ...deptParams]
    );
    return res.json(rows);
  } catch (err) {
    console.error('GET /notifications error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/notifications
// Create a new notification targeted by role, department, or user ID
// ─────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { target_role, target_department, target_id, title, message, link } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required.' });
    }

    await ensureTargetDepartmentColumn();

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
    const notifId = parseInt(id) || id;
    await db.query(
      'DELETE FROM notifications WHERE id = ?',
      [notifId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /notifications/:id error:', err);
    res.status(500).json({ error: 'Failed to delete notification: ' + err.message });
  }
});

export default router;
