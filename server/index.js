import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import authRoutes     from './routes/auth.js';
import studentRoutes  from './routes/students.js';
import classRoutes    from './routes/classes.js';
import subjectRoutes  from './routes/subjects.js';
import marksRoutes    from './routes/marks.js';
import statsRoutes    from './routes/stats.js';
import staffsRoutes   from './routes/staffs.js';

import adminRoutes    from './routes/admin.js';
import notificationRoutes from './routes/notifications.js';
import settingRoutes  from './routes/settings.js';
import remarkRoutes   from './routes/remarks.js';
import logRoutes      from './routes/logs.js';

import db from './db.js';

const app  = express();
const PORT = process.env.PORT || 5000;

// ── CORS & Body Parser ──────────────────────────────────────
app.use(cors({ origin: '*' })); // Allow all origins for local network testing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  try {
    const isReady = await db.query('SELECT 1');
    res.json({
      status: 'ok',
      service: 'college-cms-api',
      timestamp: new Date().toISOString(),
      database: isReady ? 'connected' : 'disconnected'
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      service: 'college-cms-api',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: err.message
    });
  }
});

// ── Routes ──────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/students',      studentRoutes);
app.use('/api/classes',       classRoutes);
app.use('/api/subjects',      subjectRoutes);
app.use('/api/staffs',        staffsRoutes);
app.use('/api/marks',         marksRoutes);
app.use('/api/stats',         statsRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/settings',      settingRoutes);
app.use('/api/remarks',       remarkRoutes);
app.use('/api/logs',          logRoutes);

// ── Centralized Global Error Handler (Requirement 4) ────────
app.use(async (err, req, res, _next) => {
  console.error('🚨 [Unhandled Server Exception]:', err);
  try {
    const moduleName = `BackendRoute:${req.method} ${req.originalUrl || req.url}`;
    const userRole = req.user?.role || req.headers['x-user-role'] || 'unknown';
    const userId = req.user?.id || req.headers['x-user-id'] || null;
    const userName = req.user?.name || null;
    const errorMessage = err?.message || String(err);
    const stackTrace = err?.stack || '';

    // Log to system_error_logs
    await db.execute(
      `INSERT INTO system_error_logs 
       (module_name, user_id, user_role, user_name, error_message, stack_trace, url, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        moduleName.slice(0, 100),
        userId ? String(userId).slice(0, 50) : null,
        userRole.slice(0, 50),
        userName ? String(userName).slice(0, 100) : null,
        errorMessage,
        stackTrace,
        String(req.originalUrl || req.url).slice(0, 255),
        String(req.headers['user-agent'] || '').slice(0, 500)
      ]
    );
  } catch (logDbErr) {
    console.warn('⚠️ Could not persist server error log to MySQL:', logDbErr.message);
  }

  res.status(500).json({ error: 'Internal server error.' });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 College CMS API running on http://0.0.0.0:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});

server.on('error', (err) => {
  console.error('❌ Server startup error:', err.message);
});
