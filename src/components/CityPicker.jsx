import { useEffect, useId, useRef, useState } from 'react';
import { Locations } from '../api/index.js';
import { filterCities } from '../lib/cities.js';
import { Field, Input, Select, Spinner, cx } from './ui.jsx';

/**
 * Estado primeiro, depois a cidade (com busca por digitação). Os dados vêm do IBGE, pela nossa API.
 * value: { ibgeId, name, uf } | null    onChange(value | null)
 */
export default function CityPicker({ value, onChange }) {
  const [states, setStates] = useState([]);
  const [uf, setUf] = useState(value?.uf ?? '');
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState(value?.name ?? '');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const box = useRef(null);

  const loadStates = () => { setFailed(false); Locations.states().then(setStates).catch(() => setFailed(true)); };
  useEffect(loadStates, []);

  useEffect(() => {
    if (!uf) { setCities([]); return undefined; }
    let alive = true;
    setLoading(true); setFailed(false);
    Locations.cities(uf)
      .then((rows) => { if (alive) setCities(rows); })
      .catch(() => { if (alive) { setCities([]); setFailed(true); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [uf]);

  useEffect(() => {
    const close = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const options = filterCities(cities, query);

  function pickState(e) {
    setUf(e.target.value); setQuery(''); onChange(null);
  }
  function type(e) {
    setQuery(e.target.value); setOpen(true); setActive(0);
    if (value) onChange(null); // mexeu no texto: a escolha anterior deixa de valer
  }
  function choose(c) {
    setQuery(c.name); setOpen(false); onChange({ ibgeId: c.ibgeId, name: c.name, uf });
  }
  function key(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((i) => Math.min(i + 1, options.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && open && options[active]) { e.preventDefault(); choose(options[active]); }
    else if (e.key === 'Escape') setOpen(false);
  }

  return (
    <div className="grid gap-4 sm:grid-cols-[9rem_1fr]">
      <Field label="Estado">{(id) => (
        <Select id={id} required value={uf} onChange={pickState}>
          <option value="">UF…</option>
          {states.map((s) => <option key={s.uf} value={s.uf}>{s.uf} - {s.name}</option>)}
        </Select>
      )}</Field>
      <Field label="Cidade" error={failed ? 'Não foi possível carregar a lista agora. Tente de novo.' : undefined}>{(id) => (
        <div ref={box} className="relative">
          <Input id={id} role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list" autoComplete="off"
            disabled={!uf} required value={query} onChange={type} onFocus={() => setOpen(true)} onKeyDown={key}
            placeholder={uf ? 'Digite para buscar…' : 'Escolha o estado primeiro'} />
          {loading && <Spinner className="absolute right-3 top-3 size-5" />}
          {open && uf && !loading && (
            <ul id={listId} role="listbox" className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-line bg-white py-1 shadow-lg">
              {options.length === 0 && <li className="px-3 py-2 text-sm text-ink-soft">Nenhuma cidade encontrada</li>}
              {options.map((c, i) => (
                <li key={c.ibgeId} role="option" aria-selected={value?.ibgeId === c.ibgeId}
                  onMouseDown={(e) => { e.preventDefault(); choose(c); }} onMouseEnter={() => setActive(i)}
                  className={cx('cursor-pointer px-3 py-2 text-sm', i === active && 'bg-cream-2 font-semibold')}>{c.name}</li>
              ))}
            </ul>
          )}
          {failed && !uf && <button type="button" onClick={loadStates} className="mt-1 text-xs font-semibold text-orange">Recarregar</button>}
        </div>
      )}</Field>
    </div>
  );
}
