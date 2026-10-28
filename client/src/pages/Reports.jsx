import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Download, FileSpreadsheet, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errMsg } from '../lib/api';
import { cn, currentMonth, downloadBlob, fmtDate, money, monthEnd, monthLabel, rowsToCsv, shiftMonth, todayStr } from '../lib/format';
import { pal } from '../lib/theme';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { CategoryIcon, ChartTooltip, EmptyState, PageHeader, PageLoader } from '../components/ui';

const PRESETS = [
  { id: 'month', label: 'This month', range: () => [`${currentMonth()}-01`, todayStr()] },
  { id: 'last', label: 'Last month', range: () => [`${shiftMonth(currentMonth(), -1)}-01`, monthEnd(shiftMonth(currentMonth(), -1))] },
  { id: '3m', label: 'Last 3 months', range: () => [`${shiftMonth(currentMonth(), -2)}-01`, todayStr()] },
  { id: '6m', label: 'Last 6 months', range: () => [`${shiftMonth(currentMonth(), -5)}-01`, todayStr()] },
  { id: 'year', label: 'This year', range: () => [`${new Date().getFullYear()}-01-01`, todayStr()] },
  { id: 'custom', label: 'Custom' },
];

export default function Reports() {
  const { user } = useAuth();
  const { version } = useData();
  const [preset, setPreset] = useState('6m');
  const [[from, to], setRange] = useState(PRESETS[3].range());
  const [r, setR] = useState(null);
  const cur = user.currency;
  const fmt = (v) => money(v, cur);
  const tick = { fill: 'currentColor', fontSize: 12 };

  useEffect(() => {
    if (!from || !to || from > to) return undefined;
    let alive = true;
    api.get('/analytics/report', { params: { from, to } }).then((res) => alive && setR(res.data)).catch((e) => toast.error(errMsg(e)));
    return () => { alive = false; };
  }, [from, to, version]);

  function pick(p) {
    setPreset(p.id);
    if (p.range) setRange(p.range());
  }

  async function exportTransactions() {
    try {
      const res = await api.get('/transactions/export', { params: { from, to }, responseType: 'blob' });
      downloadBlob(res.data, `spendwise-transactions-${from}-to-${to}.csv`);
    } catch (e) { toast.error(errMsg(e)); }
  }

  function exportSummary() {
    const rows = [
      ...r.monthly.map((m) => ({ section: 'Monthly', name: monthLabel(m.month), income: m.income, expense: m.expense, savings: m.savings, share: '' })),
      ...r.expenseCategories.map((c) => ({ section: 'Expense by category', name: c.name, income: '', expense: c.total, savings: '', share: `${c.pct}%` })),
      ...r.incomeCategories.map((c) => ({ section: 'Income by category', name: c.name, income: c.total, expense: '', savings: '', share: `${c.pct}%` })),
    ];
    downloadBlob(rowsToCsv(rows, [{ key: 'section', label: 'Section' }, { key: 'name', label: 'Name' }, { key: 'income', label: 'Income' }, { key: 'expense', label: 'Expense' }, { key: 'savings', label: 'Savings' }, { key: 'share', label: 'Share' }]), `spendwise-summary-${from}-to-${to}.csv`);
  }

  if (!r) return <PageLoader />;
  const s = r.summary;
  const monthly = r.monthly.map((m) => ({ ...m, label: monthLabel(m.month, false) }));
  const pie = r.expenseCategories.map((c) => ({ name: c.name, value: c.total, fill: pal(c.color).hex }));
  const rate = s.income ? Math.round((s.savings / s.income) * 100) : 0;

  return (
    <>
      <PageHeader title="Reports" subtitle={`${fmtDate(from)} to ${fmtDate(to)}`}>
        <button type="button" className="btn-ghost print:hidden" onClick={() => window.print()}><Printer className="h-4 w-4" />Print / PDF</button>
        <button type="button" className="btn-ghost print:hidden" onClick={exportSummary}><FileSpreadsheet className="h-4 w-4" />Summary CSV</button>
        <button type="button" className="btn-primary print:hidden" onClick={exportTransactions}><Download className="h-4 w-4" />Transactions CSV</button>
      </PageHeader>

      <div className="mb-5 flex flex-wrap items-center gap-2 print:hidden">
        {PRESETS.map((p) => (
          <button key={p.id} type="button" onClick={() => pick(p)} aria-pressed={preset === p.id}
            className={cn('rounded-full px-4 py-1.5 text-sm font-semibold transition', preset === p.id ? 'bg-brand-700 text-white' : 'bg-white text-ink-600 hover:bg-ink-50 dark:bg-ink-900 dark:text-ink-300')}>{p.label}</button>
        ))}
        {preset === 'custom' && (
          <div className="flex items-center gap-2">
            <input className="input w-auto" type="date" value={from} max={to} onChange={(e) => setRange([e.target.value, to])} aria-label="From" />
            <span className="text-ink-400">to</span>
            <input className="input w-auto" type="date" value={to} min={from} onChange={(e) => setRange([from, e.target.value])} aria-label="To" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[['Income', fmt(s.income), 'text-emerald-600 dark:text-emerald-400'], ['Expenses', fmt(s.expense), 'text-rose-600 dark:text-rose-400'], ['Net savings', fmt(s.savings), s.savings >= 0 ? '' : 'text-rose-600'], ['Savings rate', `${rate}%`, '']].map(([l, v, tone]) => (
          <div key={l} className="card p-5"><div className="text-sm font-semibold text-ink-500">{l}</div><div className={cn('mt-2 text-2xl font-extrabold', tone)}>{v}</div></div>
        ))}
      </div>

      {s.transactions === 0 ? <div className="card mt-4"><EmptyState icon="📊" title="No data for this period" text="Choose a different date range to see your report." /></div> : (
        <>
          <div className="mt-4 grid gap-4 lg:grid-cols-5">
            <div className="card p-5 lg:col-span-2">
              <h2 className="mb-2 font-bold">Where the money went</h2>
              {pie.length ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart><Pie data={pie} dataKey="value" nameKey="name" outerRadius={95} stroke="none">{pie.map((e) => <Cell key={e.name} fill={e.fill} />)}</Pie><Tooltip content={<ChartTooltip format={fmt} />} /></PieChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="py-10 text-center text-sm text-ink-500">No expenses in this period.</p>}
            </div>
            <div className="card p-5 lg:col-span-3">
              <h2 className="mb-4 font-bold">Monthly comparison</h2>
              <div className="h-64 text-ink-400">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthly} barGap={6}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.2} />
                    <XAxis dataKey="label" tick={tick} axisLine={false} tickLine={false} />
                    <YAxis tick={tick} axisLine={false} tickLine={false} width={60} tickFormatter={(v) => money(v, cur, { compact: true })} />
                    <Tooltip cursor={{ fill: 'currentColor', fillOpacity: 0.08 }} content={<ChartTooltip format={fmt} />} />
                    <Legend iconType="circle" />
                    <Bar dataKey="income" name="Income" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={30} />
                    <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="mt-4 card p-5">
            <h2 className="mb-4 font-bold">Savings trend</h2>
            <div className="h-56 text-ink-400">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthly}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.2} />
                  <XAxis dataKey="label" tick={tick} axisLine={false} tickLine={false} />
                  <YAxis tick={tick} axisLine={false} tickLine={false} width={60} tickFormatter={(v) => money(v, cur, { compact: true })} />
                  <Tooltip content={<ChartTooltip format={fmt} />} />
                  <Line type="monotone" dataKey="savings" name="Savings" stroke="#0d9488" strokeWidth={3} dot={{ r: 4, strokeWidth: 0, fill: '#0d9488' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="card">
              <h2 className="p-5 pb-2 font-bold">Expense categories</h2>
              <table className="w-full"><tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                {r.expenseCategories.map((c) => (
                  <tr key={c.id}><td className="td"><span className="inline-flex items-center gap-2"><CategoryIcon icon={c.icon} color={c.color} size="sm" />{c.name}</span></td><td className="td text-ink-400">{c.count} txns</td><td className="td text-right text-ink-400">{c.pct}%</td><td className="td text-right font-bold">{fmt(c.total)}</td></tr>
                ))}
              </tbody></table>
            </div>
            <div className="card">
              <h2 className="p-5 pb-2 font-bold">Biggest expenses</h2>
              {r.topExpenses.length ? (
                <ul className="divide-y divide-ink-100 dark:divide-ink-800">
                  {r.topExpenses.map((t) => (
                    <li key={t.id} className="flex items-center gap-3 px-5 py-3"><span className="text-xl">{t.icon}</span><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{t.description}</div><div className="text-xs text-ink-400">{t.category_name} · {fmtDate(t.txn_date)}</div></div><span className="font-extrabold">{fmt(t.amount)}</span></li>
                  ))}
                </ul>
              ) : <p className="p-5 text-sm text-ink-500">No expenses in this period.</p>}
            </div>
          </div>
        </>
      )}
    </>
  );
}
