/**
 * test_students_security_regression.cjs
 * Comprehensive Isolated Test Harness for Student API Security Corrections
 *
 * SAFETY & ISOLATION:
 * - 100% in-memory mock fixtures; zero connection to MySQL / production DB.
 * - Real Express router, real HMAC token verification.
 * - Terminates promptly with process.exit(0).
 */

const http = require('http');

process.env.AUTH_SECRET = process.env.AUTH_SECRET || 'markhub_isolated_test_auth_secret_key_32_chars_min!';

// Prevent DB connection or dotenv loading
const dotenv = require('../server/node_modules/dotenv');
const origDotenvConfig = dotenv.config;
dotenv.config = () => ({ parsed: {} });

const mysql = require('../server/node_modules/mysql2/promise');
const origCreatePool = mysql.createPool;
mysql.createPool = () => {
  throw new Error('Database connection disabled for isolated testing');
};

const origConsoleError = console.error;
console.error = () => {};

const express = require('../server/node_modules/express');
const db = require('../server/db.js').default || require('../server/db.js');
const studentRoutes = require('../server/routes/students.js').default || require('../server/routes/students.js');
const { generateAuthToken, computePasswordFingerprint } = require('../server/routes/auth.js');

console.error = origConsoleError;
dotenv.config = origDotenvConfig;
mysql.createPool = origCreatePool;

