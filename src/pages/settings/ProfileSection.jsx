import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth, Store } from '../../api/index.js';
import { errorMessage } from '../../api/client.js';
import CityPicker from '../../components/CityPicker.jsx';
import Icon from '../../components/Icon.jsx';
import { Button, Card, Field, ImageUpload, Input } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useUI } from '../../context/UIContext.jsx';
import useResource from '../../hooks/useResource.js';
import { sendResetCode, throttleMessage } from '../../lib/passwordReset.js';
import { maskPhone } from '../../lib/phone.js';

const CLIENT_URL = (import.meta.env.VITE_CLIENT_URL ?? 'https://stores.delivroo.app.br').replace(/\/$/, '');

/** Alterar senha = o mesmo fluxo do "esqueci minha senha": código por e-mail para a própria loja */
function PasswordCard() {
  const { store } = useAuth();
  const { error } = useUI();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    try {
      const r = await sendResetCode(store.email);
      nav('/recuperar-senha', { state: { email: store.email, codeSent: true, alreadySent: !r.sent, wait: r.sent ? 60 : r.wait } });
    } catch (err) { error(err.status === 429 ? throttleMessage(err) : errorMessage(err)); } finally { setBusy(false); }
  }

  return (
    <Card className="space-y-3 p-4">
      <h2 className="font-display text-lg font-bold">Senha</h2>
      <p className="text-sm text-ink-soft">Para alterar a senha, enviamos um código de 6 dígitos para <b className="text-ink">{store.email}</b>. Ao trocar, você entra de novo com a nova senha e as sessões abertas em outros aparelhos são encerradas.</p>
      <Button kind="secondary" loading={busy} onClick={start}>Enviar código por e-mail</Button>
    </Card>
  );
}

