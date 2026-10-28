import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../config/db.js';
import { asyncHandler, HttpError } from '../utils/helpers.js';

const router = Router();
const schema = z.object({
  name: z.string().trim().min(1).max(100),
  icon: z.string().trim().min(1).max(16).default('🎯'),
  color: z.string().trim().min(1).max(20).default('teal'),
  targetAmount: z.coerce.number().positive().max(999999999),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable().or(z.literal('')),
});

router.get('/', asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM savings_goals WHERE user_id = ? ORDER BY status, deadline IS NULL, deadline, id DESC', [req.user.id]);
  const data = rows.map((g) => ({ ...g, pct: Math.min(100, Math.round((g.saved_amount / g.target_amount) * 1000) / 10) }));
  res.json({ data });
}));

router.post('/', asyncHandler(async (req, res) => {
  const d = schema.parse(req.body);
  const [r] = await pool.query('INSERT INTO savings_goals (user_id, name, icon, color, target_amount, deadline) VALUES (?, ?, ?, ?, ?, ?)',
    [req.user.id, d.name, d.icon, d.color, d.targetAmount, d.deadline || null]);
  res.status(201).json({ id: r.insertId });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const d = schema.parse(req.body);
  const [r] = await pool.query(
    `UPDATE savings_goals SET name=?, icon=?, color=?, target_amount=?, deadline=?,
       status = IF(saved_amount >= ?, 'completed', 'active') WHERE id=? AND user_id=?`,
    [d.name, d.icon, d.color, d.targetAmount, d.deadline || null, d.targetAmount, req.params.id, req.user.id]);
  if (!r.affectedRows) throw new HttpError(404, 'Goal not found');
  res.json({ message: 'Goal updated' });
}));

router.post('/:id/contribute', asyncHandler(async (req, res) => {
  const { amount, note } = z.object({ amount: z.coerce.number().positive().max(999999999), note: z.string().trim().max(190).optional() }).parse(req.body);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[goal]] = await conn.query('SELECT * FROM savings_goals WHERE id = ? AND user_id = ? FOR UPDATE', [req.params.id, req.user.id]);
    if (!goal) throw new HttpError(404, 'Goal not found');
    const saved = goal.saved_amount + amount;
    await conn.query('INSERT INTO goal_contributions (goal_id, amount, note) VALUES (?, ?, ?)', [goal.id, amount, note || null]);
    await conn.query("UPDATE savings_goals SET saved_amount = ?, status = ? WHERE id = ?", [saved, saved >= goal.target_amount ? 'completed' : 'active', goal.id]);
    await conn.commit();
    res.json({ message: saved >= goal.target_amount ? 'Goal completed! 🎉' : 'Contribution added', completed: saved >= goal.target_amount });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}));

router.get('/:id/contributions', asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT gc.* FROM goal_contributions gc JOIN savings_goals g ON g.id = gc.goal_id
     WHERE g.id = ? AND g.user_id = ? ORDER BY gc.contributed_at DESC LIMIT 50`, [req.params.id, req.user.id]);
  res.json({ data: rows });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const [r] = await pool.query('DELETE FROM savings_goals WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!r.affectedRows) throw new HttpError(404, 'Goal not found');
  res.json({ message: 'Goal deleted' });
}));

export default router;
