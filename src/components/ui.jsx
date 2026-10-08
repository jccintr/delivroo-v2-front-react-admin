import { useEffect, useId, useRef, useState } from 'react';
import { centsToInput, parseBRLToCents } from '../lib/money.js';
import Icon from './Icon.jsx';

// deve acompanhar IMAGE_MAX_MB da API (padrão 3); a API é quem decide de fato
const MAX_IMAGE_MB = Number(import.meta.env.VITE_IMAGE_MAX_MB) || 3;

export const cx = (...c) => c.filter(Boolean).join(' ');

/** marca do Delivroo (mesmo símbolo da landing page) */
export function LogoMark({ className = 'size-9' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="32" fill="#FFE7D4" />
      <path d="M18 24C18 20.6863 20.6863 18 24 18H40C43.3137 18 46 20.6863 46 24C46 24.5523 45.5523 25 45 25H19C18.4477 25 18 24.5523 18 24Z" fill="#FF5A1F" />
      <rect x="17" y="29" width="30" height="5" rx="2.5" fill="#FF5A1F" />
      <rect x="17" y="37" width="30" height="5" rx="2.5" fill="#FF5A1F" />
      <rect x="20" y="45" width="24" height="4" rx="2" fill="#E24312" />
    </svg>
  );
}

export function Logo({ light = false, className = '' }) {
  return (
    <span className={cx('inline-flex items-center gap-2', className)}>
      <LogoMark />
      <span className={cx('font-display text-2xl font-extrabold leading-none tracking-tight', light ? 'text-white' : 'text-ink')}>Delivroo</span>
    </span>
  );
}

export function Spinner({ className = 'size-5' }) {
  return <span className={cx('inline-block animate-spin rounded-full border-2 border-current border-t-transparent', className)} role="status" aria-label="Carregando" />;
}

export function Loading({ label = 'Carregando…' }) {
  return <div className="flex items-center justify-center gap-3 py-16 text-ink-soft"><Spinner /> {label}</div>;
}

const BTN = {
  primary: 'bg-orange text-white hover:bg-orange-deep shadow-sm shadow-orange/30',
  secondary: 'bg-white text-ink border border-line hover:bg-cream-2',
  ghost: 'text-ink-soft hover:bg-cream-2',
  danger: 'bg-white text-cherry border border-cherry/30 hover:bg-cherry/10',
  dark: 'bg-navy text-white hover:bg-navy-2',
  mint: 'bg-mint text-white hover:brightness-95',
};
export function Button({ kind = 'primary', size = 'md', loading, className, children, disabled, ...rest }) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[.98] disabled:opacity-50',
        size === 'sm' ? 'px-3 py-1.5 text-sm' : size === 'lg' ? 'px-5 py-3.5 text-base' : 'px-4 py-2.5 text-sm',
        BTN[kind], className,
      )}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  );
}

export function IconButton({ icon, label, className, ...rest }) {
  return (
    <button type="button" aria-label={label} title={label} {...rest} className={cx('inline-flex size-9 items-center justify-center rounded-lg text-ink-soft transition hover:bg-cream-2 hover:text-ink disabled:opacity-40', className)}>
      <Icon name={icon} className="size-5" />
    </button>
  );
}

const inputCls = 'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink-soft/60 focus:border-orange focus:outline-none focus:ring-2 focus:ring-orange/20 disabled:bg-cream-2';

export function Field({ label, hint, error, children, className }) {
  const id = useId();
  return (
    <div className={className}>
      {label && <label htmlFor={id} className="mb-1 block text-sm font-semibold text-ink">{label}</label>}
      {typeof children === 'function' ? children(id) : children}
      {hint && !error && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-cherry">{error}</p>}
    </div>
  );
}

export const Input = ({ className, ...p }) => <input {...p} className={cx(inputCls, className)} />;
export const Textarea = ({ className, ...p }) => <textarea rows={3} {...p} className={cx(inputCls, 'resize-y', className)} />;
export const Select = ({ className, children, ...p }) => (
  <select {...p} className={cx(inputCls, 'appearance-none bg-[url("data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%236B5D4F%27 stroke-width=%272%27><path d=%27M6 9l6 6 6-6%27/></svg>")] bg-[length:18px] bg-[right_.7rem_center] bg-no-repeat pr-9', className)}>{children}</select>
);

/** campo de dinheiro: o usuário digita "12,50"; o valor externo é em centavos */
export function MoneyInput({ value, onChange, id, ...p }) {
  const [text, setText] = useState(value == null ? '' : centsToInput(value));
  const last = useRef(value);
  useEffect(() => {
    if (value !== last.current) { last.current = value; setText(value == null ? '' : centsToInput(value)); }
  }, [value]);
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-soft">R$</span>
      <input
        id={id} inputMode="decimal" placeholder="0,00" {...p} value={text} className={cx(inputCls, 'pl-10')}
        onChange={(e) => {
          const t = e.target.value.replace(/[^\d.,]/g, '');
          setText(t);
          const cents = t === '' ? null : parseBRLToCents(t);
          last.current = cents;
          onChange(cents);
        }}
        onBlur={() => { if (value != null) setText(centsToInput(value)); }}
      />
    </div>
  );
}

