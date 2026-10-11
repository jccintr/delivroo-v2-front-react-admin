import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Auth } from '../api/index.js';
import { errorMessage } from '../api/client.js';
import CityPicker from '../components/CityPicker.jsx';
import TemplatePicker from '../components/TemplatePicker.jsx';
import { Button, Field, Input, Logo } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import useResource from '../hooks/useResource.js';
import { formatWait, sendResetCode, throttleMessage, validateReset } from '../lib/passwordReset.js';
import { maskPhone } from '../lib/phone.js';

function Frame({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="relative hidden overflow-hidden bg-navy p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Logo light />
        <div>
          <h2 className="font-display text-5xl font-extrabold leading-[1.05]">Sua loja,<br />seus pedidos,<br /><span className="text-orange">tudo no controle.</span></h2>
          <p className="mt-4 max-w-md text-white/70">Receba pedidos em tempo real, atualize o cardápio e acompanhe suas vendas — do celular ou do computador.</p>
        </div>
        <p className="text-sm text-white/40">Delivroo · painel da loja</p>
        <div className="absolute -bottom-24 -right-24 size-80 rounded-full bg-orange/20 blur-3xl" />
      </div>
      <div className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <Logo className="mb-8 lg:hidden" />
          <h1 className="font-display text-4xl font-extrabold">{title}</h1>
          <p className="mb-6 mt-1 text-ink-soft">{subtitle}</p>
          {children}
          <div className="mt-6 text-center text-sm text-ink-soft">{footer}</div>
        </div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const { store, login } = useAuth();
  const nav = useNavigate();
  const { state } = useLocation(); // vem da recuperação de senha: e-mail e aviso de "senha alterada"
  const [email, setEmail] = useState(state?.email ?? '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (store) return <Navigate to="/pedidos" replace />;

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try { await login(email.trim(), password); nav('/pedidos', { replace: true }); } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  }
  return (
    <Frame title="Entrar" subtitle="Acesse o painel da sua loja." footer={<>Ainda não tem loja? <Link to="/cadastro" className="font-bold text-orange hover:underline">Cadastre-se</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="E-mail">{(id) => <Input id={id} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
        <Field label="Senha">{(id) => <Input id={id} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />}</Field>
        <div className="-mt-1 text-right"><Link to="/recuperar-senha" state={{ email: email.trim() }} className="text-sm font-semibold text-orange hover:underline">Esqueci minha senha</Link></div>
        {state?.notice && <p role="status" className="rounded-xl bg-mint-light px-3 py-2 text-sm font-medium text-ink">{state.notice}</p>}
        {error && <p role="alert" className="rounded-xl bg-cherry/10 px-3 py-2 text-sm font-medium text-cherry">{error}</p>}
        <Button type="submit" size="lg" className="w-full" loading={busy}>Entrar</Button>
      </form>
    </Frame>
  );
}

export function RegisterPage() {
  const { store, register } = useAuth();
  const nav = useNavigate();
  const { data: templates } = useResource(() => Auth.templates(), []); // se falhar, o seletor some e a loja nasce vazia
  const [f, setF] = useState({ name: '', email: '', password: '', phone: '', city: null, template: 'empty' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (store) return <Navigate to="/pedidos" replace />;
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: k === 'phone' ? maskPhone(e.target.value) : e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (!f.city) { setError('Escolha o estado e selecione a cidade na lista.'); return; }
    setBusy(true); setError('');
    try {
      const { city, ...rest } = f;
      const template = await register({ ...rest, name: f.name.trim(), email: f.email.trim(), ibgeCityId: city.ibgeId });
      // com modelo de cardápio, vai direto ver (e revisar) o cardápio; loja vazia segue para as configurações
      nav(template ? '/cardapio' : '/configuracoes', { replace: true });
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  }
  return (
    <Frame title="Criar minha loja" subtitle="Leva menos de um minuto. Depois você monta o cardápio." footer={<>Já tem conta? <Link to="/login" className="font-bold text-orange hover:underline">Entrar</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nome da loja">{(id) => <Input id={id} required minLength={3} value={f.name} onChange={set('name')} placeholder="Ex.: Top Burguer" />}</Field>
        <Field label="WhatsApp / telefone">{(id) => <Input id={id} required inputMode="tel" value={f.phone} onChange={set('phone')} placeholder="(00) 00000-0000" />}</Field>
        <CityPicker value={f.city} onChange={(city) => setF((x) => ({ ...x, city }))} />
        <Field label="E-mail">{(id) => <Input id={id} type="email" autoComplete="username" required value={f.email} onChange={set('email')} />}</Field>
        <Field label="Senha" hint="Mínimo de 6 caracteres.">{(id) => <Input id={id} type="password" autoComplete="new-password" required minLength={6} value={f.password} onChange={set('password')} />}</Field>
        {templates?.length > 1 && (
          <div>
            <TemplatePicker templates={templates} value={f.template} onChange={(template) => setF((x) => ({ ...x, template }))} />
            {f.template !== 'empty' && <p className="mt-2 text-xs text-ink-soft">Você pode editar tudo depois. Os preços do modelo são apenas exemplos: revise antes de abrir a loja.</p>}
          </div>
        )}
        {error && <p role="alert" className="rounded-xl bg-cherry/10 px-3 py-2 text-sm font-medium text-cherry">{error}</p>}
        <Button type="submit" size="lg" className="w-full" loading={busy}>Criar loja</Button>
      </form>
    </Frame>
  );
}

/** Recuperar (ou alterar) a senha: 1) e-mail da loja -> 2) código de 6 dígitos + nova senha. Também é aberta pelo botão "Alterar senha" das Configurações. */
export function ForgotPasswordPage() {
  const { store, logout } = useAuth();
  const nav = useNavigate();
  const { state } = useLocation();
  const [step, setStep] = useState(state?.codeSent ? 'code' : 'email');
  const [email, setEmail] = useState(state?.email ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState(state?.codeSent ? (state.alreadySent ? 'Já enviamos um código há instantes. Digite-o abaixo ou aguarde para pedir outro.' : `Enviamos um código de 6 dígitos para ${state.email}. Ele vale por 15 minutos.`) : '');
  const [cooldown, setCooldown] = useState(state?.codeSent ? (state.wait ?? 60) : 0); // segundos até poder pedir outro código

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  async function sendCode(e) {
    e?.preventDefault();
    setBusy(true); setError(''); setInfo('');
    try {
      const to = email.trim();
      const r = await sendResetCode(to);
      setCooldown(r.sent ? 60 : r.wait);
      setInfo(r.sent ? `Se ${to} estiver cadastrado, enviamos um código de 6 dígitos. Ele vale por 15 minutos.` : 'Já enviamos um código há instantes. Digite-o abaixo ou aguarde para pedir outro.');
      setStep('code');
    } catch (err) { setError(err.status === 429 ? throttleMessage(err) : errorMessage(err)); } finally { setBusy(false); }
  }

  async function submitReset(e) {
    e.preventDefault();
    const problem = validateReset({ code, password, confirm });
    if (problem) { setError(problem); return; }
    setBusy(true); setError('');
    try {
      await Auth.resetPassword({ email: email.trim(), code, newPassword: password });
      logout(); // quem veio do painel sai daqui (a API também encerra as sessões antigas)
      nav('/login', { replace: true, state: { email: email.trim(), notice: 'Senha alterada. Entre com a nova senha.' } });
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  }

  const back = store ? <Link to="/configuracoes" className="font-bold text-orange hover:underline">Voltar às configurações</Link> : <Link to="/login" className="font-bold text-orange hover:underline">Voltar ao login</Link>;

  if (step === 'email') {
    return (
      <Frame title="Esqueci minha senha" subtitle="Informe o e-mail da loja e enviaremos um código para criar uma nova senha." footer={back}>
        <form onSubmit={sendCode} className="space-y-4">
          <Field label="E-mail">{(id) => <Input id={id} type="email" autoComplete="username" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
          {error && <p role="alert" className="rounded-xl bg-cherry/10 px-3 py-2 text-sm font-medium text-cherry">{error}</p>}
          <Button type="submit" size="lg" className="w-full" loading={busy}>Enviar código</Button>
        </form>
      </Frame>
    );
  }

  return (
    <Frame title="Nova senha" subtitle={`Digite o código enviado para ${email.trim()} e escolha a nova senha.`} footer={back}>
      <form onSubmit={submitReset} className="space-y-4">
        {info && <p role="status" className="rounded-xl bg-mint-light px-3 py-2 text-sm font-medium text-ink">{info}</p>}
        <Field label="Código de 6 dígitos">{(id) => (
          <Input id={id} inputMode="numeric" autoComplete="one-time-code" maxLength={6} required autoFocus value={code} placeholder="000000"
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} className="text-center font-mono" style={{ fontSize: 24, letterSpacing: '0.4em' }} />
        )}</Field>
        <Field label="Nova senha" hint="De 6 a 72 caracteres.">{(id) => <Input id={id} type="password" autoComplete="new-password" required minLength={6} maxLength={72} value={password} onChange={(e) => setPassword(e.target.value)} />}</Field>
        <Field label="Repita a nova senha">{(id) => <Input id={id} type="password" autoComplete="new-password" required minLength={6} maxLength={72} value={confirm} onChange={(e) => setConfirm(e.target.value)} />}</Field>
        {error && <p role="alert" className="rounded-xl bg-cherry/10 px-3 py-2 text-sm font-medium text-cherry">{error}</p>}
        <Button type="submit" size="lg" className="w-full" loading={busy}>Alterar senha</Button>
        <div className="flex items-center justify-between text-sm">
          <button type="button" onClick={sendCode} disabled={busy || cooldown > 0} className="font-semibold text-orange hover:underline disabled:cursor-not-allowed disabled:text-ink-soft disabled:no-underline">
            {cooldown > 0 ? `Reenviar código (${formatWait(cooldown)})` : 'Reenviar código'}
          </button>
          <button type="button" onClick={() => { setStep('email'); setCode(''); setError(''); setInfo(''); }} className="font-semibold text-ink-soft hover:underline">Usar outro e-mail</button>
        </div>
      </form>
    </Frame>
  );
}
