import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { pool } from './config/db.js';
import { asyncHandler } from './utils/helpers.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/error.js';
import { startRecurringJob } from './services/recurringService.js';
import authRoutes from './routes/auth.js';
import categoryRoutes from './routes/categories.js';
import transactionRoutes from './routes/transactions.js';
import budgetRoutes from './routes/budgets.js';
import goalRoutes from './routes/goals.js';
import recurringRoutes from './routes/recurring.js';
import analyticsRoutes from './routes/analytics.js';

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing. Copy .env to .env and set it.');
  process.exit(1);
}

const app = express();
app.use(helmet());
app.use(cors({ origin: (process.env.CLIENT_URL || 'http://localhost:5173').split(','), exposedHeaders: ['Content-Disposition'] }));
app.use(express.json({ limit: '1mb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

app.get('/api/health', asyncHandler(async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok', time: new Date().toISOString() });
}));

app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: true, legacyHeaders: false }), authRoutes);
app.use('/api/categories', requireAuth, categoryRoutes);
app.use('/api/transactions', requireAuth, transactionRoutes);
app.use('/api/budgets', requireAuth, budgetRoutes);
app.use('/api/goals', requireAuth, goalRoutes);
app.use('/api/recurring', requireAuth, recurringRoutes);
app.use('/api/analytics', requireAuth, analyticsRoutes);

app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`SpendWise API running on http://localhost:${port}`);
  startRecurringJob();
});
