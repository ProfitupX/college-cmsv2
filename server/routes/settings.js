import express from 'express';
import db from '../db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// GET /api/settings/:key
// Get a specific setting (like marks_entry_deadline)
// ─────────────────────────────────────────────────────────────
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    
    // Special case for .env file editor
    if (key === 'env') {
      const envPath = path.join(__dirname, '..', '.env');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        return res.json({ value: envContent });
      } else {
        return res.json({ value: '' });
      }
    }

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
    const { value, adminPassword } = req.body;
    
    if (value === undefined) return res.status(400).json({ error: 'Value is required' });

    // Special case for .env file editor
    if (key === 'env') {

      const envPath = path.join(__dirname, '..', '.env');
      fs.writeFileSync(envPath, value, 'utf8');
      
      // Dynamically reload connection pool with new credentials
      db.reconnect();
      
      return res.json({ success: true, message: 'Environment settings updated and applied instantly! The database connection has been reloaded.' });
    }

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
