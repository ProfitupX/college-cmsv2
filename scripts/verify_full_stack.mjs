import { spawn } from 'child_process';
import http from 'http';

function makeRequest(method, path, body = null, port = 5000) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost',
      port,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function run() {
  console.log('========================================================');
  console.log('🚀 TESTING FULL BACKEND & FRONTEND INTEGRATION STACK');
  console.log('========================================================\n');

  const testPort = 5000;
  let serverSpawned = false;
  let serverProcess = null;

  // Check if port 5000 already running
  try {
    const check = await makeRequest('GET', '/api/health', null, testPort);
    if (check.status === 200) {
      console.log('✅ Connected to existing backend server on port', testPort);
    }
  } catch {
    console.log('Starting backend server for test on port', testPort, '...');
    serverProcess = spawn('node', ['server/index.js'], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    serverSpawned = true;

    // wait for ready
    let ready = false;
    for (let i = 0; i < 20; i++) {
      try {
        const res = await makeRequest('GET', '/api/health', null, testPort);
        if (res.status === 200 && res.data.database === 'connected') {
          ready = true;
          break;
        }
      } catch {}
      await new Promise(r => setTimeout(r, 500));
    }
    if (!ready) {
      console.error('❌ Failed to start server');
      if (serverProcess) serverProcess.kill();
      process.exit(1);
    }
  }

  const results = [];

  // 1. Health check
  try {
    const health = await makeRequest('GET', '/api/health', null, testPort);
    results.push({
      test: 'API Health Check (/api/health)',
      status: health.status === 200 && health.data.database === 'connected' ? 'PASS' : 'FAIL',
      detail: `DB: ${health.data.database}, Service: ${health.data.service}`
    });
  } catch (err) {
    results.push({ test: 'API Health Check', status: 'FAIL', detail: err.message });
  }

  // 2. Auth - Admin
  try {
    const res = await makeRequest('POST', '/api/auth/login', { email: 'admin@nscet.org', password: 'admin123' }, testPort);
    results.push({
      test: 'Admin Login (admin@nscet.org)',
      status: res.status === 200 && res.data.success && res.data.user.role === 'admin' ? 'PASS' : 'FAIL',
      detail: `Role: ${res.data?.user?.role}, Name: ${res.data?.user?.name}`
    });
  } catch (err) {
    results.push({ test: 'Admin Login', status: 'FAIL', detail: err.message });
  }

  // 3. Auth - Principal
  try {
    const res = await makeRequest('POST', '/api/auth/login', { email: 'principal@nscet.org', password: 'principal123' }, testPort);
    results.push({
      test: 'Principal Login (principal@nscet.org)',
      status: res.status === 200 && res.data.success && res.data.user.role === 'principal' ? 'PASS' : 'FAIL',
      detail: `Role: ${res.data?.user?.role}, Name: ${res.data?.user?.name}`
    });
  } catch (err) {
    results.push({ test: 'Principal Login', status: 'FAIL', detail: err.message });
  }

  // 4. Auth - HOD IT (Prathap)
  try {
    const res = await makeRequest('POST', '/api/auth/login', { email: 'prathapc@nscet.org', password: 'faculty123' }, testPort);
    results.push({
      test: 'HOD Login (prathapc@nscet.org)',
      status: res.status === 200 && res.data.success && res.data.user.role === 'hod' ? 'PASS' : 'FAIL',
      detail: `Role: ${res.data?.user?.role}, Name: ${res.data?.user?.name}, Dept: ${res.data?.user?.department}`
    });
  } catch (err) {
    results.push({ test: 'HOD Login', status: 'FAIL', detail: err.message });
  }

  // 5. Auth - First Year HOD (Dr. C. Chithra)
  try {
    const res = await makeRequest('POST', '/api/auth/login', { email: 'chithra@nscet.org', password: 'faculty123' }, testPort);
    results.push({
      test: 'S&H First Year HOD Login (chithra@nscet.org)',
      status: res.status === 200 && res.data.success && res.data.user.role === 'hod' ? 'PASS' : 'FAIL',
      detail: `Role: ${res.data?.user?.role}, Name: ${res.data?.user?.name}, Dept: ${res.data?.user?.department}`
    });
  } catch (err) {
    results.push({ test: 'S&H HOD Login', status: 'FAIL', detail: err.message });
  }

  // 6. Classes API (All 29 Classes across 4 years)
  try {
    const res = await makeRequest('GET', '/api/classes', null, testPort);
    results.push({
      test: 'Classes Endpoint (/api/classes)',
      status: res.status === 200 && Array.isArray(res.data) && res.data.length === 29 ? 'PASS' : 'FAIL',
      detail: `Total classes: ${res.data?.length} (Expected 29 across Years I-IV)`
    });
  } catch (err) {
    results.push({ test: 'Classes Endpoint', status: 'FAIL', detail: err.message });
  }

  // 7. Subjects API (All 250 Subjects)
  try {
    const res = await makeRequest('GET', '/api/subjects', null, testPort);
    results.push({
      test: 'Subjects Endpoint (/api/subjects)',
      status: res.status === 200 && Array.isArray(res.data) && res.data.length === 250 ? 'PASS' : 'FAIL',
      detail: `Total subjects: ${res.data?.length} (Expected 250)`
    });
  } catch (err) {
    results.push({ test: 'Subjects Endpoint', status: 'FAIL', detail: err.message });
  }

  // 8. Staffs API (All 99 Staff accounts)
  try {
    const res = await makeRequest('GET', '/api/staffs', null, testPort);
    results.push({
      test: 'Staffs Endpoint (/api/staffs)',
      status: res.status === 200 && Array.isArray(res.data) && res.data.length === 99 ? 'PASS' : 'FAIL',
      detail: `Total staff accounts: ${res.data?.length} (Expected 99)`
    });
  } catch (err) {
    results.push({ test: 'Staffs Endpoint', status: 'FAIL', detail: err.message });
  }

  // 9. Dashboard Analytics API
  try {
    const res = await makeRequest('GET', '/api/stats', null, testPort);
    results.push({
      test: 'Dashboard Analytics (/api/stats)',
      status: res.status === 200 && res.data.totalStudents === 1194 ? 'PASS' : 'FAIL',
      detail: `Total Enrolled Students: ${res.data.totalStudents} (Expected 1,194)`
    });
  } catch (err) {
    results.push({ test: 'Dashboard Analytics', status: 'FAIL', detail: err.message });
  }

  // 10. Continuous Assessment Department Reports (8 Distinct Departments)
  try {
    const res = await makeRequest('GET', '/api/stats/continuous-assessment?sessionLabel=internal1', null, testPort);
    results.push({
      test: 'Continuous Assessment Reports (/api/stats/continuous-assessment)',
      status: res.status === 200 && Array.isArray(res.data.departments) && res.data.departments.length === 8 ? 'PASS' : 'FAIL',
      detail: `Total Distinct Departments: ${res.data.departments?.length} (Expected 8)`
    });
  } catch (err) {
    results.push({ test: 'Continuous Assessment Reports', status: 'FAIL', detail: err.message });
  }

  // 11. Reports / Class Summary
  try {
    const res = await makeRequest('GET', '/api/marks/class-summary?classId=C_SH_CSE_A_1&sessionLabel=internal1', null, testPort);
    results.push({
      test: 'First Year Class Marks Summary (/api/marks/class-summary)',
      status: res.status === 200 && res.data.classObj && res.data.students ? 'PASS' : 'FAIL',
      detail: `Class: ${res.data?.classObj?.name}, Students: ${res.data?.students?.length}, Subjects: ${res.data?.subjects?.length}`
    });
  } catch (err) {
    results.push({ test: 'Class Marks Summary', status: 'FAIL', detail: err.message });
  }

  if (serverSpawned && serverProcess) {
    serverProcess.kill('SIGTERM');
  }

  console.log('--- INTEGRATION VERIFICATION TEST MATRIX ---');
  let hasFail = false;
  for (const r of results) {
    console.log(`[${r.status}] ${r.test} - ${r.detail}`);
    if (r.status === 'FAIL') hasFail = true;
  }
  console.log('--------------------------------------------\n');

  if (hasFail) {
    console.error('❌ Some integration verification tests failed.');
    process.exit(1);
  } else {
    console.log('✅ ALL INTEGRATION TESTS PASSED CLEANLY (11/11)!');
    process.exit(0);
  }
}

run().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
