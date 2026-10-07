import { useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { Badge, Button, Card, EmptyState } from '../../components/ui.jsx';
import { describeGroup } from '../../lib/groups.js';
import GroupEditor from './GroupEditor.jsx';

export default function GroupsTab({ groups, products, reload }) {
  const [editing, setEditing] = useState(null); // 'new' | groupId
  const usedBy = (g) => products.filter((p) => p.optionGroupIds.includes(g.id));
  const group = typeof editing === 'number' ? groups.find((g) => g.id === editing) : null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-ink-soft">Um grupo reúne opções que o cliente escolhe ao pedir. <b>Obrigatório</b>: ele precisa escolher (ex.: ponto da carne, sabor). <b>Opcional</b>: adicionais (ex.: bacon extra, borda recheada).</p>
        <Button onClick={() => setEditing('new')}><Icon name="plus" className="size-4" /> Novo grupo</Button>
      </div>
      {groups.length === 0 ? (
        <EmptyState icon="menu" title="Nenhum grupo criado" action={<Button onClick={() => setEditing('new')}>Criar primeiro grupo</Button>}>Crie grupos como “Adicionais”, “Ponto da carne” ou “Escolha o molho” e vincule-os aos produtos.</EmptyState>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((g) => {
            const d = describeGroup(g); const used = usedBy(g);
            return (
              <Card key={g.id} className="flex flex-col p-4">
                <button onClick={() => setEditing(g.id)} className="flex-1 text-left" aria-label={`Editar grupo ${g.name}`}>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className={`font-display text-xl font-extrabold leading-tight ${g.active ? '' : 'text-ink-soft line-through'}`}>{g.name}</h3>
                    <Badge className={d.required ? 'bg-orange-light text-orange-deep' : 'bg-ink/10 text-ink-soft'}>{d.label}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">{d.rule}{d.extra ? ` · ${d.extra}` : ''}</p>
                  <p className="mt-2 line-clamp-2 text-sm">{g.options.slice(0, 6).map((o) => o.name).join(', ')}{g.options.length > 6 ? '…' : ''}{g.options.length === 0 && <i className="text-ink-soft">sem opções</i>}</p>
                </button>
                <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-xs text-ink-soft">
                  <span>{g.options.length} opções</span>
                  <span>{used.length ? `usado em ${used.length} produto(s)` : 'não vinculado a produtos'}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {editing && <GroupEditor key={editing} group={group} products={products} onClose={() => setEditing(null)} reload={reload} onCreated={(g) => setEditing(g.id)} />}
    </div>
  );
}
