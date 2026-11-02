import express from 'express';
import db from '../db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

const logDir = path.resolve(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) {
  try { fs.mkdirSync(logDir, { recursive: true }); } catch (_) {}
}
const logFilePath = path.join(logDir, 'exceptions.log');

// POST /api/logs/error — Record application exception
router.post('/error', async (req, res) => {
  try {
    const {
      module_name = 'UnknownModule',
      user_id = null,
      user_role = 'unknown',
      user_name = null,
      error_message = 'No message provided',
      stack_trace = '',
      url = '',
      user_agent = req.headers['user-agent'] || ''
    } = req.body;

    const timestamp = new Date().toISOString();

    // 1. Fail-safe file log (always succeeds even if DB connection is intermittent)
    try {
      const fileEntry = `[${timestamp}] [MODULE: ${module_name}] [ROLE: ${user_role}] [USER: ${user_id || 'anonymous'}]\n` +
                        `Error: ${error_message}\nURL: ${url}\nStack:\n${stack_trace}\n${'='.repeat(70)}\n`;
      fs.appendFileSync(logFilePath, fileEntry, 'utf8');
    } catch (fsErr) {
      console.warn('File log notice:', fsErr.message);
    }

    // 2. MySQL database logging
    const [result] = await db.execute(
      `INSERT INTO system_error_logs 
       (module_name, user_id, user_role, user_name, error_message, stack_trace, url, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(module_name).slice(0, 100),
        user_id ? String(user_id).slice(0, 50) : null,
        user_role ? String(user_role).slice(0, 50) : 'unknown',
        user_name ? String(user_name).slice(0, 100) : null,
        String(error_message),
        String(stack_trace),
        String(url).slice(0, 255),
        String(user_agent).slice(0, 500)
      ]
    );

    res.json({ success: true, logId: result.insertId });
  } catch (err) {
    console.error('Error in /api/logs/error:', err.message);
    res.status(500).json({ error: 'Failed to record error log.' });
  }
});

// GET /api/logs/errors — List recent exceptions (Admin)
router.get('/errors', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 100;
    const [rows] = await db.query(
      `SELECT id, timestamp, module_name, user_id, user_role, user_name, error_message, stack_trace, url 
       FROM system_error_logs 
       ORDER BY timestamp DESC 
       LIMIT ?`,
      [limit]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/logs/errors error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve error logs.' });
  }
});

// DELETE /api/logs/errors — Clear old error logs
router.delete('/errors', async (req, res) => {
  try {
    await db.execute('DELETE FROM system_error_logs WHERE timestamp < DATE_SUB(NOW(), INTERVAL 30 DAY)');
    res.json({ success: true, message: 'Logs older than 30 days cleaned up.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete logs.' });
  }
});

export default router;
