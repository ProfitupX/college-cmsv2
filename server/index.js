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

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));

// ── Health check ────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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

app.listen(PORT, () => {
  console.log(`\n🚀 College CMS API running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});
