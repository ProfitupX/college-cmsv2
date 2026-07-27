import express from 'express';
import db from '../db.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// GET /api/remarks/:classId/:sessionLabel
// Get class analysis remarks for a specific class and session
// ─────────────────────────────────────────────────────────────
router.get('/:classId/:sessionLabel', async (req, res) => {
  try {
    const { classId, sessionLabel } = req.params;
    const [rows] = await db.execute(
      'SELECT remarks, improvement_plan FROM class_analysis_remarks WHERE class_id = ? AND session_label = ?',
      [classId, sessionLabel]
    );
    
    if (rows.length === 0) {
      return res.json({ remarks: '', improvement_plan: '' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('GET /remarks error:', err);
    res.status(500).json({ error: 'Failed to fetch remarks.' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/remarks/:classId/:sessionLabel
// Save class analysis remarks
// ─────────────────────────────────────────────────────────────
router.post('/:classId/:sessionLabel', async (req, res) => {
  try {
    const { classId, sessionLabel } = req.params;
    const { remarks, improvement_plan } = req.body;
    
    await db.execute(
      `INSERT INTO class_analysis_remarks (class_id, session_label, remarks, improvement_plan) 
       VALUES (?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE remarks = ?, improvement_plan = ?`,
      [classId, sessionLabel, remarks || '', improvement_plan || '', remarks || '', improvement_plan || '']
    );

    res.json({ success: true, message: 'Remarks saved successfully.' });
  } catch (err) {
    console.error('POST /remarks error:', err);
    res.status(500).json({ error: 'Failed to save remarks.' });
  }
});

export default router;
