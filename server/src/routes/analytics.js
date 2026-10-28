import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../config/db.js';
import { asyncHandler, currentMonth, monthRange, shiftMonth, today } from '../utils/helpers.js';
import { getBudgetsWithSpend } from '../services/budgetService.js';

const router = Router();
const month = z.string().regex(/^\d{4}-\d{2}$/);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

async function totalsBetween(userId, from, to) {
  const [[r]] = await pool.query(
    `SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount END),0) AS income,
            COALESCE(SUM(CASE WHEN type='expense' THEN amount END),0) AS expense
     FROM transactions WHERE user_id = ? AND txn_date BETWEEN ? AND ?`, [userId, from, to]);
  return { income: r.income, expense: r.expense, savings: r.income - r.expense };
}

async function breakdown(userId, from, to, type = 'expense') {
  const [rows] = await pool.query(
    `SELECT c.id, c.name, c.color, c.icon, SUM(t.amount) AS total, COUNT(*) AS count
     FROM transactions t JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = ? AND t.type = ? AND t.txn_date BETWEEN ? AND ?
     GROUP BY c.id, c.name, c.color, c.icon ORDER BY total DESC`, [userId, type, from, to]);
  const sum = rows.reduce((s, r) => s + r.total, 0);
  return rows.map((r) => ({ ...r, pct: sum ? Math.round((r.total / sum) * 1000) / 10 : 0 }));
}

async function trend(userId, endMonth, months) {
  const startMonth = shiftMonth(endMonth, -(months - 1));
  const [rows] = await pool.query(
    `SELECT DATE_FORMAT(txn_date, '%Y-%m') AS month,
            SUM(CASE WHEN type='income' THEN amount ELSE 0 END) AS income,
            SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expense
     FROM transactions WHERE user_id = ? AND txn_date BETWEEN ? AND ?
     GROUP BY month`, [userId, `${startMonth}-01`, monthRange(endMonth).end]);
  const map = Object.fromEntries(rows.map((r) => [r.month, r]));
  return Array.from({ length: months }, (_, i) => {
    const m = shiftMonth(startMonth, i);
    const r = map[m] || { income: 0, expense: 0 };
    return { month: m, income: r.income, expense: r.expense, savings: r.income - r.expense };
  });
}

async function insightsFor(userId, m, summary, prevSummary, cats, budgets) {
  const out = [];
  const { days } = monthRange(m);
  const isCurrent = m === currentMonth();
  const elapsed = isCurrent ? new Date().getUTCDate() : days;

  if (cats.length) out.push({ tone: 'info', title: `${cats[0].icon} ${cats[0].name} is your biggest expense`, text: `${cats[0].pct}% of this month's spending went here.` });
  if (prevSummary.expense > 0 && summary.expense > 0) {
    const diff = ((summary.expense - prevSummary.expense) / prevSummary.expense) * 100;
    out.push(diff > 0
      ? { tone: 'warning', title: `Spending is up ${Math.abs(diff).toFixed(0)}%`, text: 'You are spending more than last month.' }
      : { tone: 'success', title: `Spending is down ${Math.abs(diff).toFixed(0)}%`, text: 'Nice, you are spending less than last month.' });
  }
  if (summary.income > 0) {
    const rate = (summary.savings / summary.income) * 100;
    out.push(rate >= 20
      ? { tone: 'success', title: `Savings rate ${rate.toFixed(0)}%`, text: 'You are above the 20% rule of thumb.' }
      : { tone: rate < 0 ? 'danger' : 'warning', title: `Savings rate ${rate.toFixed(0)}%`, text: rate < 0 ? 'You spent more than you earned this month.' : 'Try to reach 20% by trimming one category.' });
  }
  if (isCurrent && summary.expense > 0) {
    const projected = (summary.expense / elapsed) * days;
    out.push({ tone: summary.income && projected > summary.income ? 'danger' : 'info', title: 'Month-end forecast', projected, text: `At this pace you will spend about ${Math.round(projected).toLocaleString('en-IN')} by month end.` });
  }
  const risky = budgets.filter((b) => b.status !== 'ok').sort((a, b) => b.pct - a.pct)[0];
  if (risky) out.push({ tone: risky.status === 'exceeded' ? 'danger' : 'warning', title: `${risky.icon} ${risky.category_name} budget at ${Math.round(risky.pct)}%`, text: risky.status === 'exceeded' ? 'You crossed the limit for this category.' : 'You are close to your limit.' });
  return out.slice(0, 5);
}

