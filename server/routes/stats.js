import express from 'express';
import db from '../db.js';

const router = express.Router();

// GET /api/stats?classId=CL001&staffId=STF001&role=hod&department=Information%20Technology
router.get('/', async (req, res) => {
  try {
    const { classId, staffId, role, department } = req.query;

    let totalStudents = 0;
    let totalSubjects = 0;
    let myTeachingSubjects = 0;
    let assignedClasses = [];

    if (role === 'hod' || role === 'admin') {
      const isFirstYearHod = department && (
        department === 'Science and Humanities' ||
        department === 'First Year' ||
        department.toLowerCase().includes('science') ||
        department.toLowerCase().includes('humanities')
      );

      if (role === 'hod' && isFirstYearHod) {
        // First Year HOD: Only 1st Year department classes and students
        const [[{ deptStudents }]] = await db.query(
          `SELECT COUNT(st.id) AS deptStudents 
           FROM students st 
           JOIN classes c ON c.id = st.class_id 
           WHERE c.department = 'Science and Humanities' OR c.department = 'First Year' OR c.year_label = 'I'`
        );
        totalStudents = deptStudents;

        const [[{ deptSubCount }]] = await db.query(
          `SELECT COUNT(s.id) AS deptSubCount 
           FROM subjects s 
           JOIN classes c ON c.id = s.class_id 
           WHERE c.department = 'Science and Humanities' OR c.department = 'First Year' OR c.year_label = 'I'`
        );
        totalSubjects = deptSubCount;
      } else if (role === 'hod' && department) {
        // Core Department HODs (IT, CSE, ECE, MECH, CIVIL, etc.):
        // Only their department AND only Years II, III, IV
        const [[{ deptStudents }]] = await db.query(
          `SELECT COUNT(st.id) AS deptStudents 
           FROM students st 
           JOIN classes c ON c.id = st.class_id 
           WHERE (c.department LIKE ? OR c.name LIKE ?) AND c.year_label IN ('II', 'III', 'IV')`,
          [`%${department}%`, `%${department}%`]
        );
        totalStudents = deptStudents;

        const [[{ deptSubCount }]] = await db.query(
          `SELECT COUNT(s.id) AS deptSubCount 
           FROM subjects s 
           JOIN classes c ON c.id = s.class_id 
           WHERE (c.department LIKE ? OR c.name LIKE ?) AND c.year_label IN ('II', 'III', 'IV')`,
          [`%${department}%`, `%${department}%`]
        );
        totalSubjects = deptSubCount;
      } else {
        // Admin: all students and subjects
        const [[{ count }]] = await db.query('SELECT COUNT(*) AS count FROM students');
        totalStudents = count;
        const [[{ subCount }]] = await db.query('SELECT COUNT(*) AS totalSubjects FROM subjects');
        totalSubjects = subCount;
      }

      // 3. If HOD is also teaching subjects, count HOD's own subjects
      if (staffId) {
        const hStaffIds = (staffId === 'S_CHITRA' || staffId === 'FAC002') ? ['S_CHITRA', 'FAC002'] : [staffId];
        const hPlaceholders = hStaffIds.map(() => '?').join(',');
        const [[{ hodSubCount }]] = await db.query(
          `SELECT COUNT(*) AS hodSubCount FROM subjects WHERE faculty_id IN (${hPlaceholders})`,
          hStaffIds
        );
        myTeachingSubjects = hodSubCount;
      }
    } else if (staffId) {
      // Regular Faculty or Class In-charge
      const [classRows] = await db.execute(
        `SELECT DISTINCT c.id, c.name 
         FROM subjects s 
         JOIN classes c ON c.id = s.class_id 
         WHERE s.faculty_id = ?`,
        [staffId]
      );
      assignedClasses = classRows.map(c => c.name);

      if (classRows.length > 0) {
        const classIds = classRows.map(c => c.id);
        const placeholders = classIds.map(() => '?').join(',');
        const [[{ count }]] = await db.execute(
          `SELECT COUNT(*) AS count FROM students WHERE class_id IN (${placeholders})`,
          classIds
        );
        totalStudents = count;
      }

      const [[{ subCount }]] = await db.execute(
        'SELECT COUNT(*) AS subCount FROM subjects WHERE faculty_id = ?',
        [staffId]
      );
      totalSubjects = subCount;
      myTeachingSubjects = subCount;
    } else {
      const [[{ count }]] = await db.execute(
        'SELECT COUNT(*) AS count FROM students' + (classId ? ' WHERE class_id = ?' : ''),
        classId ? [classId] : []
      );
      totalStudents = count;

      const [[{ subCount }]] = await db.execute('SELECT COUNT(*) AS totalSubjects FROM subjects');
      totalSubjects = subCount;
    }

    let msJoin = '';
    let msWhere = '1=1';
    let msParams = [];

    if (role === 'hod' && department) {
      msJoin = 'JOIN subjects sub ON sub.id = ms.subject_id JOIN classes c ON c.id = sub.class_id';
      const isFirstYear = (
        department === 'Science and Humanities' ||
        department === 'First Year' ||
        department.toLowerCase().includes('science') ||
        department.toLowerCase().includes('humanities')
      );
      if (isFirstYear) {
        msWhere = "(c.department = 'Science and Humanities' OR c.department = 'First Year' OR c.year_label = 'I')";
        msParams = [];
      } else {
        msWhere = "(c.department LIKE ? OR c.name LIKE ?) AND c.year_label IN ('II', 'III', 'IV')";
        msParams = [`%${department}%`, `%${department}%`];
      }
    } else if (staffId && role !== 'admin') {
      msJoin = 'JOIN subjects sub ON sub.id = ms.subject_id';
      msWhere = 'sub.faculty_id = ?';
      msParams = [staffId];
    }

    const [[{ totalSessions }]] = await db.execute(
      `SELECT COUNT(ms.id) AS totalSessions FROM marks_sessions ms ${msJoin} WHERE ${msWhere}`,
      msParams
    );
    const [[{ pendingCount }]] = await db.execute(
      `SELECT COUNT(ms.id) AS pendingCount FROM marks_sessions ms ${msJoin} WHERE ${msWhere} AND ms.status = 'draft'`,
      msParams
    );

    // Avg score across all sessions
    const [[{ globalAvg }]] = await db.execute(
      `SELECT ROUND(AVG(ms.avg_score), 1) AS globalAvg FROM marks_sessions ms ${msJoin} WHERE ${msWhere} AND ms.avg_score IS NOT NULL`,
      msParams
    );

    // Sessions this month
    const [[{ thisMonth }]] = await db.execute(
      `SELECT COUNT(ms.id) AS thisMonth FROM marks_sessions ms ${msJoin} WHERE ${msWhere} AND MONTH(ms.created_at) = MONTH(NOW()) AND YEAR(ms.created_at) = YEAR(NOW())`,
      msParams
    );

    // Monthly chart data (last 6 months)
    const [monthly] = await db.execute(`
      SELECT DATE_FORMAT(ms.created_at, '%b') AS month,
             ROUND(AVG(ms.avg_score), 1)      AS avgScore,
             COUNT(ms.id)                     AS submissions
      FROM marks_sessions ms
      ${msJoin}
      WHERE ${msWhere} AND ms.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY YEAR(ms.created_at), MONTH(ms.created_at), DATE_FORMAT(ms.created_at, '%b')
      ORDER BY YEAR(ms.created_at), MONTH(ms.created_at)
    `, msParams);

    // Per-subject avg (Keeping for compatibility if needed, but adding yearPerformance)
    const [subjectDist] = await db.execute(`
      SELECT sub.acronym AS name, ROUND(AVG(ms.avg_score), 1) AS value
      FROM marks_sessions ms
      ${msJoin || 'JOIN subjects sub ON sub.id = ms.subject_id'}
      WHERE ${msWhere}
      GROUP BY ms.subject_id, sub.acronym
    `, msParams);

    // Year-wise Performance (I, II, III, IV)
    let yearParams = [];
    let yearWhere = '1=1';
    let yearAllowedClause = "c.year_label IN ('I', 'II', 'III', 'IV')";
    if (role === 'hod' && department) {
      const isFirstYear = (
        department === 'Science and Humanities' ||
        department === 'First Year' ||
        department.toLowerCase().includes('science') ||
        department.toLowerCase().includes('humanities')
      );
      if (isFirstYear) {
        yearWhere = "(c.department = 'Science and Humanities' OR c.department = 'First Year' OR c.year_label = 'I')";
        yearAllowedClause = "c.year_label = 'I'";
      } else {
        yearWhere = "(c.department LIKE ? OR c.name LIKE ?)";
        yearParams.push(`%${department}%`, `%${department}%`);
        yearAllowedClause = "c.year_label IN ('II', 'III', 'IV')";
      }
    } else if (staffId && role !== 'admin' && role !== 'principal' && role !== 'vice_principal') {
      if (staffId === 'S_CHITRA' || staffId === 'FAC002') {
        yearWhere = '(ms.staff_id = ? OR ms.staff_id = ? OR sub.faculty_id = ? OR sub.faculty_id = ?)';
        yearParams.push('S_CHITRA', 'FAC002', 'S_CHITRA', 'FAC002');
      } else {
        yearWhere = '(ms.staff_id = ? OR sub.faculty_id = ?)';
        yearParams.push(staffId, staffId);
      }
    }
    const [yearPerf] = await db.query(`
      SELECT c.year_label AS name, 
             ROUND(AVG(CASE WHEN ms.total_max > 0 THEN (ms.avg_score / ms.total_max) * 100 ELSE ms.avg_score END), 1) AS value
      FROM marks_sessions ms
      JOIN classes c ON c.id = ms.class_id
      LEFT JOIN subjects sub ON sub.id = ms.subject_id
      WHERE ${yearWhere} AND ${yearAllowedClause}
      GROUP BY c.year_label
      ORDER BY FIELD(c.year_label, 'I', 'II', 'III', 'IV')
    `, yearParams);

    res.json({
      totalStudents,
      totalSubjects,
      myTeachingSubjects,
      assignedClasses,
      totalSessions,
      pendingSubmissions: pendingCount,
      averageScore:       globalAvg || 0,
      submittedThisMonth: thisMonth,
      performanceData:    monthly,
      subjectDistribution: subjectDist,
      yearPerformance:    yearPerf,
    });
  } catch (err) {
    console.error('GET /stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

// GET /api/stats/college (For Principal/Vice Principal)
router.get('/college', async (req, res) => {
  try {
    // 1. Total Students across College
    const [[{ totalStudents }]] = await db.execute('SELECT COUNT(*) AS totalStudents FROM students');

    // 2. Total Departments (Distinct departments in classes)
    const [[{ totalDepartments }]] = await db.execute('SELECT COUNT(DISTINCT department) AS totalDepartments FROM classes WHERE department IS NOT NULL');

    // 3. Total Faculty
    const [[{ totalFaculty }]] = await db.execute('SELECT COUNT(*) AS totalFaculty FROM staffs WHERE role != "admin"');

    // 4. College Overall Avg Score
    const [[{ collegeAvg }]] = await db.execute('SELECT ROUND(AVG(avg_score), 1) AS collegeAvg FROM marks_sessions WHERE avg_score IS NOT NULL');

    // 5. Department-wise Performance (Average Score per department)
    const [deptPerformance] = await db.execute(`
      SELECT 
        c.department, 
        COUNT(DISTINCT st.id) as totalStudents,
        ROUND(AVG(ms.avg_score), 1) as avgScore
      FROM classes c
      LEFT JOIN students st ON st.class_id = c.id
      LEFT JOIN marks_sessions ms ON ms.class_id = c.id
      WHERE c.department IS NOT NULL
      GROUP BY c.department
    `);

    // 6. Monthly college trend
    const [monthlyTrend] = await db.execute(`
      SELECT DATE_FORMAT(created_at, '%b') AS month,
             ROUND(AVG(avg_score), 1)      AS avgScore,
             COUNT(*)                      AS submissions
      FROM marks_sessions
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY YEAR(created_at), MONTH(created_at), DATE_FORMAT(created_at, '%b')
      ORDER BY YEAR(created_at), MONTH(created_at)
    `);

    res.json({
      success: true,
      overview: {
        totalStudents,
        totalDepartments,
        totalFaculty,
        collegeAvg: collegeAvg || 0
      },
      departmentStats: deptPerformance,
      performanceTrend: monthlyTrend
    });
  } catch (err) {
    console.error('GET /stats/college error:', err);
    res.status(500).json({ error: 'Failed to fetch college stats.' });
  }
});

// GET /api/stats/continuous-assessment?sessionLabel=internal1
// Official Continuous Assessment Analysis Format for Principal / VP
router.get('/continuous-assessment', async (req, res) => {
  try {
    const { sessionLabel = 'internal1' } = req.query;

    const depts = [
      { label: 'B.E., (Civil)', name: 'Civil Engineering' },
      { label: 'B.E., (CSE)', name: 'Computer Science and Engineering' },
      { label: 'B.E., (EEE)', name: 'Electrical and Electronics Engineering' },
      { label: 'B.E., (ECE)', name: 'Electronics and Communication Engineering' },
      { label: 'B.E., (Mech)', name: 'Mechanical Engineering' },
      { label: 'B.Tech., (IT)', name: 'Information Technology' },
      { label: 'B.Tech., (AI&DS)', name: 'Artificial Intelligence and Data Science' },
    ];

    const years = ['II', 'III', 'IV'];
    const results = [];

    let totalUgStrength = 0;
    let totalUgPassed = 0;

    for (const d of depts) {
      let deptStrength = 0;
      let deptPassed = 0;
      const yearRows = [];

      for (const y of years) {
        const [classes] = await db.execute(
          'SELECT id, name FROM classes WHERE department = ? AND year_label = ?',
          [d.name, y]
        );

        let yearStrength = 0;
        let yearPassed = 0;

        if (classes.length > 0) {
          const classIds = classes.map(c => c.id);
          const placeholders = classIds.map(() => '?').join(',');
          
          const [students] = await db.execute(
            `SELECT id, name FROM students WHERE class_id IN (${placeholders})`,
            classIds
          );
          yearStrength = students.length;

          // Sessions for these classes
          const [sessions] = await db.execute(
            `SELECT id, class_id, subject_id FROM marks_sessions WHERE class_id IN (${placeholders}) AND session_label = ?`,
            [...classIds, sessionLabel]
          );

          if (sessions.length > 0 && students.length > 0) {
            const sessionIds = sessions.map(s => s.id);
            const sessPlaceholders = sessionIds.map(() => '?').join(',');
            const [attRows] = await db.execute(
              `SELECT student_id, session_id, internal_exam_mark FROM session_attendance WHERE session_id IN (${sessPlaceholders})`,
              sessionIds
            );

            // Group attendance by student
            const studentAttMap = {};
            attRows.forEach(a => {
              if (!studentAttMap[a.student_id]) studentAttMap[a.student_id] = [];
              studentAttMap[a.student_id].push(a);
            });

            // A student is passed if they passed all conducted sessions with >= 50
            students.forEach(st => {
              const records = studentAttMap[st.id] || [];
              if (records.length === sessions.length && records.length > 0) {
                const allPass = records.every(r => {
                  const score = parseFloat(r.internal_exam_mark);
                  return !isNaN(score) && score >= 50;
                });
                if (allPass) yearPassed++;
              }
            });
          }
        }

        deptStrength += yearStrength;
        deptPassed += yearPassed;

        const passPct = yearStrength > 0 ? ((yearPassed / yearStrength) * 100).toFixed(2) : '0.00';
        yearRows.push({
          year: y,
          strength: yearStrength,
          passed: yearPassed,
          percentage: passPct
        });
      }

      totalUgStrength += deptStrength;
      totalUgPassed += deptPassed;

      const deptOverallPct = deptStrength > 0 ? ((deptPassed / deptStrength) * 100).toFixed(2) : '0.00';
      results.push({
        department: d.label,
        departmentFullName: d.name,
        years: yearRows,
        deptStrength,
        deptPassed,
        deptOverallPct
      });
    }

    const overallWithoutFirstYearPct = totalUgStrength > 0 ? ((totalUgPassed / totalUgStrength) * 100).toFixed(2) : '0.00';

    res.json({
      success: true,
      sessionLabel,
      departments: results,
      summary: {
        withoutFirstYear: {
          strength: totalUgStrength,
          passed: totalUgPassed,
          percentage: overallWithoutFirstYearPct
        },
        collegeOverall: {
          strength: totalUgStrength,
          passed: totalUgPassed,
          percentage: overallWithoutFirstYearPct
        }
      }
    });
  } catch (err) {
    console.error('GET /stats/continuous-assessment error:', err);
    res.status(500).json({ error: 'Failed to fetch continuous assessment stats: ' + err.message });
  }
});

// GET /api/stats/hod-marks?department=XYZ&sessionLabel=internal1
router.get('/hod-marks', async (req, res) => {
  try {
    const { department, sessionLabel = 'internal1' } = req.query;
    if (!department) return res.status(400).json({ error: 'Department is required.' });

    const isSH = department === 'Science and Humanities';
    const years = isSH ? ['I'] : ['I', 'II', 'III', 'IV'];
    const results = [];
    let deptStrength = 0;
    let deptPassed = 0;

    for (const year of years) {
      let classFilter = 'c.year_label = ?';
      let classParams = [year];
      if (isSH) {
        classFilter += ' AND c.department = "Science and Humanities"';
      } else {
        if (year === 'I') {
          classFilter += ' AND (c.department LIKE ? OR c.name LIKE ?)';
          classParams.push(`%${department}%`, `%${department}%`);
        } else {
          classFilter += ' AND c.department = ?';
          classParams.push(department);
        }
      }

      // Count students in these classes
      const [stuCountRows] = await db.query(
        `SELECT COUNT(DISTINCT st.id) as totalStudents, MAX(c.semester) as semester
         FROM students st
         JOIN classes c ON c.id = st.class_id
         WHERE ${classFilter}`,
        classParams
      );
      const yearStrength = stuCountRows[0]?.totalStudents || 0;
      const yearSem = stuCountRows[0]?.semester || (year === 'I' ? 1 : year === 'II' ? 3 : year === 'III' ? 5 : 7);

      // Count passed students for this year and session
      // Relative pass criteria: student marks >= 50% of max_marks (or >= 20 for 40-mark exams)
      const [passRows] = await db.query(
        `SELECT COUNT(DISTINCT m.student_id) as passedCount
         FROM marks m
         JOIN marks_sessions ms ON ms.id = m.session_id
         JOIN classes c ON c.id = ms.class_id
         JOIN students st ON st.id = m.student_id
         WHERE ${classFilter} AND ms.session_label = ?
           AND m.marks_obtained >= (CASE WHEN ms.max_marks > 0 THEN ms.max_marks * 0.5 ELSE 20 END)`,
        [...classParams, sessionLabel]
      );
      let yearPassed = passRows[0]?.passedCount || 0;
      if (yearPassed > yearStrength) yearPassed = yearStrength;

      deptStrength += yearStrength;
      deptPassed += yearPassed;
      const passPct = yearStrength > 0 ? ((yearPassed / yearStrength) * 100).toFixed(2) : '0.00';

      results.push({
        year,
        semester: yearSem,
        strength: yearStrength,
        passed: yearPassed,
        passPct
      });
    }

    const overallPct = deptStrength > 0 ? ((deptPassed / deptStrength) * 100).toFixed(2) : '0.00';

    res.json({
      success: true,
      department,
      years: results,
      overall: {
        strength: deptStrength,
        passed: deptPassed,
        passPct: overallPct
      }
    });

  } catch (err) {
    console.error('GET /stats/hod-marks error:', err);
    res.status(500).json({ error: 'Failed to fetch HOD marks: ' + err.message });
  }
});

export default router;
