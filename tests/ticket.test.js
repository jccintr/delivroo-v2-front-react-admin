import { describe, expect, it } from 'vitest';
import { changeDueCents, fulfillmentBanner, itemTitle, optionLine } from '../src/lib/ticket.js';

describe('cupom', () => {
  it('adicional pago mostra o preço ao lado do nome; opção sem custo mostra o grupo', () => {
    const brl = (t) => t.replace(/\s/g, ' ');
    expect(brl(optionLine({ optionName: 'Salada', groupName: 'Adicionais', quantity: 1, chargedCents: 300 }))).toBe('+ Salada: R$ 3,00');
    expect(brl(optionLine({ optionName: 'Ovo', groupName: 'Extras', quantity: 2, chargedCents: 200 }))).toBe('+ 2x Ovo: R$ 2,00');
    expect(optionLine({ optionName: 'Brioche', groupName: 'Pão', quantity: 1, chargedCents: 0 })).toBe('Pão: Brioche');
  });

  it('título do item esconde a variação "Único"', () => {
    expect(itemTitle({ quantity: 2, productName: 'Big Chicken', variantName: 'Único' })).toBe('2x Big Chicken');
    expect(itemTitle({ quantity: 1, productName: 'Pizza', variantName: 'Grande' })).toBe('1x Pizza (Grande)');
  });

  it('tipo do pedido e troco', () => {
    expect(fulfillmentBanner({ fulfillment: 'DELIVERY' })).toBe('ENTREGAR');
    expect(fulfillmentBanner({ fulfillment: 'PICKUP' })).toBe('RETIRADA');
    expect(changeDueCents({ totalCents: 5098, payment: { cashChangeForCents: 10000 } })).toBe(4902);
    expect(changeDueCents({ totalCents: 5098, payment: { cashChangeForCents: 0 } })).toBe(0);
  });
});
