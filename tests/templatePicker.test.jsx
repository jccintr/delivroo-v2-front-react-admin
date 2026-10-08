import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import TemplatePicker, { templateSummary } from '../src/components/TemplatePicker.jsx';

const TEMPLATES = [
  { key: 'empty', name: 'Loja vazia', description: 'Comece do zero e monte o seu cardápio.', categories: 0, products: 0 },
  { key: 'pizzaria', name: 'Pizzaria', description: 'Pizzas Broto/Grande com até 2 sabores.', categories: 4, products: 13 },
  { key: 'acai', name: 'Açaí', description: 'Açaí no copo em 3 tamanhos.', categories: 1, products: 1 },
];

const html = (value, templates = TEMPLATES) => renderToStaticMarkup(<TemplatePicker templates={templates} value={value} onChange={() => {}} />);

describe('resumo do modelo', () => {
  it('conta categorias e produtos no singular e no plural; loja vazia não tem resumo', () => {
    expect(templateSummary(TEMPLATES[1])).toBe('4 categorias · 13 produtos');
    expect(templateSummary(TEMPLATES[2])).toBe('1 categoria · 1 produto');
    expect(templateSummary(TEMPLATES[0])).toBe('');
  });
});

describe('seletor de cardápio inicial', () => {
  it('mostra um rádio por opção, com nome, descrição e resumo', () => {
    const out = html('empty');
    expect((out.match(/type="radio"/g) ?? []).length).toBe(3);
    for (const t of TEMPLATES) {
      expect(out).toContain(t.name);
      expect(out).toContain(t.description);
    }
    expect(out).toContain('4 categorias · 13 produtos');
    expect(out).toContain('Como você quer começar?');
  });

  it('marca só a opção escolhida', () => {
    const checked = (value) => [...html(value).matchAll(/<input[^>]*>/g)].filter((m) => /checked/.test(m[0])).map((m) => /value="([^"]+)"/.exec(m[0])[1]);
    expect(checked('empty')).toEqual(['empty']);
    expect(checked('pizzaria')).toEqual(['pizzaria']);
    expect(checked('acai')).toEqual(['acai']);
  });

  it('é um grupo de rádios acessível (mesmo name, fieldset com legenda)', () => {
    const out = html('empty');
    expect(out).toContain('<fieldset');
    expect(out).toContain('<legend');
    expect((out.match(/name="template"/g) ?? []).length).toBe(3);
  });
});
