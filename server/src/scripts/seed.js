import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';
import { seedDefaultCategories } from '../utils/defaultCategories.js';
import { shiftMonth, currentMonth, monthRange, today } from '../utils/helpers.js';

const EMAIL = 'demo@spendwise.app';
const PASSWORD = 'Demo@1234';

await pool.query('DELETE FROM users WHERE email = ?', [EMAIL]);
const [u] = await pool.query('INSERT INTO users (name, email, password_hash, currency) VALUES (?, ?, ?, ?)', ['Demo User', EMAIL, await bcrypt.hash(PASSWORD, 12), 'INR']);
const uid = u.insertId;
await seedDefaultCategories(uid);
const [cats] = await pool.query('SELECT id, name FROM categories WHERE user_id = ?', [uid]);
const id = Object.fromEntries(cats.map((c) => [c.name, c.id]));

const rnd = (min, max) => Math.round(min + Math.random() * (max - min));
const spend = [
  ['Food & Dining', ['Swiggy order', 'Zomato dinner', 'Cafe Leopold', 'Groceries - DMart', 'Chai & snacks'], 120, 900, 12],
  ['Shopping', ['Amazon order', 'Myntra', 'Decathlon', 'Croma'], 400, 4500, 4],
  ['Travel', ['Uber ride', 'Metro recharge', 'Petrol', 'Train ticket'], 80, 1800, 6],
  ['Bills & Utilities', ['Electricity bill', 'Mobile recharge', 'Internet bill'], 300, 1500, 3],
  ['Entertainment', ['Netflix', 'Movie night', 'Spotify', 'Gaming'], 150, 1200, 3],
  ['Health', ['Pharmacy', 'Gym membership'], 200, 1500, 1],
];
const rows = [];
for (let back = 5; back >= 0; back--) {
  const m = shiftMonth(currentMonth(), -back);
  const { days } = monthRange(m);
  const lastDay = back === 0 ? Math.min(days, Number(today().slice(8))) : days;
  const d = (n) => `${m}-${String(Math.max(1, Math.min(n, lastDay))).padStart(2, '0')}`;
  rows.push([uid, id.Salary, 'income', 85000 + rnd(0, 5000), 'Monthly salary', 'bank', d(1)]);
  if (back % 2 === 0) rows.push([uid, id.Freelance, 'income', rnd(8000, 20000), 'Freelance project', 'upi', d(14)]);
  rows.push([uid, id.Rent, 'expense', 22000, 'House rent', 'bank', d(3)]);
  for (const [cat, names, lo, hi, count] of spend) {
    for (let i = 0; i < count; i++) rows.push([uid, id[cat], 'expense', rnd(lo, hi), names[rnd(0, names.length - 1)], ['upi', 'card', 'cash'][rnd(0, 2)], d(rnd(2, lastDay))]);
  }
}
await pool.query('INSERT INTO transactions (user_id, category_id, type, amount, description, payment_method, txn_date) VALUES ?', [rows]);

const bm = `${currentMonth()}-01`;
const budgets = [['Food & Dining', 9000], ['Shopping', 6000], ['Travel', 5000], ['Entertainment', 2500], ['Bills & Utilities', 3500]];
await pool.query('INSERT INTO budgets (user_id, category_id, month, amount, alert_threshold) VALUES ?', [budgets.map(([n, a]) => [uid, id[n], bm, a, 80])]);

await pool.query('INSERT INTO savings_goals (user_id, name, icon, color, target_amount, saved_amount, deadline) VALUES ?', [[
  [uid, 'Goa trip', '🏖️', 'sky', 40000, 18500, `${shiftMonth(currentMonth(), 4)}-15`],
  [uid, 'Emergency fund', '🛟', 'emerald', 300000, 95000, null],
  [uid, 'New laptop', '💻', 'violet', 120000, 120000, null],
]]);
await pool.query("UPDATE savings_goals SET status='completed' WHERE user_id = ? AND saved_amount >= target_amount", [uid]);

await pool.query('INSERT INTO recurring_transactions (user_id, category_id, type, amount, description, frequency, next_run_date) VALUES ?', [[
  [uid, id.Entertainment, 'expense', 649, 'Netflix subscription', 'monthly', `${shiftMonth(currentMonth(), 1)}-05`],
  [uid, id.Rent, 'expense', 22000, 'House rent', 'monthly', `${shiftMonth(currentMonth(), 1)}-03`],
  [uid, id.Salary, 'income', 85000, 'Monthly salary', 'monthly', `${shiftMonth(currentMonth(), 1)}-01`],
]]);

console.log(`Seeded demo account -> ${EMAIL} / ${PASSWORD}`);
await pool.end();
