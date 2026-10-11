import db from './db.js';
async function run() {
  try {
    const [summary] = await db.execute(`
      SELECT c.id, c.name, c.department, COUNT(s.id) AS student_count
      FROM classes c
      LEFT JOIN students s ON s.class_id = c.id
      WHERE c.department = 'Science and Humanities'
      GROUP BY c.id, c.name, c.department
      ORDER BY c.name
    `);
    console.table(summary);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
