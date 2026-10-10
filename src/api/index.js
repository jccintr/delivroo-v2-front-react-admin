import { request, uploadFile, apiUrl, download } from './client.js';

/** URL do fluxo SSE da loja (token curto na query; EventSource não envia headers) */
export const storeEventsUrl = async () => `${apiUrl('/api/stores/events')}?token=${encodeURIComponent((await Store.eventsToken()).token)}`;

const j = (method) => (path, body) => request(path, { method, body });
const post = j('POST'); const patch = j('PATCH'); const put = j('PUT'); const del = j('DELETE');

export const Auth = {
  login: (email, password) => request('/api/stores/login', { method: 'POST', body: { email, password }, auth: false }),
  register: (data) => request('/api/stores/register', { method: 'POST', body: data, auth: false }),
  cities: () => request('/api/cities', { auth: false }),
  /** cardápios iniciais do cadastro: "Loja vazia" + modelos prontos */
  templates: () => request('/api/stores/templates', { auth: false }),
};

/** estados e municípios (vêm do IBGE, via nossa API) */
export const Locations = {
  states: () => request('/api/locations/states', { auth: false }),
  cities: (uf) => request(`/api/locations/states/${uf}/cities`, { auth: false }),
};

export const Store = {
  eventsToken: () => request('/api/stores/events-token', { method: 'POST' }),
  me: () => request('/api/stores/me'),
  update: (data) => patch('/api/stores/me', data),
  setOpen: (isOpen) => patch('/api/stores/me/status', { isOpen }),
  uploadLogo: (file) => uploadFile('/api/stores/me/logo', 'logo', file),
  removeLogo: () => del('/api/stores/me/logo'),
  hours: () => request('/api/stores/me/business-hours'),
  saveHours: (hours) => put('/api/stores/me/business-hours', { hours }),
  messages: () => request('/api/stores/message-templates'),
  saveMessage: (status, body) => put(`/api/stores/message-templates/${status}`, { body }),
  resetMessage: (status) => del(`/api/stores/message-templates/${status}`),
};

const crud = (base) => ({
  list: () => request(base),
  create: (data) => post(base, data),
  update: (id, data) => patch(`${base}/${id}`, data),
  remove: (id) => del(`${base}/${id}`),
});
export const Zones = crud('/api/stores/delivery-zones');
export const Payments = crud('/api/stores/payment-methods');
export const Categories = crud('/api/stores/categories');

export const Products = {
  list: () => request('/api/stores/products'),
  get: (id) => request(`/api/stores/products/${id}`),
  create: (data) => post('/api/stores/products', data),
  update: (id, data) => patch(`/api/stores/products/${id}`, data),
  remove: (id) => del(`/api/stores/products/${id}`),
  addVariant: (id, data) => post(`/api/stores/products/${id}/variants`, data),
  updateVariant: (id, variantId, data) => patch(`/api/stores/products/${id}/variants/${variantId}`, data),
  removeVariant: (id, variantId) => del(`/api/stores/products/${id}/variants/${variantId}`),
  setGroups: (id, groupIds) => put(`/api/stores/products/${id}/option-groups`, { groupIds }),
  uploadImage: (id, file) => uploadFile(`/api/stores/products/${id}/image`, 'image', file),
  removeImage: (id) => del(`/api/stores/products/${id}/image`),
};

export const Groups = {
  list: () => request('/api/stores/option-groups'),
  get: (id) => request(`/api/stores/option-groups/${id}`),
  create: (data) => post('/api/stores/option-groups', data),
  update: (id, data) => patch(`/api/stores/option-groups/${id}`, data),
  remove: (id) => del(`/api/stores/option-groups/${id}`),
  addOption: (groupId, data) => post(`/api/stores/option-groups/${groupId}/options`, data),
  updateOption: (id, data) => patch(`/api/stores/options/${id}`, data),
  removeOption: (id) => del(`/api/stores/options/${id}`),
  uploadOptionImage: (id, file) => uploadFile(`/api/stores/options/${id}/image`, 'image', file),
  removeOptionImage: (id) => del(`/api/stores/options/${id}/image`),
};

export const Orders = {
  list: (query, signal) => request('/api/stores/orders', { query, signal }),
  get: (id) => request(`/api/stores/orders/${id}`),
  setStatus: (id, status, reason) => post(`/api/stores/orders/${id}/status`, { status, ...(reason ? { reason } : {}) }),
};

export const Reports = {
  summary: (from, to) => request('/api/stores/reports/summary', { query: { from: from.toISOString(), to: to.toISOString() } }),
};

export const Subscription = {
  get: () => request('/api/stores/subscription'),
  choosePlan: (planId) => put('/api/stores/subscription/plan', { planId }),
  reportPayment: (invoiceId, note) => post(`/api/stores/subscription/invoices/${invoiceId}/report-payment`, note ? { note } : {}),
  exportData: (slug) => download('/api/stores/me/export', `delivroo-${slug}.json`),
};