// Controlled in-memory fixtures
const fixtures = {
  classes: [
    {
      id: 'CL001',
      name: 'B.Tech IT IV',
      department: 'Information Technology',
      class_coordinator: 'Mrs. M. Pavithra',
      asst_coordinator: 'FAC_IT_002'
    },
    {
      id: 'CL002',
      name: 'B.E CSE III',
      department: 'Computer Science and Engineering',
      class_coordinator: 'Mr. K. Velkumar',
      asst_coordinator: null
    },
    {
      id: 'CL_ME_CSE',
      name: 'ME I CSE',
      department: 'Computer Science and Engineering',
      class_coordinator: null,
      asst_coordinator: null
    },
    {
      id: 'CL_SH_01',
      name: 'I Year AI & DS',
      department: 'Science and Humanities',
      class_coordinator: 'Ms.D.I.Amirtha,TF/Eng',
      asst_coordinator: null
    },
    {
      id: 'CL_SH_02',
      name: 'I Year CSE A',
      department: 'Science and Humanities',
      class_coordinator: 'Mrs.N.Shanmuga Priya TF/Maths',
      asst_coordinator: null
    },
    {
      id: 'CL_UNASSIGNED_COORD',
      name: 'Civil II Year',
      department: 'Civil Engineering',
      class_coordinator: '',
      asst_coordinator: null
    },
    {
      id: 'CL_UNKNOWN_SUFFIX_COMMA',
      name: 'I Year Unknown Suffix Comma',
      department: 'Science and Humanities',
      class_coordinator: 'Ms.D.I.Amirtha, Unknown/Dept',
      asst_coordinator: null
    },
    {
      id: 'CL_UNKNOWN_SUFFIX_SPACE',
      name: 'I Year Unknown Suffix Space',
      department: 'Science and Humanities',
      class_coordinator: 'Mrs.N.Shanmuga Priya TF/Unknown',
      asst_coordinator: null
    },
    {
      id: 'CL_UNRELATED_NAME',
      name: 'I Year Unrelated Coordinator',
      department: 'Science and Humanities',
      class_coordinator: 'Dr. John Doe',
      asst_coordinator: null
    }
  ],
  staffs: [
    {
      id: 'ADMIN',
      name: 'Admin User',
      short_name: 'Admin',
      role: 'admin',
      department: 'College Administration',
      class_role: null
    },
    {
      id: 'PRIN',
      name: 'Dr. C. Mathalai Sundaram',
      short_name: 'PRIN',
      role: 'principal',
      department: 'College Administration',
      class_role: null
    },
    {
      id: 'VP',
      name: 'Dr. M. Sathya',
      short_name: 'VP',
      role: 'vice_principal',
      department: 'College Administration',
      class_role: null
    },
    {
      id: 'FAC_HOD_IT',
      name: 'Dr. IT HOD',
      short_name: 'IT HOD',
      role: 'hod',
      department: 'Information Technology',
      class_role: null
    },
    {
      id: 'FAC_HOD_CIVIL',
      name: 'Dr. Civil HOD',
      short_name: 'Civil HOD',
      role: 'hod',
      department: 'Civil Engineering',
      class_role: null
    },
    {
      id: 'FAC_101',
      name: 'Faculty Assigned',
      short_name: 'FA',
      role: 'faculty',
      department: 'Information Technology',
      class_role: null
    },
    {
      id: 'FAC_102',
      name: 'Faculty Unassigned',
      short_name: 'FU',
      role: 'faculty',
      department: 'Information Technology',
      class_role: null
    },
    {
      id: 'FAC_COORD_01',
      name: 'Mrs. M. Pavithra',
      short_name: 'M. Pavithra',
      role: 'faculty',
      department: 'Information Technology',
      class_role: 'Class Coordinator'
    },
    {
      id: 'GUEST_01',
      name: 'Guest User',
      short_name: 'Guest',
      role: 'guest',
      department: 'Guest',
      class_role: null
    },
    {
      id: 'S_AMIRTHA',
      name: 'Ms.D.I.Amirtha',
      short_name: 'DA',
      role: 'class_coordinator',
      department: 'Science and Humanities',
      class_role: 'Class Coordinator'
    },
    {
      id: 'S_SHANMUGA',
      name: 'Mrs.N.Shanmuga Priya',
      short_name: 'NSP',
      role: 'class_coordinator',
      department: 'Science and Humanities',
      class_role: 'Class Coordinator'
    },
    {
      id: 'FAC_IT_002',
      name: 'Mr. R. Udhaya Kumar',
      short_name: 'Udhaya',
      role: 'faculty',
      department: 'Information Technology',
      class_role: null
    },
    {
      id: 'FAC_SUBSTRING_COLLISION',
      name: 'Mr. S. Kumar',
      short_name: 'S. Kumar',
      role: 'faculty',
      department: 'Information Technology',
      class_role: null
    }
  ],
  subjects: [
    {
      id: 'SUB_001',
      code: 'IT201',
      name: 'Data Structures',
      department: 'Information Technology',
      class_id: 'CL001',
      faculty_id: 'FAC_101'
    },
    {
      id: 'SUB_002',
      code: 'IT202',
      name: 'Algorithms',
      department: 'Information Technology',
      class_id: 'CL001',
      faculty_id: 'FAC_OTHER_999'
    },
    {
      id: 'SUB_NULL_CLASS',
      code: 'NULL01',
      name: 'Unmapped Subject',
      department: 'Information Technology',
      class_id: null,
      faculty_id: 'FAC_101'
    },
    {
      id: 'SUB_CSE',
      code: 'CS201',
      name: 'Operating Systems',
      department: 'Computer Science and Engineering',
      class_id: 'CL002',
      faculty_id: 'FAC_CSE_101'
    }
  ],
  students: [
    { id: 'STU_001', s_no: 1, roll_no: '21IT001', name: 'Alice', class_id: 'CL001' },
    { id: 'STU_002', s_no: 2, roll_no: '21IT002', name: 'Bob', class_id: 'CL001' },
    { id: 'STU_003', s_no: 1, roll_no: '21CS001', name: 'Charlie', class_id: 'CL002' },
    { id: 'STU_SH_01', s_no: 1, roll_no: '24AD001', name: 'Dan', class_id: 'CL_SH_01' },
    { id: 'STU_SH_02', s_no: 1, roll_no: '24CS001', name: 'Eva', class_id: 'CL_SH_02' }
  ]
};

