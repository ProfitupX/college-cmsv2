import db from './db.js';

async function runMigration() {
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

    console.log('=== DATABASE MIGRATION COMPLETE ===');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

runMigration();