export function Switch({ checked, onChange, label, disabled, className }) {
  return (
    <button
      type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx('relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50', checked ? 'bg-mint' : 'bg-ink/20', className)}
    >
      <span className={cx('inline-block size-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[22px]' : 'translate-x-0.5')} />
    </button>
  );
}

export function Badge({ className, children }) {
  return <span className={cx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold', className)}>{children}</span>;
}

export function Card({ className, children, ...p }) {
  return <div {...p} className={cx('rounded-2xl border border-line bg-white shadow-sm', className)}>{children}</div>;
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-extrabold leading-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {children && <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function EmptyState({ icon = 'store', title, children, action }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-white/60 px-6 py-12 text-center">
      <span className="mb-3 flex size-14 items-center justify-center rounded-full bg-orange-light text-orange"><Icon name={icon} className="size-7" /></span>
      <h3 className="font-display text-xl font-bold">{title}</h3>
      {children && <p className="mt-1 max-w-sm text-sm text-ink-soft">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** janela: bottom-sheet no celular, modal centralizado no desktop */
export function Modal({ open, onClose, title, children, footer, wide }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 animate-fade-in bg-navy/60" onClick={onClose} />
      <div className={cx('relative flex max-h-[92dvh] w-full animate-sheet-in flex-col rounded-t-3xl bg-cream shadow-2xl sm:rounded-3xl', wide ? 'sm:max-w-2xl' : 'sm:max-w-lg')}>
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="font-display text-xl font-extrabold">{title}</h2>
          <IconButton icon="x" label="Fechar" onClick={onClose} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-white/70 px-5 py-3 pb-[max(.75rem,env(safe-area-inset-bottom))] sm:rounded-b-3xl">{footer}</div>}
      </div>
    </div>
  );
}

export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={cx('no-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-xl bg-cream-2 p-1', className)} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.key} role="tab" aria-selected={value === t.key} onClick={() => onChange(t.key)}
          className={cx('flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold transition', value === t.key ? 'bg-white text-ink shadow-sm' : 'text-ink-soft hover:text-ink')}
        >
          {t.label}
          {t.count != null && <span className={cx('rounded-full px-1.5 text-xs', value === t.key ? 'bg-orange text-white' : 'bg-ink/10')}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** botão de enviar/remover imagem (produto, opção, logo) */
export function ImageUpload({ url, onUpload, onRemove, shape = 'square', size = 'size-24', label = 'Foto' }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function pick(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) { setErr(`Imagem muito grande (máx. ${MAX_IMAGE_MB} MB).`); return; }
    setErr(''); setBusy(true);
    try { await onUpload(file); } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true); setErr('');
    try { await onRemove(); } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  }
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => ref.current?.click()} disabled={busy} aria-label={url ? `Trocar ${label}` : `Enviar ${label}`}
        className={cx('group relative flex shrink-0 items-center justify-center overflow-hidden border-2 border-dashed border-line bg-white text-ink-soft transition hover:border-orange hover:text-orange', size, shape === 'round' ? 'rounded-full' : 'rounded-2xl')}>
        {url ? <img src={url} alt="" className="size-full object-cover" /> : <Icon name="image" className="size-7" />}
        {busy && <span className="absolute inset-0 flex items-center justify-center bg-white/70"><Spinner /></span>}
      </button>
      <div className="min-w-0 text-sm">
        <div className="flex flex-wrap gap-2">
          <Button kind="secondary" size="sm" onClick={() => ref.current?.click()} disabled={busy}>{url ? 'Trocar' : 'Enviar'} {label.toLowerCase()}</Button>
          {url && <Button kind="ghost" size="sm" onClick={remove} disabled={busy}>Remover</Button>}
        </div>
        {err ? <p className="mt-1 text-xs font-medium text-cherry">{err}</p> : <p className="mt-1 text-xs text-ink-soft">JPG, PNG ou WebP até {MAX_IMAGE_MB} MB.</p>}
      </div>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pick} data-testid="image-input" />
    </div>
  );
}
