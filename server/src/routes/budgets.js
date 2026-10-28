import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../config/db.js';
import { asyncHandler, HttpError, currentMonth } from '../utils/helpers.js';
import { getBudgetsWithSpend } from '../services/budgetService.js';

const router = Router();
const month = z.string().regex(/^\d{4}-\d{2}$/, 'use YYYY-MM');
const upsertSchema = z.object({
  categoryId: z.coerce.number().int().positive(),
  month,
  amount: z.coerce.number().positive().max(999999999),
  alertThreshold: z.coerce.number().int().min(1).max(100).default(80),
});

router.get('/', asyncHandler(async (req, res) => {
  const m = month.default(currentMonth()).parse(req.query.month);
  const data = await getBudgetsWithSpend(req.user.id, m);
  const totalBudget = data.reduce((s, b) => s + b.amount, 0);
  const totalSpent = data.reduce((s, b) => s + b.spent, 0);
  res.json({ data, summary: { totalBudget, totalSpent, remaining: totalBudget - totalSpent } });
}));

router.put('/', asyncHandler(async (req, res) => {
  const d = upsertSchema.parse(req.body);
  const [[cat]] = await pool.query("SELECT id FROM categories WHERE id = ? AND user_id = ? AND type = 'expense'", [d.categoryId, req.user.id]);
  if (!cat) throw new HttpError(400, 'Budgets can only be set on expense categories');
  await pool.query(
    `INSERT INTO budgets (user_id, category_id, month, amount, alert_threshold) VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE amount = VALUES(amount), alert_threshold = VALUES(alert_threshold)`,
    [req.user.id, d.categoryId, `${d.month}-01`, d.amount, d.alertThreshold]);
  res.json({ message: 'Budget saved' });
}));

router.post('/copy', asyncHandler(async (req, res) => {
  const { from, to } = z.object({ from: month, to: month }).parse(req.body);
  const [r] = await pool.query(
    `INSERT IGNORE INTO budgets (user_id, category_id, month, amount, alert_threshold)
     SELECT user_id, category_id, ?, amount, alert_threshold FROM budgets WHERE user_id = ? AND month = ?`,
    [`${to}-01`, req.user.id, `${from}-01`]);
  res.json({ message: `${r.affectedRows} budgets copied`, copied: r.affectedRows });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const [r] = await pool.query('DELETE FROM budgets WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!r.affectedRows) throw new HttpError(404, 'Budget not found');
  res.json({ message: 'Budget removed' });
}));

export default router;
