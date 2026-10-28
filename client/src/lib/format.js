const nf = {};
export function money(value, currency = 'INR', opts = {}) {
  const key = `${currency}-${opts.compact}`;
  nf[key] ||= new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency', currency, maximumFractionDigits: opts.compact ? 1 : 2, minimumFractionDigits: 0, notation: opts.compact ? 'compact' : 'standard',
  });
  return nf[key].format(Number(value) || 0);
}

export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'AUD', 'CAD', 'SGD', 'JPY'];

const pad = (n) => String(n).padStart(2, '0');
export const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const currentMonth = () => todayStr().slice(0, 7);

export function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
export function monthEnd(month) {
  const [y, m] = month.split('-').map(Number);
  return `${month}-${pad(new Date(y, m, 0).getDate())}`;
}
export function monthLabel(month, long = true) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: long ? 'long' : 'short', year: long ? 'numeric' : '2-digit' });
}
export function fmtDate(str) {
  if (!str) return '';
  const [y, m, d] = str.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
export function relativeDay(str) {
  const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const diff = Math.round((parse(str) - parse(todayStr())) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return fmtDate(str);
}

export function downloadBlob(data, filename, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function rowsToCsv(rows, columns) {
  const esc = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return '\uFEFF' + [columns.map((c) => esc(c.label)).join(','), ...rows.map((r) => columns.map((c) => esc(r[c.key])).join(','))].join('\r\n');
}

export const cn = (...parts) => parts.filter(Boolean).join(' ');
