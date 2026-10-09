import { describe, expect, it } from 'vitest';
import { billingNotice, formatDay, isRestricted, openInvoice, statusSummary } from '../src/lib/billing.js';

const access = (billing, panel = 'FULL') => ({ state: 'FULL', panel, menuAvailable: true, billing });

describe('datas da assinatura', () => {
  it('formata o dia sem mexer com fuso', () => {
    expect(formatDay('2026-10-23')).toBe('23/10/2026');
    expect(formatDay('2026-01-01T00:00:00.000Z')).toBe('01/01/2026');
    expect(formatDay(null)).toBe('');
  });
});

describe('aviso no topo do painel', () => {
  it('não avisa quando está tudo em dia ou longe do vencimento', () => {
    expect(billingNotice(access({ status: 'TRIALING', daysLeft: 10, dueSoon: false }))).toBeNull();
    expect(billingNotice(access({ status: 'ACTIVE', daysLeft: 20, dueSoon: false }))).toBeNull();
    expect(billingNotice(access({ status: 'COURTESY', indefinite: true }))).toBeNull();
    expect(billingNotice(null)).toBeNull();
  });

  it('teste perto do fim', () => {
    const n = billingNotice(access({ status: 'TRIALING', daysLeft: 3, dueSoon: true }));
    expect(n).toMatchObject({ tone: 'info', title: 'Seu teste grátis termina em 3 dias' });
    expect(billingNotice(access({ status: 'TRIALING', daysLeft: 1, dueSoon: true })).title).toBe('Seu teste grátis termina em 1 dia');
    expect(billingNotice(access({ status: 'TRIALING', daysLeft: 0, dueSoon: true })).title).toBe('Seu teste grátis termina hoje');
  });

  it('assinatura paga perto de vencer', () => {
    expect(billingNotice(access({ status: 'ACTIVE', daysLeft: 2, dueSoon: true }))).toMatchObject({ tone: 'info', title: 'Sua assinatura vence em 2 dias' });
  });

  it('em atraso (carência) diz até quando dá para regularizar', () => {
    const n = billingNotice(access({ status: 'PAST_DUE', graceEndsOn: '2026-10-31' }));
    expect(n.tone).toBe('warn');
    expect(n.text).toContain('31/10/2026');
  });

  it('suspensa ou cancelada: aviso grave', () => {
    for (const status of ['SUSPENDED', 'CANCELED']) {
      expect(billingNotice(access({ status }, 'BILLING_ONLY'))).toMatchObject({ tone: 'bad' });
    }
  });
});

describe('painel restrito e resumos', () => {
  it('só a loja suspensa fica restrita', () => {
    expect(isRestricted(access({ status: 'SUSPENDED' }, 'BILLING_ONLY'))).toBe(true);
    expect(isRestricted(access({ status: 'PAST_DUE' }, 'FULL'))).toBe(false);
    expect(isRestricted(undefined)).toBe(false);
  });

  it('resumo da situação', () => {
    expect(statusSummary(access({ status: 'TRIALING', coveredThrough: '2026-10-23', daysLeft: 14 }))).toBe('Teste grátis até 23/10/2026 (faltam 14 dias).');
    expect(statusSummary(access({ status: 'ACTIVE', coveredThrough: '2026-11-22' }))).toBe('Assinatura paga até 22/11/2026.');
    expect(statusSummary(access({ status: 'COURTESY', indefinite: true }))).toContain('sem prazo');
    expect(statusSummary(access({ status: 'SUSPENDED', coveredThrough: '2026-10-01' }))).toContain('fora do ar');
  });

  it('acha a fatura em aberto', () => {
    expect(openInvoice([{ id: 3, status: 'PAID' }, { id: 2, status: 'OPEN' }])).toMatchObject({ id: 2 });
    expect(openInvoice([{ id: 1, status: 'VOID' }])).toBeNull();
    expect(openInvoice(undefined)).toBeNull();
  });
});
