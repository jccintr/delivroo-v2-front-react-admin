import { describe, expect, it } from 'vitest';
import { paymentFlag, pixKeyNotice } from '../src/lib/payment.js';

const pix = (extra = {}) => ({ payment: { type: 'PIX', reportedAt: null, confirmedAt: null, ...extra } });

describe('paymentFlag', () => {
  it('null para dinheiro e cartão', () => {
    expect(paymentFlag({ payment: { type: 'CASH' } })).toBeNull();
    expect(paymentFlag({})).toBeNull();
  });
  it('waiting, review e confirmed (confirmado vence o aviso)', () => {
    expect(paymentFlag(pix())).toBe('waiting');
    expect(paymentFlag(pix({ reportedAt: '2026-01-01' }))).toBe('review');
    expect(paymentFlag(pix({ reportedAt: '2026-01-01', confirmedAt: '2026-01-02' }))).toBe('confirmed');
    expect(paymentFlag(pix({ confirmedAt: '2026-01-02' }))).toBe('confirmed');
  });
});

describe('pixKeyNotice', () => {
  it('sem chave: nada', () => expect(pixKeyNotice(null)).toBeNull());
  it('chave boa: aviso verde com o tipo', () => {
    expect(pixKeyNotice({ ok: true, type: 'PHONE' })).toMatchObject({ tone: 'ok', text: expect.stringContaining('Telefone') });
  });
  it('chave antiga ruim: pede correção', () => {
    expect(pixKeyNotice({ ok: false, code: 'PIX_KEY_INVALID' })).toMatchObject({ tone: 'warn', text: expect.stringContaining('não gera QR code') });
  });
});
