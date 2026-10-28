import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, Target, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../lib/api';
import { Field, Spinner } from '../components/ui';
import { Logo } from '../components/Layout';

const PERKS = [
  { icon: TrendingUp, title: 'See where every rupee goes', text: 'Live charts by category, month and trend.' },
  { icon: ShieldCheck, title: 'Budgets that warn you early', text: 'Get alerted before you cross the limit, not after.' },
  { icon: Target, title: 'Savings goals with progress', text: 'Turn a trip or a gadget into a target you can track.' },
];

export default function AuthPage({ mode }) {
  const isLogin = mode === 'login';
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      if (isLogin) await login(form.email, form.password); else await register(form.name, form.email, form.password);
      toast.success(isLogin ? 'Welcome back!' : 'Account created');
      navigate('/');
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-brand-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Logo />
        <div>
          <h2 className="max-w-md text-4xl font-extrabold leading-tight tracking-tight">Know your money. Keep more of it.</h2>
          <ul className="mt-10 space-y-6">
            {PERKS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10"><Icon className="h-5 w-5 text-brand-300" /></span>
                <div><div className="font-bold">{title}</div><div className="text-sm text-brand-100/70">{text}</div></div>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-brand-100/60">Your data stays in your own MySQL database.</p>
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full border-[40px] border-brand-800/40" aria-hidden="true" />
      </section>

      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Logo className="mb-8 lg:hidden" />
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 dark:text-white">{isLogin ? 'Log in to SpendWise' : 'Create your account'}</h1>
          <p className="mt-1 text-sm text-ink-500">{isLogin ? 'Pick up where you left off.' : 'Takes less than a minute. Default categories are added for you.'}</p>
          <form onSubmit={submit} className="mt-8 space-y-4">
            {!isLogin && <Field label="Full name"><input className="input" required minLength={2} value={form.name} onChange={set('name')} autoComplete="name" /></Field>}
            <Field label="Email"><input className="input" type="email" required value={form.email} onChange={set('email')} autoComplete="email" /></Field>
            <Field label="Password" hint={isLogin ? undefined : 'At least 8 characters'}>
              <div className="relative">
                <input className="input pr-11" type={show ? 'text' : 'password'} required minLength={isLogin ? 1 : 8} value={form.password} onChange={set('password')} autoComplete={isLogin ? 'current-password' : 'new-password'} />
                <button type="button" className="icon-btn absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
            <button type="submit" className="btn-primary w-full" disabled={busy}>{busy && <Spinner className="h-4 w-4 text-white" />}{isLogin ? 'Log in' : 'Create account'}</button>
          </form>
          {isLogin && (
            <button type="button" className="btn-ghost mt-3 w-full" onClick={() => setForm((f) => ({ ...f, email: 'demo@spendwise.app', password: 'Demo@1234' }))}>Fill demo account</button>
          )}
          <p className="mt-6 text-center text-sm text-ink-500">
            {isLogin ? 'New here? ' : 'Already have an account? '}
            <Link className="font-bold text-brand-700 hover:underline dark:text-brand-400" to={isLogin ? '/register' : '/login'}>{isLogin ? 'Create an account' : 'Log in'}</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
