import { pool } from '../config/db.js';
import { monthRange } from '../utils/helpers.js';

export function budgetStatus(pct, threshold) {
  if (pct >= 100) return 'exceeded';
  if (pct >= threshold) return 'warning';
  return 'ok';
}

export async function getBudgetsWithSpend(userId, month) {
  const { start, end } = monthRange(month);
  const [rows] = await pool.query(
    `SELECT b.id, b.category_id, b.amount, b.alert_threshold,
            c.name AS category_name, c.color, c.icon,
            COALESCE((SELECT SUM(t.amount) FROM transactions t
                      WHERE t.user_id = b.user_id AND t.category_id = b.category_id
                        AND t.type = 'expense' AND t.txn_date BETWEEN ? AND ?), 0) AS spent
     FROM budgets b JOIN categories c ON c.id = b.category_id
     WHERE b.user_id = ? AND b.month = ?
     ORDER BY c.name`,
    [start, end, userId, start]
  );
  return rows.map((r) => {
    const pct = r.amount > 0 ? (r.spent / r.amount) * 100 : 0;
    return { ...r, remaining: r.amount - r.spent, pct: Math.round(pct * 10) / 10, status: budgetStatus(pct, r.alert_threshold) };
  });
}
