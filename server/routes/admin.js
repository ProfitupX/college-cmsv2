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
      'SELECT id, name, short_name, email, password, role, department, is_password_changed FROM staffs ORDER BY name ASC'
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
      'SELECT id, name, short_name, designation, role, email, password, employee_id, department, is_password_changed FROM staffs ORDER BY name ASC'
    );
    // Deduplicate by email so Manage Staffs displays a single unified entry per person
    const seen = new Map();
    rows.forEach(r => {
      const key = (r.email || '').toLowerCase().trim() || r.id;
      if (!seen.has(key)) {
        seen.set(key, r);
      } else {
        const prev = seen.get(key);
        if (r.role === 'hod' && prev.role !== 'hod') {
          seen.set(key, r);
        } else if (r.employee_id && !prev.employee_id) {
          seen.set(key, r);
        }
      }
    });
    res.json(Array.from(seen.values()));
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
      sql += `, password = ?, is_password_changed = 0`;
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
      'UPDATE staffs SET password = ?, is_password_changed = 0 WHERE id = ?',
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

// ─────────────────────────────────────────────────────────────
// GET /api/admin/staff-classes
// Returns all staff members and all classes and subjects they teach / coordinate
// ─────────────────────────────────────────────────────────────
router.get('/staff-classes', async (req, res) => {
  try {
    const [staffs] = await db.query(`
      SELECT id, name, designation, department, email, employee_id, role
      FROM staffs
      ORDER BY name ASC
    `);

    const [subjects] = await db.query(`
      SELECT s.id, s.code, s.name, s.type, s.ltpc, s.total_hours, s.faculty_id,
             c.id AS class_id, c.name AS class_name, c.year_label, c.semester, c.department AS class_department
      FROM subjects s
      JOIN classes c ON c.id = s.class_id
      ORDER BY FIELD(c.year_label, 'IV', 'III', 'II', 'I'), c.name ASC, s.code ASC
    `);

    const [classes] = await db.query(`
      SELECT id, name, year_label, semester, department, class_coordinator, asst_coordinator
      FROM classes
      ORDER BY FIELD(year_label, 'IV', 'III', 'II', 'I'), name ASC
    `);

    // Unified deduplication by email or normalized name
    const unifiedStaffMap = new Map();

    staffs.forEach(st => {
      const emailKey = (st.email || '').toLowerCase().trim();
      const nameKey = (st.name || '').toLowerCase().trim();
      const key = emailKey || nameKey || st.id;

      if (!unifiedStaffMap.has(key)) {
        unifiedStaffMap.set(key, {
          ...st,
          aliasIds: [st.id],
          teachingSubjects: [],
          coordinatedClasses: []
        });
      } else {
        const existing = unifiedStaffMap.get(key);
        existing.aliasIds.push(st.id);
        if (st.designation && !existing.designation) existing.designation = st.designation;
        if (st.role === 'hod' && existing.role !== 'hod') existing.role = st.role;
      }
    });

    const unifiedList = Array.from(unifiedStaffMap.values());

    // Map teaching subjects
    subjects.forEach(sub => {
      const match = unifiedList.find(st => 
        st.aliasIds.includes(sub.faculty_id) || 
        (sub.faculty_id && st.id === sub.faculty_id)
      );
      if (match) {
        match.teachingSubjects.push(sub);
      }
    });

    // Map coordinated classes
    classes.forEach(cls => {
      unifiedList.forEach(st => {
        const isCoord = cls.class_coordinator && cls.class_coordinator.toLowerCase().includes(st.name.toLowerCase());
        const isAsst = cls.asst_coordinator && cls.asst_coordinator.toLowerCase().includes(st.name.toLowerCase());
        if (isCoord || isAsst) {
          st.coordinatedClasses.push({
            id: cls.id,
            name: cls.name,
            year_label: cls.year_label,
            semester: cls.semester,
            department: cls.department,
            roleType: isCoord ? 'Class In-charge' : 'Assistant Coordinator'
          });
        }
      });
    });

    res.json(unifiedList);
  } catch (err) {
    console.error('GET /admin/staff-classes error:', err);
    res.status(500).json({ error: 'Failed to fetch staff classes.' });
  }
});

export default router;
