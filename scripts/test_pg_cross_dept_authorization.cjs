/**
 * test_pg_cross_dept_authorization.cjs
 * Targeted test suite for PG Cross-Department Student Loading (Subject-Specific Authorization)
 * 
 * Verifies:
 * 1. Subject belongs to requested class.
 * 2. Faculty assignment matches authenticated user.
 * 3. Cross-department assigned HOD is permitted.
 * 4. Cross-department unassigned HOD is rejected.
 * 5. Mismatched class and subject IDs are rejected.
 * 6. Non-existent subject ID is rejected.
 * 7. Missing subject ID follows existing authorization behavior.
 * 8. Home department HOD access without subject ID continues.
 * 9. Admin access continues unhindered.
 */

const http = require('http');
const path = require('path');
require('../server/node_modules/dotenv').config({ path: path.resolve(__dirname, '../server/.env.local') });
const express = require('../server/node_modules/express');
const db = require('../server/db.js').default || require('../server/db.js');
const { generateAuthToken, computePasswordFingerprint } = require('../server/routes/auth.js');
const studentRoutes = require('../server/routes/students.js').default || require('../server/routes/students.js');

let testCount = 0;
let passCount = 0;

function assert(condition, testName) {
  testCount++;
  if (condition) {
    passCount++;
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    console.error(`  ✗ [FAIL] ${testName}`);
    throw new Error(`Assertion failed: ${testName}`);
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('MARKHUB: PG CROSS-DEPARTMENT STUDENT AUTHORIZATION TESTS');
  console.log('Class: ME I CSE (CL_1795140566) | Subject: ADCD (SUB_1795140621)');
  console.log('================================================================\n');

  // Verify DB baseline
  const [subRows] = await db.execute('SELECT id, class_id, faculty_id FROM subjects WHERE id = ?', ['SUB_1795140621']);
  assert(subRows.length > 0, 'Subject SUB_1795140621 exists in database');
  const subject = subRows[0];
  assert(subject.class_id === 'CL_1795140566', 'Subject SUB_1795140621 belongs to class CL_1795140566');
  assert(subject.faculty_id === 'FAC001', 'Subject SUB_1795140621 is assigned to faculty FAC001');

  const [staffRows] = await db.execute('SELECT id, name, role, department FROM staffs WHERE id = ?', ['FAC001']);
  assert(staffRows.length > 0 && staffRows[0].role === 'hod' && staffRows[0].department === 'Information Technology', 'FAC001 is HOD of Information Technology');

  // Create isolated test app with students route
  const app = express();
  app.use(express.json());
  app.use('/api/students', studentRoutes);

  let server;
  let port;
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      port = server.address().port;
      resolve();
    });
  });

  function makeRequest(path, token) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: '127.0.0.1',
        port: port,
        path: path,
        method: 'GET',
        headers: {}
      };
      if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
      }
      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          let data;
          try {
            data = JSON.parse(body);
          } catch {
            data = body;
          }
          resolve({ status: res.statusCode, body: data });
        });
      });
      req.on('error', reject);
      req.end();
    });
  }

  try {
    const defaultPwf = computePasswordFingerprint('validpass123');
    const tokenAssignedHod = generateAuthToken({ id: 'FAC001', role: 'hod', pwf: defaultPwf });
    const tokenAdmin = generateAuthToken({ id: 'ADM001', role: 'admin', pwf: defaultPwf });

    console.log('[TEST SUITE 1] Cross-Department Assigned HOD (FAC001 for SUB_1795140621 in CL_1795140566)');
    const res1 = await makeRequest('/api/students?classId=CL_1795140566&subjectId=SUB_1795140621', tokenAssignedHod);
    assert(res1.status === 200, 'Cross-department assigned HOD receives HTTP 200 OK');
    assert(Array.isArray(res1.body) && res1.body.length === 1, 'Returns student roster array (1 student)');
    assert(res1.body[0].id === 'STU_1795141478' && res1.body[0].name === 'prathap', 'Returns correct enrolled student STU_1795141478 (prathap)');

    console.log('\n[TEST SUITE 2] Cross-Department Unassigned HOD (Access Denied)');
    // FAC071 is Civil HOD requesting CSE PG class without being assigned to the subject
    const tokenCivilHod = generateAuthToken({ id: 'FAC071', role: 'hod', pwf: defaultPwf });
    const res2 = await makeRequest('/api/students?classId=CL_1795140566&subjectId=SUB_1795140621', tokenCivilHod);
    assert(res2.status === 403, 'Cross-department unassigned HOD receives HTTP 403 Forbidden');
    assert(res2.body?.error && res2.body.error.includes('Access denied'), 'Returns proper access denial error message');

    console.log('\n[TEST SUITE 3] Mismatched Class and Subject IDs (Tamper/Stale Request Protection)');
    // Subject SUB_1795140621 belongs to CL_1795140566, not CL_CSE_III
    const res3 = await makeRequest('/api/students?classId=CL_CSE_III&subjectId=SUB_1795140621', tokenAssignedHod);
    assert(res3.status === 403, 'Mismatched classId and subjectId rejected with HTTP 403');

    console.log('\n[TEST SUITE 4] Non-Existent Subject ID (Validation against Database)');
    const res4 = await makeRequest('/api/students?classId=CL_1795140566&subjectId=SUB_INVALID_FORGED', tokenAssignedHod);
    assert(res4.status === 403, 'Non-existent subject ID rejected with HTTP 403');

    console.log('\n[TEST SUITE 5] Missing Subject ID for Cross-Department Class (Existing Strict Behavior)');
    const res5 = await makeRequest('/api/students?classId=CL_1795140566', tokenAssignedHod);
    assert(res5.status === 403, 'Missing subjectId falls back to existing HOD department check and denies cross-dept access');

    console.log('\n[TEST SUITE 6] Home Department HOD Access Without Subject ID (Backward Compatibility)');
    // FAC001 is HOD of IT, CL001 is IT class
    const res6 = await makeRequest('/api/students?classId=CL001', tokenAssignedHod);
    assert(res6.status === 200, 'Home department class access without subjectId succeeds with HTTP 200');
    assert(Array.isArray(res6.body) && res6.body.length > 0, 'Returns students of home department class');

    console.log('\n[TEST SUITE 7] Admin Role Access (Unrestricted)');
    const res7 = await makeRequest('/api/students?classId=CL_1795140566', tokenAdmin);
    assert(res7.status === 200, 'Admin can access any class students with HTTP 200');
    assert(Array.isArray(res7.body) && res7.body.length === 1, 'Admin receives the 1 enrolled student');

    console.log('\n================================================================');
    console.log(`ALL TESTS PASSED: ${passCount} / ${testCount} assertions verified.`);
    console.log('Zero Database Modifications. Clean Termination.');
    console.log('================================================================');

  } finally {
    if (server) {
      server.close();
    }
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test suite failed:', err);
    process.exit(1);
  });
