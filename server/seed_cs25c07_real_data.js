import db from './db.js';

async function seedRealData() {
  const sessionId = 4;
  console.log(`Populating realistic data for Session ID ${sessionId} (CS25C07 - OOP)...`);

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Delete old components & marks for this session
    await conn.execute('DELETE FROM marks WHERE session_id = ?', [sessionId]);
    await conn.execute('DELETE FROM assessment_components WHERE session_id = ?', [sessionId]);
    await conn.execute('DELETE FROM session_attendance WHERE session_id = ?', [sessionId]);

    // 2. Insert 4 Activity Components summing to 95 marks (leaving 5 for Attendance)
    const components = [
      { type_id: 'test', label: 'Test 1 / CIA-1', conducted_max: 25, max_marks: 25, icon: '📝', color: '#6C63FF', sort_order: 0 },
      { type_id: 'assignment', label: 'Assignment', conducted_max: 25, max_marks: 25, icon: '📋', color: '#22D3EE', sort_order: 1 },
      { type_id: 'seminar', label: 'Seminar / Presentation', conducted_max: 25, max_marks: 25, icon: '📢', color: '#8B5CF6', sort_order: 2 },
      { type_id: 'quiz', label: 'Quiz / Viva', conducted_max: 20, max_marks: 20, icon: '❓', color: '#10B981', sort_order: 3 },
    ];

    const compDbIds = [];
    for (const c of components) {
      const [res] = await conn.execute(
        `INSERT INTO assessment_components (session_id, type_id, label, conducted_max, max_marks, icon, color, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [sessionId, c.type_id, c.label, c.conducted_max, c.max_marks, c.icon, c.color, c.sort_order]
      );
      compDbIds.push(res.insertId);
    }
    console.log(`Inserted ${compDbIds.length} assessment components.`);

    // 3. Fetch students in CL001
    const [students] = await conn.execute(
      'SELECT id, s_no, roll_no, name FROM students WHERE class_id = ? ORDER BY s_no',
      ['CL001']
    );

    const getAttendanceMark = (pct) => {
      if (pct >= 95) return 5;
      if (pct >= 90) return 3;
      if (pct >= 85) return 2;
      if (pct >= 80) return 1;
      return 0;
    };

    const tHours = 30; // Prescribed hours for Internal 1
    let totalScoreSum = 0;

    for (let i = 0; i < students.length; i++) {
      const st = students[i];
      // Deterministic realistic variance based on student index
      const baseFactor = ((i * 7 + 13) % 20); // 0 to 19

      // Component scores:
      const testScore = Math.min(25, 18 + Math.floor(baseFactor * 0.4)); // 18 - 25
      const assignScore = Math.min(25, 20 + Math.floor((baseFactor + 3) * 0.3)); // 20 - 25
      const seminarScore = Math.min(25, 19 + Math.floor((baseFactor + 5) * 0.35)); // 19 - 25
      const quizScore = Math.min(20, 15 + Math.floor(baseFactor * 0.28)); // 15 - 20

      const studentCompScores = [testScore, assignScore, seminarScore, quizScore];

      for (let j = 0; j < compDbIds.length; j++) {
        await conn.execute(
          `INSERT INTO marks (session_id, component_id, student_id, marks_obtained)
           VALUES (?, ?, ?, ?)`,
          [sessionId, compDbIds[j], st.id, studentCompScores[j]]
        );
      }

      const activitiesTotal = testScore + assignScore + seminarScore + quizScore;
      totalScoreSum += activitiesTotal;

      // Attendance: Real-world data centered around the true 30-hour syllabus target
      // Prescribed total is 30 hours for Internal 1
      let actualTakenHours = 30; // Default full attendance

      if (i === 0) actualTakenHours = 30; // Abarna M: 30 / 30 -> 100% -> 30/30 -> 5 marks
      else if (i % 8 === 0) actualTakenHours = 29; // 29 / 30 -> 97% -> 29/30 -> 5 marks
      else if (i % 6 === 0) actualTakenHours = 28; // 28 / 30 -> 93% -> 28/30 -> 3 marks
      else if (i % 5 === 0) actualTakenHours = 27; // 27 / 30 -> 90% -> 27/30 -> 3 marks
      else if (i % 7 === 0) actualTakenHours = 26; // 26 / 30 -> 87% -> 26/30 -> 2 marks
      else if (i % 9 === 0) actualTakenHours = 25; // 25 / 30 -> 83% -> 25/30 -> 1 mark
      else if (i % 11 === 0) actualTakenHours = 24; // 24 / 30 -> 80% -> 24/30 -> 1 mark
      else if (i === 58) actualTakenHours = 22;     // 22 / 30 -> 73% -> 22/30 -> 0 marks
      else actualTakenHours = Math.max(26, 30 - (i % 4)); // 27-30 hrs

      // If staff took a couple extra periods (e.g. student attended 31 or 32 hours),
      // the formula converts it proportionally to the 30-hour scale
      const pct = Math.min(100, Math.round((actualTakenHours / tHours) * 100));
      const convertedHours = Math.min(tHours, Math.round((actualTakenHours / tHours) * tHours));
      const attMark = getAttendanceMark(pct);

      // Exam mark out of 100:
      const examMark = Math.min(98, Math.max(55, 70 + Math.floor((baseFactor - 5) * 2)));

      await conn.execute(
        `INSERT INTO session_attendance (session_id, student_id, hours_attended, actual_taken_hours, attendance_mark, internal_exam_mark, lab_attendance, lab_mark)
         VALUES (?, ?, ?, ?, ?, ?, 0, null)`,
        [sessionId, st.id, convertedHours, actualTakenHours, attMark, examMark]
      );
    }

    const avgScore = Math.round((totalScoreSum / students.length) * 10) / 10;

    await conn.execute(
      `UPDATE marks_sessions 
       SET total_max = 95, avg_score = ?, student_count = ?
       WHERE id = ?`,
      [avgScore, students.length, sessionId]
    );

    await conn.commit();
    console.log(`✅ Successfully seeded real marks, attendance, and exam scores for all ${students.length} students! Average activity score: ${avgScore}`);
  } catch (err) {
    await conn.rollback();
    console.error('❌ Error seeding data:', err);
  } finally {
    conn.release();
    process.exit(0);
  }
}

seedRealData();
