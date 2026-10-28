import { useEffect, useState } from 'react';
import { Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errMsg } from '../lib/api';
import { cn, currentMonth, money, monthLabel, shiftMonth } from '../lib/format';
import { STATUS_STYLES } from '../lib/theme';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { CategoryIcon, EmptyState, Field, Modal, MonthPicker, PageHeader, PageLoader, ProgressBar, useConfirm } from '../components/ui';

export default function Budgets() {
  const { user } = useAuth();
  const { byType, version, bump } = useData();
  const [month, setMonth] = useState(currentMonth());
  const [res, setRes] = useState(null);
  const [form, setForm] = useState(null); // { id?, categoryId, amount, alertThreshold }
  const [confirm, confirmDialog] = useConfirm();
  const fmt = (v) => money(v, user.currency);

  useEffect(() => {
    let alive = true;
    api.get('/budgets', { params: { month } }).then((r) => alive && setRes(r.data));
    return () => { alive = false; };
  }, [month, version]);

  if (!res) return <PageLoader />;
  const { data, summary } = res;
  const usedIds = new Set(data.map((b) => b.category_id));
  const available = byType('expense').filter((c) => !usedIds.has(c.id) || c.id === Number(form?.categoryId));
  const overall = summary.totalBudget ? (summary.totalSpent / summary.totalBudget) * 100 : 0;

  async function save(e) {
    e.preventDefault();
    try {
      await api.put('/budgets', { categoryId: Number(form.categoryId), month, amount: Number(form.amount), alertThreshold: Number(form.alertThreshold) });
      toast.success('Budget saved');
      setForm(null);
      bump();
    } catch (err) { toast.error(errMsg(err)); }
  }

  async function remove(b) {
    if (!(await confirm({ title: 'Remove budget?', text: `The ${b.category_name} budget for ${monthLabel(month)} will be removed.`, confirmLabel: 'Remove' }))) return;
    try { await api.delete(`/budgets/${b.id}`); bump(); } catch (e) { toast.error(errMsg(e)); }
  }

  async function copyPrev() {
    try {
      const r = await api.post('/budgets/copy', { from: shiftMonth(month, -1), to: month });
      toast[r.data.copied ? 'success' : 'error'](r.data.copied ? `${r.data.copied} budgets copied from last month` : 'No new budgets to copy from last month');
      bump();
    } catch (e) { toast.error(errMsg(e)); }
  }

  return (
    <>
      <PageHeader title="Budgets" subtitle="Set monthly limits and get warned before you cross them.">
        <MonthPicker month={month} onChange={setMonth} />
        <button type="button" className="btn-ghost" onClick={copyPrev}><Copy className="h-4 w-4" />Copy last month</button>
        <button type="button" className="btn-primary" onClick={() => setForm({ categoryId: '', amount: '', alertThreshold: 80 })}><Plus className="h-4 w-4" />Set budget</button>
      </PageHeader>

      {data.length > 0 && (
        <div className="card mb-5 p-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div><div className="text-sm font-semibold text-ink-500">Spent so far</div><div className="text-3xl font-extrabold">{fmt(summary.totalSpent)} <span className="text-base font-semibold text-ink-400">of {fmt(summary.totalBudget)}</span></div></div>
            <div className={cn('text-sm font-bold', summary.remaining < 0 ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400')}>{summary.remaining < 0 ? `${fmt(-summary.remaining)} over` : `${fmt(summary.remaining)} left`}</div>
          </div>
          <ProgressBar className="mt-4" value={overall} barClass={overall >= 100 ? 'bg-rose-500' : overall >= 80 ? 'bg-amber-500' : 'bg-brand-500'} />
        </div>
      )}

      {data.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((b) => (
            <div key={b.id} className="card p-5">
              <div className="flex items-start gap-3">
                <CategoryIcon icon={b.icon} color={b.color} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{b.category_name}</div>
                  <span className={cn('mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold', STATUS_STYLES[b.status].badge)}>{STATUS_STYLES[b.status].label}</span>
                </div>
                <button type="button" className="icon-btn" aria-label={`Edit ${b.category_name} budget`} onClick={() => setForm({ id: b.id, categoryId: b.category_id, amount: b.amount, alertThreshold: b.alert_threshold })}><Pencil className="h-4 w-4" /></button>
                <button type="button" className="icon-btn hover:text-rose-600" aria-label={`Remove ${b.category_name} budget`} onClick={() => remove(b)}><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="mt-5 flex items-baseline justify-between"><span className="text-xl font-extrabold">{fmt(b.spent)}</span><span className="text-sm text-ink-400">of {fmt(b.amount)}</span></div>
              <ProgressBar className="mt-2" value={b.pct} barClass={STATUS_STYLES[b.status].bar} />
              <div className="mt-2 flex justify-between text-xs text-ink-500"><span>{Math.round(b.pct)}% used</span><span>{b.remaining >= 0 ? `${fmt(b.remaining)} left` : `${fmt(-b.remaining)} over`}</span></div>
              <div className="mt-1 text-xs text-ink-400">Alert at {b.alert_threshold}%</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card"><EmptyState icon="🎯" title={`No budgets for ${monthLabel(month)}`} text="Pick a category like Food or Shopping and set a monthly limit." action={<button type="button" className="btn-primary" onClick={() => setForm({ categoryId: '', amount: '', alertThreshold: 80 })}>Set your first budget</button>} /></div>
      )}

      <Modal open={Boolean(form)} onClose={() => setForm(null)} title={form?.id ? 'Edit budget' : 'Set budget'}>
        {form && (
          <form onSubmit={save} className="space-y-4">
            <Field label="Category">
              <select className="input" required disabled={Boolean(form.id)} value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                <option value="">Select an expense category</option>
                {available.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </Field>
            <Field label={`Monthly limit (${user.currency})`}><input className="input" type="number" min="1" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
            <Field label={`Warn me at ${form.alertThreshold}% of the limit`}>
              <input className="w-full accent-brand-600" type="range" min="50" max="100" step="5" value={form.alertThreshold} onChange={(e) => setForm({ ...form, alertThreshold: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2 pt-2"><button type="button" className="btn-ghost" onClick={() => setForm(null)}>Cancel</button><button type="submit" className="btn-primary">Save budget</button></div>
          </form>
        )}
      </Modal>
      {confirmDialog}
    </>
  );
}
