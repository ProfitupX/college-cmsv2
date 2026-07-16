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
        user: {
          id: 'ADMIN',
          name: 'Admin User',
          shortName: 'Admin',
          designation: 'System Administrator',
          role: 'admin',
          email: 'admin@nscet.edu.in',
          employeeId: 'ADMIN-001',
          classRole: null,
          department: 'Information Technology'
        }
      });
    }

    const [rows] = await db.execute(
      'SELECT id, name, short_name, designation, role, email, employee_id, class_role FROM staffs WHERE LOWER(email) = LOWER(?) AND password = ?',
      [email.trim(), password]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password. Please try again.' });
    }

    const staff = rows[0];
    res.json({
      success: true,
      user: {
        id:          staff.id,
        name:        staff.name,
        shortName:   staff.short_name,
        designation: staff.designation,
        role:        staff.role,
        email:       staff.email,
        employeeId:  staff.employee_id,
        classRole:   staff.class_role,
        department:  'Information Technology',
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

export default router;
