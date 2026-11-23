/**
 * test_admin_password_change.cjs
 * Comprehensive Regression Test Suite for MarkHub Admin Password Change & Authentication
 *
 * SAFETY & ISOLATION:
 * - 100% in-memory mock database layer. Zero production database connections, updates, or writes.
 * - Does not read or expose any real production passwords or .env secrets.
 * - Tests all 9 user-specified regression cases.
 */

const http = require('http');

// Provide in-memory AUTH_SECRET for HMAC token generation/verification (>= 32 chars)
process.env.AUTH_SECRET = process.env.AUTH_SECRET || 'markhub_isolated_test_auth_secret_key_32_chars_min!';

// Prevent database pool creation or dotenv file loading during module resolution
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

// Import Express, database proxy, and real routes
const express = require('../server/node_modules/express');
const db = require('../server/db.js').default || require('../server/db.js');
const authRoutes = require('../server/routes/auth.js').default || require('../server/routes/auth.js');
const {
  generateAuthToken,
  computePasswordFingerprint,
  isValidAdminFingerprint,
  isValidAdminFingerprintAsync,
  isDevMasterKeyActive,
  isValidDevMasterKey
} = require('../server/routes/auth.js');

// Restore dotenv, mysql pool creator, and console.error
console.error = origConsoleError;
dotenv.config = origDotenvConfig;
mysql.createPool = origCreatePool;

// In-Memory Controlled Mock Database Fixtures
const mockStaffs = [
  {
    id: 'ADM001',
    name: 'Admin User',
    short_name: 'Admin',
    designation: 'System Administrator',
    role: 'admin',
    email: 'admin@nscet.org',
    employee_id: 'ADMIN-001',
    password: 'initialAdminPass123',
    class_role: null,
    department: 'College Administration',
    is_password_changed: 0
  },
  {
    id: 'PRN001',
    name: 'Dr. C. Mathalai Sundaram',
    short_name: 'Principal',
    designation: 'Principal, NSCET',
    role: 'principal',
    email: 'principal@nscet.org',
    employee_id: 'PRIN-001',
    password: 'admin123',
    class_role: null,
    department: 'College Administration',
    is_password_changed: 0
  },
  {
    id: 'VPN001',
    name: 'Dr. M. Sathya',
    short_name: 'Vice Principal',
    designation: 'Vice Principal & Academic Head',
    role: 'vice_principal',
    email: 'vp_academic@nscet.org',
    employee_id: 'EXE-002',
    password: 'admin123',
    class_role: null,
    department: 'Academic Administration',
    is_password_changed: 0
  },
  {
    id: 'FAC_AIDS_101',
    name: 'Mr. L.S. Vignesh',
    short_name: 'L.S. Vignesh',
    designation: 'AP/HOD',
    role: 'hod',
    email: 'vigneshls@nscet.org',
    employee_id: 'NSCET-AIDS-101',
    password: 'initialFacultyPass123',
    class_role: null,
    department: 'Artificial Intelligence and Data Science',
    is_password_changed: 0
  },
  {
    id: 'FAC_CSE_101',
    name: 'Mr. K. Velkumar',
    short_name: 'K. Velkumar',
    designation: 'AP',
    role: 'faculty',
    email: 'velkumar@nscet.org',
    employee_id: 'NSCET-CSE-101',
    password: 'otherFacultyPass456',
    class_role: 'Assistant Coordinator',
    department: 'Computer Science and Engineering',
    is_password_changed: 0
  }
];

let writeCount = 0;

