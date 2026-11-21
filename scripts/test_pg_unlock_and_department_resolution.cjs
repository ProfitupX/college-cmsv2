/**
 * test_pg_unlock_and_department_resolution.cjs
 * Comprehensive Regression Test Suite for Complete PG Department Mapping & Unlock Flows
 *
 * SAFETY & ISOLATION GUARANTEES:
 * - Purely in-memory mock fixtures; zero connection to production MySQL.
 * - Zero database writes or schema modifications.
 * - Exercises real Express routes and HMAC authentication verification.
 */

const http = require('http');

process.env.AUTH_SECRET = process.env.AUTH_SECRET || 'markhub_isolated_test_auth_secret_key_32_chars_min!';

// Disable dotenv and mysql pool creation
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
const marksRoutes = require('../server/routes/marks.js').default || require('../server/routes/marks.js');
const {
  resolveClassOwningDepartment,
  getAuthoritativeSubjectDepartment,
  isClassAuthorizedForHod,
  inferDepartmentFromSubjectCode,
  canonicalizeDepartment,
  CANONICAL_DEPARTMENTS
} = require('../server/routes/marks.js');
const { generateAuthToken, computePasswordFingerprint } = require('../server/routes/auth.js');

console.error = origConsoleError;
dotenv.config = origDotenvConfig;
mysql.createPool = origCreatePool;

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

