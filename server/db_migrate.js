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

    // 1.1 Ensure staffs table has is_password_changed column
    const [staffCols] = await db.query("SHOW COLUMNS FROM staffs LIKE 'is_password_changed'");
    if (staffCols.length === 0) {
      console.log('Adding missing is_password_changed column to staffs table...');
      await db.query("ALTER TABLE staffs ADD COLUMN is_password_changed TINYINT(1) NOT NULL DEFAULT 0 AFTER department");
      console.log('✅ Added is_password_changed column.');
    }

    // 1.2 Ensure subjects table has int1_hours, int2_hours, lab_hours
    const [subCols] = await db.query("SHOW COLUMNS FROM subjects");
    const subColNames = subCols.map(c => c.Field);
    if (!subColNames.includes('int1_hours')) {
      await db.query("ALTER TABLE subjects ADD COLUMN int1_hours INT DEFAULT NULL AFTER total_hours");
      console.log('✅ Added int1_hours column to subjects.');
    }
    if (!subColNames.includes('int2_hours')) {
      await db.query("ALTER TABLE subjects ADD COLUMN int2_hours INT DEFAULT NULL AFTER int1_hours");
      console.log('✅ Added int2_hours column to subjects.');
    }
    if (!subColNames.includes('lab_hours')) {
      await db.query("ALTER TABLE subjects ADD COLUMN lab_hours INT DEFAULT NULL AFTER int2_hours");
      console.log('✅ Added lab_hours column to subjects.');
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

    // 4. Protect real staff & HOD marks (no automated purges)



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

