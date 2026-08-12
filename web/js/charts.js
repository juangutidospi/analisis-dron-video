// Gráficas de series temporales en SVG, con crosshair/tooltip por puntero y animación de trazo.
// Evolución del svg_timechart de report.py: mismos ejes y escalado, interacción nativa.

const SVGNS = 'http://www.w3.org/2000/svg';
const el = (n, attrs = {}) => { const e = document.createElementNS(SVGNS, n); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };

/**
 * Dibuja una gráfica temporal dentro de `host`.
 * @param {HTMLElement} host contenedor (position:relative)
 * @param {Array} series muestras con {t, ...}
 * @param {number} dur duración total en s
 * @param {Array} cfgs [{k, color, area?, min?, fmt, label, unit, dec}]
 */
export function timeChart(host, series, dur, cfgs) {
  const W = 900, H = 300, L = 44, R = cfgs.length > 1 ? 46 : 16, Tp = 14, B = 26;
  const X = (t) => L + (t / dur) * (W - L - R);
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none', class: 'chart' });
  svg.style.cssText = 'display:block;width:100%;height:auto;overflow:visible';

  // rejilla vertical (minutos)
  for (let s = 0; s <= dur; s += 60) {
    const x = X(s);
    svg.appendChild(el('path', { d: `M${x.toFixed(1)},${Tp} L${x.toFixed(1)},${H - B}`, class: 'grid' }));
    const tx = el('text', { x: x.toFixed(1), y: H - 9, class: 'axlbl', 'text-anchor': 'middle' });
    tx.textContent = `${Math.floor(s / 60)}:00`; svg.appendChild(tx);
  }

  const scales = [];
  cfgs.forEach((cf, ci) => {
    const vals = series.map(q => q[cf.k]).filter(v => v != null);
    let vmin = cf.min != null ? cf.min : Math.min(...vals);
    let vmax = Math.max(...vals);
    if (vmin === vmax) vmax = vmin + 1;
    const pad = (vmax - vmin) * 0.10; vmin -= pad; vmax += pad;
    const Y = (v) => H - B - ((v - vmin) / (vmax - vmin)) * (H - B - Tp);
    scales.push({ Y, cf });

    const axX = ci === 0 ? L : W - R, anch = ci === 0 ? 'end' : 'start', ox = ci === 0 ? -7 : 7;
    for (let g = 0; g < 5; g++) {
      const v = vmin + (vmax - vmin) * g / 4, y = Y(v);
      if (ci === 0) svg.appendChild(el('path', { d: `M${L},${y.toFixed(1)} L${W - R},${y.toFixed(1)}`, class: g === 0 ? 'grid grid-0' : 'grid' }));
      const tx = el('text', { x: axX + ox, y: (y + 3).toFixed(1), class: 'axlbl', 'text-anchor': anch });
      tx.style.fill = `var(${cf.color})`; tx.textContent = cf.fmt(v); svg.appendChild(tx);
    }

    // camino
    let dp = '', pen = false;
    for (const q of series) { const v = q[cf.k]; if (v == null) { pen = false; continue; } dp += (pen ? 'L' : 'M') + `${X(q.t).toFixed(1)},${Y(v).toFixed(1)}`; pen = true; }
    if (cf.area) {
      const fv = series.find(q => q[cf.k] != null), lv = [...series].reverse().find(q => q[cf.k] != null);
      const grad = `grad-${cf.k}`;
      const defs = el('defs'); const lg = el('linearGradient', { id: grad, x1: 0, y1: 0, x2: 0, y2: 1 });
      lg.appendChild(el('stop', { offset: '0%', 'stop-color': `var(${cf.color})`, 'stop-opacity': .28 }));
      lg.appendChild(el('stop', { offset: '100%', 'stop-color': `var(${cf.color})`, 'stop-opacity': .02 }));
      defs.appendChild(lg); svg.appendChild(defs);
      svg.appendChild(el('path', { d: `${dp}L${X(lv.t).toFixed(1)},${H - B}L${X(fv.t).toFixed(1)},${H - B}Z`, fill: `url(#${grad})`, stroke: 'none' }));
    }
    const line = el('path', { d: dp, class: 'series-line', fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
    line.style.stroke = `var(${cf.color})`;
    svg.appendChild(line);
    // animación de trazo
    requestAnimationFrame(() => {
      const len = line.getTotalLength ? line.getTotalLength() : 0;
      if (len) { line.style.strokeDasharray = len; line.style.strokeDashoffset = len; line.getBoundingClientRect(); line.style.transition = 'stroke-dashoffset 1.1s cubic-bezier(.22,1,.36,1)'; line.style.strokeDashoffset = '0'; }
    });
  });

  // crosshair + puntos
  const cross = el('path', { d: `M0,${Tp} L0,${H - B}`, class: 'crosshair' }); cross.style.opacity = '0'; svg.appendChild(cross);
  const dots = cfgs.map(cf => { const c = el('circle', { r: 4, class: 'cdot' }); c.style.fill = `var(${cf.color})`; c.style.opacity = '0'; svg.appendChild(c); return c; });
  host.appendChild(svg);

  const tip = document.createElement('div'); tip.className = 'chart-tip'; host.appendChild(tip);

  const move = (clientX) => {
    const rect = svg.getBoundingClientRect();
    const t = Math.max(0, Math.min(dur, ((clientX - rect.left) / rect.width * W - L) / (W - L - R) * dur));
    const s = series.reduce((a, b) => Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a);
    const x = X(s.t);
    cross.setAttribute('d', `M${x},${Tp} L${x},${H - B}`); cross.style.opacity = '1';
    let html = `<b>${mmssLocal(s.t)}</b>`;
    scales.forEach(({ Y, cf }, i) => {
      const v = s[cf.k];
      if (v == null) { dots[i].style.opacity = '0'; return; }
      dots[i].setAttribute('cx', x); dots[i].setAttribute('cy', Y(v)); dots[i].style.opacity = '1';
      html += `<br><i style="background:var(${cf.color})"></i>${cf.label}: ${v.toFixed(cf.dec)}${cf.unit ? ' ' + cf.unit : ''}`;
    });
    tip.innerHTML = html;
    const px = (x / W) * rect.width;
    tip.style.left = px + 'px';
    tip.classList.toggle('flip', px > rect.width * 0.62);
    tip.style.opacity = '1';
  };
  const leave = () => { cross.style.opacity = '0'; dots.forEach(d => d.style.opacity = '0'); tip.style.opacity = '0'; };
  svg.addEventListener('pointermove', e => move(e.clientX));
  svg.addEventListener('pointerdown', e => move(e.clientX));
  svg.addEventListener('pointerleave', leave);
  svg.style.touchAction = 'pan-y';
}

const mmssLocal = (t) => { t = Math.round(t); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
