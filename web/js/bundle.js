/* Generado por build.py — NO editar a mano. Fuente: js/*.js */
(function(){
'use strict';
var __REG = {};
__REG['srt'] = (function(){
// Parser de telemetría DJI: convierte el texto de un .SRT en un modelo de vuelo.
// Puerto fiel de src/extract.py — mismos cálculos, mismos filtros de glitch (25 m/s).

const R_EARTH = 6371000;
const GLITCH = 25.0; // m/s

/** Distancia haversine en metros entre dos coordenadas. */
function hav(a, b, c, e) {
  const p1 = a * Math.PI / 180, p2 = c * Math.PI / 180;
  const dp = (c - a) * Math.PI / 180, dl = (e - b) * Math.PI / 180;
  const x = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.sqrt(x));
}

/** Inclinación (pitch) de la cámara en grados desde el cuaternión pp_current (orden w,x,y,z). */
function gimbalPitch(body) {
  const mm = body.match(/pp_current:\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)/);
  if (!mm) return null;
  const w = +mm[1], x = +mm[2], y = +mm[3], z = +mm[4];
  const s = Math.max(-1, Math.min(1, 2 * (x * z - y * w)));
  return Math.round(Math.asin(s) * 180 / Math.PI * 100) / 100;
}

function parseTs(s) {
  // "2026-08-06 21:25:32.749" -> Date (local, sirve para diferencias)
  const m = s.match(/(\d{4})-(\d\d)-(\d\d) (\d\d):(\d\d):(\d\d)\.(\d+)/);
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6], +m[7].slice(0, 3));
}

const num = (body, k) => {
  const mm = body.match(new RegExp(k + ': ?([-\\d.]+)'));
  return mm ? parseFloat(mm[1]) : null;
};

/**
 * Analiza el texto completo de un .SRT DJI.
 * @returns {object} modelo de vuelo (meta, ranges, series, track, keypoints…)
 */
function parseSRT(txt) {
  const re = /FrameCnt: (\d+),[^\n]*\n(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d\.\d+)\n(.*)/g;
  const rows = [];
  let m;
  while ((m = re.exec(txt)) !== null) {
    const body = m[3];
    const sh = body.match(/shutter: 1\/([\d.]+)/);
    const cm = body.match(/color_md: ?([^\],]+)/);
    const eis = body.match(/eis:\s*([^\],]+)/);
    rows.push({
      cnt: +m[1], ts: m[2],
      lat: num(body, 'latitude'), lon: num(body, 'longitude'),
      rel: num(body, 'rel_alt'), ab: num(body, 'abs_alt'),
      iso: num(body, 'iso'), ct: num(body, 'ct'), ev: num(body, 'ev'), fnum: num(body, 'fnum'),
      shutter: sh ? sh[1].slice(0, -2) : null,
      color_md: cm ? cm[1].trim() : '',
      pitch: gimbalPitch(body),
      eis: eis ? eis[1].trim() : null,
    });
  }
  if (rows.length < 2) throw new Error('El .SRT no contiene telemetría reconocible.');

  const t0 = parseTs(rows[0].ts);
  for (const r of rows) r.t = (parseTs(r.ts) - t0) / 1000;
  const dur = rows[rows.length - 1].t;

  // muestreo a ~0.5 s
  const step = dur > 0 ? Math.max(1, Math.round(rows.length / dur * 0.5)) : 1;
  const samp = rows.filter((_, i) => i % step === 0);

  for (let i = 0; i < samp.length; i++) {
    const r = samp[i];
    if (i === 0) { r.hs = 0; r.vs = 0; continue; }
    const p = samp[i - 1], dt = r.t - p.t;
    if (r.lat && p.lat && dt > 0) {
      const sp = hav(p.lat, p.lon, r.lat, r.lon) / dt;
      r.hs = sp <= GLITCH ? sp : null;
    } else r.hs = null;
    r.vs = (r.rel != null && p.rel != null && dt > 0)
      ? Math.round((r.rel - p.rel) / dt * 100) / 100 : null;
  }

  const hspeeds = samp.map(r => r.hs).filter(v => v != null);
  const vspeeds = samp.map(r => r.vs).filter(v => v != null);

  let dist = 0;
  for (let i = 1; i < samp.length; i++) {
    const a = samp[i - 1], b = samp[i];
    if (a.lat && b.lat) {
      const dd = hav(a.lat, a.lon, b.lat, b.lon), dt = b.t - a.t;
      if (dt > 0 && dd / dt <= GLITCH) dist += dd;
    }
  }

  let glitches = 0, gmax = 0, prev = null;
  for (const r of rows) {
    if (r.lat && r.lon) {
      if (prev) {
        const dt = r.t - prev[2];
        if (dt > 0) { const sp = hav(prev[0], prev[1], r.lat, r.lon) / dt; if (sp > GLITCH) { glitches++; gmax = Math.max(gmax, sp); } }
      }
      prev = [r.lat, r.lon, r.t];
    }
  }

  const valid = rows.filter(r => r.lat);
  const lat0 = rows[0].lat, lon0 = rows[0].lon;
  const maxfar = Math.max(...valid.map(r => hav(lat0, lon0, r.lat, r.lon)));

  const rng = (k, src = valid) => {
    const v = src.map(r => r[k]).filter(x => x != null);
    return v.length ? [Math.min(...v), Math.max(...v)] : [null, null];
  };
  const uniq = (arr) => [...new Set(arr.filter(x => x != null && x !== ''))];

  const isos = uniq(rows.map(r => r.iso)).sort((a, b) => a - b);
  const shs = uniq(rows.map(r => r.shutter)).sort((a, b) => +a - +b);

  const meta = {
    fname: 'vuelo.SRT', frames: rows.length,
    fps: dur ? Math.round((rows.length - 1) / dur) : 0, dur,
    start: rows[0].ts, end: rows[rows.length - 1].ts,
  };

  const model = {
    meta,
    ranges: {
      rel: rng('rel'), ab: rng('ab'), ct: rng('ct'), pitch: rng('pitch', rows),
      lat: rng('lat'), lon: rng('lon'),
      hspeed: [hspeeds.length ? Math.min(...hspeeds) : 0, hspeeds.length ? Math.max(...hspeeds) : 0],
      hspeed_avg: hspeeds.length ? hspeeds.reduce((a, b) => a + b, 0) / hspeeds.length : 0,
      vspeed: [vspeeds.length ? Math.min(...vspeeds) : 0, vspeeds.length ? Math.max(...vspeeds) : 0],
    },
    dist: Math.round(dist), maxfar: Math.round(maxfar),
    takeoff: [lat0, lon0], land: [rows[rows.length - 1].lat, rows[rows.length - 1].lon],
    center: [valid.reduce((s, r) => s + r.lat, 0) / valid.length, valid.reduce((s, r) => s + r.lon, 0) / valid.length],
    cam: {
      iso: isos, shutter: shs,
      fnum: uniq(rows.map(r => r.fnum)).sort((a, b) => a - b),
      ev: uniq(rows.map(r => r.ev)).sort((a, b) => a - b),
      eis: uniq(rows.map(r => r.eis)).sort(),
    },
    glitches, glitch_max: Math.round(gmax * 10) / 10,
    series: samp.map(r => ({
      t: Math.round(r.t * 100) / 100, rel: r.rel, ab: r.ab,
      hs: r.hs != null ? Math.round(r.hs * 1000) / 1000 : null,
      vs: r.vs, lat: r.lat, lon: r.lon, iso: r.iso, ct: r.ct, pitch: r.pitch,
    })),
    track: rows.filter((_, i) => i % 10 === 0).filter(r => r.lat).map(r => [
      Math.round(r.lat * 1e6) / 1e6, Math.round(r.lon * 1e6) / 1e6, r.rel,
    ]),
  };
  return model;
}

