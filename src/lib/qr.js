import QRCode from 'qrcode';

/**
 * QR Code do cardápio.
 *
 * - O QR Code aponta para o link da loja + `?origem=qr`. O QR impresso não pode ser trocado depois,
 *   então a origem já vai no link: assim dá para contar os pedidos que vêm dele no futuro.
 * - Correção de erro "Q" (~25%): aguenta sujeira/amassado no impresso, sem deixar o código denso demais.
 * - Cores: sempre escuro sobre fundo branco. Cor muito clara não é lida pela câmera.
 */
export const QR_SOURCE = 'qr';
export const INK = '#211A12';
export const PAPER = '#FFFFFF';
const ECL = 'Q';
const QUIET_ZONE = 4; // módulos de margem em branco exigidos pela norma

export const storeLink = (base, slug) => `${String(base).replace(/\/$/, '')}/${slug}`;

/** o que vai dentro do QR Code */
export const qrTarget = (link) => `${link}${link.includes('?') ? '&' : '?'}origem=${QR_SOURCE}`;

/** link sem o "https://" — para mostrar impresso abaixo do QR Code */
export const shortLink = (link) => link.replace(/^https?:\/\//, '').replace(/\/$/, '');

/** "#RGB" | "#RRGGBB" -> "#RRGGBB" maiúsculo, ou null se não for uma cor válida */
export function normalizeHex(value) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(value ?? '').trim());
  if (!m) return null;
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
  return `#${h.toUpperCase()}`;
}

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; })
    .reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
}

/** razão de contraste WCAG entre duas cores (1 a 21) */
export function contrastRatio(a, b) {
  const A = normalizeHex(a); const B = normalizeHex(b);
  if (!A || !B) return 1;
  const [hi, lo] = [luminance(A), luminance(B)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** a cor da loja serve para o QR Code? (precisa ser escura o bastante sobre o branco) */
export const brandColorWorks = (hex) => contrastRatio(hex, PAPER) >= 4.5;

/** cores do QR Code: a da loja (se for legível) ou o tom escuro padrão */
export function qrColors(brandHex, useBrand) {
  const brand = normalizeHex(brandHex);
  return { fg: useBrand && brand && brandColorWorks(brand) ? brand : INK, bg: PAPER };
}

/** matriz de módulos (true = escuro) — usada para desenhar o SVG */
export function qrMatrix(text) {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: ECL });
  const n = modules.size;
  return { size: n, get: (r, c) => !!modules.get(r, c) };
}

/**
 * QR Code em SVG (vetor — serve para a gráfica imprimir em qualquer tamanho).
 * Os módulos de cada linha são unidos num só retângulo para o arquivo ficar pequeno.
 */
export function qrSvg(text, { fg = INK, bg = PAPER, margin = QUIET_ZONE } = {}) {
  const color = normalizeHex(fg) ?? INK;
  const paper = normalizeHex(bg) ?? PAPER;
  const { size, get } = qrMatrix(text);
  const total = size + margin * 2;
  let d = '';
  for (let r = 0; r < size; r++) {
    let c = 0;
    while (c < size) {
      if (!get(r, c)) { c++; continue; }
      const start = c;
      while (c < size && get(r, c)) c++;
      d += `M${start + margin} ${r + margin}h${c - start}v1h-${c - start}z`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" role="img" aria-label="QR Code do cardápio"><rect width="${total}" height="${total}" fill="${paper}"/><path d="${d}" fill="${color}"/></svg>`;
}

/** QR Code em PNG (data URL) com cerca de 1000 px de lado, sem borrar as bordas */
export function qrPngDataUrl(text, { fg = INK, bg = PAPER, target = 1000 } = {}) {
  const { size } = qrMatrix(text);
  const scale = Math.max(1, Math.floor(target / (size + QUIET_ZONE * 2)));
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: ECL, margin: QUIET_ZONE, scale,
    color: { dark: normalizeHex(fg) ?? INK, light: normalizeHex(bg) ?? PAPER },
  });
}

/** baixa um arquivo (data URL ou texto) pelo navegador */
export function downloadFile(filename, { href, text, type = 'image/svg+xml' }) {
  const url = href ?? URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  if (!href) setTimeout(() => URL.revokeObjectURL(url), 1000);
}
