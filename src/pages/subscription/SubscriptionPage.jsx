import { useState } from 'react';
import { Subscription } from '../../api/index.js';
import Icon from '../../components/Icon.jsx';
import { Badge, Button, Card, Loading, PageHeader, cx } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useUI } from '../../context/UIContext.jsx';
import useResource from '../../hooks/useResource.js';
import {
  BILLING_LABEL, BILLING_TONE, INVOICE_LABEL, formatDay, isRestricted, openInvoice, statusSummary,
} from '../../lib/billing.js';
import { formatBRL } from '../../lib/money.js';

const TONE_CLS = { ok: 'bg-mint-light text-mint', warn: 'bg-butter/40 text-amber-900', bad: 'bg-cherry/10 text-cherry' };
const INVOICE_CLS = { OPEN: 'bg-butter/40 text-amber-900', PAID: 'bg-mint-light text-mint', VOID: 'bg-ink/10 text-ink-soft' };

function CopyButton({ text, label = 'Copiar' }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000); } catch { /* sem permissão: o texto continua visível para copiar à mão */ }
  }
  return (
    <Button kind="secondary" size="sm" onClick={copy}>
      <Icon name={done ? 'check' : 'copy'} className="size-4" /> {done ? 'Copiado' : label}
    </Button>
  );
}

function PixBox({ pix, invoice }) {
  if (!pix) {
    return <p className="rounded-xl bg-cream-2 px-3 py-2 text-sm text-ink-soft">A chave Pix do Delivroo ainda não foi configurada. Fale com o suporte do Delivroo para receber os dados de pagamento.</p>;
  }
  return (
    <div className="rounded-xl border border-line bg-cream p-4" data-testid="pix-box">
      <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">Pague via Pix{pix.keyType ? ` (${pix.keyType})` : ''}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <code className="break-all rounded-lg bg-white px-2.5 py-1.5 text-[15px] font-bold" data-testid="pix-key">{pix.key}</code>
        <CopyButton text={pix.key} label="Copiar chave" />
      </div>
      {pix.beneficiary && <p className="mt-2 text-sm text-ink-soft">Favorecido: <b className="text-ink">{pix.beneficiary}</b></p>}
      <p className="mt-1 text-sm text-ink-soft">Valor: <b className="text-ink">{formatBRL(invoice.amountCents)}</b></p>
      {pix.instructions && <p className="mt-2 text-sm text-ink-soft">{pix.instructions}</p>}
    </div>
  );
}

function InvoiceCard({ invoice, pix, onReported }) {
  const { error, success } = useUI();
  const [busy, setBusy] = useState(false);
  async function report() {
    setBusy(true);
    try { onReported(await Subscription.reportPayment(invoice.id)); success('Aviso enviado. Vamos conferir o pagamento.'); } catch (e) { error(e.message); } finally { setBusy(false); }
  }
  return (
    <Card className="p-5" data-testid="open-invoice">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-xl font-extrabold">Fatura em aberto</h2>
          <p className="text-sm text-ink-soft">Período de {formatDay(invoice.periodStart)} a {formatDay(invoice.periodEnd)}</p>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl font-extrabold">{formatBRL(invoice.amountCents)}</p>
          <p className={cx('text-sm font-semibold', invoice.overdue ? 'text-cherry' : 'text-ink-soft')}>
            {invoice.overdue ? 'Venceu' : 'Vence'} em {formatDay(invoice.dueOn)}
          </p>
        </div>
      </div>
      <div className="mt-4"><PixBox pix={pix} invoice={invoice} /></div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {invoice.reportedPaidAt ? (
          <p className="flex items-center gap-2 text-sm font-semibold text-mint" data-testid="reported-note"><Icon name="check" className="size-4" /> Você avisou que pagou. Estamos conferindo — a assinatura é atualizada assim que o pagamento for confirmado.</p>
        ) : (
          <>
            <Button onClick={report} loading={busy}>Já paguei</Button>
            <span className="text-xs text-ink-soft">Depois de fazer o Pix, clique aqui para avisar. A confirmação é feita pelo Delivroo.</span>
          </>
        )}
      </div>
    </Card>
  );
}

function PlanCard({ plan, current, busy, onChoose, hasPlan }) {
  return (
    <Card className={cx('flex flex-col p-5', current && 'ring-2 ring-orange')} data-testid="plan-card">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display text-xl font-extrabold">{plan.name}</h3>
        {current && <Badge className="bg-orange-light text-orange">Seu plano</Badge>}
      </div>
      <p className="mt-1 font-display text-3xl font-extrabold">{formatBRL(plan.priceCents)}<span className="text-base font-semibold text-ink-soft"> /mês</span></p>
      {plan.description && <p className="mt-2 flex-1 text-sm text-ink-soft">{plan.description}</p>}
      {!current && <Button className="mt-4" kind={hasPlan ? 'secondary' : 'primary'} loading={busy} onClick={() => onChoose(plan)}>{hasPlan ? 'Trocar para este plano' : 'Escolher este plano'}</Button>}
    </Card>
  );
}

