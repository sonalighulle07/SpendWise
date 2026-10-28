import { useState } from 'react';
import { Moon, Pencil, Plus, Sun, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errMsg } from '../lib/api';
import { cn, CURRENCIES } from '../lib/format';
import { COLOR_NAMES, EMOJIS, pal } from '../lib/theme';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { CategoryIcon, Field, Modal, PageHeader, useConfirm } from '../components/ui';

export default function SettingsPage() {
  const { user, setUser } = useAuth();
  const { dark, toggle } = useTheme();
  const { categories, reloadCategories, bump } = useData();
  const [profile, setProfile] = useState({ name: user.name, currency: user.currency });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [cat, setCat] = useState(null);
  const [confirm, confirmDialog] = useConfirm();

  async function saveProfile(e) {
    e.preventDefault();
    try { const r = await api.put('/auth/profile', profile); setUser(r.data.user); toast.success('Profile saved'); } catch (err) { toast.error(errMsg(err)); }
  }
  async function savePassword(e) {
    e.preventDefault();
    try { await api.put('/auth/password', pw); toast.success('Password updated'); setPw({ currentPassword: '', newPassword: '' }); } catch (err) { toast.error(errMsg(err)); }
  }
  async function saveCategory(e) {
    e.preventDefault();
    try {
      if (cat.id) await api.put(`/categories/${cat.id}`, cat); else await api.post('/categories', cat);
      toast.success('Category saved');
      setCat(null);
      await reloadCategories();
      bump();
    } catch (err) { toast.error(errMsg(err)); }
  }
  async function removeCategory(c) {
    if (!(await confirm({ title: 'Delete category?', text: `"${c.name}" will be removed.` }))) return;
    try { await api.delete(`/categories/${c.id}`); toast.success('Category deleted'); await reloadCategories(); } catch (err) { toast.error(errMsg(err)); }
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Your profile, security, theme and categories." />
      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={saveProfile} className="card space-y-4 p-6">
          <h2 className="font-bold">Profile</h2>
          <Field label="Name"><input className="input" required minLength={2} value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></Field>
          <Field label="Email"><input className="input opacity-60" disabled value={user.email} /></Field>
          <Field label="Currency"><select className="input" value={profile.currency} onChange={(e) => setProfile({ ...profile, currency: e.target.value })}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <button type="submit" className="btn-primary">Save profile</button>
        </form>

        <form onSubmit={savePassword} className="card space-y-4 p-6">
          <h2 className="font-bold">Change password</h2>
          <Field label="Current password"><input className="input" type="password" required autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></Field>
          <Field label="New password" hint="At least 8 characters"><input className="input" type="password" required minLength={8} autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></Field>
          <button type="submit" className="btn-primary">Update password</button>
        </form>

        <div className="card flex items-center justify-between p-6 lg:col-span-2">
          <div><h2 className="font-bold">Appearance</h2><p className="text-sm text-ink-500">Switch between light and dark mode.</p></div>
          <button type="button" className="btn-ghost" onClick={toggle}>{dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}{dark ? 'Use light mode' : 'Use dark mode'}</button>
        </div>

        <div className="card p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">Categories</h2>
            <button type="button" className="btn-primary" onClick={() => setCat({ name: '', type: 'expense', color: 'teal', icon: '📦' })}><Plus className="h-4 w-4" />Add category</button>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {['expense', 'income'].map((type) => (
              <div key={type}>
                <h3 className="mb-2 text-sm font-bold capitalize text-ink-500">{type} categories</h3>
                <ul className="space-y-1">
                  {categories.filter((c) => c.type === type).map((c) => (
                    <li key={c.id} className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-ink-50 dark:hover:bg-ink-800/50">
                      <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                      <span className="flex-1 truncate text-sm font-semibold">{c.name}</span>
                      <span className="text-xs text-ink-400">{c.txn_count} txns</span>
                      <button type="button" className="icon-btn" aria-label={`Edit ${c.name}`} onClick={() => setCat({ id: c.id, name: c.name, type: c.type, color: c.color, icon: c.icon })}><Pencil className="h-4 w-4" /></button>
                      <button type="button" className="icon-btn hover:text-rose-600" aria-label={`Delete ${c.name}`} onClick={() => removeCategory(c)}><Trash2 className="h-4 w-4" /></button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal open={Boolean(cat)} onClose={() => setCat(null)} title={cat?.id ? 'Edit category' : 'New category'}>
        {cat && (
          <form onSubmit={saveCategory} className="space-y-4">
            <Field label="Name"><input className="input" required maxLength={60} value={cat.name} onChange={(e) => setCat({ ...cat, name: e.target.value })} /></Field>
            {!cat.id && <Field label="Type"><select className="input" value={cat.type} onChange={(e) => setCat({ ...cat, type: e.target.value })}><option value="expense">Expense</option><option value="income">Income</option></select></Field>}
            <div><span className="label">Icon</span><div className="flex flex-wrap gap-1.5">{EMOJIS.map((em) => <button key={em} type="button" aria-pressed={cat.icon === em} onClick={() => setCat({ ...cat, icon: em })} className={cn('h-9 w-9 rounded-lg text-lg', cat.icon === em ? 'bg-brand-100 ring-2 ring-brand-500 dark:bg-brand-500/20' : 'hover:bg-ink-100 dark:hover:bg-ink-800')}>{em}</button>)}</div></div>
            <div><span className="label">Colour</span><div className="flex flex-wrap gap-2">{COLOR_NAMES.map((c) => <button key={c} type="button" aria-label={c} aria-pressed={cat.color === c} onClick={() => setCat({ ...cat, color: c })} className={cn('h-7 w-7 rounded-full', pal(c).dot, cat.color === c && 'ring-2 ring-ink-900 ring-offset-2 dark:ring-white dark:ring-offset-ink-900')} />)}</div></div>
            <div className="flex justify-end gap-2 pt-2"><button type="button" className="btn-ghost" onClick={() => setCat(null)}>Cancel</button><button type="submit" className="btn-primary">Save category</button></div>
          </form>
        )}
      </Modal>
      {confirmDialog}
    </>
  );
}
