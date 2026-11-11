import express from 'express';
import db from '../db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { verifyAuthToken } from './auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// GET /api/settings/active-cycle
// Resolve the active academic year and assessment cycles without hardcoded fallbacks
// ─────────────────────────────────────────────────────────────
router.get('/active-cycle', async (req, res) => {
  try {
    // 1. Authenticate caller (valid session or HMAC-SHA256 Bearer token)
    const authHeader = req.headers['authorization'];
    const token = authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : null;
    const user = token ? verifyAuthToken(token) : (req.user || req.session?.user || null);

    if (!user || !user.id) {
      return res.status(401).json({ error: 'Authentication required to access academic cycle configuration.' });
    }

    // 2. Query active academic year
    const [ayRows] = await db.execute(
      'SELECT id, code, is_current FROM academic_years WHERE is_current = 1 LIMIT 1'
    );
    if (ayRows.length === 0) {
      return res.json({
        configured: false,
        code: 'NO_ACTIVE_ACADEMIC_YEAR',
        error: 'No active academic year is currently designated (is_current = 1).'
      });
    }
    const activeAY = ayRows[0];

    // 3. Query assessment cycles for the active academic year
    const [cycleRows] = await db.execute(
      'SELECT id, academic_year_id, name, cycle_type, status, marks_entry_deadline FROM assessment_cycles WHERE academic_year_id = ? ORDER BY id ASC',
      [activeAY.id]
    );

    if (cycleRows.length === 0) {
      return res.json({
        configured: false,
        code: 'NO_CYCLES_CONFIGURED',
        academicYear: activeAY.code,
        academicYearId: activeAY.id,
        error: `No assessment cycles configured for Academic Year '${activeAY.code}'.`,
        cycles: []
      });
    }

    // 4. Resolve semester parity without guessing or assuming ODD
    const oddCycles = cycleRows.filter(c => c.cycle_type.startsWith('ODD_'));
    const evenCycles = cycleRows.filter(c => c.cycle_type.startsWith('EVEN_'));

    const oddActive = oddCycles.some(c => c.status === 'ACTIVE');
    const evenActive = evenCycles.some(c => c.status === 'ACTIVE');

    let resolvedSemester = null;
    let resolvedCycleList = null;

    if (oddActive && evenActive) {
      return res.json({
        configured: false,
        code: 'AMBIGUOUS_SEMESTER_STATE',
        academicYear: activeAY.code,
        academicYearId: activeAY.id,
        error: 'Conflicting cycle states: both ODD and EVEN semester cycles are marked ACTIVE simultaneously.',
        cycles: cycleRows
      });
    } else if (oddActive && !evenActive) {
      resolvedSemester = 'ODD SEM';
      resolvedCycleList = oddCycles;
    } else if (evenActive && !oddActive) {
      resolvedSemester = 'EVEN SEM';
      resolvedCycleList = evenCycles;
    } else {
      // Neither semester has an ACTIVE cycle. Never assume ODD or EVEN from planned cycle existence.
      return res.json({
        configured: false,
        code: 'SEMESTER_UNRESOLVED',
        academicYear: activeAY.code,
        academicYearId: activeAY.id,
        error: `No assessment cycle is currently ACTIVE in Academic Year '${activeAY.code}'. Active semester cannot be determined without an active cycle.`,
        cycles: cycleRows
      });
    }

    // 5. Extract IA1 and IA2 for the resolved semester
    const prefix = resolvedSemester === 'ODD SEM' ? 'ODD' : 'EVEN';
    const ia1 = resolvedCycleList.find(c => c.cycle_type === `${prefix}_INTERNAL_1`) || null;
    const ia2 = resolvedCycleList.find(c => c.cycle_type === `${prefix}_INTERNAL_2`) || null;

    if (!ia1 && !ia2) {
      return res.json({
        configured: false,
        code: 'NO_INTERNAL_CYCLES_CONFIGURED',
        academicYear: activeAY.code,
        academicYearId: activeAY.id,
        semester: resolvedSemester,
        error: `No Internal Assessment cycles found for ${resolvedSemester} in Academic Year '${activeAY.code}'.`,
        cycles: cycleRows
      });
    }

    const activeCycleObj = resolvedCycleList.find(c => c.status === 'ACTIVE') || ia1 || ia2;

    res.json({
      configured: true,
      academicYear: activeAY.code,
      academicYearId: activeAY.id,
      semester: resolvedSemester,
      assessmentCycle: activeCycleObj?.name || null,
      modes: {
        internal1: ia1 ? {
          cycleId: ia1.id,
          cycleType: ia1.cycle_type,
          name: ia1.name,
          status: ia1.status,
          deadline: ia1.marks_entry_deadline || null
        } : null,
        internal2: ia2 ? {
          cycleId: ia2.id,
          cycleType: ia2.cycle_type,
          name: ia2.name,
          status: ia2.status,
          deadline: ia2.marks_entry_deadline || null
        } : null
      },
      cycles: cycleRows
    });
  } catch (err) {
    console.error('GET /settings/active-cycle error:', err.message);
    const isMissingTable = err.code === 'ER_NO_SUCH_TABLE' || err.errno === 1146 || err.sqlState === '42S02';
    if (isMissingTable) {
      return res.status(503).json({
        configured: false,
        error: 'Academic cycle configuration is not available. Required database schema has not been installed.',
        code: 'SCHEMA_NOT_INSTALLED'
      });
    }
    res.status(500).json({ error: 'Failed to resolve active cycle.' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/settings/:key
// Get a specific setting (like marks_entry_deadline)
// ─────────────────────────────────────────────────────────────
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    
    // Special case for .env file editor
    if (key === 'env') {
      const envPath = path.join(__dirname, '..', '.env');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        return res.json({ value: envContent });
      } else {
        return res.json({ value: '' });
      }
    }

    const [rows] = await db.execute(
      'SELECT setting_value FROM system_settings WHERE setting_key = ?',
      [key]
    );
    
    if (rows.length === 0) {
      return res.json({ value: null });
    }
    res.json({ value: rows[0].setting_value });
  } catch (err) {
    console.error('GET /settings error:', err);
    res.status(500).json({ error: 'Failed to fetch setting.' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/settings/:key
// Set a system setting (HOD only logic applied in frontend)
// ─────────────────────────────────────────────────────────────
router.post('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value, adminPassword } = req.body;
    
    if (value === undefined) return res.status(400).json({ error: 'Value is required' });

    // Special case for .env file editor
    if (key === 'env') {

      const envPath = path.join(__dirname, '..', '.env');
      fs.writeFileSync(envPath, value, 'utf8');
      
      // Dynamically reload connection pool with new credentials
      db.reconnect();
      
      return res.json({ success: true, message: 'Environment settings updated and applied instantly! The database connection has been reloaded.' });
    }

    // Insert or update
    await db.execute(
      `INSERT INTO system_settings (setting_key, setting_value) 
       VALUES (?, ?) 
       ON DUPLICATE KEY UPDATE setting_value = ?`,
      [key, value, value]
    );

    // If setting a deadline, create a notification for all staff
    if (key === 'marks_entry_deadline') {
      const deadlineDate = new Date(value).toLocaleDateString('en-IN');
      await db.execute(
        `INSERT INTO notifications (target_role, title, message, link)
         VALUES ('all', 'Marks Entry Deadline Set', ?, '/dashboard')`,
        [`The marks entry deadline has been updated to ${deadlineDate}. All faculty and class coordinators please ensure marks entries are completed on time.`]
      );
    }

    res.json({ success: true, message: 'Setting updated successfully.' });
  } catch (err) {
    console.error('POST /settings error:', err);
    res.status(500).json({ error: 'Failed to update setting.' });
  }
});

export default router;
