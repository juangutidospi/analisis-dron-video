import es from '../js/i18n/es.js';
import en from '../js/i18n/en.js';

/**
 * Paridad de diccionarios es/en.
 * @returns {Array<{name: string, ok: boolean, detail: string}>}
 */
export function run() {
  const out = [];
  const esKeys = Object.keys(es), enKeys = Object.keys(en);

  const missingEn = esKeys.filter((k) => !(k in en));
  out.push({ name: 'toda clave de es.js existe en en.js', ok: !missingEn.length, detail: missingEn.join(', ') });

  const missingEs = enKeys.filter((k) => !(k in es));
  out.push({ name: 'toda clave de en.js existe en es.js', ok: !missingEs.length, detail: missingEs.join(', ') });

  const empty = esKeys.filter((k) => !String(es[k]).trim() || !String(en[k] ?? '').trim());
  out.push({ name: 'ninguna traducción vacía', ok: !empty.length, detail: empty.join(', ') });

  // los huecos {var} deben coincidir entre idiomas
  const holes = (s) => (String(s).match(/\{(\w+)\}/g) || []).sort().join(',');
  const mismatch = esKeys.filter((k) => (k in en) && holes(es[k]) !== holes(en[k]));
  out.push({ name: 'los huecos {var} coinciden en ambos idiomas', ok: !mismatch.length, detail: mismatch.join(', ') });

  return out;
}