export default function SubscriptionPage() {
  const { store, setStore, refresh } = useAuth();
  const { error, success, confirm } = useUI();
  const { data, error: loadError, loading, setData, reload } = useResource(() => Subscription.get(), []);
  const [choosing, setChoosing] = useState(null);
  const [exporting, setExporting] = useState(false);

  // a tela traz a situação mais nova: mantém o aviso do topo em sincronia
  const apply = (next) => { setData(next); setStore((s) => ({ ...s, access: next.access })); };

  async function choose(plan) {
    const hasPlan = !!data.subscription.planId;
    const ok = await confirm({
      title: hasPlan ? 'Trocar de plano?' : 'Escolher este plano?',
      message: `${plan.name} — ${formatBRL(plan.priceCents)} por mês. ${hasPlan ? 'A fatura em aberto do plano anterior será substituída.' : 'Vamos gerar a fatura para você pagar via Pix.'}`,
      confirmLabel: 'Confirmar',
    });
    if (!ok) return;
    setChoosing(plan.id);
    try { apply(await Subscription.choosePlan(plan.id)); success('Plano escolhido. Sua fatura já está disponível.'); } catch (e) { error(e.message); } finally { setChoosing(null); }
  }

  async function exportData() {
    setExporting(true);
    try { await Subscription.exportData(store.slug); } catch (e) { error(e.message); } finally { setExporting(false); }
  }

  if (loading) return <Loading />;
  if (loadError || !data) {
    return (
      <Card className="mx-auto max-w-lg p-6 text-center">
        <p className="font-semibold">Não conseguimos carregar a assinatura.</p>
        <p className="mt-1 text-sm text-ink-soft">{loadError?.message}</p>
        <Button className="mt-4" onClick={() => { refresh(); reload(); }}>Tentar novamente</Button>
      </Card>
    );
  }

  const { access, subscription, invoices, plans, pix } = data;
  const invoice = openInvoice(invoices);
  const tone = BILLING_TONE[access.billing.status];
  const history = invoices.filter((i) => i.status !== 'OPEN');
  const hasPlan = !!subscription.planId;
  const noPayNeeded = access.billing.status === 'COURTESY';

  return (
    <>
      <PageHeader title="Assinatura" subtitle="Seu plano, faturas e pagamento." />
      <div className="mx-auto max-w-3xl space-y-5">
        <Card className="p-5" data-testid="status-card">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={TONE_CLS[tone]}>{BILLING_LABEL[access.billing.status]}</Badge>
            {subscription.plan && <span className="text-sm font-semibold text-ink-soft">Plano {subscription.plan.name} · {formatBRL(subscription.plan.priceCents)}/mês</span>}
          </div>
          <p className="mt-2 text-[15px]" data-testid="status-summary">{statusSummary(access)}</p>
          {isRestricted(access) && (
            <p className="mt-3 rounded-xl bg-cherry/10 px-3 py-2 text-sm font-medium text-cherry">
              Enquanto a assinatura estiver suspensa, o painel fica limitado a esta tela e aos pedidos em andamento. Seus dados continuam guardados.
            </p>
          )}
        </Card>

        {invoice && !noPayNeeded && <InvoiceCard key={invoice.id} invoice={invoice} pix={pix} onReported={apply} />}

        {!noPayNeeded && (
          <section aria-labelledby="plans-title">
            <h2 id="plans-title" className="mb-3 font-display text-xl font-extrabold">{hasPlan ? 'Planos disponíveis' : 'Escolha seu plano'}</h2>
            {plans.length === 0 ? (
              <Card className="p-5 text-sm text-ink-soft">Os planos ainda não estão disponíveis. {access.billing.status === 'TRIALING' ? 'Você continua no teste grátis e avisaremos quando for a hora de escolher.' : 'Fale com o suporte do Delivroo.'}</Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {plans.map((p) => <PlanCard key={p.id} plan={p} hasPlan={hasPlan} current={subscription.planId === p.id} busy={choosing === p.id} onChoose={choose} />)}
              </div>
            )}
          </section>
        )}

        {history.length > 0 && (
          <section aria-labelledby="hist-title">
            <h2 id="hist-title" className="mb-3 font-display text-xl font-extrabold">Histórico de faturas</h2>
            <Card className="divide-y divide-line">
              {history.map((i) => (
                <div key={i.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm" data-testid="invoice-row">
                  <div>
                    <p className="font-semibold">{formatDay(i.periodStart)} a {formatDay(i.periodEnd)}</p>
                    <p className="text-xs text-ink-soft">{i.status === 'PAID' && i.paidAt ? `Paga em ${new Date(i.paidAt).toLocaleDateString('pt-BR')}` : `Vencimento ${formatDay(i.dueOn)}`}</p>
                  </div>
                  <div className="flex items-center gap-3"><span className="font-bold">{formatBRL(i.amountCents)}</span><Badge className={INVOICE_CLS[i.status]}>{INVOICE_LABEL[i.status]}</Badge></div>
                </div>
              ))}
            </Card>
          </section>
        )}

        <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <h2 className="font-display text-lg font-extrabold">Seus dados</h2>
            <p className="text-sm text-ink-soft">Baixe uma cópia do cardápio e dos pedidos da sua loja (arquivo JSON).</p>
          </div>
          <Button kind="secondary" loading={exporting} onClick={exportData}>Baixar meus dados</Button>
        </Card>
      </div>
    </>
  );
}
