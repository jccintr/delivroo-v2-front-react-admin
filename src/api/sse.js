// Conexão SSE com reconexão própria.
// O EventSource já reconecta sozinho em quedas de rede, mas desiste quando a resposta é um erro HTTP
// (ex.: 401 de token vencido). Por isso fechamos em qualquer erro e abrimos de novo com espera crescente,
// pedindo uma URL nova (novo token) a cada tentativa.
const BACKOFF_MS = [1000, 2000, 5000, 10000, 15000];

/**
 * @param {() => Promise<string>} getUrl   devolve a URL do fluxo (pode buscar token novo)
 * @param {Record<string, (data:any)=>void>} handlers  por nome de evento SSE
 * @param {{ onStatus?: (s:'connecting'|'live'|'offline')=>void, onReady?: ()=>void }} opts
 * @returns {() => void} função que encerra tudo
 */
export function connectEvents(getUrl, handlers, { onStatus, onReady } = {}) {
  if (typeof EventSource === 'undefined') { onStatus?.('offline'); return () => {}; }
  let es = null; let timer = null; let attempt = 0; let closed = false;

  const status = (s) => { if (!closed) onStatus?.(s); };

  async function open() {
    if (closed) return;
    status('connecting');
    let url;
    try { url = await getUrl(); } catch { return retry(); }
    if (closed) return;
    es = new EventSource(url);
    es.addEventListener('ready', () => { attempt = 0; status('live'); onReady?.(); });
    for (const [name, fn] of Object.entries(handlers)) {
      es.addEventListener(name, (e) => { try { fn(JSON.parse(e.data)); } catch { /* evento malformado: ignora */ } });
    }
    es.onerror = () => { es?.close(); es = null; retry(); };
  }

  function retry() {
    if (closed) return;
    status('offline');
    clearTimeout(timer);
    timer = setTimeout(open, BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)]);
    attempt += 1;
  }

  // aba que volta ao foco com a conexão caída: tenta na hora
  const onVisible = () => { if (document.visibilityState === 'visible' && !es && !closed) { clearTimeout(timer); open(); } };
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('online', onVisible);

  open();
  return () => {
    closed = true;
    clearTimeout(timer);
    es?.close();
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('online', onVisible);
  };
}
