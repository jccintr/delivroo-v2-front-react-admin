import { useState } from 'react';
import { Categories } from '../../api/index.js';
import Icon from '../../components/Icon.jsx';
import { Button, Card, EmptyState, Field, IconButton, Input, Modal, Switch } from '../../components/ui.jsx';
import { useUI } from '../../context/UIContext.jsx';

export default function CategoriesTab({ categories, products, reload }) {
  const { success, error, confirm } = useUI();
  const [editing, setEditing] = useState(null); // {id?, name}
  const [saving, setSaving] = useState(false);
  const sorted = [...categories].sort((a, b) => a.position - b.position || a.id - b.id);
  const countOf = (id) => products.filter((p) => p.categoryId === id).length;

  async function save() {
    if (!editing.name.trim()) return;
    setSaving(true);
    try {
      if (editing.id) await Categories.update(editing.id, { name: editing.name.trim() });
      else await Categories.create({ name: editing.name.trim(), position: sorted.length });
      setEditing(null); await reload(); success('Categoria salva.');
    } catch (e) { error(e.message); } finally { setSaving(false); }
  }
  async function move(index, dir) {
    const list = [...sorted];
    const j = index + dir;
    if (j < 0 || j >= list.length) return;
    [list[index], list[j]] = [list[j], list[index]];
    try {
      await Promise.all(list.map((c, i) => (c.position !== i ? Categories.update(c.id, { position: i }) : null)));
      await reload();
    } catch (e) { error(e.message); }
  }
  async function toggle(c, active) {
    try { await Categories.update(c.id, { active }); await reload(); } catch (e) { error(e.message); }
  }
  async function remove(c) {
    if (!(await confirm({ title: `Excluir “${c.name}”?`, message: countOf(c.id) ? `Esta categoria tem ${countOf(c.id)} produto(s). Mova ou exclua os produtos antes.` : 'Essa ação não pode ser desfeita.', confirmLabel: 'Excluir', danger: true }))) return;
    try { await Categories.remove(c.id); await reload(); success('Categoria excluída.'); } catch (e) { error(e.message); }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex justify-end"><Button onClick={() => setEditing({ name: '' })}><Icon name="plus" className="size-4" /> Nova categoria</Button></div>
      {sorted.length === 0 ? (
        <EmptyState icon="book" title="Crie sua primeira categoria" action={<Button onClick={() => setEditing({ name: '' })}>Nova categoria</Button>}>Ex.: Hambúrgueres, Pizzas, Bebidas, Sobremesas.</EmptyState>
      ) : (
        <Card className="divide-y divide-line">
          {sorted.map((c, i) => (
            <div key={c.id} className="flex items-center gap-2 px-3 py-3 sm:px-4">
              <div className="flex flex-col">
                <IconButton icon="chevL" label="Subir" className="size-6 rotate-90" disabled={i === 0} onClick={() => move(i, -1)} />
                <IconButton icon="chevR" label="Descer" className="size-6 rotate-90" disabled={i === sorted.length - 1} onClick={() => move(i, 1)} />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`truncate font-semibold ${c.active ? '' : 'text-ink-soft line-through'}`}>{c.name}</p>
                <p className="text-xs text-ink-soft">{countOf(c.id)} produto(s)</p>
              </div>
              <Switch checked={c.active} onChange={(v) => toggle(c, v)} label={`Categoria ${c.name} ativa`} />
              <IconButton icon="edit" label="Renomear" onClick={() => setEditing({ id: c.id, name: c.name })} />
              <IconButton icon="trash" label="Excluir" onClick={() => remove(c)} className="hover:!text-cherry" />
            </div>
          ))}
        </Card>
      )}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Renomear categoria' : 'Nova categoria'}
        footer={<><Button kind="secondary" onClick={() => setEditing(null)}>Cancelar</Button><Button loading={saving} disabled={!editing?.name.trim()} onClick={save}>Salvar</Button></>}>
        <Field label="Nome">{(id) => <Input id={id} autoFocus maxLength={80} value={editing?.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && save()} />}</Field>
      </Modal>
    </div>
  );
}
