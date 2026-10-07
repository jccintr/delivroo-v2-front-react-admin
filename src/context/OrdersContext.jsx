import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Orders, storeEventsUrl } from '../api/index.js';
import { connectEvents } from '../api/sse.js';
import { playAlert, unlockAudio } from '../lib/sound.js';
import { useAuth } from './AuthContext.jsx';
import { useUI } from './UIContext.jsx';

const Ctx = createContext(null);
export const useOrders = () => useContext(Ctx);

// Tempo real por SSE. O polling continua como rede de segurança: devagar com a conexão ao vivo, rápido sem ela.
const POLL_LIVE_MS = 60000;
const POLL_FALLBACK_MS = 12000;
const SOUND_KEY = 'delivroo:admin:sound';
const readSound = () => { try { return localStorage.getItem(SOUND_KEY) === '1'; } catch { return false; } };

/**
 * Pedidos do turno (desde que a loja abriu).
 * Pedido novo => som (se ligado), aviso na tela e título da aba com contador.
 */
export function OrdersProvider({ children }) {
  const { store } = useAuth();
  const { toast } = useUI();
  const [orders, setOrders] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [offline, setOffline] = useState(false);
  const [conn, setConn] = useState('connecting'); // connecting | live | offline
  const [soundOn, setSoundOn] = useState(readSound);
  const seen = useRef(null); // ids já conhecidos (null até a primeira carga)
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;

  const announce = useCallback((fresh) => {
    if (!fresh.length) return;
    if (soundRef.current) playAlert();
    toast(fresh.length === 1 ? `Novo pedido #${fresh[0].orderNumber}!` : `${fresh.length} novos pedidos!`, { kind: 'success' });
  }, [toast]);

  const refresh = useCallback(async () => {
    try {
      const r = await Orders.list({ scope: 'shift', limit: 200 });
      setOffline(false);
      setOrders(r.orders);
      const fresh = r.orders.filter((o) => o.status === 'RECEIVED' && seen.current && !seen.current.has(o.id));
      seen.current = new Set(r.orders.map((o) => o.id));
      announce(fresh);
    } catch (e) {
      if (e.status === 0) setOffline(true);
    } finally {
      setLoaded(true);
    }
  }, [announce]);

  const upsert = useCallback((o) => setOrders((list) => (list.some((x) => x.id === o.id) ? list.map((x) => (x.id === o.id ? o : x)) : [o, ...list])), []);

  // eventos em tempo real
  useEffect(() => {
    if (!store) return undefined;
    return connectEvents(storeEventsUrl, {
      'order.created': ({ order }) => {
        const known = seen.current?.has(order.id);
        seen.current?.add(order.id);
        upsert(order);
        if (!known && order.status === 'RECEIVED') announce([order]);
      },
      'order.updated': ({ order }) => { seen.current?.add(order.id); upsert(order); },
    }, {
      onStatus: setConn,
      onReady: refresh, // conectou ou reconectou: recupera o que passou enquanto estava fora
    });
  }, [store?.id, upsert, announce, refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  // carga inicial + polling de segurança (mais lento enquanto o SSE está ao vivo)
  useEffect(() => {
    if (!store) return undefined;
    const t = setInterval(refresh, conn === 'live' ? POLL_LIVE_MS : POLL_FALLBACK_MS);
    return () => clearInterval(t);
  }, [store?.id, conn, refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!store) return undefined;
    seen.current = null;
    refresh();
    const onFocus = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onFocus);
    return () => document.removeEventListener('visibilitychange', onFocus);
  }, [store?.id, store?.openedAt, refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  const pending = orders.filter((o) => o.status === 'RECEIVED').length;

  // título da aba mostra pedidos aguardando
  useEffect(() => {
    document.title = pending ? `(${pending}) Novo pedido · Delivroo Loja` : 'Delivroo Loja';
  }, [pending]);

  const value = useMemo(() => ({
    orders, loaded, offline, pending, refresh, soundOn, conn,
    replaceOrder: upsert,
    toggleSound() {
      const next = !soundRef.current;
      if (next) { unlockAudio(); playAlert(); }
      try { localStorage.setItem(SOUND_KEY, next ? '1' : '0'); } catch { /* ignora */ }
      setSoundOn(next);
    },
  }), [orders, loaded, offline, pending, refresh, soundOn, conn, upsert]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
