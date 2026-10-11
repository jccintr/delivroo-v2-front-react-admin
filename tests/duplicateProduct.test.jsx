import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Products } from '../src/api/index.js';
import { UIProvider } from '../src/context/UIContext.jsx';
import ProductsTab from '../src/pages/menu/ProductsTab.jsx';

afterEach(() => vi.unstubAllGlobals());

const categories = [{ id: 1, name: 'Hambúrgueres', position: 1, active: true }];
const variant = (id, priceCents) => ({ id, name: 'Único', description: null, priceCents, position: 0, active: true });
const products = [
  { id: 10, categoryId: 1, name: 'X-Bacon', description: null, imageUrl: null, position: 0, active: true, variants: [variant(100, 2800)], optionGroupIds: [] },
  { id: 11, categoryId: 1, name: 'X-Salada', description: null, imageUrl: null, position: 1, active: false, variants: [variant(101, 2500)], optionGroupIds: [] },
];

const render = (props = {}) => renderToStaticMarkup(
  <UIProvider><ProductsTab categories={categories} products={products} groups={[]} reload={async () => {}} goto={() => {}} {...props} /></UIProvider>,
);

describe('API do painel', () => {
  it('Products.duplicate faz POST em /products/:id/duplicate, sem corpo, e devolve o clone', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({ id: 12, name: 'X-Bacon (cópia)', active: false }) });
    vi.stubGlobal('fetch', fetchMock);
    const copy = await Products.duplicate(10);
    expect(copy).toMatchObject({ id: 12, name: 'X-Bacon (cópia)', active: false });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/stores/products/10/duplicate');
    expect(init.method).toBe('POST');
    expect(init.body).toBeUndefined();
  });
});

describe('lista de produtos', () => {
  it('mostra um botão "Duplicar" por produto (também os indisponíveis)', () => {
    const html = render();
    expect((html.match(/aria-label="Duplicar"/g) ?? []).length).toBe(2);
    expect(html).toContain('X-Bacon');
    expect(html).toContain('X-Salada');
  });
});
