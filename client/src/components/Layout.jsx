import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { BarChart3, Menu, Moon, Plus, Repeat, Settings, Sun, Target, Wallet, LayoutDashboard, ArrowLeftRight, LogOut, PiggyBank } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { DataProvider } from '../context/DataContext';
import { cn } from '../lib/format';
import TransactionModal from './TransactionModal';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/budgets', label: 'Budgets', icon: PiggyBank },
  { to: '/goals', label: 'Savings goals', icon: Target },
  { to: '/recurring', label: 'Recurring', icon: Repeat },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Logo({ className }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-white"><Wallet className="h-5 w-5" /></span>
      <span className="text-lg font-extrabold tracking-tight">SpendWise</span>
    </div>
  );
}

function Shell() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const [drawer, setDrawer] = useState(false);
  const [adding, setAdding] = useState(false);
  const location = useLocation();

  useEffect(() => setDrawer(false), [location.pathname]);
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target.tagName;
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) { e.preventDefault(); setAdding(true); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="min-h-screen">
      {drawer && <button type="button" aria-label="Close menu" className="fixed inset-0 z-30 bg-ink-950/50 lg:hidden" onClick={() => setDrawer(false)} />}
      <aside className={cn('fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-ink-200/70 bg-white p-5 transition-transform dark:border-ink-800 dark:bg-ink-900 print:hidden lg:translate-x-0', drawer ? 'translate-x-0' : '-translate-x-full')}>
        <Logo className="mb-8 text-ink-900 dark:text-white" />
        <nav className="flex-1 space-y-1" aria-label="Main">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                isActive ? 'bg-brand-700 text-white shadow-card' : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800')}>
              <Icon className="h-[18px] w-[18px]" />{label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-4 rounded-2xl bg-ink-100 p-3 dark:bg-ink-800">
          <div className="truncate text-sm font-bold text-ink-900 dark:text-white">{user.name}</div>
          <div className="truncate text-xs text-ink-500 dark:text-ink-400">{user.email}</div>
          <button type="button" onClick={logout} className="mt-3 flex items-center gap-2 text-xs font-bold text-rose-600 hover:underline"><LogOut className="h-3.5 w-3.5" />Log out</button>
        </div>
      </aside>

      <div className="lg:pl-64 print:pl-0">
        <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-ink-200/70 bg-ink-100/80 px-4 py-3 backdrop-blur-md dark:border-ink-800 dark:bg-ink-950/80 sm:px-8 print:hidden">
          <button type="button" className="icon-btn lg:hidden" onClick={() => setDrawer(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <Logo className="lg:hidden" />
          <div className="ml-auto flex items-center gap-2">
            <button type="button" className="icon-btn" onClick={toggle} aria-label="Toggle dark mode">{dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</button>
            <button type="button" className="btn-primary" onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" /><span className="hidden sm:inline">Add transaction</span><kbd className="ml-1 hidden rounded bg-white/20 px-1.5 text-[10px] font-bold md:inline">N</kbd>
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8"><Outlet /></main>
      </div>
      <TransactionModal open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}

export default function Layout() {
  return <DataProvider><Shell /></DataProvider>;
}
