import { formatBRL } from './money.js';

/**
 * Texto de uma opção no cupom (uma linha só, o preço fica ao lado do nome):
 *  - opção paga (adicional)  -> "+ Salada: R$ 3,00"
 *  - opção sem custo (escolha de um grupo, ex.: Pão/Molho) -> "Pão: Brioche"
 */
export function optionLine(option) {
  const qty = option.quantity > 1 ? `${option.quantity}x ` : '';
  const charged = option.chargedCents ?? 0;
  if (charged > 0) return `+ ${qty}${option.optionName}: ${formatBRL(charged)}`;
  return option.groupName ? `${option.groupName}: ${qty}${option.optionName}` : `${qty}${option.optionName}`;
}

/** "2x Big Chicken (Duplo)" — variação "Único" não aparece */
export function itemTitle(item) {
  const variant = item.variantName && item.variantName !== 'Único' ? ` (${item.variantName})` : '';
  return `${item.quantity}x ${item.productName}${variant}`;
}

/** "ENTREGAR" | "RETIRADA" — destaque do tipo do pedido no topo do cupom */
export const fulfillmentBanner = (order) => (order.fulfillment === 'DELIVERY' ? 'ENTREGAR' : 'RETIRADA');

/** troco a devolver (centavos) ou 0 quando não há troco */
export function changeDueCents(order) {
  const given = order.payment?.cashChangeForCents ?? 0;
  return given > order.totalCents ? given - order.totalCents : 0;
}
