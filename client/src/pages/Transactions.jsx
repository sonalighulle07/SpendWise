import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download, Pencil, Search, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errMsg } from '../lib/api';
import { cn, downloadBlob, fmtDate, money } from '../lib/format';
import { PAYMENT_METHODS } from '../lib/theme';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { CategoryIcon, EmptyState, PageHeader, Spinner, useConfirm } from '../components/ui';
import TransactionModal from '../components/TransactionModal';

const INITIAL = { search: '', type: '', categoryId: '', paymentMethod: '', from: '', to: '', min: '', max: '', sort: 'date', order: 'desc', page: 1 };

export default function Transactions() {
  const { user } = useAuth();
  const { categories, version, bump } = useData();
  const [filters, setFilters] = useState(INITIAL);
  const [searchText, setSearchText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [confirm, confirmDialog] = useConfirm();
  const fmt = (v) => money(v, user.currency);

  const params = useCallback(() => Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '')), [filters]);

  useEffect(() => { // debounce the search box
    const t = setTimeout(() => setFilters((f) => (f.search === searchText ? f : { ...f, search: searchText, page: 1 })), 350);
    return () => clearTimeout(t);
  }, [searchText]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.get('/transactions', { params: params() })
      .then((r) => alive && setResult(r.data))
      .catch((e) => toast.error(errMsg(e)))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [params, version]);

  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v, page: 1 }));
  const activeCount = ['search', 'type', 'categoryId', 'paymentMethod', 'from', 'to', 'min', 'max'].filter((k) => filters[k] !== '').length;
  const toggleSort = (col) => setFilters((f) => ({ ...f, sort: col, order: f.sort === col && f.order === 'desc' ? 'asc' : 'desc', page: 1 }));
  const reset = () => { setSearchText(''); setFilters(INITIAL); };

  async function remove(t) {
    if (!(await confirm({ title: 'Delete transaction?', text: `"${t.description}" for ${fmt(t.amount)} will be removed permanently.` }))) return;
    try { await api.delete(`/transactions/${t.id}`); toast.success('Transaction deleted'); bump(); } catch (e) { toast.error(errMsg(e)); }
  }

  async function exportCsv() {
    try {
      const { page, limit, ...rest } = params();
      const res = await api.get('/transactions/export', { params: rest, responseType: 'blob' });
      downloadBlob(res.data, `spendwise-transactions-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success('CSV downloaded');
    } catch (e) { toast.error(errMsg(e)); }
  }

  const SortIcon = ({ col }) => (filters.sort === col ? (filters.order === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />) : null);
  const t = result?.totals;
  const p = result?.pagination;

  return (
    <>
      <PageHeader title="Transactions" subtitle="Search, filter and export everything you have recorded.">
        <button type="button" className="btn-ghost" onClick={exportCsv}><Download className="h-4 w-4" />Export CSV</button>
      </PageHeader>

      <div className="card mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input className="input pl-10" placeholder="Search description, note or category" value={searchText} onChange={(e) => setSearchText(e.target.value)} aria-label="Search transactions" />
          </div>
          <select className="input" value={filters.type} onChange={(e) => set('type', e.target.value)} aria-label="Type">
            <option value="">All types</option><option value="income">Income</option><option value="expense">Expense</option>
          </select>
          <select className="input" value={filters.categoryId} onChange={(e) => set('categoryId', e.target.value)} aria-label="Category">
            <option value="">All categories</option>
            {categories.filter((c) => !filters.type || c.type === filters.type).map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <input className="input" type="date" value={filters.from} onChange={(e) => set('from', e.target.value)} aria-label="From date" />
          <input className="input" type="date" value={filters.to} onChange={(e) => set('to', e.target.value)} aria-label="To date" />
          <select className="input" value={filters.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value)} aria-label="Payment method">
            <option value="">Any payment method</option>
            {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <div className="flex gap-2">
            <input className="input" type="number" min="0" placeholder="Min" value={filters.min} onChange={(e) => set('min', e.target.value)} aria-label="Minimum amount" />
            <input className="input" type="number" min="0" placeholder="Max" value={filters.max} onChange={(e) => set('max', e.target.value)} aria-label="Maximum amount" />
          </div>
        </div>
        {activeCount > 0 && (
          <button type="button" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:underline" onClick={reset}><X className="h-3 w-3" />Clear {activeCount} filter{activeCount > 1 ? 's' : ''}</button>
        )}
      </div>

      {t && (
        <div className="mb-4 grid grid-cols-3 gap-3">
          {[['Income', t.income, 'text-emerald-600 dark:text-emerald-400'], ['Expenses', t.expense, 'text-rose-600 dark:text-rose-400'], ['Net', t.net, t.net >= 0 ? 'text-ink-900 dark:text-white' : 'text-rose-600']].map(([label, value, tone]) => (
            <div key={label} className="card px-4 py-3"><div className="text-xs font-semibold text-ink-500">{label}{activeCount ? ' (filtered)' : ''}</div><div className={cn('text-lg font-extrabold', tone)}>{fmt(value)}</div></div>
          ))}
        </div>
      )}

      <div className="card overflow-hidden">
        {loading && !result ? <div className="flex justify-center py-16"><Spinner className="h-6 w-6" /></div> : result?.data.length ? (
          <div className={cn('overflow-x-auto transition-opacity', loading && 'opacity-60')}>
            <table className="w-full min-w-[720px]">
              <thead className="border-b border-ink-100 dark:border-ink-800">
                <tr>
                  <th className="th"><button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort('date')}>Date <SortIcon col="date" /></button></th>
                  <th className="th">Description</th><th className="th">Category</th><th className="th">Paid via</th>
                  <th className="th text-right"><button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort('amount')}>Amount <SortIcon col="amount" /></button></th>
                  <th className="th w-24"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                {result.data.map((r) => (
                  <tr key={r.id} className="hover:bg-ink-50 dark:hover:bg-ink-800/50">
                    <td className="td whitespace-nowrap text-ink-500">{fmtDate(r.txn_date)}</td>
                    <td className="td"><div className="font-semibold">{r.description}</div>{r.note && <div className="max-w-xs truncate text-xs text-ink-400">{r.note}</div>}</td>
                    <td className="td"><span className="inline-flex items-center gap-2"><CategoryIcon icon={r.icon} color={r.color} size="sm" />{r.category_name}</span></td>
                    <td className="td capitalize text-ink-500">{r.payment_method}</td>
                    <td className={cn('td text-right font-extrabold', r.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : '')}>{r.type === 'income' ? '+' : '-'}{fmt(r.amount)}</td>
                    <td className="td text-right">
                      <button type="button" className="icon-btn" onClick={() => setEditing(r)} aria-label={`Edit ${r.description}`}><Pencil className="h-4 w-4" /></button>
                      <button type="button" className="icon-btn hover:text-rose-600" onClick={() => remove(r)} aria-label={`Delete ${r.description}`}><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon="🔍" title={activeCount ? 'No matching transactions' : 'No transactions yet'} text={activeCount ? 'Try removing a filter or widening the date range.' : 'Press N to add your first transaction.'} action={activeCount ? <button type="button" className="btn-ghost" onClick={reset}>Clear filters</button> : null} />
        )}
        {p && p.total > 0 && (
          <div className="flex items-center justify-between border-t border-ink-100 px-4 py-3 text-sm dark:border-ink-800">
            <span className="text-ink-500">{(p.page - 1) * p.limit + 1}-{Math.min(p.page * p.limit, p.total)} of {p.total}</span>
            <div className="flex items-center gap-1">
              <button type="button" className="icon-btn disabled:opacity-30" disabled={p.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
              <span className="px-2 font-semibold">{p.page} / {p.pages}</span>
              <button type="button" className="icon-btn disabled:opacity-30" disabled={p.page >= p.pages} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))} aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </div>

      <TransactionModal open={Boolean(editing)} txn={editing} onClose={() => setEditing(null)} />
      {confirmDialog}
    </>
  );
}
