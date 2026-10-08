import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getToken, setToken, setUnauthorizedHandler } from '../api/client.js';
import { Auth, Store } from '../api/index.js';
import { markPriceReview } from '../lib/priceReview.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [store, setStore] = useState(null);
  const [booting, setBooting] = useState(!!getToken());

  const logout = useCallback(() => { setToken(null); setStore(null); }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!getToken()) return;
    Store.me().then(setStore).catch(() => setToken(null)).finally(() => setBooting(false));
  }, [logout]);

  const value = useMemo(() => ({
    store, booting, setStore, logout,
    async login(email, password) {
      const r = await Auth.login(email, password);
      setToken(r.token); setStore(r.store);
    },
    /** devolve o template aplicado (ou null para loja vazia) */
    async register(data) {
      const r = await Auth.register(data);
      // modelo de cardápio = preços de exemplo: o painel lembra o dono de revisá-los (gravado antes de abrir a sessão)
      if (r.template) markPriceReview(r.store.id);
      setToken(r.token); setStore(r.store);
      return r.template ?? null;
    },
  }), [store, booting, logout]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
