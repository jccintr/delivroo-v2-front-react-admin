import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Auth } from '../api/index.js';
import { errorMessage } from '../api/client.js';
import TemplatePicker from '../components/TemplatePicker.jsx';
import { Button, Field, Input, Logo, Select } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import useResource from '../hooks/useResource.js';
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
  const [email, setEmail] = useState('');
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
        {error && <p role="alert" className="rounded-xl bg-cherry/10 px-3 py-2 text-sm font-medium text-cherry">{error}</p>}
        <Button type="submit" size="lg" className="w-full" loading={busy}>Entrar</Button>
      </form>
    </Frame>
  );
}

export function RegisterPage() {
  const { store, register } = useAuth();
  const nav = useNavigate();
  const { data: cities } = useResource(() => Auth.cities(), []);
  const { data: templates } = useResource(() => Auth.templates(), []); // se falhar, o seletor some e a loja nasce vazia
  const [f, setF] = useState({ name: '', email: '', password: '', phone: '', cityId: '', template: 'empty' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (store) return <Navigate to="/pedidos" replace />;
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: k === 'phone' ? maskPhone(e.target.value) : e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const template = await register({ ...f, name: f.name.trim(), email: f.email.trim(), cityId: Number(f.cityId) });
      // com modelo de cardápio, vai direto ver (e revisar) o cardápio; loja vazia segue para as configurações
      nav(template ? '/cardapio' : '/configuracoes', { replace: true });
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  }
  return (
    <Frame title="Criar minha loja" subtitle="Leva menos de um minuto. Depois você monta o cardápio." footer={<>Já tem conta? <Link to="/login" className="font-bold text-orange hover:underline">Entrar</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nome da loja">{(id) => <Input id={id} required minLength={3} value={f.name} onChange={set('name')} placeholder="Ex.: Brothers Burger" />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="WhatsApp / telefone">{(id) => <Input id={id} required inputMode="tel" value={f.phone} onChange={set('phone')} placeholder="(00) 00000-0000" />}</Field>
          <Field label="Cidade">{(id) => (
            <Select id={id} required value={f.cityId} onChange={set('cityId')}>
              <option value="">Selecione…</option>
              {(cities ?? []).map((c) => <option key={c.id} value={c.id}>{c.name} - {c.state}</option>)}
            </Select>
          )}</Field>
        </div>
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
