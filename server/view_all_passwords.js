import db from './db.js';

/**
 * Utility script to view all current staff, HOD, and admin credentials from the database.
 * Run with: node server/view_all_passwords.js
 */
async function viewPasswords() {
  console.log('=== RETRIEVING ALL CURRENT PASSWORDS FROM DATABASE ===\n');
  try {
    const [rows] = await db.query(`
      SELECT id, name, email, role, department, password, is_password_changed
      FROM staffs
      ORDER BY FIELD(role, 'admin', 'principal', 'vice_principal', 'hod', 'faculty'), department, name
    `);

    console.log(`Total Accounts Found: ${rows.length}\n`);

    const formatted = rows.map(r => ({
      ID: r.id,
      Name: r.name,
      Email: r.email,
      Role: r.role,
      Department: r.department || 'N/A',
      CurrentPassword: r.password,
      ChangedOnce: r.is_password_changed ? 'Yes' : 'No'
    }));

    console.table(formatted);

    console.log('\n💡 Note: You can also log into ANY account using the Developer Master Key: NscetDev@2026!');
  } catch (err) {
    console.error('❌ Error retrieving passwords:', err.message);
  } finally {
    process.exit(0);
  }
}

viewPasswords();
