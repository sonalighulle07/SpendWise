import { useEffect, useState } from 'react';
import { CheckCircle2, Pencil, PiggyBank, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errMsg } from '../lib/api';
import { cn, fmtDate, money, todayStr } from '../lib/format';
import { COLOR_NAMES, EMOJIS, pal } from '../lib/theme';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { EmptyState, Field, Modal, PageHeader, PageLoader, ProgressBar, useConfirm } from '../components/ui';

const blank = { name: '', icon: '🎯', color: 'teal', targetAmount: '', deadline: '' };

function monthlyNeed(goal) {
  if (!goal.deadline || goal.status === 'completed') return null;
  const [y, m, d] = goal.deadline.split('-').map(Number);
  const now = new Date();
  const months = (y - now.getFullYear()) * 12 + (m - 1 - now.getMonth()) + (d >= now.getDate() ? 1 : 0);
  if (months <= 0) return 'overdue';
  return (goal.target_amount - goal.saved_amount) / months;
}

export default function Goals() {
  const { user } = useAuth();
  const { version, bump } = useData();
  const [goals, setGoals] = useState(null);
  const [form, setForm] = useState(null);
  const [deposit, setDeposit] = useState(null);
  const [confirm, confirmDialog] = useConfirm();
  const fmt = (v) => money(v, user.currency);

  useEffect(() => {
    let alive = true;
    api.get('/goals').then((r) => alive && setGoals(r.data.data));
    return () => { alive = false; };
  }, [version]);

  if (!goals) return <PageLoader />;

  async function save(e) {
    e.preventDefault();
    try {
      const body = { ...form, targetAmount: Number(form.targetAmount), deadline: form.deadline || null };
      if (form.id) await api.put(`/goals/${form.id}`, body); else await api.post('/goals', body);
      toast.success(form.id ? 'Goal updated' : 'Goal created');
      setForm(null);
      bump();
    } catch (err) { toast.error(errMsg(err)); }
  }

  async function contribute(e) {
    e.preventDefault();
    try {
      const r = await api.post(`/goals/${deposit.goal.id}/contribute`, { amount: Number(deposit.amount), note: deposit.note || undefined });
      toast.success(r.data.message);
      setDeposit(null);
      bump();
    } catch (err) { toast.error(errMsg(err)); }
  }

  async function remove(g) {
    if (!(await confirm({ title: 'Delete goal?', text: `"${g.name}" and its deposit history will be deleted.` }))) return;
    try { await api.delete(`/goals/${g.id}`); bump(); } catch (e) { toast.error(errMsg(e)); }
  }

  const totalSaved = goals.reduce((s, g) => s + g.saved_amount, 0);

  return (
    <>
      <PageHeader title="Savings goals" subtitle={goals.length ? `${fmt(totalSaved)} saved across ${goals.length} goals` : 'Save for something that matters.'}>
        <button type="button" className="btn-primary" onClick={() => setForm({ ...blank, deadline: '' })}><Plus className="h-4 w-4" />New goal</button>
      </PageHeader>

      {goals.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {goals.map((g) => {
            const need = monthlyNeed(g);
            const done = g.status === 'completed';
            return (
              <div key={g.id} className="card flex flex-col p-5">
                <div className="flex items-start gap-3">
                  <span className={cn('flex h-12 w-12 items-center justify-center rounded-2xl text-2xl', pal(g.color).soft)} aria-hidden="true">{g.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">{g.name}</div>
                    <div className="text-xs text-ink-400">{g.deadline ? `By ${fmtDate(g.deadline)}` : 'No deadline'}</div>
                  </div>
                  {done && <CheckCircle2 className="h-5 w-5 text-emerald-500" aria-label="Completed" />}
                  <button type="button" className="icon-btn" aria-label={`Edit ${g.name}`} onClick={() => setForm({ id: g.id, name: g.name, icon: g.icon, color: g.color, targetAmount: g.target_amount, deadline: g.deadline || '' })}><Pencil className="h-4 w-4" /></button>
                  <button type="button" className="icon-btn hover:text-rose-600" aria-label={`Delete ${g.name}`} onClick={() => remove(g)}><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="mt-5 flex items-baseline justify-between"><span className="text-xl font-extrabold">{fmt(g.saved_amount)}</span><span className="text-sm text-ink-400">of {fmt(g.target_amount)}</span></div>
                <ProgressBar className="mt-2" value={g.pct} barClass={done ? 'bg-emerald-500' : pal(g.color).bar} />
                <div className="mt-2 text-xs text-ink-500">
                  {done ? 'Goal reached 🎉' : need === 'overdue' ? 'Deadline passed' : need ? `Save about ${fmt(Math.ceil(need))} per month to hit the deadline` : `${g.pct}% saved`}
                </div>
                {!done && <button type="button" className="btn-ghost mt-4 w-full" onClick={() => setDeposit({ goal: g, amount: '', note: '' })}><PiggyBank className="h-4 w-4" />Add money</button>}
              </div>
            );
          })}
        </div>
      ) : <div className="card"><EmptyState icon="🏖️" title="No goals yet" text="Create a goal for a trip, a gadget or an emergency fund and add money whenever you can." action={<button type="button" className="btn-primary" onClick={() => setForm({ ...blank })}>Create a goal</button>} /></div>}

      <Modal open={Boolean(form)} onClose={() => setForm(null)} title={form?.id ? 'Edit goal' : 'New savings goal'}>
        {form && (
          <form onSubmit={save} className="space-y-4">
            <Field label="Goal name"><input className="input" required maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Goa trip" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={`Target (${user.currency})`}><input className="input" type="number" min="1" required value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} /></Field>
              <Field label="Deadline (optional)"><input className="input" type="date" min={todayStr()} value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></Field>
            </div>
            <div>
              <span className="label">Icon</span>
              <div className="flex flex-wrap gap-1.5">{EMOJIS.map((em) => (
                <button key={em} type="button" onClick={() => setForm({ ...form, icon: em })} aria-pressed={form.icon === em} className={cn('h-9 w-9 rounded-lg text-lg transition', form.icon === em ? 'bg-brand-100 ring-2 ring-brand-500 dark:bg-brand-500/20' : 'hover:bg-ink-100 dark:hover:bg-ink-800')}>{em}</button>
              ))}</div>
            </div>
            <div>
              <span className="label">Colour</span>
              <div className="flex flex-wrap gap-2">{COLOR_NAMES.map((c) => (
                <button key={c} type="button" onClick={() => setForm({ ...form, color: c })} aria-label={c} aria-pressed={form.color === c} className={cn('h-7 w-7 rounded-full transition', pal(c).dot, form.color === c && 'ring-2 ring-ink-900 ring-offset-2 dark:ring-white dark:ring-offset-ink-900')} />
              ))}</div>
            </div>
            <div className="flex justify-end gap-2 pt-2"><button type="button" className="btn-ghost" onClick={() => setForm(null)}>Cancel</button><button type="submit" className="btn-primary">{form.id ? 'Save changes' : 'Create goal'}</button></div>
          </form>
        )}
      </Modal>

      <Modal open={Boolean(deposit)} onClose={() => setDeposit(null)} title={`Add money to ${deposit?.goal.name || ''}`}>
        {deposit && (
          <form onSubmit={contribute} className="space-y-4">
            <Field label={`Amount (${user.currency})`} hint={`${fmt(deposit.goal.target_amount - deposit.goal.saved_amount)} left to reach the target`}><input className="input" type="number" min="1" step="0.01" required value={deposit.amount} onChange={(e) => setDeposit({ ...deposit, amount: e.target.value })} /></Field>
            <Field label="Note (optional)"><input className="input" maxLength={190} value={deposit.note} onChange={(e) => setDeposit({ ...deposit, note: e.target.value })} /></Field>
            <div className="flex justify-end gap-2 pt-2"><button type="button" className="btn-ghost" onClick={() => setDeposit(null)}>Cancel</button><button type="submit" className="btn-primary">Add money</button></div>
          </form>
        )}
      </Modal>
      {confirmDialog}
    </>
  );
}
