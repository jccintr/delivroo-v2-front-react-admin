import { cx } from './ui.jsx';

/** "3 categorias · 12 produtos" (vazio para a loja vazia) */
export const templateSummary = (t) =>
  t.products ? `${t.categories} ${t.categories === 1 ? 'categoria' : 'categorias'} · ${t.products} ${t.products === 1 ? 'produto' : 'produtos'}` : '';

/**
 * Escolha do cardápio inicial no cadastro: "Loja vazia" + modelos prontos (vêm de GET /api/stores/templates).
 * É um grupo de rádios; cada cartão é um <label>, então o clique e o teclado funcionam sem JavaScript extra.
 */
export default function TemplatePicker({ templates, value, onChange }) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1 block text-sm font-semibold text-ink">Como você quer começar?</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {templates.map((t) => {
          const selected = value === t.key;
          const summary = templateSummary(t);
          return (
            <label
              key={t.key}
              className={cx(
                'relative flex cursor-pointer flex-col gap-0.5 rounded-xl border bg-white p-3 transition focus-within:ring-2 focus-within:ring-orange/30',
                selected ? 'border-orange bg-orange-light/40' : 'border-line hover:bg-cream-2',
              )}
            >
              <input
                type="radio" name="template" value={t.key} checked={selected}
                onChange={() => onChange(t.key)} className="sr-only"
              />
              <span className="flex items-center justify-between gap-2">
                <span className="font-bold text-ink">{t.name}</span>
                <span aria-hidden="true" className={cx('flex size-4 shrink-0 items-center justify-center rounded-full border', selected ? 'border-orange bg-orange' : 'border-line')}>
                  {selected && <span className="size-1.5 rounded-full bg-white" />}
                </span>
              </span>
              <span className="text-xs leading-snug text-ink-soft">{t.description}</span>
              {summary && <span className="mt-1 text-xs font-semibold text-orange-deep">{summary}</span>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
