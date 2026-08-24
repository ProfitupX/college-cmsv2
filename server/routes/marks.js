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

    const { subjectId, classId, staffId, sessionLabel, components, marks, totalHours, internal2TotalHours, attendance, actionType, remedialAction } = req.body;

    if (!subjectId || !classId || !staffId || !components) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    // 1.5 Delete any existing session for this subject/class/label so it acts as an UPDATE or CLEAR
    await conn.execute(
      `DELETE FROM marks_sessions WHERE subject_id = ? AND class_id = ? AND session_label = ?`,
      [subjectId, classId, sessionLabel]
    );

    // If no components, it means the user deleted all components and wants to clear the marksheet
    if (components.length === 0) {
      await conn.commit();
      return res.json({ success: true, message: 'Marks sheet cleared successfully.' });
    }

    // 1. Calculate total max and avg score
    const totalMax = components.reduce((s, c) => s + parseFloat(c.maxMarks || 0), 0);

    // avg = (sum of converted marks) / studentCount
    const studentIds = [...new Set(marks.map((m) => m.studentId))];
    const studentCount = studentIds.length;

    const getAttendanceMark = (attended, maxHours) => {
      if (!maxHours || maxHours <= 0) return 0;
      const pct = (attended / maxHours) * 100;
      if (pct >= 80 && pct <= 85) return 1;
      if (pct > 85 && pct <= 90) return 2;
      if (pct > 90 && pct <= 95) return 3;
      if (pct > 95) return 5;
      return 0; // Below 80% is 0 mark
    };

    // Group marks by student to compute converted total per student
    const studentTotals = {};
    for (const m of marks) {
      if (!studentTotals[m.studentId]) studentTotals[m.studentId] = 0;
      
      const comp = components[m.componentIndex];
      if (comp) {
        const conductedMax = parseFloat(comp.conductedMax || 100);
        const weight = parseFloat(comp.maxMarks || 0);
        const val = parseFloat(m.marksObtained || 0);
        const converted = (Math.min(val, conductedMax) / conductedMax) * weight;
        studentTotals[m.studentId] += converted;
      }
    }

    if (attendance && Array.isArray(attendance)) {
      const tHours = parseInt(totalHours || 0);
      for (const a of attendance) {
        if (!studentTotals[a.studentId]) studentTotals[a.studentId] = 0;
        const hrs = parseInt(a.hoursAttended || 0);
        const labHrs = parseInt(a.labAttendance || 0);
        const totalAttd = hrs + labHrs;
        if (tHours > 0) {
          studentTotals[a.studentId] += getAttendanceMark(totalAttd, tHours);
        }
      }
    }

    const avgScore = Object.values(studentTotals).reduce((s, t) => s + t, 0) / (studentCount || 1);

    // 2. Insert marks_session
    const statusVal = actionType === 'frozen' ? 'locked' : 'draft';
    const [sessionResult] = await conn.execute(
      `INSERT INTO marks_sessions
         (subject_id, class_id, staff_id, session_label, total_max, total_hours, internal2_total_hours, status, avg_score, student_count, remedial_action)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [subjectId, classId, staffId, sessionLabel || 'Internal Assessment', totalMax, parseInt(totalHours || 0), parseInt(internal2TotalHours || 0), statusVal, avgScore, studentCount, remedialAction || '']
    );
    const sessionId = sessionResult.insertId;

    // 3. Insert assessment_components and collect their DB IDs
    const componentIdMap = {}; // index → DB id
    for (let i = 0; i < components.length; i++) {
      const c = components[i];
      const [compResult] = await conn.execute(
        `INSERT INTO assessment_components
           (session_id, type_id, label, conducted_max, max_marks, icon, color, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [sessionId, c.typeId, c.label, c.conductedMax || 100, c.maxMarks, c.icon || '', c.color || '', i]
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

    // 5. Insert Attendance & Internal Exam
    if (attendance && Array.isArray(attendance)) {
      for (const a of attendance) {
        await conn.execute(
          `INSERT INTO session_attendance (session_id, student_id, hours_attended, internal_exam_mark, lab_attendance, lab_mark)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE hours_attended = VALUES(hours_attended), internal_exam_mark = VALUES(internal_exam_mark), lab_attendance = VALUES(lab_attendance), lab_mark = VALUES(lab_mark)`,
          [
            sessionId, 
            a.studentId, 
            parseInt(a.hoursAttended || 0), 
            a.internalExamMark !== undefined && a.internalExamMark !== null && a.internalExamMark !== '' 
              ? parseFloat(a.internalExamMark) 
              : null,
            parseInt(a.labAttendance || 0),
            a.labMark !== undefined && a.labMark !== null && a.labMark !== ''
              ? parseFloat(a.labMark)
              : null
          ]
        );
      }
    }

    await conn.commit();

    // 6. Notifications for Freeze action
    if (actionType === 'frozen') {
      try {
        const [subRows] = await db.execute('SELECT code, name FROM subjects WHERE id = ?', [subjectId]);
        const subName = subRows.length > 0 ? `${subRows[0].code} ${subRows[0].name}` : 'A Subject';
        
        // Notify HOD
        await db.execute(
          `INSERT INTO notifications (target_role, title, message, link) VALUES ('hod', 'Marks Frozen', ?, '/dashboard')`,
          [`Marks for ${subName} (${sessionLabel}) have been frozen by the subject staff.`]
        );
        
        // Notify Class In-charge
        await db.execute(
          `INSERT INTO notifications (target_role, title, message, link) VALUES ('class_coordinator', 'Class Subject Marks Frozen', ?, '/reports')`,
          [`Marks for ${subName} have been frozen. You can now view the updated class performance.`]
        );
      } catch (notifErr) {
        console.error('Failed to send freeze notifications:', notifErr);
      }
    }

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
    const { classId, staffId, subjectId, sessionLabel, department } = req.query;
    let sql = `
      SELECT ms.id, ms.session_label, ms.total_max, ms.status,
             ms.avg_score, ms.student_count, ms.created_at, ms.subject_id,
             sub.name AS subject, sub.code AS subject_code, sub.acronym, sub.department AS subject_department,
             cl.name  AS class_name, cl.department AS class_department,
             st.name  AS staff_name
      FROM marks_sessions ms
      JOIN subjects sub ON sub.id = ms.subject_id
      JOIN classes  cl  ON cl.id  = ms.class_id
      JOIN staffs   st  ON st.id  = ms.staff_id
    `;
    const params = [];
    const where = [];
    if (classId)      { where.push('ms.class_id = ?');   params.push(classId); }
    if (staffId)      { where.push('ms.staff_id = ?');   params.push(staffId); }
    if (subjectId)    { where.push('ms.subject_id = ?'); params.push(subjectId); }
    if (sessionLabel) { where.push('ms.session_label = ?'); params.push(sessionLabel); }
    if (department)   { 
      where.push('(cl.department = ? OR sub.department = ?)'); 
      params.push(department, department);
    }
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

    // Attendance & Internal Exam
    const [attendanceRows] = await db.execute(
      'SELECT student_id, hours_attended, internal_exam_mark, lab_attendance, lab_mark FROM session_attendance WHERE session_id = ?', [id]
    );
    const attendance = {};
    const internalExam = {};
    const labData = {};
    attendanceRows.forEach(r => {
      attendance[r.student_id] = r.hours_attended;
      internalExam[r.student_id] = r.internal_exam_mark;
      labData[r.student_id] = {
        labAttendance: r.lab_attendance,
        labMark: r.lab_mark
      };
    });

    res.json({ session: sessions[0], components, marks, attendance, internalExam, labData });
  } catch (err) {
    console.error('GET /marks/sessions/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch session details.' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/marks/unlock-session
// Instant unlock for HOD/Admin (bypasses request queue)
// ─────────────────────────────────────────────────────────────
router.post('/unlock-session', async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'Missing sessionId.' });
    await db.execute(`UPDATE marks_sessions SET status = 'draft' WHERE id = ?`, [sessionId]);
    res.json({ success: true, message: 'Sheet unlocked successfully.' });
  } catch (err) {
    console.error('POST /marks/unlock-session error:', err);
    res.status(500).json({ error: 'Failed to unlock sheet: ' + err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/marks/request-unlock
// Staff requests permission from HOD to edit a locked sheet
// ─────────────────────────────────────────────────────────────
router.post('/request-unlock', async (req, res) => {
  try {
    const { sessionId, subjectId, classId, staffId, reason } = req.body;
    if (!sessionId || !staffId) {
      return res.status(400).json({ error: 'Missing sessionId or staffId.' });
    }

    // Update marks_sessions status to unlock_requested
    await db.execute(
      `UPDATE marks_sessions SET status = 'unlock_requested' WHERE id = ?`,
      [sessionId]
    );

    // Insert into mark_unlock_requests
    await db.execute(
      `INSERT INTO mark_unlock_requests (session_id, subject_id, class_id, staff_id, reason, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [sessionId, subjectId || '', classId || '', staffId, reason || 'Requesting edit permission for marks sheet']
    );

    res.json({ success: true, message: 'Unlock request submitted to HOD successfully.' });
  } catch (err) {
    console.error('POST /marks/request-unlock error:', err);
    res.status(500).json({ error: 'Failed to submit unlock request: ' + err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/marks/unlock-requests
// Returns all pending unlock requests for HOD
// ─────────────────────────────────────────────────────────────
router.get('/unlock-requests', async (req, res) => {
  try {
    const { department } = req.query;
    let sql = `
      SELECT ur.id, ur.session_id, ur.subject_id, ur.class_id, ur.staff_id,
             ur.reason, ur.status, ur.requested_at,
             st.name AS staff_name,
             sub.name AS subject_name, sub.code AS subject_code,
             cl.name AS class_name
      FROM mark_unlock_requests ur
      JOIN staffs st ON st.id = ur.staff_id
      LEFT JOIN subjects sub ON sub.id = ur.subject_id
      LEFT JOIN classes cl ON cl.id = ur.class_id
    `;
    const params = [];
    if (department) {
      sql += ` WHERE st.department = ?`;
      params.push(department);
    }
    sql += ` ORDER BY ur.requested_at DESC`;

    const [rows] = await db.execute(sql, params);
    res.json(rows);
  } catch (err) {
    console.warn('GET /marks/unlock-requests table notice:', err.message);
    res.json([]); // Return empty list safely if table not created yet
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/marks/approve-unlock
// HOD approves or rejects unlock request
// ─────────────────────────────────────────────────────────────
router.post('/approve-unlock', async (req, res) => {
  try {
    const { requestId, sessionId, hodId, action } = req.body; // action = 'approve' | 'reject'
    if (!requestId || !sessionId || !action) {
      return res.status(400).json({ error: 'Missing required parameters.' });
    }

    const newSessionStatus = action === 'approve' ? 'unlocked' : 'locked';
    const newRequestStatus = action === 'approve' ? 'approved' : 'rejected';

    await db.execute(
      `UPDATE marks_sessions SET status = ? WHERE id = ?`,
      [newSessionStatus, sessionId]
    );

    await db.execute(
      `UPDATE mark_unlock_requests 
       SET status = ?, actioned_at = CURRENT_TIMESTAMP, actioned_by = ? 
       WHERE id = ?`,
      [newRequestStatus, hodId || 'HOD', requestId]
    );

    res.json({ success: true, message: `Request ${action}d successfully.` });
  } catch (err) {
    console.error('POST /marks/approve-unlock error:', err);
    res.status(500).json({ error: 'Failed to process unlock action.' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/marks/class-summary?classId=CL001&sessionLabel=internal1
// Consolidated class data for Class Coordinator & Reports
// ─────────────────────────────────────────────────────────────
router.get('/class-summary', async (req, res) => {
  try {
    const { classId, sessionLabel = 'internal1' } = req.query;
    if (!classId) return res.status(400).json({ error: 'Missing classId' });

    // Class info
    const [clsRows] = await db.execute('SELECT * FROM classes WHERE id = ?', [classId]);
    if (!clsRows.length) return res.status(404).json({ error: 'Class not found' });
    const classObj = clsRows[0];

    // Subjects in class
    const [subjects] = await db.execute(
      `SELECT s.*, st.name AS staff_name 
       FROM subjects s 
       LEFT JOIN staffs st ON st.id = s.faculty_id 
       WHERE s.class_id = ? 
       ORDER BY s.code`,
      [classId]
    );

    // Students in class
    const [students] = await db.execute(
      'SELECT id, s_no, roll_no, name FROM students WHERE class_id = ? ORDER BY s_no',
      [classId]
    );

    // Sessions for this class and sessionLabel
    const [sessions] = await db.execute(
      'SELECT * FROM marks_sessions WHERE class_id = ? AND session_label = ?',
      [classId, sessionLabel]
    );

    const sessionIds = sessions.map(s => s.id);
    let allAttendance = [];
    let allComponents = [];
    let allMarks = [];

    if (sessionIds.length > 0) {
      const placeholders = sessionIds.map(() => '?').join(',');
      const [att] = await db.execute(
        `SELECT * FROM session_attendance WHERE session_id IN (${placeholders})`,
        sessionIds
      );
      allAttendance = att;

      const [comps] = await db.execute(
        `SELECT * FROM assessment_components WHERE session_id IN (${placeholders})`,
        sessionIds
      );
      allComponents = comps;

      const [mks] = await db.execute(
        `SELECT * FROM marks WHERE session_id IN (${placeholders})`,
        sessionIds
      );
      allMarks = mks;
    }

    res.json({
      classObj,
      subjects,
      students,
      sessions,
      allAttendance,
      allComponents,
      allMarks
    });
  } catch (err) {
    console.error('GET /marks/class-summary error:', err);
    res.status(500).json({ error: 'Failed to fetch class summary.' });
  }
});

export default router;
