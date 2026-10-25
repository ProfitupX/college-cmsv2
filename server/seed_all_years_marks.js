import db from './db.js';

export async function seedAllYearsMarks(shouldExit = false) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    console.log('--- Seeding Marks Sessions for All Academic Years (I, II, III, IV) ---');

    // ==========================================
    // 1. YEAR I: IT 1st Year (C_SH_IT_1) - CS25C01
    // ==========================================
    const [subYear1] = await conn.execute("SELECT id, faculty_id FROM subjects WHERE class_id = 'C_SH_IT_1' AND code = 'CS25C01' LIMIT 1");
    if (subYear1.length > 0) {
      const subjectId = subYear1[0].id;
      const staffId = subYear1[0].faculty_id || 'FAC005';

      let [sess1] = await conn.execute(
        "SELECT id FROM marks_sessions WHERE subject_id = ? AND class_id = 'C_SH_IT_1' AND session_label = 'internal1' LIMIT 1",
        [subjectId]
      );
      let s1Id;
      if (sess1.length > 0) {
        s1Id = sess1[0].id;
      } else {
        const [ins] = await conn.execute(
          "INSERT INTO marks_sessions (subject_id, class_id, staff_id, session_label, status, total_hours, avg_score, total_max, student_count) VALUES (?, 'C_SH_IT_1', ?, 'internal1', 'draft', 30, 15.7, 20, 39)",
          [subjectId, staffId]
        );
        s1Id = ins.insertId;
      }

      await conn.execute('DELETE FROM marks WHERE session_id = ?', [s1Id]);
      await conn.execute('DELETE FROM assessment_components WHERE session_id = ?', [s1Id]);
      await conn.execute('DELETE FROM session_attendance WHERE session_id = ?', [s1Id]);

      const [cRes] = await conn.execute(
        "INSERT INTO assessment_components (session_id, type_id, label, conducted_max, max_marks, icon, color, sort_order) VALUES (?, 'assignment', 'Assignment', 20, 20, '📋', '#22D3EE', 0)",
        [s1Id]
      );
      const comp1Id = cRes.insertId;

      const [stds1] = await conn.execute("SELECT id FROM students WHERE class_id = 'C_SH_IT_1' ORDER BY s_no");
      let totalComp1 = 0;
      let totalExam1 = 0;
      for (let i = 0; i < stds1.length; i++) {
        // 6 students fail (< 50) for realistic pass rate ~84.6%
        const isFail = (i === 4 || i === 11 || i === 19 || i === 27 || i === 33 || i === 38);
        const score = isFail ? Math.min(20, Math.max(7, 8 + (i % 3))) : Math.min(20, Math.max(12, 14 + ((i * 3 + 5) % 6)));
        totalComp1 += score;
        const examMark = isFail ? (32 + (i % 14)) : Math.min(96, Math.max(52, 68 + ((i * 5 + 7) % 26)));
        totalExam1 += examMark;
        const hrs = Math.max(22, 30 - (i % 7));
        const attMark = hrs >= 29 ? 5 : hrs >= 27 ? 3 : hrs >= 25 ? 2 : hrs >= 23 ? 1 : 0;

        await conn.execute(
          "INSERT INTO marks (session_id, component_id, student_id, marks_obtained) VALUES (?, ?, ?, ?)",
          [s1Id, comp1Id, stds1[i].id, score]
        );
        await conn.execute(
          "INSERT INTO session_attendance (session_id, student_id, hours_attended, actual_taken_hours, attendance_mark, internal_exam_mark, lab_attendance, lab_mark) VALUES (?, ?, ?, ?, ?, ?, 0, null)",
          [s1Id, stds1[i].id, hrs, hrs, attMark, examMark]
        );
      }
      const avg1 = Math.round((totalComp1 / stds1.length) * 10) / 10;
      const examAvg1 = Math.round((totalExam1 / stds1.length) * 10) / 10;
      await conn.execute("UPDATE marks_sessions SET total_max = 20, avg_score = ?, student_count = ? WHERE id = ?", [avg1, stds1.length, s1Id]);
      console.log(`✅ Year I (IT 1st Year) seeded with ${stds1.length} students, avg score ${avg1}/20, exam avg ${examAvg1}%`);
    }

    // ==========================================
    // 2. YEAR II: IT 2nd Year (CL001) - SUB003 (Data Structures)
    // ==========================================
    const [subYear2] = await conn.execute("SELECT id, faculty_id FROM subjects WHERE class_id = 'CL001' AND code = 'CS25C08' LIMIT 1");
    if (subYear2.length > 0) {
      const subjectId = subYear2[0].id;
      const staffId = subYear2[0].faculty_id || 'FAC004';

      let [sess2] = await conn.execute(
        "SELECT id FROM marks_sessions WHERE subject_id = ? AND class_id = 'CL001' AND session_label = 'internal1' LIMIT 1",
        [subjectId]
      );
      let s2Id;
      if (sess2.length > 0) {
        s2Id = sess2[0].id;
      } else {
        const [ins] = await conn.execute(
          "INSERT INTO marks_sessions (subject_id, class_id, staff_id, session_label, status, total_hours, avg_score, total_max, student_count) VALUES (?, 'CL001', ?, 'internal1', 'draft', 30, 15.2, 20, 60)",
          [subjectId, staffId]
        );
        s2Id = ins.insertId;
      }

      await conn.execute('DELETE FROM marks WHERE session_id = ?', [s2Id]);
      await conn.execute('DELETE FROM assessment_components WHERE session_id = ?', [s2Id]);
      await conn.execute('DELETE FROM session_attendance WHERE session_id = ?', [s2Id]);

      const [cRes2] = await conn.execute(
        "INSERT INTO assessment_components (session_id, type_id, label, conducted_max, max_marks, icon, color, sort_order) VALUES (?, 'assignment', 'Assignment', 20, 20, '📋', '#22D3EE', 0)",
        [s2Id]
      );
      const comp2Id = cRes2.insertId;

      const [stds2] = await conn.execute("SELECT id FROM students WHERE class_id = 'CL001' ORDER BY s_no");
      let totalComp2 = 0;
      let totalExam2 = 0;
      for (let i = 0; i < stds2.length; i++) {
        // 12 students fail (< 50) for realistic pass rate 80.0%
        const isFail = (i % 5 === 0);
        const score = isFail ? Math.min(20, Math.max(6, 8 + (i % 4))) : Math.min(20, Math.max(11, 14 + ((i * 4 + 3) % 6)));
        totalComp2 += score;
        const examMark = isFail ? (30 + (i % 16)) : Math.min(95, Math.max(50, 68 + ((i * 7 + 11) % 25)));
        totalExam2 += examMark;
        const hrs = Math.max(22, 30 - (i % 6));
        const attMark = hrs >= 29 ? 5 : hrs >= 27 ? 3 : hrs >= 25 ? 2 : 1;

        await conn.execute(
          "INSERT INTO marks (session_id, component_id, student_id, marks_obtained) VALUES (?, ?, ?, ?)",
          [s2Id, comp2Id, stds2[i].id, score]
        );
        await conn.execute(
          "INSERT INTO session_attendance (session_id, student_id, hours_attended, actual_taken_hours, attendance_mark, internal_exam_mark, lab_attendance, lab_mark) VALUES (?, ?, ?, ?, ?, ?, 0, null)",
          [s2Id, stds2[i].id, hrs, hrs, attMark, examMark]
        );
      }
      const avg2 = Math.round((totalComp2 / stds2.length) * 10) / 10;
      const examAvg2 = Math.round((totalExam2 / stds2.length) * 10) / 10;
      await conn.execute("UPDATE marks_sessions SET total_max = 20, avg_score = ?, student_count = ? WHERE id = ?", [avg2, stds2.length, s2Id]);
      console.log(`✅ Year II (IT 2nd Year) seeded with ${stds2.length} students, avg score ${avg2}/20, exam avg ${examAvg2}%`);
    }

    // ==========================================
    // 3. YEAR III: IT 3rd Year (CL_IT_III) - SUB_IT_III_5 (App Development)
    // ==========================================
    const [subYear3] = await conn.execute("SELECT id, faculty_id FROM subjects WHERE class_id = 'CL_IT_III' AND code = 'CCS332' LIMIT 1");
    if (subYear3.length > 0) {
      const subjectId = subYear3[0].id;
      const staffId = subYear3[0].faculty_id || 'FAC_IT_103';

      let [sess3] = await conn.execute(
        "SELECT id FROM marks_sessions WHERE subject_id = ? AND class_id = 'CL_IT_III' AND session_label = 'internal1' LIMIT 1",
        [subjectId]
      );
      let s3Id;
      if (sess3.length > 0) {
        s3Id = sess3[0].id;
      } else {
        const [ins] = await conn.execute(
          "INSERT INTO marks_sessions (subject_id, class_id, staff_id, session_label, status, total_hours, avg_score, total_max, student_count) VALUES (?, 'CL_IT_III', ?, 'internal1', 'draft', 30, 16.5, 20, 43)",
          [subjectId, staffId]
        );
        s3Id = ins.insertId;
      }

      await conn.execute('DELETE FROM marks WHERE session_id = ?', [s3Id]);
      await conn.execute('DELETE FROM assessment_components WHERE session_id = ?', [s3Id]);
      await conn.execute('DELETE FROM session_attendance WHERE session_id = ?', [s3Id]);

      const [cRes3] = await conn.execute(
        "INSERT INTO assessment_components (session_id, type_id, label, conducted_max, max_marks, icon, color, sort_order) VALUES (?, 'assignment', 'Assignment', 20, 20, '📋', '#22D3EE', 0)",
        [s3Id]
      );
      const comp3Id = cRes3.insertId;

      const [stds3] = await conn.execute("SELECT id FROM students WHERE class_id = 'CL_IT_III' ORDER BY s_no");
      let totalComp3 = 0;
      let totalExam3 = 0;
      for (let i = 0; i < stds3.length; i++) {
        // 6 students fail (< 50) for realistic pass rate 86.0%
        const isFail = (i === 6 || i === 13 || i === 21 || i === 29 || i === 35 || i === 41);
        const score = isFail ? Math.min(20, Math.max(7, 9 + (i % 3))) : Math.min(20, Math.max(13, 15 + ((i * 3 + 4) % 5)));
        totalComp3 += score;
        const examMark = isFail ? (34 + (i % 12)) : Math.min(98, Math.max(55, 72 + ((i * 5 + 3) % 24)));
        totalExam3 += examMark;
        const hrs = Math.max(25, 30 - (i % 5));
        const attMark = hrs >= 29 ? 5 : hrs >= 27 ? 3 : 2;

        await conn.execute(
          "INSERT INTO marks (session_id, component_id, student_id, marks_obtained) VALUES (?, ?, ?, ?)",
          [s3Id, comp3Id, stds3[i].id, score]
        );
        await conn.execute(
          "INSERT INTO session_attendance (session_id, student_id, hours_attended, actual_taken_hours, attendance_mark, internal_exam_mark, lab_attendance, lab_mark) VALUES (?, ?, ?, ?, ?, ?, 0, null)",
          [s3Id, stds3[i].id, hrs, hrs, attMark, examMark]
        );
      }
      const avg3 = Math.round((totalComp3 / stds3.length) * 10) / 10;
      const examAvg3 = Math.round((totalExam3 / stds3.length) * 10) / 10;
      await conn.execute("UPDATE marks_sessions SET total_max = 20, avg_score = ?, student_count = ? WHERE id = ?", [avg3, stds3.length, s3Id]);
      console.log(`✅ Year III (IT 3rd Year) seeded with ${stds3.length} students, avg score ${avg3}/20, exam avg ${examAvg3}%`);
    }

    // ==========================================
    // 4. YEAR IV: IT 4th Year (CL_IT_IV) - SUB_IT_IV_2 (Principles of Management)
    // ==========================================
    const [subYear4] = await conn.execute("SELECT id, faculty_id FROM subjects WHERE class_id = 'CL_IT_IV' AND code = 'GE3751' LIMIT 1");
    if (subYear4.length > 0) {
      const subjectId = subYear4[0].id;
      const staffId = subYear4[0].faculty_id || 'FAC062';

      let [sess4] = await conn.execute(
        "SELECT id FROM marks_sessions WHERE subject_id = ? AND class_id = 'CL_IT_IV' AND session_label = 'internal1' LIMIT 1",
        [subjectId]
      );
      let s4Id;
      if (sess4.length > 0) {
        s4Id = sess4[0].id;
      } else {
        const [ins] = await conn.execute(
          "INSERT INTO marks_sessions (subject_id, class_id, staff_id, session_label, status, total_hours, avg_score, total_max, student_count) VALUES (?, 'CL_IT_IV', ?, 'internal1', 'draft', 30, 16.3, 20, 27)",
          [subjectId, staffId]
        );
        s4Id = ins.insertId;
      }

      await conn.execute('DELETE FROM marks WHERE session_id = ?', [s4Id]);
      await conn.execute('DELETE FROM assessment_components WHERE session_id = ?', [s4Id]);
      await conn.execute('DELETE FROM session_attendance WHERE session_id = ?', [s4Id]);

      const [cRes4] = await conn.execute(
        "INSERT INTO assessment_components (session_id, type_id, label, conducted_max, max_marks, icon, color, sort_order) VALUES (?, 'assignment', 'Assignment', 20, 20, '📋', '#22D3EE', 0)",
        [s4Id]
      );
      const comp4Id = cRes4.insertId;

      const [stds4] = await conn.execute("SELECT id FROM students WHERE class_id = 'CL_IT_IV' ORDER BY s_no");
      let totalComp4 = 0;
      let totalExam4 = 0;
      for (let i = 0; i < stds4.length; i++) {
        // 4 students fail (< 50) for realistic pass rate 85.2%
        const isFail = (i === 5 || i === 12 || i === 19 || i === 25);
        const score = isFail ? Math.min(20, Math.max(8, 9 + (i % 3))) : Math.min(20, Math.max(12, 15 + ((i * 5 + 2) % 5)));
        totalComp4 += score;
        const examMark = isFail ? (35 + (i % 10)) : Math.min(98, Math.max(55, 72 + ((i * 6 + 13) % 24)));
        totalExam4 += examMark;
        const hrs = Math.max(26, 30 - (i % 4));
        const attMark = hrs >= 29 ? 5 : hrs >= 27 ? 3 : 2;

        await conn.execute(
          "INSERT INTO marks (session_id, component_id, student_id, marks_obtained) VALUES (?, ?, ?, ?)",
          [s4Id, comp4Id, stds4[i].id, score]
        );
        await conn.execute(
          "INSERT INTO session_attendance (session_id, student_id, hours_attended, actual_taken_hours, attendance_mark, internal_exam_mark, lab_attendance, lab_mark) VALUES (?, ?, ?, ?, ?, ?, 0, null)",
          [s4Id, stds4[i].id, hrs, hrs, attMark, examMark]
        );
      }
      const avg4 = Math.round((totalComp4 / stds4.length) * 10) / 10;
      const examAvg4 = Math.round((totalExam4 / stds4.length) * 10) / 10;
      await conn.execute("UPDATE marks_sessions SET total_max = 20, avg_score = ?, student_count = ? WHERE id = ?", [avg4, stds4.length, s4Id]);
      console.log(`✅ Year IV (IT 4th Year) seeded with ${stds4.length} students, avg score ${avg4}/20, exam avg ${examAvg4}%`);
    }

    await conn.commit();
    console.log('✅ Successfully seeded authentic marks and attendance for Years I, II, III, and IV!');
  } catch (err) {
    await conn.rollback();
    console.error('❌ Error seeding all years marks:', err);
  } finally {
    conn.release();
    if (shouldExit) process.exit(0);
  }
}

if (process.argv[1]?.includes('seed_all_years_marks')) {
  seedAllYearsMarks(true);
}