return {hav, parseSRT};
})();
__REG['geo'] = (function(){
// Proyección Web Mercator, configuración de teselas y puntos clave del vuelo.
// Puerto de src/common.py (keypoints) y src/satellite.py (cálculo de teselas).
const {hav} = __REG['srt'];
const mmss = (t) => { t = Math.round(t); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
const kmh = (x) => x.hs != null ? x.hs * 3.6 : null;

/** Calcula los 8 hitos del vuelo (mismo orden y criterios que common.py). */
function keypoints(d) {
  const S = d.series, tk = d.takeoff;
  for (const x of S) x.far = hav(tk[0], tk[1], x.lat, x.lon);
  const by = (fn) => S.reduce((a, b) => fn(b) > fn(a) ? b : a);
  const alto = by(x => x.rel);
  const lejano = by(x => x.far);
  const rapido = S.filter(x => x.hs != null).reduce((a, b) => b.hs > a.hs ? b : a);
  const umbral = Math.min(100, 0.8 * Math.max(...S.map(x => x.rel)));
  let desc_start = alto;
  for (let i = S.length - 1; i > 0; i--) { if (S[i].rel > umbral) { desc_start = S[i]; break; } }
  const dive = S.reduce((a, b) => (b.vs ?? 9) < (a.vs ?? 9) ? b : a);
  const luz = by(x => x.iso);
  const f0 = (v) => `${Math.round(v)}`;
  const kp = [
    ['up', 'Despegue', S[0], `${f0(S[0].rel)} m`, 'Altura al iniciar'],
    ['light', 'Menos luz', luz, `ISO ${f0(luz.iso)}`, 'Máxima sensibilidad'],
    ['far', 'Punto más lejano', lejano, `${f0(lejano.far)} m`, 'Del despegue'],
    ['hi', 'Punto más alto', alto, `${f0(alto.rel)} m`, 'Sobre el despegue'],
    ['topdesc', 'Inicio del descenso', desc_start, `${f0(desc_start.rel)} m`, 'Empieza a bajar'],
    ['fast', 'Velocidad máxima', rapido, `${f0(kmh(rapido))} km/h`, 'Horizontal'],
    ['dive', 'Descenso más rápido', dive, `${(Math.abs(dive.vs)).toFixed(1)} m/s`, 'Bajada máxima'],
    ['down', 'Aterrizaje', S[S.length - 1], `${f0(S[S.length - 1].rel)} m`, 'Al tocar suelo'],
  ];
  return kp.map(([key, label, x, metric, sub]) => ({ key, label, x, metric, sub, t: x.t, lat: x.lat, lon: x.lon }));
}

/** Determina zoom y rango de teselas que cubren el track (≤30 teselas), como satellite.py. */
function tileConfig(track) {
  const T = track.filter(p => p[0] != null);
  const lats = T.map(p => p[0]), lons = T.map(p => p[1]);
  let la0 = Math.min(...lats), la1 = Math.max(...lats);
  let lo0 = Math.min(...lons), lo1 = Math.max(...lons);
  const dla = (la1 - la0) * 0.18 || 1e-4, dlo = (lo1 - lo0) * 0.18 || 1e-4;
  la0 -= dla; la1 += dla; lo0 -= dlo; lo1 += dlo;
  const tilesAt = (z) => {
    const n = 2 ** z;
    const xt = (lon) => (lon + 180) / 360 * n;
    const yt = (lat) => { const r = lat * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n; };
    const x0 = Math.floor(xt(lo0)), x1 = Math.floor(xt(lo1));
    const y0 = Math.floor(yt(la1)), y1 = Math.floor(yt(la0));
    return { x0, x1, y0, y1, count: (x1 - x0 + 1) * (y1 - y0 + 1) };
  };
  let z = 17;
  for (let zz = 20; zz >= 14; zz--) { if (tilesAt(zz).count <= 30) { z = zz; break; } }
  const { x0, x1, y0, y1 } = tilesAt(z);
  const cols = x1 - x0 + 1, rows = y1 - y0 + 1;
  return { z, x0, x1, y0, y1, cols, rows, originX: x0 * 256, originY: y0 * 256, compW: cols * 256, compH: rows * 256 };
}

/** Proyecta lon/lat a píxel dentro del lienzo de teselas. */
function projector(tc) {
  const n = 2 ** tc.z;
  const PX = (lon) => (lon + 180) / 360 * n * 256 - tc.originX;
  const PY = (lat) => { const r = lat * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n * 256 - tc.originY; };
  return { PX, PY };
}

return {keypoints, tileConfig, projector, mmss};
})();
__REG['charts'] = (function(){
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
function timeChart(host, series, dur, cfgs) {
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

return {timeChart};
})();
__REG['satmap'] = (function(){
// Mapa de satélite: teselas Esri World Imagery (sin clave) + track coloreado por altura
// + marcadores de despegue e hitos con miniatura. Devuelve un elemento listo para insertar.
const {tileConfig, projector} = __REG['geo'];
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
function buildMap(model, kps) {
  const tc = tileConfig(model.track);
  const { PX, PY } = projector(tc);
  const W = tc.compW, H = tc.compH;
  const T = model.track.filter(p => p[0] != null);
  const relmax = Math.max(...T.map(p => p[2] || 0)) || 1;

  const wrap = document.createElement('div');
  wrap.className = 'map-wrap loading';
  wrap.style.aspectRatio = `${W} / ${H}`;

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
  tkC.style.fill = 'var(--green)'; svg.appendChild(tkC);

  // escala 100 m
  const res = 156543.03392 * Math.cos(tk[0] * Math.PI / 180) / (2 ** tc.z);
  const spx = 100 / res;
  svg.appendChild(el('path', { d: `M28,${H - 40}L${(28 + spx).toFixed(1)},${H - 40}`, stroke: '#fff', 'stroke-width': 5 }));
  svg.appendChild(el('path', { d: `M28,${H - 48}L28,${H - 32}M${(28 + spx).toFixed(1)},${H - 48}L${(28 + spx).toFixed(1)},${H - 32}`, stroke: '#fff', 'stroke-width': 5 }));
  const st = el('text', { x: 28, y: H - 52, fill: '#fff', 'font-size': 26, 'font-weight': 700 }); st.textContent = '100 m'; svg.appendChild(st);

  // marcadores de hitos
  kps.forEach(k => {
    svg.appendChild(el('circle', { cx: PX(k.lon).toFixed(1), cy: PY(k.lat).toFixed(1), r: 11, fill: '#fff', stroke: 'var(--accent)', 'stroke-width': 4 }));
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
  wrap.appendChild(ov);
  return wrap;
}

const mmss = (t) => { t = Math.round(t); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };

return {buildMap};
})();
__REG['exports'] = (function(){
// Exportaciones del vuelo: GPX, KML y CSV, generadas en el navegador desde el modelo.

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function toGPX(model, name = 'Vuelo DJI') {
  const pts = model.track.filter(p => p[0] != null)
    .map(p => `<trkpt lat="${p[0]}" lon="${p[1]}"><ele>${p[2] ?? 0}</ele></trkpt>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Análisis de vuelos DJI" xmlns="http://www.topografix.com/GPX/1/1">
<trk><name>${esc(name)}</name><trkseg>${pts}</trkseg></trk></gpx>`;
}

function toKML(model, name = 'Vuelo DJI') {
  const coords = model.track.filter(p => p[0] != null).map(p => `${p[1]},${p[0]},${p[2] ?? 0}`).join(' ');
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${esc(name)}</name>
<Placemark><name>${esc(name)}</name><LineString><altitudeMode>relativeToGround</altitudeMode>
<coordinates>${coords}</coordinates></LineString></Placemark></Document></kml>`;
}

function toCSV(model) {
  const head = 't_s,lat,lon,rel_alt_m,abs_alt_m,hspeed_kmh,vspeed_ms,iso,ct_k,pitch_deg';
  const rows = model.series.map(s => [
    s.t, s.lat, s.lon, s.rel, s.ab,
    s.hs != null ? (s.hs * 3.6).toFixed(2) : '', s.vs ?? '', s.iso ?? '', s.ct ?? '', s.pitch ?? '',
  ].join(','));
  return [head, ...rows].join('\n');
}

/** Dispara la descarga de un texto como archivo. */
function download(filename, text, type = 'text/plain') {
  downloadBlob(filename, new Blob([text], { type }));
}

/** Dispara la descarga de un Blob como archivo. */
function downloadBlob(filename, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

return {toGPX, toKML, toCSV, download, downloadBlob};
})();
__REG['zip'] = (function(){
// Escritor ZIP mínimo (método STORE, sin compresión) para construir el .kmz en el navegador.
// Google Earth acepta KMZ sin comprimir. Sin dependencias externas.

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

const enc = new TextEncoder();
const toBytes = (data) => typeof data === 'string' ? enc.encode(data) : new Uint8Array(data);

/**
 * Crea un Blob ZIP a partir de una lista de archivos.
 * @param {{name:string, data:(string|Uint8Array|ArrayBuffer)}[]} files
 * @returns {Blob}
 */
function makeZip(files) {
  const chunks = [];       // trozos del stream (local headers + datos)
  const central = [];      // entradas del directorio central
  let offset = 0;
  const u16 = (n) => new Uint8Array([n & 0xFF, (n >>> 8) & 0xFF]);
  const u32 = (n) => new Uint8Array([n & 0xFF, (n >>> 8) & 0xFF, (n >>> 16) & 0xFF, (n >>> 24) & 0xFF]);
  const push = (arr) => { chunks.push(arr); offset += arr.length; };

  for (const f of files) {
    const nameB = enc.encode(f.name);
    const dataB = toBytes(f.data);
    const crc = crc32(dataB);
    const localOffset = offset;

    // cabecera local
    const lh = concat([
      u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(dataB.length), u32(dataB.length),
      u16(nameB.length), u16(0), nameB,
    ]);
    push(lh); push(dataB);

    // entrada del directorio central
    central.push(concat([
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(dataB.length), u32(dataB.length),
      u16(nameB.length), u16(0), u16(0), u16(0), u16(0), u32(0),
      u32(localOffset), nameB,
    ]));
  }

  const centralStart = offset;
  let centralSize = 0;
  for (const c of central) { chunks.push(c); centralSize += c.length; offset += c.length; }

  chunks.push(concat([
    u32(0x06054b50), u16(0), u16(0), u16(central.length), u16(central.length),
    u32(centralSize), u32(centralStart), u16(0),
  ]));

  return new Blob(chunks, { type: 'application/vnd.google-earth.kmz' });
}

function concat(arrs) {
  let len = 0;
  for (const a of arrs) len += a.length;
  const out = new Uint8Array(len);
  let o = 0;
  for (const a of arrs) { out.set(a, o); o += a.length; }
  return out;
}

/** Convierte un dataURL (base64) en bytes. */
function dataUrlToBytes(dataUrl) {
  const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

return {makeZip, dataUrlToBytes};
})();
__REG['kmz'] = (function(){
// Genera el .kmz avanzado en el navegador: track animado en 3D (barra de tiempo),
// muros de altitud, puntos clave con globos ricos y fotogramas, marcas de minuto.
// Iconos y sparkline se dibujan en canvas → KMZ autónomo, sin assets externos.
// Puerto de src/kmz.py.
const {hav} = __REG['srt'];
const {keypoints} = __REG['geo'];
const {makeZip, dataUrlToBytes} = __REG['zip'];
const ACCENT = { green: '#37cf6b', blue: '#3a8bf0', orange: '#f47a3f', violet: '#9a5cf0',
  indigo: '#6e70e6', amber: '#dd8636', navy: '#3a4668', red: '#ee5555', track: '#3a8bf0' };
const HB = { green: '#3ad24f', blue: '#6db0ff', orange: '#ff8c52', violet: '#b07bff',
  indigo: '#9092ff', amber: '#f0a24e', navy: '#9fb0d8', red: '#ff6b6b', track: '#6db0ff' };
const PANEL = '#20232b', PTILE = '#2b2f39', TXT = '#f6f7f9', MUT = '#a4aab5', FOOT = '#8a909b', LBL = '#b2b8c3', BARTRACK = '#3a3f4a';
const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];

const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, '0')}`;
const kmh = (r) => r.hs != null ? r.hs * 3.6 : null;
const nf = (n) => Math.round(n).toLocaleString('es-ES');
const pct = (v, ref) => Math.max(4, Math.min(100, Math.round(v / ref * 100)));

function bearing(a, b, c, e) {
  const y = Math.sin((e - b) * Math.PI / 180) * Math.cos(c * Math.PI / 180);
  const x = Math.cos(a * Math.PI / 180) * Math.sin(c * Math.PI / 180) -
    Math.sin(a * Math.PI / 180) * Math.cos(c * Math.PI / 180) * Math.cos((e - b) * Math.PI / 180);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}
const cdir = (h) => DIRS[Math.round(h / 45) % 8];

function kmlcol(hex) { const h = hex.replace('#', ''); return 'ff' + h.slice(4, 6) + h.slice(2, 4) + h.slice(0, 2); }
function mix(h1, h2, t) {
  const a = h1.replace('#', ''), b = h2.replace('#', '');
  const c1 = [0, 2, 4].map(i => parseInt(a.slice(i, i + 2), 16)), c2 = [0, 2, 4].map(i => parseInt(b.slice(i, i + 2), 16));
  return '#' + c1.map((v, i) => Math.round(v + (c2[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

// ---- iconos generados en canvas ----
function discIcon(hex) {
  const c = document.createElement('canvas'); c.width = c.height = 48; const g = c.getContext('2d');
  g.beginPath(); g.arc(24, 24, 15, 0, 7); g.fillStyle = hex; g.fill();
  g.lineWidth = 4; g.strokeStyle = '#fff'; g.stroke();
  g.beginPath(); g.arc(24, 24, 5, 0, 7); g.fillStyle = 'rgba(255,255,255,.9)'; g.fill();
  return dataUrlToBytes(c.toDataURL('image/png'));
}
function droneIcon() {
  const c = document.createElement('canvas'); c.width = c.height = 56; const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 56, 56); grd.addColorStop(0, '#5b9dff'); grd.addColorStop(1, '#a98bff');
  g.fillStyle = grd; roundRect(g, 4, 4, 48, 48, 13); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = 3; g.lineCap = 'round';
  const C = 28, A = 12;
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([dx, dy]) => {
    g.beginPath(); g.moveTo(C, C); g.lineTo(C + dx * A, C + dy * A); g.stroke();
    g.beginPath(); g.arc(C + dx * A, C + dy * A, 6, 0, 7); g.stroke();
  });
  g.fillStyle = '#fff'; roundRect(g, C - 6, C - 6, 12, 12, 3); g.fill();
  return dataUrlToBytes(c.toDataURL('image/png'));
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

function sparkIcon(model) {
  const W = 656, H = 184, P = 6; // 2x para nitidez
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const S = model.series, dur = model.meta.dur;
  const vmax = Math.max(...S.map(s => s.rel)) || 1;
  const X = (t) => P + (t / dur) * (W - 2 * P), Y = (v) => H - P - (v / vmax) * (H - 2 * P);
  g.beginPath(); S.forEach((s, i) => { const x = X(s.t), y = Y(s.rel); i ? g.lineTo(x, y) : g.moveTo(x, y); });
  g.lineTo(X(S[S.length - 1].t), H - P); g.lineTo(X(S[0].t), H - P); g.closePath();
  const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, 'rgba(91,157,255,.5)'); grd.addColorStop(1, 'rgba(91,157,255,.05)');
  g.fillStyle = grd; g.fill();
  g.beginPath(); S.forEach((s, i) => { const x = X(s.t), y = Y(s.rel); i ? g.lineTo(x, y) : g.moveTo(x, y); });
  g.strokeStyle = '#6db0ff'; g.lineWidth = 4; g.lineJoin = 'round'; g.stroke();
  return dataUrlToBytes(c.toDataURL('image/png'));
}

// ---- balloons ----
const vv = (r) => r.vs == null ? '&mdash;' : `${r.vs >= 0 ? '&#8593;' : '&#8595;'} ${Math.abs(r.vs).toFixed(1)} m/s`;
const vel = (r) => { const s = kmh(r); return s == null ? '&mdash;' : `${Math.round(s)} km/h`; };
const rumbo = (r) => r.hd == null ? '&mdash;' : `${Math.round(r.hd)}&deg; ${cdir(r.hd)}`;

function tile(l, v) {
  return `<td style="padding:9px 12px;background:${PTILE};border-radius:10px;width:50%;vertical-align:top">`
    + `<div style="font-size:9px;letter-spacing:.6px;color:${MUT};text-transform:uppercase;line-height:1.25">${l}</div>`
    + `<div style="font-size:14px;font-weight:700;color:${TXT};margin-top:5px;line-height:1.15">${v}</div></td>`;
}
function grid(pairs) {
  const cells = pairs.map(([l, v]) => tile(l, v)); let rows = '';
  for (let i = 0; i < cells.length; i += 2) {
    const a = cells[i], b = cells[i + 1] || '<td style="width:50%"></td>';
    rows += `<tr>${a}<td style="width:12px"></td>${b}</tr><tr><td colspan="3" style="height:12px;font-size:0;line-height:0">&nbsp;</td></tr>`;
  }
  return `<table style="width:100%;border-collapse:separate;border-spacing:0">${rows}</table>`;
}
function tilesFor(r, skip) {
  const all = [['mom', 'Momento', `<b>${mmss(r.t)}</b>`], ['alt', 'Altura', `${Math.round(r.rel)} m`],
    ['altsl', 'Altitud', `${Math.round(r.ab)} m`], ['vel', 'Velocidad', vel(r)],
    ['vvert', 'Vel. vertical', vv(r)], ['rumbo', 'Rumbo', rumbo(r)], ['temp', 'Temp. color', `${Math.round(r.ct)} K`]];
  return all.filter(([k]) => k !== skip).slice(0, 6).map(([, l, v]) => [l, v]);
}
function card(accent, title, subtitle, hero, barPct, tiles, r, frameKey, hasFrame) {
  const hb = HB[accent], a2 = ACCENT[accent];
  const [hv, hu, hl] = hero;
  const photo = hasFrame ? `<img src="files/frm_${frameKey}.jpg" width="336" height="189" style="display:block;width:100%;height:auto;border-radius:9px;margin-bottom:12px">` : '';
  return `<![CDATA[<div style="width:360px;color:${TXT};font-family:-apple-system,system-ui,Segoe UI,Roboto,sans-serif">`
    + `<table style="width:100%;border-collapse:collapse"><tr><td style="padding:8px 0 13px;vertical-align:middle">`
    + `<div style="color:#fff;font-size:16px;font-weight:800;line-height:1.2">${title}</div>`
    + `<div style="color:rgba(255,255,255,.9);font-size:11px;margin-top:3px">${subtitle}</div></td></tr></table>`
    + `<div style="background:${PANEL};border-radius:14px;padding:12px">${photo}`
    + `<div style="display:flex;align-items:baseline;gap:7px">`
    + `<span style="font-size:34px;font-weight:800;line-height:1;color:${hb};letter-spacing:-1px">${hv}</span>`
    + `<span style="font-size:14px;font-weight:600;color:${MUT}">${hu}</span></div>`
    + `<div style="font-size:10px;text-transform:uppercase;letter-spacing:.6px;color:${LBL};margin:5px 0 12px">${hl}</div>`
    + `<div style="height:6px;background:${BARTRACK};border-radius:4px;overflow:hidden;margin-bottom:14px">`
    + `<div style="height:6px;width:${barPct}%;background:linear-gradient(90deg,${hb},${a2});border-radius:4px"></div></div>`
    + `${grid(tiles)}<div style="margin-top:13px;font-size:11px;color:${FOOT}">&#128205; ${r.lat.toFixed(6)}, ${r.lon.toFixed(6)}</div>`
    + `</div></div>]]>`;
}

// configuración por punto clave: key -> {accent, hero, bar, skip}
function heroFor(key, r) {
  switch (key) {
    case 'up': return ['green', [`${Math.round(r.rel)}`, 'm', 'Altura al iniciar la grabación'], pct(r.rel, 120), 'alt'];
    case 'hi': return ['blue', [`${Math.round(r.rel)}`, 'm', 'Altura máxima sobre el despegue'], 100, 'alt'];
    case 'far': return ['orange', [`${Math.round(r.far)}`, 'm', 'Distancia al punto de despegue'], 100, 'altsl'];
    case 'fast': return ['violet', [`${Math.round(kmh(r))}`, 'km/h', 'Velocidad horizontal máxima'], 100, 'vel'];
    case 'topdesc': return ['indigo', [`${Math.round(r.rel)}`, 'm', 'Empieza a bajar para aterrizar'], pct(r.rel, 120), 'alt'];
    case 'dive': return ['amber', [`${Math.abs(r.vs).toFixed(1)}`, 'm/s', 'Bajada más rápida (aterrizaje)'], 100, 'vvert'];
    case 'light': return ['navy', [`${Math.round(r.iso)}`, 'ISO', 'Máxima sensibilidad (menos luz)'], 100, 'temp'];
    case 'down': return ['red', [`${Math.round(r.rel)}`, 'm', 'Altura al tocar suelo'], pct(r.rel, 120), 'alt'];
    default: return ['track', [`${Math.round(r.rel)}`, 'm', 'Altura sobre el despegue'], pct(r.rel, 120), 'alt'];
  }
}

/**
 * Construye el KMZ avanzado.
 * @returns {{blob:Blob, filename:string}}
 */
function buildKMZ(model, assets = {}) {
  const S = model.series, tk = model.takeoff, m = model.meta;
  const kps = assets.kps || keypoints(model);
  const start = new Date(m.start.replace(' ', 'T'));
  const utc = (sec) => new Date(start.getTime() + sec * 1000).toISOString().slice(0, 19) + 'Z';

  // rumbo por muestra
  for (let i = 0; i < S.length; i++) {
    S[i].hd = (i > 0 && S[i - 1].lat && S[i].lat) ? Math.round(bearing(S[i - 1].lat, S[i - 1].lon, S[i].lat, S[i].lon)) : null;
    if (S[i].far == null) S[i].far = hav(tk[0], tk[1], S[i].lat, S[i].lon);
  }
  S[0].hd = S[1] ? S[1].hd : 0;

  const lats = S.map(s => s.lat), lons = S.map(s => s.lon);
  const clat = (Math.min(...lats) + Math.max(...lats)) / 2, clon = (Math.min(...lons) + Math.max(...lons)) / 2;
  const relmax = Math.max(...S.map(s => s.rel));
  const rapido = S.filter(s => s.hs != null).reduce((a, b) => b.hs > a.hs ? b : a);
  const maxfar = Math.max(...S.map(s => s.far));

  // estilos
  const bstyle = (accent) => `<BalloonStyle><bgColor>${kmlcol(mix(mix(ACCENT[accent], '#000000', .35), '#2a2d35', .55))}</bgColor><text><![CDATA[$[description]]]></text></BalloonStyle>`;
  const usedAccents = ['green', 'blue', 'orange', 'violet', 'indigo', 'amber', 'navy', 'red', 'track'];
  const pinStyle = (key, accent, scale = 1.15, label = false) =>
    ` <Style id="${key}"><IconStyle><scale>${scale}</scale><Icon><href>files/pin_${accent}.png</href></Icon></IconStyle>`
    + (label ? '<LabelStyle><scale>0.8</scale></LabelStyle>' : '') + bstyle(accent) + `</Style>\n`;

  let styles = ` <Style id="track"><LineStyle><color>ff2878eb</color><width>4</width></LineStyle>${bstyle('track')}</Style>\n`
    + ` <Style id="wall"><LineStyle><color>882878eb</color><width>2</width></LineStyle><PolyStyle><color>1c2878eb</color></PolyStyle>${bstyle('track')}</Style>\n`
    + ` <Style id="drone"><IconStyle><scale>1.5</scale><Icon><href>files/drone.png</href></Icon></IconStyle><LineStyle><color>ff2878eb</color><width>4</width></LineStyle><LabelStyle><scale>0.9</scale></LabelStyle>${bstyle('track')}</Style>\n`;
  const keyToAccent = { up: 'green', hi: 'blue', far: 'orange', fast: 'violet', topdesc: 'indigo', dive: 'amber', light: 'navy', down: 'red' };
  for (const k of kps) styles += pinStyle('pin_' + k.key, keyToAccent[k.key] || 'track');
  styles += pinStyle('pin_min', 'track', 0.7, true);

  // placemarks de puntos clave
  let keypointsXml = '';
  for (const k of kps) {
    const r = k.x, accent = keyToAccent[k.key] || 'track';
    const [ac, hero, bar, skip] = heroFor(k.key, r);
    const sub = `Minuto ${mmss(r.t)} &middot; ${Math.round(r.ab)} m msnm`;
    const balloon = card(ac, k.label, sub, hero, bar, tilesFor(r, skip), r, k.key, assets.hasFrames && !!k.frame);
    keypointsXml += `  <Placemark><name>${esc(k.label)}</name><styleUrl>#pin_${k.key}</styleUrl>\n`
      + `   <description>${balloon}</description>\n`
      + `   <Point><altitudeMode>absolute</altitudeMode><coordinates>${r.lon},${r.lat},${r.ab.toFixed(1)}</coordinates></Point></Placemark>\n`;
  }

  // marcas de minuto
  let minutesXml = '';
  for (const target of [60, 120, 180, 240, 300]) {
    if (target > m.dur) break;
    const r = S.reduce((a, b) => Math.abs(b.t - target) < Math.abs(a.t - target) ? b : a);
    const nm = `${target / 60}:00`;
    const balloon = card('track', `Minuto ${nm}`, `Posición &middot; ${Math.round(r.ab)} m msnm`, [`${Math.round(r.rel)}`, 'm', 'Altura sobre el despegue'], pct(r.rel, 120), tilesFor(r, 'alt'), r, null, false);
    minutesXml += `  <Placemark><name>${nm}</name><styleUrl>#pin_min</styleUrl>\n`
      + `   <description>${balloon}</description>\n`
      + `   <Point><altitudeMode>absolute</altitudeMode><coordinates>${r.lon},${r.lat},${r.ab.toFixed(1)}</coordinates></Point></Placemark>\n`;
  }

  // globo del track (con sparkline)
  const _dur = mmss(m.dur);
  const trackDesc = `<![CDATA[<div style="width:360px;color:${TXT};font-family:-apple-system,system-ui,sans-serif">`
    + `<table style="width:100%;border-collapse:collapse"><tr><td style="width:38px;padding:8px 0 13px;vertical-align:middle">`
    + `<img src="files/drone.png" width="36" height="36" style="display:block"></td>`
    + `<td style="padding:8px 0 13px 12px;vertical-align:middle"><div style="color:#fff;font-size:16px;font-weight:800">${esc(assets.title || 'Vuelo DJI')}</div>`
    + `<div style="color:rgba(255,255,255,.9);font-size:11px;margin-top:3px">${m.start.slice(0, 10)} &middot; ${_dur} min</div></td></tr></table>`
    + `<div style="background:${PANEL};border-radius:14px;padding:12px">`
    + grid([['Altura máxima', `${Math.round(relmax)} m`], ['Alejamiento', `${nf(maxfar)} m`], ['Recorrido', `${nf(model.dist)} m`], ['Vel. máxima', `${Math.round(kmh(rapido))} km/h`], ['Duración', _dur], ['Fotogramas', nf(m.frames)]])
    + `<div style="margin-top:13px;font-size:9px;letter-spacing:.5px;color:${MUT};text-transform:uppercase">Perfil de altitud</div>`
    + `<img src="files/spark.png" width="328" height="92" style="display:block;width:100%;height:auto;margin-top:5px;border-radius:8px">`
    + `<div style="display:flex;justify-content:space-between;font-size:10px;color:${FOOT};margin-top:3px"><span>0:00</span><span>máx ${Math.round(relmax)} m</span><span>${_dur}</span></div>`
    + `<div style="margin-top:11px;font-size:11px;color:${MUT};line-height:1.5">&#9654; Usa la barra de tiempo para reproducir<br>&#128295; Clic derecho &#8594; Mostrar perfil de elevación</div>`
    + `</div></div>]]>`;

  // track animado
  const whens = S.map(r => `    <when>${utc(r.t)}</when>\n`).join('');
  const coords = S.map(r => `    <gx:coord>${r.lon} ${r.lat} ${r.ab.toFixed(1)}</gx:coord>\n`).join('');
  const line = S.map(r => `${r.lon},${r.lat},${r.ab.toFixed(1)}`).join(' ');

  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2">
<Document>
 <name>${esc(assets.title || 'Vuelo DJI')} (avanzado)</name>
 <open>1</open>
 <LookAt><longitude>${clon.toFixed(6)}</longitude><latitude>${clat.toFixed(6)}</latitude>
  <altitude>760</altitude><heading>0</heading><tilt>55</tilt><range>1800</range><altitudeMode>absolute</altitudeMode></LookAt>
${styles}
 <Folder><name>Trayectoria del vuelo</name><open>1</open>
  <Placemark><name>Recorrido</name><styleUrl>#track</styleUrl>
   <description>${trackDesc}</description>
   <LineString><tessellate>1</tessellate><altitudeMode>absolute</altitudeMode><coordinates>${line}</coordinates></LineString></Placemark>
  <Placemark><name>Muros de altitud</name><styleUrl>#wall</styleUrl>
   <LineString><extrude>1</extrude><tessellate>1</tessellate><altitudeMode>absolute</altitudeMode><coordinates>${line}</coordinates></LineString></Placemark>
 </Folder>
 <Folder><name>Vuelo animado (barra de tiempo)</name><open>1</open>
  <Placemark><name>Dron en movimiento</name><styleUrl>#drone</styleUrl>
   <description>${trackDesc}</description>
   <gx:Track><altitudeMode>absolute</altitudeMode>
${whens}${coords}   </gx:Track>
  </Placemark>
 </Folder>
 <Folder><name>Puntos clave</name><open>1</open>
${keypointsXml} </Folder>
 <Folder><name>Marcas de minuto</name><open>0</open>
${minutesXml} </Folder>
</Document></kml>`;

  // archivos del KMZ
  const files = [{ name: 'doc.kml', data: kml }];
  for (const accent of usedAccents) files.push({ name: `files/pin_${accent}.png`, data: discIcon(ACCENT[accent]) });
  files.push({ name: 'files/drone.png', data: droneIcon() });
  files.push({ name: 'files/spark.png', data: sparkIcon(model) });
  if (assets.hasFrames) for (const k of kps) if (k.frame) files.push({ name: `files/frm_${k.key}.jpg`, data: dataUrlToBytes(k.frame) });

  const filename = (assets.title || 'vuelo').replace(/[^\w.-]+/g, '_') + '-avanzado.kmz';
  return { blob: makeZip(files), filename };
}

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

return {buildKMZ};
})();
__REG['frames'] = (function(){
// Extracción de fotogramas del MP4 en el propio navegador con <video> + <canvas>.
// El vídeo nunca sale del equipo: se lee con un object URL local y se descarta al terminar.

/**
 * Extrae fotogramas JPEG (dataURL) en los tiempos dados de un archivo de vídeo.
 * @param {File} file archivo MP4/MOV
 * @param {number[]} times segundos a capturar
 * @param {(p:number)=>void} onProgress 0..1
 * @param {number} maxW ancho máximo de salida
 * @returns {Promise<string[]>} dataURLs alineados con `times`
 */
async function grabFrames(file, times, onProgress = () => {}, maxW = 960) {
  const url = URL.createObjectURL(file);
  const v = document.createElement('video');
  v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
  try {
    await once(v, 'loadedmetadata');
    // algunos navegadores necesitan un play/pause para poder hacer seek fiable
    try { await v.play(); v.pause(); } catch (_) {}
    const scale = Math.min(1, maxW / (v.videoWidth || maxW));
    const cw = Math.round((v.videoWidth || maxW) * scale), ch = Math.round((v.videoHeight || maxW * 9 / 16) * scale);
    const canvas = document.createElement('canvas'); canvas.width = cw; canvas.height = ch;
    const ctx = canvas.getContext('2d');
    const out = [];
    for (let i = 0; i < times.length; i++) {
      const t = Math.max(0, Math.min((v.duration || 1e9) - 0.05, times[i]));
      await seek(v, t);
      ctx.drawImage(v, 0, 0, cw, ch);
      out.push(canvas.toDataURL('image/jpeg', 0.82));
      onProgress((i + 1) / times.length);
    }
    return out;
  } finally {
    v.removeAttribute('src'); v.load(); URL.revokeObjectURL(url);
  }
}

function once(target, ev) {
  return new Promise((res, rej) => {
    const ok = () => { cleanup(); res(); };
    const err = () => { cleanup(); rej(new Error('No se pudo leer el vídeo (¿códec no soportado por el navegador?).')); };
    const cleanup = () => { target.removeEventListener(ev, ok); target.removeEventListener('error', err); };
    target.addEventListener(ev, ok, { once: true }); target.addEventListener('error', err, { once: true });
  });
}

function seek(v, t) {
  return new Promise((res, rej) => {
    let done = false;
    const ok = () => { if (done) return; done = true; v.removeEventListener('seeked', ok); res(); };
    v.addEventListener('seeked', ok);
    // salvavidas por si 'seeked' no dispara
    const to = setTimeout(ok, 1500);
    v.currentTime = t;
    const clear = () => clearTimeout(to);
    v.addEventListener('seeked', clear, { once: true });
  });
}

return {grabFrames};
})();
__REG['report'] = (function(){
// Construye el informe completo a partir del modelo del vuelo y los fotogramas extraídos.
// Reúne portada, resumen, momentos, recorrido, altitud, dinámica, cámara, gimbal y exports.
const {timeChart} = __REG['charts'];
const {buildMap} = __REG['satmap'];
const {keypoints, mmss} = __REG['geo'];
const {hav} = __REG['srt'];
const {toGPX, toKML, toCSV, download, downloadBlob} = __REG['exports'];
const {buildKMZ} = __REG['kmz'];
const f = (v, d = 0) => v == null ? '—' : v.toFixed(d);
const nfmt = (n) => n.toLocaleString('es-ES');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const MESES = ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/**
 * @param {object} model  modelo del vuelo
 * @param {object} assets { title, kps, light:[3 dataURL], hero:dataURL } (frames opcionales)
 * @returns {HTMLElement}
 */
function buildReport(model, assets) {
  const m = model.meta, r = model.ranges, cam = model.cam;
  const kps = assets.kps || keypoints(model);
  const dur = m.dur;
  const dt = m.start.match(/(\d{4})-(\d\d)-(\d\d) (\d\d):(\d\d):(\d\d)/);
  const fecha = `${+dt[3]} de ${MESES[+dt[2]]} de ${dt[1]}`;
  const tstart = m.start.slice(11, 19), tend = m.end.slice(11, 19);

  const root = document.createElement('div');
  root.className = 'report';

  const relmax = f(r.rel[1]);
  const hsmax = f(r.hspeed[1] * 3.6), hsavg = f(r.hspeed_avg * 3.6);

  root.innerHTML = `
  <header class="r-hero">
    <div class="bg ${assets.hero ? '' : 'gradient'}" ${assets.hero ? `style="background-image:url('${assets.hero}')"` : ''}></div>
    <div class="scrim"></div>
    <div class="inner">
      <span class="kick">🚁 Telemetría de vuelo · DJI</span>
      <h1>${esc(assets.title || 'Vuelo con DJI')}</h1>
      <p class="lede">Un análisis completo del vuelo, fotograma a fotograma: recorrido, altitud, velocidad, cámara y los momentos clave.</p>
      <div class="hstats">
        <div class="hstat"><div class="v">${mmss(dur)}</div><div class="l">Duración</div></div>
        <div class="hstat"><div class="v">${relmax} <small>m</small></div><div class="l">Altura máx.</div></div>
        <div class="hstat"><div class="v">${nfmt(model.maxfar)} <small>m</small></div><div class="l">Alejamiento</div></div>
        <div class="hstat"><div class="v">${hsmax} <small>km/h</small></div><div class="l">Vel. máx.</div></div>
      </div>
      <div class="hmeta">
        <span>📅 <b>${fecha}</b></span>
        <span>🕘 <b>${tstart} – ${tend}</b></span>
        <span>🎞️ <b>${nfmt(m.frames)} fotogramas</b> · ${m.fps} fps</span>
      </div>
    </div>
  </header>

  <div class="wrap">
    <section class="blk">
      <div class="eyebrow-2">Resumen</div>
      <h2>El vuelo en cifras</h2>
      <p class="sub">Todo se extrae del archivo <code>.SRT</code> que el dron graba junto al vídeo: una lectura de sensores por cada fotograma, sincronizada con la imagen.</p>
      <div class="tiles">
        <div class="tile"><div class="v">${mmss(dur)}</div><div class="l">Duración</div><div class="k">${nfmt(m.frames)} fotogramas</div></div>
        <div class="tile"><div class="v">${relmax} <small>m</small></div><div class="l">Altura máxima</div><div class="k">sobre el despegue</div></div>
        <div class="tile"><div class="v">${nfmt(model.maxfar)} <small>m</small></div><div class="l">Alejamiento máx.</div><div class="k">del punto de inicio</div></div>
        <div class="tile"><div class="v">${nfmt(model.dist)} <small>m</small></div><div class="l">Recorrido total</div><div class="k">distancia horizontal</div></div>
        <div class="tile"><div class="v">${hsavg} <small>km/h</small></div><div class="l">Velocidad media</div><div class="k">máx. ${hsmax} km/h</div></div>
        <div class="tile"><div class="v">${f(r.vspeed[1], 1)} <small>m/s</small></div><div class="l">Ascenso máx.</div><div class="k">velocidad vertical</div></div>
        <div class="tile"><div class="v">${f(r.ab[0])}–${f(r.ab[1])} <small>m</small></div><div class="l">Altitud (msnm)</div><div class="k">absoluta</div></div>
        <div class="tile"><div class="v">${cam.iso.length ? Math.min(...cam.iso) + '–' + Math.max(...cam.iso) : '—'}</div><div class="l">Rango ISO</div><div class="k">la cámara compensó la luz</div></div>
      </div>
    </section>

    <section class="blk">
      <div class="eyebrow-2">Momentos clave</div>
      <h2>Ocho instantes del vuelo</h2>
      <p class="sub">Cada tarjeta marca un hito del vuelo con su marca de tiempo y su dato destacado${assets.hasFrames ? ', sobre el fotograma real del vídeo' : ''}.</p>
      ${!assets.hasFrames ? `<div class="callout ${assets.frameError ? 'warn' : ''}" style="margin:0 0 22px">${assets.frameError
        ? `<b>⚠️ Vídeo no decodificado</b>${assets.frameError}`
        : `<b>🎬 Añade el vídeo para ver los fotogramas</b>Vuelve a empezar y añade el <code>.MP4</code> del vuelo: los ocho momentos aparecerán con la imagen real de cada instante. El vídeo se procesa en tu equipo, no se sube.`}</div>` : ''}
      <div class="mos">${kps.map(k => `
        <figure class="mo"><div class="mo-img">${k.frame ? `<img src="${k.frame}" alt="${esc(k.label)}">` : `<div class="ph"><span class="ph-ico">🎞️</span></div>`}<span class="mo-t">${mmss(k.t)}</span></div>
        <figcaption class="mo-cap"><div class="mo-label">${esc(k.label)}</div><div class="mo-metric">${esc(k.metric)}</div><div class="mo-sub">${esc(k.sub)}</div></figcaption></figure>`).join('')}</div>
    </section>

    <section class="blk">
      <div class="eyebrow-2">Recorrido</div>
      <h2>El recorrido sobre el terreno</h2>
      <p class="sub">Trazado real sobre imagen de satélite. El color indica la altura: <span style="color:var(--blue)">azul = bajo</span> → <span style="color:var(--orange)">naranja = alto</span>.</p>
      <div class="card">
        <div class="legend">
          <span><span class="dot" style="background:var(--green)"></span>Despegue / aterrizaje</span>
          <span><span class="dot" style="background:#fff;border:2px solid var(--accent)"></span>Momentos clave</span>
          <span><span class="sw" style="background:linear-gradient(90deg,var(--blue),var(--orange))"></span>Altura baja → alta</span>
        </div>
        <div id="mapSlot"></div>
        <p class="chart-note" style="text-align:center">Imagen de satélite: Esri World Imagery · trazado reconstruido con el GPS del vuelo</p>
      </div>
    </section>

    <section class="blk">
      <div class="eyebrow-2">Altitud</div>
      <h2>Perfil de altura</h2>
      <p class="sub">Altura sobre el punto de despegue a lo largo del tiempo.</p>
      <div class="card"><div class="chartbox" id="c-alt"></div></div>
    </section>

    <section class="blk">
      <div class="eyebrow-2">Dinámica</div>
      <h2>Velocidad y distancia</h2>
      <p class="sub">Velocidad sobre el terreno y vertical, y cuánto se alejó el dron del punto de despegue.</p>
      <div class="card">
        <h3>Velocidad horizontal y vertical</h3>
        <div class="legend"><span><span class="sw" style="background:var(--blue)"></span>Horizontal (km/h)</span><span><span class="sw" style="background:var(--violet)"></span>Vertical (m/s)</span></div>
        <div class="chartbox" id="c-sp"></div>
      </div>
      <div class="card">
        <h3>Distancia al punto de despegue</h3>
        <div class="legend"><span><span class="sw" style="background:var(--aqua)"></span>Distancia (m)</span></div>
        <div class="chartbox" id="c-far"></div>
      </div>
    </section>

    <section class="blk">
      <div class="eyebrow-2">Cámara</div>
      <h2>La luz durante el vuelo</h2>
      <p class="sub">Los ajustes de exposición van grabados en cada fotograma: se ve cómo la cámara compensó la luz. ISO ${cam.iso.length ? Math.min(...cam.iso) + '–' + Math.max(...cam.iso) : '—'}, temp. de color ${f(r.ct[0])}–${f(r.ct[1])} K.</p>
      <div class="card">
        <h3>ISO y temperatura de color en el tiempo</h3>
        <div class="legend"><span><span class="sw" style="background:var(--blue)"></span>ISO</span><span><span class="sw" style="background:var(--yellow)"></span>Temp. color (K)</span></div>
        <div class="chartbox" id="c-cam"></div>
      </div>
      ${assets.light && assets.light.length === 3 ? `
      <div class="card">
        <h3>Cómo cambió la luz</h3>
        <div class="lstrip">
          <figure><img src="${assets.light[0]}" alt=""><figcaption><b>${mmss(dur * 0.15)}</b> · inicio</figcaption></figure>
          <figure><img src="${assets.light[1]}" alt=""><figcaption><b>${mmss(dur * 0.5)}</b> · mitad</figcaption></figure>
          <figure><img src="${assets.light[2]}" alt=""><figcaption><b>${mmss(dur * 0.92)}</b> · final</figcaption></figure>
        </div>
      </div>` : ''}
    </section>

    <section class="blk">
      <div class="eyebrow-2">Gimbal</div>
      <h2>Orientación de la cámara (gimbal)</h2>
      <p class="sub">El archivo incluye la orientación del estabilizador como cuaterniones (<code>pp_target</code> = objetivo, <code>pp_current</code> = real) en cada fotograma, más el estado del EIS${cam.eis && cam.eis.length ? ` (<code>${cam.eis.join(', ')}</code>)` : ''} y del recorte de estabilización. De ahí se estima la inclinación de la cámara.</p>
      <div class="card">
        <h3>Inclinación estimada de cámara (pitch)</h3>
        <div class="legend"><span><span class="sw" style="background:var(--green)"></span>Pitch estimado (°)</span></div>
        <div class="chartbox" id="c-gb"></div>
        <p class="chart-note">Rango estimado: ${f(r.pitch[0])}° a ${f(r.pitch[1])}°. Valor derivado del cuaternión; la convención exacta de ejes de DJI no está documentada, tómalo como aproximado.</p>
      </div>
    </section>

    <section class="blk">
      <div class="eyebrow-2">Ubicación y datos</div>
      <h2>Dónde voló y qué te llevas</h2>
      <div class="grid2">
        <div class="card">
          <h3>Coordenadas</h3>
          <table><tbody>
            <tr><td>Despegue / aterrizaje</td><td class="n"><code>${f(model.takeoff[0], 6)}, ${f(model.takeoff[1], 6)}</code></td></tr>
            <tr><td>Centro del vuelo</td><td class="n"><code>${f(model.center[0], 6)}, ${f(model.center[1], 6)}</code></td></tr>
          </tbody></table>
          <p style="margin:12px 0 0"><a href="https://www.google.com/maps?q=${model.takeoff[0]},${model.takeoff[1]}" target="_blank" rel="noopener">Ver en Google Maps ↗</a></p>
        </div>
        <div class="card">
          <h3>Descargar datos del vuelo</h3>
          <div class="exports">
            <button class="exp-btn exp-kmz" data-exp="kmz">🌍 KMZ 3D para Google Earth</button>
            <button class="exp-btn" data-exp="gpx">🛰️ GPX</button>
            <button class="exp-btn" data-exp="kml">🗺️ KML</button>
            <button class="exp-btn" data-exp="csv">📊 CSV</button>
          </div>
          <p class="chart-note">El <code>.kmz</code> reproduce el vuelo <b>animado en 3D</b> en Google Earth, con muros de altitud, los momentos clave y${assets.hasFrames ? '' : ' (si añades el vídeo)'} los fotogramas incrustados. El <code>.csv</code> tiene todos los datos por fotograma; <code>.gpx</code>/<code>.kml</code> abren el trazado en apps de mapas.</p>
        </div>
      </div>
    </section>

    <section class="blk">
      <div class="eyebrow-2">Calidad de los datos</div>
      <h2>Notas honestas</h2>
      <div class="callout warn"><b>⚠️ Micro-saltos del GPS</b>Entre fotogramas el GPS tiene pequeños saltos que, sin filtrar, dan velocidades imposibles (hasta ${f(model.glitch_max * 3.6)} km/h). Todas las velocidades y distancias se calculan en ventanas de 0,5 s para eliminarlos.</div>
      <div class="callout good"><b>✅ Todo en tu navegador</b>El SRT y el vídeo se procesan en tu equipo; no se sube nada a ningún servidor.</div>
    </section>
  </div>

  <div class="foot">Generado en el navegador a partir de la telemetría · ${nfmt(m.frames)} fotogramas · ${fecha}</div>`;

  // ---- wiring tras insertar en el DOM ----
  queueMicrotask(() => {
    const S = model.series;
    const [tk0, tk1] = model.takeoff;
    for (const s of S) { s.hskmh = s.hs != null ? s.hs * 3.6 : null; if (s.far == null) s.far = hav(tk0, tk1, s.lat, s.lon); }

    timeChart(root.querySelector('#c-alt'), S, dur, [{ k: 'rel', color: '--blue', area: true, min: 0, fmt: v => `${Math.round(v)}`, label: 'Altura', unit: 'm', dec: 0 }]);
    timeChart(root.querySelector('#c-sp'), S, dur, [
      { k: 'hskmh', color: '--blue', min: 0, fmt: v => `${Math.round(v)}`, label: 'Horizontal', unit: 'km/h', dec: 1 },
      { k: 'vs', color: '--violet', fmt: v => `${Math.round(v)}`, label: 'Vertical', unit: 'm/s', dec: 1 },
    ]);
    timeChart(root.querySelector('#c-far'), S, dur, [{ k: 'far', color: '--aqua', area: true, min: 0, fmt: v => `${Math.round(v)}`, label: 'Distancia', unit: 'm', dec: 0 }]);
    timeChart(root.querySelector('#c-cam'), S, dur, [
      { k: 'iso', color: '--blue', fmt: v => `${Math.round(v)}`, label: 'ISO', unit: '', dec: 0 },
      { k: 'ct', color: '--yellow', fmt: v => `${(Math.round(v / 100) / 10)}k`, label: 'Temp', unit: 'K', dec: 0 },
    ]);
    timeChart(root.querySelector('#c-gb'), S, dur, [{ k: 'pitch', color: '--green', area: true, fmt: v => `${Math.round(v)}°`, label: 'Pitch', unit: '°', dec: 0 }]);

    root.querySelector('#mapSlot').appendChild(buildMap(model, kps));

    root.querySelectorAll('[data-exp]').forEach(b => b.addEventListener('click', () => {
      const kind = b.dataset.exp, name = assets.title || 'vuelo';
      if (kind === 'gpx') download(name + '.gpx', toGPX(model, name), 'application/gpx+xml');
      if (kind === 'kml') download(name + '.kml', toKML(model, name), 'application/vnd.google-earth.kml+xml');
      if (kind === 'csv') download(name + '.csv', toCSV(model), 'text/csv');
      if (kind === 'kmz') {
        const prev = b.textContent; b.disabled = true; b.textContent = '⏳ Generando KMZ…';
        try { const { blob, filename } = buildKMZ(model, { ...assets, kps }); downloadBlob(filename, blob); }
        catch (e) { console.error(e); alert('No se pudo generar el KMZ: ' + e.message); }
        finally { b.disabled = false; b.textContent = prev; }
      }
    }));
  });

  return root;
}

return {buildReport};
})();
__REG['app'] = (function(){
// Orquestador de la web: pantalla de subida, procesado en el navegador y render del informe.
const {parseSRT} = __REG['srt'];
const {keypoints} = __REG['geo'];
const {grabFrames} = __REG['frames'];
const {buildReport} = __REG['report'];
const app = document.getElementById('app');
const state = { srt: null, srtText: null, mp4: null, title: 'Vuelo con DJI Neo 2' };

/* ---------- tema ---------- */
function initTheme() {
  const btn = document.getElementById('themeBtn');
  const saved = localStorage.getItem('dji-theme');
  const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  const light = saved ? saved === 'light' : prefersLight;
  if (light) { document.documentElement.setAttribute('data-theme', 'light'); btn.textContent = '☀️'; }
  btn.addEventListener('click', () => {
    const light = document.documentElement.getAttribute('data-theme') === 'light';
    if (light) { document.documentElement.removeAttribute('data-theme'); btn.textContent = '🌙'; localStorage.setItem('dji-theme', 'dark'); }
    else { document.documentElement.setAttribute('data-theme', 'light'); btn.textContent = '☀️'; localStorage.setItem('dji-theme', 'light'); }
  });
}

/* ---------- landing ---------- */
function renderLanding() {
  app.innerHTML = `
  <div class="hero-land">
    <span class="eyebrow">✦ Análisis de vuelos DJI</span>
    <h1>Convierte la telemetría de tu dron en un informe espectacular</h1>
    <p class="sub">Suelta el <b>.SRT</b> de tu vuelo (y, si quieres, el <b>.MP4</b>) y obtén al instante un informe con recorrido sobre satélite, altitud, velocidad, cámara y orientación del gimbal. Todo en tu navegador: nada se sube a ningún servidor.</p>

    <div class="drop" id="drop" role="button" tabindex="0" aria-label="Elegir o soltar el archivo .SRT del vuelo">
      <div class="ico">📈</div>
      <h3>Suelta aquí tu archivo .SRT</h3>
      <p>o haz clic para elegirlo — también puedes añadir el vídeo .MP4</p>
      <button class="cta" id="pickSrt">Elegir archivo .SRT</button>
      <div class="file-row" id="fileRow">
        <span class="file-chip" id="chipSrt">SRT: <b>ninguno</b></span>
        <span class="file-chip" id="chipMp4">MP4: <b>opcional</b></span>
      </div>
      <div class="mp4-note" id="mp4note"></div>
    </div>

    <div style="max-width:620px;margin:20px auto 0;text-align:left" id="goWrap" class="hidden">
      <label style="display:block;font-size:13px;color:var(--muted);margin:0 0 6px">Título del informe</label>
      <input id="titleIn" value="${state.title}" style="width:100%;background:var(--surface);border:1px solid var(--glass-border);border-radius:12px;padding:12px 14px;color:var(--ink);font-size:15px;font-family:inherit;backdrop-filter:blur(8px)">
      <button class="cta" id="go" style="margin-top:14px;width:100%;background:linear-gradient(135deg,var(--accent-2),var(--accent))">Generar informe →</button>
      <button class="pill-btn" id="addMp4" style="margin-top:10px;width:100%;justify-content:center">🎬 Añadir vídeo .MP4 (opcional, para los fotogramas)</button>
    </div>

    <div class="feats">
      <div class="feat"><div class="fi">🛰️</div><h4>Recorrido sobre satélite</h4><p>Trazado GPS coloreado por altura sobre imagen real de Esri.</p></div>
      <div class="feat"><div class="fi">🎥</div><h4>Fotogramas del vídeo</h4><p>Los momentos clave se recortan del MP4 sin subirlo a internet.</p></div>
      <div class="feat"><div class="fi">🎯</div><h4>Gimbal y cámara</h4><p>Inclinación estimada, ISO, temperatura de color y velocidad.</p></div>
    </div>
  </div>

  <input type="file" id="srtFile" accept=".srt,.SRT" class="hidden">
  <input type="file" id="mp4File" accept=".mp4,.MP4,.mov,.MOV" class="hidden">`;

  const $ = (s) => app.querySelector(s);
  const srtInput = $('#srtFile'), mp4Input = $('#mp4File'), drop = $('#drop');

  const refresh = () => {
    $('#chipSrt').innerHTML = `SRT: <b>${state.srt ? state.srt.name : 'ninguno'}</b>`;
    $('#chipSrt').classList.toggle('ok', !!state.srt);
    $('#chipMp4').innerHTML = `MP4: <b>${state.mp4 ? state.mp4.name : 'opcional'}</b>`;
    $('#chipMp4').classList.toggle('ok', !!state.mp4);
    $('#goWrap').classList.toggle('hidden', !state.srt);
    $('#mp4note').textContent = state.srt && !state.mp4 ? 'Sin vídeo el informe sale igual, pero sin los fotogramas de los momentos.' : '';
  };

  const takeFiles = async (files) => {
    for (const file of files) {
      const n = file.name.toLowerCase();
      if (n.endsWith('.srt')) { state.srt = file; state.srtText = await file.text(); }
      else if (n.endsWith('.mp4') || n.endsWith('.mov')) state.mp4 = file;
    }
    refresh();
  };

  $('#pickSrt').addEventListener('click', (e) => { e.stopPropagation(); srtInput.click(); });
  drop.addEventListener('click', () => srtInput.click());
  drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); srtInput.click(); } });
  srtInput.addEventListener('change', () => takeFiles(srtInput.files));
  mp4Input.addEventListener('change', () => takeFiles(mp4Input.files));
  ['dragover', 'dragenter'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); if (ev === 'dragleave' && drop.contains(e.relatedTarget)) return; drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => takeFiles(e.dataTransfer.files));

  app.addEventListener('click', (e) => {
    if (e.target.id === 'addMp4') { e.stopPropagation(); mp4Input.click(); }
    if (e.target.id === 'go') { state.title = $('#titleIn').value.trim() || 'Vuelo con DJI'; run(); }
  });

  refresh();
}

/* ---------- progreso ---------- */
const STEPS = [
  ['parse', 'Leyendo la telemetría del SRT'],
  ['model', 'Calculando recorrido, velocidad y gimbal'],
  ['frames', 'Recortando fotogramas del vídeo'],
  ['map', 'Descargando imagen de satélite'],
  ['render', 'Montando el informe'],
];
function renderProgress() {
  app.innerHTML = `
  <div class="hero-land" style="padding-top:clamp(60px,12vh,140px)">
    <div class="progress">
      <h3>Generando tu informe…</h3>
      <p>Todo el procesado ocurre en tu navegador.</p>
      <div class="steps" role="status" aria-live="polite">${STEPS.map(([id, t]) => `<div class="pstep" data-step="${id}"><span class="bullet">•</span><span>${t}</span></div>`).join('')}</div>
      <div class="pbar"><span id="pbarFill"></span></div>
    </div>
  </div>`;
}
function step(id, status, pct) {
  const elm = app.querySelector(`[data-step="${id}"]`);
  if (elm) {
    app.querySelectorAll('.pstep').forEach(s => { if (s !== elm) s.classList.remove('active'); });
    elm.classList.remove('active', 'done');
    elm.classList.add(status);
    elm.querySelector('.bullet').innerHTML = status === 'done' ? '✓' : (status === 'active' ? '<span class="spin"></span>' : '•');
  }
  const fill = app.querySelector('#pbarFill');
  if (pct != null && fill) fill.style.width = pct + '%';
}

/* ---------- pipeline ---------- */
async function run() {
  renderProgress();
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  try {
    step('parse', 'active', 8); await wait(120);
    const model = parseSRT(state.srtText);
    step('parse', 'done', 20);

    step('model', 'active', 24); await wait(120);
    const kps = keypoints(model);
    step('model', 'done', 40);

    const assets = { title: state.title, kps, hasFrames: false };
    const setFramesLabel = (txt) => { const s = app.querySelector('[data-step="frames"]'); if (s) s.querySelector('span:last-child').textContent = txt; };
    if (state.mp4) {
      step('frames', 'active', 44);
      const dur = model.meta.dur;
      const kpTimes = kps.map(k => k.t);
      const lightTimes = [dur * 0.15, dur * 0.5, dur * 0.92];
      const heroT = kps.find(k => k.key === 'hi')?.t ?? dur * 0.3;
      const times = [...kpTimes, ...lightTimes, heroT];
      try {
        const frames = await grabFrames(state.mp4, times, (p) => step('frames', 'active', 44 + Math.round(p * 26)));
        kps.forEach((k, i) => k.frame = frames[i]);
        assets.light = frames.slice(kpTimes.length, kpTimes.length + 3);
        assets.hero = frames[frames.length - 1];
        assets.hasFrames = true;
        step('frames', 'done', 70);
      } catch (e) {
        // el navegador no pudo decodificar el vídeo: seguimos sin fotogramas
        assets.frameError = 'No se pudieron recortar los fotogramas (el navegador no decodifica este vídeo; suele ser HEVC/H.265). El resto del informe está completo.';
        step('frames', 'done', 70); setFramesLabel('El vídeo no se pudo decodificar: informe sin fotogramas');
      }
    } else {
      step('frames', 'done', 70);
      setFramesLabel('Sin vídeo: se omiten los fotogramas');
    }

    step('map', 'active', 74); await wait(80);
    // el mapa se carga solo al insertar el SVG (teselas Esri); damos por hecho el paso
    step('map', 'done', 88);

    step('render', 'active', 92); await wait(80);
    const report = buildReport(model, assets);
    step('render', 'done', 100); await wait(120);
    app.innerHTML = '';
    app.appendChild(report);
    window.scrollTo({ top: 0 });

    // botón para analizar otro vuelo
    document.getElementById('resetBtn').classList.remove('hidden');
  } catch (err) {
    app.innerHTML = `<div class="hero-land"><div class="progress"><h3>No se pudo generar el informe</h3><p style="color:var(--red)">${err.message}</p><button class="cta" id="back" style="margin-top:16px">← Volver</button></div></div>`;
    app.querySelector('#back').addEventListener('click', () => { renderLanding(); });
    console.error(err);
  }
}

/* ---------- init ---------- */
initTheme();
document.getElementById('resetBtn').addEventListener('click', () => {
  document.getElementById('resetBtn').classList.add('hidden');
  Object.assign(state, { srt: null, srtText: null, mp4: null });
  renderLanding();
});
renderLanding();


})();
})();