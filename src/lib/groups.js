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

/** preço de uma opção num tamanho: o preço por tamanho, senão o preço padrão (igual ao cardápio público) */
export const optionPriceFor = (option, variantId) => option.prices?.[variantId] ?? option.priceCents ?? 0;

const isPriced = (o) => o.active !== false && (o.priceCents > 0 || Object.values(o.prices ?? {}).some((c) => c > 0));

/**
 * Grupo que "carrega" o preço do produto: obrigatório, cobra só a opção mais cara e tem opções com preço
 * (ex.: sabores da pizza). Nesse caso o preço do tamanho deve ficar em R$ 0,00.
 */
export const pricedByGroup = (g) => g.pricingMode === 'HIGHEST' && g.minSelect > 0 && g.options.some(isPriced);

/** true quando alguma opção do grupo tem preço (o preço do tamanho é só a "base") */
export const groupHasPrices = (g) => g.options.some(isPriced);

/**
 * Menor preço que o cliente vê no cardápio ("a partir de"), com a mesma conta do cardápio público:
 * considera só tamanhos e opções ativos e só o que é obrigatório. null se não há tamanho ativo.
 */
export function menuFromPrice(variants, groups) {
  let best = Infinity;
  for (const v of variants.filter((x) => x.active !== false)) {
    let total = v.priceCents ?? 0;
    for (const g of groups) {
      const options = g.options.filter((o) => o.active !== false);
      if (g.minSelect < 1 || !options.length) continue;
      const prices = options.map((o) => optionPriceFor(o, v.id)).sort((a, b) => a - b);
      if (g.pricingMode === 'HIGHEST') {
        total += prices[0];
      } else {
        let need = g.minSelect;
        for (const p of prices) {
          const take = Math.min(g.maxPerOption, need);
          total += p * take;
          need -= take;
          if (need <= 0) break;
        }
      }
    }
    best = Math.min(best, total);
  }
  return Number.isFinite(best) ? best : null;
}

/** true quando o cliente vê "a partir de" (mais de um tamanho ativo ou grupo obrigatório com opções) */
export const hasMenuRange = (variants, groups) =>
  variants.filter((v) => v.active !== false).length > 1 || groups.some((g) => g.minSelect >= 1 && g.options.some((o) => o.active !== false));

/** preço de um produto na lista do admin: considera as opções obrigatórias (pizza não aparece como R$ 0,00) */
export function productPriceLabel(variants, groups, fmt) {
  const from = menuFromPrice(variants, groups);
  const act = variants.filter((v) => v.active);
  const list = act.length ? act : variants;
  const baseMin = list.length ? Math.min(...list.map((v) => v.priceCents)) : 0;
  if (from != null && from > baseMin) return `a partir de ${fmt(from)}`;
  return priceRange(variants, fmt);
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