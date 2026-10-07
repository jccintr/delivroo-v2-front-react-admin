import { describe, expect, it } from 'vitest';
import { cleanPrices, describeGroup, priceRange, validateGroup } from '../src/lib/groups.js';
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
