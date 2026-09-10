import db from './db.js';
async function run() {
  try {
    const [classes] = await db.execute("SELECT * FROM classes WHERE department='Information Technology'");
    console.log(classes.map(c => c.id + ' ' + c.year_label));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