// Mock database query & execute handler
const mockDbHandler = async (sql, params = []) => {
  const normSql = sql.trim().replace(/\s+/g, ' ');

  // 1. SELECT from staffs for Admin login / resolution
  if (/SELECT .* FROM staffs WHERE id = "ADM001"/i.test(normSql) ||
      (/SELECT .* FROM staffs WHERE.*LOWER\(email\).*admin@nscet\.org/i.test(normSql) && !/password = \?/i.test(normSql))) {
    const admin = mockStaffs.find(s => s.id === 'ADM001' || s.email === 'admin@nscet.org');
    return admin ? [[{ ...admin }]] : [[]];
  }

  // 2. SELECT from staffs for change-password (by id)
  if (/SELECT .* FROM staffs WHERE id = \?/i.test(normSql)) {
    const targetId = params[0];
    const staff = mockStaffs.find(s => s.id === targetId);
    return staff ? [[{ ...staff }]] : [[]];
  }

  // 3. SELECT from staffs for login (by email and password or email only)
  if (/SELECT .* FROM staffs WHERE LOWER\(email\) = LOWER\(\?\)/i.test(normSql)) {
    const email = params[0]?.toLowerCase();
    const pwd = params[1];
    let matched;
    if (params.length === 1) {
      matched = mockStaffs.filter(s => s.email.toLowerCase() === email);
    } else {
      matched = mockStaffs.filter(s => s.email.toLowerCase() === email && s.password === pwd);
    }
    return [matched.map(s => ({ ...s }))];
  }

  // 4. SELECT from staffs for fingerprint check (id = ? OR LOWER(email) = ?)
  if (/SELECT password FROM staffs WHERE id = \? OR LOWER\(email\) = \?/i.test(normSql)) {
    const target = params[0];
    const staff = mockStaffs.find(s => s.id === target || s.email.toLowerCase() === String(params[1]).toLowerCase());
    return staff ? [[{ password: staff.password }]] : [[]];
  }

  // 5. UPDATE staffs SET password = ...
  if (/UPDATE staffs SET password = \?/i.test(normSql)) {
    writeCount++;
    const newPwd = params[0];
    const staffId = params[1];
    const staffEmail = params[2] ? params[2].toLowerCase() : null;

    mockStaffs.forEach(s => {
      if (s.id === staffId || (staffEmail && s.email.toLowerCase() === staffEmail)) {
        s.password = newPwd;
        s.is_password_changed = 1;
      }
    });
    return [{ affectedRows: 1 }];
  }

  // 6. Generic subjects and classes mocks for Principal/VP/Staff login
  if (/FROM subjects/i.test(normSql)) {
    return [[]];
  }
  if (/FROM classes/i.test(normSql)) {
    return [[]];
  }

  return [[]];
};

db.execute = mockDbHandler;
db.query = mockDbHandler;

// Build test Express application
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

