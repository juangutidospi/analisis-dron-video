// Mapa de satélite: teselas Esri World Imagery (sin clave) + track coloreado por altura
// + marcadores de despegue e hitos con miniatura. Devuelve un elemento listo para insertar.

import { tileConfig, projector } from './geo.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile';
const el = (n, a = {}) => { const e = document.createElementNS(SVGNS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };

function colorForAlt(v, relmax) {
  const t = Math.max(0, Math.min(1, (v || 0) / relmax));
  const a = [76, 149, 255], b = [255, 138, 76];
  return `rgb(${a.map((c, i) => Math.round(c + (b[i] - c) * t)).join(',')})`;
}

/**
 * Construye el mapa.
 * @param {object} model modelo del vuelo
 * @param {Array} kps keypoints (con .frame = dataURL opcional)
 * @returns {HTMLElement}
 */
export function buildMap(model, kps, loadingText = '') {
  const tc = tileConfig(model.track);
  const { PX, PY } = projector(tc);
  const W = tc.compW, H = tc.compH;
  const T = model.track.filter(p => p[0] != null);
  const relmax = Math.max(...T.map(p => p[2] || 0)) || 1;

  const wrap = document.createElement('div');
  wrap.className = 'map-wrap loading';
  wrap.style.aspectRatio = `${W} / ${H}`;
  wrap.style.setProperty('--ar', W / H); // para limitar también por altura sin deformar
  const loadingEl = document.createElement('div');
  loadingEl.className = 'map-loading'; loadingEl.textContent = loadingText;
  wrap.appendChild(loadingEl);

  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'map-svg' });
  svg.style.cssText = 'display:block;width:100%;height:auto';

  // teselas (con skeleton mientras cargan)
  let pending = 0;
  const doneOne = () => { if (--pending <= 0) wrap.classList.remove('loading'); };
  for (let ri = 0, y = tc.y0; y <= tc.y1; y++, ri++)
    for (let ci = 0, x = tc.x0; x <= tc.x1; x++, ci++) {
      const img = el('image', { x: ci * 256, y: ri * 256, width: 257, height: 257, preserveAspectRatio: 'none' });
      img.setAttribute('href', `${ESRI}/${tc.z}/${y}/${x}`);
      img.setAttribute('crossorigin', 'anonymous');
      pending++;
      img.addEventListener('load', doneOne, { once: true });
      img.addEventListener('error', doneOne, { once: true });
      svg.appendChild(img);
    }
  setTimeout(() => wrap.classList.remove('loading'), 6000); // salvavidas
  svg.appendChild(el('rect', { x: 1, y: 1, width: W - 2, height: H - 2, fill: 'none', stroke: 'rgba(255,255,255,.15)', 'stroke-width': 2 }));

  // track: halo + segmentos por color
  const full = 'M' + T.map(p => `${PX(p[1]).toFixed(1)},${PY(p[0]).toFixed(1)}`).join('L');
  svg.appendChild(el('path', { d: full, stroke: 'rgba(0,0,0,.55)', 'stroke-width': 11, fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
  for (let i = 1; i < T.length; i++)
    svg.appendChild(el('path', { d: `M${PX(T[i - 1][1]).toFixed(1)},${PY(T[i - 1][0]).toFixed(1)}L${PX(T[i][1]).toFixed(1)},${PY(T[i][0]).toFixed(1)}`, stroke: colorForAlt(T[i][2], relmax), 'stroke-width': 7, fill: 'none', 'stroke-linecap': 'round' }));

  // despegue
  const tk = model.takeoff;
  const tkC = el('circle', { cx: PX(tk[1]).toFixed(1), cy: PY(tk[0]).toFixed(1), r: 15, stroke: '#fff', 'stroke-width': 4 });
  tkC.style.fill = 'var(--c-green)'; svg.appendChild(tkC);

  // escala 100 m
  const res = 156543.03392 * Math.cos(tk[0] * Math.PI / 180) / (2 ** tc.z);
  const spx = 100 / res;
  svg.appendChild(el('path', { d: `M28,${H - 40}L${(28 + spx).toFixed(1)},${H - 40}`, stroke: '#fff', 'stroke-width': 5 }));
  svg.appendChild(el('path', { d: `M28,${H - 48}L28,${H - 32}M${(28 + spx).toFixed(1)},${H - 48}L${(28 + spx).toFixed(1)},${H - 32}`, stroke: '#fff', 'stroke-width': 5 }));
  const st = el('text', { x: 28, y: H - 52, fill: '#fff', 'font-size': 26, 'font-weight': 700 }); st.textContent = '100 m'; svg.appendChild(st);

  // marcadores de hitos
  kps.forEach(k => {
    svg.appendChild(el('circle', { cx: PX(k.lon).toFixed(1), cy: PY(k.lat).toFixed(1), r: 11, fill: '#fff', stroke: 'var(--color-accent)', 'stroke-width': 4 }));
  });

  wrap.appendChild(svg);

  // overlay HTML de marcadores (tooltip con miniatura)
  const ov = document.createElement('div'); ov.className = 'kp-overlay';
  kps.forEach(k => {
    const xp = PX(k.lon) / W * 100, yp = PY(k.lat) / H * 100;
    const btn = document.createElement('button');
    btn.className = 'kp-btn'; btn.style.left = xp + '%'; btn.style.top = yp + '%';
    btn.setAttribute('aria-label', k.label);
    const edge = xp > 66 ? ' left' : (xp < 34 ? ' right' : '');
    btn.innerHTML = `<span class="kp-tip${edge}">${k.frame ? `<img src="${k.frame}" alt="">` : ''}<span class="kp-b"><span class="kp-l">${k.label}</span><span class="kp-m">${mmss(k.t)} · ${k.metric}</span></span></span>`;
    ov.appendChild(btn);
  });
  // marcador del dron para la reproducción: el glifo del dron sobre un badge,
  // que interpola su posición sobre el track según el tiempo.
  const SC = 0.72;
  const droneMk = el('g', { opacity: 0 });
  const disc = el('circle', { r: 18 });
  disc.style.fill = 'var(--c-blue)'; disc.style.stroke = '#fff'; disc.style.strokeWidth = '2.5';
  disc.style.filter = 'drop-shadow(0 2px 6px rgba(0,0,0,.55))';
  droneMk.appendChild(disc);
  const glyph = el('g', { transform: `scale(${SC}) translate(-24 -24)` });
  glyph.appendChild(el('path', { d: 'M24 24 11 11M24 24 37 11M24 24 11 37M24 24 37 37', fill: 'none', stroke: '#fff', 'stroke-width': 3.2, 'stroke-linecap': 'round' }));
  for (const [cx, cy] of [[11, 11], [37, 11], [11, 37], [37, 37]]) glyph.appendChild(el('circle', { cx, cy, r: 7, fill: 'rgba(255,255,255,.18)', stroke: '#fff', 'stroke-width': 2.6 }));
  glyph.appendChild(el('rect', { x: 19, y: 19, width: 10, height: 10, rx: 3.4, fill: '#fff' }));
  droneMk.appendChild(glyph);
  svg.appendChild(droneMk);

  const S = model.series;
  const setPlayhead = (t) => {
    let i = 1;
    while (i < S.length && S[i].t < t) i++;
    const a = S[i - 1], b = S[Math.min(i, S.length - 1)];
    if (!a || !a.lat || !b.lat) return;
    const span = (b.t - a.t) || 1;
    const f = Math.max(0, Math.min(1, (t - a.t) / span));
    const lat = a.lat + (b.lat - a.lat) * f, lon = a.lon + (b.lon - a.lon) * f;
    droneMk.setAttribute('transform', `translate(${PX(lon).toFixed(1)} ${PY(lat).toFixed(1)})`);
    droneMk.setAttribute('opacity', '1');
  };
  const clearPlayhead = () => droneMk.setAttribute('opacity', '0');

  wrap.appendChild(ov);
  return { el: wrap, setPlayhead, clearPlayhead };
}

const mmss = (t) => { t = Math.round(t); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