async function runTestSuite() {
  let passCount = 0;
  let testCount = 0;

  function assert(condition, message) {
    testCount++;
    if (!condition) {
      console.error(`  ✗ [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    } else {
      console.log(`  ✓ [PASS] ${message}`);
      passCount++;
    }
  }

  // Intercept db queries
  const originalDbExecute = db.execute;
  const originalDbQuery = db.query;
  const originalDbGetConnection = db.getConnection;

  const executedQueries = [];

  const mockExecute = async (sql, params = []) => {
    executedQueries.push({ sql, params });
    const s = sql.trim();

    // SELECT classes
    if (s.includes('FROM classes WHERE id = ?')) {
      const clsId = params[0];
      const found = fixtures.classes.filter(c => c.id === clsId);
      return [found];
    }

    // SELECT staffs
    if (s.includes('FROM staffs WHERE id = ?')) {
      const staffId = params[0];
      const found = fixtures.staffs.filter(st => st.id === staffId);
      return [found];
    }

    // SELECT subjects by id
    if (s.includes('FROM subjects WHERE id = ?')) {
      const subId = params[0];
      const found = fixtures.subjects.filter(sub => sub.id === subId);
      return [found];
    }

    // SELECT subjects by class_id and faculty_id
    if (s.includes('FROM subjects WHERE class_id = ? AND faculty_id = ?')) {
      const [clsId, facId] = params;
      const found = fixtures.subjects.filter(sub => sub.class_id === clsId && sub.faculty_id === facId);
      return [found];
    }

    // SELECT students
    if (s.includes('FROM students')) {
      if (s.includes('WHERE class_id = ?')) {
        const clsId = params[0];
        const found = fixtures.students.filter(st => st.class_id === clsId);
        return [found];
      }
      return [fixtures.students];
    }

    // Mutation mocks for PUT / DELETE
    if (s.startsWith('UPDATE students') || s.startsWith('DELETE FROM students')) {
      return [{ affectedRows: 1 }];
    }

    return [[]];
  };

  db.execute = mockExecute;
  db.query = mockExecute;
  db.getConnection = async () => ({
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
    execute: mockExecute
  });

  const app = express();
  app.use(express.json());
  app.use('/api/students', studentRoutes);

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  function makeRequest(path, method = 'GET', token = null, body = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json'
        }
      };
      if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
      }

      const req = http.request(options, (res) => {
        let raw = '';
        res.on('data', chunk => { raw += chunk; });
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = raw;
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      });
      req.on('error', reject);
      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }

  try {
    // Generate test tokens
    const pwf = computePasswordFingerprint('test_password');
    const tokenAdmin = generateAuthToken({ id: 'ADMIN', role: 'admin', pwf });
    const tokenPrin = generateAuthToken({ id: 'PRIN', role: 'principal', pwf });
    const tokenVP = generateAuthToken({ id: 'VP', role: 'vice_principal', pwf });
    const tokenHodIT = generateAuthToken({ id: 'FAC_HOD_IT', role: 'hod', pwf });
    const tokenHodCivil = generateAuthToken({ id: 'FAC_HOD_CIVIL', role: 'hod', pwf });
    const tokenFacAssigned = generateAuthToken({ id: 'FAC_101', role: 'faculty', pwf });
    const tokenFacUnassigned = generateAuthToken({ id: 'FAC_102', role: 'faculty', pwf });
    const tokenFacCoord = generateAuthToken({ id: 'FAC_COORD_01', role: 'faculty', pwf });
    const tokenClassCoordAmirtha = generateAuthToken({ id: 'S_AMIRTHA', role: 'class_coordinator', pwf });
    const tokenClassCoordShanmuga = generateAuthToken({ id: 'S_SHANMUGA', role: 'class_coordinator', pwf });
    const tokenFacAsstCoord = generateAuthToken({ id: 'FAC_IT_002', role: 'faculty', pwf });
    const tokenFacSubstring = generateAuthToken({ id: 'FAC_SUBSTRING_COLLISION', role: 'faculty', pwf });
    const tokenGuest = generateAuthToken({ id: 'GUEST_01', role: 'guest', pwf });
    const tokenExpired = generateAuthToken({ id: 'ADMIN', role: 'admin', pwf }, -1000); // already expired

    console.log('\n================================================================');
    console.log('MARKHUB STUDENT API SECURITY REGRESSION SUITE');
    console.log('================================================================');

    // ─── SUITE 1: Missing Token on All Endpoints ─────────────────
    console.log('\n[SUITE 1] Missing Token Enforcement (HTTP 401 Expected)');
    const s1Get = await makeRequest('/api/students', 'GET');
    assert(s1Get.status === 401, 'GET /api/students without token returns 401');

    const s1Post = await makeRequest('/api/students', 'POST', null, { id: 'STU_X', roll_no: 'X', name: 'X', class_id: 'CL001' });
    assert(s1Post.status === 401, 'POST /api/students without token returns 401');

    const s1Put = await makeRequest('/api/students/STU_001', 'PUT', null, { name: 'X' });
    assert(s1Put.status === 401, 'PUT /api/students/:id without token returns 401');

    const s1Delete = await makeRequest('/api/students/STU_001', 'DELETE');
    assert(s1Delete.status === 401, 'DELETE /api/students/:id without token returns 401');

    // ─── SUITE 2: Invalid / Expired Token ────────────────────────
    console.log('\n[SUITE 2] Invalid and Expired Token Enforcement (HTTP 401 Expected)');
    const s2Invalid = await makeRequest('/api/students', 'GET', 'invalid.jwt.token');
    assert(s2Invalid.status === 401, 'GET with forged/invalid token returns 401');

    const s2PostInvalid = await makeRequest('/api/students', 'POST', 'forged_token', { name: 'X' });
    assert(s2PostInvalid.status === 401, 'POST with forged token returns 401');

    const s2PutInvalid = await makeRequest('/api/students/STU_001', 'PUT', 'forged_token', { name: 'X' });
    assert(s2PutInvalid.status === 401, 'PUT with forged token returns 401');

    const s2DeleteInvalid = await makeRequest('/api/students/STU_001', 'DELETE', 'forged_token');
    assert(s2DeleteInvalid.status === 401, 'DELETE with forged token returns 401');

    const s2Expired = await makeRequest('/api/students', 'GET', tokenExpired);
    assert(s2Expired.status === 401, 'GET with expired token returns 401');

    // ─── SUITE 3: Admin Universal Access ────────────────────────
    console.log('\n[SUITE 3] Admin Universal Access (GET Global/Scoped, POST, PUT, DELETE)');
    const s3Global = await makeRequest('/api/students', 'GET', tokenAdmin);
    assert(s3Global.status === 200, 'Admin global GET returns 200');
    assert(Array.isArray(s3Global.body) && s3Global.body.length === fixtures.students.length, `Admin receives all ${fixtures.students.length} students`);

    const s3Scoped = await makeRequest('/api/students?classId=CL001', 'GET', tokenAdmin);
    assert(s3Scoped.status === 200, 'Admin scoped GET returns 200');
    assert(Array.isArray(s3Scoped.body) && s3Scoped.body.length === 2, 'Admin receives 2 students of CL001');

    const s3Post = await makeRequest('/api/students', 'POST', tokenAdmin, [
      { id: 'STU_NEW', s_no: 3, roll_no: '21IT003', name: 'New Student', class_id: 'CL001' }
    ]);
    assert(s3Post.status === 201, 'Admin POST /api/students returns 201 Created');

    const s3Put = await makeRequest('/api/students/STU_001', 'PUT', tokenAdmin, {
      s_no: 1, roll_no: '21IT001', name: 'Alice Updated', class_id: 'CL001'
    });
    assert(s3Put.status === 200, 'Admin PUT /api/students/:id returns 200 OK');

    const s3Delete = await makeRequest('/api/students/STU_001', 'DELETE', tokenAdmin);
    assert(s3Delete.status === 200, 'Admin DELETE /api/students/:id returns 200 OK');

    // ─── SUITE 4: Principal and Vice Principal Access ────────────
    console.log('\n[SUITE 4] Principal and Vice Principal Access & Mutation Denial');
    const s4PrinGlobal = await makeRequest('/api/students', 'GET', tokenPrin);
    assert(s4PrinGlobal.status === 200, 'Principal global GET returns 200 OK');

    const s4PrinScoped = await makeRequest('/api/students?classId=CL001', 'GET', tokenPrin);
    assert(s4PrinScoped.status === 200, 'Principal scoped GET returns 200 OK');

    const s4PrinPost = await makeRequest('/api/students', 'POST', tokenPrin, [{ id: 'X', roll_no: 'X', name: 'X', class_id: 'CL001' }]);
    assert(s4PrinPost.status === 403, 'Principal POST /api/students denied with 403 Forbidden');

    const s4PrinPut = await makeRequest('/api/students/STU_001', 'PUT', tokenPrin, { name: 'X' });
    assert(s4PrinPut.status === 403, 'Principal PUT /api/students/:id denied with 403 Forbidden');

    const s4PrinDelete = await makeRequest('/api/students/STU_001', 'DELETE', tokenPrin);
    assert(s4PrinDelete.status === 403, 'Principal DELETE /api/students/:id denied with 403 Forbidden');

    const s4VPGlobal = await makeRequest('/api/students', 'GET', tokenVP);
    assert(s4VPGlobal.status === 200, 'Vice Principal global GET returns 200 OK');

    const s4VPScoped = await makeRequest('/api/students?classId=CL001', 'GET', tokenVP);
    assert(s4VPScoped.status === 200, 'Vice Principal scoped GET returns 200 OK');

    const s4VPPost = await makeRequest('/api/students', 'POST', tokenVP, [{ id: 'X', roll_no: 'X', name: 'X', class_id: 'CL001' }]);
    assert(s4VPPost.status === 403, 'Vice Principal POST denied with 403 Forbidden');

    // ─── SUITE 5: HOD Scoped Access and Cross-Dept Denial ────────
    console.log('\n[SUITE 5] HOD Scoped Access and Cross-Department Denial');
    const s5HodGlobal = await makeRequest('/api/students', 'GET', tokenHodIT);
    assert(s5HodGlobal.status === 403, 'HOD global GET denied with 403 Forbidden');

    const s5HodOwnClass = await makeRequest('/api/students?classId=CL001', 'GET', tokenHodIT);
    assert(s5HodOwnClass.status === 200, 'IT HOD scoped GET for IT class CL001 returns 200 OK');
    assert(Array.isArray(s5HodOwnClass.body) && s5HodOwnClass.body.length === 2, 'IT HOD receives CL001 student roster');

    const s5HodUnrelated = await makeRequest('/api/students?classId=CL002', 'GET', tokenHodIT);
    assert(s5HodUnrelated.status === 403, 'IT HOD scoped GET for CSE class CL002 denied with 403 Forbidden');

    const s5CivilHodCL001 = await makeRequest('/api/students?classId=CL001', 'GET', tokenHodCivil);
    assert(s5CivilHodCL001.status === 403, 'Civil HOD scoped GET for IT class CL001 denied with 403 Forbidden');

    // ─── SUITE 6: Assigned Faculty Access ────────────────────────
    console.log('\n[SUITE 6] Assigned Faculty Access');
    const s6Assigned = await makeRequest('/api/students?classId=CL001&subjectId=SUB_001', 'GET', tokenFacAssigned);
    assert(s6Assigned.status === 200, 'Assigned faculty for SUB_001 in CL001 returns 200 OK');
    assert(Array.isArray(s6Assigned.body) && s6Assigned.body.length === 2, 'Assigned faculty receives class roster');

    // ─── SUITE 7: Unassigned Faculty Subject Denial ──────────────
    console.log('\n[SUITE 7] Unassigned Faculty Subject Denial');
    const s7Unassigned = await makeRequest('/api/students?classId=CL001&subjectId=SUB_002', 'GET', tokenFacAssigned);
    assert(s7Unassigned.status === 403, 'Faculty attempting unassigned subject SUB_002 denied with 403 Forbidden');

    // ─── SUITE 8: Class Coordinator Access & Designation Normalization ──
    console.log('\n[SUITE 8] Class Coordinator Access & Designation Normalization');
    // Coordinated class without subjectId
    const s8CoordNoSub = await makeRequest('/api/students?classId=CL001', 'GET', tokenFacCoord);
    assert(s8CoordNoSub.status === 200, 'Class coordinator requesting coordinated class without subjectId returns 200 OK');

    // Coordinated class with subjectId assigned to someone else
    const s8CoordWithOtherSub = await makeRequest('/api/students?classId=CL001&subjectId=SUB_002', 'GET', tokenFacCoord);
    assert(s8CoordWithOtherSub.status === 200, 'Class coordinator requesting subject taught by another faculty returns 200 OK');

    // FIX 1: User with role 'class_coordinator' accessing their assigned class
    const s8ClassCoordRole = await makeRequest('/api/students?classId=CL_SH_01', 'GET', tokenClassCoordAmirtha);
    assert(s8ClassCoordRole.status === 200, 'User with class_coordinator role accessing assigned class returns 200 OK');
    assert(Array.isArray(s8ClassCoordRole.body) && s8ClassCoordRole.body.length === 1 && s8ClassCoordRole.body[0].id === 'STU_SH_01', 'Class coordinator receives assigned class student roster');

    // FIX 1 (Negative): User with role 'class_coordinator' attempting to access unrelated class
    const s8ClassCoordUnrelated = await makeRequest('/api/students?classId=CL002', 'GET', tokenClassCoordAmirtha);
    assert(s8ClassCoordUnrelated.status === 403, 'User with class_coordinator role attempting to access unrelated class denied with 403 Forbidden');

    // FIX 2: First-year coordinator matching with comma-separated designation ('Ms.D.I.Amirtha,TF/Eng')
    const s8FirstYrComma = await makeRequest('/api/students?classId=CL_SH_01', 'GET', tokenClassCoordAmirtha);
    assert(s8FirstYrComma.status === 200, 'First-year coordinator matching with comma-separated designation returns 200 OK');

    // FIX 2: First-year coordinator matching with space-separated designation ('Mrs.N.Shanmuga Priya TF/Maths')
    const s8FirstYrSpace = await makeRequest('/api/students?classId=CL_SH_02', 'GET', tokenClassCoordShanmuga);
    assert(s8FirstYrSpace.status === 200, 'First-year coordinator matching with space-separated designation returns 200 OK');
    assert(Array.isArray(s8FirstYrSpace.body) && s8FirstYrSpace.body.length === 1 && s8FirstYrSpace.body[0].id === 'STU_SH_02', 'Space-separated coordinator receives correct class roster');

    // Assistant coordinator matching via stored staff ID ('FAC_IT_002')
    const s8AsstCoordStaffId = await makeRequest('/api/students?classId=CL001', 'GET', tokenFacAsstCoord);
    assert(s8AsstCoordStaffId.status === 200, 'Assistant coordinator matching via stored staff ID returns 200 OK');

    // Substring collision rejection: 'Mr. S. Kumar' must NOT match 'Mrs. M. Pavithra' or 'Mr. K. Velkumar'
    const s8SubstringCollision = await makeRequest('/api/students?classId=CL001', 'GET', tokenFacSubstring);
    assert(s8SubstringCollision.status === 403, 'Substring name collision (S. Kumar vs Pavithra/Velkumar) rejected with 403 Forbidden');

    // Empty or unassigned coordinator class access fails closed
    const s8EmptyCoord = await makeRequest('/api/students?classId=CL_UNASSIGNED_COORD', 'GET', tokenFacCoord);
    assert(s8EmptyCoord.status === 403, 'Empty coordinator field fails closed with 403 Forbidden');

    // Negative Case 1: Unknown comma-separated designation suffix fails closed (not stripped)
    const s8UnknownComma = await makeRequest('/api/students?classId=CL_UNKNOWN_SUFFIX_COMMA', 'GET', tokenClassCoordAmirtha);
    assert(s8UnknownComma.status === 403, 'Unknown comma designation suffix rejected with 403 Forbidden');

    // Negative Case 2: Unknown space-separated designation suffix fails closed (not stripped)
    const s8UnknownSpace = await makeRequest('/api/students?classId=CL_UNKNOWN_SUFFIX_SPACE', 'GET', tokenClassCoordShanmuga);
    assert(s8UnknownSpace.status === 403, 'Unknown space designation suffix rejected with 403 Forbidden');

    // Negative Case 3: Unrelated coordinator name fails closed
    const s8UnrelatedName = await makeRequest('/api/students?classId=CL_UNRELATED_NAME', 'GET', tokenClassCoordAmirtha);
    assert(s8UnrelatedName.status === 403, 'Unrelated coordinator name rejected with 403 Forbidden');

    // ─── SUITE 9: Non-Coordinator Faculty Unrelated Class Denial ─
    console.log('\n[SUITE 9] Non-Coordinator Faculty Unrelated Class Denial');
    const s9Unrelated = await makeRequest('/api/students?classId=CL002', 'GET', tokenFacAssigned);
    assert(s9Unrelated.status === 403, 'Non-coordinator faculty accessing unrelated class CL002 denied with 403 Forbidden');

    // ─── SUITE 10: Input / Mapping Validation Denial ─────────────
    console.log('\n[SUITE 10] Input and Mapping Validation Denial');
    // Nonexistent classId
    const s10NonexistentClass = await makeRequest('/api/students?classId=CL_NONEXISTENT', 'GET', tokenFacAssigned);
    assert(s10NonexistentClass.status === 403, 'Nonexistent classId denied with 403 Forbidden');

    // Nonexistent subjectId
    const s10NonexistentSub = await makeRequest('/api/students?classId=CL001&subjectId=SUB_FAKE', 'GET', tokenFacAssigned);
    assert(s10NonexistentSub.status === 403, 'Nonexistent subjectId denied with 403 Forbidden');

    // Mismatched subject and class
    const s10Mismatched = await makeRequest('/api/students?classId=CL001&subjectId=SUB_CSE', 'GET', tokenFacAssigned);
    assert(s10Mismatched.status === 403, 'Mismatched subject and class denied with 403 Forbidden');

    // Null subject.class_id
    const s10NullClass = await makeRequest('/api/students?classId=CL001&subjectId=SUB_NULL_CLASS', 'GET', tokenFacAssigned);
    assert(s10NullClass.status === 403, 'Subject with null class_id denied with 403 Forbidden');

    // ─── SUITE 11: Query Param Bypass & Unknown Role Denial ──────
    console.log('\n[SUITE 11] Query Param Bypass Prevention and Unknown Role Denial');
    // Omitting classId for faculty
    const s11FacNoClass = await makeRequest('/api/students', 'GET', tokenFacAssigned);
    assert(s11FacNoClass.status === 403, 'Faculty omitting classId cannot bypass authentication/authorization (403)');

    // Omitting classId for HOD
    const s11HodNoClass = await makeRequest('/api/students', 'GET', tokenHodIT);
    assert(s11HodNoClass.status === 403, 'HOD omitting classId cannot bypass authentication/authorization (403)');

    // Unknown role
    const s11Guest = await makeRequest('/api/students?classId=CL001', 'GET', tokenGuest);
    assert(s11Guest.status === 403, 'Unknown/unsupported role denied with 403 Forbidden');

    console.log('\n================================================================');
    console.log(`ALL TESTS PASSED: ${passCount} / ${testCount} assertions verified.`);
    console.log('100% In-Memory Isolation. Zero Production DB Connections or Writes.');
    console.log('================================================================\n');

  } finally {
    db.execute = originalDbExecute;
    db.query = originalDbQuery;
    db.getConnection = originalDbGetConnection;
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  }
}

runTestSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test run failed:', err);
    process.exit(1);
  });
