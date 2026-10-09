import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getToken, setToken, setUnauthorizedHandler, setSuspendedHandler } from '../api/client.js';
import { Auth, Store } from '../api/index.js';
import { markPriceReview } from '../lib/priceReview.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [store, setStoreState] = useState(null);
  // As respostas de PATCH /me etc. não trazem `access`: preserva o que já sabemos para o painel não "esquecer" a assinatura.
  const setStore = useCallback((next) => setStoreState((prev) => (typeof next === 'function' ? next(prev) : next && { ...next, access: next.access ?? prev?.access })), []);
  const [booting, setBooting] = useState(!!getToken());

  const logout = useCallback(() => { setToken(null); setStoreState(null); }, []);
  const refresh = useCallback(() => Store.me().then(setStore).catch(() => {}), [setStore]);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    setSuspendedHandler(refresh);
    if (!getToken()) return;
    Store.me().then(setStore).catch(() => setToken(null)).finally(() => setBooting(false));
  }, [logout, refresh, setStore]);

  const value = useMemo(() => ({
    store, booting, setStore, logout, refresh,
    async login(email, password) {
      const r = await Auth.login(email, password);
      setToken(r.token); setStore({ ...r.store, access: r.access });
    },
    /** devolve o template aplicado (ou null para loja vazia) */
    async register(data) {
      const r = await Auth.register(data);
      // modelo de cardápio = preços de exemplo: o painel lembra o dono de revisá-los (gravado antes de abrir a sessão)
      if (r.template) markPriceReview(r.store.id);
      setToken(r.token); setStore({ ...r.store, access: r.access });
      return r.template ?? null;
    },
  }), [store, booting, logout, refresh, setStore]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