export default function ProfileSection() {
  const { store, setStore } = useAuth();
  const { success, error } = useUI();
  const { data: cities } = useResource(() => Auth.cities(), []);
  const a = store.address ?? {};
  const [f, setF] = useState({
    name: store.name, phone: maskPhone(store.phone),     street: a.street ?? '', number: a.number ?? '', complement: a.complement ?? '', district: a.district ?? '', zipCode: a.zipCode ?? '',
    bgColor: store.bgColor ?? '#FF5A1F', textColor: store.textColor ?? '#FFFFFF',
    pixKey: store.pixKey ?? '', pixBeneficiary: store.pixBeneficiary ?? '',
    waitMin: store.waitMinMinutes ?? '', waitMax: store.waitMaxMinutes ?? '',
  });
  const current = (cities ?? []).find((c) => c.id === store.cityId);
  const [changingCity, setChangingCity] = useState(false);
  const [newCity, setNewCity] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: k === 'phone' ? maskPhone(e.target.value) : e.target.value }));
  const link = `${CLIENT_URL}/${store.slug}`;

  async function save(e) {
    e.preventDefault();
    const n = (v) => (v === '' ? null : Number(v));
    const t = (v) => (v.trim() === '' ? null : v.trim());
    if (n(f.waitMin) != null && n(f.waitMax) != null && n(f.waitMin) > n(f.waitMax)) { error('O tempo mínimo não pode ser maior que o máximo.'); return; }
    if (changingCity && !newCity) { error('Selecione a nova cidade na lista (ou cancele a troca).'); return; }
    setSaving(true);
    try {
      const next = await Store.update({
        name: f.name.trim(), phone: f.phone, ...(changingCity && newCity ? { ibgeCityId: newCity.ibgeId } : {}),
        street: t(f.street), number: t(f.number), complement: t(f.complement), district: t(f.district), zipCode: t(f.zipCode),
        bgColor: f.bgColor, textColor: f.textColor, pixKey: t(f.pixKey), pixBeneficiary: t(f.pixBeneficiary),
        waitMinMinutes: n(f.waitMin), waitMaxMinutes: n(f.waitMax),
      });
      setStore(next); setChangingCity(false); setNewCity(null); success('Dados da loja salvos.');
    } catch (err) { error(err.details?.length ? err.details.map((d) => d.message).join(' · ') : err.message); } finally { setSaving(false); }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(link); success('Link copiado!'); } catch { error('Não foi possível copiar. Selecione o link e copie manualmente.'); }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <Card className="p-4">
        <h2 className="font-display text-lg font-bold">Link do seu cardápio</h2>
        <p className="mb-2 text-sm text-ink-soft">Divulgue no Instagram, WhatsApp e na bio. É por aqui que seus clientes pedem.</p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-xl bg-cream-2 px-3 py-2.5 text-sm" data-testid="store-link">{link}</code>
          <Button kind="secondary" onClick={copy}><Icon name="copy" className="size-4" /> Copiar</Button>
          <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold hover:bg-cream-2"><Icon name="external" className="size-4" /> Abrir</a>
        </div>
      </Card>

      <Card className="space-y-4 p-4">
        <h2 className="font-display text-lg font-bold">Identidade</h2>
        <ImageUpload label="Logo" shape="round" size="size-24" url={store.logoUrl}
          // a API devolve só { message, logoUrl } no envio e 204 na remoção: mescla na loja (não substitui!)
          onUpload={async (file) => { const r = await Store.uploadLogo(file); setStore((s) => ({ ...s, logoUrl: r.logoUrl })); }}
          onRemove={async () => { await Store.removeLogo(); setStore((s) => ({ ...s, logoUrl: null })); }} />
        <Field label="Nome da loja">{(id) => <Input id={id} required minLength={3} maxLength={120} value={f.name} onChange={set('name')} />}</Field>
        <Field label="WhatsApp / telefone">{(id) => <Input id={id} required inputMode="tel" value={f.phone} onChange={set('phone')} />}</Field>
        {changingCity ? (
          <div className="space-y-2">
            <CityPicker value={newCity} onChange={setNewCity} />
            <button type="button" onClick={() => { setChangingCity(false); setNewCity(null); }} className="text-sm font-semibold text-orange hover:underline">Cancelar troca de cidade</button>
          </div>
        ) : (
          <Field label="Cidade">{() => (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-line bg-cream-2 px-3 py-2.5 text-sm">
              <span data-testid="current-city">{current ? `${current.name} - ${current.state}` : '…'}</span>
              <button type="button" onClick={() => setChangingCity(true)} className="font-bold text-orange hover:underline">Alterar</button>
            </div>
          )}</Field>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Cor principal do cardápio">{(id) => <div className="flex gap-2"><input id={id} type="color" value={f.bgColor} onChange={set('bgColor')} className="h-11 w-14 cursor-pointer rounded-lg border border-line bg-white p-1" /><Input value={f.bgColor} onChange={set('bgColor')} maxLength={7} aria-label="Cor principal (hex)" /></div>}</Field>
          <Field label="Cor do texto sobre ela">{(id) => <div className="flex gap-2"><input id={id} type="color" value={f.textColor} onChange={set('textColor')} className="h-11 w-14 cursor-pointer rounded-lg border border-line bg-white p-1" /><Input value={f.textColor} onChange={set('textColor')} maxLength={7} aria-label="Cor do texto (hex)" /></div>}</Field>
        </div>
        <div className="flex items-center gap-3 rounded-2xl px-4 py-3 font-display text-lg font-extrabold" style={{ background: f.bgColor, color: f.textColor }}>
          {store.logoUrl && <img src={store.logoUrl} alt="" className="size-9 rounded-full object-cover" />} {f.name || 'Sua loja'} <span className="ml-auto text-xs font-sans font-semibold opacity-80">prévia do topo</span>
        </div>
      </Card>

      <Card className="space-y-4 p-4">
        <h2 className="font-display text-lg font-bold">Endereço</h2>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_7rem]">
          <Field label="Rua">{(id) => <Input id={id} value={f.street} onChange={set('street')} />}</Field>
          <Field label="Número">{(id) => <Input id={id} value={f.number} onChange={set('number')} />}</Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Complemento">{(id) => <Input id={id} value={f.complement} onChange={set('complement')} />}</Field>
          <Field label="Bairro">{(id) => <Input id={id} value={f.district} onChange={set('district')} />}</Field>
          <Field label="CEP">{(id) => <Input id={id} inputMode="numeric" maxLength={9} value={f.zipCode} onChange={set('zipCode')} />}</Field>
        </div>
      </Card>

      <Card className="space-y-4 p-4">
        <h2 className="font-display text-lg font-bold">Atendimento</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tempo mínimo (min)">{(id) => <Input id={id} type="number" min={0} max={600} value={f.waitMin} onChange={set('waitMin')} placeholder="30" />}</Field>
          <Field label="Tempo máximo (min)">{(id) => <Input id={id} type="number" min={0} max={600} value={f.waitMax} onChange={set('waitMax')} placeholder="45" />}</Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Chave PIX">{(id) => <Input id={id} maxLength={140} value={f.pixKey} onChange={set('pixKey')} />}</Field>
          <Field label="Beneficiário do PIX">{(id) => <Input id={id} maxLength={140} value={f.pixBeneficiary} onChange={set('pixBeneficiary')} />}</Field>
        </div>
      </Card>

      <PasswordCard />

      <div className="sticky bottom-20 z-10 flex justify-end lg:bottom-4"><Button type="submit" size="lg" loading={saving} className="shadow-lg">Salvar alterações</Button></div>
    </form>
  );
}
