import { Auth } from '../api/index.js';

/** segundos -> "45 s" | "3 min" */
export const formatWait = (seconds) => (seconds < 60 ? `${seconds} s` : `${Math.ceil(seconds / 60)} min`);

/** 429 com espera de até 1 minuto = um código acabou de sair: dá para digitar o que já foi enviado */
export const codeAlreadySent = (err) => err?.status === 429 && (err.retryAfterSeconds ?? 60) <= 60;

export const throttleMessage = (err) => `Você pediu códigos demais. Tente novamente em ${formatWait(err?.retryAfterSeconds ?? 60)}.`;

/** devolve a mensagem do primeiro problema, ou '' quando está tudo certo (mesmas regras da API) */
export function validateReset({ code, password, confirm }) {
  if (!/^\d{6}$/.test(code)) return 'Digite o código de 6 dígitos que enviamos por e-mail.';
  if (password.length < 6 || password.length > 72) return 'A nova senha deve ter de 6 a 72 caracteres.';
  if (password !== confirm) return 'A confirmação não é igual à nova senha.';
  return '';
}

/**
 * Pede o código por e-mail. { sent: true } quando saiu agora; { sent: false, wait } quando já tinha saído há instantes.
 * Outros erros (e-mail inválido, 429 de limite por hora, 503...) sobem para quem chamou.
 */
export async function sendResetCode(email) {
  try {
    await Auth.forgotPassword(email);
    return { sent: true };
  } catch (err) {
    if (codeAlreadySent(err)) return { sent: false, wait: err.retryAfterSeconds ?? 60 };
    throw err;
  }
}
