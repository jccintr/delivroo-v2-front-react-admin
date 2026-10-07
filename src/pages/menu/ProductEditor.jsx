import { useState } from 'react';
import { Products } from '../../api/index.js';
import Icon from '../../components/Icon.jsx';
import { Badge, Button, Field, IconButton, ImageUpload, Input, Modal, MoneyInput, Select, Switch, Textarea, cx } from '../../components/ui.jsx';
import { useUI } from '../../context/UIContext.jsx';
import { describeGroup } from '../../lib/groups.js';

let seq = 0;
const blankVariant = (name = '') => ({ key: `n${++seq}`, name, priceCents: null, description: '', active: true });

export default function ProductEditor({ product, categories, groups, onClose, reload, onCreated, goto }) {
  const { success, error, confirm } = useUI();
  const isNew = !product;
  const [f, setF] = useState(() => ({
    name: product?.name ?? '',
    description: product?.description ?? '',
    categoryId: product?.categoryId ?? categories[0]?.id ?? '',
    active: product?.active ?? true,
  }));
  const [variants, setVariants] = useState(() => (product ? product.variants.map((v) => ({ key: `v${v.id}`, id: v.id, name: v.name, priceCents: v.priceCents, description: v.description ?? '', active: v.active })) : [blankVariant('Único')]));
  const [groupIds, setGroupIds] = useState(product?.optionGroupIds ?? []);
  const [removed, setRemoved] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const setVar = (key, patch) => setVariants((vs) => vs.map((v) => (v.key === key ? { ...v, ...patch } : v)));
  const toggleGroup = (id) => setGroupIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  const simple = variants.length === 1;

  function validate() {
    if (!f.name.trim()) return 'Informe o nome do produto.';
    if (!f.categoryId) return 'Escolha a categoria.';
    if (variants.some((v) => !v.name.trim())) return 'Toda variação precisa de um nome (ex.: Pequena, Grande).';
    if (variants.some((v) => v.priceCents == null)) return 'Informe o preço de cada variação.';
    const names = variants.map((v) => v.name.trim().toLowerCase());
    if (new Set(names).size !== names.length) return 'Há variações com o mesmo nome.';
    return null;
  }

  async function save() {
    const problem = validate();
    if (problem) { setErr(problem); return; }
    setErr(''); setSaving(true);
    const body = { categoryId: Number(f.categoryId), name: f.name.trim(), description: f.description.trim() || null, active: f.active };
    const vbody = (v, i) => ({ name: v.name.trim(), priceCents: v.priceCents, description: v.description.trim() || null, active: v.active, position: i });
    try {
      if (isNew) {
        const created = await Products.create({ ...body, variants: variants.map(vbody) });
        if (groupIds.length) await Products.setGroups(created.id, groupIds);
        await reload();
        success('Produto criado! Agora você pode adicionar a foto.');
        onCreated(created);
        return;
      }
      await Products.update(product.id, body);
      for (const id of removed) await Products.removeVariant(product.id, id);
      for (const [i, v] of variants.entries()) {
        if (v.id) await Products.updateVariant(product.id, v.id, vbody(v, i));
        else await Products.addVariant(product.id, vbody(v, i));
      }
      await Products.setGroups(product.id, groupIds);
      await reload();
      success('Produto salvo.');
      onClose();
    } catch (e) {
      setErr(e.details?.length ? e.details.map((d) => d.message).join(' · ') : e.message);
      if (!isNew) reload();
    } finally { setSaving(false); }
  }

  async function removeVariant(v) {
    if (variants.length === 1) return;
    if (v.id) {
      if (!(await confirm({ title: `Remover “${v.name}”?`, message: 'A variação some do produto ao salvar.', confirmLabel: 'Remover', danger: true }))) return;
      setRemoved((r) => [...r, v.id]);
    }
    setVariants((vs) => vs.filter((x) => x.key !== v.key));
  }

  return (
    <Modal
      open wide onClose={onClose} title={isNew ? 'Novo produto' : 'Editar produto'}
      footer={<><Button kind="secondary" onClick={onClose}>Fechar</Button><Button loading={saving} onClick={save}>{isNew ? 'Criar produto' : 'Salvar'}</Button></>}
    >
      <div className="space-y-5">
        {!isNew && (
          <ImageUpload label="Foto" url={product.imageUrl} size="size-24"
            onUpload={async (file) => { await Products.uploadImage(product.id, file); await reload(); }}
            onRemove={async () => { await Products.removeImage(product.id); await reload(); }} />
        )}
        <Field label="Nome">{(id) => <Input id={id} value={f.name} maxLength={120} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ex.: X-Burger" />}</Field>
        <Field label="Descrição" hint="Ingredientes, tamanho da porção…">{(id) => <Textarea id={id} maxLength={500} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />}</Field>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <Field label="Categoria">{(id) => <Select id={id} value={f.categoryId} onChange={(e) => setF({ ...f, categoryId: e.target.value })}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>}</Field>
          <label className="flex items-center gap-3 pb-2.5 text-sm font-semibold"><Switch checked={f.active} onChange={(v) => setF({ ...f, active: v })} label="Disponível" /> Disponível no cardápio</label>
        </div>

        <section>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="font-display text-lg font-bold">{simple ? 'Preço' : 'Tamanhos e preços'}</h3>
            <Button kind="secondary" size="sm" onClick={() => setVariants((vs) => [...vs, blankVariant()])}><Icon name="plus" className="size-4" /> Adicionar tamanho</Button>
          </div>
          {simple && <p className="mb-2 text-sm text-ink-soft">Produto de preço único. Para pizza (P/M/G) ou bebidas (300 ml / 600 ml), adicione outros tamanhos.</p>}
          <div className="space-y-3">
            {variants.map((v, i) => (
              <div key={v.key} className="rounded-2xl border border-line bg-white p-3" data-testid="variant-row">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
                  <Field label={simple ? 'Nome interno' : `Tamanho ${i + 1}`}>{(id) => <Input id={id} value={v.name} maxLength={60} onChange={(e) => setVar(v.key, { name: e.target.value })} placeholder="Ex.: Grande" aria-label={`Nome do tamanho ${i + 1}`} />}</Field>
                  <Field label="Preço">{(id) => <MoneyInput id={id} value={v.priceCents} onChange={(c) => setVar(v.key, { priceCents: c })} aria-label={`Preço do tamanho ${i + 1}`} />}</Field>
                </div>
                {!simple && (
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <Input value={v.description} maxLength={120} onChange={(e) => setVar(v.key, { description: e.target.value })} placeholder="Detalhe (ex.: 8 fatias)" className="min-w-0 flex-1 !py-1.5 text-sm" aria-label="Detalhe do tamanho" />
                    <label className="flex items-center gap-2 text-sm"><Switch checked={v.active} onChange={(a) => setVar(v.key, { active: a })} label="Tamanho ativo" /> Ativo</label>
                    <IconButton icon="trash" label="Remover tamanho" onClick={() => removeVariant(v)} className="hover:!text-cherry" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="font-display text-lg font-bold">Adicionais e itens obrigatórios</h3>
          <p className="mb-2 text-sm text-ink-soft">Marque os grupos que o cliente vê ao escolher este produto (ex.: “Ponto da carne”, “Adicionais”).</p>
          {groups.length === 0 ? (
            <p className="rounded-xl bg-white p-3 text-sm text-ink-soft">Você ainda não criou grupos. <button className="font-bold text-orange hover:underline" onClick={() => { onClose(); goto('groups'); }}>Criar agora</button></p>
          ) : (
            <ul className="space-y-2">
              {groups.map((g) => {
                const d = describeGroup(g); const on = groupIds.includes(g.id);
                return (
                  <li key={g.id}>
                    <label className={cx('flex cursor-pointer items-center gap-3 rounded-xl border bg-white px-3 py-2.5 transition', on ? 'border-orange ring-2 ring-orange/15' : 'border-line')}>
                      <input type="checkbox" checked={on} onChange={() => toggleGroup(g.id)} className="size-5 accent-orange" />
                      <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{g.name}</span><span className="text-xs text-ink-soft">{g.options.length} opções · {d.rule}</span></span>
                      <Badge className={d.required ? 'bg-orange-light text-orange-deep' : 'bg-ink/10 text-ink-soft'}>{d.label}</Badge>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        {err && <p role="alert" className="rounded-xl bg-cherry/10 px-3 py-2 text-sm font-medium text-cherry">{err}</p>}
      </div>
    </Modal>
  );
}
