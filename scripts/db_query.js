import db from '../server/db.js';

// Ad-hoc database query helper that ALWAYS safely exits within 5 seconds
// Prevents lingering background processes in Antigravity or terminal
const query = process.argv[2];
const params = process.argv.slice(3);

if (!query) {
  console.error('Usage: node scripts/db_query.js "<SQL_QUERY>" [param1] [param2]...');
  process.exit(1);
}

const timeoutTimer = setTimeout(() => {
  console.error('⚠️ Query timed out after 8 seconds. Forcing process exit.');
  process.exit(1);
}, 8000);

try {
  const [rows] = await db.query(query, params);
  console.log(JSON.stringify(rows, null, 2));
} catch (err) {
  console.error('❌ Query execution failed:', err.message);
} finally {
  clearTimeout(timeoutTimer);
  try {
    await db.end();
  } catch (_) {}
  process.exit(0);
}
