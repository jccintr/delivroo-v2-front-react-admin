import jsQR from 'jsqr';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import QrModal from '../src/components/QrModal.jsx';
import { UIProvider } from '../src/context/UIContext.jsx';
import { MATERIALS, materialHtml } from '../src/lib/printables.js';
import { brandColorWorks, contrastRatio, normalizeHex, qrColors, qrMatrix, qrPngDataUrl, qrSvg, qrTarget, shortLink, storeLink } from '../src/lib/qr.js';

const LINK = 'https://lojas.delivroo.app.br/bendito-burger';
const store = { slug: 'bendito-burger', name: 'Bendito Burger', logoUrl: 'https://res.cloudinary.com/x/logo.png', bgColor: '#2B1A12', textColor: '#F7B500' };

/** lê o SVG de volta: devolve os pixels (RGBA) para um leitor de QR Code de verdade tentar decodificar */
function rasterize(svg, scale = 8) {
  const total = Number(/viewBox="0 0 (\d+) \d+"/.exec(svg)[1]);
  const path = /<path d="([^"]+)"/.exec(svg)[1];
  const dark = new Set();
  for (const m of path.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) for (let i = 0; i < Number(m[3]); i++) dark.add(`${Number(m[1]) + i},${m[2]}`);
  const px = total * scale; const data = new Uint8ClampedArray(px * px * 4).fill(255);
  for (let y = 0; y < px; y++) for (let x = 0; x < px; x++) {
    if (dark.has(`${Math.floor(x / scale)},${Math.floor(y / scale)}`)) { const o = (y * px + x) * 4; data[o] = data[o + 1] = data[o + 2] = 20; }
  }
  return { data, px };
}

describe('links', () => {
  it('monta o link da loja sem barras duplicadas e marca a origem do QR Code', () => {
    expect(storeLink('https://lojas.delivroo.app.br/', 'bendito-burger')).toBe(LINK);
    expect(qrTarget(LINK)).toBe(`${LINK}?origem=qr`);
    expect(qrTarget(`${LINK}?x=1`)).toBe(`${LINK}?x=1&origem=qr`);
    expect(shortLink(`${LINK}/`)).toBe('lojas.delivroo.app.br/bendito-burger');
  });
});

describe('cores', () => {
  it('normaliza hex e rejeita lixo', () => {
    expect(normalizeHex('#fa0')).toBe('#FFAA00');
    expect(normalizeHex('2b1a12')).toBe('#2B1A12');
    expect(normalizeHex('red')).toBeNull();
    expect(normalizeHex('"><script>')).toBeNull();
  });
  it('só aceita a cor da loja no QR se tiver contraste suficiente com o branco', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
    expect(brandColorWorks('#2B1A12')).toBe(true);
    expect(brandColorWorks('#F7B500')).toBe(false); // mostarda: a câmera não leria
    expect(qrColors('#2B1A12', true).fg).toBe('#2B1A12');
    expect(qrColors('#F7B500', true).fg).toBe('#211A12');
    expect(qrColors('#2B1A12', false).fg).toBe('#211A12');
  });
});

describe('QR Code', () => {
  it('o SVG gerado é lido por um leitor de QR Code e devolve o link com a origem', () => {
    const { data, px } = rasterize(qrSvg(qrTarget(LINK)));
    expect(jsQR(data, px, px)?.data).toBe(`${LINK}?origem=qr`);
  });
  it('continua legível com a cor da loja', () => {
    const { data, px } = rasterize(qrSvg(qrTarget(LINK), { fg: '#2B1A12' }));
    expect(jsQR(data, px, px)?.data).toBe(`${LINK}?origem=qr`);
  });
  it('o SVG tem margem (zona de silêncio) e ignora cor inválida', () => {
    const svg = qrSvg('abc', { fg: '"><script>alert(1)</script>' });
    expect(svg).not.toContain('script');
    expect(svg).toContain('fill="#211A12"');
    const n = qrMatrix('abc').size;
    expect(svg).toContain(`viewBox="0 0 ${n + 8} ${n + 8}"`);
  });
  it('PNG: data URL de imagem PNG', async () => {
    const url = await qrPngDataUrl(qrTarget(LINK));
    expect(url.startsWith('data:image/png;base64,')).toBe(true);
    expect(url.length).toBeGreaterThan(500);
  });
});

describe('materiais para imprimir', () => {
  const ctx = { store, link: LINK, target: qrTarget(LINK), colors: qrColors(store.bgColor, false) };
  it('cada material define o tamanho do papel e traz o QR Code, o nome e o link', () => {
    for (const [kind, m] of Object.entries(MATERIALS)) {
      const html = materialHtml(kind, ctx);
      expect(html).toContain(`size:${m.w}mm ${m.h}mm`);
      expect(html).toContain('<svg');
      expect(html).toContain('Bendito Burger');
    }
    expect(materialHtml('mesa', ctx)).toContain('lojas.delivroo.app.br/bendito-burger');
    expect(materialHtml('cartaz', ctx)).toContain('lojas.delivroo.app.br/bendito-burger');
  });
  it('a folha de adesivos tem 12 adesivos', () => {
    expect(materialHtml('adesivo', ctx).match(/class="dot"/g)).toHaveLength(12);
  });
  it('usa as cores e a logo da loja', () => {
    const html = materialHtml('mesa', ctx);
    expect(html).toContain('background:#2B1A12');
    expect(html).toContain('color:#F7B500');
    expect(html).toContain('src="https://res.cloudinary.com/x/logo.png"');
  });
  it('escapa o nome da loja e descarta logo/cores perigosas', () => {
    const evil = { ...store, name: '<img src=x onerror=alert(1)>', logoUrl: 'javascript:alert(1)', bgColor: 'red;}</style><script>' };
    const html = materialHtml('cartaz', { ...ctx, store: evil });
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('<script>');
  });
  it('sem logo, não imprime imagem quebrada', () => {
    expect(materialHtml('mesa', { ...ctx, store: { ...store, logoUrl: null } })).not.toContain('<img');
  });
  it('material desconhecido dá erro', () => {
    expect(() => materialHtml('banner', ctx)).toThrow();
  });
});

describe('janela do QR Code', () => {
  const render = (s = store) => renderToStaticMarkup(<UIProvider><QrModal open onClose={() => {}} store={s} link={LINK} /></UIProvider>);
  it('mostra o QR Code e as ações de download', () => {
    const html = render();
    expect(html).toContain('QR Code do cardápio');
    expect(html).toContain('data-testid="qr-preview"');
    expect(html).toContain('Baixar PNG');
    expect(html).toContain('Baixar SVG');
    expect(html).toContain('Copiar link');
  });
  it('com cor da loja clara demais, avisa e desabilita a opção', () => {
    const html = render({ ...store, bgColor: '#F7B500' });
    expect(html).toContain('clara demais');
    expect(html).toMatch(/<input[^>]*disabled/);
  });
  it('fechada, não renderiza nada', () => {
    const html = renderToStaticMarkup(<UIProvider><QrModal open={false} onClose={() => {}} store={store} link={LINK} /></UIProvider>);
    expect(html).not.toContain('QR Code do cardápio');
    expect(html).not.toContain('<svg');
  });
});
