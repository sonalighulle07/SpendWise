// Every class is written out in full so Tailwind can detect it (no dynamic class names, no inline styles).
export const PALETTE = {
  emerald: { hex: '#10b981', dot: 'bg-emerald-500', soft: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', bar: 'bg-emerald-500' },
  teal: { hex: '#14b8a6', dot: 'bg-teal-500', soft: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300', bar: 'bg-teal-500' },
  sky: { hex: '#0ea5e9', dot: 'bg-sky-500', soft: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300', bar: 'bg-sky-500' },
  lime: { hex: '#84cc16', dot: 'bg-lime-500', soft: 'bg-lime-100 text-lime-700 dark:bg-lime-500/15 dark:text-lime-300', bar: 'bg-lime-500' },
  orange: { hex: '#f97316', dot: 'bg-orange-500', soft: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300', bar: 'bg-orange-500' },
  violet: { hex: '#8b5cf6', dot: 'bg-violet-500', soft: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300', bar: 'bg-violet-500' },
  pink: { hex: '#ec4899', dot: 'bg-pink-500', soft: 'bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300', bar: 'bg-pink-500' },
  amber: { hex: '#f59e0b', dot: 'bg-amber-500', soft: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300', bar: 'bg-amber-500' },
  rose: { hex: '#f43f5e', dot: 'bg-rose-500', soft: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300', bar: 'bg-rose-500' },
  red: { hex: '#ef4444', dot: 'bg-red-500', soft: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300', bar: 'bg-red-500' },
  indigo: { hex: '#6366f1', dot: 'bg-indigo-500', soft: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300', bar: 'bg-indigo-500' },
  slate: { hex: '#64748b', dot: 'bg-slate-500', soft: 'bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300', bar: 'bg-slate-500' },
};
export const COLOR_NAMES = Object.keys(PALETTE);
export const pal = (name) => PALETTE[name] || PALETTE.slate;

export const EMOJIS = ['💼', '💻', '📈', '🎁', '🍜', '🏠', '🛍️', '✈️', '💡', '🎬', '🩺', '📚', '📦', '🚗', '☕', '🎮', '🐶', '👶', '💄', '🏋️', '🎵', '🛒', '📱', '🎓', '🏖️', '🛟', '🎯', '💍'];

const STEPS = {
  0: 'w-0', 5: 'w-[5%]', 10: 'w-[10%]', 15: 'w-[15%]', 20: 'w-[20%]', 25: 'w-[25%]', 30: 'w-[30%]', 35: 'w-[35%]', 40: 'w-[40%]',
  45: 'w-[45%]', 50: 'w-[50%]', 55: 'w-[55%]', 60: 'w-[60%]', 65: 'w-[65%]', 70: 'w-[70%]', 75: 'w-[75%]', 80: 'w-[80%]',
  85: 'w-[85%]', 90: 'w-[90%]', 95: 'w-[95%]', 100: 'w-full',
};
export function widthClass(pct) {
  const p = Math.max(0, Math.min(100, Number(pct) || 0));
  if (p > 0 && p < 5) return STEPS[5];
  return STEPS[Math.round(p / 5) * 5];
}

export const STATUS_STYLES = {
  ok: { bar: 'bg-brand-500', badge: 'bg-brand-100 text-brand-800 dark:bg-brand-500/15 dark:text-brand-300', label: 'On track' },
  warning: { bar: 'bg-amber-500', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300', label: 'Near limit' },
  exceeded: { bar: 'bg-rose-500', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300', label: 'Over budget' },
};

export const TONE_STYLES = {
  info: 'bg-sky-50 text-sky-900 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-100 dark:ring-sky-500/20',
  success: 'bg-emerald-50 text-emerald-900 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-100 dark:ring-emerald-500/20',
  warning: 'bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-100 dark:ring-amber-500/20',
  danger: 'bg-rose-50 text-rose-900 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-100 dark:ring-rose-500/20',
};

export const PAYMENT_METHODS = [
  { value: 'upi', label: 'UPI' }, { value: 'card', label: 'Card' }, { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank transfer' }, { value: 'other', label: 'Other' },
];
