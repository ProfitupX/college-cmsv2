// ============================================================
// api.js — Central API service layer for College CMS
// All HTTP calls to Express backend go through here.
// Base URL: http://localhost:5000/api
// ============================================================

const BASE = 'http://localhost:5000/api';

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
};

// ─────────────────────────────────────────
// STATS (Dashboard)
// ─────────────────────────────────────────
export const statsAPI = {
  get: (classId) => get(`/stats${classId ? '?classId=' + classId : ''}`),
};
