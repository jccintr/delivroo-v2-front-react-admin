import { afterEach, describe, expect, it, vi } from 'vitest';
import { dismissPriceReview, markPriceReview, needsPriceReview } from '../src/lib/priceReview.js';

const fakeStorage = () => {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => { data.set(k, String(v)); },
    removeItem: (k) => { data.delete(k); },
  };
};

afterEach(() => vi.unstubAllGlobals());

describe('lembrete de revisar os preços do modelo de cardápio', () => {
  it('liga ao cadastrar com modelo e desliga quando o dono marca como revisado', () => {
    vi.stubGlobal('localStorage', fakeStorage());
    expect(needsPriceReview(7)).toBe(false);
    markPriceReview(7);
    expect(needsPriceReview(7)).toBe(true);
    dismissPriceReview(7);
    expect(needsPriceReview(7)).toBe(false);
  });

  it('é separado por loja (outra loja no mesmo navegador não herda o aviso)', () => {
    vi.stubGlobal('localStorage', fakeStorage());
    markPriceReview(1);
    expect(needsPriceReview(1)).toBe(true);
    expect(needsPriceReview(2)).toBe(false);
    dismissPriceReview(2);
    expect(needsPriceReview(1)).toBe(true);
  });

  it('não quebra quando o navegador bloqueia o armazenamento (aba anônima, dados bloqueados)', () => {
    const blocked = {
      getItem: () => { throw new Error('bloqueado'); },
      setItem: () => { throw new Error('bloqueado'); },
      removeItem: () => { throw new Error('bloqueado'); },
    };
    vi.stubGlobal('localStorage', blocked);
    expect(() => markPriceReview(1)).not.toThrow();
    expect(needsPriceReview(1)).toBe(false);
    expect(() => dismissPriceReview(1)).not.toThrow();
  });

  it('não quebra sem localStorage (ambiente sem navegador)', () => {
    expect(needsPriceReview(1)).toBe(false);
    expect(() => markPriceReview(1)).not.toThrow();
    expect(() => dismissPriceReview(1)).not.toThrow();
  });
});
