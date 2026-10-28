import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Home, Loader2, X } from 'lucide-react';
import { cn, currentMonth, monthLabel, shiftMonth } from '../lib/format';
import { pal, widthClass } from '../lib/theme';

export function Spinner({ className }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-brand-600', className)} aria-label="Loading" />;
}

export function PageLoader() {
  return <div className="flex min-h-[40vh] items-center justify-center"><Spinner className="h-7 w-7" /></div>;
}

const CRUMBS = {
  '/': 'Dashboard', '/transactions': 'Transactions', '/budgets': 'Budgets', '/goals': 'Savings goals',
  '/recurring': 'Recurring', '/reports': 'Reports', '/settings': 'Settings',
};

export function Breadcrumbs() {
  const { pathname } = useLocation();
  const label = CRUMBS[pathname];
  if (!label) return null;
  return (
    <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ink-400 print:hidden">
      <Link to="/" className="inline-flex items-center gap-1 transition hover:text-brand-700 dark:hover:text-brand-400"><Home className="h-3.5 w-3.5" />Home</Link>
      <ChevronRight className="h-3 w-3" aria-hidden="true" />
      <span aria-current="page" className="text-ink-600 dark:text-ink-300">{label}</span>
    </nav>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-6">
      <Breadcrumbs />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 dark:text-white">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({ icon = '🪙', title, text, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-3 text-4xl" aria-hidden="true">{icon}</div>
      <h3 className="text-base font-bold text-ink-900 dark:text-white">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-ink-500 dark:text-ink-400">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function CategoryIcon({ icon, color, size = 'md' }) {
  const dims = size === 'sm' ? 'h-8 w-8 text-base' : size === 'lg' ? 'h-12 w-12 text-2xl' : 'h-10 w-10 text-lg';
  return <span className={cn('inline-flex shrink-0 items-center justify-center rounded-xl', dims, pal(color).soft)} aria-hidden="true">{icon}</span>;
}

export function ProgressBar({ value, barClass = 'bg-brand-500', className }) {
  return (
    <div className={cn('h-2.5 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800', className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn('h-full rounded-full transition-all duration-500', barClass, widthClass(value))} />
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide = false }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose; // always call the latest onClose without re-running the effect

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && closeRef.current();
    document.addEventListener('keydown', onKey);
    document.body.classList.add('overflow-hidden');
    ref.current?.querySelector('input, select, textarea, button')?.focus(); // focus only once, when the dialog opens
    return () => { document.removeEventListener('keydown', onKey); document.body.classList.remove('overflow-hidden'); };
  }, [open]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className={cn('max-h-[92vh] w-full animate-rise overflow-y-auto rounded-t-3xl bg-white p-6 shadow-pop dark:bg-ink-900 sm:rounded-3xl', wide ? 'sm:max-w-2xl' : 'sm:max-w-md')}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-ink-900 dark:text-white">{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

/** const [confirm, confirmDialog] = useConfirm();  if (await confirm({...})) ... ;  render {confirmDialog} */
export function useConfirm() {
  const [state, setState] = useState(null);
  const confirm = useCallback((opts) => new Promise((resolve) => setState({ ...opts, resolve })), []);
  const close = (v) => { state.resolve(v); setState(null); };
  const dialog = (
    <Modal open={Boolean(state)} onClose={() => close(false)} title={state?.title || 'Are you sure?'}>
      <p className="text-sm text-ink-600 dark:text-ink-300">{state?.text}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={() => close(false)}>Cancel</button>
        <button type="button" className="btn-danger" onClick={() => close(true)}>{state?.confirmLabel || 'Delete'}</button>
      </div>
    </Modal>
  );
  return [confirm, dialog];
}

export function MonthPicker({ month, onChange }) {
  const isCurrent = month >= currentMonth();
  return (
    <div className="inline-flex items-center rounded-xl border border-ink-200 bg-white dark:border-ink-700 dark:bg-ink-900">
      <button type="button" className="icon-btn" onClick={() => onChange(shiftMonth(month, -1))} aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></button>
      <span className="min-w-[8.5rem] text-center text-sm font-bold">{monthLabel(month)}</span>
      <button type="button" className="icon-btn disabled:opacity-30" disabled={isCurrent} onClick={() => onChange(shiftMonth(month, 1))} aria-label="Next month"><ChevronRight className="h-4 w-4" /></button>
    </div>
  );
}

export function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-400">{hint}</span>}
    </label>
  );
}

export function ChartTooltip({ active, payload, label, format }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs shadow-pop dark:border-ink-700 dark:bg-ink-900">
      {label !== undefined && <div className="mb-1 font-bold text-ink-900 dark:text-white">{label}</div>}
      {payload.map((p) => (
        <div key={p.dataKey || p.name} className="flex items-center gap-2 text-ink-600 dark:text-ink-300">
          <svg width="8" height="8" aria-hidden="true"><circle cx="4" cy="4" r="4" fill={p.color || p.payload?.fill} /></svg>
          <span>{p.name}</span>
          <span className="ml-auto font-bold text-ink-900 dark:text-white">{format ? format(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
}
