import { useState } from 'react';
import { Groups } from '../../api/index.js';
import Icon from '../../components/Icon.jsx';
import { Badge, Button, Field, IconButton, Input, Modal, Select, Switch } from '../../components/ui.jsx';
import { useUI } from '../../context/UIContext.jsx';
import { describeGroup, validateGroup } from '../../lib/groups.js';
import { formatBRL } from '../../lib/money.js';
import OptionEditor from './OptionEditor.jsx';

const num = (v) => (v === '' ? NaN : Number(v));

export default function GroupEditor({ group, products, onClose, reload, onCreated }) {
  const { success, error, confirm } = useUI();
  const isNew = !group;
  const [f, setF] = useState(() => ({
    name: group?.name ?? '', active: group?.active ?? true,
    required: (group?.minSelect ?? 0) > 0, minSelect: String(group?.minSelect || 1), maxSelect: String(group?.maxSelect ?? 1),
    maxPerOption: String(group?.maxPerOption ?? 1), pricingMode: group?.pricingMode ?? 'ADDITIVE',
  }));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [opt, setOpt] = useState(null); // 'new' | option
  const linked = group ? products.filter((p) => p.optionGroupIds.includes(group.id)) : [];

  const body = () => ({ name: f.name.trim(), minSelect: f.required ? num(f.minSelect) : 0, maxSelect: num(f.maxSelect), maxPerOption: num(f.maxPerOption), pricingMode: f.pricingMode, active: f.active });
  const preview = describeGroup({ ...body(), minSelect: body().minSelect || 0, maxSelect: body().maxSelect || 1, maxPerOption: body().maxPerOption || 1 });

  async function save() {
    const b = body();
    const problem = validateGroup(b);
    if (problem) { setErr(problem); return; }
    setErr(''); setSaving(true);
    try {
      if (isNew) {
        const created = await Groups.create(b);
        await reload(); success('Grupo criado! Agora adicione as opções.'); onCreated(created); return;
      }
      await Groups.update(group.id, b);
      await reload(); success('Regras salvas.');
    } catch (e) { setErr(e.details?.length ? e.details.map((d) => d.message).join(' · ') : e.message); } finally { setSaving(false); }
  }

  async function removeGroup() {
    const msg = linked.length ? `Ele está vinculado a ${linked.length} produto(s) e será removido deles.` : 'Essa ação não pode ser desfeita.';
    if (!(await confirm({ title: `Excluir o grupo “${group.name}”?`, message: msg, confirmLabel: 'Excluir', danger: true }))) return;
    try { await Groups.remove(group.id); await reload(); success('Grupo excluído.'); onClose(); } catch (e) { error(e.message); }
  }
  async function removeOption(o) {
    if (!(await confirm({ title: `Excluir “${o.name}”?`, confirmLabel: 'Excluir', danger: true }))) return;
    try { await Groups.removeOption(o.id); await reload(); } catch (e) { error(e.message); }
  }
  async function toggleOption(o, active) {
    try { await Groups.updateOption(o.id, { active }); await reload(); } catch (e) { error(e.message); }
  }

  return (
    <>
      <Modal open wide onClose={onClose} title={isNew ? 'Novo grupo' : `Grupo: ${group.name}`}
        footer={<>
          {!isNew && <Button kind="danger" className="mr-auto" onClick={removeGroup}><Icon name="trash" className="size-4" /> Excluir grupo</Button>}
          <Button kind="secondary" onClick={onClose}>Fechar</Button>
          <Button loading={saving} onClick={save}>{isNew ? 'Criar grupo' : 'Salvar regras'}</Button>
        </>}>
        <div className="space-y-5">
          <Field label="Nome do grupo">{(id) => <Input id={id} maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ex.: Ponto da carne, Adicionais, Escolha o molho" />}</Field>

          <section className="rounded-2xl border border-line bg-white p-4">
            <h3 className="mb-3 font-display text-lg font-bold">Regras de escolha</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="O cliente…">{(id) => (
                <Select id={id} value={f.required ? 'req' : 'opt'} onChange={(e) => setF({ ...f, required: e.target.value === 'req' })}>
                  <option value="opt">Escolhe se quiser (opcional)</option>
                  <option value="req">Precisa escolher (obrigatório)</option>
                </Select>
              )}</Field>
              {f.required && <Field label="Mínimo de escolhas">{(id) => <Input id={id} type="number" min={1} max={255} value={f.minSelect} onChange={(e) => setF({ ...f, minSelect: e.target.value })} />}</Field>}
              <Field label="Máximo de escolhas">{(id) => <Input id={id} type="number" min={1} max={255} value={f.maxSelect} onChange={(e) => setF({ ...f, maxSelect: e.target.value })} />}</Field>
              <Field label="Mesma opção até (vezes)" hint="1 = não repete. Ex.: 3 para “até 3 bacons”.">{(id) => <Input id={id} type="number" min={1} max={255} value={f.maxPerOption} onChange={(e) => setF({ ...f, maxPerOption: e.target.value })} />}</Field>
              <Field label="Como cobrar" className="sm:col-span-2" hint={f.pricingMode === 'HIGHEST' ? 'Ex.: pizza meio a meio — vale o preço do sabor mais caro.' : 'Cada opção escolhida soma o seu preço.'}>{(id) => (
                <Select id={id} value={f.pricingMode} onChange={(e) => setF({ ...f, pricingMode: e.target.value, ...(e.target.value === 'HIGHEST' ? { maxPerOption: '1' } : {}) })}>
                  <option value="ADDITIVE">Somar o preço de cada opção</option>
                  <option value="HIGHEST">Cobrar apenas a opção mais cara</option>
                </Select>
              )}</Field>
            </div>
            <p className="mt-3 rounded-lg bg-cream-2 px-3 py-2 text-sm"><Badge className={preview.required ? 'bg-orange-light text-orange-deep' : 'bg-white text-ink-soft'}>{preview.label}</Badge> <span className="ml-1">Cliente: {preview.rule}{preview.extra ? ` · ${preview.extra}` : ''}</span></p>
            <label className="mt-3 flex items-center gap-3 text-sm font-semibold"><Switch checked={f.active} onChange={(v) => setF({ ...f, active: v })} label="Grupo ativo" /> Grupo ativo</label>
          </section>
          {err && <p role="alert" className="rounded-xl bg-cherry/10 px-3 py-2 text-sm font-medium text-cherry">{err}</p>}

          {!isNew && (
            <section>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="font-display text-lg font-bold">Opções <span className="text-sm font-normal text-ink-soft">({group.options.length})</span></h3>
                <Button size="sm" onClick={() => setOpt('new')}><Icon name="plus" className="size-4" /> Nova opção</Button>
              </div>
              {group.options.length === 0 ? <p className="rounded-xl bg-white p-4 text-center text-sm text-ink-soft">Adicione as opções deste grupo (ex.: Bacon, Cheddar, Ao ponto…).</p> : (
                <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
                  {group.options.map((o) => (
                    <li key={o.id} className="flex items-center gap-3 px-3 py-2.5">
                      {o.imageUrl ? <img src={o.imageUrl} alt="" className="size-10 shrink-0 rounded-lg object-cover" /> : <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-orange-light text-orange"><Icon name="image" className="size-5" /></span>}
                      <button className="min-w-0 flex-1 text-left" onClick={() => setOpt(o)} aria-label={`Editar opção ${o.name}`}>
                        <span className={`block truncate font-semibold ${o.active ? '' : 'text-ink-soft line-through'}`}>{o.name} {o.isDefault && <Badge className="ml-1 bg-mint-light text-emerald-800">padrão</Badge>}</span>
                        <span className="text-sm text-ink-soft">{o.priceCents ? `+ ${formatBRL(o.priceCents)}` : 'sem custo'}{Object.keys(o.prices).length ? ' · preços por tamanho' : ''}</span>
                      </button>
                      <Switch checked={o.active} onChange={(v) => toggleOption(o, v)} label={`${o.name} disponível`} />
                      <IconButton icon="trash" label="Excluir opção" onClick={() => removeOption(o)} className="hover:!text-cherry" />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
          {isNew && <p className="rounded-xl bg-white p-3 text-sm text-ink-soft">Depois de criar o grupo você adiciona as opções e vincula aos produtos.</p>}
          {!isNew && <p className="text-xs text-ink-soft">{linked.length ? `Usado em: ${linked.map((p) => p.name).join(', ')}.` : 'Para aparecer no cardápio, marque este grupo dentro do produto (aba Produtos).'}</p>}
        </div>
      </Modal>
      {opt && <OptionEditor key={opt === 'new' ? 'new' : opt.id} group={group} option={opt === 'new' ? null : group.options.find((o) => o.id === opt.id) ?? opt} products={linked} reload={reload} onClose={() => setOpt(null)} />}
    </>
  );
}
