// Em dev, VITE_API_URL fica vazio e o Vite faz proxy de /api. Em produção aponte para a API.
const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
const TOKEN_KEY = 'delivroo:admin:token';

/** URL absoluta/relativa de um caminho da API (usada pelo EventSource) */
export const apiUrl = (path) => `${BASE}${path}`;

export class ApiError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.code = extra.code;
    this.details = extra.details;
  }
}

export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
export const setToken = (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* ignora */ } };

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

// 402 = assinatura suspensa: o painel recarrega a situação da loja e passa a mostrar só a tela Assinatura
let onSuspended = () => {};
export const setSuspendedHandler = (fn) => { onSuspended = fn; };

export async function request(path, { method = 'GET', body, query, signal, form, auth = true } = {}) {
  const qs = query ? `?${new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== ''))}` : '';
  const headers = {};
  if (!form && body !== undefined) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE}${path}${qs}`, { method, headers, signal, body: form ?? (body !== undefined ? JSON.stringify(body) : undefined) });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(0, 'Sem conexão com o servidor. Verifique a internet e tente novamente.');
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && auth) onUnauthorized();
    if (res.status === 402 && data?.code === 'SUBSCRIPTION_SUSPENDED') onSuspended();
    throw new ApiError(res.status, data?.error ?? 'Não foi possível concluir a operação.', data ?? {});
  }
  return data;
}

/** envia uma imagem (multipart) */
export const uploadFile = (path, field, file, method = 'PATCH') => {
  const form = new FormData();
  form.append(field, file);
  return request(path, { method, form });
};

/** mensagem amigável de erro de validação (400 com details) */
export function errorMessage(err) {
  if (err?.details?.length) return err.details.map((d) => d.message).join(' · ');
  return err?.message ?? 'Algo deu errado.';
}

/** baixa um arquivo autenticado (ex.: exportação dos dados) e abre o "salvar como" do navegador */
export async function download(path, filename) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${getToken()}` } });
  } catch {
    throw new ApiError(0, 'Sem conexão com o servidor. Verifique a internet e tente novamente.');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(res.status, data?.error ?? 'Não foi possível baixar o arquivo.', data ?? {});
  }
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
