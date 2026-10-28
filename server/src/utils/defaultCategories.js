import { pool } from '../config/db.js';

export const DEFAULT_CATEGORIES = [
  { name: 'Salary', type: 'income', color: 'emerald', icon: '💼' },
  { name: 'Freelance', type: 'income', color: 'teal', icon: '💻' },
  { name: 'Investments', type: 'income', color: 'sky', icon: '📈' },
  { name: 'Other Income', type: 'income', color: 'lime', icon: '🎁' },
  { name: 'Food & Dining', type: 'expense', color: 'orange', icon: '🍜' },
  { name: 'Rent', type: 'expense', color: 'violet', icon: '🏠' },
  { name: 'Shopping', type: 'expense', color: 'pink', icon: '🛍️' },
  { name: 'Travel', type: 'expense', color: 'sky', icon: '✈️' },
  { name: 'Bills & Utilities', type: 'expense', color: 'amber', icon: '💡' },
  { name: 'Entertainment', type: 'expense', color: 'rose', icon: '🎬' },
  { name: 'Health', type: 'expense', color: 'red', icon: '🩺' },
  { name: 'Education', type: 'expense', color: 'indigo', icon: '📚' },
  { name: 'Other', type: 'expense', color: 'slate', icon: '📦' },
];

export async function seedDefaultCategories(userId, conn = pool) {
  const values = DEFAULT_CATEGORIES.map((c) => [userId, c.name, c.type, c.color, c.icon]);
  await conn.query('INSERT IGNORE INTO categories (user_id, name, type, color, icon) VALUES ?', [values]);
}
