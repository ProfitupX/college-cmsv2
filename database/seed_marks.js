import mysql from 'mysql2/promise';

async function seedMarks() {
  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'college123@',
    database: 'college_cms'
  });

  console.log('🚀 Starting fresh mark data generation for IT - II Year - III Sem (CL001)...');

  try {
    // 1. Fetch Class CL001 Students & Subjects
    const [students] = await db.execute('SELECT id, s_no, roll_no, name FROM students WHERE class_id = "CL001" ORDER BY s_no ASC');
    const [subjects] = await db.execute('SELECT id, code, name, type, ltpc, total_hours, faculty_id FROM subjects WHERE class_id = "CL001"');

    console.log(`Found ${students.length} students and ${subjects.length} subjects.`);

    if (students.length === 0 || subjects.length === 0) {
      console.error('❌ Students or subjects not found for CL001!');
      process.exit(1);
    }

    // 2. Clear all previous marks, sessions, attendance, and unlock requests for CL001
    const [sessionsToDelete] = await db.execute('SELECT id FROM marks_sessions WHERE class_id = "CL001"');
    const sessionIds = sessionsToDelete.map(s => s.id);

    if (sessionIds.length > 0) {
      const placeholders = sessionIds.map(() => '?').join(',');
      await db.execute(`DELETE FROM mark_unlock_requests WHERE session_id IN (${placeholders})`, sessionIds);
      await db.execute(`DELETE FROM marks WHERE session_id IN (${placeholders})`, sessionIds);
      await db.execute(`DELETE FROM session_attendance WHERE session_id IN (${placeholders})`, sessionIds);
      await db.execute(`DELETE FROM assessment_components WHERE session_id IN (${placeholders})`, sessionIds);
      await db.execute(`DELETE FROM marks_sessions WHERE id IN (${placeholders})`, sessionIds);
    }
    await db.execute('DELETE FROM class_analysis_remarks WHERE class_id = "CL001"');

    console.log('🧹 Cleaned existing session data for CL001 successfully.');

    // Helper for LTPC hour splits
    const getHourSplits = (ltpc, type, total) => {
      const cleanLtpc = (ltpc || '').trim().replace(/-/g, '');
      const h = parseInt(total || 0);
      if (type === 'Lab-cum-Theory') {
        if (cleanLtpc === '2023') return { int1: 15, int2: 15, lab: 30 };
        if (cleanLtpc === '2043') return { int1: 15, int2: 15, lab: 60 };
        if (cleanLtpc === '1022') return { int1: 15, int2: 15, lab: 15 };
        if (cleanLtpc === '3024') return { int1: 30, int2: 30, lab: 15 };
        if (cleanLtpc === '3045') return { int1: 30, int2: 30, lab: 45 };
        return { int1: 15, int2: 15, lab: Math.max(0, h - 30) };
      }
      if (type === 'Theory') {
        if (cleanLtpc === '3104' || cleanLtpc === '3004') return { int1: 30, int2: 30, lab: 0 };
        if (cleanLtpc === '1001') return { int1: 7, int2: 8, lab: 0 };
        if (cleanLtpc === '3003' || cleanLtpc === '2103') return { int1: 25, int2: 20, lab: 0 };
        return { int1: Math.ceil(h / 2), int2: Math.floor(h / 2), lab: 0 };
      }
      if (type === 'Practical') {
        return { int1: Math.ceil(h / 2), int2: Math.floor(h / 2), lab: 0 };
      }
      return { int1: Math.ceil(h / 2), int2: Math.floor(h / 2), lab: 0 };
    };

    // Helper for converted attendance mark (max 5)
    const getAttendanceMark = (attended, maxHours) => {
      if (!maxHours || maxHours <= 0) return 0;
      const pct = (attended / maxHours) * 100;
      if (pct >= 80 && pct <= 85) return 1;
      if (pct > 85 && pct <= 90) return 2;
      if (pct > 90 && pct <= 95) return 3;
      if (pct > 95) return 5;
      return 0; // Below 80% is 0 mark
    };

    // 3. Generate sessions for internal1 and internal2 for ALL 7 subjects
    const sessionLabels = ['internal1', 'internal2'];

    for (const sub of subjects) {
      const staffId = sub.faculty_id || 'FAC001';
      const splits = getHourSplits(sub.ltpc, sub.type, sub.total_hours);

      for (const mode of sessionLabels) {
        const totalHrs = mode === 'internal1' ? splits.int1 : splits.int2;
        const labHrs = mode === 'internal2' ? splits.lab : 0;
        const maxAttendanceHrs = totalHrs + labHrs;

        // Define assessment components
        const components = [
          { typeId: 'test1', label: 'Test 1', conductedMax: 50, maxMarks: 20, icon: 'FileText', color: '#6C63FF' },
          { typeId: 'assign1', label: 'Assignment 1', conductedMax: 20, maxMarks: 10, icon: 'BookOpen', color: '#10B981' }
        ];
        const totalMax = 30; // 20 + 10

        // Remedial Action sample text
        const remedialAction = `Improvement plan for ${sub.code} (${sub.name}): Extra coaching classes arranged for slow learners scoring below 50%. Practice question banks provided.`;

        // We will calculate student marks and attendance
        const studentTotals = {};
        const marksData = [];
        const attendanceData = [];

        students.forEach((st, idx) => {
          // Student performance tier based on index
          // 0-9: Top Performers (high marks, 90-100% attd)
          // 10-44: Average/Good Performers (60-85% marks, 80-95% attd)
          // 45-54: Moderate Performers (45-60% marks, 75-85% attd)
          // 55-59: Low Performers / Fail (20-40% marks, 60-75% attd)
          
          let test1Marks, assign1Marks, attdPct, examMark;

          if (idx < 10) {
            // Top
            test1Marks = Math.floor(Math.random() * 6) + 45; // 45-50
            assign1Marks = Math.floor(Math.random() * 3) + 18; // 18-20
            attdPct = 0.92 + Math.random() * 0.08; // 92-100%
            examMark = Math.floor(Math.random() * 10) + 90; // 90-100
          } else if (idx < 45) {
            // Average
            test1Marks = Math.floor(Math.random() * 15) + 30; // 30-44
            assign1Marks = Math.floor(Math.random() * 5) + 13; // 13-17
            attdPct = 0.80 + Math.random() * 0.15; // 80-95%
            examMark = Math.floor(Math.random() * 25) + 65; // 65-89
          } else if (idx < 53) {
            // Moderate
            test1Marks = Math.floor(Math.random() * 8) + 22; // 22-29
            assign1Marks = Math.floor(Math.random() * 4) + 10; // 10-13
            attdPct = 0.75 + Math.random() * 0.10; // 75-85%
            examMark = Math.floor(Math.random() * 15) + 50; // 50-64
          } else {
            // Low / Fail
            test1Marks = Math.floor(Math.random() * 10) + 10; // 10-19
            assign1Marks = Math.floor(Math.random() * 5) + 5; // 5-9
            attdPct = 0.60 + Math.random() * 0.15; // 60-75%
            examMark = Math.floor(Math.random() * 20) + 25; // 25-44
          }

          // Converted marks
          const c0 = (test1Marks / 50) * 20;
          const c1 = (assign1Marks / 20) * 10;

          // Attendance hours
          const hrsAttended = Math.min(totalHrs, Math.round(totalHrs * attdPct));
          const labAttended = Math.min(labHrs, Math.round(labHrs * attdPct));
          const attdMark = getAttendanceMark(hrsAttended + labAttended, maxAttendanceHrs);

          studentTotals[st.id] = c0 + c1 + attdMark;

          // Push component marks
          marksData.push({ studentId: st.id, componentIndex: 0, marksObtained: test1Marks });
          marksData.push({ studentId: st.id, componentIndex: 1, marksObtained: assign1Marks });

          // Push attendance & exam mark
          let labMark = null;
          if (mode === 'internal2' && sub.type === 'Lab-cum-Theory') {
            labMark = Math.floor(test1Marks * 1.5); // lab mark out of 75/100
          }

          attendanceData.push({
            studentId: st.id,
            hoursAttended: hrsAttended,
            internalExamMark: examMark,
            labAttendance: labAttended,
            labMark: labMark
          });
        });

        // Compute session average
        const avgScore = Object.values(studentTotals).reduce((sum, val) => sum + val, 0) / students.length;

        // Insert session into DB (status = 'locked' so it shows up in reports & charts)
        const [sessionRes] = await db.execute(
          `INSERT INTO marks_sessions
             (subject_id, class_id, staff_id, session_label, total_max, total_hours, internal2_total_hours, status, avg_score, student_count, remedial_action)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'locked', ?, ?, ?)`,
          [sub.id, 'CL001', staffId, mode, totalMax, totalHrs, labHrs, avgScore, students.length, remedialAction]
        );
        const sessionId = sessionRes.insertId;

        // Insert components
        const compDbIds = [];
        for (let i = 0; i < components.length; i++) {
          const c = components[i];
          const [compRes] = await db.execute(
            `INSERT INTO assessment_components
               (session_id, type_id, label, conducted_max, max_marks, icon, color, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [sessionId, c.typeId, c.label, c.conductedMax, c.maxMarks, c.icon, c.color, i]
          );
          compDbIds.push(compRes.insertId);
        }

        // Insert marks
        for (const m of marksData) {
          const compId = compDbIds[m.componentIndex];
          await db.execute(
            `INSERT INTO marks (session_id, component_id, student_id, marks_obtained)
             VALUES (?, ?, ?, ?)`,
            [sessionId, compId, m.studentId, m.marksObtained]
          );
        }

        // Insert attendance
        for (const a of attendanceData) {
          await db.execute(
            `INSERT INTO session_attendance 
               (session_id, student_id, hours_attended, internal_exam_mark, lab_attendance, lab_mark)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [sessionId, a.studentId, a.hoursAttended, a.internalExamMark, a.labAttendance, a.labMark]
          );
        }

        console.log(`  ✅ Created ${mode} for subject ${sub.code} (${sub.name}) — Avg Score: ${avgScore.toFixed(1)}/35`);
      }
    }

    // 4. Also insert class analysis remarks
    await db.execute(
      `INSERT INTO class_analysis_remarks (class_id, session_label, remarks)
       VALUES 
       ('CL001', 'internal1', 'Overall class performance in Internal 1 is satisfactory. 88% pass rate achieved across all subjects.'),
       ('CL001', 'internal2', 'Internal 2 shows significant improvement in practical and theory components. Special focus given to slow learners.')`
    );

    console.log('\n🎉 Fresh dummy marks created successfully for all subjects in IT - II Year - III Sem!');
    await db.end();
  } catch (err) {
    console.error('❌ Error seeding marks:', err);
    await db.end();
    process.exit(1);
  }
}

seedMarks();
