import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../config/db.js';
import { asyncHandler, HttpError } from '../utils/helpers.js';

const router = Router();
const schema = z.object({
  name: z.string().trim().min(1).max(60),
  type: z.enum(['income', 'expense']),
  color: z.string().trim().min(1).max(20).default('slate'),
  icon: z.string().trim().min(1).max(16).default('💸'),
});

router.get('/', asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT c.*, (SELECT COUNT(*) FROM transactions t WHERE t.category_id = c.id) AS txn_count
     FROM categories c WHERE c.user_id = ? ORDER BY c.type, c.name`, [req.user.id]);
  res.json({ data: rows });
}));

router.post('/', asyncHandler(async (req, res) => {
  const d = schema.parse(req.body);
  const [r] = await pool.query('INSERT INTO categories (user_id, name, type, color, icon) VALUES (?, ?, ?, ?, ?)', [req.user.id, d.name, d.type, d.color, d.icon]);
  res.status(201).json({ id: r.insertId });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const d = schema.parse(req.body);
  const [r] = await pool.query('UPDATE categories SET name = ?, color = ?, icon = ? WHERE id = ? AND user_id = ?', [d.name, d.color, d.icon, req.params.id, req.user.id]);
  if (!r.affectedRows) throw new HttpError(404, 'Category not found');
  res.json({ message: 'Category updated' });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const [[used]] = await pool.query('SELECT COUNT(*) AS n FROM transactions WHERE category_id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (used.n) throw new HttpError(409, `${used.n} transactions use this category. Move or delete them first`);
  const [r] = await pool.query('DELETE FROM categories WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!r.affectedRows) throw new HttpError(404, 'Category not found');
  res.json({ message: 'Category deleted' });
}));

export default router;
