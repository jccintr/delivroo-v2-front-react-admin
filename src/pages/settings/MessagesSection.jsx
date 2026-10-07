import { useEffect, useState } from 'react';
import { Store } from '../../api/index.js';
import { Badge, Button, Card, Loading, Textarea } from '../../components/ui.jsx';
import { useUI } from '../../context/UIContext.jsx';
import useResource from '../../hooks/useResource.js';
import { STATUS_LABEL } from '../../lib/orderStatus.js';

function Template({ t, reload }) {
  const { success, error } = useUI();
  const [text, setText] = useState(t.body);
  const [busy, setBusy] = useState(false);
  useEffect(() => setText(t.body), [t.body]);
  const dirty = text.trim() !== t.body;

  async function save() {
    setBusy(true);
    try { await Store.saveMessage(t.status, text.trim()); await reload(); success('Mensagem salva.'); } catch (e) { error(e.message); } finally { setBusy(false); }
  }
  async function reset() {
    setBusy(true);
    try { await Store.resetMessage(t.status); await reload(); success('Mensagem padrão restaurada.'); } catch (e) { error(e.message); } finally { setBusy(false); }
  }
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center gap-2"><h3 className="font-display text-lg font-bold">{STATUS_LABEL[t.status]}</h3>{t.isCustom && <Badge className="bg-orange-light text-orange-deep">personalizada</Badge>}</div>
      <Textarea rows={2} maxLength={500} value={text} onChange={(e) => setText(e.target.value)} aria-label={`Mensagem para ${STATUS_LABEL[t.status]}`} />
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-xs text-ink-soft">{text.length}/500</span>
        <div className="flex gap-2">
          {t.isCustom && <Button kind="ghost" size="sm" loading={busy} onClick={reset}>Restaurar padrão</Button>}
          <Button size="sm" disabled={!dirty || !text.trim()} loading={busy} onClick={save}>Salvar</Button>
        </div>
      </div>
    </Card>
  );
}

export default function MessagesSection() {
  const { data, loading, reload } = useResource(() => Store.messages(), []);
  if (loading && !data) return <Loading />;
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-soft">Ao mudar o status de um pedido, o painel oferece o botão <b>“Avisar no WhatsApp”</b> com o texto abaixo já pronto. Personalize com a cara da sua loja.</p>
      {data.map((t) => <Template key={t.status} t={t} reload={reload} />)}
    </div>
  );
}
