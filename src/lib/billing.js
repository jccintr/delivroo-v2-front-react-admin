// Regras de exibição da assinatura (o servidor decide o acesso; aqui só traduzimos para o lojista).

/** "2026-10-23" -> "23/10/2026" (sem passar por Date, para não sofrer com fuso) */
export function formatDay(day) {
  if (!day) return '';
  const [y, m, d] = String(day).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export const dayWord = (n) => (n === 1 ? '1 dia' : `${n} dias`);

export const BILLING_LABEL = {
  TRIALING: 'Em teste grátis',
  ACTIVE: 'Em dia',
  COURTESY: 'Cortesia',
  PAST_DUE: 'Pagamento em atraso',
  SUSPENDED: 'Suspensa',
  CANCELED: 'Cancelada',
};

/** cor do selo: ok | warn | bad */
export const BILLING_TONE = {
  TRIALING: 'ok', ACTIVE: 'ok', COURTESY: 'ok', PAST_DUE: 'warn', SUSPENDED: 'bad', CANCELED: 'bad',
};

export const INVOICE_LABEL = { OPEN: 'Em aberto', PAID: 'Paga', VOID: 'Cancelada' };

/** painel restrito: loja suspensa só enxerga Assinatura e pedidos em andamento */
export const isRestricted = (access) => access?.panel === 'BILLING_ONLY';

/**
 * Aviso para o topo do painel, ou null quando não há nada a dizer.
 * @returns {{ tone: 'info'|'warn'|'bad', title: string, text: string } | null}
 */
export function billingNotice(access) {
  const b = access?.billing;
  if (!b) return null;
  switch (b.status) {
    case 'TRIALING':
      if (!b.dueSoon) return null;
      return {
        tone: 'info',
        title: b.daysLeft === 0 ? 'Seu teste grátis termina hoje' : `Seu teste grátis termina em ${dayWord(b.daysLeft)}`,
        text: 'Escolha um plano e pague para o cardápio continuar no ar.',
      };
    case 'ACTIVE':
      if (!b.dueSoon) return null;
      return {
        tone: 'info',
        title: b.daysLeft === 0 ? 'Sua assinatura vence hoje' : `Sua assinatura vence em ${dayWord(b.daysLeft)}`,
        text: 'Pague a fatura em aberto para não interromper o cardápio.',
      };
    case 'PAST_DUE':
      return {
        tone: 'warn',
        title: 'Pagamento em atraso',
        text: `Regularize até ${formatDay(b.graceEndsOn)}. Depois dessa data o cardápio sai do ar e você deixa de receber pedidos.`,
      };
    case 'SUSPENDED':
    case 'CANCELED':
      return {
        tone: 'bad',
        title: 'Assinatura suspensa — seu cardápio está fora do ar',
        text: 'Regularize o pagamento para voltar a receber pedidos. Os pedidos em andamento ainda podem ser concluídos.',
      };
    default:
      return null;
  }
}

/** texto principal da tela Assinatura */
export function statusSummary(access) {
  const b = access?.billing;
  if (!b) return '';
  switch (b.status) {
    case 'TRIALING': return `Teste grátis até ${formatDay(b.coveredThrough)} (${b.daysLeft === 0 ? 'último dia' : `faltam ${dayWord(b.daysLeft)}`}).`;
    case 'ACTIVE': return `Assinatura paga até ${formatDay(b.coveredThrough)}.`;
    case 'COURTESY': return b.indefinite ? 'Você tem uma cortesia sem prazo. Nada a pagar.' : `Cortesia até ${formatDay(b.coveredThrough)}. Nada a pagar até lá.`;
    case 'PAST_DUE': return `Venceu em ${formatDay(b.coveredThrough)}. Você ainda pode regularizar até ${formatDay(b.graceEndsOn)} sem interromper o cardápio.`;
    default: return `Venceu em ${formatDay(b.coveredThrough)}. O cardápio está fora do ar até o pagamento ser confirmado.`;
  }
}

/** a fatura em aberto (a mais recente que ainda não foi paga nem cancelada) */
export const openInvoice = (invoices) => (invoices ?? []).find((i) => i.status === 'OPEN') ?? null;
