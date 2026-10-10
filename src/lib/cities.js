// Busca de cidades: ignora acentos e maiúsculas ("sao paulo" acha "São Paulo"); quem começa com o texto vem primeiro.
export const normalize = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export function filterCities(cities, query, limit = 8) {
  const q = normalize(query);
  if (!q) return cities.slice(0, limit);
  const starts = [];
  const contains = [];
  for (const c of cities) {
    const n = normalize(c.name);
    if (n.startsWith(q)) starts.push(c);
    else if (n.includes(q)) contains.push(c);
  }
  return [...starts, ...contains].slice(0, limit);
}
