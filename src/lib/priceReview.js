// Aviso "revise os preços": uma loja criada a partir de um modelo de cardápio nasce com preços de exemplo.
// O lembrete fica só neste navegador (localStorage), por loja, até o dono marcar como revisado.
const key = (storeId) => `delivroo:admin:price-review:${storeId}`;

export const markPriceReview = (storeId) => {
  try { localStorage.setItem(key(storeId), '1'); } catch { /* ignora */ }
};

export const needsPriceReview = (storeId) => {
  try { return localStorage.getItem(key(storeId)) === '1'; } catch { return false; }
};

export const dismissPriceReview = (storeId) => {
  try { localStorage.removeItem(key(storeId)); } catch { /* ignora */ }
};
