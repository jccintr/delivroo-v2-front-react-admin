import { describe, expect, it } from 'vitest';
import { cleanPrices, describeGroup, groupHasPrices, hasMenuRange, menuFromPrice, priceRange, pricedByGroup, productPriceLabel, validateGroup } from '../src/lib/groups.js';
import { actionsFor } from '../src/lib/orderStatus.js';
import { centsToInput, formatBRL, parseBRLToCents } from '../src/lib/money.js';
import { maskPhone, whatsappLink } from '../src/lib/phone.js';
import { periodRange, toInputDate } from '../src/lib/dates.js';

describe('dinheiro', () => {
  it('converte texto em centavos', () => {
    expect(parseBRLToCents('45,90')).toBe(4590);
    expect(parseBRLToCents('R$ 1.045,90')).toBe(104590);
    expect(parseBRLToCents('12')).toBe(1200);
    expect(parseBRLToCents('')).toBeNull();
    expect(centsToInput(4590)).toBe('45,90');
    expect(formatBRL(4590).replace(/\s/g, ' ')).toMatch(/R\$\s?45,90/);
  });
});

describe('telefone', () => {
  it('máscara e link do WhatsApp', () => {
    expect(maskPhone('11987654321')).toBe('(11) 98765-4321');
    expect(whatsappLink('(11) 98765-4321', 'oi')).toBe('https://wa.me/5511987654321?text=oi');
  });
});

describe('fluxo de status', () => {
  it('entrega e retirada têm caminhos diferentes', () => {
    const next = (o) => actionsFor(o).find((a) => a.kind === 'primary')?.status;
    expect(next({ status: 'RECEIVED', fulfillment: 'DELIVERY' })).toBe('PREPARING');
    expect(next({ status: 'PREPARING', fulfillment: 'DELIVERY' })).toBe('OUT_FOR_DELIVERY');
    expect(next({ status: 'PREPARING', fulfillment: 'PICKUP' })).toBe('READY');
    expect(next({ status: 'READY', fulfillment: 'PICKUP' })).toBe('PICKED_UP');
    expect(next({ status: 'OUT_FOR_DELIVERY', fulfillment: 'DELIVERY' })).toBe('DELIVERED');
    expect(actionsFor({ status: 'DELIVERED', fulfillment: 'DELIVERY' })).toEqual([]);
  });
  it('recusar e cancelar exigem motivo', () => {
    const danger = actionsFor({ status: 'RECEIVED', fulfillment: 'PICKUP' }).find((a) => a.kind === 'danger');
    expect(danger).toMatchObject({ status: 'REJECTED', needsReason: true });
  });
});

describe('grupos de opções', () => {
  const g = (o) => ({ minSelect: 0, maxSelect: 1, maxPerOption: 1, pricingMode: 'ADDITIVE', name: 'x', ...o });
  it('descreve em linguagem de lojista', () => {
    expect(describeGroup(g({ minSelect: 1, maxSelect: 1 }))).toMatchObject({ label: 'Obrigatório', rule: 'escolha 1' });
    expect(describeGroup(g({ maxSelect: 5 }))).toMatchObject({ label: 'Opcional', rule: 'até 5' });
    expect(describeGroup(g({ minSelect: 2, maxSelect: 4, maxPerOption: 2 })).extra).toMatch(/2×/);
    expect(describeGroup(g({ pricingMode: 'HIGHEST' })).extra).toMatch(/mais cara/);
  });
  it('valida as regras como a API', () => {
    expect(validateGroup(g({ name: ' ' }))).toMatch(/nome/i);
    expect(validateGroup(g({ minSelect: 3, maxSelect: 2 }))).toMatch(/máximo/i);
    expect(validateGroup(g({ maxSelect: NaN }))).toBeTruthy();
    expect(validateGroup(g({ pricingMode: 'HIGHEST', maxPerOption: 2 }))).toMatch(/1 vez/);
    expect(validateGroup(g({ minSelect: 1, maxSelect: 3 }))).toBeNull();
  });
  it('limpa preços por variação e calcula faixa', () => {
    expect(cleanPrices({ 1: 500, 2: null, 3: 0 })).toEqual({ 1: 500, 3: 0 });
    const v = [{ priceCents: 1000, active: true }, { priceCents: 2000, active: true }, { priceCents: 9999, active: false }];
    expect(priceRange(v, (c) => `R${c}`)).toBe('R1000 – R2000');
    expect(priceRange([{ priceCents: 500, active: true }], (c) => `R${c}`)).toBe('R500');
  });
});

