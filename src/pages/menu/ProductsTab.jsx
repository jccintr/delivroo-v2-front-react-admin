import { useMemo, useState } from 'react';
import { Products } from '../../api/index.js';
import Icon from '../../components/Icon.jsx';
import { Badge, Button, Card, EmptyState, IconButton, Input, Switch } from '../../components/ui.jsx';
import { useUI } from '../../context/UIContext.jsx';
import { productPriceLabel } from '../../lib/groups.js';
import { formatBRL } from '../../lib/money.js';
import ProductEditor from './ProductEditor.jsx';

export default function ProductsTab({ categories, products, groups, reload, goto }) {
  const { error, success, confirm } = useUI();
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null); // 'new' | productId
  const catsSorted = useMemo(() => [...categories].sort((a, b) => a.position - b.position || a.id - b.id), [categories]);
  const norm = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const visible = products.filter((p) => !q || norm(p.name).includes(norm(q)));
  const product = typeof editing === 'number' ? products.find((p) => p.id === editing) : null;

  async function toggle(p, active) {
    try { await Products.update(p.id, { active }); await reload(); } catch (e) { error(e.message); }
  }
  async function remove(p) {
    if (!(await confirm({ title: `Excluir “${p.name}”?`, message: 'O produto sai do cardápio. Pedidos antigos continuam intactos.', confirmLabel: 'Excluir', danger: true }))) return;
    try { await Products.remove(p.id); await reload(); success('Produto excluído.'); } catch (e) { error(e.message); }
  }

  if (categories.length === 0) {
    return <EmptyState icon="book" title="Comece criando uma categoria" action={<Button onClick={() => goto('categories')}>Criar categoria</Button>}>Os produtos ficam dentro de categorias (Hambúrgueres, Bebidas…).</EmptyState>;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar produto…" className="!pl-9" aria-label="Buscar produto" />
        </div>
        <Button onClick={() => setEditing('new')}><Icon name="plus" className="size-4" /> Novo produto</Button>
      </div>

      {products.length === 0 ? (
        <EmptyState icon="book" title="Nenhum produto ainda" action={<Button onClick={() => setEditing('new')}>Adicionar produto</Button>}>Cadastre o primeiro item do seu cardápio.</EmptyState>
      ) : (
        <div className="space-y-6">
          {catsSorted.map((c) => {
            const list = visible.filter((p) => p.categoryId === c.id);
            if (!list.length) return null;
            return (
              <section key={c.id}>
                <h2 className="mb-2 flex items-center gap-2 font-display text-xl font-extrabold">{c.name}{!c.active && <Badge className="bg-ink/10 text-ink-soft">categoria oculta</Badge>}</h2>
                <Card className="divide-y divide-line">
                  {list.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 px-3 py-3 sm:px-4">
                      <button onClick={() => setEditing(p.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`Editar ${p.name}`}>
                        {p.imageUrl ? <img src={p.imageUrl} alt="" className="size-14 shrink-0 rounded-xl object-cover" /> : <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-orange-light text-orange"><Icon name="image" /></span>}
                        <span className="min-w-0">
                          <span className={`block truncate font-semibold ${p.active ? '' : 'text-ink-soft line-through'}`}>{p.name}</span>
                          <span className="block text-sm text-ink-soft">{productPriceLabel(p.variants, groups.filter((g) => p.optionGroupIds.includes(g.id)), formatBRL)}{p.variants.length > 1 ? ` · ${p.variants.length} tamanhos` : ''}</span>
                          {p.optionGroupIds.length > 0 && <span className="mt-0.5 block text-xs text-ink-soft">{p.optionGroupIds.length} grupo(s) de opções</span>}
                        </span>
                      </button>
                      <Switch checked={p.active} onChange={(v) => toggle(p, v)} label={`${p.name} disponível`} />
                      <IconButton icon="edit" label="Editar" onClick={() => setEditing(p.id)} className="max-sm:!hidden" />
                      <IconButton icon="trash" label="Excluir" onClick={() => remove(p)} className="hover:!text-cherry" />
                    </div>
                  ))}
                </Card>
              </section>
            );
          })}
          {visible.length === 0 && <p className="py-10 text-center text-ink-soft">Nenhum produto encontrado para “{q}”.</p>}
        </div>
      )}

      {editing && (
        <ProductEditor
          key={editing} product={product} categories={catsSorted} groups={groups}
          onClose={() => setEditing(null)} reload={reload} onCreated={(p) => setEditing(p.id)} goto={goto}
        />
      )}
    </div>
  );
}
