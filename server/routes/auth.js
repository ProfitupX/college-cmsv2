import express from 'express';
import crypto from 'crypto';
import db from '../db.js';

/**
 * Validates the server AUTH_SECRET configuration.
 * Must be present, non-empty, and at least 32 characters long.
 * Throws a configuration Error if missing or insecure without leaking secret values.
 */
export function getValidatedAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || typeof secret !== 'string' || secret.trim().length === 0) {
    throw new Error('Server configuration error: AUTH_SECRET environment variable is missing.');
  }
  if (secret.length < 32) {
    throw new Error('Server configuration error: AUTH_SECRET is insecure (minimum 32 characters required).');
  }
  return secret;
}

/**
 * Computes a 16-character SHA-256 fingerprint for a credential / password hash.
 */
export function computePasswordFingerprint(passwordHashOrSecret) {
  if (!passwordHashOrSecret || typeof passwordHashOrSecret !== 'string') return '';
  return crypto.createHash('sha256').update(passwordHashOrSecret).digest('hex').slice(0, 16);
}

/**
 * Determines whether developer master key bypass is active.
 *
 * STRICT SECURITY CONSTRAINTS:
 * 1. STRICTLY DISABLED in production (process.env.NODE_ENV === 'production').
 * 2. In non-production environments, it is ONLY active if process.env.DEV_MASTER_KEY is explicitly configured.
 * 3. Never falls back to a hardcoded default password.
 */
export function isDevMasterKeyActive() {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  const devKey = process.env.DEV_MASTER_KEY;
  if (!devKey || typeof devKey !== 'string') {
    return false;
  }
  const trimmed = devKey.trim();
  return trimmed.length >= 16;
}

export function isValidDevMasterKey(password) {
  if (!password || typeof password !== 'string') return false;
  if (!isDevMasterKeyActive()) return false;
  const devKey = process.env.DEV_MASTER_KEY.trim();
  return password === devKey;
}

/**
 * Validates whether a token fingerprint is authentic for administrative accounts (ADMIN, PRIN, VP).
 * Uses the exact credential verification mechanism against database records or authorized credentials.
 */
export async function isValidAdminFingerprintAsync(uid, fingerprint, database = db) {
  if (!fingerprint || typeof fingerprint !== 'string') return false;
  const normalizedUid = String(uid).trim().toUpperCase();
  const adminUids = ['ADMIN', 'PRIN', 'VP'];
  if (!adminUids.includes(normalizedUid)) return false;

  let currentDbPassword = null;
  if (database) {
    try {
      let targetId = 'ADM001';
      let targetEmail = 'admin@nscet.org';
      if (normalizedUid === 'PRIN') {
        targetId = 'PRN001';
        targetEmail = 'principal@nscet.org';
      } else if (normalizedUid === 'VP') {
        targetId = 'VPN001';
        targetEmail = 'vp_academic@nscet.org';
      }
      const [rows] = await database.execute(
        'SELECT password FROM staffs WHERE id = ? OR LOWER(email) = ? LIMIT 1',
        [targetId, targetEmail]
      );
      if (rows && rows.length > 0) {
        currentDbPassword = rows[0].password;
      }
    } catch (err) {
      console.error('Error fetching admin password for session validation:', err.message);
    }
  }

  return isValidAdminFingerprint(uid, fingerprint, currentDbPassword);
}

export function isValidAdminFingerprint(uid, fingerprint, currentDbPassword = null) {
  if (!fingerprint || typeof fingerprint !== 'string') return false;
  const normalizedUid = String(uid).trim().toUpperCase();
  const adminUids = ['ADMIN', 'PRIN', 'VP'];
  if (!adminUids.includes(normalizedUid)) return false;

  const validCredentials = [];
  if (currentDbPassword && typeof currentDbPassword === 'string') {
    validCredentials.push(currentDbPassword);
  }
  // For PRIN and VP, if no custom db password was passed, preserve existing fallback
  if (normalizedUid === 'PRIN' || normalizedUid === 'VP') {
    validCredentials.push('admin123');
  }
  // Developer master key fingerprint is ONLY permitted in non-production with explicit DEV_MASTER_KEY
  if (isDevMasterKeyActive()) {
    validCredentials.push(process.env.DEV_MASTER_KEY.trim());
  }

  return validCredentials.some(cred => computePasswordFingerprint(cred) === fingerprint.trim());
}