// In-Memory Test Fixtures
const fixtures = {
  classes: [
    // 4 PG Programmes
    { id: 'ME_CSE_I', name: 'M.E. CSE - I Year - I Sem', department: 'Computer Science and Engineering', year_label: 'I', semester: 1 },
    { id: 'ME_CSE_III', name: 'M.E. CSE - II Year - III Sem', department: 'Computer Science and Engineering', year_label: 'II', semester: 3 },
    { id: 'CL_1795140566', name: 'ME I CSE', department: 'Computer Science and Engineering', year_label: 'I', semester: 1 },
    { id: 'CL_1794306342', name: 'M.E. CSE - I Year', department: 'Computer Science and Engineering', year_label: 'I', semester: 1 },

    { id: 'ME_EST_I', name: 'M.E. EST - I Year - I Sem', department: 'Electronics and Communication Engineering', year_label: 'I', semester: 1 },
    { id: 'ME_EST_III', name: 'M.E. EST - II Year - III Sem', department: 'Electronics and Communication Engineering', year_label: 'II', semester: 3 },
    { id: 'CL_1794909437', name: 'M.E. EST - I Year', department: 'Electronics and Communication Engineering', year_label: 'I', semester: 1 },

    { id: 'ME_SE_I', name: 'M.E. Structural - I Year - I Sem', department: 'Civil Engineering', year_label: 'I', semester: 1 },
    { id: 'ME_SE_III', name: 'M.E. Structural - II Year - III Sem', department: 'Civil Engineering', year_label: 'II', semester: 3 },
    { id: 'CL_1794909933', name: 'M.E. Structural - I Year', department: 'Civil Engineering', year_label: 'I', semester: 1 },
    { id: 'CL_1794909988', name: 'M.E. Structural - II Year', department: 'Civil Engineering', year_label: 'II', semester: 3 },

    { id: 'ME_MFE_I', name: 'M.E. Manufacturing - I Year - I Sem', department: 'Mechanical Engineering', year_label: 'I', semester: 1 },
    { id: 'ME_MFE_III', name: 'M.E. Manufacturing - II Year - III Sem', department: 'Mechanical Engineering', year_label: 'II', semester: 3 },
    { id: 'CL_1794910479', name: 'M.E. Manufacturing - I Year', department: 'Mechanical Engineering', year_label: 'I', semester: 1 },
    { id: 'CL_1794910622', name: 'M.E. Manufacturing - II Year', department: 'Mechanical Engineering', year_label: 'II', semester: 3 },

    // UG Classes
    { id: 'CL001', name: 'IT - II Year - III Sem', department: 'Information Technology', year_label: 'II', semester: 3 },
    { id: 'CL002', name: 'CSE - II Year - III Sem', department: 'Computer Science and Engineering', year_label: 'II', semester: 3 },
    { id: 'CL_CIVIL_III', name: 'CIVIL - III Year - V Sem', department: 'Civil Engineering', year_label: 'III', semester: 5 }
  ],
  subjects: [
    // Target subject with null department assigned to IT class
    { id: 'SUB_CP25C04_IT', code: 'CP25C04', name: 'Advanced Compiler Design', department: null, class_id: 'CL001', faculty_id: 'FAC_IT_STAFF' },
    // Target subject assigned to ME CSE class
    { id: 'SUB_CP25C04_MECSE', code: 'CP25C04', name: 'Advanced Compiler Design', department: null, class_id: 'ME_CSE_I', faculty_id: 'FAC_CSE_STAFF' },
    // PG Synthetic Algorithm
    { id: 'SUB_CP5101', code: 'CP5101', name: 'Synthetic Advanced Algorithms', department: 'Computer Science and Engineering', class_id: 'ME_CSE_I', faculty_id: 'FAC_CSE_STAFF' },
    // PG Structural subject with null department
    { id: 'SUB_SE5101', code: 'SE5101', name: 'Advanced Structural Dynamics', department: null, class_id: 'ME_SE_III', faculty_id: 'FAC_CIVIL_STAFF' },
    // PG EST subject with null department
    { id: 'SUB_EST5101', code: 'EST5101', name: 'Real Time Embedded Operating Systems', department: null, class_id: 'ME_EST_I', faculty_id: 'FAC_ECE_STAFF' },
    // PG MFE subject with null department
    { id: 'SUB_MFE5101', code: 'MFE5101', name: 'Advanced Manufacturing Processes', department: null, class_id: 'ME_MFE_I', faculty_id: 'FAC_MECH_STAFF' },
    // UG Subject with null department
    { id: 'SUB_CE3501', code: 'CE3501', name: 'Structural Analysis', department: null, class_id: 'CL_CIVIL_III', faculty_id: 'FAC_CIVIL_STAFF' },
    // Subject with completely unknown code and no class
    { id: 'SUB_UNKNOWN', code: 'XYZ999', name: 'Unknown Course', department: null, class_id: null, faculty_id: 'FAC_UNKNOWN' }
  ],
  staffs: [
    { id: 'HOD_IT', name: 'Dr. IT HOD', email: 'hod.it@nscet.org', role: 'hod', department: 'Information Technology', password: 'pwd_hod_it' },
    { id: 'HOD_CSE', name: 'Dr. CSE HOD', email: 'hod.cse@nscet.org', role: 'hod', department: 'Computer Science and Engineering', password: 'pwd_hod_cse' },
    { id: 'HOD_ECE', name: 'Dr. ECE HOD', email: 'hod.ece@nscet.org', role: 'hod', department: 'Electronics and Communication Engineering', password: 'pwd_hod_ece' },
    { id: 'HOD_CIVIL', name: 'Dr. Civil HOD', email: 'hod.civil@nscet.org', role: 'hod', department: 'Civil Engineering', password: 'pwd_hod_civil' },
    { id: 'HOD_MECH', name: 'Dr. Mech HOD', email: 'hod.mech@nscet.org', role: 'hod', department: 'Mechanical Engineering', password: 'pwd_hod_mech' },
    { id: 'FAC_IT_STAFF', name: 'Prof. IT Faculty', email: 'faculty.it@nscet.org', role: 'faculty', department: 'Information Technology', password: 'pwd_fac_it' },
    { id: 'FAC_CSE_STAFF', name: 'Prof. CSE Faculty', email: 'faculty.cse@nscet.org', role: 'faculty', department: 'Computer Science and Engineering', password: 'pwd_fac_cse' },
    { id: 'FAC_CIVIL_STAFF', name: 'Prof. Civil Faculty', email: 'faculty.civil@nscet.org', role: 'faculty', department: 'Civil Engineering', password: 'pwd_fac_civil' },
    { id: 'FAC_ECE_STAFF', name: 'Prof. ECE Faculty', email: 'faculty.ece@nscet.org', role: 'faculty', department: 'Electronics and Communication Engineering', password: 'pwd_fac_ece' },
    { id: 'FAC_MECH_STAFF', name: 'Prof. Mech Faculty', email: 'faculty.mech@nscet.org', role: 'faculty', department: 'Mechanical Engineering', password: 'pwd_fac_mech' },
    { id: 'ADMIN', name: 'System Admin', email: 'admin@nscet.org', role: 'admin', department: 'College Administration', password: 'admin' },
    { id: 'PRIN', name: 'Dr. C. Mathalai Sundaram', email: 'principal@nscet.org', role: 'principal', department: 'College Administration', password: 'prin' }
  ],
  sessions: [
    { id: 101, subject_id: 'SUB_CP25C04_IT', class_id: 'CL001', staff_id: 'FAC_IT_STAFF', session_label: 'Internal Assessment', status: 'locked' },
    { id: 102, subject_id: 'SUB_CP25C04_MECSE', class_id: 'ME_CSE_I', staff_id: 'FAC_CSE_STAFF', session_label: 'Internal Assessment', status: 'locked' },
    { id: 103, subject_id: 'SUB_SE5101', class_id: 'ME_SE_III', staff_id: 'FAC_CIVIL_STAFF', session_label: 'Internal Assessment', status: 'locked' },
    { id: 104, subject_id: 'SUB_EST5101', class_id: 'ME_EST_I', staff_id: 'FAC_ECE_STAFF', session_label: 'Internal Assessment', status: 'locked' },
    { id: 105, subject_id: 'SUB_MFE5101', class_id: 'ME_MFE_I', staff_id: 'FAC_MECH_STAFF', session_label: 'Internal Assessment', status: 'locked' },
    { id: 106, subject_id: 'SUB_UNKNOWN', class_id: null, staff_id: 'FAC_UNKNOWN', session_label: 'Internal Assessment', status: 'locked' }
  ],
  unlockRequests: [],
  notifications: []
};

