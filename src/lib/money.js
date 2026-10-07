const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatBRL = (cents) => brl.format((cents ?? 0) / 100);

/** "45,90" | "45.90" | "R$ 1.045,90" -> 4590 (null se inválido) */
export function parseBRLToCents(text) {
  if (text == null) return null;
  const cleaned = String(text).replace(/[^\d,.-]/g, '');
  if (!cleaned) return null;
  const normalized = cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned;
  const value = Number(normalized);
  return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : null;
}

/** 4590 -> "45,90" (para campos de edição) */
export const centsToInput = (cents) => (cents == null ? '' : (cents / 100).toFixed(2).replace('.', ','));