describe('preço no cardápio (pizza e afins)', () => {
  const fmt = (c) => `R${c}`;
  const flavors = {
    id: 1, name: 'Sabores', minSelect: 1, maxSelect: 2, maxPerOption: 1, pricingMode: 'HIGHEST',
    options: [
      { id: 1, priceCents: 0, prices: { 10: 3500, 11: 4500 }, active: true },
      { id: 2, priceCents: 0, prices: { 10: 4200, 11: 5500 }, active: true },
    ],
  };
  const sizes = [{ id: 10, priceCents: 0, active: true }, { id: 11, priceCents: 0, active: true }];

  it('preço base zerado: vale o sabor mais barato do menor tamanho', () => {
    expect(menuFromPrice(sizes, [flavors])).toBe(3500);
    expect(hasMenuRange(sizes, [flavors])).toBe(true);
  });
  it('preço base é somado ao das opções', () => {
    expect(menuFromPrice([{ id: 10, priceCents: 1000, active: true }], [flavors])).toBe(4500);
  });
  it('opção sem preço por tamanho usa o preço padrão; inativos são ignorados', () => {
    const extra = { ...flavors, options: [{ id: 3, priceCents: 800, prices: {}, active: true }, { id: 4, priceCents: 100, prices: {}, active: false }] };
    expect(menuFromPrice([{ id: 10, priceCents: 0, active: true }], [extra])).toBe(800);
    expect(menuFromPrice([{ id: 10, priceCents: 500, active: false }], [])).toBeNull();
  });
  it('reconhece o grupo que carrega o preço do produto', () => {
    expect(pricedByGroup(flavors)).toBe(true);
    expect(pricedByGroup({ ...flavors, pricingMode: 'ADDITIVE' })).toBe(false);
    expect(pricedByGroup({ ...flavors, minSelect: 0 })).toBe(false);
    expect(pricedByGroup({ ...flavors, options: [{ id: 1, priceCents: 0, prices: {}, active: true }] })).toBe(false);
    expect(groupHasPrices({ ...flavors, pricingMode: 'ADDITIVE' })).toBe(true);
  });
  it('lista de produtos: "a partir de" quando as opções obrigatórias somam', () => {
    expect(productPriceLabel(sizes, [flavors], fmt)).toBe('a partir de R3500');
    expect(productPriceLabel([{ id: 1, priceCents: 4500, active: true }], [], fmt)).toBe('R4500');
    expect(productPriceLabel([{ id: 1, priceCents: 1000, active: true }, { id: 2, priceCents: 2000, active: true }], [], fmt)).toBe('R1000 – R2000');
  });
});

describe('períodos do resumo', () => {
  it('hoje é [00:00, 24:00) e 7 dias inclui hoje', () => {
    const now = new Date(2026, 9, 6, 15, 30);
    const t = periodRange('today', now);
    expect(toInputDate(t.from)).toBe('2026-10-06');
    expect(toInputDate(t.to)).toBe('2026-10-07');
    expect(toInputDate(periodRange('7d', now).from)).toBe('2026-09-30');
    expect(toInputDate(periodRange('month', now).from)).toBe('2026-10-01');
  });
});
import { filterCities } from '../src/lib/cities.js';
describe('filterCities', () => {
  const list = [{ ibgeId: 1, name: 'São Paulo' }, { ibgeId: 2, name: 'Santa Rita do Sapucaí' }, { ibgeId: 3, name: 'Pouso Alegre' }, { ibgeId: 4, name: 'Paulínia' }];
  it('ignora acentos e maiúsculas', () => {
    expect(filterCities(list, 'sao p').map((c) => c.ibgeId)).toEqual([1]);
    expect(filterCities(list, 'PAULINIA').map((c) => c.ibgeId)).toEqual([4]);
  });
  it('quem começa com o texto vem antes de quem só contém', () => {
    expect(filterCities(list, 'pa').map((c) => c.ibgeId)).toEqual([4, 1]);
  });
  it('sem texto devolve o começo da lista, respeitando o limite', () => {
    expect(filterCities(list, '', 2)).toHaveLength(2);
    expect(filterCities(list, 'xyz')).toEqual([]);
  });
});
