export const timeOf = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
export const dateTimeOf = (iso) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export function timeAgo(iso, now = Date.now()) {
  const min = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.floor(h / 24)} d`;
}

export const startOfDay = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

/** "2026-10-06" (data local) para <input type="date"> */
export const toInputDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const fromInputDate = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

/** presets do resumo -> { from, to } (to exclusivo) */
export function periodRange(key, now = new Date()) {
  const today = startOfDay(now);
  switch (key) {
    case 'today': return { from: today, to: addDays(today, 1) };
    case 'yesterday': return { from: addDays(today, -1), to: today };
    case '7d': return { from: addDays(today, -6), to: addDays(today, 1) };
    case '30d': return { from: addDays(today, -29), to: addDays(today, 1) };
    case 'month': return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: addDays(today, 1) };
    default: return { from: today, to: addDays(today, 1) };
  }
}

export const weekdayShort = (isoDate) => ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][new Date(`${isoDate}T12:00:00`).getDay()];
export const dayMonth = (isoDate) => isoDate.slice(8, 10) + '/' + isoDate.slice(5, 7);
