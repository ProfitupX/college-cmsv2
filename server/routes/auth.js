import express from 'express';
import db from '../db.js';

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    if ((cleanEmail === 'admin@nscet.org' || cleanEmail === 'admin@nscet.edu.in') && password === 'admin123') {
      return res.json({
        success: true,
        user: { id: 'ADMIN', name: 'Admin User', shortName: 'Admin', designation: 'System Administrator', role: 'admin', email: 'admin@nscet.org', employeeId: 'ADMIN-001', classRole: null, department: 'College Administration' }
      });
    }

    if ((cleanEmail === 'principal@nscet.org' || cleanEmail === 'principal@nscet.edu.in') && password === 'admin123') {
      return res.json({
        success: true,
        user: { id: 'PRIN', name: 'Dr. C. Mathalai Sundaram', shortName: 'PRIN', designation: 'Principal, NSCET', role: 'principal', email: 'principal@nscet.org', employeeId: 'PRIN-001', classRole: null, department: 'College Administration' }
      });
    }

    if ((cleanEmail === 'vp_academic@nscet.org' || cleanEmail === 'vp@nscet.org' || cleanEmail === 'vp@nscet.edu.in') && password === 'admin123') {
      return res.json({
        success: true,
        user: { id: 'VP', name: 'Dr. M. Sathya', shortName: 'VP', designation: 'Vice Principal & Academic', role: 'vice_principal', email: 'vp_academic@nscet.org', employeeId: 'VP-001', classRole: null, department: 'College Administration' }
      });
    }

    const [rows] = await db.execute(
      'SELECT id, name, short_name, designation, role, email, employee_id, class_role, department, is_password_changed FROM staffs WHERE LOWER(email) = LOWER(?) AND password = ?',
      [email.trim(), password]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password. Please try again.' });
    }

    const staff = rows[0];

    // Fetch detailed assigned subjects for this staff member
    const [assignedSubs] = await db.execute(`
      SELECT s.id, s.code, s.name, s.type, s.class_id, s.ltpc, s.total_hours,
             c.name as class_name, c.department as class_department, c.year_label, c.semester
      FROM subjects s
      LEFT JOIN classes c ON c.id = s.class_id
      WHERE s.faculty_id = ?
      ORDER BY c.year_label, s.code
    `, [staff.id]);

    // Fetch distinct classes taught by this staff member
    const [teachingClasses] = await db.execute(`
      SELECT DISTINCT c.id, c.name, c.department, c.year_label, c.semester, c.batch, c.academic_year
      FROM subjects s
      JOIN classes c ON c.id = s.class_id
      WHERE s.faculty_id = ?
      ORDER BY c.year_label, c.name
    `, [staff.id]);

    // Fetch all classes to perform normalized coordinator matching
    const [allClasses] = await db.execute('SELECT id, name, department, year_label, semester, batch, academic_year, class_coordinator, asst_coordinator FROM classes');

    const normalize = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const sNorm = normalize(staff.name);
    const shortNorm = normalize(staff.short_name);

    const coordClasses = allClasses.filter(c => {
      const cNorm = normalize(c.class_coordinator);
      const aNorm = normalize(c.asst_coordinator);
      return (cNorm && (sNorm.includes(cNorm) || cNorm.includes(sNorm) || (shortNorm && cNorm.includes(shortNorm)))) ||
             (aNorm && (sNorm.includes(aNorm) || aNorm.includes(sNorm) || (shortNorm && aNorm.includes(shortNorm))));
    });

    const isCoord = coordClasses.length > 0 || staff.class_role === 'Class Coordinator';
    const primaryCoordClass = coordClasses.length > 0 ? coordClasses[0] : null;

    res.json({
      success: true,
      user: {
        id:                 staff.id,
        name:               staff.name,
        shortName:          staff.short_name,
        designation:        staff.designation,
        role:               staff.role,
        email:              staff.email,
        employeeId:         staff.employee_id,
        classRole:          staff.class_role,
        department:         staff.department || 'Information Technology',
        isPasswordChanged:  !!staff.is_password_changed,
        assignedSubjectIds: assignedSubs.map(s => s.id),
        assignedSubjects:   assignedSubs,
        isClassCoordinator: isCoord,
        coordinatedClasses: coordClasses.map(c => ({ id: c.id, name: c.name, department: c.department, year_label: c.year_label, semester: c.semester })),
        coordinatedClassId: primaryCoordClass ? primaryCoordClass.id : null,
        teachingClasses:    teachingClasses
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', async (req, res) => {
  try {
    const { userId, oldPassword, newPassword } = req.body;
    if (!userId || !oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    // Verify current password and is_password_changed status
    const [rows] = await db.execute(
      'SELECT id, is_password_changed FROM staffs WHERE id = ? AND password = ?',
      [userId, oldPassword]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid current password.' });
    }

    if (rows[0].is_password_changed) {
      return res.status(403).json({ error: 'Password has already been changed once. Please contact admin to reset it.' });
    }

    // Update password
    await db.execute(
      'UPDATE staffs SET password = ?, is_password_changed = 1 WHERE id = ?',
      [newPassword, userId]
    );

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Server error while changing password.' });
  }
});

export default router;
