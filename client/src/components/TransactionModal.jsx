import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { errMsg } from '../lib/api';
import { cn, todayStr } from '../lib/format';
import { PAYMENT_METHODS } from '../lib/theme';
import { useData } from '../context/DataContext';
import { Field, Modal, Spinner } from './ui';

const blank = () => ({ type: 'expense', amount: '', categoryId: '', description: '', note: '', paymentMethod: 'upi', date: todayStr() });

export default function TransactionModal({ open, onClose, txn = null, onSaved }) {
  const { byType, bump } = useData();
  const [form, setForm] = useState(blank());
  const [saving, setSaving] = useState(false);
  const cats = byType(form.type);

  useEffect(() => {
    if (!open) return;
    setForm(txn ? {
      type: txn.type, amount: txn.amount, categoryId: txn.category_id, description: txn.description,
      note: txn.note || '', paymentMethod: txn.payment_method, date: txn.txn_date.slice(0, 10),
    } : blank());
  }, [open, txn]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setType = (type) => setForm((f) => ({ ...f, type, categoryId: '' }));

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { ...form, categoryId: Number(form.categoryId), amount: Number(form.amount) };
      if (txn) await api.put(`/transactions/${txn.id}`, body); else await api.post('/transactions', body);
      toast.success(txn ? 'Transaction updated' : 'Transaction added');
      bump();
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={txn ? 'Edit transaction' : 'Add transaction'}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-ink-100 p-1 dark:bg-ink-800" role="tablist">
          {['expense', 'income'].map((t) => (
            <button key={t} type="button" role="tab" aria-selected={form.type === t} onClick={() => setType(t)}
              className={cn('rounded-lg py-2 text-sm font-bold capitalize transition',
                form.type === t ? (t === 'expense' ? 'bg-white text-rose-600 shadow-card dark:bg-ink-900' : 'bg-white text-emerald-600 shadow-card dark:bg-ink-900') : 'text-ink-500')}>
              {t}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount"><input className="input" type="number" min="0.01" step="0.01" required value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="0.00" /></Field>
          <Field label="Date"><input className="input" type="date" required max="2100-01-01" value={form.date} onChange={(e) => set('date', e.target.value)} /></Field>
        </div>
        <Field label="Category">
          <select className="input" required value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
            <option value="">Select a category</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </Field>
        <Field label="Description"><input className="input" required maxLength={190} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="e.g. Lunch with team" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Paid via">
            <select className="input" value={form.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value)}>
              {PAYMENT_METHODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </Field>
          <Field label="Note (optional)"><input className="input" maxLength={500} value={form.note} onChange={(e) => set('note', e.target.value)} /></Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving && <Spinner className="h-4 w-4 text-white" />}{txn ? 'Save changes' : 'Add transaction'}</button>
        </div>
      </form>
    </Modal>
  );
}
