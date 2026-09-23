import db from './db.js';
async function test() {
  const [st] = await db.query("SELECT * FROM staffs WHERE role='hod' AND department='Electronics and Communication Engineering'");
  console.log(st);
  process.exit(0);
}
test();
