// Regras de um grupo de opções (adicionais / obrigatórios) em linguagem de lojista.

/** "Obrigatório · escolha 1" | "Opcional · até 3" ... */
export function describeGroup(g) {
  const required = g.minSelect > 0;
  let rule;
  if (required && g.minSelect === g.maxSelect) rule = g.maxSelect === 1 ? 'escolha 1' : `escolha ${g.maxSelect}`;
  else if (required) rule = `de ${g.minSelect} a ${g.maxSelect}`;
  else rule = g.maxSelect === 1 ? 'até 1' : `até ${g.maxSelect}`;
  const extra = [];
  if (g.maxPerOption > 1) extra.push(`mesma opção até ${g.maxPerOption}×`);
  if (g.pricingMode === 'HIGHEST') extra.push('cobra a mais cara');
  return { required, label: required ? 'Obrigatório' : 'Opcional', rule, extra: extra.join(' · ') };
}

/** validação no cliente (a API valida de novo); devolve mensagem ou null */
export function validateGroup({ name, minSelect, maxSelect, maxPerOption, pricingMode }) {
  if (!String(name ?? '').trim()) return 'Dê um nome ao grupo.';
  if (!Number.isInteger(maxSelect) || maxSelect < 1) return 'O máximo de escolhas deve ser pelo menos 1.';
  if (!Number.isInteger(minSelect) || minSelect < 0) return 'O mínimo não pode ser negativo.';
  if (maxSelect < minSelect) return 'O máximo não pode ser menor que o mínimo.';
  if (!Number.isInteger(maxPerOption) || maxPerOption < 1) return 'A quantidade por opção deve ser pelo menos 1.';
  if (pricingMode === 'HIGHEST' && maxPerOption !== 1) return 'Cobrando a opção mais cara, cada opção só pode ser escolhida 1 vez.';
  return null;
}

/** mapa {variantId: cents} só com os preços preenchidos (o PATCH da API substitui todos) */
export function cleanPrices(prices) {
  return Object.fromEntries(Object.entries(prices ?? {}).filter(([, v]) => Number.isInteger(v) && v >= 0));
}

/** faixa de preço de um produto: "R$ 10,00" ou "a partir de R$ 10,00" */
export function priceRange(variants, fmt) {
  const act = variants.filter((v) => v.active);
  const list = act.length ? act : variants;
  if (!list.length) return '—';
  const min = Math.min(...list.map((v) => v.priceCents));
  const max = Math.max(...list.map((v) => v.priceCents));
  return min === max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`;
}
