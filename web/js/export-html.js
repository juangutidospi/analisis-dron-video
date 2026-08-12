// Genera un informe HTML autónomo a partir del <flight-report> ya renderizado.
// Serializa el árbol (incluidos los Shadow DOM, como declarative shadow DOM) e
// incrusta los estilos adoptados y los tokens, para un único archivo abrible offline
// (las teselas de satélite se cargan online). Se omiten los nodos con data-noexport.

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

function cssTextOf(sheet) {
  try { return Array.from(sheet.cssRules).map((r) => r.cssText).join('\n'); } catch (_) { return ''; }
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function serialize(node) {
  if (node.nodeType === Node.TEXT_NODE) return esc(node.nodeValue);
  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  const el = node;
  if (el.nodeType === Node.ELEMENT_NODE && el.hasAttribute && el.hasAttribute('data-noexport')) return '';
  const tag = el.tagName.toLowerCase();
  let attrs = '';
  for (const a of el.attributes) attrs += ` ${a.name}="${escAttr(a.value)}"`;
  if (VOID.has(tag)) return `<${tag}${attrs}>`;
  if (tag === 'style' || tag === 'script') return `<${tag}${attrs}>${el.textContent}</${tag}>`;
  let inner = '';
  if (el.shadowRoot) {
    const css = el.shadowRoot.adoptedStyleSheets.map(cssTextOf).join('\n');
    let sh = '';
    for (const c of el.shadowRoot.childNodes) sh += serialize(c);
    inner += `<template shadowrootmode="open">${css ? `<style>${css}</style>` : ''}${sh}</template>`;
  }
  for (const c of el.childNodes) inner += serialize(c);
  return `<${tag}${attrs}>${inner}</${tag}>`;
}

/**
 * @param {HTMLElement} reportEl  el <flight-report> renderizado
 * @param {{title?:string, theme?:string}} [opts]
 * @returns {string} documento HTML completo y autónomo
 */
export function buildStandaloneHtml(reportEl, opts = {}) {
  const title = opts.title || 'Vuelo';
  const theme = opts.theme || '';
  let tokens = '';
  for (const s of document.styleSheets) {
    if (s.href && s.href.includes('tokens.css')) tokens = cssTextOf(s);
  }
  const chrome = 'body{margin:0;background:var(--color-bg);color:var(--color-text);font-family:var(--font-body,system-ui)}'
    + '*{box-sizing:border-box}img{max-width:100%}';
  const body = serialize(reportEl);
  return `<!doctype html>
<html lang="es"${theme ? ` data-theme="${theme}"` : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>${tokens}\n${chrome}</style>
</head>
<body>${body}</body>
</html>`;
}
