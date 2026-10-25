import db from './db.js';

/**
 * Clean & Purge all fake/demo marks for Mr. C. Prathap (HOD IT)
 * Subject: CS25C07 (SUB004 - Object Oriented Programming)
 * Class: CL001 (II Year IT, Sem III)
 */
async function cleanPrathapMarks() {
  console.log('=== PURGING FAKE/DEMO MARKS FOR MR. C. PRATHAP (CS25C07 - OOP) ===');
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Find all session IDs for CS25C07 or Prathap in CL001
    const [sessions] = await conn.execute(`
      SELECT ms.id, ms.session_label, ms.status, s.code, s.name as subject_name
      FROM marks_sessions ms
      JOIN subjects s ON ms.subject_id = s.id
      WHERE s.code = 'CS25C07' OR ms.subject_id = 'SUB004' OR (ms.class_id = 'CL001' AND ms.staff_id = 'FAC001')
    `);

    if (sessions.length === 0) {
      console.log('✅ No marks sessions found for CS25C07 / Prathap. The database is already clean!');
      await conn.commit();
      return;
    }

    console.log(`Found ${sessions.length} session(s) to purge:`, sessions.map(s => `ID: ${s.id} (${s.code} - ${s.session_label})`));
    const sessionIds = sessions.map(s => s.id);

    // 2. Delete unlock requests
    const [delReq] = await conn.query(
      `DELETE FROM mark_unlock_requests WHERE session_id IN (${sessionIds.map(() => '?').join(',')})`,
      sessionIds
    );
    console.log(`Deleted ${delReq.affectedRows || 0} unlock requests.`);

    // 3. Delete student marks
    const [delMarks] = await conn.query(
      `DELETE FROM marks WHERE session_id IN (${sessionIds.map(() => '?').join(',')})`,
      sessionIds
    );
    console.log(`Deleted ${delMarks.affectedRows || 0} marks entries.`);

    // 4. Delete session attendance and exam marks
    const [delAtt] = await conn.query(
      `DELETE FROM session_attendance WHERE session_id IN (${sessionIds.map(() => '?').join(',')})`,
      sessionIds
    );
    console.log(`Deleted ${delAtt.affectedRows || 0} attendance & exam mark records.`);

    // 5. Delete assessment components
    const [delComp] = await conn.query(
      `DELETE FROM assessment_components WHERE session_id IN (${sessionIds.map(() => '?').join(',')})`,
      sessionIds
    );
    console.log(`Deleted ${delComp.affectedRows || 0} assessment components.`);

    // 6. Delete marks sessions
    const [delSess] = await conn.query(
      `DELETE FROM marks_sessions WHERE id IN (${sessionIds.map(() => '?').join(',')})`,
      sessionIds
    );
    console.log(`Deleted ${delSess.affectedRows || 0} marks sessions.`);

    await conn.commit();
    console.log('\n🎉 SUCCESS: All fake marks for Mr. C. Prathap (CS25C07) have been completely removed!');
    console.log('Mr. C. Prathap can now enter fresh, authentic marks without any old numbers interfering.');
  } catch (err) {
    await conn.rollback();
    console.error('❌ Failed to clean Prathap marks:', err);
  } finally {
    conn.release();
    process.exit(0);
  }
}

cleanPrathapMarks();
