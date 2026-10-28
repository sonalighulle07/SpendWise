import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Lightbulb, PiggyBank, TrendingDown, TrendingUp } from 'lucide-react';
import api from '../lib/api';
import { cn, currentMonth, fmtDate, money, monthLabel, relativeDay } from '../lib/format';
import { pal, STATUS_STYLES, TONE_STYLES } from '../lib/theme';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { CategoryIcon, ChartTooltip, EmptyState, MonthPicker, PageHeader, PageLoader, ProgressBar } from '../components/ui';

function Change({ value, inverse = false }) {
  if (value === null || value === undefined) return <span className="text-xs text-ink-400">no data last month</span>;
  const good = inverse ? value <= 0 : value >= 0;
  const Icon = value >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-bold', good ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
      <Icon className="h-3.5 w-3.5" />{Math.abs(value)}% <span className="font-medium text-ink-400">vs last month</span>
    </span>
  );
}

function StatCard({ label, value, icon: Icon, tone, change, inverse }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-ink-500 dark:text-ink-400">{label}</span>
        <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', tone)}><Icon className="h-[18px] w-[18px]" /></span>
      </div>
      <div className="mt-3 text-2xl font-extrabold tracking-tight text-ink-900 dark:text-white">{value}</div>
      <div className="mt-1"><Change value={change} inverse={inverse} /></div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { version } = useData();
  const [month, setMonth] = useState(currentMonth());
  const [d, setD] = useState(null);
  const cur = user.currency;
  const fmt = (v) => money(v, cur);

  useEffect(() => {
    let alive = true;
    api.get('/analytics/dashboard', { params: { month } }).then((r) => alive && setD(r.data));
    return () => { alive = false; };
  }, [month, version]);

  if (!d) return <PageLoader />;
  const s = d.summary;
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const pieData = d.categories.map((c) => ({ name: c.name, value: c.total, fill: pal(c.color).hex }));
  const tick = { fill: 'currentColor', fontSize: 12 };

  return (
    <>
      <PageHeader title={`${greet}, ${user.name.split(' ')[0]}`} subtitle={`Here is how ${monthLabel(month)} looks so far.`}>
        <MonthPicker month={month} onChange={setMonth} />
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="relative overflow-hidden rounded-2xl bg-brand-900 p-6 text-white shadow-card lg:col-span-2 lg:row-span-1">
          <div className="text-sm font-semibold text-brand-200">Total balance</div>
          <div className="mt-2 text-4xl font-extrabold tracking-tight">{fmt(s.balance)}</div>
          <div className="mt-1 text-xs text-brand-200/80">Across all time: every income minus every expense</div>
          <div className="mt-4 h-20 text-brand-300">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={d.trend} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <defs><linearGradient id="hero" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5eead4" stopOpacity={0.5} /><stop offset="100%" stopColor="#5eead4" stopOpacity={0} /></linearGradient></defs>
                <Area type="monotone" dataKey="savings" name="Savings" stroke="#5eead4" strokeWidth={2.5} fill="url(#hero)" />
                <Tooltip content={<ChartTooltip format={fmt} />} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="text-xs text-brand-200/80">Monthly savings, last 6 months</div>
        </div>
        <StatCard label="Income" value={fmt(s.income)} icon={TrendingUp} tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" change={s.change.income} />
        <StatCard label="Expenses" value={fmt(s.expense)} icon={TrendingDown} tone="bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" change={s.change.expense} inverse />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-4">
        <StatCard label="Saved this month" value={fmt(s.savings)} icon={PiggyBank} tone="bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300" change={s.change.savings} />
        <div className="card p-5">
          <div className="text-sm font-semibold text-ink-500 dark:text-ink-400">Savings rate</div>
          <div className="mt-3 text-2xl font-extrabold text-ink-900 dark:text-white">{s.savingsRate}%</div>
          <ProgressBar className="mt-3" value={Math.max(0, s.savingsRate)} barClass={s.savingsRate >= 20 ? 'bg-emerald-500' : s.savingsRate > 0 ? 'bg-amber-500' : 'bg-rose-500'} />
          <div className="mt-1 text-xs text-ink-400">Goal: 20% or more of income</div>
        </div>
        <div className="card p-5 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold"><Lightbulb className="h-4 w-4 text-amber-500" />Insights</div>
          {d.insights.length ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {d.insights.slice(0, 4).map((i) => (
                <li key={i.title} className={cn('rounded-xl p-3 ring-1', TONE_STYLES[i.tone])}>
                  <div className="text-sm font-bold">{i.title}</div>
                  <div className="mt-0.5 text-xs opacity-80">{i.text}</div>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-ink-500">Add a few transactions and insights will show up here.</p>}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-1 font-bold">Spending by category</h2>
          {pieData.length ? (
            <>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86} paddingAngle={3} stroke="none">
                      {pieData.map((e) => <Cell key={e.name} fill={e.fill} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip format={fmt} />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-2">
                {d.categories.slice(0, 5).map((c) => (
                  <li key={c.id} className="flex items-center gap-2 text-sm">
                    <span className={cn('h-2.5 w-2.5 rounded-full', pal(c.color).dot)} />
                    <span className="flex-1 truncate">{c.icon} {c.name}</span>
                    <span className="text-xs text-ink-400">{c.pct}%</span>
                    <span className="w-24 text-right font-bold">{fmt(c.total)}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : <EmptyState icon="🧾" title="No expenses yet" text="Your category breakdown appears after your first expense this month." />}
        </div>

        <div className="card p-5 lg:col-span-3">
          <h2 className="mb-4 font-bold">Income vs expenses</h2>
          <div className="h-64 text-ink-400">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.trend.map((t) => ({ ...t, label: monthLabel(t.month, false) }))} barGap={6}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.2} />
                <XAxis dataKey="label" tick={tick} axisLine={false} tickLine={false} />
                <YAxis tick={tick} axisLine={false} tickLine={false} tickFormatter={(v) => money(v, cur, { compact: true })} width={60} />
                <Tooltip cursor={{ fill: 'currentColor', fillOpacity: 0.08 }} content={<ChartTooltip format={fmt} />} />
                <Bar dataKey="income" name="Income" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={28} />
                <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">Daily spending</h2>
            <span className="text-xs text-ink-400">{monthLabel(month)}</span>
          </div>
          <div className="h-48 text-ink-400">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={d.daily}>
                <defs><linearGradient id="daily" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f43f5e" stopOpacity={0.35} /><stop offset="100%" stopColor="#f43f5e" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.2} />
                <XAxis dataKey="day" tick={tick} axisLine={false} tickLine={false} />
                <YAxis tick={tick} axisLine={false} tickLine={false} tickFormatter={(v) => money(v, cur, { compact: true })} width={60} />
                <Tooltip content={<ChartTooltip format={fmt} />} />
                <Area type="monotone" dataKey="spent" name="Spent" stroke="#f43f5e" strokeWidth={2.5} fill="url(#daily)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold"><AlertTriangle className="h-4 w-4 text-amber-500" />Budget alerts</h2>
            <Link to="/budgets" className="text-xs font-bold text-brand-700 hover:underline dark:text-brand-400">Manage</Link>
          </div>
          {d.alerts.length ? (
            <ul className="space-y-4">
              {d.alerts.map((b) => (
                <li key={b.id}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-semibold">{b.icon} {b.category_name}</span>
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', STATUS_STYLES[b.status].badge)}>{STATUS_STYLES[b.status].label}</span>
                  </div>
                  <ProgressBar value={b.pct} barClass={STATUS_STYLES[b.status].bar} />
                  <div className="mt-1 text-xs text-ink-400">{fmt(b.spent)} of {fmt(b.amount)} ({Math.round(b.pct)}%)</div>
                </li>
              ))}
            </ul>
          ) : <p className="py-6 text-center text-sm text-ink-500">✅ All budgets are on track.</p>}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between p-5 pb-2">
            <h2 className="font-bold">Recent transactions</h2>
            <Link to="/transactions" className="text-xs font-bold text-brand-700 hover:underline dark:text-brand-400">View all</Link>
          </div>
          {d.recent.length ? (
            <ul className="divide-y divide-ink-100 dark:divide-ink-800">
              {d.recent.map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                  <CategoryIcon icon={t.icon} color={t.color} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{t.description}</div>
                    <div className="text-xs text-ink-400">{t.category_name} · {fmtDate(t.txn_date)}</div>
                  </div>
                  <div className={cn('text-sm font-extrabold', t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-900 dark:text-white')}>
                    {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                  </div>
                </li>
              ))}
            </ul>
          ) : <EmptyState title="No transactions yet" text="Press N or use the Add transaction button to record your first one." />}
        </div>
        <div className="card p-5">
          <h2 className="mb-3 font-bold">Coming up (14 days)</h2>
          {d.upcoming.length ? (
            <ul className="space-y-3">
              {d.upcoming.map((u) => (
                <li key={u.id} className="flex items-center gap-3 text-sm">
                  <span className="text-xl">{u.icon}</span>
                  <div className="min-w-0 flex-1"><div className="truncate font-semibold">{u.description}</div><div className="text-xs text-ink-400">{relativeDay(u.next_run_date)}</div></div>
                  <span className="font-bold">{fmt(u.amount)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="py-6 text-center text-sm text-ink-500">Nothing scheduled. Add rent or subscriptions under Recurring.</p>}
        </div>
      </div>
    </>
  );
}