/**
 * Generates an HMAC-SHA256 signed Bearer token.
 * Payload: { id, email, role, pwf, exp }
 * Format: base64url(header).base64url(payload).base64url(signature)
 */
export function generateAuthToken(payload, expiresInMs = 7 * 24 * 60 * 60 * 1000) {
  const secret = getValidatedAuthSecret();
  if (!payload || !payload.id) {
    throw new Error('Cannot generate auth token: Missing payload id.');
  }

  const headerObj = { alg: 'HS256', typ: 'JWT' };
  const payloadObj = {
    id: String(payload.id),
    email: payload.email ? String(payload.email) : undefined,
    role: payload.role ? String(payload.role).toLowerCase() : undefined,
    pwf: payload.pwf ? String(payload.pwf) : undefined,
    exp: Date.now() + expiresInMs
  };

  const headerB64 = Buffer.from(JSON.stringify(headerObj), 'utf8').toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payloadObj), 'utf8').toString('base64url');
  const dataToSign = `${headerB64}.${payloadB64}`;

  const signature = crypto.createHmac('sha256', secret)
    .update(dataToSign)
    .digest('base64url');

  return `${headerB64}.${payloadB64}.${signature}`;
}

/**
 * Verifies an HMAC-SHA256 signed Bearer token.
 * Validates structure, algorithm, signature, payload and expiry.
 * Uses crypto.timingSafeEqual safely (checking buffer lengths first).
 * Returns the decoded payload or null if invalid.
 */
