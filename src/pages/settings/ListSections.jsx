import { useState } from 'react';
import { Payments, Zones } from '../../api/index.js';
import Icon from '../../components/Icon.jsx';
import { Badge, Button, Card, EmptyState, Field, IconButton, Input, Loading, Modal, MoneyInput, Select, Switch } from '../../components/ui.jsx';
import { useUI } from '../../context/UIContext.jsx';
import useResource from '../../hooks/useResource.js';
import { formatBRL } from '../../lib/money.js';

const TYPES = { CASH: 'Dinheiro', PIX: 'PIX', CARD: 'Cartão', OTHER: 'Outro' };

/** lista editável genérica (zonas de entrega e formas de pagamento) */
function CrudList({ api, title, hint, emptyTitle, addLabel, blank, fields, valid, row, toBody, editTitle }) {
  const { success, error, confirm } = useUI();
  const { data, loading, reload } = useResource(() => api.list(), []);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      if (editing.id) await api.update(editing.id, toBody(editing)); else await api.create(toBody(editing));
      setEditing(null); await reload(); success('Salvo.');
    } catch (e) { error(e.details?.length ? e.details.map((d) => d.message).join(' · ') : e.message); } finally { setSaving(false); }
  }
  async function toggle(item, active) { try { await api.update(item.id, { active }); await reload(); } catch (e) { error(e.message); } }
  async function remove(item) {
    if (!(await confirm({ title: 'Excluir este item?', message: 'Essa ação não pode ser desfeita.', confirmLabel: 'Excluir', danger: true }))) return;
    try { await api.remove(item.id); await reload(); success('Excluído.'); } catch (e) { error(e.message); }
  }
  if (loading && !data) return <Loading />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-lg text-sm text-ink-soft">{hint}</p><Button onClick={() => setEditing({ ...blank })}><Icon name="plus" className="size-4" /> {addLabel}</Button></div>
      {data?.length === 0 ? <EmptyState icon="store" title={emptyTitle} /> : (
        <Card className="divide-y divide-line">
          {data?.map((item) => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3">
              <div className={`min-w-0 flex-1 ${item.active ? '' : 'opacity-50'}`}>{row(item)}</div>
              <Switch checked={item.active} onChange={(v) => toggle(item, v)} label="Ativo" />
              <IconButton icon="edit" label="Editar" onClick={() => setEditing({ ...item })} />
              <IconButton icon="trash" label="Excluir" onClick={() => remove(item)} className="hover:!text-cherry" />
            </div>
          ))}
        </Card>
      )}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? editTitle : addLabel}
        footer={<><Button kind="secondary" onClick={() => setEditing(null)}>Cancelar</Button><Button loading={saving} disabled={editing ? !valid(editing) : true} onClick={save}>Salvar</Button></>}>
        {editing && <div className="space-y-4">{fields(editing, (p) => setEditing({ ...editing, ...p }))}</div>}
      </Modal>
    </div>
  );
}

export function ZonesSection() {
  return (
    <CrudList
      api={Zones} title="Entrega" addLabel="Novo bairro" editTitle="Editar bairro" emptyTitle="Nenhum bairro cadastrado"
      hint="Bairros onde você entrega e a taxa de cada um. Sem bairros, a loja só aceita retirada."
      blank={{ district: '', feeCents: 0, active: true }}
      valid={(e) => e.district.trim() && e.feeCents != null}
      toBody={(e) => ({ district: e.district.trim(), feeCents: e.feeCents ?? 0, active: e.active })}
      row={(z) => (<><p className="truncate font-semibold">{z.district}</p><p className="text-sm text-ink-soft">{z.feeCents ? formatBRL(z.feeCents) : 'Entrega grátis'}</p></>)}
      fields={(e, set) => (<>
        <Field label="Bairro">{(id) => <Input id={id} autoFocus maxLength={100} value={e.district} onChange={(ev) => set({ district: ev.target.value })} />}</Field>
        <Field label="Taxa de entrega" hint="0,00 para entrega grátis.">{(id) => <MoneyInput id={id} value={e.feeCents} onChange={(c) => set({ feeCents: c })} />}</Field>
      </>)}
    />
  );
}

export function PaymentsSection() {
  return (
    <CrudList
      api={Payments} addLabel="Nova forma" editTitle="Editar forma de pagamento" emptyTitle="Nenhuma forma de pagamento"
      hint="O que você aceita na entrega/retirada. O tipo “Dinheiro” pergunta o troco ao cliente."
      blank={{ name: '', type: 'CASH', active: true }}
      valid={(e) => e.name.trim()}
      toBody={(e) => ({ name: e.name.trim(), type: e.type, active: e.active })}
      row={(p) => (<><p className="truncate font-semibold">{p.name}</p><Badge className="bg-ink/10 text-ink-soft">{TYPES[p.type] ?? p.type}</Badge></>)}
      fields={(e, set) => (<>
        <Field label="Nome">{(id) => <Input id={id} autoFocus maxLength={60} value={e.name} onChange={(ev) => set({ name: ev.target.value })} placeholder="Ex.: Cartão na entrega" />}</Field>
        <Field label="Tipo">{(id) => <Select id={id} value={e.type} onChange={(ev) => set({ type: ev.target.value })}>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>}</Field>
      </>)}
    />
  );
}

export default { ZonesSection, PaymentsSection };