let server;
let baseUrl;

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, data: json });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, text: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`  ✗ [FAIL] ${message}`);
    failCount++;
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('MARKHUB: ADMIN PASSWORD CHANGE & AUTHENTICATION REGRESSION SUITE');
  console.log('Mode: In-Memory Mock Database | Zero Database Writes to Production');
  console.log('================================================================\n');

  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  try {
    let adminToken = null;

    // --------------------------------------------------------------------------
    // TEST 1: Admin login using existing database password
    // --------------------------------------------------------------------------
    console.log('[TEST 1] Admin Login Using Existing Database Password');
    const loginRes1 = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@nscet.org',
      password: 'initialAdminPass123'
    });
    assert(loginRes1.status === 200, 'Admin login with database password returns HTTP 200');
    assert(loginRes1.data?.user?.id === 'ADMIN', 'Admin session user.id is strictly "ADMIN"');
    assert(loginRes1.data?.user?.role === 'admin', 'Admin user.role is strictly "admin"');
    assert(loginRes1.data?.user?.isPasswordChanged === false, 'isPasswordChanged is false before first update');
    assert(typeof loginRes1.data?.token === 'string' && loginRes1.data?.token.length > 20, 'Valid JWT bearer token generated');
    adminToken = loginRes1.data?.token;

    // --------------------------------------------------------------------------
    // TEST 2: Admin password change using the correct current password
    // --------------------------------------------------------------------------
    console.log('\n[TEST 2] Admin Password Change Using Correct Current Password');
    const changeRes1 = await makeRequest('POST', '/api/auth/change-password', {
      userId: 'ADMIN',
      oldPassword: 'initialAdminPass123',
      newPassword: 'UpdatedAdminSecure#2026!'
    }, adminToken);
    assert(changeRes1.status === 200, 'Password update returns HTTP 200');
    assert(changeRes1.data?.success === true, 'Returns success: true');
    assert(changeRes1.data?.message === 'Password updated successfully.', 'Returns expected success message');

    const updatedAdminDb = mockStaffs.find(s => s.id === 'ADM001');
    assert(updatedAdminDb.password === 'UpdatedAdminSecure#2026!', 'Database record ADM001 password was updated to new password');
    assert(updatedAdminDb.is_password_changed === 1, 'Database record ADM001 is_password_changed set to 1');

    // --------------------------------------------------------------------------
    // TEST 3: Rejection of an incorrect current password
    // --------------------------------------------------------------------------
    console.log('\n[TEST 3] Rejection of Incorrect Current Password');
    const changeResWrong = await makeRequest('POST', '/api/auth/change-password', {
      userId: 'ADMIN',
      oldPassword: 'IncorrectOldPassword999!',
      newPassword: 'AnotherPassword123!'
    }, adminToken);
    assert(changeResWrong.status === 401, 'Password change with wrong current password rejected with HTTP 401');
    assert(changeResWrong.data?.error === 'Invalid current password.', 'Returns "Invalid current password." error');

    // --------------------------------------------------------------------------
    // TEST 4: Admin login using the newly changed password
    // --------------------------------------------------------------------------
    console.log('\n[TEST 4] Admin Login Using Newly Changed Password');
    const loginResNew = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@nscet.org',
      password: 'UpdatedAdminSecure#2026!'
    });
    assert(loginResNew.status === 200, 'Admin login with new password succeeds with HTTP 200');
    assert(loginResNew.data?.user?.isPasswordChanged === true, 'isPasswordChanged reflects true after password update');
    const newAdminToken = loginResNew.data?.token;

    // --------------------------------------------------------------------------
    // TEST 5: Rejection of the old password after successful change
    // --------------------------------------------------------------------------
    console.log('\n[TEST 5] Rejection of Old Password After Successful Change');
    const loginResOld = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@nscet.org',
      password: 'initialAdminPass123'
    });
    assert(loginResOld.status === 401, 'Admin login with obsolete old password rejected with HTTP 401');
    assert(loginResOld.data?.error.includes('Invalid email or password'), 'Returns invalid credentials error (no backdoor or legacy bypass)');

    // --------------------------------------------------------------------------
    // TEST 6: Admin session validation after password change
    // --------------------------------------------------------------------------
    console.log('\n[TEST 6] Admin Session Fingerprint Validation After Password Change');
    const oldPwf = computePasswordFingerprint('initialAdminPass123');
    const newPwf = computePasswordFingerprint('UpdatedAdminSecure#2026!');

    const oldSessionValid = await isValidAdminFingerprintAsync('ADMIN', oldPwf, db);
    assert(oldSessionValid === false, 'Obsolete admin token fingerprint rejected by isValidAdminFingerprintAsync');

    const newSessionValid = await isValidAdminFingerprintAsync('ADMIN', newPwf, db);
    assert(newSessionValid === true, 'New admin token fingerprint accepted by isValidAdminFingerprintAsync');

    // --------------------------------------------------------------------------
    // TEST 7: Faculty password change and login regression
    // --------------------------------------------------------------------------
    console.log('\n[TEST 7] Faculty Password Change and Login Regression');
    const facLogin1 = await makeRequest('POST', '/api/auth/login', {
      email: 'vigneshls@nscet.org',
      password: 'initialFacultyPass123'
    });
    assert(facLogin1.status === 200, 'Faculty initial login succeeds with HTTP 200');
    assert(facLogin1.data?.user?.id === 'FAC_AIDS_101', 'Faculty user.id is FAC_AIDS_101');
    const facToken = facLogin1.data?.token;

    const facChangeRes = await makeRequest('POST', '/api/auth/change-password', {
      userId: 'FAC_AIDS_101',
      oldPassword: 'initialFacultyPass123',
      newPassword: 'NewFacultySecure#2026!'
    }, facToken);
    assert(facChangeRes.status === 200, 'Faculty password change returns HTTP 200');

    const facLoginNew = await makeRequest('POST', '/api/auth/login', {
      email: 'vigneshls@nscet.org',
      password: 'NewFacultySecure#2026!'
    });
    assert(facLoginNew.status === 200, 'Faculty login with new password succeeds with HTTP 200');

    const facLoginOld = await makeRequest('POST', '/api/auth/login', {
      email: 'vigneshls@nscet.org',
      password: 'initialFacultyPass123'
    });
    assert(facLoginOld.status === 401, 'Faculty login with old password rejected with HTTP 401');

    // --------------------------------------------------------------------------
    // TEST 8: Unauthorized users cannot change the Admin password
    // --------------------------------------------------------------------------
    console.log('\n[TEST 8] Unauthorized Users Cannot Change Admin Password');
    const otherFacLogin = await makeRequest('POST', '/api/auth/login', {
      email: 'velkumar@nscet.org',
      password: 'otherFacultyPass456'
    });
    const otherFacToken = otherFacLogin.data?.token;

    // Faculty attempting to change Admin password
    const attackRes = await makeRequest('POST', '/api/auth/change-password', {
      userId: 'ADMIN',
      oldPassword: 'UpdatedAdminSecure#2026!',
      newPassword: 'HackedAdminPassword123!'
    }, otherFacToken);
    assert(attackRes.status === 403, 'Faculty token attempting to change Admin password rejected with HTTP 403 Forbidden');
    assert(attackRes.data?.error.includes('Unauthorized'), 'Error explicitly reports administrative privilege required');

    // Unauthenticated request attempting to change Admin password
    const unauthRes = await makeRequest('POST', '/api/auth/change-password', {
      userId: 'ADMIN',
      oldPassword: 'UpdatedAdminSecure#2026!',
      newPassword: 'HackedAdminPassword123!'
    });
    assert(unauthRes.status === 401, 'Unauthenticated request attempting to change Admin password rejected with HTTP 401');

    // Verify Admin password remains unchanged after attacks
    const protectedAdminDb = mockStaffs.find(s => s.id === 'ADM001');
    assert(protectedAdminDb.password === 'UpdatedAdminSecure#2026!', 'Admin password securely preserved against unauthorized changes');

    // --------------------------------------------------------------------------
    // TEST 9: Other administrative roles retain their existing access
    // --------------------------------------------------------------------------
    console.log('\n[TEST 9] Other Administrative Roles Retain Existing Access');
    const prinLogin = await makeRequest('POST', '/api/auth/login', {
      email: 'principal@nscet.org',
      password: 'admin123'
    });
    assert(prinLogin.status === 200, 'Principal login succeeds with HTTP 200');
    assert(prinLogin.data?.user?.id === 'PRIN', 'Principal user.id is PRIN');
    assert(prinLogin.data?.user?.role === 'principal', 'Principal role is principal');

    const vpLogin = await makeRequest('POST', '/api/auth/login', {
      email: 'vp_academic@nscet.org',
      password: 'admin123'
    });
    assert(vpLogin.status === 200, 'Vice Principal login succeeds with HTTP 200');
    assert(vpLogin.data?.user?.id === 'VP', 'Vice Principal user.id is VP');
    assert(vpLogin.data?.user?.role === 'vice_principal', 'Vice Principal role is vice_principal');

    const prinPwf = computePasswordFingerprint('admin123');
    const isPrinValid = await isValidAdminFingerprintAsync('PRIN', prinPwf, db);
    assert(isPrinValid === true, 'Principal session fingerprint validated successfully');

    // --------------------------------------------------------------------------
    // TEST 10: Elimination of Hardcoded Master Password & Production Security
    // --------------------------------------------------------------------------
    console.log('\n[TEST 10] Elimination of Hardcoded Master Password & Production Security');

    // 10A: In production environment (NODE_ENV === 'production')
    process.env.NODE_ENV = 'production';
    delete process.env.DEV_MASTER_KEY;

    assert(isDevMasterKeyActive() === false, 'isDevMasterKeyActive() is strictly false in production');
    assert(isValidDevMasterKey('NscetDev@2026!') === false, 'Old hardcoded master password is not valid');

    // Admin login with old hardcoded master password rejected
    const prodAdminDev = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@nscet.org',
      password: 'NscetDev@2026!'
    });
    assert(prodAdminDev.status === 401, 'Production Admin login with NscetDev@2026! rejected with HTTP 401');

    // Principal login with old hardcoded master password rejected
    const prodPrinDev = await makeRequest('POST', '/api/auth/login', {
      email: 'principal@nscet.org',
      password: 'NscetDev@2026!'
    });
    assert(prodPrinDev.status === 401, 'Production Principal login with NscetDev@2026! rejected with HTTP 401');

    // Vice Principal login with old hardcoded master password rejected
    const prodVpDev = await makeRequest('POST', '/api/auth/login', {
      email: 'vp_academic@nscet.org',
      password: 'NscetDev@2026!'
    });
    assert(prodVpDev.status === 401, 'Production Vice Principal login with NscetDev@2026! rejected with HTTP 401');

    // Faculty login with old hardcoded master password rejected
    const prodFacDev = await makeRequest('POST', '/api/auth/login', {
      email: 'vigneshls@nscet.org',
      password: 'NscetDev@2026!'
    });
    assert(prodFacDev.status === 401, 'Production Faculty login with NscetDev@2026! rejected with HTTP 401');

    // Token fingerprint with old master password rejected in production
    const oldMasterFingerprint = computePasswordFingerprint('NscetDev@2026!');
    const isMasterFpValid = await isValidAdminFingerprintAsync('ADMIN', oldMasterFingerprint, db);
    assert(isMasterFpValid === false, 'Master password fingerprint rejected in production session validation');

    // 10B: Even if DEV_MASTER_KEY is configured in production, master key bypass is STRICTLY DISABLED
    process.env.DEV_MASTER_KEY = 'ExplicitSuperSecretDevKey123#2026!';
    assert(isDevMasterKeyActive() === false, 'Master key remains inactive in production even if DEV_MASTER_KEY is set');
    const prodOverrideRes = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@nscet.org',
      password: 'ExplicitSuperSecretDevKey123#2026!'
    });
    assert(prodOverrideRes.status === 401, 'Explicit DEV_MASTER_KEY rejected in production login (HTTP 401)');

    // 10C: In non-production without DEV_MASTER_KEY, old hardcoded password is still rejected
    process.env.NODE_ENV = 'development';
    delete process.env.DEV_MASTER_KEY;
    assert(isDevMasterKeyActive() === false, 'Without explicit DEV_MASTER_KEY in development, master key is inactive');
    const devNoKeyRes = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@nscet.org',
      password: 'NscetDev@2026!'
    });
    assert(devNoKeyRes.status === 401, 'NscetDev@2026! rejected in development when DEV_MASTER_KEY is unset');

    // 10D: In non-production with explicit DEV_MASTER_KEY, only the configured key works (never NscetDev@2026!)
    process.env.DEV_MASTER_KEY = 'ExplicitDevKeyOnlyForTesting123!';
    assert(isDevMasterKeyActive() === true, 'Explicit DEV_MASTER_KEY is active in non-production');
    assert(isValidDevMasterKey('ExplicitDevKeyOnlyForTesting123!') === true, 'Configured DEV_MASTER_KEY is accepted in development');
    assert(isValidDevMasterKey('NscetDev@2026!') === false, 'Old hardcoded password NscetDev@2026! is NEVER accepted');

    // Reset environment variables back
    delete process.env.DEV_MASTER_KEY;
    delete process.env.NODE_ENV;

    // --------------------------------------------------------------------------
    // SAFETY SUMMARY
    // --------------------------------------------------------------------------
    console.log('\n================================================================');
    console.log(`ALL TESTS COMPLETED: ${passCount} passed, ${failCount} failed.`);
    console.log(`Total Mock Database Writes: ${writeCount} (all in-memory; 0 to production DB)`);
    console.log('================================================================\n');

    server.close();
    if (failCount > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal test runner error:', err);
    if (server) server.close();
    process.exit(1);
  }
}

runTests();
