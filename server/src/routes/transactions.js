import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../config/db.js';
import { asyncHandler, HttpError, toCsv } from '../utils/helpers.js';

const router = Router();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'use YYYY-MM-DD');

const bodySchema = z.object({
  type: z.enum(['income', 'expense']),
  categoryId: z.coerce.number().int().positive(),
  amount: z.coerce.number().positive().max(999999999),
  description: z.string().trim().min(1).max(190),
  note: z.string().trim().max(500).optional().nullable(),
  paymentMethod: z.enum(['cash', 'upi', 'card', 'bank', 'other']).default('upi'),
  date,
});

const querySchema = z.object({
  search: z.string().trim().optional(),
  type: z.enum(['income', 'expense']).optional(),
  categoryId: z.coerce.number().int().optional(),
  paymentMethod: z.enum(['cash', 'upi', 'card', 'bank', 'other']).optional(),
  from: date.optional(),
  to: date.optional(),
  min: z.coerce.number().optional(),
  max: z.coerce.number().optional(),
  sort: z.enum(['date', 'amount']).default('date'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(15),
});

function buildFilters(userId, q) {
  const where = ['t.user_id = ?'];
  const params = [userId];
  if (q.search) { where.push('(t.description LIKE ? OR t.note LIKE ? OR c.name LIKE ?)'); params.push(`%${q.search}%`, `%${q.search}%`, `%${q.search}%`); }
  if (q.type) { where.push('t.type = ?'); params.push(q.type); }
  if (q.categoryId) { where.push('t.category_id = ?'); params.push(q.categoryId); }
  if (q.paymentMethod) { where.push('t.payment_method = ?'); params.push(q.paymentMethod); }
  if (q.from) { where.push('t.txn_date >= ?'); params.push(q.from); }
  if (q.to) { where.push('t.txn_date <= ?'); params.push(q.to); }
  if (q.min !== undefined) { where.push('t.amount >= ?'); params.push(q.min); }
  if (q.max !== undefined) { where.push('t.amount <= ?'); params.push(q.max); }
  return { clause: where.join(' AND '), params };
}

const SELECT = `SELECT t.id, t.type, t.amount, t.description, t.note, t.payment_method, t.txn_date, t.recurring_id,
  t.category_id, c.name AS category_name, c.color, c.icon
  FROM transactions t JOIN categories c ON c.id = t.category_id`;

async function assertCategory(userId, categoryId, type) {
  const [[cat]] = await pool.query('SELECT id, type FROM categories WHERE id = ? AND user_id = ?', [categoryId, userId]);
  if (!cat) throw new HttpError(400, 'Selected category does not exist');
  if (cat.type !== type) throw new HttpError(400, `Pick an ${type} category for this transaction`);
}

router.get('/', asyncHandler(async (req, res) => {
  const q = querySchema.parse(req.query);
  const { clause, params } = buildFilters(req.user.id, q);
  const join = 'FROM transactions t JOIN categories c ON c.id = t.category_id';
  const [[totals]] = await pool.query(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(CASE WHEN t.type='income' THEN t.amount END),0) AS income,
            COALESCE(SUM(CASE WHEN t.type='expense' THEN t.amount END),0) AS expense
     ${join} WHERE ${clause}`, params);
  const sortCol = q.sort === 'amount' ? 't.amount' : 't.txn_date';
  const [rows] = await pool.query(
    `${SELECT} WHERE ${clause} ORDER BY ${sortCol} ${q.order === 'asc' ? 'ASC' : 'DESC'}, t.id DESC LIMIT ? OFFSET ?`,
    [...params, q.limit, (q.page - 1) * q.limit]);
  res.json({
    data: rows,
    totals: { income: totals.income, expense: totals.expense, net: totals.income - totals.expense },
    pagination: { page: q.page, limit: q.limit, total: totals.total, pages: Math.max(1, Math.ceil(totals.total / q.limit)) },
  });
}));

router.get('/export', asyncHandler(async (req, res) => {
  const q = querySchema.parse(req.query);
  const { clause, params } = buildFilters(req.user.id, q);
  const [rows] = await pool.query(`${SELECT} WHERE ${clause} ORDER BY t.txn_date DESC, t.id DESC LIMIT 50000`, params);
  const csv = toCsv(rows, [
    { key: 'txn_date', label: 'Date' }, { key: 'type', label: 'Type' }, { key: 'category_name', label: 'Category' },
    { key: 'description', label: 'Description' }, { key: 'amount', label: 'Amount' },
    { key: 'payment_method', label: 'Payment Method' }, { key: 'note', label: 'Note' },
  ]);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="spendwise-transactions-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
}));

router.post('/', asyncHandler(async (req, res) => {
  const d = bodySchema.parse(req.body);
  await assertCategory(req.user.id, d.categoryId, d.type);
  const [r] = await pool.query(
    `INSERT INTO transactions (user_id, category_id, type, amount, description, note, payment_method, txn_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.user.id, d.categoryId, d.type, d.amount, d.description, d.note || null, d.paymentMethod, d.date]);
  res.status(201).json({ id: r.insertId });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const d = bodySchema.parse(req.body);
  await assertCategory(req.user.id, d.categoryId, d.type);
  const [r] = await pool.query(
    `UPDATE transactions SET category_id=?, type=?, amount=?, description=?, note=?, payment_method=?, txn_date=?
     WHERE id=? AND user_id=?`,
    [d.categoryId, d.type, d.amount, d.description, d.note || null, d.paymentMethod, d.date, req.params.id, req.user.id]);
  if (!r.affectedRows) throw new HttpError(404, 'Transaction not found');
  res.json({ message: 'Transaction updated' });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const [r] = await pool.query('DELETE FROM transactions WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!r.affectedRows) throw new HttpError(404, 'Transaction not found');
  res.json({ message: 'Transaction deleted' });
}));

export default router;
