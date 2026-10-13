import { useMemo, useState } from 'react';
import { useUI } from '../context/UIContext.jsx';
import { MATERIALS, materialHtml, printHtml } from '../lib/printables.js';
import { brandColorWorks, downloadFile, normalizeHex, qrColors, qrPngDataUrl, qrSvg, qrTarget } from '../lib/qr.js';
import Icon from './Icon.jsx';
import { Button, Modal, Tabs, cx } from './ui.jsx';

const PX_PER_MM = 3.7795;
const PREVIEW_W = 300; // largura máxima da prévia, em px

/** prévia do material: o próprio documento de impressão, reduzido */
function Preview({ html, kind }) {
  const { w, h } = MATERIALS[kind];
  const pw = w * PX_PER_MM; const ph = h * PX_PER_MM;
  const scale = Math.min(1, PREVIEW_W / pw);
  return (
    <div className="mx-auto overflow-hidden rounded-xl border border-line bg-white shadow-sm" style={{ width: pw * scale, height: ph * scale }}>
      <iframe title={`Prévia: ${MATERIALS[kind].label}`} srcDoc={html} tabIndex={-1} className="pointer-events-none origin-top-left border-0" style={{ width: pw, height: ph, transform: `scale(${scale})` }} />
    </div>
  );
}

export default function QrModal({ open, onClose, store, link }) {
  const { success, error } = useUI();
  const [tab, setTab] = useState('qr');
  const [kind, setKind] = useState('mesa');
  const [useBrand, setUseBrand] = useState(false);
  const [busy, setBusy] = useState(false);

  const brand = normalizeHex(store.bgColor);
  const canBrand = !!brand && brandColorWorks(brand);
  const colors = qrColors(store.bgColor, useBrand && canBrand);
  const target = qrTarget(link);
  const svg = useMemo(() => qrSvg(target, colors), [target, colors.fg, colors.bg]); // eslint-disable-line react-hooks/exhaustive-deps
  const html = useMemo(() => (open && tab === 'print' ? materialHtml(kind, { store, link, target, colors }) : ''), [open, tab, kind, store, link, target, colors.fg, colors.bg]); // eslint-disable-line react-hooks/exhaustive-deps

  async function downloadPng() {
    setBusy(true);
    try { downloadFile(`qrcode-${store.slug}.png`, { href: await qrPngDataUrl(target, colors) }); success('QR Code baixado (PNG).'); }
    catch { error('Não foi possível gerar o PNG. Tente o SVG.'); } finally { setBusy(false); }
  }
  const downloadSvg = () => { downloadFile(`qrcode-${store.slug}.svg`, { text: svg }); success('QR Code baixado (SVG).'); };

  async function copyLink() {
    try { await navigator.clipboard.writeText(link); success('Link copiado!'); } catch { error('Não foi possível copiar o link.'); }
  }

  async function print() {
    setBusy(true);
    try { await printHtml(html); } catch { error('Não foi possível abrir a impressão.'); } finally { setBusy(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="QR Code do cardápio" wide>
      <div className="space-y-4">
        <Tabs value={tab} onChange={setTab} tabs={[{ key: 'qr', label: 'QR Code' }, { key: 'print', label: 'Para imprimir' }]} />

        {tab === 'qr' && (
          <div className="grid gap-5 sm:grid-cols-[14rem_minmax(0,1fr)] sm:items-start">
            <div className="mx-auto w-56 overflow-hidden rounded-2xl border border-line bg-white p-1 shadow-sm" data-testid="qr-preview" dangerouslySetInnerHTML={{ __html: svg }} />
            <div className="space-y-4">
              <p className="text-sm text-ink-soft">O cliente aponta a câmera do celular e abre o seu cardápio na hora, sem baixar nada. Cole nas mesas, no balcão, nas embalagens e na vitrine.</p>
              <label className={cx('flex items-start gap-3 rounded-xl border border-line bg-white p-3 text-sm', !canBrand && 'opacity-60')}>
                <input type="checkbox" className="mt-0.5 size-4 accent-orange" checked={useBrand && canBrand} disabled={!canBrand} onChange={(e) => setUseBrand(e.target.checked)} />
                <span>
                  <b>Usar a cor da loja no QR Code</b>
                  <span className="block text-xs text-ink-soft">{canBrand ? 'Fica mais bonito e continua legível.' : 'A cor principal da sua loja é clara demais: a câmera não leria. Usamos um tom escuro.'}</span>
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                <Button loading={busy} onClick={downloadPng}><Icon name="download" className="size-4" /> Baixar PNG</Button>
                <Button kind="secondary" onClick={downloadSvg}><Icon name="download" className="size-4" /> Baixar SVG</Button>
                <Button kind="secondary" onClick={copyLink}><Icon name="copy" className="size-4" /> Copiar link</Button>
              </div>
              <p className="text-xs text-ink-soft">PNG para redes sociais e WhatsApp. SVG é vetor: use na gráfica, em qualquer tamanho, sem perder qualidade.</p>
              <ul className="space-y-1 rounded-xl bg-cream-2 p-3 text-xs text-ink-soft">
                <li>• Imprima com pelo menos <b className="text-ink">3 cm</b> de lado.</li>
                <li>• Deixe uma margem em branco em volta e não coloque nada por cima.</li>
                <li>• Teste com a câmera de dois celulares antes de imprimir em quantidade.</li>
              </ul>
            </div>
          </div>
        )}

        {tab === 'print' && (
          <div className="space-y-4">
            <Tabs value={kind} onChange={setKind} tabs={Object.entries(MATERIALS).map(([key, m]) => ({ key, label: m.label }))} />
            <Preview html={html} kind={kind} />
            <p className="text-center text-sm text-ink-soft">{MATERIALS[kind].hint}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button size="lg" loading={busy} onClick={print}><Icon name="print" className="size-5" /> Imprimir</Button>
            </div>
            <p className="text-center text-xs text-ink-soft">Na janela de impressão, escolha <b>Salvar como PDF</b> para levar o arquivo à gráfica. Desative “Cabeçalhos e rodapés” e deixe as margens em “Nenhuma”.</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
