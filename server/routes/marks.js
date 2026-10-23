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
      [String(subjectId), String(classId), String(sessionLabel)]
    );

    // If no components, it means the user deleted all components and wants to clear the marksheet
    if (components.length === 0) {
      await conn.commit();
      return res.json({ success: true, message: 'Marks sheet cleared successfully.' });
    }

    // 1. Calculate total max and avg score
    const totalMax = components.reduce((s, c) => s + (parseFloat(c.maxMarks) || 0), 0);

    // avg = (sum of converted marks) / studentCount
    const studentIds = [...new Set(marks.map((m) => m.studentId))];
    const studentCount = studentIds.length;

    // Anna Univ 25th Regulation attendance rule:
    // 95–100% → 5 marks, 90–95% → 3 marks, 85–90% → 2 marks, 80–85% → 1 mark, <80% → 0 marks
    const getAttendanceMark = (pct) => {
      if (pct >= 95) return 5;
      if (pct >= 90) return 3;
      if (pct >= 85) return 2;
      if (pct >= 80) return 1;
      return 0; // Below 80% is 0 mark
    };

    // Group marks by student to compute converted total per student
    const studentTotals = {};
    for (const m of marks) {
      if (!studentTotals[m.studentId]) studentTotals[m.studentId] = 0;
      
      const comp = components[m.componentIndex];
      if (comp) {
        const conductedMax = parseFloat(comp.conductedMax) || 100;
        const weight = parseFloat(comp.maxMarks) || 0;
        const val = parseFloat(m.marksObtained) || 0;
        const converted = conductedMax > 0 ? (Math.min(val, conductedMax) / conductedMax) * weight : 0;
        studentTotals[m.studentId] += converted;
      }
    }

    if (attendance && Array.isArray(attendance)) {
      const tHours = parseInt(totalHours, 10) || 0;

      // Find max actual hours entered across the class
      let maxActualHours = 0;
      for (const a of attendance) {
        const raw = parseInt(a.actualTakenHours !== undefined && a.actualTakenHours !== '' ? a.actualTakenHours : (a.hoursAttended || 0), 10) || 0;
        if (raw > maxActualHours) maxActualHours = raw;
      }

      for (const a of attendance) {
        if (!studentTotals[a.studentId]) studentTotals[a.studentId] = 0;
        const rawHours = parseInt(a.actualTakenHours !== undefined && a.actualTakenHours !== '' ? a.actualTakenHours : (a.hoursAttended || 0), 10) || 0;
        const labHrs = parseInt(a.labAttendance, 10) || 0;
        let attMark = 0;

        if (sessionLabel === 'internal2') {
          const i1Attd = parseInt(a.int1AttendanceHours, 10) || 0;
          const cumAttd = i1Attd + rawHours + labHrs;
          const i1Max = parseInt(req.body.int1Hours, 10) || Math.ceil(tHours / 2) || 0;
          const i2Max = parseInt(req.body.int2Hours, 10) || Math.floor(tHours / 2) || 0;
          const lMax = parseInt(req.body.labHours, 10) || 0;
          const cumPrescribedMax = (i1Max + i2Max + lMax) || tHours || 0;
          const cumConductedBase = Math.max(cumPrescribedMax, maxActualHours > 0 ? maxActualHours + i1Max + lMax : cumPrescribedMax);

          const pct = cumConductedBase > 0 ? (cumAttd / cumConductedBase) * 100 : 0;
          attMark = getAttendanceMark(pct);
        } else {
          // If actual attended hours (e.g. 45) exceeds total prescribed hours (e.g. 30),
          // convert proportionally based on the conducted hours
          const conductedBase = Math.max(tHours, maxActualHours);
          const pct = conductedBase > 0 ? (rawHours / conductedBase) * 100 : 0;
          attMark = getAttendanceMark(pct);
        }
        studentTotals[a.studentId] += attMark;
      }
    }

    const avgScore = (Object.values(studentTotals).reduce((s, t) => s + t, 0) / (studentCount || 1)) || 0;

    // 2. Insert marks_session
    const statusVal = actionType === 'frozen' ? 'locked' : 'draft';
    const [sessionResult] = await conn.execute(
      `INSERT INTO marks_sessions
         (subject_id, class_id, staff_id, session_label, total_max, total_hours, internal2_total_hours, status, avg_score, student_count, remedial_action)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(subjectId), 
        String(classId), 
        String(staffId), 
        sessionLabel || 'Internal Assessment', 
        totalMax, 
        parseInt(totalHours, 10) || 0, 
        parseInt(internal2TotalHours, 10) || 0, 
        statusVal, 
        avgScore, 
        studentCount, 
        remedialAction || ''
      ]
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
        [sessionId, c.typeId, c.label, parseFloat(c.conductedMax) || 100, parseFloat(c.maxMarks) || 0, c.icon || '', c.color || '', i]
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
        [sessionId, compDbId, String(m.studentId), parseFloat(m.marksObtained) || 0]
      );
    }

    // 5. Insert Attendance & Internal Exam
    if (attendance && Array.isArray(attendance)) {
      const tHours = parseInt(totalHours, 10) || 0;

      let maxActualHours = 0;
      let maxCumActual = 0;
      for (const a of attendance) {
        const raw = parseInt(a.actualTakenHours !== undefined && a.actualTakenHours !== '' ? a.actualTakenHours : (a.hoursAttended || 0), 10) || 0;
        if (raw > maxActualHours) maxActualHours = raw;

        const i1 = parseInt(a.int1AttendanceHours, 10) || 0;
        const lab = parseInt(a.labAttendance, 10) || 0;
        const cum = i1 + raw + lab;
        if (cum > maxCumActual) maxCumActual = cum;
      }

      for (const a of attendance) {
        const rawHours = parseInt(a.actualTakenHours !== undefined && a.actualTakenHours !== '' ? a.actualTakenHours : (a.hoursAttended || 0), 10) || 0;
        const labHrs = parseInt(a.labAttendance, 10) || 0;
        let attMark = 0;
        let convertedHours = rawHours;
        
        if (sessionLabel === 'internal2') {
          const i1Attd = parseInt(a.int1AttendanceHours, 10) || 0;
          const cumAttd = i1Attd + rawHours + labHrs;
          const i1Max = parseInt(req.body.int1Hours, 10) || Math.ceil(tHours / 2) || 0;
          const i2Max = parseInt(req.body.int2Hours, 10) || Math.floor(tHours / 2) || 0;
          const lMax = parseInt(req.body.labHours, 10) || 0;
          const cumPrescribedMax = (i1Max + i2Max + lMax) || tHours || 0;

          // Benchmark against actual conducted cumulative classes (or LTPC prescribed if max is 0)
          const conductedCum = maxCumActual > 0 ? maxCumActual : cumPrescribedMax;
          const pct = conductedCum > 0 ? Math.min(100, Math.round((cumAttd / conductedCum) * 100)) : 0;
          attMark = getAttendanceMark(pct);
          convertedHours = cumPrescribedMax > 0 ? Math.min(cumPrescribedMax, Math.round((cumAttd / conductedCum) * cumPrescribedMax)) : cumAttd;
        } else {
          // Internal 1:
          // Benchmark against actual conducted classes by staff (maxActualHours) so students are never
          // penalized if staff took fewer classes than LTPC total, and extra classes scale proportionally
          const conductedHours = maxActualHours > 0 ? maxActualHours : tHours;
          const pct = conductedHours > 0 ? Math.min(100, Math.round((rawHours / conductedHours) * 100)) : 0;
          attMark = getAttendanceMark(pct);
          convertedHours = tHours > 0 ? Math.min(tHours, Math.round((rawHours / conductedHours) * tHours)) : rawHours;
        }

        await conn.execute(
          `INSERT INTO session_attendance (session_id, student_id, hours_attended, actual_taken_hours, attendance_mark, internal_exam_mark, lab_attendance, lab_mark)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE 
             hours_attended = VALUES(hours_attended), 
             actual_taken_hours = VALUES(actual_taken_hours),
             attendance_mark = VALUES(attendance_mark),
             internal_exam_mark = VALUES(internal_exam_mark), 
             lab_attendance = VALUES(lab_attendance), 
             lab_mark = VALUES(lab_mark)`,
          [
            sessionId, 
            String(a.studentId), 
            convertedHours,
            rawHours,
            attMark,
            a.internalExamMark !== undefined && a.internalExamMark !== null && a.internalExamMark !== '' && !isNaN(parseFloat(a.internalExamMark))
              ? parseFloat(a.internalExamMark) 
              : null,
            labHrs,
            a.labMark !== undefined && a.labMark !== null && a.labMark !== '' && !isNaN(parseFloat(a.labMark))
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
        const [subRows] = await db.execute(`
          SELECT s.code, s.name, s.department AS sub_dept, s.class_id,
                 c.department AS class_dept, c.year_label, c.name AS class_name, c.class_coordinator
          FROM subjects s 
          LEFT JOIN classes c ON c.id = s.class_id 
          WHERE s.id = ?
        `, [subjectId]);
        const sub = subRows.length > 0 ? subRows[0] : null;
        const subName = sub ? `${sub.code} ${sub.name}` : 'A Subject';
        let coordNotified = false;
        
        // Resolve true department: prioritize subject department, fallback to class department / S&H
        let dept = sub?.sub_dept;
        if (!dept && sub) {
          if (sub.year_label === 'I' || sub.class_dept === 'Science and Humanities' || sub.class_dept === 'First Year') {
            dept = 'Science and Humanities';
          } else {
            dept = sub.class_dept;
          }
        }

        // Notify HOD of the subject's related department ONLY
        await db.execute(
          `INSERT INTO notifications (target_role, target_department, title, message, link) VALUES ('hod', ?, 'Marks Frozen', ?, '/dashboard')`,
          [dept, `Marks for ${subName} (${sessionLabel}) have been frozen by the subject staff.`]
        );

        // Notify College Administration / Leadership
        await db.execute(
          `INSERT INTO notifications (target_role, title, message, link) VALUES ('admin', 'Subject Marks Finalized', ?, '/dashboard')`,
          [`Marks for ${subName} (${sessionLabel}) have been frozen and finalized.`]
        );
        
        // Notify Specific Class Coordinator
        if (sub && sub.class_id) {
          const [classRows] = await db.execute('SELECT name, department, class_coordinator FROM classes WHERE id = ?', [sub.class_id]);
          if (classRows.length > 0 && classRows[0].class_coordinator) {
            const coordStr = classRows[0].class_coordinator.trim();
            const cleanName = coordStr.split(/,|\s+(?:TF|AP|Prof|Dr|HoD)\//)[0].trim();
            const [coordStaffs] = await db.query(
              'SELECT id FROM staffs WHERE INSTR(?, name) > 0 OR INSTR(name, ?) > 0 LIMIT 1',
              [coordStr, cleanName]
            );
            if (coordStaffs.length > 0) {
              await db.execute(
                `INSERT INTO notifications (target_id, title, message, link) VALUES (?, 'Class Subject Marks Frozen', ?, '/reports')`,
                [coordStaffs[0].id, `Marks for ${subName} (${classRows[0].name}) have been frozen. You can now view the updated class performance.`]
              );
              coordNotified = true;
            }
          }
        }
        if (!coordNotified) {
          await db.execute(
            `INSERT INTO notifications (target_role, target_department, title, message, link) VALUES ('class_coordinator', ?, 'Class Subject Marks Frozen', ?, '/reports')`,
            [dept, `Marks for ${subName} have been frozen. You can now view the updated class performance.`]
          );
        }
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
             ms.avg_score, ms.student_count, ms.created_at, ms.subject_id, ms.class_id,
             sub.name AS subject, sub.code AS subject_code, sub.acronym, sub.department AS subject_department,
             cl.name  AS class_name, cl.department AS class_department, cl.year_label, cl.semester,
             st.name  AS staff_name, st.designation AS staff_designation
      FROM marks_sessions ms
      JOIN subjects sub ON sub.id = ms.subject_id
      JOIN classes  cl  ON cl.id  = ms.class_id
      LEFT JOIN staffs st ON st.id = ms.staff_id
    `;
    const params = [];
    const where = [];
    if (classId)      { where.push('ms.class_id = ?');   params.push(classId); }
    if (staffId) {
      const [aliasRows] = await db.query(
        `SELECT id FROM staffs WHERE id = ? OR email = (SELECT email FROM staffs WHERE id = ? LIMIT 1)`,
        [staffId, staffId]
      );
      const fStaffIds = Array.from(new Set([staffId, ...aliasRows.map(r => r.id)]));
      if (staffId === 'S_CHITRA' || staffId === 'FAC002') fStaffIds.push('S_CHITRA', 'FAC002');
      if (staffId === 'S_NAVEENKARTHICK' || staffId === 'FAC_IT_103') fStaffIds.push('S_NAVEENKARTHICK', 'FAC_IT_103');
      if (staffId === 'S_MAREESWARI' || staffId === 'FAC006') fStaffIds.push('S_MAREESWARI', 'FAC006');
      if (staffId === 'S_KARUNYA' || staffId === 'FAC010' || staffId === 'FAC026') fStaffIds.push('S_KARUNYA', 'FAC010', 'FAC026');
      if (staffId === 'S_RICHARD' || staffId === 'FAC017') fStaffIds.push('S_RICHARD', 'FAC017');
      if (staffId === 'S_KESAVA' || staffId === 'FAC005') fStaffIds.push('S_KESAVA', 'FAC005');
      if (staffId === 'S_UDHAYA' || staffId === 'FAC004') fStaffIds.push('S_UDHAYA', 'FAC004');
      if (staffId === 'S_BHAVANI' || staffId === 'FAC_IT_101') fStaffIds.push('S_BHAVANI', 'FAC_IT_101');
      if (staffId === 'S_VENNIMALAI' || staffId === 'FAC052') fStaffIds.push('S_VENNIMALAI', 'FAC052');
      if (staffId === 'S_RATHIMALA' || staffId === 'FAC016') fStaffIds.push('S_RATHIMALA', 'FAC016');
      if (staffId === 'S_JENIFER' || staffId === 'FAC021') fStaffIds.push('S_JENIFER', 'FAC021');
      
      const sPlaceholders = fStaffIds.map(() => '?').join(',');
      where.push(`ms.staff_id IN (${sPlaceholders})`);
      params.push(...fStaffIds);
    }
    if (subjectId)    { where.push('ms.subject_id = ?'); params.push(subjectId); }
    if (sessionLabel) { where.push('ms.session_label = ?'); params.push(sessionLabel); }
    if (department) {
      if (department === 'Science and Humanities' || department === 'First Year' || department.toLowerCase().includes('science')) {
        where.push(`(cl.department = 'Science and Humanities' OR cl.department = 'First Year' OR cl.year_label = 'I' OR sub.department = 'Science and Humanities')`);
      } else {
        where.push(`(cl.department LIKE ? OR sub.department LIKE ?)`);
        params.push(`%${department}%`, `%${department}%`);
      }
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
      `SELECT ms.*, sub.name AS subject, sub.code, cl.name AS class_name,
              st.name AS staff_name, st.designation AS staff_designation, st.department AS staff_department
       FROM marks_sessions ms
       JOIN subjects sub ON sub.id = ms.subject_id
       JOIN classes  cl  ON cl.id  = ms.class_id
       LEFT JOIN staffs st ON st.id = ms.staff_id
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
      'SELECT student_id, hours_attended, actual_taken_hours, attendance_mark, internal_exam_mark, lab_attendance, lab_mark FROM session_attendance WHERE session_id = ?', [id]
    );
    const attendance = {};
    const attendanceMarks = {};
    const internalExam = {};
    const labData = {};
    attendanceRows.forEach(r => {
      const rawHrs = r.actual_taken_hours !== null && r.actual_taken_hours !== undefined ? r.actual_taken_hours : r.hours_attended;
      attendance[r.student_id] = rawHrs;
      attendanceMarks[r.student_id] = r.attendance_mark !== null && r.attendance_mark !== undefined ? parseFloat(r.attendance_mark) : 0;
      internalExam[r.student_id] = r.internal_exam_mark;
      labData[r.student_id] = {
        labAttendance: r.lab_attendance,
        labMark: r.lab_mark
      };
    });

    res.json({ session: sessions[0], components, marks, attendance, attendanceMarks, internalExam, labData });
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

    // Get names for notification
    const [staffs] = await db.execute('SELECT name FROM staffs WHERE id = ?', [staffId]);
    const staffName = staffs[0]?.name || 'A staff member';
    
    let subjectName = 'a subject';
    let subjectDept = null;
    if (subjectId) {
       const [subs] = await db.execute(`
         SELECT s.name, s.code, s.department AS sub_dept, s.class_id,
                c.department AS class_dept, c.year_label
         FROM subjects s
         LEFT JOIN classes c ON c.id = s.class_id
         WHERE s.id = ?
       `, [subjectId]);
       if (subs[0]) {
         subjectName = `${subs[0].code} ${subs[0].name}`;
         subjectDept = subs[0].sub_dept;
         if (!subjectDept) {
           if (subs[0].year_label === 'I' || subs[0].class_dept === 'Science and Humanities' || subs[0].class_dept === 'First Year') {
             subjectDept = 'Science and Humanities';
           } else {
             subjectDept = subs[0].class_dept;
           }
         }
       }
    }

    // Notify HOD of the subject's related department ONLY
    await db.execute(
      `INSERT INTO notifications (target_role, target_department, title, message, link) VALUES ('hod', ?, 'Marks Unlock Request', ?, '/dashboard#unlocks')`,
      [subjectDept, `${staffName} requested to unlock marks for ${subjectName}.`]
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
      const depLower = department.trim().toLowerCase();
      const isFirstYear = depLower.includes('science') || depLower.includes('humanities') || depLower.includes('first year') || depLower === 's&h';
      if (isFirstYear) {
        sql += ` WHERE (cl.year_label = 'I' OR cl.department = 'Science and Humanities' OR sub.department = 'Science and Humanities' OR st.department = 'Science and Humanities')`;
      } else {
        sql += ` WHERE ((cl.department LIKE ? OR sub.department LIKE ? OR st.department LIKE ?) AND (cl.year_label IN ('II', 'III', 'IV') OR cl.year_label IS NULL))`;
        params.push(`%${department}%`, `%${department}%`, `%${department}%`);
      }
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

    // Notify the requesting faculty member directly
    try {
      const [reqDetails] = await db.execute(
        `SELECT ur.staff_id, ur.subject_id, ur.class_id, sub.name as subject_name, sub.code as subject_code
         FROM mark_unlock_requests ur
         LEFT JOIN subjects sub ON sub.id = ur.subject_id
         WHERE ur.id = ?`,
        [requestId]
      );
      if (reqDetails.length > 0 && reqDetails[0].staff_id) {
        const { staff_id, subject_name, subject_code, class_id } = reqDetails[0];
        const subTitle = subject_code ? `${subject_code} ${subject_name || ''}` : 'the subject';
        const actionTitle = action === 'approve' ? 'Marks Unlock Approved' : 'Marks Unlock Declined';
        const actionMsg = action === 'approve'
          ? `Your request to edit marks for ${subTitle} was approved by HOD. You may now modify and re-freeze the marks sheet.`
          : `Your request to edit marks for ${subTitle} was declined by HOD.`;
        const actionLink = action === 'approve' ? `/marks-entry?classId=${class_id || ''}` : '/reports';

        await db.execute(
          `INSERT INTO notifications (target_id, title, message, link) VALUES (?, ?, ?, ?)`,
          [staff_id, actionTitle, actionMsg, actionLink]
        );
      }
    } catch (notifErr) {
      console.error('Failed to notify staff on unlock decision:', notifErr);
    }

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
