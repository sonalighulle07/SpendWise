import cron from 'node-cron';
import { pool } from '../config/db.js';
import { nextRunDate, today } from '../utils/helpers.js';

/** Creates every transaction that is due (catches up on missed runs). Optionally limited to one user. */
export async function processDueRecurring(userId = null) {
  const params = [today()];
  let sql = 'SELECT * FROM recurring_transactions WHERE is_active = 1 AND next_run_date <= ?';
  if (userId) { sql += ' AND user_id = ?'; params.push(userId); }
  const [rules] = await pool.query(sql, params);

  let created = 0;
  for (const rule of rules) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      let run = rule.next_run_date;
      let guard = 0;
      while (run <= today() && (!rule.end_date || run <= rule.end_date) && guard++ < 400) {
        await conn.query(
          `INSERT INTO transactions (user_id, category_id, recurring_id, type, amount, description, payment_method, txn_date)
           VALUES (?, ?, ?, ?, ?, ?, 'bank', ?)`,
          [rule.user_id, rule.category_id, rule.id, rule.type, rule.amount, rule.description, run]
        );
        created++;
        run = nextRunDate(run, rule.frequency);
      }
      const finished = rule.end_date && run > rule.end_date;
      await conn.query('UPDATE recurring_transactions SET next_run_date = ?, is_active = ? WHERE id = ?', [run, finished ? 0 : 1, rule.id]);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      console.error('Recurring rule failed:', rule.id, err.message);
    } finally {
      conn.release();
    }
  }
  return created;
}

export function startRecurringJob() {
  processDueRecurring().catch((e) => console.error('Recurring startup run failed', e));
  cron.schedule('5 0 * * *', () => processDueRecurring().catch((e) => console.error(e)));
}
