import { useEffect, useState } from 'react';
import { Pause, Play, Plus, RefreshCw, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errMsg } from '../lib/api';
import { cn, fmtDate, money, todayStr } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { CategoryIcon, EmptyState, Field, Modal, PageHeader, PageLoader, useConfirm } from '../components/ui';

const FREQ = { daily: 'Every day', weekly: 'Every week', monthly: 'Every month', yearly: 'Every year' };
const blank = () => ({ type: 'expense', categoryId: '', amount: '', description: '', frequency: 'monthly', startDate: todayStr(), endDate: '' });

export default function Recurring() {
  const { user } = useAuth();
  const { byType, version, bump } = useData();
  const [rules, setRules] = useState(null);
  const [form, setForm] = useState(null);
  const [confirm, confirmDialog] = useConfirm();
  const fmt = (v) => money(v, user.currency);

  useEffect(() => {
    let alive = true;
    api.get('/recurring').then((r) => alive && setRules(r.data.data));
    return () => { alive = false; };
  }, [version]);

  if (!rules) return <PageLoader />;

  async function save(e) {
    e.preventDefault();
    try {
      const r = await api.post('/recurring', { ...form, categoryId: Number(form.categoryId), amount: Number(form.amount), endDate: form.endDate || null });
      toast.success(r.data.created ? `Rule saved. ${r.data.created} past transactions were created` : 'Rule saved');
      setForm(null);
      bump();
    } catch (err) { toast.error(errMsg(err)); }
  }

  const act = (fn, ok) => async () => { try { const r = await fn(); toast.success(ok || r?.data?.message || 'Done'); bump(); } catch (e) { toast.error(errMsg(e)); } };

  async function remove(r) {
    if (!(await confirm({ title: 'Delete rule?', text: `"${r.description}" will stop repeating. Past transactions are kept.` }))) return;
    act(() => api.delete(`/recurring/${r.id}`), 'Rule deleted')();
  }

  return (
    <>
      <PageHeader title="Recurring transactions" subtitle="Rent, salary and subscriptions get added automatically on their due date.">
        <button type="button" className="btn-ghost" onClick={act(() => api.post('/recurring/run'))}><RefreshCw className="h-4 w-4" />Run due now</button>
        <button type="button" className="btn-primary" onClick={() => setForm(blank())}><Plus className="h-4 w-4" />New rule</button>
      </PageHeader>

      {rules.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rules.map((r) => (
            <div key={r.id} className={cn('card p-5', !r.is_active && 'opacity-60')}>
              <div className="flex items-start gap-3">
                <CategoryIcon icon={r.icon} color={r.color} />
                <div className="min-w-0 flex-1"><div className="truncate font-bold">{r.description}</div><div className="text-xs text-ink-400">{r.category_name} · {FREQ[r.frequency]}</div></div>
                <div className={cn('text-right font-extrabold', r.type === 'income' && 'text-emerald-600 dark:text-emerald-400')}>{r.type === 'income' ? '+' : '-'}{fmt(r.amount)}</div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3 dark:border-ink-800">
                <span className="text-xs text-ink-500">{r.is_active ? `Next: ${fmtDate(r.next_run_date)}` : 'Paused'}{r.end_date ? ` · ends ${fmtDate(r.end_date)}` : ''}</span>
                <div>
                  <button type="button" className="icon-btn" aria-label={r.is_active ? 'Pause' : 'Resume'} onClick={act(() => api.patch(`/recurring/${r.id}/toggle`), r.is_active ? 'Paused' : 'Resumed')}>{r.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button>
                  <button type="button" className="icon-btn hover:text-rose-600" aria-label="Delete rule" onClick={() => remove(r)}><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : <div className="card"><EmptyState icon="🔁" title="Nothing repeats yet" text="Add your rent, salary or Netflix once and SpendWise records it every time it is due." action={<button type="button" className="btn-primary" onClick={() => setForm(blank())}>Add a recurring rule</button>} /></div>}

      <Modal open={Boolean(form)} onClose={() => setForm(null)} title="New recurring rule">
        {form && (
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type"><select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, categoryId: '' })}><option value="expense">Expense</option><option value="income">Income</option></select></Field>
              <Field label="Repeats"><select className="input" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>{Object.entries(FREQ).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
            </div>
            <Field label="Category"><select className="input" required value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}><option value="">Select a category</option>{byType(form.type).map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select></Field>
            <Field label="Description"><input className="input" required maxLength={190} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Netflix subscription" /></Field>
            <Field label={`Amount (${user.currency})`}><input className="input" type="number" min="0.01" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="First date"><input className="input" type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
              <Field label="End date (optional)"><input className="input" type="date" min={form.startDate} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></Field>
            </div>
            <div className="flex justify-end gap-2 pt-2"><button type="button" className="btn-ghost" onClick={() => setForm(null)}>Cancel</button><button type="submit" className="btn-primary">Save rule</button></div>
          </form>
        )}
      </Modal>
      {confirmDialog}
    </>
  );
}
