import { brandColorWorks, INK, normalizeHex, qrSvg, shortLink } from './qr.js';

/**
 * Materiais para imprimir com o QR Code da loja. Cada um é um documento HTML completo
 * (com @page no tamanho do papel), impresso por um iframe — o "Salvar como PDF" do navegador gera o PDF.
 */
export const MATERIALS = {
  mesa: { label: 'Display de mesa', hint: 'A6 (105×148 mm). Imprima em papel couchê ou dobre num suporte de acrílico.', w: 105, h: 148 },
  adesivo: { label: 'Adesivos', hint: 'Folha A4 com 12 adesivos redondos de 60 mm. Use papel adesivo e recorte.', w: 210, h: 297 },
  cartaz: { label: 'Cartaz', hint: 'A4 (210×297 mm). Para o balcão, a porta ou a vitrine.', w: 210, h: 297 },
};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const safeUrl = (u) => (/^https?:\/\//i.test(u ?? '') ? esc(u) : '');

const FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800&family=Inter:wght@500;600;700&display=swap" rel="stylesheet">';

const baseCss = (w, h) => `
@page{size:${w}mm ${h}mm;margin:0}
*{box-sizing:border-box;margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
html,body{width:${w}mm;background:#fff;font-family:Inter,system-ui,sans-serif;color:#211A12}
.display{font-family:"Baloo 2",Inter,system-ui,sans-serif;font-weight:800}
.qr svg{display:block;width:100%;height:100%}
.logo{border-radius:50%;object-fit:cover;background:#fff}
`;

const doc = (title, w, h, css, body) => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(title)}</title>${FONTS}<style>${baseCss(w, h)}${css}</style></head><body>${body}</body></html>`;

function brand(store) {
  const bg = normalizeHex(store.bgColor) ?? '#FF5A1F';
  const fg = normalizeHex(store.textColor) ?? '#FFFFFF';
  return { bg, fg };
}

/** cor de destaque para texto sobre fundo branco: a da loja só se for escura o bastante para ler */
const accent = (bg) => (brandColorWorks(bg) ? bg : INK);

const logoTag = (store, mm) => {
  const src = safeUrl(store.logoUrl);
  return src ? `<img class="logo" src="${src}" alt="" style="width:${mm}mm;height:${mm}mm">` : '';
};

function mesa({ store, target, link, colors }) {
  const { w, h } = MATERIALS.mesa; const { bg, fg } = brand(store);
  const css = `
.page{width:${w}mm;height:${h}mm;display:flex;flex-direction:column;overflow:hidden}
.head{background:${bg};color:${fg};height:34mm;display:flex;align-items:center;justify-content:center;gap:4mm;padding:0 6mm;text-align:center}
.head .name{font-size:19pt;line-height:1.05}
.body{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3mm;padding:4mm 6mm}
.kicker{font-size:8pt;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:${accent(bg)}}
h1{font-size:17pt;line-height:1.05;text-align:center}
.qr{width:62mm;height:62mm;border:.6mm solid #211A12;border-radius:4mm;padding:1mm;overflow:hidden}
.link{font-size:8.5pt;font-weight:700;text-align:center;word-break:break-all}
.foot{font-size:6.5pt;text-align:center;color:#6B5D4F;padding:0 0 4mm}`;
  return doc(`Display de mesa - ${store.name}`, w, h, css, `
<div class="page">
  <div class="head">${logoTag(store, 20)}<div class="name display">${esc(store.name)}</div></div>
  <div class="body">
    <div class="kicker">Peça pelo celular</div>
    <h1 class="display">Aponte a câmera<br>e faça seu pedido</h1>
    <div class="qr">${qrSvg(target, colors)}</div>
    <div class="link">${esc(shortLink(link))}</div>
  </div>
  <div class="foot">Cardápio digital Delivroo</div>
</div>`);
}

function adesivo({ store, target, colors }) {
  const { w, h } = MATERIALS.adesivo; const { bg, fg } = brand(store);
  const css = `
.sheet{width:${w}mm;height:${h}mm;padding:12mm 10mm;display:grid;grid-template-columns:repeat(3,60mm);grid-auto-rows:60mm;gap:4mm;justify-content:center;align-content:start}
.dot{width:60mm;height:60mm;border-radius:50%;background:${bg};color:${fg};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2mm;outline:.2mm dashed #B8AEA3;outline-offset:.6mm}
.dot .qr{width:36mm;height:36mm;background:#fff;border-radius:3mm;padding:.8mm;overflow:hidden}
.dot .t{font-size:7pt;font-weight:700;letter-spacing:.04em;text-align:center;line-height:1.1}`;
  const one = `<div class="dot"><div class="qr">${qrSvg(target, colors)}</div><div class="t">Peça pelo celular</div></div>`;
  return doc(`Adesivos - ${store.name}`, w, h, css, `<div class="sheet">${one.repeat(12)}</div>`);
}

function cartaz({ store, target, link, colors }) {
  const { w, h } = MATERIALS.cartaz; const { bg, fg } = brand(store);
  const css = `
.page{width:${w}mm;height:${h}mm;display:flex;flex-direction:column;overflow:hidden}
.head{background:${bg};color:${fg};height:62mm;display:flex;align-items:center;justify-content:center;gap:8mm;padding:0 14mm}
.head .name{font-size:38pt;line-height:1}
.body{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6mm;padding:6mm 14mm}
h1{font-size:34pt;line-height:1.02;text-align:center}
.qr{width:112mm;height:112mm;border:1.2mm solid #211A12;border-radius:8mm;padding:2mm;overflow:hidden}
.steps{display:flex;gap:6mm;font-size:11pt;font-weight:600;text-align:center}
.steps div{width:52mm}
.steps b{display:block;font-size:20pt;line-height:1;color:${accent(bg)}}
.link{font-size:15pt;font-weight:700}
.foot{font-size:8pt;text-align:center;color:#6B5D4F;padding:0 0 7mm}`;
  return doc(`Cartaz - ${store.name}`, w, h, css, `
<div class="page">
  <div class="head">${logoTag(store, 34)}<div class="name display">${esc(store.name)}</div></div>
  <div class="body">
    <h1 class="display">Peça pelo celular,<br>sem baixar nada</h1>
    <div class="qr">${qrSvg(target, colors)}</div>
    <div class="steps"><div><b>1</b>Abra a câmera do celular</div><div><b>2</b>Aponte para o QR Code</div><div><b>3</b>Escolha e faça seu pedido</div></div>
    <div class="link">${esc(shortLink(link))}</div>
  </div>
  <div class="foot">Cardápio digital Delivroo</div>
</div>`);
}

const BUILDERS = { mesa, adesivo, cartaz };

/** HTML completo do material (`kind`: mesa | adesivo | cartaz) */
export function materialHtml(kind, { store, link, target, colors }) {
  const build = BUILDERS[kind];
  if (!build) throw new Error(`Material desconhecido: ${kind}`);
  return build({ store, link, target, colors });
}

/** imprime um documento HTML num iframe invisível (aguarda fontes e imagens antes) */
export function printHtml(html) {
  return new Promise((resolve) => {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    let done = false;
    const cleanup = () => { if (done) return; done = true; frame.remove(); resolve(); };
    frame.onload = async () => {
      const win = frame.contentWindow;
      try {
        await Promise.race([frame.contentDocument?.fonts?.ready, new Promise((r) => setTimeout(r, 1500))]);
        win.onafterprint = cleanup;
        win.focus(); win.print();
      } catch { cleanup(); return; }
      setTimeout(cleanup, 60000);
    };
    frame.srcdoc = html;
    document.body.appendChild(frame);
  });
}