// Helper to make test HTTP requests
function makeRequest(server, options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: server.address().port,
      method: options.method || 'GET',
      path: options.path,
      headers: options.headers || {}
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

function authHeader(staff) {
  if (!staff) throw new Error('authHeader: staff is null or undefined');
  let pwf;
  if (['ADMIN', 'PRIN', 'VP'].includes(staff.id)) {
    pwf = computePasswordFingerprint('admin123');
  } else {
    pwf = computePasswordFingerprint(staff.password);
  }
  const token = generateAuthToken({
    id: staff.id,
    name: staff.name,
    email: staff.email,
    role: staff.role,
    department: staff.department,
    pwf
  });
  return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function runAllTests() {
  console.log('================================================================');
  console.log('MARKHUB: COMPLETE PG DEPARTMENT MAPPING & HOD UNLOCK TEST SUITE');
  console.log('Scope: All 4 PG Programmes (CSE, EST, SE, MFE), UG Classes, CP25C04');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // [PART 1] Unit Test Matrix: Class Owning Department Resolution
  // -------------------------------------------------------------
  console.log('[PART 1] Testing resolveClassOwningDepartment across all PG and UG classes...');
  fixtures.classes.forEach(cls => {
    const owningDept = resolveClassOwningDepartment(cls);
    assert(owningDept !== null, `Class ${cls.id} (${cls.name}) resolves to owning department: ${owningDept}`);
  });

  // Verify specific programme mappings
  assert(resolveClassOwningDepartment({ id: 'ME_CSE_I' }) === 'Computer Science and Engineering', 'ME_CSE_I -> Computer Science and Engineering');
  assert(resolveClassOwningDepartment({ id: 'CL_1795140566', name: 'ME I CSE' }) === 'Computer Science and Engineering', 'CL_1795140566 (ME I CSE) -> Computer Science and Engineering');
  assert(resolveClassOwningDepartment({ id: 'ME_EST_I' }) === 'Electronics and Communication Engineering', 'ME_EST_I -> Electronics and Communication Engineering');
  assert(resolveClassOwningDepartment({ id: 'CL_1794909437', name: 'M.E. EST - I Year' }) === 'Electronics and Communication Engineering', 'CL_1794909437 (M.E. EST) -> Electronics and Communication Engineering');
  assert(resolveClassOwningDepartment({ id: 'ME_SE_III' }) === 'Civil Engineering', 'ME_SE_III -> Civil Engineering');
  assert(resolveClassOwningDepartment({ id: 'CL_1794909988', name: 'M.E. Structural - II Year' }) === 'Civil Engineering', 'CL_1794909988 (M.E. Structural) -> Civil Engineering');
  assert(resolveClassOwningDepartment({ id: 'ME_MFE_I' }) === 'Mechanical Engineering', 'ME_MFE_I -> Mechanical Engineering');
  assert(resolveClassOwningDepartment({ id: 'CL_1794910479', name: 'M.E. Manufacturing - I Year' }) === 'Mechanical Engineering', 'CL_1794910479 (M.E. Manufacturing) -> Mechanical Engineering');
  assert(resolveClassOwningDepartment({ id: 'CL001', department: 'Information Technology' }) === 'Information Technology', 'CL001 -> Information Technology');

  // -------------------------------------------------------------
  // [PART 2] Unit Test Matrix: Subject Department Resolution
  // -------------------------------------------------------------
  console.log('\n[PART 2] Testing getAuthoritativeSubjectDepartment with Class Fallback...');

  // CP25C04 in IT class CL001
  const subIt = fixtures.subjects.find(s => s.id === 'SUB_CP25C04_IT');
  const clsIt = fixtures.classes.find(c => c.id === 'CL001');
  assert(getAuthoritativeSubjectDepartment(subIt, clsIt) === 'Information Technology', 'CP25C04 in IT class CL001 resolves to Information Technology');

  // CP25C04 in ME CSE class ME_CSE_I
  const subCse = fixtures.subjects.find(s => s.id === 'SUB_CP25C04_MECSE');
  const clsCse = fixtures.classes.find(c => c.id === 'ME_CSE_I');
  assert(getAuthoritativeSubjectDepartment(subCse, clsCse) === 'Computer Science and Engineering', 'CP25C04 in ME CSE class resolves to Computer Science and Engineering');

  // CP25C04 standalone (no class) falls back to CP code prefix (CSE)
  assert(getAuthoritativeSubjectDepartment(subIt, null) === 'Computer Science and Engineering', 'CP25C04 standalone falls back to Computer Science and Engineering via CP prefix');

  // SE5101 with null department in ME_SE_III
  const subSe = fixtures.subjects.find(s => s.id === 'SUB_SE5101');
  const clsSe = fixtures.classes.find(c => c.id === 'ME_SE_III');
  assert(getAuthoritativeSubjectDepartment(subSe, clsSe) === 'Civil Engineering', 'SE5101 in ME_SE_III resolves to Civil Engineering via class fallback');

  // EST5101 with null department in ME_EST_I
  const subEst = fixtures.subjects.find(s => s.id === 'SUB_EST5101');
  const clsEst = fixtures.classes.find(c => c.id === 'ME_EST_I');
  assert(getAuthoritativeSubjectDepartment(subEst, clsEst) === 'Electronics and Communication Engineering', 'EST5101 in ME_EST_I resolves to Electronics and Communication Engineering');

  // MFE5101 with null department in ME_MFE_I
  const subMfe = fixtures.subjects.find(s => s.id === 'SUB_MFE5101');
  const clsMfe = fixtures.classes.find(c => c.id === 'ME_MFE_I');
  assert(getAuthoritativeSubjectDepartment(subMfe, clsMfe) === 'Mechanical Engineering', 'MFE5101 in ME_MFE_I resolves to Mechanical Engineering');

  // CE3501 with null department in CL_CIVIL_III
  const subCe = fixtures.subjects.find(s => s.id === 'SUB_CE3501');
  const clsCivil = fixtures.classes.find(c => c.id === 'CL_CIVIL_III');
  assert(getAuthoritativeSubjectDepartment(subCe, clsCivil) === 'Civil Engineering', 'UG CE3501 with null department resolves to Civil Engineering via class');

  // Unknown subject with no class returns null safely
  const subUnknown = fixtures.subjects.find(s => s.id === 'SUB_UNKNOWN');
  assert(getAuthoritativeSubjectDepartment(subUnknown, null) === null, 'Unknown subject with no class returns null safely');

  // -------------------------------------------------------------
  // [PART 3] Unit Test Matrix: isClassAuthorizedForHod
  // -------------------------------------------------------------
  console.log('\n[PART 3] Testing isClassAuthorizedForHod cross-department security...');
  assert(isClassAuthorizedForHod(clsCse, 'Computer Science and Engineering') === true, 'CSE HOD authorized for ME_CSE_I');
  assert(isClassAuthorizedForHod(clsCse, 'Civil Engineering') === false, 'Civil HOD denied for ME_CSE_I');
  assert(isClassAuthorizedForHod(clsCse, 'Information Technology') === false, 'IT HOD denied for ME_CSE_I');

  assert(isClassAuthorizedForHod(clsEst, 'Electronics and Communication Engineering') === true, 'ECE HOD authorized for ME_EST_I');
  assert(isClassAuthorizedForHod(clsEst, 'Computer Science and Engineering') === false, 'CSE HOD denied for ME_EST_I');

  assert(isClassAuthorizedForHod(clsSe, 'Civil Engineering') === true, 'Civil HOD authorized for ME_SE_III');
  assert(isClassAuthorizedForHod(clsSe, 'Mechanical Engineering') === false, 'Mech HOD denied for ME_SE_III');

  assert(isClassAuthorizedForHod(clsMfe, 'Mechanical Engineering') === true, 'Mech HOD authorized for ME_MFE_I');
  assert(isClassAuthorizedForHod(clsMfe, 'Civil Engineering') === false, 'Civil HOD denied for ME_MFE_I');

  assert(isClassAuthorizedForHod(clsIt, 'Information Technology') === true, 'IT HOD authorized for CL001');
  assert(isClassAuthorizedForHod(clsIt, 'Computer Science and Engineering') === false, 'CSE HOD denied for CL001');

  // -------------------------------------------------------------
  // [PART 4] Integration Testing with Real Express Server & Mocks
  // -------------------------------------------------------------
  console.log('\n[PART 4] Setting up Express Mock Server for Route Integration Tests...');
  const app = express();
  app.use(express.json());

  // Set up database mock
  const originalDbExecute = db.execute;
  const originalDbGetConnection = db.getConnection;

  let nextReqId = 1;

  const mockDbExecute = async (sql, params = []) => {
    // 1. Staff resolution
    if (sql.includes('FROM staffs') && (sql.includes('WHERE id = ?') || sql.includes('role = \'hod\'') || sql.includes('LOWER(email)'))) {
      if (sql.includes('role = \'hod\'')) {
        const canonical = params[params.length - 1].replace(/%/g, '').toLowerCase();
        const hod = fixtures.staffs.find(s => s.role === 'hod' && s.department.toLowerCase().includes(canonical));
        return [hod ? [hod] : [], []];
      }
      const staffId = params[0];
      const match = fixtures.staffs.find(s => s.id === staffId || s.email.toLowerCase() === String(staffId).toLowerCase());
      return [match ? [match] : [], []];
    }

    // 2. Marks session lookup
    if (sql.includes('FROM marks_sessions') && sql.includes('WHERE ms.id = ?')) {
      const sessId = params[0];
      const s = fixtures.sessions.find(x => x.id === Number(sessId));
      if (!s) return [[], []];
      const sub = fixtures.subjects.find(x => x.id === s.subject_id) || {};
      return [[{
        id: s.id,
        subject_id: s.subject_id,
        class_id: s.class_id,
        status: s.status,
        code: sub.code,
        name: sub.name,
        sub_dept: sub.department,
        sub_class_id: sub.class_id
      }], []];
    }

    if (sql.includes('SELECT id, subject_id, class_id, status FROM marks_sessions WHERE id = ?')) {
      const sessId = params[0];
      const s = fixtures.sessions.find(x => x.id === Number(sessId));
      return [s ? [{ id: s.id, subject_id: s.subject_id, class_id: s.class_id, status: s.status }] : [], []];
    }

    // 3. Subjects lookup
    if (sql.includes('FROM subjects WHERE id = ?')) {
      const subId = params[0];
      const sub = fixtures.subjects.find(x => x.id === subId);
      return [sub ? [{ id: sub.id, code: sub.code, name: sub.name, department: sub.department, class_id: sub.class_id, faculty_id: sub.faculty_id }] : [], []];
    }

    // 4. Classes lookup
    if (sql.includes('FROM classes') && sql.includes('WHERE')) {
      const cId = params[0] || params[1];
      const cls = fixtures.classes.find(c => c.id === cId);
      return [cls ? [{ id: cls.id, name: cls.name, department: cls.department, year_label: cls.year_label, semester: cls.semester }] : [], []];
    }

    // 5. Existing pending unlock requests
    if (sql.includes('FROM mark_unlock_requests WHERE session_id = ? AND status = \'pending\'')) {
      const sessId = params[0];
      const pending = fixtures.unlockRequests.find(u => u.session_id === Number(sessId) && u.status === 'pending');
      return [pending ? [{ id: pending.id }] : [], []];
    }

    // 6. Update marks_sessions status
    if (sql.includes('UPDATE marks_sessions SET status =')) {
      let newStatus = params[0];
      if (sql.includes("status = 'draft'")) newStatus = 'draft';
      else if (sql.includes("status = 'unlock_requested'")) newStatus = 'unlock_requested';
      else if (sql.includes("status = 'locked'")) newStatus = 'locked';
      else if (sql.includes("status = 'unlocked'")) newStatus = 'unlocked';
      const sessId = params[params.length - 1];
      const s = fixtures.sessions.find(x => x.id === Number(sessId));
      if (s) s.status = newStatus;
      return [{ affectedRows: 1 }, []];
    }

    // 7. Insert into mark_unlock_requests
    if (sql.includes('INSERT INTO mark_unlock_requests')) {
      const [session_id, subject_id, class_id, staff_id, reason, status] = params;
      const reqId = nextReqId++;
      const newReq = { id: reqId, session_id, subject_id, class_id, staff_id, reason, status: 'pending', requested_at: new Date() };
      fixtures.unlockRequests.push(newReq);
      return [{ insertId: reqId }, []];
    }

    // 8. Insert into notifications
    if (sql.includes('INSERT INTO notifications')) {
      fixtures.notifications.push(params);
      return [{ insertId: fixtures.notifications.length }, []];
    }

    // 9. Approve unlock lookup: SELECT ur.id, ur.session_id...
    if (sql.includes('FROM mark_unlock_requests ur') && sql.includes('WHERE ur.id = ?')) {
      const reqId = params[0];
      const ur = fixtures.unlockRequests.find(x => x.id === Number(reqId));
      if (!ur) return [[], []];
      const s = fixtures.sessions.find(x => x.id === ur.session_id) || {};
      const sub = fixtures.subjects.find(x => x.id === ur.subject_id) || {};
      const cl = fixtures.classes.find(x => x.id === (ur.class_id || s.class_id || sub.class_id)) || {};
      return [[{
        id: ur.id,
        session_id: ur.session_id,
        subject_id: ur.subject_id,
        class_id: ur.class_id || cl.id,
        class_name: cl.name,
        class_department: cl.department,
        staff_id: ur.staff_id,
        status: ur.status,
        subject_code: sub.code,
        subject_name: sub.name,
        sub_dept: sub.department,
        session_status: s.status
      }], []];
    }

    // 10. Fetch unlock requests for GET /unlock-requests
    if (sql.includes('FROM mark_unlock_requests ur')) {
      const rows = fixtures.unlockRequests.map(ur => {
        const s = fixtures.sessions.find(x => x.id === ur.session_id) || {};
        const st = fixtures.staffs.find(x => x.id === ur.staff_id) || {};
        const sub = fixtures.subjects.find(x => x.id === ur.subject_id) || {};
        const cl = fixtures.classes.find(x => x.id === (ur.class_id || sub.class_id)) || {};
        return {
          id: ur.id,
          session_id: ur.session_id,
          subject_id: ur.subject_id,
          class_id: ur.class_id,
          staff_id: ur.staff_id,
          reason: ur.reason,
          status: ur.status,
          requested_at: ur.requested_at,
          staff_name: st.name,
          staff_department: st.department,
          subject_name: sub.name,
          subject_code: sub.code,
          raw_subject_department: sub.department,
          class_name: cl.name,
          class_department: cl.department,
          class_year: cl.year_label,
          class_semester: cl.semester,
          subject_semester: cl.semester,
          session_label: s.session_label,
          session_status: s.status
        };
      });
      return [rows, []];
    }

    // 11. Lock mark_unlock_requests row
    if (sql.includes('FROM mark_unlock_requests WHERE id = ? FOR UPDATE')) {
      const reqId = params[0];
      const ur = fixtures.unlockRequests.find(x => x.id === Number(reqId));
      return [ur ? [{ id: ur.id, status: ur.status }] : [], []];
    }

    // 12. Update mark_unlock_requests status
    if (sql.includes('UPDATE mark_unlock_requests SET status =')) {
      const newStatus = params[0];
      const actionedBy = params[1];
      const reqId = params[2];
      const ur = fixtures.unlockRequests.find(x => x.id === Number(reqId));
      if (ur) {
        ur.status = newStatus;
        ur.actioned_by = actionedBy;
      }
      return [{ affectedRows: 1 }, []];
    }

    return [[], []];
  };

  db.execute = mockDbExecute;
  db.getConnection = async () => ({
    execute: mockDbExecute,
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {}
  });

  app.use('/api/marks', marksRoutes);

  const server = app.listen(0);

  try {
    // -------------------------------------------------------------
    // [PART 5] POST /request-unlock Integration Tests
    // -------------------------------------------------------------
    console.log('[PART 5] Testing POST /request-unlock with null-department subjects...');

    // Faculty requests unlock for CP25C04 in IT class CL001
    const res1 = await makeRequest(server, {
      method: 'POST',
      path: '/api/marks/request-unlock',
      headers: authHeader(fixtures.staffs.find(s => s.id === 'FAC_IT_STAFF'))
    }, {
      sessionId: 101,
      subjectId: 'SUB_CP25C04_IT',
      classId: 'CL001',
      reason: 'Need to correct test mark'
    });
    console.log('res1 status and body:', res1.status, res1.body);
    assert(res1.status === 200, 'POST /request-unlock for CP25C04 returns HTTP 200');
    assert(res1.body.targetDepartment === 'Information Technology', 'Target department resolved to Information Technology via class fallback');
    assert(res1.body.hodName === 'Dr. IT HOD', 'Unlock request routed accurately to Dr. IT HOD');

    // Faculty requests unlock for M.E. CSE class ME_CSE_I
    const res2 = await makeRequest(server, {
      method: 'POST',
      path: '/api/marks/request-unlock',
      headers: authHeader(fixtures.staffs.find(s => s.id === 'FAC_CSE_STAFF'))
    }, {
      sessionId: 102,
      subjectId: 'SUB_CP25C04_MECSE',
      classId: 'ME_CSE_I',
      reason: 'Faculty grade update'
    });
    assert(res2.status === 200, 'POST /request-unlock for ME CSE returns HTTP 200');
    assert(res2.body.targetDepartment === 'Computer Science and Engineering', 'Target department resolved to Computer Science and Engineering for ME_CSE_I');
    assert(res2.body.hodName === 'Dr. CSE HOD', 'Unlock request routed to Dr. CSE HOD');

    // Faculty requests unlock for M.E. Structural class ME_SE_III (null department subject)
    const res3 = await makeRequest(server, {
      method: 'POST',
      path: '/api/marks/request-unlock',
      headers: authHeader(fixtures.staffs.find(s => s.id === 'FAC_CIVIL_STAFF'))
    }, {
      sessionId: 103,
      subjectId: 'SUB_SE5101',
      classId: 'ME_SE_III',
      reason: 'Structural analysis recalculation'
    });
    assert(res3.status === 200, 'POST /request-unlock for M.E. Structural returns HTTP 200');
    assert(res3.body.targetDepartment === 'Civil Engineering', 'Target department resolved to Civil Engineering for ME_SE_III');
    assert(res3.body.hodName === 'Dr. Civil HOD', 'Unlock request routed to Dr. Civil HOD');

    // Request unlock for unknown subject with no class is safely rejected
    const resUnknown = await makeRequest(server, {
      method: 'POST',
      path: '/api/marks/request-unlock',
      headers: authHeader(fixtures.staffs.find(s => s.id === 'FAC_IT_STAFF'))
    }, {
      sessionId: 106,
      subjectId: 'SUB_UNKNOWN',
      classId: null,
      reason: 'Unmapped request'
    });
    assert(resUnknown.status === 400, 'POST /request-unlock for unknown unmapped subject safely rejected with HTTP 400');
    assert(resUnknown.body.error.includes('does not have a valid department mapping'), 'Returns proper department mapping error message');

    // -------------------------------------------------------------
    // [PART 6] GET /unlock-requests Dashboard Visibility Tests
    // -------------------------------------------------------------
    console.log('\n[PART 6] Testing GET /unlock-requests HOD departmental filtering...');

    // IT HOD dashboard check
    const itReqs = await makeRequest(server, {
      method: 'GET',
      path: '/api/marks/unlock-requests',
      headers: authHeader(fixtures.staffs.find(s => s.id === 'HOD_IT'))
    });
    assert(itReqs.status === 200, 'IT HOD GET /unlock-requests returns HTTP 200');
    assert(itReqs.body.length === 1, 'IT HOD receives exactly 1 unlock request (CP25C04 in CL001)');
    assert(itReqs.body[0].subject_code === 'CP25C04', 'IT HOD sees pending request for CP25C04');

    // CSE HOD dashboard check
    const cseReqs = await makeRequest(server, {
      method: 'GET',
      path: '/api/marks/unlock-requests',
      headers: authHeader(fixtures.staffs.find(s => s.id === 'HOD_CSE'))
    });
    assert(cseReqs.status === 200, 'CSE HOD GET /unlock-requests returns HTTP 200');
    assert(cseReqs.body.length === 1, 'CSE HOD receives exactly 1 unlock request (ME_CSE_I)');
    assert(cseReqs.body[0].class_id === 'ME_CSE_I', 'CSE HOD sees pending request for ME_CSE_I');

    // Civil HOD dashboard check
    const civilReqs = await makeRequest(server, {
      method: 'GET',
      path: '/api/marks/unlock-requests',
      headers: authHeader(fixtures.staffs.find(s => s.id === 'HOD_CIVIL'))
    });
    assert(civilReqs.status === 200, 'Civil HOD GET /unlock-requests returns HTTP 200');
    assert(civilReqs.body.length === 1, 'Civil HOD receives exactly 1 unlock request (ME_SE_III)');
    assert(civilReqs.body[0].class_id === 'ME_SE_III', 'Civil HOD sees pending request for ME_SE_III');

    // Mech HOD dashboard check (has zero pending requests)
    const mechReqs = await makeRequest(server, {
      method: 'GET',
      path: '/api/marks/unlock-requests',
      headers: authHeader(fixtures.staffs.find(s => s.id === 'HOD_MECH'))
    });
    assert(mechReqs.status === 200, 'Mech HOD GET /unlock-requests returns HTTP 200');
    assert(mechReqs.body.length === 0, 'Mech HOD receives 0 unlock requests (strict departmental isolation)');

    // Admin dashboard check (sees all pending requests across college)
    const adminReqs = await makeRequest(server, {
      method: 'GET',
      path: '/api/marks/unlock-requests',
      headers: authHeader(fixtures.staffs.find(s => s.id === 'ADMIN'))
    });
    assert(adminReqs.status === 200, 'Admin GET /unlock-requests returns HTTP 200');
    assert(adminReqs.body.length === 3, 'Admin sees all 3 unlock requests across college');

    // -------------------------------------------------------------
    // [PART 7] POST /approve-unlock Security & Execution Tests
    // -------------------------------------------------------------
    console.log('\n[PART 7] Testing POST /approve-unlock authorization & execution...');

    // Unauthorized attempt: Mech HOD attempts to approve IT request (ID 1)
    const unauthorizedApprove = await makeRequest(server, {
      method: 'POST',
      path: '/api/marks/approve-unlock',
      headers: authHeader(fixtures.staffs.find(s => s.id === 'HOD_MECH'))
    }, {
      requestId: 1,
      sessionId: 101,
      action: 'approve'
    });
    assert(unauthorizedApprove.status === 403, 'Cross-department unlock approval rejected with HTTP 403 Forbidden');
    assert(unauthorizedApprove.body.error.includes('Unauthorized'), 'Returns strict authorization rejection message');

    // Authorized approval: IT HOD approves IT request (ID 1)
    const authorizedApprove = await makeRequest(server, {
      method: 'POST',
      path: '/api/marks/approve-unlock',
      headers: authHeader(fixtures.staffs.find(s => s.id === 'HOD_IT'))
    }, {
      requestId: 1,
      sessionId: 101,
      action: 'approve'
    });
    assert(authorizedApprove.status === 200, 'IT HOD successfully approves unlock request with HTTP 200');
    assert(authorizedApprove.body.success === true, 'Unlock response confirms success');

    // CSE HOD approves ME CSE request (ID 2)
    const cseApprove = await makeRequest(server, {
      method: 'POST',
      path: '/api/marks/approve-unlock',
      headers: authHeader(fixtures.staffs.find(s => s.id === 'HOD_CSE'))
    }, {
      requestId: 2,
      sessionId: 102,
      action: 'approve'
    });
    assert(cseApprove.status === 200, 'CSE HOD successfully approves ME CSE unlock request with HTTP 200');

    // -------------------------------------------------------------
    // [PART 8] POST /unlock-session (Direct Unlock) Tests
    // -------------------------------------------------------------
    console.log('\n[PART 8] Testing POST /unlock-session direct unlock permissions...');

    // Reset session 103 (M.E. Structural) to locked for direct unlock test
    const sess103 = fixtures.sessions.find(s => s.id === 103);
    sess103.status = 'locked';

    // Civil HOD directly unlocks M.E. Structural session
    const directCivilUnlock = await makeRequest(server, {
      method: 'POST',
      path: '/api/marks/unlock-session',
      headers: authHeader(fixtures.staffs.find(s => s.id === 'HOD_CIVIL'))
    }, {
      sessionId: 103
    });
    assert(directCivilUnlock.status === 200, 'Civil HOD directly unlocks M.E. Structural session with HTTP 200');
    assert(sess103.status === 'draft', 'Session status updated to draft');

    // Reset session 104 (M.E. EST) to locked
    const sess104 = fixtures.sessions.find(s => s.id === 104);
    sess104.status = 'locked';

    // Cross-department direct unlock attempt: CSE HOD attempts to unlock M.E. EST
    const unauthorizedDirectUnlock = await makeRequest(server, {
      method: 'POST',
      path: '/api/marks/unlock-session',
      headers: authHeader(fixtures.staffs.find(s => s.id === 'HOD_CSE'))
    }, {
      sessionId: 104
    });
    assert(unauthorizedDirectUnlock.status === 403, 'Cross-department direct unlock rejected with HTTP 403 Forbidden');
    assert(sess104.status === 'locked', 'Marks remain frozen in locked state');

    // ECE HOD directly unlocks M.E. EST
    const directEceUnlock = await makeRequest(server, {
      method: 'POST',
      path: '/api/marks/unlock-session',
      headers: authHeader(fixtures.staffs.find(s => s.id === 'HOD_ECE'))
    }, {
      sessionId: 104
    });
    assert(directEceUnlock.status === 200, 'ECE HOD directly unlocks M.E. EST session with HTTP 200');
    assert(sess104.status === 'draft', 'Session status successfully transitioned to draft');

    // Admin direct unlock on M.E. Manufacturing
    const sess105 = fixtures.sessions.find(s => s.id === 105);
    sess105.status = 'locked';

    const directAdminUnlock = await makeRequest(server, {
      method: 'POST',
      path: '/api/marks/unlock-session',
      headers: authHeader(fixtures.staffs.find(s => s.id === 'ADMIN'))
    }, {
      sessionId: 105
    });
    assert(directAdminUnlock.status === 200, 'Admin directly unlocks M.E. Manufacturing session with HTTP 200');
    assert(sess105.status === 'draft', 'Session status successfully transitioned to draft');

    console.log('\n======================================================');
    console.log(`📊 TEST SUITE SUMMARY: ${passCount} / ${testCount} ASSERTIONS PASSED (100%)`);
    console.log('======================================================\n');
  } finally {
    server.close();
    db.execute = originalDbExecute;
    db.getConnection = originalDbGetConnection;
  }
}

runAllTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
