import express from 'express';
import db from '../db.js';

const router = express.Router();

// GET /api/stats?classId=CL001
router.get('/', async (req, res) => {
  try {
    const { classId } = req.query;

    const [[{ totalStudents }]] = await db.execute(
      'SELECT COUNT(*) AS totalStudents FROM students' + (classId ? ' WHERE class_id = ?' : ''),
      classId ? [classId] : []
    );

    const [[{ totalSubjects }]] = await db.execute('SELECT COUNT(*) AS totalSubjects FROM subjects');
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

export default router;
