import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Orders } from '../api/index.js';
import { playAlert, unlockAudio } from '../lib/sound.js';
import { useAuth } from './AuthContext.jsx';
import { useUI } from './UIContext.jsx';

const Ctx = createContext(null);
export const useOrders = () => useContext(Ctx);

const POLL_MS = 12000;
const SOUND_KEY = 'delivroo:admin:sound';
const readSound = () => { try { return localStorage.getItem(SOUND_KEY) === '1'; } catch { return false; } };

/**
 * Pedidos do turno (desde que a loja abriu). Atualiza sozinho a cada 12 s e quando a aba volta ao foco.
 * Pedido novo => som (se ligado), aviso na tela e título da aba piscando.
 */
export function OrdersProvider({ children }) {
  const { store } = useAuth();
  const { toast } = useUI();
  const [orders, setOrders] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [offline, setOffline] = useState(false);
  const [soundOn, setSoundOn] = useState(readSound);
  const seen = useRef(null); // ids já conhecidos
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;

  const refresh = useCallback(async () => {
    try {
      const r = await Orders.list({ scope: 'shift', limit: 200 });
      setOffline(false);
      setOrders(r.orders);
      const fresh = r.orders.filter((o) => o.status === 'RECEIVED' && seen.current && !seen.current.has(o.id));
      seen.current = new Set(r.orders.map((o) => o.id));
      if (fresh.length) {
        if (soundRef.current) playAlert();
        toast(fresh.length === 1 ? `Novo pedido #${fresh[0].orderNumber}!` : `${fresh.length} novos pedidos!`, { kind: 'success' });
      }
    } catch (e) {
      if (e.status === 0) setOffline(true);
    } finally {
      setLoaded(true);
    }
  }, [toast]);

  useEffect(() => {
    if (!store) return undefined;
    seen.current = null;
    refresh();
    const t = setInterval(refresh, POLL_MS);
    const onFocus = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onFocus);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onFocus); };
  }, [store?.id, store?.openedAt, refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  const pending = orders.filter((o) => o.status === 'RECEIVED').length;

  // título da aba mostra pedidos aguardando
  useEffect(() => {
    document.title = pending ? `(${pending}) Novo pedido · Delivroo Loja` : 'Delivroo Loja';
  }, [pending]);

  const value = useMemo(() => ({
    orders, loaded, offline, pending, refresh, soundOn,
    replaceOrder: (o) => setOrders((list) => (list.some((x) => x.id === o.id) ? list.map((x) => (x.id === o.id ? o : x)) : [o, ...list])),
    toggleSound() {
      const next = !soundRef.current;
      if (next) { unlockAudio(); playAlert(); }
      try { localStorage.setItem(SOUND_KEY, next ? '1' : '0'); } catch { /* ignora */ }
      setSoundOn(next);
    },
  }), [orders, loaded, offline, pending, refresh, soundOn]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
