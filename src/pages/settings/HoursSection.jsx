import { useEffect, useState } from 'react';
import { Store } from '../../api/index.js';
import Icon from '../../components/Icon.jsx';
import { Button, Card, IconButton, Input, Loading, Switch } from '../../components/ui.jsx';
import { useUI } from '../../context/UIContext.jsx';
import useResource from '../../hooks/useResource.js';

const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function HoursSection() {
  const { success, error } = useUI();
  const { data, loading } = useResource(() => Store.hours(), []);
  const [days, setDays] = useState(null); // { [weekday]: [{opensAt, closesAt}] }
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    const m = Object.fromEntries(DAYS.map((_, i) => [i, []]));
    data.forEach((h) => m[h.weekday].push({ opensAt: h.opensAt.slice(0, 5), closesAt: h.closesAt.slice(0, 5) }));
    setDays(m);
  }, [data]);

  if (loading || !days) return <Loading />;
  const patch = (d, list) => setDays((x) => ({ ...x, [d]: list }));

  async function save() {
    const hours = ORDER.flatMap((d) => days[d].map((h) => ({ weekday: d, ...h })));
    const bad = hours.find((h) => h.closesAt <= h.opensAt);
    if (bad) { error(`${DAYS[bad.weekday]}: o fechamento deve ser depois da abertura.`); return; }
    setSaving(true);
    try { await Store.saveHours(hours); success('Horários salvos.'); } catch (e) { error(e.message); } finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">Horários exibidos aos clientes. Quem abre e fecha a loja de fato é o botão <b>Aberta/Fechada</b> no topo.</p>
      <Card className="divide-y divide-line">
        {ORDER.map((d) => {
          const list = days[d]; const on = list.length > 0;
          return (
            <div key={d} className="flex flex-wrap items-start gap-x-4 gap-y-2 px-4 py-3" data-testid={`day-${d}`}>
              <div className="flex w-36 items-center gap-3 pt-1.5">
                <Switch checked={on} onChange={(v) => patch(d, v ? [{ opensAt: '18:00', closesAt: '23:00' }] : [])} label={`${DAYS[d]} aberto`} />
                <span className="font-semibold">{DAYS[d]}</span>
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                {!on && <p className="pt-1.5 text-sm text-ink-soft">Fechado</p>}
                {list.map((h, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <Input type="time" value={h.opensAt} className="!w-auto" aria-label={`${DAYS[d]} abre`} onChange={(e) => patch(d, list.map((x, k) => (k === i ? { ...x, opensAt: e.target.value } : x)))} />
                    <span className="text-ink-soft">às</span>
                    <Input type="time" value={h.closesAt} className="!w-auto" aria-label={`${DAYS[d]} fecha`} onChange={(e) => patch(d, list.map((x, k) => (k === i ? { ...x, closesAt: e.target.value } : x)))} />
                    <IconButton icon="trash" label="Remover faixa" onClick={() => patch(d, list.filter((_, k) => k !== i))} className="hover:!text-cherry" />
                  </div>
                ))}
                {on && <button className="text-sm font-bold text-orange hover:underline" onClick={() => patch(d, [...list, { opensAt: '12:00', closesAt: '15:00' }])}>+ outra faixa de horário</button>}
              </div>
            </div>
          );
        })}
      </Card>
      <div className="flex justify-end"><Button size="lg" loading={saving} onClick={save}>Salvar horários</Button></div>
    </div>
  );
}
