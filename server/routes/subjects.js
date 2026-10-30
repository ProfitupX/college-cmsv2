import express from 'express';
import db from '../db.js';

const router = express.Router();

// Ensure int1_hours, int2_hours, lab_hours columns exist in subjects table
const ensureSubjectColumns = async () => {
  try {
    await db.query('ALTER TABLE subjects ADD COLUMN int1_hours INT DEFAULT NULL AFTER total_hours');
  } catch (e) {}
  try {
    await db.query('ALTER TABLE subjects ADD COLUMN int2_hours INT DEFAULT NULL AFTER int1_hours');
  } catch (e) {}
  try {
    await db.query('ALTER TABLE subjects ADD COLUMN lab_hours INT DEFAULT NULL AFTER int2_hours');
  } catch (e) {}
};
ensureSubjectColumns().catch(console.error);

// GET /api/subjects?classId=CL001
// GET /api/subjects?facultyId=FAC001
router.get('/', async (req, res) => {
  try {
    const { classId, facultyId } = req.query;
    let sql = `
      SELECT s.id, s.code, s.name, s.acronym, s.type, s.department,
             s.semester, s.ltpc, s.total_hours, s.int1_hours, s.int2_hours, s.lab_hours,
             s.faculty_id, s.class_id,
             f.name AS faculty_name, f.designation AS faculty_designation,
             f.department AS faculty_department
      FROM subjects s
      LEFT JOIN staffs f ON f.id = s.faculty_id
    `;
    const params = [];
    const where = [];

    if (classId)   { where.push('s.class_id = ?');   params.push(classId); }
    if (facultyId) { where.push('s.faculty_id = ?'); params.push(facultyId); }
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY s.code ASC';

    const [rows] = await db.execute(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('GET /subjects error:', err);
    res.status(500).json({ error: 'Failed to fetch subjects.' });
  }
});

// POST /api/subjects
router.post('/', async (req, res) => {
  const conn = await db.getConnection();
  try {
    const data = Array.isArray(req.body) ? req.body : [req.body];
    if (data.length === 0) return res.status(400).json({ error: 'No data provided.' });

    await conn.beginTransaction();
    for (const item of data) {
      const { id, code, name, acronym, type, department, semester, ltpc, total_hours, int1_hours, int2_hours, lab_hours, faculty_id, class_id } = item;
      if (!id || !code || !name) throw new Error(`Missing required fields for subject ${id || 'unknown'}`);
      
      await conn.execute(
        `INSERT INTO subjects (id, code, name, acronym, type, department, semester, ltpc, total_hours, int1_hours, int2_hours, lab_hours, faculty_id, class_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
           code=VALUES(code), name=VALUES(name), acronym=VALUES(acronym), type=VALUES(type), 
           department=VALUES(department), semester=VALUES(semester), ltpc=VALUES(ltpc), 
           total_hours=VALUES(total_hours), int1_hours=VALUES(int1_hours), int2_hours=VALUES(int2_hours), lab_hours=VALUES(lab_hours),
           faculty_id=VALUES(faculty_id), class_id=VALUES(class_id)`,
        [
          id, code, name, acronym || null, type || 'Theory', department || null, semester || null,
          ltpc || null,
          total_hours !== undefined && total_hours !== '' ? parseInt(total_hours, 10) : null,
          int1_hours !== undefined && int1_hours !== '' ? parseInt(int1_hours, 10) : null,
          int2_hours !== undefined && int2_hours !== '' ? parseInt(int2_hours, 10) : null,
          lab_hours !== undefined && lab_hours !== '' ? parseInt(lab_hours, 10) : null,
          faculty_id || null, class_id || null
        ]
      );
    }
    await conn.commit();
    res.status(201).json({ success: true, count: data.length });
  } catch (err) {
    await conn.rollback();
    console.error('POST /subjects error:', err);
    res.status(400).json({ error: err.message || 'Failed to add subjects.' });
  } finally {
    conn.release();
  }
});

// PUT /api/subjects/:id
router.put('/:id', async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { code, name, acronym, type, department, semester, ltpc, total_hours, int1_hours, int2_hours, lab_hours, faculty_id, class_id } = req.body;
    const subjectId = req.params.id;

    await conn.beginTransaction();

    // 1. Get current subject data to see if faculty_id changed
    const [subRows] = await conn.execute('SELECT faculty_id FROM subjects WHERE id = ?', [subjectId]);
    const oldFacultyId = subRows[0]?.faculty_id;
    const newFacultyId = faculty_id || null;

    const pTotal = total_hours !== undefined && total_hours !== '' ? parseInt(total_hours, 10) : null;
    const pInt1 = int1_hours !== undefined && int1_hours !== '' ? parseInt(int1_hours, 10) : null;
    const pInt2 = int2_hours !== undefined && int2_hours !== '' ? parseInt(int2_hours, 10) : null;
    const pLab = lab_hours !== undefined && lab_hours !== '' ? parseInt(lab_hours, 10) : null;

    // 2. Update subjects table
    await conn.execute(
      `UPDATE subjects 
       SET code=?, name=?, acronym=?, type=?, department=?, semester=?, ltpc=?, 
           total_hours=?, int1_hours=?, int2_hours=?, lab_hours=?, faculty_id=?, class_id=? 
       WHERE id = ?`,
      [
        code, name, acronym || null, type || 'Theory', department || null, semester || null, ltpc || null,
        pTotal, pInt1, pInt2, pLab,
        newFacultyId, class_id || null, subjectId
      ]
    );

    // 3. TRANSFERRING INCLUDING THINGS:
    // If faculty changed, transfer marks sessions, draft records, and pending unlock requests
    if (newFacultyId && String(oldFacultyId) !== String(newFacultyId)) {
      await conn.execute(
        `UPDATE marks_sessions SET staff_id = ? WHERE subject_id = ?`,
        [String(newFacultyId), String(subjectId)]
      );

      await conn.execute(
        `UPDATE mark_unlock_requests SET staff_id = ? WHERE subject_id = ? AND status = 'pending'`,
        [String(newFacultyId), String(subjectId)]
      );
    }

    // 4. Update session hours across all marks sessions for this subject
    let finalInt1 = pInt1;
    let finalInt2 = pInt2;
    let finalLab = pLab;

    if (finalInt1 === null || finalInt2 === null) {
      const cleanLtpc = String(ltpc || '').trim().replace(/[\s\-]+/g, '');
      let h = pTotal || 60;
      if (h > 0 && h <= 10) h = h * 15;
      if (cleanLtpc === '3104' || cleanLtpc === '3004') { finalInt1 = 30; finalInt2 = 30; finalLab = 0; }
      else if (cleanLtpc === '1001') { finalInt1 = 7; finalInt2 = 8; finalLab = 0; }
      else if (cleanLtpc === '3003' || cleanLtpc === '2103') { finalInt1 = 25; finalInt2 = 20; finalLab = 0; }
      else if (cleanLtpc === '2002') { finalInt1 = 15; finalInt2 = 15; finalLab = 0; }
      else if (cleanLtpc === '3045') { finalInt1 = 30; finalInt2 = 30; finalLab = 45; }
      else if (cleanLtpc === '3024') { finalInt1 = 30; finalInt2 = 30; finalLab = 15; }
      else if (cleanLtpc === '2023') { finalInt1 = 15; finalInt2 = 15; finalLab = 30; }
      else if (cleanLtpc === '2043') { finalInt1 = 15; finalInt2 = 15; finalLab = 60; }
      else if (cleanLtpc === '1022') { finalInt1 = 15; finalInt2 = 15; finalLab = 15; }
      else if (cleanLtpc === '0042' || cleanLtpc === '0041') { finalInt1 = 30; finalInt2 = 30; finalLab = 0; }
      else {
        finalInt1 = finalInt1 ?? Math.ceil(h / 2) ?? 30;
        finalInt2 = finalInt2 ?? Math.floor(h / 2) ?? 30;
        finalLab = finalLab ?? 0;
      }
    }

    if (finalInt1 !== null) {
      await conn.execute(
        `UPDATE marks_sessions SET total_hours = ? WHERE subject_id = ? AND session_label = 'internal1'`,
        [finalInt1, String(subjectId)]
      );
    }
    if (finalInt2 !== null) {
      const i2Cum = (finalInt1 || 0) + finalInt2 + (finalLab || 0);
      await conn.execute(
        `UPDATE marks_sessions SET total_hours = ?, internal2_total_hours = ? WHERE subject_id = ? AND session_label = 'internal2'`,
        [i2Cum, finalInt2, String(subjectId)]
      );
    }
    if (finalLab !== null && finalLab > 0) {
      await conn.execute(
        `UPDATE marks_sessions SET total_hours = ? WHERE subject_id = ? AND session_label IN ('lab', 'practical')`,
        [finalLab, String(subjectId)]
      );
    }

    await conn.commit();
    res.json({ success: true, message: 'Subject updated and all relating sessions transferred successfully.' });
  } catch (err) {
    await conn.rollback();
    console.error('PUT /subjects error:', err);
    res.status(500).json({ error: 'Failed to update subject.' });
  } finally {
    conn.release();
  }
});

// DELETE /api/subjects/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM subjects WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /subjects error:', err);
    res.status(500).json({ error: 'Failed to delete subject. It may have existing marks sessions.' });
  }
});

export default router;
