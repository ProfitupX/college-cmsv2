import db from './db.js';

async function runMigration(shouldExit = false) {
  console.log('=== STARTING DATABASE MIGRATION ===');
  try {
    // 1. Check notifications table for target_department column
    const [cols] = await db.query("SHOW COLUMNS FROM notifications LIKE 'target_department'");
    if (cols.length === 0) {
      console.log('Adding missing target_department column to notifications table...');
      await db.query(
        "ALTER TABLE notifications ADD COLUMN target_department VARCHAR(150) NULL DEFAULT NULL AFTER target_role"
      );
      console.log('✅ Added target_department column.');
    } else {
      console.log('✅ Column target_department already exists in notifications.');
    }

    // 2. Ensure First-Year classes have year_label = 'I' and department = 'Science and Humanities'
    const [shClasses] = await db.query(
      "SELECT id, name, department, year_label FROM classes WHERE id LIKE 'C_SH_%' OR name LIKE 'I Year%'"
    );
    console.log(`Found ${shClasses.length} First Year / S&H classes in database.`);
    for (const c of shClasses) {
      if (c.year_label !== 'I' || c.department !== 'Science and Humanities') {
        await db.execute(
          "UPDATE classes SET year_label = 'I', department = 'Science and Humanities' WHERE id = ?",
          [c.id]
        );
        console.log(`Updated class ${c.id} (${c.name}) to year_label='I', department='Science and Humanities'`);
      }
    }

    // 3. Automatically deduplicate staff records across all departments and years
    try {
      const { runStaffDeduplication } = await import('./deduplicate_staff.js');
      await runStaffDeduplication();
    } catch (dedupErr) {
      console.warn('⚠️ Staff deduplication during migration warning:', dedupErr.message);
    }

    // 4. Ensure marks sessions for All Academic Years (I, II, III, IV) are seeded
    try {
      const { seedAllYearsMarks } = await import('./seed_all_years_marks.js');
      await seedAllYearsMarks(false);
    } catch (seedMarksErr) {
      console.warn('⚠️ All years marks seeding during migration warning:', seedMarksErr.message);
    }

    // 5. Purge any fake/seeded marks for CS25C07 / SUB004 / FAC001 (Mr. C. Prathap - OOP)
    try {
      const [cs25Sessions] = await db.query(
        "SELECT id FROM marks_sessions WHERE subject_id = 'SUB004' OR (class_id = 'CL001' AND staff_id = 'FAC001') OR subject_id IN (SELECT id FROM subjects WHERE code = 'CS25C07')"
      );
      if (cs25Sessions.length > 0) {
        const sIds = cs25Sessions.map(s => s.id);
        console.log(`Purging ${sIds.length} fake marks session(s) for CS25C07 / Prathap:`, sIds);
        await db.query(`DELETE FROM mark_unlock_requests WHERE session_id IN (${sIds.map(() => '?').join(',')})`, sIds);
        await db.query(`DELETE FROM marks WHERE session_id IN (${sIds.map(() => '?').join(',')})`, sIds);
        await db.query(`DELETE FROM session_attendance WHERE session_id IN (${sIds.map(() => '?').join(',')})`, sIds);
        await db.query(`DELETE FROM assessment_components WHERE session_id IN (${sIds.map(() => '?').join(',')})`, sIds);
        await db.query(`DELETE FROM marks_sessions WHERE id IN (${sIds.map(() => '?').join(',')})`, sIds);
        console.log('✅ Successfully purged fake marks for CS25C07 / Prathap.');
      } else {
        console.log('✅ No fake marks sessions found for CS25C07 / Prathap.');
      }
    } catch (purgeErr) {
      console.warn('⚠️ CS25C07 purge warning:', purgeErr.message);
    }

    console.log('=== DATABASE MIGRATION COMPLETE ===');
    if (shouldExit) process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    if (shouldExit) process.exit(1);
    throw err;
  }
}

export { runMigration };

const isDirectRun = process.argv[1] && (process.argv[1].endsWith('db_migrate.js') || process.argv[1].endsWith('db_migrate'));
if (isDirectRun) {
  runMigration(true).catch(err => {
    console.error('Migration error:', err);
    process.exit(1);
  });
}

