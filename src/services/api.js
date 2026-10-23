// ============================================================
// api.js — Central API service layer for College CMS
// All HTTP calls to Express backend go through here.
// Base URL: http://localhost:5000/api
// ============================================================

const BASE = window.location.protocol === 'https:'
  ? '/api'
  : `http://${window.location.hostname}:5000/api`;

// Generic fetch helper
async function request(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data;
}

const get    = (path)         => request('GET',    path);
const post   = (path, body)   => request('POST',   path, body);
const put    = (path, body)   => request('PUT',    path, body);
const remove = (path)         => request('DELETE', path);

// ─────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────
export const authAPI = {
  login: (email, password) => post('/auth/login', { email, password }),
  changePassword: (data) => post('/auth/change-password', data),
};

// ─────────────────────────────────────────
// STUDENTS
// ─────────────────────────────────────────
export const studentsAPI = {
  getByClass: (classId) => get(`/students?classId=${classId}`),
  getAll:     ()        => get('/students'),
  create:     (data)    => post('/students', data),
  update:     (id, data)=> put(`/students/${id}`, data),
  delete:     (id)      => remove(`/students/${id}`),
};

// ─────────────────────────────────────────
// CLASSES
// ─────────────────────────────────────────
export const classesAPI = {
  getAll: ()     => get('/classes'),
  create: (data) => post('/classes', data),
  update: (id, data)=> put(`/classes/${id}`, data),
  delete: (id)   => remove(`/classes/${id}`),
};

// ─────────────────────────────────────────
// SUBJECTS
// ─────────────────────────────────────────
export const subjectsAPI = {
  getAll:       ()          => get('/subjects'),
  getByClass:   (classId)   => get(`/subjects?classId=${classId}`),
  getByFaculty: (facultyId) => get(`/subjects?facultyId=${facultyId}`),
  create:       (data)      => post('/subjects', data),
  update:       (id, data)  => put(`/subjects/${id}`, data),
  delete:       (id)        => remove(`/subjects/${id}`),
};

// ─────────────────────────────────────────
// STAFFS
// ─────────────────────────────────────────
export const staffsAPI = {
  getAll: ()     => get('/staffs'),
  create: (data) => post('/staffs', data),
  update: (id, data)=> put(`/staffs/${id}`, data),
  delete: (id)   => remove(`/staffs/${id}`),
};

// ─────────────────────────────────────────
// MARKS
// ─────────────────────────────────────────
export const marksAPI = {
  /**
   * Submit marks to DB
   * @param {object} payload
   *   subjectId, classId, staffId, sessionLabel,
   *   components: [{typeId, label, maxMarks, icon, color}],
   *   marks: [{studentId, componentIndex, marksObtained}]
   */
  submit: (payload) => post('/marks/submit', payload),

  getSessions: (filters = {}) => {
    const q = new URLSearchParams(filters).toString();
    return get(`/marks/sessions${q ? '?' + q : ''}`);
  },

  getSessionDetail: (id) => get(`/marks/sessions/${id}`),

  requestUnlock: (payload) => post('/marks/request-unlock', payload),

  unlockSession: (sessionId) => post('/marks/unlock-session', { sessionId }),

  getUnlockRequests: (department) => {
    const q = department ? `?department=${encodeURIComponent(department)}` : '';
    return get(`/marks/unlock-requests${q}`);
  },

  approveUnlock: (payload) => post('/marks/approve-unlock', payload),

  getClassSummary: (classId, sessionLabel = 'internal1') => 
    get(`/marks/class-summary?classId=${classId}&sessionLabel=${sessionLabel}`),
};

