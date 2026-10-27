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

    if (role === 'hod') {
      // HODs also teach, so they receive general staff and faculty notices
      matchingRoles.add('staff');
      matchingRoles.add('faculty');
    } else if (role === 'class_coordinator') {
      // Class coordinators also teach, so they receive faculty and staff notices
      matchingRoles.add('staff');
      matchingRoles.add('faculty');
    } else if (role === 'faculty') {
      // Regular faculty receive faculty and staff notices only (never HOD or coordinator notices)
      matchingRoles.add('staff');
    }

    if (isLeadership) {
      matchingRoles.add('admin');
      matchingRoles.add('staff');
      matchingRoles.add('faculty');
      matchingRoles.add('hod');
      matchingRoles.add('class_coordinator');
    }

    const rolesArray = Array.from(matchingRoles);
    const rolePlaceholders = rolesArray.map(() => '?').join(', ');

    if (isLeadership) {
      // Leadership (admin, principal, vice_principal) has institution-wide visibility across all departments
      const query = `
        SELECT * FROM notifications 
        WHERE (target_id = ?) 
           OR (target_role IN (${rolePlaceholders}, 'all', 'all_staff'))
        ORDER BY created_at DESC 
        LIMIT 50
      `;
      const [rows] = await db.query(query, [userId, ...rolesArray]);
      return res.json(rows);
    }

    // For Academic Staff (HOD, Class Coordinator, Faculty):
    if (department && department.trim() !== '') {
      // Map department aliases so staff only receive notices for their related department
      const deptAliases = [department.trim()];
      const depLower = department.trim().toLowerCase();

      if (depLower.includes('computer') || depLower === 'cse') {
        deptAliases.push('Computer Science and Engineering', 'CSE', 'Computer Science & Engineering');
      } else if (depLower.includes('information') || depLower === 'it') {
        deptAliases.push('Information Technology', 'IT');
      } else if (depLower.includes('electronic') || depLower === 'ece') {
        deptAliases.push('Electronics and Communication Engineering', 'ECE', 'Electronics & Communication Engineering');
      } else if (depLower.includes('electrical') || depLower === 'eee') {
        deptAliases.push('Electrical and Electronics Engineering', 'EEE', 'Electrical & Electronics Engineering');
      } else if (depLower.includes('mechanical') || depLower === 'mech') {
        deptAliases.push('Mechanical Engineering', 'MECH', 'Mech');
      } else if (depLower.includes('civil')) {
        deptAliases.push('Civil Engineering', 'CIVIL', 'Civil');
      } else if (depLower.includes('intelligence') || depLower.includes('ai') || depLower.includes('data')) {
        deptAliases.push('Artificial Intelligence and Data Science', 'AI&DS', 'AIDS', 'AI & DS', 'AD');
      } else if (depLower.includes('science') || depLower.includes('humanities') || depLower.includes('first year') || depLower === 's&h') {
        deptAliases.push('Science and Humanities', 'S&H', 'First Year', 'Science & Humanities');
      }

      const uniqueAliases = Array.from(new Set(deptAliases));
      const aliasPlaceholders = uniqueAliases.map(() => '?').join(', ');

      // STRICT DEPARTMENT ISOLATION:
      // 1. Direct messages to this user (target_id = userId)
      // 2. Global college-wide broadcasts with NO department restriction (target_role IN ('all', 'all_staff') AND (target_department IS NULL OR target_department = ''))
      // 3. Notices specifically matching this user's department (target_department IN (...))
      // Role notices for 'hod' or 'class_coordinator' MUST match the department; they never leak across departments!
      const query = `
        SELECT * FROM notifications 
        WHERE (target_id = ?) 
           OR (target_role IN ('all', 'all_staff') AND (target_department IS NULL OR target_department = ''))
           OR (target_role IN (${rolePlaceholders}, 'all', 'all_staff') AND target_department IN (${aliasPlaceholders}))
        ORDER BY created_at DESC 
        LIMIT 50
      `;

      const params = [userId, ...rolesArray, ...uniqueAliases];
      const [rows] = await db.query(query, params);
      return res.json(rows);
    } else {
      // If no department specified, only personal messages and global broadcasts
      const query = `
        SELECT * FROM notifications 
        WHERE (target_id = ?) 
           OR (target_role IN ('all', 'all_staff') AND (target_department IS NULL OR target_department = ''))
        ORDER BY created_at DESC 
        LIMIT 50
      `;
      const [rows] = await db.query(query, [userId]);
      return res.json(rows);
    }
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