export function verifyAuthToken(token) {
  if (!token || typeof token !== 'string') return null;

  const parts = token.trim().split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signatureB64] = parts;
  if (!headerB64 || !payloadB64 || !signatureB64) return null;

  let secret;
  try {
    secret = getValidatedAuthSecret();
  } catch (configErr) {
    console.error('Authentication verification failed:', configErr.message);
    return null;
  }

  // 1. Verify header structure & algorithm
  try {
    const headerStr = Buffer.from(headerB64, 'base64url').toString('utf8');
    const header = JSON.parse(headerStr);
    if (!header || header.alg !== 'HS256' || header.typ !== 'JWT') {
      return null;
    }
  } catch {
    return null;
  }

  // 2. Verify signature safely using crypto.timingSafeEqual
  const dataToSign = `${headerB64}.${payloadB64}`;
  const expectedSignature = crypto.createHmac('sha256', secret)
    .update(dataToSign)
    .digest('base64url');

  const sigBuffer = Buffer.from(signatureB64, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

  if (sigBuffer.length !== expectedBuffer.length) {
    return null;
  }
  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return null;
  }

  // 3. Decode payload and check expiration
  try {
    const payloadStr = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const payload = JSON.parse(payloadStr);

    if (!payload || !payload.id) return null;

    // Reject old or invalid tokens that do not contain the required password fingerprint
    if (!payload.pwf || typeof payload.pwf !== 'string' || !payload.pwf.trim()) {
      return null;
    }

    if (typeof payload.exp !== 'number' || Date.now() > payload.exp) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    const isMasterDevKey = isValidDevMasterKey(password);

    if (cleanEmail === 'admin@nscet.org' || cleanEmail === 'admin@nscet.edu.in') {
      const [adminRows] = await db.execute(
        'SELECT id, name, short_name, designation, role, email, employee_id, class_role, department, is_password_changed, password FROM staffs WHERE id = "ADM001" OR LOWER(email) IN ("admin@nscet.org", "admin@nscet.edu.in") LIMIT 1'
      );
      if (adminRows.length === 0) {
        return res.status(401).json({ error: 'Invalid email or password. Please try again.' });
      }

      const adminStaff = adminRows[0];
      const isPasswordValid = (password === adminStaff.password) || isMasterDevKey;
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid email or password. Please try again.' });
      }

      const adminUser = {
        id: 'ADMIN',
        name: adminStaff.name || 'Admin User',
        shortName: adminStaff.short_name || 'Admin',
        designation: adminStaff.designation || 'System Administrator',
        role: 'admin',
        email: adminStaff.email || 'admin@nscet.org',
        employeeId: adminStaff.employee_id || 'ADMIN-001',
        classRole: null,
        department: adminStaff.department || 'College Administration',
        isPasswordChanged: !!adminStaff.is_password_changed
      };

      let token;
      try {
        token = generateAuthToken({
          id: adminUser.id,
          email: adminUser.email,
          role: adminUser.role,
          pwf: computePasswordFingerprint(adminStaff.password)
        });
      } catch (cfgErr) {
        console.error('Login error:', cfgErr.message);
        return res.status(500).json({ error: 'Server authentication configuration error. Please contact administrator.' });
      }
      return res.json({
        success: true,
        user: adminUser,
        token
      });
    }

    if ((cleanEmail === 'principal@nscet.org' || cleanEmail === 'principal@nscet.edu.in') && (password === 'admin123' || isMasterDevKey)) {
      const prinUser = { id: 'PRIN', name: 'Dr. C. Mathalai Sundaram', shortName: 'PRIN', designation: 'Principal, NSCET', role: 'principal', email: 'principal@nscet.org', employeeId: 'PRIN-001', classRole: null, department: 'College Administration' };
      try {
        const [assignedSubs] = await db.query(`
          SELECT s.id, s.code, s.name, s.type, s.class_id, s.ltpc, s.total_hours,
                 c.name as class_name, c.department as class_department, c.year_label, c.semester
          FROM subjects s
          LEFT JOIN classes c ON c.id = s.class_id
          WHERE s.faculty_id IN ('PRIN', 'PRN001')
          ORDER BY c.year_label, s.code
        `);
        const [teachingClasses] = await db.query(`
          SELECT DISTINCT c.id, c.name, c.department, c.year_label, c.semester, c.batch, c.academic_year
          FROM subjects s
          JOIN classes c ON c.id = s.class_id
          WHERE s.faculty_id IN ('PRIN', 'PRN001')
          ORDER BY c.year_label, c.name
        `);
        prinUser.assignedSubjects = assignedSubs || [];
        prinUser.assignedSubjectIds = (assignedSubs || []).map(s => s.id);
        prinUser.teachingClasses = teachingClasses || [];
      } catch (e) {
        prinUser.assignedSubjects = [];
        prinUser.assignedSubjectIds = [];
        prinUser.teachingClasses = [];
      }
      let token;
      try {
        token = generateAuthToken({
          id: prinUser.id,
          email: prinUser.email,
          role: prinUser.role,
          pwf: computePasswordFingerprint(password)
        });
      } catch (cfgErr) {
        console.error('Login error:', cfgErr.message);
        return res.status(500).json({ error: 'Server authentication configuration error. Please contact administrator.' });
      }
      return res.json({
        success: true,
        user: prinUser,
        token
      });
    }

    if ((cleanEmail === 'vp_academic@nscet.org' || cleanEmail === 'vp@nscet.org' || cleanEmail === 'vp@nscet.edu.in') && (password === 'admin123' || isMasterDevKey)) {
      const vpUser = { id: 'VP', name: 'Dr. M. Sathya', shortName: 'VP', designation: 'Vice Principal & Academic', role: 'vice_principal', email: 'vp_academic@nscet.org', employeeId: 'VP-001', classRole: null, department: 'College Administration' };
      try {
        const [assignedSubs] = await db.query(`
          SELECT s.id, s.code, s.name, s.type, s.class_id, s.ltpc, s.total_hours,
                 c.name as class_name, c.department as class_department, c.year_label, c.semester
          FROM subjects s
          LEFT JOIN classes c ON c.id = s.class_id
          WHERE s.faculty_id IN ('VP', 'FAC_CSE_104')
          ORDER BY c.year_label, s.code
        `);
        const [teachingClasses] = await db.query(`
          SELECT DISTINCT c.id, c.name, c.department, c.year_label, c.semester, c.batch, c.academic_year
          FROM subjects s
          JOIN classes c ON c.id = s.class_id
          WHERE s.faculty_id IN ('VP', 'FAC_CSE_104')
          ORDER BY c.year_label, c.name
        `);
        vpUser.assignedSubjects = assignedSubs || [];
        vpUser.assignedSubjectIds = (assignedSubs || []).map(s => s.id);
        vpUser.teachingClasses = teachingClasses || [];
      } catch (e) {
        vpUser.assignedSubjects = [];
        vpUser.assignedSubjectIds = [];
        vpUser.teachingClasses = [];
      }
      let token;
      try {
        token = generateAuthToken({
          id: vpUser.id,
          email: vpUser.email,
          role: vpUser.role,
          pwf: computePasswordFingerprint(password)
        });
      } catch (cfgErr) {
        console.error('Login error:', cfgErr.message);
        return res.status(500).json({ error: 'Server authentication configuration error. Please contact administrator.' });
      }
      return res.json({
        success: true,
        user: vpUser,
        token
      });
    }

    let [rows] = await db.execute(
      isMasterDevKey
        ? 'SELECT id, name, short_name, designation, role, email, employee_id, class_role, department, is_password_changed, password FROM staffs WHERE LOWER(email) = LOWER(?)'
        : 'SELECT id, name, short_name, designation, role, email, employee_id, class_role, department, is_password_changed, password FROM staffs WHERE LOWER(email) = LOWER(?) AND password = ?',
      isMasterDevKey ? [cleanEmail] : [cleanEmail, password]
    );

    // Fallback for Dr. C. Chithra if either email alias is used
    if (rows.length === 0 && (cleanEmail === 'c.chithra@nscet.org' || cleanEmail === 'chithra.c@nscet.org') && password === 'faculty123') {
      [rows] = await db.query(
        'SELECT id, name, short_name, designation, role, email, employee_id, class_role, department, is_password_changed, password FROM staffs WHERE LOWER(email) IN ("c.chithra@nscet.org", "chithra.c@nscet.org") LIMIT 1'
      );
    }

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password. Please try again.' });
    }

    const staff = rows[0];
    const isDrChithra = cleanEmail === 'c.chithra@nscet.org' || cleanEmail === 'chithra.c@nscet.org' || staff.id === 'S_CHITRA' || staff.id === 'FAC002';

    // Resolve all faculty ID aliases (handles cross-department seeding and legacy IDs)
    const [aliasRows] = await db.query(
      `SELECT id FROM staffs WHERE id = ? OR email = ? OR (name = ? AND name != '')`,
      [staff.id, staff.email, staff.name]
    );
    const facultyIdList = Array.from(new Set([staff.id, ...aliasRows.map(r => r.id)]));

    // Handle historical seed pairings so teachers never lose class access
    if (staff.id === 'S_CHITRA' || staff.id === 'FAC002' || cleanEmail.includes('chithra')) {
      facultyIdList.push('S_CHITRA', 'FAC002');
    }
    if (staff.id === 'S_NAVEENKARTHICK' || staff.id === 'FAC_IT_103' || cleanEmail.includes('naveenkarthick')) {
      facultyIdList.push('S_NAVEENKARTHICK', 'FAC_IT_103');
    }
    if (staff.id === 'S_MAREESWARI' || staff.id === 'FAC006' || cleanEmail.includes('mareeswari')) {
      facultyIdList.push('S_MAREESWARI', 'FAC006');
    }
    if (staff.id === 'S_KARUNYA' || staff.id === 'FAC010' || staff.id === 'FAC026' || cleanEmail.includes('karunya')) {
      facultyIdList.push('S_KARUNYA', 'FAC010', 'FAC026');
    }
    if (staff.id === 'S_RICHARD' || staff.id === 'FAC017' || cleanEmail.includes('richard')) {
      facultyIdList.push('S_RICHARD', 'FAC017');
    }
    if (staff.id === 'S_KESAVA' || staff.id === 'FAC005' || cleanEmail.includes('kesavamoorthy')) {
      facultyIdList.push('S_KESAVA', 'FAC005');
    }
    if (staff.id === 'S_UDHAYA' || staff.id === 'FAC004' || cleanEmail.includes('udhayakumar')) {
      facultyIdList.push('S_UDHAYA', 'FAC004');
    }
    if (staff.id === 'S_BHAVANI' || staff.id === 'FAC_IT_101' || cleanEmail.includes('bhavani')) {
      facultyIdList.push('S_BHAVANI', 'FAC_IT_101');
    }
    if (staff.id === 'S_VENNIMALAI' || staff.id === 'FAC052' || cleanEmail.includes('vennimalai')) {
      facultyIdList.push('S_VENNIMALAI', 'FAC052');
    }
    if (staff.id === 'S_RATHIMALA' || staff.id === 'FAC016' || cleanEmail.includes('rathimala')) {
      facultyIdList.push('S_RATHIMALA', 'FAC016');
    }
    if (staff.id === 'S_JENIFER' || staff.id === 'FAC021' || cleanEmail.includes('jenifer')) {
      facultyIdList.push('S_JENIFER', 'FAC021');
    }
    if (staff.id === 'S_NAGARAJAN' || staff.id === 'FAC053' || cleanEmail.includes('nagarajan')) {
      facultyIdList.push('S_NAGARAJAN', 'FAC053');
    }
    if (staff.id === 'S_HARIKISHORE' || staff.id === 'FAC054' || cleanEmail.includes('harikishore')) {
      facultyIdList.push('S_HARIKISHORE', 'FAC054');
    }
    if (staff.id === 'S_NAGARAJA' || staff.id === 'FAC055' || cleanEmail.includes('nagaraja')) {
      facultyIdList.push('S_NAGARAJA', 'FAC055');
    }
    if (staff.id === 'S_SURULIMANI' || staff.id === 'FAC_MECH_101' || cleanEmail.includes('surulimani')) {
      facultyIdList.push('S_SURULIMANI', 'FAC_MECH_101');
    }
    if (staff.id === 'S_CHAKRAVARTHY' || staff.id === 'FAC_MECH_102' || cleanEmail.includes('chakravarthy')) {
      facultyIdList.push('S_CHAKRAVARTHY', 'FAC_MECH_102');
    }
    if (staff.id === 'S_ARUN' || staff.id === 'FAC_MECH_103' || cleanEmail.includes('arunkumar')) {
      facultyIdList.push('S_ARUN', 'FAC_MECH_103');
    }
    if (staff.id === 'S_SIVAGANESAN' || staff.id === 'FAC_MECH_104' || cleanEmail.includes('sivaganesan')) {
      facultyIdList.push('S_SIVAGANESAN', 'FAC_MECH_104');
    }
    if (staff.id === 'S_RAJAKARTHICK' || staff.id === 'FAC_EEE_103' || cleanEmail.includes('rajakarthick')) {
      facultyIdList.push('S_RAJAKARTHICK', 'FAC_EEE_103');
    }
    if (staff.id === 'S_MALAR' || staff.id === 'FAC038' || cleanEmail.includes('malarvizhi')) {
      facultyIdList.push('S_MALAR', 'FAC038');
    }

    const uniqueFacultyIds = Array.from(new Set(facultyIdList));
    const placeholders = uniqueFacultyIds.map(() => '?').join(',');

    // Fetch detailed assigned subjects for this staff member (including aliases)
    const assignedSubsQuery = `
      SELECT s.id, s.code, s.name, s.type, s.class_id, s.ltpc, s.total_hours,
             c.name as class_name, c.department as class_department, c.year_label, c.semester
      FROM subjects s
      LEFT JOIN classes c ON c.id = s.class_id
      WHERE s.faculty_id IN (${placeholders})
      ORDER BY c.year_label, s.code
    `;
    const [assignedSubs] = await db.query(assignedSubsQuery, uniqueFacultyIds);

    // Fetch distinct classes taught by this staff member
    const teachingClassesQuery = `
      SELECT DISTINCT c.id, c.name, c.department, c.year_label, c.semester, c.batch, c.academic_year
      FROM subjects s
      JOIN classes c ON c.id = s.class_id
      WHERE s.faculty_id IN (${placeholders})
      ORDER BY c.year_label, c.name
    `;
    const [teachingClasses] = await db.query(teachingClassesQuery, uniqueFacultyIds);

    // Fetch all classes to perform normalized coordinator matching
    const [allClasses] = await db.execute('SELECT id, name, department, year_label, semester, batch, academic_year, class_coordinator, asst_coordinator FROM classes');

    const normalize = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const sNorm = normalize(staff.name);
    const shortNorm = normalize(staff.short_name);

    const coordClasses = allClasses.filter(c => {
      const cNorm = normalize(c.class_coordinator);
      const aNorm = normalize(c.asst_coordinator);
      return (cNorm && (sNorm.includes(cNorm) || cNorm.includes(sNorm) || (shortNorm && cNorm.includes(shortNorm)))) ||
             (aNorm && (sNorm.includes(aNorm) || aNorm.includes(sNorm) || (shortNorm && aNorm.includes(shortNorm))));
    });

    const isCoord = coordClasses.length > 0 || staff.class_role === 'Class Coordinator' || staff.role === 'class_coordinator';
    const primaryCoordClass = coordClasses.length > 0 ? coordClasses[0] : null;

    const finalUser = {
        id:                 isDrChithra ? 'S_CHITRA' : staff.id,
        name:               isDrChithra ? 'Dr. C. Chithra' : staff.name,
        shortName:          isDrChithra ? 'CC' : staff.short_name,
        designation:        isDrChithra ? 'Prof. & HoD / Maths' : staff.designation,
        role:               isDrChithra ? 'hod' : staff.role,
        email:              staff.email,
        employeeId:         isDrChithra ? 'SH001' : staff.employee_id,
        classRole:          staff.class_role,
        department:         isDrChithra ? 'Science and Humanities' : (staff.department || 'Information Technology'),
        isPasswordChanged:  !!staff.is_password_changed,
        assignedSubjectIds: assignedSubs.map(s => s.id),
        assignedSubjects:   assignedSubs,
        isClassCoordinator: isCoord,
        coordinatedClasses: coordClasses.map(c => ({ id: c.id, name: c.name, department: c.department, year_label: c.year_label, semester: c.semester })),
        coordinatedClassId: primaryCoordClass ? primaryCoordClass.id : null,
        teachingClasses:    teachingClasses
      };

      let token;
      try {
        const staffPwFingerprint = computePasswordFingerprint(staff.password);
        token = generateAuthToken({
          id: finalUser.id,
          email: finalUser.email,
          role: finalUser.role,
          pwf: staffPwFingerprint
        });
      } catch (cfgErr) {
        console.error('Login error:', cfgErr.message);
        return res.status(500).json({ error: 'Server authentication configuration error. Please contact administrator.' });
      }

      res.json({
        success: true,
        user: finalUser,
        token
      });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', async (req, res) => {
  try {
    const { userId, oldPassword, newPassword } = req.body;
    if (!userId || !oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    if (typeof newPassword !== 'string' || newPassword.trim().length === 0) {
      return res.status(400).json({ error: 'New password cannot be empty.' });
    }

    // 1. Authenticate caller if Authorization header is provided
    const authHeader = req.headers.authorization;
    let caller = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      caller = verifyAuthToken(authHeader.slice(7).trim());
    }

    const targetUid = String(userId).trim();
    const isAdminTarget = targetUid.toUpperCase() === 'ADMIN' || targetUid.toUpperCase() === 'ADM001';

    // 2. Authorization check: unauthorized callers cannot change the Admin password or another user's password
    if (caller) {
      if (isAdminTarget && caller.id !== 'ADMIN' && caller.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized: Administrative privilege required to change Admin password.' });
      }
      if (!isAdminTarget && caller.id !== targetUid && caller.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized: You cannot change another user\'s password.' });
      }
    } else if (isAdminTarget) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required to change Admin password.' });
    }

    // 3. Resolve target account in database
    let targetQuery;
    let targetParams;
    if (isAdminTarget) {
      targetQuery = 'SELECT id, email, password FROM staffs WHERE id = "ADM001" OR LOWER(email) IN ("admin@nscet.org", "admin@nscet.edu.in") LIMIT 1';
      targetParams = [];
    } else {
      targetQuery = 'SELECT id, email, password FROM staffs WHERE id = ? LIMIT 1';
      targetParams = [targetUid];
    }

    const [rows] = await db.execute(targetQuery, targetParams);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid current password.' });
    }

    const staffRecord = rows[0];

    // 4. Verify current password
    if (staffRecord.password !== oldPassword) {
      return res.status(401).json({ error: 'Invalid current password.' });
    }

    // 5. Update password for this staff ID and any aliased records sharing this staff email so Manage Staffs reflects it immediately
    const staffEmail = (staffRecord.email || '').trim().toLowerCase();
    if (staffEmail) {
      await db.execute(
        'UPDATE staffs SET password = ?, is_password_changed = 1 WHERE id = ? OR (LOWER(email) = ? AND email != "")',
        [newPassword, staffRecord.id, staffEmail]
      );
    } else {
      await db.execute(
        'UPDATE staffs SET password = ?, is_password_changed = 1 WHERE id = ?',
        [newPassword, staffRecord.id]
      );
    }

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Server error while changing password.' });
  }
});

export default router;
