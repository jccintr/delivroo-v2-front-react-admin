import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Button, Modal, Textarea, cx } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';

const Ctx = createContext(null);
export const useUI = () => useContext(Ctx);

export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const seq = useRef(0);

  const toast = useCallback((message, { kind = 'info', action, ms = 4500 } = {}) => {
    const id = ++seq.current;
    setToasts((t) => [...t.slice(-3), { id, message, kind, action }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ms);
  }, []);

  // confirm({title, message, confirmLabel, danger, askReason}) -> Promise<false | true | string(motivo)>
  const confirm = useCallback((opts) => new Promise((resolve) => setDialog({ ...opts, resolve })), []);

  const value = useMemo(() => ({
    toast,
    success: (m) => toast(m, { kind: 'success' }),
    error: (m) => toast(m, { kind: 'error', ms: 7000 }),
    confirm,
  }), [toast, confirm]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} role="status" className={cx('pointer-events-auto flex max-w-md animate-toast-in items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg', t.kind === 'error' ? 'bg-cherry' : t.kind === 'success' ? 'bg-mint' : 'bg-navy')}>
            <Icon name={t.kind === 'error' ? 'x' : 'check'} className="size-4 shrink-0" />
            <span>{t.message}</span>
            {t.action && <button className="ml-1 rounded-md bg-white/20 px-2 py-0.5 font-bold hover:bg-white/30" onClick={() => { t.action.run(); setToasts((x) => x.filter((y) => y.id !== t.id)); }}>{t.action.label}</button>}
          </div>
        ))}
      </div>
      {dialog && <ConfirmDialog key={dialog.title} {...dialog} onDone={(v) => { dialog.resolve(v); setDialog(null); }} />}
    </Ctx.Provider>
  );
}

function ConfirmDialog({ title, message, confirmLabel = 'Confirmar', danger, askReason, reasonLabel = 'Motivo', onDone }) {
  const [reason, setReason] = useState('');
  const missing = askReason && !reason.trim();
  return (
    <Modal
      open onClose={() => onDone(false)} title={title}
      footer={<>
        <Button kind="secondary" onClick={() => onDone(false)}>Voltar</Button>
        <Button kind={danger ? 'danger' : 'primary'} disabled={missing} onClick={() => onDone(askReason ? reason.trim() : true)} className={danger ? '!bg-cherry !text-white hover:!brightness-95' : ''}>{confirmLabel}</Button>
      </>}
    >
      {message && <p className="text-[15px] text-ink-soft">{message}</p>}
      {askReason && (
        <label className="mt-3 block text-sm font-semibold">
          {reasonLabel}
          <Textarea autoFocus className="mt-1 font-normal" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="Ex.: produto em falta" />
          <span className="mt-1 block text-xs font-normal text-ink-soft">O cliente recebe este motivo na mensagem.</span>
        </label>
      )}
    </Modal>
  );
}
