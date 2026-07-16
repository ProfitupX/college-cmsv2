import express from 'express';
import db from '../db.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// POST /api/marks/submit
// Body: {
//   subjectId, classId, staffId, sessionLabel,
//   components: [{ typeId, label, maxMarks, icon, color, sortOrder }],
//   marks:      [{ studentId, componentIndex, marksObtained }]
// }
// ─────────────────────────────────────────────────────────────
router.post('/submit', async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { subjectId, classId, staffId, sessionLabel, components, marks } = req.body;

    if (!subjectId || !classId || !staffId || !components?.length) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    // 1. Calculate total max and avg score
    const totalMax = components.reduce((s, c) => s + parseFloat(c.maxMarks || 0), 0);

    // avg = (sum of normalized marks) / studentCount
    const studentIds = [...new Set(marks.map((m) => m.studentId))];
    const studentCount = studentIds.length;

    // Group marks by student to compute raw total per student
    const studentTotals = {};
    for (const m of marks) {
      if (!studentTotals[m.studentId]) studentTotals[m.studentId] = 0;
      studentTotals[m.studentId] += parseFloat(m.marksObtained || 0);
    }
    const avgRaw = Object.values(studentTotals).reduce((s, t) => s + t, 0) / (studentCount || 1);
    const avgScore = totalMax > 0 ? parseFloat(((avgRaw / totalMax) * 40).toFixed(2)) : 0;

    // 1.5 Delete any existing session for this subject/class so it acts as an UPDATE
    await conn.execute(
      `DELETE FROM marks_sessions WHERE subject_id = ? AND class_id = ?`,
      [subjectId, classId]
    );

    // 2. Insert marks_session
    const [sessionResult] = await conn.execute(
      `INSERT INTO marks_sessions
         (subject_id, class_id, staff_id, session_label, total_max, status, avg_score, student_count)
       VALUES (?, ?, ?, ?, ?, 'submitted', ?, ?)`,
      [subjectId, classId, staffId, sessionLabel || 'Internal Assessment', totalMax, avgScore, studentCount]
    );
    const sessionId = sessionResult.insertId;

    // 3. Insert assessment_components and collect their DB IDs
    const componentIdMap = {}; // index → DB id
    for (let i = 0; i < components.length; i++) {
      const c = components[i];
      const [compResult] = await conn.execute(
        `INSERT INTO assessment_components
           (session_id, type_id, label, max_marks, icon, color, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [sessionId, c.typeId, c.label, c.maxMarks, c.icon || '', c.color || '', i]
      );
      componentIdMap[i] = compResult.insertId;
    }

    // 4. Insert marks
    for (const m of marks) {
      const compDbId = componentIdMap[m.componentIndex];
      if (compDbId === undefined) continue;
      await conn.execute(
        `INSERT INTO marks (session_id, component_id, student_id, marks_obtained)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE marks_obtained = VALUES(marks_obtained)`,
        [sessionId, compDbId, m.studentId, parseFloat(m.marksObtained || 0)]
      );
    }

    await conn.commit();
    res.json({ success: true, sessionId, avgScore, studentCount });
  } catch (err) {
    await conn.rollback();
    console.error('POST /marks/submit error:', err);
    res.status(500).json({ error: 'Failed to save marks: ' + err.message });
  } finally {
    conn.release();
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/marks/sessions?classId=CL001&staffId=FAC001
// Returns all sessions with subject + staff info
// ─────────────────────────────────────────────────────────────
router.get('/sessions', async (req, res) => {
  try {
    const { classId, staffId, subjectId } = req.query;
    let sql = `
      SELECT ms.id, ms.session_label, ms.total_max, ms.status,
             ms.avg_score, ms.student_count, ms.created_at, ms.subject_id,
             sub.name AS subject, sub.code AS subject_code, sub.acronym,
             cl.name  AS class_name,
             st.name  AS staff_name
      FROM marks_sessions ms
      JOIN subjects sub ON sub.id = ms.subject_id
      JOIN classes  cl  ON cl.id  = ms.class_id
      JOIN staffs   st  ON st.id  = ms.staff_id
    `;
    const params = [];
    const where = [];
    if (classId)   { where.push('ms.class_id = ?');   params.push(classId); }
    if (staffId)   { where.push('ms.staff_id = ?');   params.push(staffId); }
    if (subjectId) { where.push('ms.subject_id = ?'); params.push(subjectId); }
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY ms.created_at DESC';

    const [rows] = await db.execute(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('GET /marks/sessions error:', err);
    res.status(500).json({ error: 'Failed to fetch sessions.' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/marks/sessions/:id
// Returns one session with its components and all student marks
// ─────────────────────────────────────────────────────────────
router.get('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Session info
    const [sessions] = await db.execute(
      `SELECT ms.*, sub.name AS subject, sub.code, cl.name AS class_name
       FROM marks_sessions ms
       JOIN subjects sub ON sub.id = ms.subject_id
       JOIN classes  cl  ON cl.id  = ms.class_id
       WHERE ms.id = ?`, [id]
    );
    if (!sessions.length) return res.status(404).json({ error: 'Session not found.' });

    // Components
    const [components] = await db.execute(
      'SELECT * FROM assessment_components WHERE session_id = ? ORDER BY sort_order', [id]
    );

    // Marks joined with student info
    const [marks] = await db.execute(
      `SELECT m.student_id, m.component_id, m.marks_obtained,
              s.name AS student_name, s.roll_no, s.s_no
       FROM marks m
       JOIN students s ON s.id = m.student_id
       WHERE m.session_id = ?
       ORDER BY s.s_no, m.component_id`, [id]
    );

    res.json({ session: sessions[0], components, marks });
  } catch (err) {
    console.error('GET /marks/sessions/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch session details.' });
  }
});

export default router;
