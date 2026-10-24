// Pagamento por Pix no painel da loja. A confirmação é manual: o cliente avisa ("Já paguei"),
// a loja confere no app do banco e marca "Confirmei o recebimento".

/**
 * 'review'    cliente avisou que pagou, falta a loja conferir
 * 'confirmed' loja confirmou o recebimento
 * 'waiting'   Pix ainda sem aviso nem confirmação
 * null        pedido que não é Pix
 */
export function paymentFlag(order) {
  const p = order?.payment;
  if (p?.type !== 'PIX') return null;
  if (p.confirmedAt) return 'confirmed';
  if (p.reportedAt) return 'review';
  return 'waiting';
}

export const PIX_TYPE_LABEL = { CPF: 'CPF', CNPJ: 'CNPJ', PHONE: 'Telefone', EMAIL: 'E-mail', RANDOM: 'Chave aleatória' };

/**
 * Aviso sobre a chave Pix salva, a partir de `store.pixKeyStatus` da API.
 * Chave antiga fora do padrão continua aparecendo para o cliente copiar, mas não gera QR code.
 */
export function pixKeyNotice(status) {
  if (!status) return null;
  if (status.ok) return { tone: 'ok', text: `Chave reconhecida (${PIX_TYPE_LABEL[status.type] ?? status.type}). Seus clientes veem o QR code com o valor do pedido.` };
  return { tone: 'warn', text: 'Sua chave Pix não gera QR code. Corrija aqui: CPF, CNPJ, telefone com DDD, e-mail ou chave aleatória.' };
}
