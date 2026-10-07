import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Store } from '../api/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useOrders } from '../context/OrdersContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import Icon from './Icon.jsx';
import { Logo, Spinner, cx } from './ui.jsx';

const NAV = [
  { to: '/pedidos', label: 'Pedidos', icon: 'orders', badge: true },
  { to: '/resumo', label: 'Resumo', icon: 'chart' },
  { to: '/cardapio', label: 'Cardápio', icon: 'book' },
  { to: '/configuracoes', label: 'Ajustes', icon: 'gear' },
];

/** botão grande Aberta/Fechada: ao abrir começa um novo turno (a tela de pedidos mostra o turno) */
function OpenSwitch({ compact }) {
  const { store, setStore } = useAuth();
  const { error, success } = useUI();
  const [busy, setBusy] = useState(false);
  async function toggle() {
    setBusy(true);
    try {
      const next = await Store.setOpen(!store.isOpen);
      setStore(next);
      success(next.isOpen ? 'Loja aberta — pedidos liberados.' : 'Loja fechada.');
    } catch (e) { error(e.message); } finally { setBusy(false); }
  }
  return (
    <button
      onClick={toggle} disabled={busy} aria-pressed={store.isOpen}
      className={cx('flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-bold transition disabled:opacity-60', store.isOpen ? 'bg-mint text-white' : 'bg-white/10 text-white ring-1 ring-white/25 hover:bg-white/20', compact && 'px-3 py-1.5')}
    >
      {busy ? <Spinner className="size-3.5" /> : <span className={cx('size-2.5 rounded-full', store.isOpen ? 'bg-white' : 'bg-cherry')} />}
      {store.isOpen ? 'Aberta' : 'Fechada'}
    </button>
  );
}

function SoundButton() {
  const { soundOn, toggleSound } = useOrders();
  return (
    <button onClick={toggleSound} aria-pressed={soundOn} title={soundOn ? 'Desligar aviso sonoro' : 'Ligar aviso sonoro de pedido novo'}
      className={cx('flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition', soundOn ? 'bg-butter text-ink' : 'bg-white/10 text-white/80 ring-1 ring-white/20 hover:bg-white/20')}>
      <Icon name={soundOn ? 'bell' : 'bellOff'} className="size-4" /> Som
    </button>
  );
}

function Badge({ n }) {
  if (!n) return null;
  return <span className="ml-auto flex min-w-5 items-center justify-center rounded-full bg-orange px-1.5 text-xs font-extrabold text-white animate-ring">{n}</span>;
}

export default function AppShell() {
  const { store, logout } = useAuth();
  const { pending, offline } = useOrders();

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]">
      {/* barra lateral (desktop) */}
      <aside className="hidden bg-navy text-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
        <div className="px-5 pb-4 pt-5"><Logo light /></div>
        <div className="mx-3 mb-4 flex items-center gap-3 rounded-2xl bg-navy-2 p-3">
          {store.logoUrl ? <img src={store.logoUrl} alt="" className="size-10 rounded-full object-cover" /> : <span className="flex size-10 items-center justify-center rounded-full bg-orange-light font-display text-lg font-extrabold text-orange">{store.name[0]}</span>}
          <div className="min-w-0"><p className="truncate text-sm font-bold">{store.name}</p><p className="truncate text-xs text-white/60">/{store.slug}</p></div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => cx('flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[15px] font-semibold transition', isActive ? 'bg-orange text-white' : 'text-white/75 hover:bg-white/10')}>
              <Icon name={n.icon} /> {n.label === 'Ajustes' ? 'Configurações' : n.label}
              {n.badge && <Badge n={pending} />}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-2 p-4">
          <div className="flex gap-2"><OpenSwitch /><SoundButton /></div>
          <button onClick={logout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/60 hover:bg-white/10 hover:text-white"><Icon name="logout" className="size-4" /> Sair</button>
        </div>
      </aside>

      <div className="min-w-0">
        {/* topo (celular/tablet) */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-2 bg-navy px-4 py-2.5 text-white lg:hidden">
          <div className="flex min-w-0 items-center gap-2">
            {store.logoUrl ? <img src={store.logoUrl} alt="" className="size-8 rounded-full object-cover" /> : <span className="shrink-0"><Logo light className="[&>span]:hidden" /></span>}
            <span className="truncate font-display text-lg font-extrabold">{store.name}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2"><SoundButton /><OpenSwitch compact /></div>
        </header>
        {offline && <div className="bg-cherry px-4 py-2 text-center text-sm font-semibold text-white">Sem conexão. Tentando reconectar…</div>}
        {!store.isOpen && <div className="bg-butter/30 px-4 py-2 text-center text-sm font-medium text-amber-900">Sua loja está <b>fechada</b>: os clientes veem o cardápio, mas não conseguem pedir.</div>}

        <main className="mx-auto w-full max-w-[1500px] px-4 pb-28 pt-5 lg:px-8 lg:pb-10 lg:pt-8"><Outlet /></main>
      </div>

      {/* navegação inferior (celular) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => cx('relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-bold', isActive ? 'text-orange' : 'text-ink-soft')}>
            <span className="relative"><Icon name={n.icon} className="size-6" />{n.badge && pending > 0 && <span className="absolute -right-2.5 -top-1.5 flex min-w-4 items-center justify-center rounded-full bg-orange px-1 text-[10px] font-extrabold text-white">{pending}</span>}</span>
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
