import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { connectEvents } from '../src/api/sse.js';

// EventSource falso: guarda as instâncias para o teste disparar eventos/erros
class FakeES {
  static all = [];
  constructor(url) { this.url = url; this.listeners = {}; this.closed = false; FakeES.all.push(this); }
  addEventListener(name, fn) { (this.listeners[name] ??= []).push(fn); }
  close() { this.closed = true; }
  emit(name, data) { (this.listeners[name] ?? []).forEach((fn) => fn({ data: JSON.stringify(data) })); }
  fail() { this.onerror?.(); }
}

const docListeners = {};
beforeEach(() => {
  vi.useFakeTimers();
  FakeES.all = [];
  globalThis.EventSource = FakeES;
  globalThis.document = { visibilityState: 'visible', addEventListener: (n, f) => { docListeners[n] = f; }, removeEventListener: (n) => { delete docListeners[n]; } };
  globalThis.window = { addEventListener: (n, f) => { docListeners[n] = f; }, removeEventListener: (n) => { delete docListeners[n]; } };
});
afterEach(() => { vi.useRealTimers(); delete globalThis.EventSource; delete globalThis.document; delete globalThis.window; });

const tick = async (ms = 0) => { await vi.advanceTimersByTimeAsync(ms); };

describe('connectEvents', () => {
  it('conecta, avisa o status e entrega eventos já convertidos de JSON', async () => {
    const status = []; const got = []; let ready = 0;
    const stop = connectEvents(async () => 'http://x/events', { 'order.updated': (d) => got.push(d) }, { onStatus: (s) => status.push(s), onReady: () => { ready += 1; } });
    await tick();
    const es = FakeES.all[0];
    expect(es.url).toBe('http://x/events');
    es.emit('ready', {}); es.emit('order.updated', { status: 'PREPARING' });
    expect(status).toEqual(['connecting', 'live']);
    expect(got).toEqual([{ status: 'PREPARING' }]);
    expect(ready).toBe(1);
    stop();
    expect(es.closed).toBe(true);
  });

  it('em erro fecha, espera e reconecta pedindo URL nova (token novo) com espera crescente', async () => {
    let n = 0;
    const status = [];
    connectEvents(async () => `http://x/events?token=${++n}`, {}, { onStatus: (s) => status.push(s) });
    await tick();
    FakeES.all[0].fail();                       // 401 de token vencido
    expect(FakeES.all[0].closed).toBe(true);
    expect(status.at(-1)).toBe('offline');
    await tick(999); expect(FakeES.all).toHaveLength(1);
    await tick(2);   expect(FakeES.all).toHaveLength(2); // 1ª espera: 1 s
    expect(FakeES.all[1].url).toContain('token=2');
    FakeES.all[1].fail();
    await tick(1500); expect(FakeES.all).toHaveLength(2); // 2ª espera: 2 s
    await tick(600);  expect(FakeES.all).toHaveLength(3);
    FakeES.all[2].emit('ready', {});            // conectou: zera a espera
    FakeES.all[2].fail();
    await tick(1001); expect(FakeES.all).toHaveLength(4);
  });

  it('tenta de novo quando buscar a URL falha e para de vez após encerrar', async () => {
    let calls = 0;
    const stop = connectEvents(async () => { calls += 1; if (calls === 1) throw new Error('rede'); return 'http://x'; }, {});
    await tick(); expect(FakeES.all).toHaveLength(0);
    await tick(1001); expect(FakeES.all).toHaveLength(1);
    stop();
    FakeES.all[0].fail();
    await tick(20000); expect(FakeES.all).toHaveLength(1);
  });

  it('ignora evento malformado sem derrubar a conexão', async () => {
    const got = [];
    connectEvents(async () => 'http://x', { a: (d) => got.push(d) });
    await tick();
    FakeES.all[0].listeners.a[0]({ data: '{quebrado' });
    FakeES.all[0].emit('a', { ok: 1 });
    expect(got).toEqual([{ ok: 1 }]);
  });
});
