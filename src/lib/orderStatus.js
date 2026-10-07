// Fluxo igual ao da API (services/orderStatus.js). A API valida; aqui só decidimos que botões mostrar.
export const STATUS_LABEL = {
  RECEIVED: 'Novo', PREPARING: 'Em preparo', READY: 'Pronto p/ retirada', OUT_FOR_DELIVERY: 'Saiu p/ entrega',
  DELIVERED: 'Entregue', PICKED_UP: 'Retirado', REJECTED: 'Recusado', CANCELED: 'Cancelado', RETURNED: 'Devolvido',
};

// cor do selo: classes prontas (Tailwind precisa ver as strings inteiras)
export const STATUS_TONE = {
  RECEIVED: 'bg-orange text-white',
  PREPARING: 'bg-butter/40 text-amber-900',
  READY: 'bg-sky-100 text-sky-800',
  OUT_FOR_DELIVERY: 'bg-sky-100 text-sky-800',
  DELIVERED: 'bg-mint-light text-emerald-800',
  PICKED_UP: 'bg-mint-light text-emerald-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELED: 'bg-red-100 text-red-800',
  RETURNED: 'bg-red-100 text-red-800',
};

export const TERMINAL = new Set(['DELIVERED', 'PICKED_UP', 'REJECTED', 'CANCELED', 'RETURNED']);
export const FAILED = new Set(['REJECTED', 'CANCELED', 'RETURNED']);

/**
 * Ações disponíveis para um pedido.
 * kind: 'primary' (próximo passo), 'secondary', 'danger'. needsReason: a API exige motivo (recusar/cancelar).
 */
export function actionsFor(order) {
  const delivery = order.fulfillment === 'DELIVERY';
  switch (order.status) {
    case 'RECEIVED':
      return [
        { status: 'PREPARING', label: 'Aceitar e preparar', kind: 'primary' },
        { status: 'REJECTED', label: 'Recusar', kind: 'danger', needsReason: true },
      ];
    case 'PREPARING':
      return [
        delivery ? { status: 'OUT_FOR_DELIVERY', label: 'Saiu para entrega', kind: 'primary' } : { status: 'READY', label: 'Pronto para retirada', kind: 'primary' },
        { status: 'CANCELED', label: 'Cancelar', kind: 'danger', needsReason: true },
      ];
    case 'READY':
      return [{ status: 'PICKED_UP', label: 'Cliente retirou', kind: 'primary' }, { status: 'CANCELED', label: 'Cancelar', kind: 'danger', needsReason: true }];
    case 'OUT_FOR_DELIVERY':
      return [
        { status: 'DELIVERED', label: 'Entregue', kind: 'primary' },
        { status: 'RETURNED', label: 'Não entregue (devolvido)', kind: 'secondary' },
        { status: 'CANCELED', label: 'Cancelar', kind: 'danger', needsReason: true },
      ];
    default:
      return [];
  }
}

/** colunas do quadro de pedidos */
export const COLUMNS = [
  { key: 'new', title: 'Novos', statuses: ['RECEIVED'], accent: 'bg-orange' },
  { key: 'preparing', title: 'Em preparo', statuses: ['PREPARING'], accent: 'bg-butter' },
  { key: 'going', title: 'Prontos / A caminho', statuses: ['READY', 'OUT_FOR_DELIVERY'], accent: 'bg-sky-400' },
  { key: 'done', title: 'Finalizados', statuses: ['DELIVERED', 'PICKED_UP', 'REJECTED', 'CANCELED', 'RETURNED'], accent: 'bg-mint' },
];
