import es from './es.js';
import en from './en.js';

const DICTS = { es, en };
let lang = 'es';

/**
 * Traduce una clave del diccionario activo.
 * @param {string} key
 * @param {Record<string, string|number>} [vars] Sustituye los huecos {nombre}.
 * @returns {string}
 */
export function t(key, vars) {
  const s = DICTS[lang][key] ?? DICTS.es[key] ?? key;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;
}

/**
 * Cambia el idioma y avisa a los componentes para que se repinten.
 * @param {'es'|'en'} next
 */
export function setLang(next) {
  if (!DICTS[next] || next === lang) return;
  lang = next;
  document.documentElement.lang = next;
  try { localStorage.setItem('dji-lang', next); } catch (_) {}
  window.dispatchEvent(new CustomEvent('i18n:changed', { detail: { lang: next } }));
}

/** @returns {'es'|'en'} El idioma activo. */
export function getLang() { return lang; }

/** Restaura el idioma guardado (o el del navegador) sin emitir evento. */
export function initLang() {
  let saved;
  try { saved = localStorage.getItem('dji-lang'); } catch (_) {}
  const nav = (navigator.language || 'es').slice(0, 2);
  lang = DICTS[saved] ? saved : (DICTS[nav] ? nav : 'es');
  document.documentElement.lang = lang;
}
