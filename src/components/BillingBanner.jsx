import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { billingNotice } from '../lib/billing.js';
import { cx } from './ui.jsx';

const TONE = {
  info: 'bg-orange-light text-ink',
  warn: 'bg-butter/40 text-amber-950',
  bad: 'bg-cherry text-white',
};

/** faixa no topo do painel com o aviso de teste/vencimento/atraso/suspensão (some quando está tudo em dia) */
export default function BillingBanner() {
  const { store } = useAuth();
  const notice = billingNotice(store?.access);
  if (!notice) return null;
  return (
    <div role="status" data-testid="billing-banner" data-tone={notice.tone} className={cx('flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-center text-sm', TONE[notice.tone])}>
      <span><b>{notice.title}.</b> {notice.text}</span>
      <Link to="/assinatura" className="font-bold underline underline-offset-2">Ver assinatura</Link>
    </div>
  );
}
