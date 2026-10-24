import { describe, expect, it } from 'vitest';
import { qrSvg } from '../src/lib/qr.js';

describe('QR do Pix da assinatura', () => {
  it('um copia e cola de fatura gera um SVG de QR utilizável como imagem', () => {
    const payload = '00020126330014br.gov.bcb.pix0111112223330001815204000053039865406099.005802BR5913DELIVROO LTDA6009SAO PAULO62070503***63041D3D';
    const svg = qrSvg(payload);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(() => decodeURIComponent(encodeURIComponent(svg))).not.toThrow();
  });
});
