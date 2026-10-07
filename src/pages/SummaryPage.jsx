import { useState } from 'react';
import { Reports } from '../api/index.js';
import { Card, EmptyState, Loading, PageHeader, Tabs } from '../components/ui.jsx';
import useResource from '../hooks/useResource.js';
import { dayMonth, periodRange, weekdayShort } from '../lib/dates.js';
import { formatBRL } from '../lib/money.js';
import { STATUS_LABEL } from '../lib/orderStatus.js';

const PERIODS = [['today', 'Hoje'], ['yesterday', 'Ontem'], ['7d', '7 dias'], ['30d', '30 dias'], ['month', 'Este mês']];
const FULFILL = { DELIVERY: 'Entrega', PICKUP: 'Retirada' };

function Kpi({ label, value, tone = '' }) {
  return (
    <Card className="p-4">
      <p className="text-sm font-medium text-ink-soft">{label}</p>
      <p className={`mt-1 font-display text-3xl font-extrabold leading-none ${tone}`}>{value}</p>
    </Card>
  );
}

/** barras simples em CSS (sem biblioteca de gráficos) */
function Bars({ data, label, value, format, tick }) {
  const max = Math.max(1, ...data.map(value));
  return (
    <div className="flex h-44 items-end gap-1" role="img" aria-label="Gráfico de barras">
      {data.map((d, i) => (
        <div key={i} className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
          <span className="pointer-events-none absolute -top-1 z-10 hidden -translate-y-full whitespace-nowrap rounded-md bg-navy px-2 py-1 text-xs text-white group-hover:block">{label(d)}: {format(value(d))}</span>
          <div className="w-full max-w-16 rounded-t-md bg-orange transition-all group-hover:bg-orange-deep" style={{ height: `${(value(d) / max) * 100}%`, minHeight: value(d) > 0 ? 3 : 0 }} />
          <span className="h-3 w-full truncate text-center text-[10px] text-ink-soft">{tick(d, i)}</span>
        </div>
      ))}
    </div>
  );
}

function Breakdown({ title, rows }) {
  const total = rows.reduce((s, r) => s + r.value, 0) || 1;
  return (
    <Card className="p-4">
      <h3 className="mb-3 font-display text-lg font-bold">{title}</h3>
      {rows.length === 0 ? <p className="text-sm text-ink-soft">Sem dados.</p> : (
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.label} className="text-sm">
              <div className="mb-1 flex justify-between gap-2"><span className="truncate font-medium">{r.label}</span><span className="shrink-0 text-ink-soft">{r.value} · {Math.round((r.value / total) * 100)}%</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-cream-2"><div className="h-full rounded-full bg-orange" style={{ width: `${(r.value / total) * 100}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function SummaryPage() {
  const [period, setPeriod] = useState('7d');
  const { data, loading, error } = useResource(() => { const { from, to } = periodRange(period); return Reports.summary(from, to); }, [period]);
  const days = data?.byDay ?? [];

  return (
    <>
      <PageHeader title="Resumo" subtitle="Vendas não incluem pedidos recusados, cancelados ou devolvidos.">
        <Tabs value={period} onChange={setPeriod} tabs={PERIODS.map(([key, label]) => ({ key, label }))} />
      </PageHeader>
      {loading && !data ? <Loading /> : error ? <p className="text-cherry">{error.message}</p> : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Faturamento" value={formatBRL(data.totals.revenueCents)} tone="text-mint" />
            <Kpi label="Pedidos" value={data.totals.orders} />
            <Kpi label="Ticket médio" value={formatBRL(data.totals.averageTicketCents)} />
            <Kpi label="Não concluídos" value={data.totals.notSoldOrders} tone={data.totals.notSoldOrders ? 'text-cherry' : ''} />
          </div>
          {data.totals.orders === 0 ? (
            <EmptyState icon="chart" title="Sem vendas neste período">Escolha outro período ou aguarde novos pedidos.</EmptyState>
          ) : (
            <>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
                <Card className="p-4">
                  <h3 className="mb-3 font-display text-lg font-bold">Faturamento por dia</h3>
                  <Bars data={days} value={(d) => d.revenueCents} format={formatBRL} label={(d) => `${weekdayShort(d.date)} ${dayMonth(d.date)}`} tick={(d, i) => (days.length <= 10 || i % Math.ceil(days.length / 10) === 0 ? (days.length <= 8 ? weekdayShort(d.date) : dayMonth(d.date)) : '')} />
                </Card>
                <Card className="p-4">
                  <h3 className="mb-3 font-display text-lg font-bold">Pedidos por hora</h3>
                  <Bars data={data.byHour} value={(d) => d.orders} format={(v) => `${v} pedidos`} label={(d) => `${d.hour}h`} tick={(d) => (d.hour % 3 === 0 ? d.hour : '')} />
                </Card>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-3">
                <Card className="p-4">
                  <h3 className="mb-3 font-display text-lg font-bold">Mais vendidos</h3>
                  {data.topProducts.length === 0 ? <p className="text-sm text-ink-soft">Sem dados.</p> : (
                    <ol className="space-y-2">
                      {data.topProducts.map((p, i) => (
                        <li key={p.productName ?? p.name} className="flex items-center gap-3 text-sm">
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-orange-light text-xs font-extrabold text-orange-deep">{i + 1}</span>
                          <span className="min-w-0 flex-1 truncate font-medium">{p.productName ?? p.name}</span>
                          <span className="shrink-0 text-ink-soft">{p.quantity}× · {formatBRL(p.revenueCents)}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </Card>
                <Breakdown title="Entrega x retirada" rows={asRows(data.byFulfillment, (k) => FULFILL[k] ?? k)} />
                <Breakdown title="Formas de pagamento" rows={asRows(data.byPayment, (k) => k)} />
              </div>
              <Breakdown title="Pedidos por status" rows={asRows(data.byStatus, (k) => STATUS_LABEL[k] ?? k)} />
            </>
          )}
        </div>
      )}
    </>
  );
}

// aceita {chave: n} ou [{key/name/..., orders}]
function asRows(src, name) {
  if (!src) return [];
  if (Array.isArray(src)) return src.map((r) => ({ label: name(r.key ?? r.name ?? r.status ?? r.fulfillment ?? r.payment ?? '?'), value: r.orders ?? r.count ?? 0 }));
  return Object.entries(src).map(([k, v]) => ({ label: name(k), value: typeof v === 'object' ? v.orders ?? v.count ?? 0 : v })).filter((r) => r.value > 0);
}
