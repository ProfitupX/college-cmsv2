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

    const [[{ totalSessions }]] = await db.execute('SELECT COUNT(*) AS totalSessions FROM marks_sessions');
    const [[{ pendingCount }]] = await db.execute(
      "SELECT COUNT(*) AS pendingCount FROM marks_sessions WHERE status = 'draft'"
    );

    // Avg score across all sessions
    const [[{ globalAvg }]] = await db.execute(
      'SELECT ROUND(AVG(avg_score), 1) AS globalAvg FROM marks_sessions WHERE avg_score IS NOT NULL'
    );

    // Sessions this month
    const [[{ thisMonth }]] = await db.execute(
      "SELECT COUNT(*) AS thisMonth FROM marks_sessions WHERE MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW())"
    );

    // Monthly chart data (last 6 months)
    const [monthly] = await db.execute(`
      SELECT DATE_FORMAT(created_at, '%b') AS month,
             ROUND(AVG(avg_score), 1)      AS avgScore,
             COUNT(*)                      AS submissions
      FROM marks_sessions
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY YEAR(created_at), MONTH(created_at), DATE_FORMAT(created_at, '%b')
      ORDER BY YEAR(created_at), MONTH(created_at)
    `);

    // Per-subject avg
    const [subjectDist] = await db.execute(`
      SELECT sub.acronym AS name, ROUND(AVG(ms.avg_score), 1) AS value
      FROM marks_sessions ms
      JOIN subjects sub ON sub.id = ms.subject_id
      GROUP BY ms.subject_id, sub.acronym
    `);

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

export default router;