router.get('/dashboard', asyncHandler(async (req, res) => {
  const m = month.default(currentMonth()).parse(req.query.month);
  const uid = req.user.id;
  const { start, end } = monthRange(m);
  const prev = shiftMonth(m, -1);
  const pr = monthRange(prev);

  const [summary, prevSummary, cats, trend6, budgets] = await Promise.all([
    totalsBetween(uid, start, end), totalsBetween(uid, pr.start, pr.end),
    breakdown(uid, start, end), trend(uid, m, 6), getBudgetsWithSpend(uid, m),
  ]);
  const [[all]] = await pool.query(
    `SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE -amount END),0) AS balance FROM transactions WHERE user_id = ?`, [uid]);
  const [dailyRows] = await pool.query(
    `SELECT txn_date AS d, SUM(amount) AS total FROM transactions WHERE user_id = ? AND type='expense' AND txn_date BETWEEN ? AND ? GROUP BY txn_date`, [uid, start, end]);
  const dailyMap = Object.fromEntries(dailyRows.map((r) => [r.d, r.total]));
  const daily = Array.from({ length: monthRange(m).days }, (_, i) => {
    const day = String(i + 1).padStart(2, '0');
    return { day: i + 1, spent: dailyMap[`${m}-${day}`] || 0 };
  });
  const [recent] = await pool.query(
    `SELECT t.id, t.type, t.amount, t.description, t.txn_date, c.name AS category_name, c.icon, c.color
     FROM transactions t JOIN categories c ON c.id = t.category_id WHERE t.user_id = ? ORDER BY t.txn_date DESC, t.id DESC LIMIT 6`, [uid]);
  const [upcoming] = await pool.query(
    `SELECT r.id, r.description, r.amount, r.type, r.next_run_date, c.icon FROM recurring_transactions r JOIN categories c ON c.id = r.category_id
     WHERE r.user_id = ? AND r.is_active = 1 AND r.next_run_date BETWEEN ? AND DATE_ADD(?, INTERVAL 14 DAY) ORDER BY r.next_run_date LIMIT 4`, [uid, today(), today()]);

  const delta = (cur, old) => (old ? Math.round(((cur - old) / old) * 1000) / 10 : null);
  res.json({
    month: m,
    summary: {
      ...summary, balance: all.balance,
      savingsRate: summary.income ? Math.round((summary.savings / summary.income) * 1000) / 10 : 0,
      change: { income: delta(summary.income, prevSummary.income), expense: delta(summary.expense, prevSummary.expense), savings: delta(summary.savings, prevSummary.savings) },
    },
    categories: cats, trend: trend6, daily, recent, upcoming,
    alerts: budgets.filter((b) => b.status !== 'ok'),
    insights: await insightsFor(uid, m, summary, prevSummary, cats, budgets),
  });
}));

router.get('/report', asyncHandler(async (req, res) => {
  const q = z.object({ from: date, to: date }).parse(req.query);
  const uid = req.user.id;
  const summary = await totalsBetween(uid, q.from, q.to);
  const [expenseCats, incomeCats] = await Promise.all([breakdown(uid, q.from, q.to, 'expense'), breakdown(uid, q.from, q.to, 'income')]);
  const [rows] = await pool.query(
    `SELECT DATE_FORMAT(txn_date, '%Y-%m') AS month,
            SUM(CASE WHEN type='income' THEN amount ELSE 0 END) AS income,
            SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expense
     FROM transactions WHERE user_id = ? AND txn_date BETWEEN ? AND ? GROUP BY month ORDER BY month`, [uid, q.from, q.to]);
  const monthly = rows.map((r) => ({ ...r, savings: r.income - r.expense }));
  const [top] = await pool.query(
    `SELECT t.id, t.description, t.amount, t.txn_date, c.name AS category_name, c.icon FROM transactions t JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = ? AND t.type = 'expense' AND t.txn_date BETWEEN ? AND ? ORDER BY t.amount DESC LIMIT 5`, [uid, q.from, q.to]);
  const [[cnt]] = await pool.query('SELECT COUNT(*) AS n FROM transactions WHERE user_id = ? AND txn_date BETWEEN ? AND ?', [uid, q.from, q.to]);
  res.json({ summary: { ...summary, transactions: cnt.n }, expenseCategories: expenseCats, incomeCategories: incomeCats, monthly, topExpenses: top });
}));

export default router;