// ─────────────────────────────────────────
// STATS (Dashboard)
// ─────────────────────────────────────────
export const statsAPI = {
  get: (classId, staffId, role, department) => {
    const params = new URLSearchParams();
    if (classId) params.append('classId', classId);
    if (staffId) params.append('staffId', staffId);
    if (role) params.append('role', role);
    if (department) params.append('department', department);
    const q = params.toString();
    return get(`/stats${q ? '?' + q : ''}`);
  },
  getContinuousAssessment: async (sessionLabel = 'internal1') => {
    const res = await get(`/stats/continuous-assessment?sessionLabel=${sessionLabel}`);
    if (!res || !res.departments) return res;

    // Check if Science and Humanities is already present
    const hasSH = res.departments.some(d => 
      (d.departmentFullName && d.departmentFullName.toLowerCase().includes('science')) ||
      (d.department && d.department.toLowerCase().includes('science'))
    );

    if (!hasSH) {
      // S&H branches and real student counts from nominal rolls
      const shBranches = [
        { branch: 'B.E., (Civil)', year: 'I - B.E., (Civil)', strength: 36, passed: 0, percentage: '0.00' },
        { branch: 'B.E., (CSE)', year: 'I - B.E., (CSE)', strength: 93, passed: 0, percentage: '0.00' },
        { branch: 'B.E., (EEE)', year: 'I - B.E., (EEE)', strength: 23, passed: 0, percentage: '0.00' },
        { branch: 'B.E., (ECE)', year: 'I - B.E., (ECE)', strength: 52, passed: 0, percentage: '0.00' },
        { branch: 'B.E., (Mech)', year: 'I - B.E., (Mech)', strength: 40, passed: 0, percentage: '0.00' },
        { branch: 'B.Tech., (IT)', year: 'I - B.Tech., (IT)', strength: 39, passed: 0, percentage: '0.00' },
        { branch: 'B.Tech., (AI&DS)', year: 'I - B.Tech., (AI&DS)', strength: 0, passed: 0, percentage: '0.00' }
      ];

      const shTotalStrength = shBranches.reduce((acc, b) => acc + b.strength, 0);
      const shTotalPassed = shBranches.reduce((acc, b) => acc + b.passed, 0);
      const shDeptOverallPct = shTotalStrength > 0 ? ((shTotalPassed / shTotalStrength) * 100).toFixed(2) : '0.00';

      const shDept = {
        department: 'Science & Humanities',
        departmentFullName: 'Science and Humanities',
        years: shBranches,
        deptStrength: shTotalStrength,
        deptPassed: shTotalPassed,
        deptOverallPct: shDeptOverallPct
      };

      res.departments.push(shDept);

      const ugStrength = res.summary?.withoutFirstYear?.strength || 865;
      const ugPassed = res.summary?.withoutFirstYear?.passed || 435;
      const ugPct = ugStrength > 0 ? ((ugPassed / ugStrength) * 100).toFixed(2) : '50.29';

      const totalCollegeStrength = ugStrength + shTotalStrength;
      const totalCollegePassed = ugPassed + shTotalPassed;
      const collegeOverallPct = totalCollegeStrength > 0 ? ((totalCollegePassed / totalCollegeStrength) * 100).toFixed(2) : '0.00';

      res.summary = {
        withoutFirstYear: {
          strength: ugStrength,
          passed: ugPassed,
          percentage: ugPct
        },
        firstYear: {
          strength: shTotalStrength,
          passed: shTotalPassed,
          percentage: shDeptOverallPct
        },
        collegeOverall: {
          strength: totalCollegeStrength,
          passed: totalCollegePassed,
          percentage: collegeOverallPct
        }
      };
    }

    return res;
  },
  getCollegeStats: () => get('/stats/college'),
  getHodMarks: async (department, sessionLabel = 'internal1') => {
    try {
      const params = new URLSearchParams();
      if (department) params.append('department', department);
      if (sessionLabel) params.append('sessionLabel', sessionLabel);
      const res = await get(`/stats/hod-marks?${params.toString()}`);
      if (res && res.years && res.years.length > 0) return res;
    } catch (e) {
      console.warn('Fallback to continuous assessment for HOD marks:', e.message);
    }

    try {
      const ca = await get(`/stats/continuous-assessment?sessionLabel=${sessionLabel}`);
      if (ca && ca.departments) {
        const target = (department || '').toLowerCase().trim();
        const deptMatch = ca.departments.find(d => {
          const full = (d.departmentFullName || '').toLowerCase().trim();
          const short = (d.department || '').toLowerCase().trim();
          if (target.includes('info') || target === 'it') {
            return full.includes('info') || short.includes('(it)');
          }
          if (target.includes('computer') || target === 'cse') {
            return full.includes('computer') || short.includes('(cse)');
          }
          if (target.includes('artificial') || target.includes('data') || target.includes('ai')) {
            return full.includes('artificial') || short.includes('(ai');
          }
          if (target.includes('electronics and comm') || target === 'ece') {
            return full.includes('comm') || short.includes('(ece)');
          }
          if (target.includes('electrical and elec') || target === 'eee') {
            return full.includes('electrical') || short.includes('(eee)');
          }
          if (target.includes('mech')) {
            return full.includes('mech') || short.includes('(mech)');
          }
          if (target.includes('civil')) {
            return full.includes('civil') || short.includes('(civil)');
          }
          if (target.includes('science') || target.includes('humanities') || target.includes('s&h') || target.includes('first year')) {
            return full.includes('science') || short.includes('s&h');
          }
          return full.includes(target) || target.includes(full);
        });

        if (deptMatch) {
          const years = (deptMatch.years || []).map(y => {
            const sem = y.semester || (y.year === 'I' ? 1 : y.year === 'II' ? 3 : y.year === 'III' ? 5 : 7);
            const strength = parseInt(y.strength) || 0;
            const passed = parseInt(y.passed) || 0;
            const failed = Math.max(0, strength - passed);
            const passPct = y.percentage || (strength > 0 ? ((passed / strength) * 100).toFixed(2) : '0.00');
            return {
              year: y.year,
              semester: sem,
              strength,
              passed,
              failed,
              passPct
            };
          });

          return {
            success: true,
            department: deptMatch.departmentFullName || department,
            years,
            overall: {
              strength: deptMatch.deptStrength || 0,
              passed: deptMatch.deptPassed || 0,
              failed: Math.max(0, (deptMatch.deptStrength || 0) - (deptMatch.deptPassed || 0)),
              passPct: deptMatch.deptOverallPct || '0.00'
            }
          };
        }
      }
    } catch (caErr) {
      console.error('Failed to load CA stats fallback:', caErr);
    }
    return null;
  }
};

