import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { ApiError } from '../src/api/client.js';
import { AuthProvider } from '../src/context/AuthContext.jsx';
import { ForgotPasswordPage, LoginPage } from '../src/pages/AuthPages.jsx';
import { codeAlreadySent, formatWait, throttleMessage, validateReset } from '../src/lib/passwordReset.js';

const page = (element, entry = '/') => renderToStaticMarkup(
  <MemoryRouter initialEntries={[entry]}><AuthProvider>{element}</AuthProvider></MemoryRouter>,
);

describe('regras do formulário', () => {
  it('valida código, tamanho da senha e confirmação', () => {
    expect(validateReset({ code: '12345', password: 'abcdef', confirm: 'abcdef' })).toMatch(/6 dígitos/);
    expect(validateReset({ code: 'abcdef', password: 'abcdef', confirm: 'abcdef' })).toMatch(/6 dígitos/);
    expect(validateReset({ code: '123456', password: '123', confirm: '123' })).toMatch(/6 a 72/);
    expect(validateReset({ code: '123456', password: 'x'.repeat(73), confirm: 'x'.repeat(73) })).toMatch(/6 a 72/);
    expect(validateReset({ code: '123456', password: 'abcdef', confirm: 'abcdeg' })).toMatch(/confirmação/);
    expect(validateReset({ code: '123456', password: 'abcdef', confirm: 'abcdef' })).toBe('');
  });

  it('formata a espera e reconhece "código acabou de sair"', () => {
    expect(formatWait(45)).toBe('45 s');
    expect(formatWait(60)).toBe('1 min');
    expect(formatWait(61)).toBe('2 min');
    expect(codeAlreadySent(new ApiError(429, 'x', { retryAfterSeconds: 42 }))).toBe(true);
    expect(codeAlreadySent(new ApiError(429, 'x', { retryAfterSeconds: 1800 }))).toBe(false); // limite por hora
    expect(codeAlreadySent(new ApiError(503, 'x'))).toBe(false);
    expect(throttleMessage(new ApiError(429, 'x', { retryAfterSeconds: 1800 }))).toContain('30 min');
  });

  it('ApiError guarda o retryAfterSeconds enviado pela API', () => {
    expect(new ApiError(429, 'x', { retryAfterSeconds: 30 }).retryAfterSeconds).toBe(30);
  });
});

describe('telas', () => {
  it('login tem o link "Esqueci minha senha" para /recuperar-senha', () => {
    const html = page(<LoginPage />);
    expect(html).toContain('Esqueci minha senha');
    expect(html).toContain('href="/recuperar-senha"');
  });

  it('login mostra o aviso vindo da troca de senha e o e-mail já preenchido', () => {
    const html = page(<LoginPage />, { pathname: '/login', state: { email: 'dona@teste.com', notice: 'Senha alterada. Entre com a nova senha.' } });
    expect(html).toContain('Senha alterada. Entre com a nova senha.');
    expect(html).toContain('value="dona@teste.com"');
  });

  it('recuperação começa pelo e-mail, com o e-mail do login já preenchido', () => {
    const html = page(<ForgotPasswordPage />, { pathname: '/recuperar-senha', state: { email: 'dona@teste.com' } });
    expect(html).toContain('Esqueci minha senha');
    expect(html).toContain('value="dona@teste.com"');
    expect(html).toContain('Enviar código');
    expect(html).not.toContain('Código de 6 dígitos');
  });

  it('vindo de Configurações, abre direto na etapa do código com a espera para reenviar', () => {
    const html = page(<ForgotPasswordPage />, { pathname: '/recuperar-senha', state: { email: 'dona@teste.com', codeSent: true, wait: 60 } });
    expect(html).toContain('Nova senha');
    expect(html).toContain('Código de 6 dígitos');
    expect(html).toMatch(/autocomplete="one-time-code"/i); // o celular sugere o código do e-mail
    expect(html).toContain('Reenviar código (1 min)');
    expect(html).toContain('dona@teste.com');
  });
});
