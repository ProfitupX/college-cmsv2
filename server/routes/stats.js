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
      // 1. Total Department Students (across all years for HOD's department)
      const deptFilter = department ? `%${department}%` : '%';
      const [[{ deptStudents }]] = await db.execute(
        `SELECT COUNT(st.id) AS deptStudents 
         FROM students st 
         JOIN classes c ON c.id = st.class_id 
         WHERE c.department LIKE ? OR ? IS NULL OR ? = ''`,
        [deptFilter, department || null, department || null]
      );
      totalStudents = deptStudents;

      // 2. Total Department Subjects
      const [[{ deptSubCount }]] = await db.execute(
        `SELECT COUNT(s.id) AS deptSubCount 
         FROM subjects s 
         JOIN classes c ON c.id = s.class_id 
         WHERE c.department LIKE ? OR ? IS NULL OR ? = ''`,
        [deptFilter, department || null, department || null]
      );
      totalSubjects = deptSubCount;

      // 3. If HOD is also teaching subjects, count HOD's own subjects
      if (staffId) {
        const [[{ hodSubCount }]] = await db.execute(
          'SELECT COUNT(*) AS hodSubCount FROM subjects WHERE faculty_id = ?',
          [staffId]
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
      msWhere = 'c.department LIKE ?';
      msParams = [`%${department}%`];
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

    // Year-wise Performance (II, III, IV)
    let yearParams = [];
    let yearWhere = '1=1';
    if (role === 'hod' && department) {
      yearWhere = 'c.department LIKE ?';
      yearParams.push(`%${department}%`);
    } else if (staffId && role !== 'admin') {
      yearWhere = 'ms.staff_id = ?';
      yearParams.push(staffId);
    }
    const [yearPerf] = await db.execute(`
      SELECT c.year_label AS name, ROUND(AVG(ms.avg_score), 1) AS value
      FROM marks_sessions ms
      JOIN classes c ON c.id = ms.class_id
      WHERE ${yearWhere} AND c.year_label IN ('II', 'III', 'IV')
      GROUP BY c.year_label
      ORDER BY FIELD(c.year_label, 'II', 'III', 'IV')
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

    const years = ['II', 'III', 'IV'];
    const results = [];
    let deptStrength = 0;
    let deptPassed = 0;

    for (const year of years) {
      let yearStrength = 0;
      let yearPassed = 0;
      
      const [students] = await db.execute(`
        SELECT st.id, st.name, c.name as class_name, c.semester
        FROM students st
        JOIN classes c ON c.id = st.class_id
        WHERE c.department = ? AND c.year_label = ?
      `, [department, year]);

      yearStrength = students.length;
      deptStrength += yearStrength;
      
      let yearSem = 0;

      for (const st of students) {
        yearSem = st.semester;
        const [marks] = await db.execute(`
          SELECT m.marks_obtained
          FROM marks m
          JOIN marks_sessions ms ON ms.id = m.session_id
          WHERE m.student_id = ? AND ms.session_label = ?
          LIMIT 1
        `, [st.id, sessionLabel]);
        
        if (marks.length > 0) {
          // Group by session to calculate total marks per subject for this session
          const [sessions] = await db.execute(
            'SELECT id FROM marks_sessions WHERE class_id IN (SELECT id FROM classes WHERE department = ? AND year_label = ?) AND session_label = ?',
            [department, year, sessionLabel]
          );
          
          let allPass = true;
          for (const s of sessions) {
             const [subMarks] = await db.execute(
               'SELECT SUM(m.marks_obtained) as total FROM marks m WHERE m.student_id = ? AND m.session_id = ?',
               [st.id, s.id]
             );
             if (!subMarks[0].total || subMarks[0].total < 50) {
                allPass = false;
                break;
             }
          }
          if (allPass) yearPassed++;
        }
      }
      
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
    res.status(500).json({ error: 'Failed to fetch HOD marks.' });
  }
});

export default router;
