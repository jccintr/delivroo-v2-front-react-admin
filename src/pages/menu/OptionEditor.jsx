import { useState } from 'react';
import { Groups } from '../../api/index.js';
import { Button, Field, ImageUpload, Input, Modal, MoneyInput, Switch, Textarea } from '../../components/ui.jsx';
import { useUI } from '../../context/UIContext.jsx';
import { cleanPrices } from '../../lib/groups.js';

export default function OptionEditor({ group, option, products, reload, onClose }) {
  const { success } = useUI();
  const isNew = !option;
  const [f, setF] = useState({ name: option?.name ?? '', description: option?.description ?? '', priceCents: option?.priceCents ?? 0, isDefault: option?.isDefault ?? false, active: option?.active ?? true });
  const [prices, setPrices] = useState(option?.prices ?? {});
  const [pending, setPending] = useState(null); // foto escolhida antes de criar { file, preview }
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const multi = products.filter((p) => p.variants.length > 1);

  async function save() {
    if (!f.name.trim()) { setErr('Informe o nome da opção.'); return; }
    setErr(''); setSaving(true);
    const body = { name: f.name.trim(), description: f.description.trim() || null, priceCents: f.priceCents ?? 0, isDefault: f.isDefault, active: f.active, prices: cleanPrices(prices) };
    try {
      if (isNew) {
        const created = await Groups.addOption(group.id, body);
        const id = created.options?.at?.(-1)?.id ?? created.id;
        if (pending && id) { try { await Groups.uploadOptionImage(id, pending.file); } catch { /* a opção já foi criada */ } }
      } else await Groups.updateOption(option.id, body);
      await reload();
      success(isNew ? 'Opção adicionada.' : 'Opção salva.');
      onClose();
    } catch (e) { setErr(e.details?.length ? e.details.map((d) => d.message).join(' · ') : e.message); } finally { setSaving(false); }
  }

  return (
    <Modal open onClose={onClose} title={isNew ? `Nova opção em “${group.name}”` : 'Editar opção'}
      footer={<><Button kind="secondary" onClick={onClose}>Cancelar</Button><Button loading={saving} onClick={save}>Salvar</Button></>}>
      <div className="space-y-4">
        {isNew ? (
          <ImageUpload label="Foto" url={pending?.preview} size="size-20"
            onUpload={async (file) => setPending({ file, preview: URL.createObjectURL(file) })} onRemove={async () => setPending(null)} />
        ) : (
          <ImageUpload label="Foto" url={option.imageUrl} size="size-20"
            onUpload={async (file) => { await Groups.uploadOptionImage(option.id, file); await reload(); }}
            onRemove={async () => { await Groups.removeOptionImage(option.id); await reload(); }} />
        )}
        <Field label="Nome">{(id) => <Input id={id} maxLength={120} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ex.: Bacon" />}</Field>
        <Field label="Descrição (opcional)">{(id) => <Textarea id={id} rows={2} maxLength={500} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />}</Field>
        <Field label="Preço adicional" hint="Deixe 0,00 se não custa nada a mais.">{(id) => <MoneyInput id={id} value={f.priceCents} onChange={(c) => setF({ ...f, priceCents: c ?? 0 })} />}</Field>

        {multi.length > 0 && (
          <section className="rounded-2xl border border-line bg-white p-3">
            <h3 className="font-semibold">Preço por tamanho (opcional)</h3>
            <p className="mb-3 text-xs text-ink-soft">Se o preço muda conforme o tamanho do produto, informe aqui. Em branco usa o preço adicional acima.</p>
            <div className="space-y-3">
              {multi.map((p) => (
                <div key={p.id}>
                  <p className="mb-1 text-sm font-semibold">{p.name}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {p.variants.map((v) => (
                      <label key={v.id} className="flex items-center gap-2 text-sm">
                        <span className="w-24 shrink-0 truncate text-ink-soft">{v.name}</span>
                        <MoneyInput value={prices[v.id] ?? null} onChange={(c) => setPrices((x) => { const n = { ...x }; if (c == null) delete n[v.id]; else n[v.id] = c; return n; })} aria-label={`Preço em ${p.name} ${v.name}`} />
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <label className="flex items-center gap-3 text-sm font-semibold"><Switch checked={f.isDefault} onChange={(v) => setF({ ...f, isDefault: v })} label="Opção padrão" /> Já vem selecionada</label>
          <label className="flex items-center gap-3 text-sm font-semibold"><Switch checked={f.active} onChange={(v) => setF({ ...f, active: v })} label="Disponível" /> Disponível</label>
        </div>
        {err && <p role="alert" className="rounded-xl bg-cherry/10 px-3 py-2 text-sm font-medium text-cherry">{err}</p>}
      </div>
    </Modal>
  );
}
