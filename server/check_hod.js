import db from './db.js';
async function test() {
  const [st] = await db.query("SELECT id, name, short_name, designation, role, email, employee_id, department FROM staffs WHERE role='hod' AND department='Science and Humanities'");
  console.log(st);
  process.exit(0);
}
test();