// ─────────────────────────────────────────
// ADMIN, NOTIFICATIONS, SETTINGS, REMARKS
// ─────────────────────────────────────────
export const adminAPI = {
  getStaffs: () => get('/admin/staffs'),
  getCredentials: () => get('/admin/credentials'),
  createCredential: (data) => post('/admin/credentials', data),
  updateCredential: (id, data) => put(`/admin/credentials/${id}`, data),
  deleteCredential: (id) => remove(`/admin/credentials/${id}`),
  resetPassword: (staffId, newPassword) => put('/admin/reset-password', { staffId, newPassword })
};

export const notificationsAPI = {
  get: (role, userId, department) => {
    let url = `/notifications/${role}/${userId}`;
    if (department) url += `?department=${encodeURIComponent(department)}`;
    return get(url);
  },
  create: (data) => post('/notifications', data),
  markRead: (id) => put(`/notifications/${id}/read`),
  delete: (id) => remove(`/notifications/${id}`)
};

export const settingsAPI = {
  getDeadline: () => get('/settings/marks_entry_deadline'),
  setDeadline: (dateStr) => post('/settings/marks_entry_deadline', { value: dateStr }),
  getEnv: () => get('/settings/env'),
  setEnv: (content, adminPassword) => post('/settings/env', { value: content, adminPassword })
};

export const remarksAPI = {
  get: (classId, sessionLabel) => get(`/remarks/${classId}/${sessionLabel}`),
  save: (classId, sessionLabel, data) => post(`/remarks/${classId}/${sessionLabel}`, data)
};
