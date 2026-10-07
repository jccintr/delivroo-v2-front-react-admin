import { useEffect, useState } from 'react';
import { Orders } from '../api/index.js';
import { FulfillmentBadge, OrderCard, OrderDetail, StatusBadge, useOrderActions } from '../components/OrderParts.jsx';
import Icon from '../components/Icon.jsx';
import { Button, EmptyState, IconButton, Loading, PageHeader, Select, Tabs, cx } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useOrders } from '../context/OrdersContext.jsx';
import { dateTimeOf, periodRange } from '../lib/dates.js';
import { formatBRL } from '../lib/money.js';
import { COLUMNS, STATUS_LABEL } from '../lib/orderStatus.js';
import useResource from '../hooks/useResource.js';

export default function OrdersPage() {
  const [view, setView] = useState('board');
  const { orders, loaded, refresh, pending } = useOrders();
  const { store } = useAuth();
  const actions = useOrderActions();
  const [openId, setOpenId] = useState(null);
  const [col, setCol] = useState('new');
  const open = orders.find((o) => o.id === openId);
  const [histOrder, setHistOrder] = useState(null);

  const byCol = (c) => orders.filter((o) => c.statuses.includes(o.status));
  const sold = orders.filter((o) => !['REJECTED', 'CANCELED', 'RETURNED'].includes(o.status));

  return (
    <>
      <PageHeader title="Pedidos" subtitle={view === 'board' ? (store.isOpen ? `Turno atual · ${orders.length} ${orders.length === 1 ? 'pedido' : 'pedidos'} · ${formatBRL(sold.reduce((s, o) => s + o.totalCents, 0))}` : 'Loja fechada — mostrando as últimas 24 h') : 'Consulte pedidos de qualquer data'}>
        <Tabs value={view} onChange={setView} tabs={[{ key: 'board', label: 'Quadro', count: pending || undefined }, { key: 'history', label: 'Histórico' }]} />
        {view === 'board' && <IconButton icon="refresh" label="Atualizar" onClick={refresh} />}
      </PageHeader>

      {view === 'board' ? (
        !loaded ? <Loading /> : orders.length === 0 ? (
          <EmptyState icon="orders" title="Nenhum pedido por enquanto">{store.isOpen ? 'Quando um cliente pedir, ele aparece aqui na hora, com aviso sonoro (ative o botão “Som”).' : 'Abra a loja para começar a receber pedidos.'}</EmptyState>
        ) : (
          <>
            <Tabs className="mb-4 lg:hidden" value={col} onChange={setCol} tabs={COLUMNS.map((c) => ({ key: c.key, label: c.title, count: byCol(c).length || undefined }))} />
            <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-4">
              {COLUMNS.map((c) => (
                <section key={c.key} className={cx(col !== c.key && 'hidden lg:block')} aria-label={c.title}>
                  <h2 className="mb-3 hidden items-center gap-2 font-display text-lg font-extrabold lg:flex"><span className={cx('size-3 rounded-full', c.accent)} />{c.title}<span className="rounded-full bg-ink/10 px-2 text-sm">{byCol(c).length}</span></h2>
                  <div className="space-y-3">
                    {byCol(c).map((o) => <OrderCard key={o.id} order={o} onOpen={(x) => setOpenId(x.id)} actions={actions} />)}
                    {byCol(c).length === 0 && <p className="rounded-2xl border border-dashed border-line py-8 text-center text-sm text-ink-soft">Nada aqui.</p>}
                  </div>
                </section>
              ))}
            </div>
          </>
        )
      ) : (
        <History onOpen={setHistOrder} />
      )}

      {open && <OrderDetail order={open} onClose={() => setOpenId(null)} actions={actions} />}
      {histOrder && <HistoryDetail order={histOrder} onClose={() => setHistOrder(null)} actions={actions} />}
    </>
  );
}

/** pedido aberto do histórico: usa a versão do contexto quando existir (mudou de status) */
function HistoryDetail({ order, onClose, actions }) {
  const { orders } = useOrders();
  const live = orders.find((o) => o.id === order.id) ?? order;
  return <OrderDetail order={live} onClose={onClose} actions={actions} />;
}

const PERIODS = [['today', 'Hoje'], ['yesterday', 'Ontem'], ['7d', '7 dias'], ['30d', '30 dias'], ['month', 'Este mês']];

function History({ onOpen }) {
  const [period, setPeriod] = useState('7d');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [period, status]);
  const { data, loading, error } = useResource(() => {
    const { from, to } = periodRange(period);
    return Orders.list({ scope: 'range', from: from.toISOString(), to: to.toISOString(), status, page, limit: 20 });
  }, [period, status, page]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs value={period} onChange={setPeriod} tabs={PERIODS.map(([key, label]) => ({ key, label }))} />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="!w-auto" aria-label="Filtrar por status">
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </div>
      {loading && !data ? <Loading /> : error ? <p className="text-cherry">{error.message}</p> : data.orders.length === 0 ? (
        <EmptyState icon="orders" title="Nenhum pedido neste período" />
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-line bg-white">
            <ul className="divide-y divide-line">
              {data.orders.map((o) => (
                <li key={o.id}>
                  <button onClick={() => onOpen(o)} className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-3 text-left hover:bg-cream sm:grid-cols-[4rem_minmax(0,1fr)_auto_auto_auto]">
                    <span className="font-display text-lg font-extrabold">#{o.orderNumber}</span>
                    <span className="col-span-1 min-w-0 sm:col-auto"><span className="block truncate font-semibold">{o.customer.name}</span><span className="text-xs text-ink-soft">{dateTimeOf(o.createdAt)}</span></span>
                    <span className="hidden gap-1.5 sm:flex"><FulfillmentBadge order={o} /><StatusBadge status={o.status} /></span>
                    <span className="text-right font-bold">{formatBRL(o.totalCents)}</span>
                    <Icon name="chevR" className="hidden size-4 text-ink-soft sm:block" />
                    <span className="col-span-2 flex gap-1.5 sm:hidden"><FulfillmentBadge order={o} /><StatusBadge status={o.status} /></span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm text-ink-soft">
            <span>{data.total} pedidos</span>
            <div className="flex items-center gap-2">
              <Button kind="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
              <span>{page} / {pages}</span>
              <Button kind="secondary" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
