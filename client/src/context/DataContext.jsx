import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../lib/api';

const DataContext = createContext(null);
export const useData = () => useContext(DataContext);

/** Shared categories + a `version` counter pages watch to refetch after any data change. */
export function DataProvider({ children }) {
  const [categories, setCategories] = useState([]);
  const [version, setVersion] = useState(0);

  const reloadCategories = useCallback(() => api.get('/categories').then((r) => setCategories(r.data.data)).catch(() => {}), []);
  useEffect(() => { reloadCategories(); }, [reloadCategories]);

  const value = useMemo(() => ({
    categories, reloadCategories, version, bump: () => setVersion((v) => v + 1),
    byType: (type) => categories.filter((c) => c.type === type),
  }), [categories, reloadCategories, version]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
