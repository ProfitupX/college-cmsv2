import db from './db.js';
async function test() {
  const [rows] = await db.query('SHOW CREATE TABLE students');
  console.log(rows[0]['Create Table']);
  db.end();
}
test();
