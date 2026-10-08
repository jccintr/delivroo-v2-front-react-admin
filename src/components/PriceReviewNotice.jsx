import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { dismissPriceReview, needsPriceReview } from '../lib/priceReview.js';

/**
 * Faixa no topo do painel para lojas criadas a partir de um modelo de cardápio: os preços são de exemplo.
 * Fica visível em todas as telas até o dono tocar em "Já revisei" (lembrete guardado só neste navegador).
 */
export default function PriceReviewNotice() {
  const { store } = useAuth();
  const { pathname } = useLocation();
  const [show, setShow] = useState(() => needsPriceReview(store.id));
  if (!show) return null;

  function done() {
    dismissPriceReview(store.id);
    setShow(false);
  }

  return (
    <div role="status" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 bg-butter/30 px-4 py-2 text-center text-sm font-medium text-amber-900">
      <span>Seu cardápio veio de um <b>modelo pronto</b>: os preços são apenas exemplos. <b>Revise preços, nomes e itens</b> antes de abrir a loja.</span>
      <span className="flex items-center gap-2">
        {pathname !== '/cardapio' && <Link to="/cardapio" className="rounded-lg bg-amber-900 px-3 py-1 text-xs font-bold text-white hover:bg-amber-950">Revisar cardápio</Link>}
        <button type="button" onClick={done} className="rounded-lg px-3 py-1 text-xs font-bold text-amber-900 ring-1 ring-amber-900/30 hover:bg-amber-900/10">Já revisei</button>
      </span>
    </div>
  );
}
