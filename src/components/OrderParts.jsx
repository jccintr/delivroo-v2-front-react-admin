import { createPortal } from 'react-dom';
import { Orders } from '../api/index.js';
import { useOrders } from '../context/OrdersContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { dateTimeOf, timeAgo, timeOf } from '../lib/dates.js';
import { formatBRL } from '../lib/money.js';
import { STATUS_LABEL, STATUS_TONE, actionsFor } from '../lib/orderStatus.js';
import { whatsappLink } from '../lib/phone.js';
import { maskPhone } from '../lib/phone.js';
import Icon from './Icon.jsx';
import { Badge, Button, Modal, cx } from './ui.jsx';
import { useState } from 'react';

export const StatusBadge = ({ status }) => <Badge className={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;

export const FulfillmentBadge = ({ order }) => (
  <Badge className={order.fulfillment === 'DELIVERY' ? 'bg-navy text-white' : 'bg-orange-light text-orange-deep'}>{order.fulfillment === 'DELIVERY' ? 'Entrega' : 'Retirada'}</Badge>
);

/** muda o status (pede motivo quando preciso) e oferece avisar o cliente pelo WhatsApp */
export function useOrderActions() {
  const { confirm, toast, error } = useUI();
  const { replaceOrder, refresh } = useOrders();
  const [busyId, setBusyId] = useState(null);

  async function run(order, action) {
    let reason;
    if (action.needsReason) {
      reason = await confirm({ title: `${action.label} pedido #${order.orderNumber}?`, askReason: true, danger: true, confirmLabel: action.label });
      if (!reason) return null;
    }
    setBusyId(order.id);
    try {
      const r = await Orders.setStatus(order.id, action.status, reason);
      replaceOrder(r.order);
      if (r.message && order.customer.phone) {
        toast(`Pedido #${order.orderNumber}: ${STATUS_LABEL[action.status].toLowerCase()}.`, {
          kind: 'success', ms: 9000,
          action: { label: 'Avisar no WhatsApp', run: () => window.open(whatsappLink(order.customer.phone, r.message), '_blank', 'noopener') },
        });
      } else toast(`Pedido #${order.orderNumber}: ${STATUS_LABEL[action.status].toLowerCase()}.`, { kind: 'success' });
      return r.order;
    } catch (e) {
      error(e.message);
      if (e.status === 409) refresh();
      return null;
    } finally { setBusyId(null); }
  }
  return { run, busyId };
}

export function OrderCard({ order, onOpen, actions }) {
  const primary = actionsFor(order).find((a) => a.kind === 'primary');
  const isNew = order.status === 'RECEIVED';
  const count = order.items.reduce((n, i) => n + i.quantity, 0);
  return (
    <div className={cx('rounded-2xl border bg-white p-3.5 shadow-sm transition', isNew ? 'border-orange ring-2 ring-orange/20' : 'border-line')}>
      <button onClick={() => onOpen(order)} className="block w-full text-left" aria-label={`Abrir pedido ${order.orderNumber}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-display text-xl font-extrabold leading-none">#{order.orderNumber}</p>
            <p className="mt-1 truncate text-sm font-semibold">{order.customer.name}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-bold">{formatBRL(order.totalCents)}</p>
            <p className="text-xs text-ink-soft">{timeAgo(order.createdAt)}</p>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <FulfillmentBadge order={order} />
          <StatusBadge status={order.status} />
          <span className="text-xs text-ink-soft">{count} {count === 1 ? 'item' : 'itens'} · {order.payment.name}</span>
        </div>
        <ul className="mt-2 space-y-0.5 text-sm text-ink-soft">
          {order.items.slice(0, 3).map((i) => <li key={i.id} className="truncate">{i.quantity}× {i.productName}{i.variantName && i.variantName !== 'Único' ? ` (${i.variantName})` : ''}</li>)}
          {order.items.length > 3 && <li className="text-xs">+ {order.items.length - 3} mais…</li>}
        </ul>
      </button>
      {primary && (
        <Button size="sm" className="mt-3 w-full" loading={actions.busyId === order.id} onClick={() => actions.run(order, primary)}>{primary.label}</Button>
      )}
    </div>
  );
}

const Row = ({ label, children, bold }) => <div className={cx('flex justify-between gap-4 py-0.5', bold && 'text-base font-extrabold')}><span className={bold ? '' : 'text-ink-soft'}>{label}</span><span>{children}</span></div>;

export function OrderDetail({ order, onClose, actions }) {
  const acts = actionsFor(order);
  const delivery = order.fulfillment === 'DELIVERY';
  return (
    <>
      <Modal
        open onClose={onClose} wide title={`Pedido #${order.orderNumber}`}
        footer={<>
          <Button kind="secondary" onClick={() => window.print()}><Icon name="print" className="size-4" /> Imprimir</Button>
          {order.customer.phone && <a href={whatsappLink(order.customer.phone)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold hover:bg-cream-2"><Icon name="chat" className="size-4" /> WhatsApp</a>}
          {acts.map((async_) => (
            <Button key={async_.status} kind={async_.kind === 'primary' ? 'primary' : async_.kind === 'danger' ? 'danger' : 'secondary'} loading={actions.busyId === order.id}
              onClick={() => actions.run(order, async_)}>{async_.label}</Button>
          ))}
        </>}
      >
        <div className="mb-3 flex flex-wrap items-center gap-2"><StatusBadge status={order.status} /><FulfillmentBadge order={order} /><span className="text-sm text-ink-soft">{dateTimeOf(order.createdAt)} · {timeAgo(order.createdAt)}</span></div>

        <section className="rounded-2xl bg-white p-4 text-sm">
          <p className="text-base font-bold">{order.customer.name}</p>
          <p className="text-ink-soft">{maskPhone(order.customer.phone)}</p>
          {delivery && <p className="mt-2 flex items-start gap-2"><Icon name="pin" className="mt-0.5 size-4 shrink-0 text-orange" /><span>{order.delivery.address}{order.delivery.district ? ` — ${order.delivery.district}` : ''}</span></p>}
        </section>

        <section className="mt-3 rounded-2xl bg-white p-4">
          <h3 className="mb-2 font-display text-lg font-bold">Itens</h3>
          <ul className="divide-y divide-line">
            {order.items.map((i) => (
              <li key={i.id} className="py-2.5 text-sm">
                <div className="flex justify-between gap-3 font-semibold"><span>{i.quantity}× {i.productName}{i.variantName && i.variantName !== 'Único' ? ` — ${i.variantName}` : ''}</span><span>{formatBRL(i.lineTotalCents)}</span></div>
                {i.options.length > 0 && (
                  <ul className="mt-1 space-y-0.5 pl-4 text-ink-soft">
                    {i.options.map((o, k) => <li key={k}>{o.quantity > 1 ? `${o.quantity}× ` : ''}{o.optionName} <span className="text-xs">({o.groupName}){o.chargedCents > 0 ? ` +${formatBRL(o.chargedCents)}` : ''}</span></li>)}
                  </ul>
                )}
                {i.legacyDescription && <p className="mt-1 pl-4 text-ink-soft">{i.legacyDescription}</p>}
                {i.notes && <p className="mt-1 rounded-lg bg-butter/25 px-2 py-1 pl-4 text-amber-900">Obs.: {i.notes}</p>}
              </li>
            ))}
          </ul>
          {order.notes && <p className="mt-2 rounded-lg bg-butter/25 px-3 py-2 text-sm text-amber-900"><b>Observação do pedido:</b> {order.notes}</p>}
        </section>

        <section className="mt-3 rounded-2xl bg-white p-4 text-sm">
          <Row label="Subtotal">{formatBRL(order.subtotalCents)}</Row>
          {delivery && <Row label="Taxa de entrega">{formatBRL(order.deliveryFeeCents)}</Row>}
          {order.discountCents > 0 && <Row label="Desconto">− {formatBRL(order.discountCents)}</Row>}
          <Row label="Total" bold>{formatBRL(order.totalCents)}</Row>
          <div className="mt-2 border-t border-line pt-2">
            <Row label="Pagamento">{order.payment.name}</Row>
            {order.payment.cashChangeForCents > 0 && <Row label="Troco para">{formatBRL(order.payment.cashChangeForCents)} <b className="text-orange-deep">(troco {formatBRL(order.payment.cashChangeForCents - order.totalCents)})</b></Row>}
          </div>
        </section>

        {order.history?.length > 0 && (
          <section className="mt-3 rounded-2xl bg-white p-4 text-sm">
            <h3 className="mb-2 font-display text-lg font-bold">Histórico</h3>
            <ol className="space-y-1.5">
              {order.history.map((h, i) => (
                <li key={i} className="flex gap-2"><span className="w-12 shrink-0 text-ink-soft">{timeOf(h.createdAt)}</span><span><b>{STATUS_LABEL[h.status]}</b>{h.reason ? ` — ${h.reason}` : ''}</span></li>
              ))}
            </ol>
          </section>
        )}
      </Modal>
      <Ticket order={order} />
    </>
  );
}

/** cupom 80 mm (só aparece ao imprimir) */
function Ticket({ order }) {
  const delivery = order.fulfillment === 'DELIVERY';
  return createPortal(
    <div className="print-ticket">
      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 16 }}>PEDIDO #{order.orderNumber}</div>
      <div style={{ textAlign: 'center' }}>{dateTimeOf(order.createdAt)} · {delivery ? 'ENTREGA' : 'RETIRADA'}</div>
      <hr />
      <div><b>{order.customer.name}</b></div>
      <div>{maskPhone(order.customer.phone)}</div>
      {delivery && <div>{order.delivery.address}{order.delivery.district ? ` - ${order.delivery.district}` : ''}</div>}
      <hr />
      {order.items.map((i) => (
        <div key={i.id} style={{ marginBottom: 4 }}>
          <div><b>{i.quantity}x {i.productName}{i.variantName && i.variantName !== 'Único' ? ` (${i.variantName})` : ''}</b> — {formatBRL(i.lineTotalCents)}</div>
          {i.options.map((o, k) => <div key={k}>&nbsp;&nbsp;+ {o.quantity > 1 ? `${o.quantity}x ` : ''}{o.optionName}</div>)}
          {i.notes && <div>&nbsp;&nbsp;Obs: {i.notes}</div>}
        </div>
      ))}
      {order.notes && <div>Obs. pedido: {order.notes}</div>}
      <hr />
      <div>Subtotal: {formatBRL(order.subtotalCents)}</div>
      {delivery && <div>Entrega: {formatBRL(order.deliveryFeeCents)}</div>}
      {order.discountCents > 0 && <div>Desconto: -{formatBRL(order.discountCents)}</div>}
      <div style={{ fontSize: 15 }}><b>TOTAL: {formatBRL(order.totalCents)}</b></div>
      <div>Pagamento: {order.payment.name}</div>
      {order.payment.cashChangeForCents > 0 && <div>Troco para {formatBRL(order.payment.cashChangeForCents)}</div>}
    </div>,
    document.body,
  );
}
