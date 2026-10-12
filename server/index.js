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

import { execSync } from 'child_process';
import fs from 'fs';

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──────────────────────────────────────────────
app.use(cors({ origin: '*' })); // Allow all origins for local network testing
app.use(express.json({ limit: '10mb' }));

// ── Health & Diagnostics ────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/diag-vps', (_req, res) => {
  try {
    const cwd = process.cwd();
    let oldFiles = [];
    try {
      const out = execSync('find / -name "index-DCBDcCgS.js" 2>/dev/null || true', { encoding: 'utf8', timeout: 5000 });
      oldFiles = out.trim().split('\n').filter(Boolean);
    } catch (e) {
      oldFiles = [e.message];
    }
    let nginxRoots = [];
    try {
      const out = execSync('grep -rn "root" /etc/nginx/ 2>/dev/null || true', { encoding: 'utf8', timeout: 5000 });
      nginxRoots = out.trim().split('\n').filter(Boolean);
    } catch (e) {
      nginxRoots = [e.message];
    }
    let distFiles = [];
    try {
      distFiles = fs.readdirSync('./dist');
    } catch (e) {
      distFiles = [e.message];
    }
    res.json({ cwd, oldFiles, nginxRoots, distFiles, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
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

// ── Global error handler ────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 College CMS API running on http://0.0.0.0:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});

server.on('error', (err) => {
  console.error('❌ Server startup error:', err.message);
});

