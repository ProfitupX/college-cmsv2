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

    // 1.0 Ensure system_settings has LONGTEXT for setting_value
    try {
      await db.query("ALTER TABLE system_settings MODIFY COLUMN setting_value LONGTEXT NOT NULL");
      console.log('✅ system_settings.setting_value modified to LONGTEXT.');
    } catch (e) {
      console.log('system_settings modify note:', e.message);
    }

    // 1.0b Ensure marks_audit_logs and marks_history tables exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS marks_audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id INT NOT NULL,
        student_id VARCHAR(50) NOT NULL,
        component_id INT DEFAULT NULL,
        field_name VARCHAR(50) NOT NULL COMMENT 'marks_obtained | hours_attended | attendance_mark | internal_exam_mark | lab_mark',
        old_value VARCHAR(100) DEFAULT NULL,
        new_value VARCHAR(100) DEFAULT NULL,
        user_id VARCHAR(50) NOT NULL,
        user_name VARCHAR(100) DEFAULT NULL,
        action_type VARCHAR(50) NOT NULL COMMENT 'draft | frozen | manual_edit | clear | reset',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_session_student (session_id, student_id),
        KEY idx_user_created (user_id, created_at),
        KEY idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Ensured marks_audit_logs table exists.');

    await db.query(`
      CREATE TABLE IF NOT EXISTS marks_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id INT NOT NULL,
        subject_id VARCHAR(50) NOT NULL,
        class_id VARCHAR(50) NOT NULL,
        session_label VARCHAR(50) NOT NULL,
        staff_id VARCHAR(50) NOT NULL,
        action_type VARCHAR(50) NOT NULL,
        snapshot LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_session_id (session_id),
        KEY idx_staff_id (staff_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Ensured marks_history table exists.');

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

    // 1.3 Ensure all subjects have valid hours splits and cascade to marks_sessions
    try {
      // First, sync any saved admin subject allocations from system_settings
      let allocs = {};
      try {
        const [settingRows] = await db.query("SELECT setting_value FROM system_settings WHERE setting_key = 'subject_allocations'");
        if (settingRows.length > 0 && settingRows[0].setting_value) {
          allocs = typeof settingRows[0].setting_value === 'string' ? JSON.parse(settingRows[0].setting_value) : settingRows[0].setting_value;
          if (allocs && typeof allocs === 'object') {
            for (const [key, a] of Object.entries(allocs)) {
              if (!a) continue;
              const a1 = (a.int1_hours !== undefined && a.int1_hours !== null && a.int1_hours !== '') ? parseInt(a.int1_hours, 10) : a.int1;
              const a2 = (a.int2_hours !== undefined && a.int2_hours !== null && a.int2_hours !== '') ? parseInt(a.int2_hours, 10) : a.int2;
              const alb = (a.lab_hours !== undefined && a.lab_hours !== null && a.lab_hours !== '') ? parseInt(a.lab_hours, 10) : 0;
              const atot = (a.total_hours !== undefined && a.total_hours !== null && a.total_hours !== '') ? parseInt(a.total_hours, 10) : null;
              if (a1 !== undefined && a1 !== null && a2 !== undefined && a2 !== null) {
                await db.execute(
                  "UPDATE subjects SET int1_hours = ?, int2_hours = ?, lab_hours = COALESCE(?, lab_hours), total_hours = COALESCE(?, total_hours) WHERE id = ? OR (code = ? AND class_id = ?)",
                  [a1, a2, alb, atot, key, a.code || key, a.class_id || '']
                );
              }
            }
          }
        }
      } catch (allocSyncErr) {
        console.warn('Note: db_migrate system_settings sync notice:', allocSyncErr.message);
      }

      const [subs] = await db.query(
        "SELECT id, code, name, type, ltpc, total_hours, int1_hours, int2_hours, lab_hours FROM subjects WHERE int1_hours IS NULL OR int2_hours IS NULL OR total_hours IS NULL OR total_hours <= 10"
      );
      if (subs.length > 0) {
        console.log(`Syncing LTPC hours splits for ${subs.length} subjects...`);
        for (const s of subs) {
          const cleanLtpc = String(s.ltpc || '').trim().replace(/[\s\-]+/g, '');
          let h = parseInt(s.total_hours || 0, 10);
          if (h > 0 && h <= 10) h = h * 15;
          if (!h && cleanLtpc.length >= 3) {
            const parts = cleanLtpc.split('');
            const l = parseFloat(parts[0]) || 0;
            const t = parseFloat(parts[1]) || 0;
            const p = parseFloat(parts[2]) || 0;
            h = (l + t + p) * 15;
          }
          if (!h || h <= 0) h = 60;

          let int1 = 30;
          let int2 = 30;
          let lab = 0;

          if (['Lab-cum-Theory', 'Theory-cum-Lab', 'Lab cum Theory', 'Theory cum Lab'].includes(s.type)) {
            if (cleanLtpc === '2023') { int1 = 15; int2 = 15; lab = 30; h = 60; }
            else if (cleanLtpc === '2043') { int1 = 15; int2 = 15; lab = 60; h = 90; }
            else if (cleanLtpc === '1022') { int1 = 15; int2 = 15; lab = 15; h = 45; }
            else if (cleanLtpc === '3024') { int1 = 30; int2 = 30; lab = 15; h = 75; }
            else if (cleanLtpc === '3045') { int1 = 30; int2 = 30; lab = 45; h = 105; }
            else if (cleanLtpc === '1021') { int1 = 15; int2 = 15; lab = 15; h = 45; }
            else { int1 = 30; int2 = 30; lab = Math.max(0, h - 60) || 30; }
          } else if (s.type === 'Theory') {
            if (cleanLtpc === '3104' || cleanLtpc === '3004') { int1 = 30; int2 = 30; lab = 0; h = 60; }
            else if (cleanLtpc === '1001') { int1 = 7; int2 = 8; lab = 0; h = 15; }
            else if (cleanLtpc === '3003' || cleanLtpc === '2103') { int1 = 25; int2 = 20; lab = 0; h = 45; }
            else if (cleanLtpc === '2002') { int1 = 15; int2 = 15; lab = 0; h = 30; }
            else if (h === 45) { int1 = 25; int2 = 20; lab = 0; }
            else if (h === 30) { int1 = 15; int2 = 15; lab = 0; }
            else if (h === 15) { int1 = 7; int2 = 8; lab = 0; }
            else { int1 = Math.ceil(h / 2); int2 = Math.floor(h / 2); lab = 0; }
          } else if (s.type === 'Practical' || s.type === 'Laboratory' || s.type === 'Lab') {
            if (cleanLtpc === '0042' || cleanLtpc === '0041') { int1 = 30; int2 = 30; lab = 0; h = 60; }
            else if (cleanLtpc === '1021') { int1 = 25; int2 = 20; lab = 0; h = 45; }
            else if (cleanLtpc === '0021') { int1 = 15; int2 = 15; lab = 0; h = 30; }
            else if (h === 45) { int1 = 25; int2 = 20; lab = 0; }
            else if (h === 30) { int1 = 15; int2 = 15; lab = 0; }
            else { int1 = Math.ceil(h / 2); int2 = Math.floor(h / 2); lab = 0; }
          } else {
            int1 = Math.ceil(h / 2) || 30;
            int2 = Math.floor(h / 2) || 30;
            lab = 0;
          }

          await db.execute(
            "UPDATE subjects SET total_hours = ?, int1_hours = ?, int2_hours = ?, lab_hours = ? WHERE id = ?",
            [h, int1, int2, lab, s.id]
          );

          await db.execute(
            "UPDATE marks_sessions SET total_hours = ? WHERE subject_id = ? AND session_label = 'internal1' AND status = 'draft'",
            [int1, s.id]
          );
          const i2Cum = int1 + int2 + lab;
          await db.execute(
            "UPDATE marks_sessions SET total_hours = ?, internal2_total_hours = ? WHERE subject_id = ? AND session_label = 'internal2' AND status = 'draft'",
            [i2Cum, int2, s.id]
          );
        }
        console.log('✅ Finished syncing subject hours splits on production database.');
      }
    } catch (syncErr) {
      console.warn('⚠️ Subject hours sync notice:', syncErr.message);
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

