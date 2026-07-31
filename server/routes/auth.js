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

    if (email.trim().toLowerCase() === 'admin@nscet.edu.in' && password === 'admin123') {
      return res.json({
        success: true,
        user: { id: 'ADMIN', name: 'Admin User', shortName: 'Admin', designation: 'System Administrator', role: 'admin', email: 'admin@nscet.edu.in', employeeId: 'ADMIN-001', classRole: null, department: 'College Administration' }
      });
    }

    if (email.trim().toLowerCase() === 'principal@nscet.edu.in' && password === 'admin123') {
      return res.json({
        success: true,
        user: { id: 'PRIN', name: 'Dr. C. Mathalai Sundaram', shortName: 'PRIN', designation: 'Principal, NSCET', role: 'principal', email: 'principal@nscet.edu.in', employeeId: 'PRIN-001', classRole: null, department: 'College Administration' }
      });
    }

    if (email.trim().toLowerCase() === 'vp@nscet.edu.in' && password === 'admin123') {
      return res.json({
        success: true,
        user: { id: 'VP', name: 'Dr. M. Sathya', shortName: 'VP', designation: 'Vice Principal & Academic', role: 'vice_principal', email: 'vp@nscet.edu.in', employeeId: 'VP-001', classRole: null, department: 'College Administration' }
      });
    }

    const [rows] = await db.execute(
      'SELECT id, name, short_name, designation, role, email, employee_id, class_role, department FROM staffs WHERE LOWER(email) = LOWER(?) AND password = ?',
      [email.trim(), password]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password. Please try again.' });
    }

    const staff = rows[0];

    // Fetch assigned subjects for this staff member
    const [assignedSubs] = await db.execute(
      'SELECT id, code, name FROM subjects WHERE faculty_id = ?',
      [staff.id]
    );

    // Fetch classes where staff is class coordinator
    const [coordClasses] = await db.execute(
      'SELECT id, name FROM classes WHERE class_coordinator LIKE ? OR asst_coordinator LIKE ?',
      [`%${staff.name}%`, `%${staff.name}%`]
    );

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
        assignedSubjectIds: assignedSubs.map(s => s.id),
        assignedSubjects:   assignedSubs,
        isClassCoordinator: coordClasses.length > 0 || staff.class_role === 'Class Coordinator',
        coordinatedClasses: coordClasses
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

export default router;
