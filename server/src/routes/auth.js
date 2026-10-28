import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool } from '../config/db.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../utils/helpers.js';
import { seedDefaultCategories } from '../utils/defaultCategories.js';

const router = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, 'must be at least 8 characters').max(72),
});
const loginSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) });
const profileSchema = z.object({ name: z.string().trim().min(2).max(100), currency: z.string().length(3).toUpperCase() });
const passwordSchema = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8).max(72) });

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, currency: u.currency, created_at: u.created_at });

router.post('/register', asyncHandler(async (req, res) => {
  const { name, email, password } = registerSchema.parse(req.body);
  const [exists] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  if (exists.length) throw new HttpError(409, 'An account with this email already exists');
  const hash = await bcrypt.hash(password, 12);
  const [result] = await pool.query('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', [name, email, hash]);
  await seedDefaultCategories(result.insertId);
  const [[user]] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
  res.status(201).json({ token: signToken(user.id), user: publicUser(user) });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const [[user]] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  const ok = user && (await bcrypt.compare(password, user.password_hash));
  if (!ok) throw new HttpError(401, 'Incorrect email or password');
  res.json({ token: signToken(user.id), user: publicUser(user) });
}));

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const [[user]] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!user) throw new HttpError(401, 'Account not found');
  res.json({ user: publicUser(user) });
}));

router.put('/profile', requireAuth, asyncHandler(async (req, res) => {
  const { name, currency } = profileSchema.parse(req.body);
  await pool.query('UPDATE users SET name = ?, currency = ? WHERE id = ?', [name, currency, req.user.id]);
  const [[user]] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
  res.json({ user: publicUser(user) });
}));

router.put('/password', requireAuth, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = passwordSchema.parse(req.body);
  const [[user]] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!(await bcrypt.compare(currentPassword, user.password_hash))) throw new HttpError(400, 'Current password is incorrect');
  await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [await bcrypt.hash(newPassword, 12), req.user.id]);
  res.json({ message: 'Password updated' });
}));

export default router;
