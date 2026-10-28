import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../config/db.js';
import { asyncHandler, HttpError } from '../utils/helpers.js';
import { processDueRecurring } from '../services/recurringService.js';

const router = Router();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const schema = z.object({
  type: z.enum(['income', 'expense']),
  categoryId: z.coerce.number().int().positive(),
  amount: z.coerce.number().positive().max(999999999),
  description: z.string().trim().min(1).max(190),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  startDate: date,
  endDate: date.optional().nullable().or(z.literal('')),
});

router.get('/', asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT r.*, c.name AS category_name, c.color, c.icon FROM recurring_transactions r
     JOIN categories c ON c.id = r.category_id WHERE r.user_id = ? ORDER BY r.is_active DESC, r.next_run_date`, [req.user.id]);
  res.json({ data: rows });
}));

router.post('/', asyncHandler(async (req, res) => {
  const d = schema.parse(req.body);
  const [[cat]] = await pool.query('SELECT id FROM categories WHERE id = ? AND user_id = ? AND type = ?', [d.categoryId, req.user.id, d.type]);
  if (!cat) throw new HttpError(400, 'Pick a valid category for this type');
  const [r] = await pool.query(
    `INSERT INTO recurring_transactions (user_id, category_id, type, amount, description, frequency, next_run_date, end_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.user.id, d.categoryId, d.type, d.amount, d.description, d.frequency, d.startDate, d.endDate || null]);
  const created = await processDueRecurring(req.user.id);
  res.status(201).json({ id: r.insertId, created });
}));

router.patch('/:id/toggle', asyncHandler(async (req, res) => {
  const [r] = await pool.query('UPDATE recurring_transactions SET is_active = NOT is_active WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!r.affectedRows) throw new HttpError(404, 'Rule not found');
  res.json({ message: 'Updated' });
}));

router.post('/run', asyncHandler(async (req, res) => {
  const created = await processDueRecurring(req.user.id);
  res.json({ created, message: created ? `${created} transactions created` : 'Nothing due right now' });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const [r] = await pool.query('DELETE FROM recurring_transactions WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!r.affectedRows) throw new HttpError(404, 'Rule not found');
  res.json({ message: 'Rule deleted' });
}));

export default router;
