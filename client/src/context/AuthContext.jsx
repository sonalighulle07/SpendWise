import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { TOKEN_KEY } from '../lib/api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem(TOKEN_KEY)));

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    api.get('/auth/me').then((r) => setUser(r.data.user)).catch(() => localStorage.removeItem(TOKEN_KEY)).finally(() => setLoading(false));
  }, []);

  const authenticate = useCallback(async (path, payload) => {
    const { data } = await api.post(path, payload);
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
  }, []);

  const value = useMemo(() => ({
    user, loading, setUser,
    login: (email, password) => authenticate('/auth/login', { email, password }),
    register: (name, email, password) => authenticate('/auth/register', { name, email, password }),
    logout: () => { localStorage.removeItem(TOKEN_KEY); setUser(null); },
  }), [user, loading, authenticate]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
