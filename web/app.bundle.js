/**
 * GENERADO — no editar a mano. Une los módulos de web/ en un solo archivo
 * clásico para que la web se pueda abrir con doble clic (file://).
 * Regenerar tras tocar cualquier .js:  node tools/bundle.mjs
 */
(function () {
  const __m = {};
  const __c = {};
  function __req(moduleId) {
    if (__c[moduleId]) return __c[moduleId];
    const factory = __m[moduleId];
    if (!factory) throw new Error('módulo no registrado: ' + moduleId);
    const __x = {};
    __c[moduleId] = __x;
    factory(__x, __req);
    return __x;
  }

__m["main.js"] = function (__x, __req) {
// Orquestador de la web (chrome global en light DOM + cambio de vista).
// Migrado al patrón de Web Components: landing y progreso son componentes; el
// informe se genera de momento con buildReport (se migrará a <flight-report>).
__req("js/components/views/upload-view/upload-view.js");
__req("js/components/views/progress-view/progress-view.js");
const { t, setLang, getLang, initLang } = __req("js/i18n/index.js");
__req("js/components/views/flight-report/flight-report.js");
const { parseSRT } = __req("js/srt.js");
const { keypoints } = __req("js/geo.js");
const { grabFrames } = __req("js/frames.js");

const app = document.getElementById('app');

/* ---------- tema ---------- */
function initTheme() {
  const saved = localStorage.getItem('dji-theme');
  const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  const light = saved ? saved === 'light' : prefersLight;
  document.documentElement.toggleAttribute('data-theme', false);
  if (light) document.documentElement.setAttribute('data-theme', 'light');
  paintThemeBtn();
}
function toggleTheme() {
  const light = document.documentElement.getAttribute('data-theme') === 'light';
  if (light) { document.documentElement.removeAttribute('data-theme'); localStorage.setItem('dji-theme', 'dark'); }
  else { document.documentElement.setAttribute('data-theme', 'light'); localStorage.setItem('dji-theme', 'light'); }
  paintThemeBtn();
}
function paintThemeBtn() {
  const b = document.getElementById('themeBtn');
  if (b) b.textContent = document.documentElement.getAttribute('data-theme') === 'light' ? '☀️' : '🌙';
}

/* ---------- chrome ---------- */
function paintChrome() {
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
  const lb = document.getElementById('langBtn');
  if (lb) lb.textContent = getLang() === 'es' ? 'EN' : 'ES';
}

/* ---------- vistas ---------- */
function showUpload() {
  document.getElementById('resetBtn').classList.add('hidden');
  app.innerHTML = '';
  const v = document.createElement('upload-view');
  v.addEventListener('dji:generate', (e) => generate(e.detail));
  app.appendChild(v);
}

async function generate({ srtText, mp4, title, place }) {
  app.innerHTML = '';
  const pv = document.createElement('progress-view');
  app.appendChild(pv);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    pv.setStep('parse', 'active', 8); await wait(120);
    const model = parseSRT(srtText);
    pv.setStep('parse', 'done', 20);

    pv.setStep('model', 'active', 24); await wait(120);
    const kps = keypoints(model);
    pv.setStep('model', 'done', 40);

    const assets = { title, place: place || null, kps, hasFrames: false, mp4File: mp4 || null };
    if (mp4) {
      pv.setStep('frames', 'active', 44);
      const dur = model.meta.dur;
      const kpTimes = kps.map((k) => k.t);
      const lightTimes = [dur * 0.15, dur * 0.5, dur * 0.92];
      const heroT = kps.find((k) => k.key === 'hi')?.t ?? dur * 0.3;
      const times = [...kpTimes, ...lightTimes, heroT];
      try {
        const frames = await grabFrames(mp4, times, (p) => pv.setStep('frames', 'active', 44 + Math.round(p * 26)));
        kps.forEach((k, i) => (k.frame = frames[i]));
        assets.light = frames.slice(kpTimes.length, kpTimes.length + 3);
        assets.hero = frames[frames.length - 1];
        assets.hasFrames = true;
        pv.setStep('frames', 'done', 70);
      } catch (_) {
        assets.frameError = t('step.frames.error');
        pv.setStep('frames', 'done', 70); pv.stepLabel('frames', 'step.frames.error');
      }
    } else {
      pv.setStep('frames', 'done', 70); pv.stepLabel('frames', 'step.frames.novideo');
    }

    pv.setStep('map', 'active', 74); await wait(80);
    pv.setStep('map', 'done', 88);

    pv.setStep('render', 'active', 92); await wait(80);
    pv.setStep('render', 'done', 100); await wait(120);
    app.innerHTML = '';
    const report = document.createElement('flight-report');
    app.appendChild(report);
    report.show(model, assets);
    window.scrollTo({ top: 0 });
    document.getElementById('resetBtn').classList.remove('hidden');
  } catch (err) {
    console.error(err);
    app.innerHTML = `<div style="max-width:620px;margin:120px auto 0;padding:0 24px;text-align:center">
      <h3 style="font-size:22px;margin:0 0 8px">${t('error.title')}</h3>
      <p style="color:var(--c-red)">${err.message}</p>
      <button id="back" style="margin-top:16px;padding:12px 24px;border-radius:100px;border:1px solid var(--color-divider);background:var(--color-surface);color:var(--color-text);cursor:pointer">${t('error.back')}</button></div>`;
    document.getElementById('back').addEventListener('click', showUpload);
  }
}

/* ---------- init ---------- */
window.addEventListener('i18n:changed', paintChrome);
document.getElementById('themeBtn').addEventListener('click', toggleTheme);
document.getElementById('langBtn').addEventListener('click', () => setLang(getLang() === 'es' ? 'en' : 'es'));
document.getElementById('resetBtn').addEventListener('click', showUpload);
document.querySelector('.brand')?.addEventListener('click', (e) => { e.preventDefault(); showUpload(); });

initLang();
initTheme();
paintChrome();
showUpload();

};

__m["js/charts.js"] = function (__x, __req) {
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

  // posiciona el cursor (crosshair + puntos + tooltip) en un instante t
  const showAtTime = (t) => {
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
    const w = svg.getBoundingClientRect().width || W;
    const px = (x / W) * w;
    tip.style.left = px + 'px';
    tip.classList.toggle('flip', px > w * 0.62);
    tip.style.opacity = '1';
  };
  const move = (clientX) => {
    const rect = svg.getBoundingClientRect();
    const t = Math.max(0, Math.min(dur, ((clientX - rect.left) / rect.width * W - L) / (W - L - R) * dur));
    showAtTime(t);
  };
  const leave = () => { cross.style.opacity = '0'; dots.forEach(d => d.style.opacity = '0'); tip.style.opacity = '0'; };
  svg.addEventListener('pointermove', e => move(e.clientX));
  svg.addEventListener('pointerdown', e => move(e.clientX));
  svg.addEventListener('pointerleave', leave);
  svg.style.touchAction = 'pan-y';

  // handle para el reproductor: mover el cursor por tiempo, o esconderlo
  return { showAtTime, leave };
}

const mmssLocal = (t) => { t = Math.round(t); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };

Object.assign(__x, { timeChart });

};

__m["js/components/ui/callout/callout.css.js"] = function (__x, __req) {
const { css } = __req("js/core/css.js");

const styles = css`
:host { display: block; }
.callout { border-radius: 14px; padding: 16px 18px; font-size: 14px; border: 1px solid var(--color-divider); line-height: 1.55; }
b { display: block; margin-bottom: 3px; }
:host([variant="warn"]) .callout { background: color-mix(in srgb, var(--c-yellow) 12%, transparent); border-color: color-mix(in srgb, var(--c-yellow) 40%, transparent); }
:host([variant="good"]) .callout { background: color-mix(in srgb, var(--c-green) 12%, transparent); border-color: color-mix(in srgb, var(--c-green) 38%, transparent); }
::slotted(*) { margin: 0; }
`;

Object.assign(__x, { styles });

};

__m["js/components/ui/callout/callout.js"] = function (__x, __req) {
const { DjiElement } = __req("js/core/DjiElement.js");
const { escapeHtml } = __req("js/core/escape-html.js");
const { styles } = __req("js/components/ui/callout/callout.css.js");

/** Aviso con título y cuerpo (por slot, admite HTML). Atributos: variant (warn|good), title. */
class AppCallout extends DjiElement {
  static styles = [styles];
  static observedAttributes = ['title', 'variant'];

  attributeChangedCallback() { if (this.isConnected) this._paint(); }

  render() {
    this.shadowRoot.innerHTML = `
      <div class="callout">
        <b>${escapeHtml(this.getAttribute('title'))}</b>
        <slot></slot>
      </div>`;
  }
}

customElements.define('app-callout', AppCallout);

Object.assign(__x, { AppCallout });

};

__m["js/components/ui/drop-zone/drop-zone.css.js"] = function (__x, __req) {
const { css } = __req("js/core/css.js");

const styles = css`
:host { display: block; }
.drop {
  max-width: 620px; margin: 0 auto; background: var(--color-surface);
  border: 1.5px dashed var(--color-divider); border-radius: var(--radius-lg);
  padding: 44px 30px; backdrop-filter: blur(16px); box-shadow: var(--shadow-lg);
  transition: border-color .18s, transform .18s, background .18s; cursor: pointer; text-align: center;
  &:hover, &.over { border-color: var(--color-accent); transform: translateY(-3px); }
  &.over { background: color-mix(in srgb, var(--color-accent) 10%, var(--color-surface)); }
}
.ico {
  width: 74px; height: 74px; margin: 0 auto 18px; border-radius: 20px; display: grid; place-items: center; font-size: 34px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 26%, transparent), color-mix(in srgb, var(--color-violet) 26%, transparent));
  border: 1px solid var(--color-divider);
}
h3 { font-size: 21px; margin: 0 0 6px; font-weight: 800; }
.hint { color: var(--color-text-muted); margin: 0 0 20px; font-size: 14.5px; }
.cta {
  display: inline-block; background: linear-gradient(135deg, var(--color-accent), var(--color-violet)); color: #fff;
  font-weight: 700; padding: 13px 26px; border-radius: 100px; font-size: 15px; border: none; cursor: pointer;
  box-shadow: 0 10px 26px color-mix(in srgb, var(--color-accent) 40%, transparent); transition: transform .12s, box-shadow .12s;
  &:hover { transform: translateY(-2px); box-shadow: 0 16px 34px color-mix(in srgb, var(--color-accent) 50%, transparent); }
}
.files { display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap; margin-top: 18px; font-size: 13.5px; }
.chip {
  display: inline-flex; align-items: center; gap: 8px; background: var(--color-tile);
  border: 1px solid var(--color-divider); border-radius: 100px; padding: 7px 14px; color: var(--color-text-muted);
  b { color: var(--color-text); }
  &.ok { border-color: color-mix(in srgb, var(--c-green) 50%, transparent); color: var(--c-green); }
}
.note { margin-top: 22px; font-size: 13px; color: var(--color-text-muted); min-height: 1em; }
.hidden { display: none; }
`;

Object.assign(__x, { styles });

};

__m["js/components/ui/drop-zone/drop-zone.js"] = function (__x, __req) {
const { DjiElement } = __req("js/core/DjiElement.js");
const { escapeHtml } = __req("js/core/escape-html.js");
const { t } = __req("js/i18n/index.js");
const { styles } = __req("js/components/ui/drop-zone/drop-zone.css.js");

/**
 * Zona de subida del .SRT (y .MP4 opcional). Mantiene el estado de los archivos
 * y emite `dz:change` con { srt, srtText, mp4 } cada vez que cambia.
 */
class DropZone extends DjiElement {
  static styles = [styles];

  constructor() {
    super();
    /** @type {{srt: File|null, srtText: string|null, mp4: File|null}} */
    this.state = { srt: null, srtText: null, mp4: null };
  }

  render() {
    const s = this.state;
    this.shadowRoot.innerHTML = `
      ${this._dropTpl}
      <input type="file" id="srt" accept=".srt,.SRT" class="hidden">
      <input type="file" id="mp4" accept=".mp4,.MP4,.mov,.MOV" class="hidden">`;
  }

  get _dropTpl() {
    const s = this.state;
    return `
      <div class="drop" id="drop" role="button" tabindex="0" aria-label="${escapeHtml(t('drop.title'))}">
        <div class="ico">📈</div>
        <h3>${escapeHtml(t('drop.title'))}</h3>
        <p class="hint">${escapeHtml(t('drop.hint'))}</p>
        <button class="cta" id="pick" type="button">${escapeHtml(t('drop.cta'))}</button>
        <div class="files">
          <span class="chip ${s.srt ? 'ok' : ''}">${t('drop.srt')}: <b>${escapeHtml(s.srt ? s.srt.name : t('drop.none'))}</b></span>
          <span class="chip ${s.mp4 ? 'ok' : ''}">${t('drop.mp4')}: <b>${escapeHtml(s.mp4 ? s.mp4.name : t('drop.optional'))}</b></span>
        </div>
        <p class="note">${s.srt && !s.mp4 ? escapeHtml(t('drop.novideo')) : ''}</p>
      </div>`;
  }

  afterRender() {
    const drop = this.$('#drop'), srtIn = this.$('#srt'), mp4In = this.$('#mp4');
    this.on(this.$('#pick'), 'click', (e) => { e.stopPropagation(); srtIn.click(); });
    this.on(drop, 'click', () => srtIn.click());
    this.on(drop, 'keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); srtIn.click(); } });
    this.on(srtIn, 'change', () => this._take(srtIn.files));
    this.on(mp4In, 'change', () => this._take(mp4In.files));
    ['dragover', 'dragenter'].forEach((ev) => this.on(drop, ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach((ev) => this.on(drop, ev, (e) => { e.preventDefault(); if (ev === 'dragleave' && drop.contains(e.relatedTarget)) return; drop.classList.remove('over'); }));
    this.on(drop, 'drop', (e) => this._take(e.dataTransfer.files));
  }

  /** Abre el selector de MP4 (lo dispara la vista con su botón). */
  pickMp4() { this.$('#mp4').click(); }

  /** Quita el vídeo cargado (p. ej. si no corresponde al SRT). */
  clearMp4() {
    this.state.mp4 = null;
    const inp = this.$('#mp4'); if (inp) inp.value = '';
    this._paint();
    this.emit('dz:change', { ...this.state });
  }

  async _take(fileList) {
    for (const file of fileList) {
      const n = file.name.toLowerCase();
      if (n.endsWith('.srt')) { this.state.srt = file; this.state.srtText = await file.text(); }
      else if (n.endsWith('.mp4') || n.endsWith('.mov')) this.state.mp4 = file;
    }
    this._paint();
    this.emit('dz:change', { ...this.state });
  }
}

customElements.define('drop-zone', DropZone);

Object.assign(__x, { DropZone });

};

__m["js/components/ui/export-bar/export-bar.css.js"] = function (__x, __req) {
const { css } = __req("js/core/css.js");

const styles = css`
:host { display: block; }
.exports { display: flex; gap: 10px; flex-wrap: wrap; }
.exp-btn {
  display: inline-flex; align-items: center; gap: 8px; background: var(--color-tile); border: 1px solid var(--color-divider);
  color: var(--color-text); border-radius: 12px; padding: 11px 16px; font-size: 14px; font-weight: 600; cursor: pointer;
  transition: transform .12s, border-color .12s; font-family: inherit;
  &:hover { transform: translateY(-2px); border-color: var(--color-accent); }
  &:disabled { opacity: .6; cursor: default; transform: none; }
}
.exp-kmz {
  background: linear-gradient(135deg, var(--color-accent), var(--color-violet)); color: #fff; border-color: transparent;
  box-shadow: 0 8px 22px color-mix(in srgb, var(--color-accent) 38%, transparent);
  &:hover { border-color: transparent; }
}
.note { font-size: 12px; color: var(--color-text-muted); margin: 14px 0 0; line-height: 1.5; }
.kmz-hint { margin-top: 8px; padding: 9px 11px; border-radius: 10px; border: 1px solid color-mix(in srgb, var(--color-accent) 30%, transparent); background: color-mix(in srgb, var(--color-accent) 8%, transparent); color: color-mix(in srgb, var(--color-text) 82%, transparent); }
.kmz-hint a { font-weight: 600; }
.hidden { display: none; }
`;

Object.assign(__x, { styles });

};

__m["js/components/ui/export-bar/export-bar.js"] = function (__x, __req) {
const { DjiElement } = __req("js/core/DjiElement.js");
const { escapeHtml } = __req("js/core/escape-html.js");
const { t } = __req("js/i18n/index.js");
const { toGPX, toKML, toCSV, download, downloadBlob } = __req("js/exports.js");
const { buildKMZ } = __req("js/kmz.js");
const { buildStandaloneHtml } = __req("js/export-html.js");
const { styles } = __req("js/components/ui/export-bar/export-bar.css.js");

/** Botones de descarga del vuelo. Recibe los datos por propiedad: el.flight = { model, assets }. */
class ExportBar extends DjiElement {
  static styles = [styles];

  /** @param {{model:object, assets:object}} v */
  set flight(v) { this._flight = v; if (this.isConnected) this._paint(); }
  get flight() { return this._flight; }

  render() {
    this.shadowRoot.innerHTML = `
      <div class="exports">
        <button class="exp-btn exp-kmz" data-exp="kmz" type="button">${t('exp.kmz')}</button>
        <button class="exp-btn" data-exp="html" type="button">📄 ${t('exp.html')}</button>
        <button class="exp-btn" data-exp="gpx" type="button">🛰️ GPX</button>
        <button class="exp-btn" data-exp="kml" type="button">🗺️ KML</button>
        <button class="exp-btn" data-exp="csv" type="button">📊 CSV</button>
      </div>
      <p class="note">${t('exp.note')}</p>
      <p class="note kmz-hint hidden" id="kmzHint"></p>`;
  }

  afterRender() {
    this.$$('[data-exp]').forEach((b) => this.on(b, 'click', () => this._download(b)));
  }

  _download(b) {
    const f = this._flight;
    if (!f) return;
    const { model, assets } = f, name = assets.title || 'vuelo';
    const kind = b.dataset.exp;
    if (kind === 'gpx') download(name + '.gpx', toGPX(model, name), 'application/gpx+xml');
    if (kind === 'kml') download(name + '.kml', toKML(model, name), 'application/vnd.google-earth.kml+xml');
    if (kind === 'csv') download(name + '.csv', toCSV(model), 'text/csv');
    if (kind === 'html') {
      const report = this.getRootNode().host; // el <flight-report>
      const theme = document.documentElement.getAttribute('data-theme') || '';
      download(name + '.html', buildStandaloneHtml(report, { title: name, theme }), 'text/html');
    }
    if (kind === 'kmz') {
      const prev = b.textContent; b.disabled = true; b.textContent = t('exp.kmz.gen');
      try {
        const { blob, filename } = buildKMZ(model, assets);
        downloadBlob(filename, blob);
        this._showKmzHint();
      } catch (e) { console.error(e); alert(t('exp.kmz.error', { msg: e.message })); }
      finally { b.disabled = false; b.textContent = prev; }
    }
  }

  /** Muestra cómo abrir el KMZ (Google Earth Pro o Earth Web). */
  _showKmzHint() {
    const hint = this.$('#kmzHint');
    const link = `<a href="https://earth.google.com/web/" target="_blank" rel="noopener">${escapeHtml(t('exp.earthweb'))} ↗</a>`;
    hint.innerHTML = t('exp.kmz.hint', { link });
    hint.classList.remove('hidden');
  }
}

customElements.define('export-bar', ExportBar);

Object.assign(__x, { ExportBar });

};

__m["js/components/ui/flight-player/flight-player.css.js"] = function (__x, __req) {
const { css } = __req("js/core/css.js");

const styles = css`
:host { position: fixed; left: 0; right: 0; bottom: 0; z-index: 40; display: flex; justify-content: center; padding: 0 14px 16px; pointer-events: none;
  transition: opacity .35s cubic-bezier(.22,1,.36,1), transform .35s cubic-bezier(.22,1,.36,1); }
:host([hidden]) { display: none; }
/* oculto hasta llegar al mapa (lo controla flight-report según la sección visible) */
:host(.away) { opacity: 0; transform: translateY(24px); }
:host(.away) .player, :host(.away) .pip { pointer-events: none; }
@media (prefers-reduced-motion: reduce) { :host { transition: opacity .2s; } :host(.away) { transform: none; } }
.stack { display: flex; flex-direction: column; align-items: center; gap: 10px; width: min(720px, 100%); }
.pip {
  pointer-events: auto; width: clamp(168px, 24vw, 260px); aspect-ratio: 16 / 9; border-radius: 14px; overflow: hidden;
  border: 1px solid var(--color-divider); box-shadow: var(--shadow-lg); background: #000; display: none;
  animation: rise .35s cubic-bezier(.22,1,.36,1) both;
}
.pip.on { display: block; }
.pip video { width: 100%; height: 100%; object-fit: cover; display: block; }
.player {
  pointer-events: auto; display: flex; align-items: center; gap: 13px; width: 100%;
  background: color-mix(in srgb, var(--color-surface-solid) 92%, transparent); border: 1px solid var(--color-divider);
  border-radius: 100px; padding: 10px 16px; box-shadow: var(--shadow-lg); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  animation: rise .35s cubic-bezier(.22,1,.36,1) both;
}
@keyframes rise { from { opacity: 0; transform: translateY(14px); } }
@media (prefers-reduced-motion: reduce) { .player { animation: none; } }

.play {
  width: 42px; height: 42px; flex: none; border-radius: 50%; border: none; cursor: pointer; color: #fff; font-size: 15px;
  display: grid; place-items: center; background: linear-gradient(135deg, var(--color-accent), var(--color-violet));
  box-shadow: 0 6px 16px color-mix(in srgb, var(--color-accent) 40%, transparent); transition: transform .12s;
}
.play:hover { transform: scale(1.06); }
.time { font-family: ui-monospace, Menlo, monospace; font-size: 12.5px; color: var(--color-text-muted); font-variant-numeric: tabular-nums; min-width: 40px; text-align: center; }
.bar { flex: 1; height: 7px; border-radius: 100px; background: color-mix(in srgb, var(--color-text) 13%, transparent); position: relative; cursor: pointer; touch-action: none; }
.fill { position: absolute; left: 0; top: 0; bottom: 0; width: 0; border-radius: 100px; background: linear-gradient(90deg, var(--color-accent), var(--color-violet)); }
.fill::after { content: ""; position: absolute; right: -7px; top: 50%; width: 14px; height: 14px; border-radius: 50%; background: #fff; transform: translateY(-50%); box-shadow: 0 1px 5px rgba(0,0,0,.45); }
.speeds { display: flex; gap: 4px; flex: none; }
.speeds button {
  border: 1px solid var(--color-divider); background: transparent; color: var(--color-text-muted); border-radius: 8px;
  padding: 5px 8px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; min-width: 32px;
}
.speeds button.on { color: #fff; background: var(--color-accent); border-color: transparent; }

@media (max-width: 480px) {
  .player { gap: 10px; padding: 9px 12px; }
  .speeds button { padding: 5px 6px; min-width: 28px; font-size: 11px; }
  .time { min-width: 34px; font-size: 11.5px; }
}
`;

Object.assign(__x, { styles });

};

__m["js/components/ui/flight-player/flight-player.js"] = function (__x, __req) {
const { DjiElement } = __req("js/core/DjiElement.js");
const { mmss } = __req("js/geo.js");
const { t } = __req("js/i18n/index.js");
const { styles } = __req("js/components/ui/flight-player/flight-player.css.js");

/**
 * Barra de reproducción del vuelo (flotante). Recibe el reloj por propiedad:
 *   el.clock = playerClock
 * y traduce sus acciones (play/pausa, buscar, velocidad) al reloj.
 */
class FlightPlayer extends DjiElement {
  static styles = [styles];

  /** @param {import('../../../core/player-clock.js').PlayerClock} c */
  set clock(c) { this._clock = c; if (this.isConnected) this._paint(); }
  get clock() { return this._clock; }

  /** @param {HTMLVideoElement|null} v miniatura de vídeo sincronizada (opcional) */
  set video(v) { this._video = v; if (this.isConnected) this._mountVideo(); }
  get video() { return this._video; }

  render() {
    this.shadowRoot.innerHTML = `
      <div class="stack">
        <div class="pip" id="pip"></div>
        <div class="player">
          <button class="play" id="play" type="button" aria-label="${t('player.play')}">▶</button>
          <span class="time" id="cur">0:00</span>
          <div class="bar" id="bar" role="slider" aria-label="${t('player.seek')}"><div class="fill" id="fill"></div></div>
          <span class="time" id="tot">0:00</span>
          <div class="speeds">
            <button data-sp="1" type="button">1×</button>
            <button data-sp="2" type="button">2×</button>
            <button data-sp="4" type="button">4×</button>
          </div>
        </div>
      </div>`;
  }

  _mountVideo() {
    const pip = this.$('#pip');
    if (!pip) return;
    if (this._video) {
      if (this._video.parentElement !== pip) pip.appendChild(this._video);
      pip.classList.add('on');
    } else {
      pip.classList.remove('on');
    }
  }

  afterRender() {
    this._mountVideo();
    const c = this._clock;
    if (!c) return;
    this.$('#tot').textContent = mmss(c.dur);
    this.on(this.$('#play'), 'click', () => c.toggle());
    this.$$('[data-sp]').forEach((b) => this.on(b, 'click', () => c.setSpeed(+b.dataset.sp)));

    const bar = this.$('#bar');
    const seekFromX = (x) => { const r = bar.getBoundingClientRect(); c.seek(Math.max(0, Math.min(1, (x - r.left) / r.width)) * c.dur); };
    this.on(bar, 'pointerdown', (e) => { bar.setPointerCapture(e.pointerId); this._drag = true; c.pause(); seekFromX(e.clientX); });
    this.on(bar, 'pointermove', (e) => { if (this._drag) seekFromX(e.clientX); });
    this.on(bar, 'pointerup', () => { this._drag = false; });

    // suscripción única al reloj (sobrevive a los re-render de i18n)
    if (!this._subbed) {
      this._subbed = true;
      const sync = () => this._sync();
      c.addEventListener('tick', sync);
      c.addEventListener('state', sync);
    }
    this._sync();
  }

  _sync() {
    const c = this._clock;
    if (!c || !this.isConnected) return;
    const f = c.dur ? c.t / c.dur : 0;
    const fill = this.$('#fill'); if (fill) fill.style.width = (f * 100) + '%';
    const cur = this.$('#cur'); if (cur) cur.textContent = mmss(c.t);
    const play = this.$('#play'); if (play) { play.textContent = c.playing ? '❚❚' : '▶'; play.setAttribute('aria-label', t(c.playing ? 'player.pause' : 'player.play')); }
    this.$$('[data-sp]').forEach((b) => b.classList.toggle('on', +b.dataset.sp === c.speed));
  }
}

customElements.define('flight-player', FlightPlayer);

Object.assign(__x, { FlightPlayer });

};

__m["js/components/ui/image-lightbox/image-lightbox.css.js"] = function (__x, __req) {
const { css } = __req("js/core/css.js");

const styles = css`
:host {
  position: fixed; inset: 0; z-index: 2147483000; display: none; place-items: center; padding: 34px 24px 60px;
  background: rgba(6, 7, 10, .92); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
}
:host([open]) { display: grid; animation: fade .18s ease; }
@keyframes fade { from { opacity: 0; } }
figure { margin: 0; display: flex; flex-direction: column; gap: 16px; align-items: center; max-width: min(1100px, 94vw); }
img { max-width: 100%; max-height: 70vh; border-radius: 14px; box-shadow: var(--shadow-lg); object-fit: contain; animation: pop .22s cubic-bezier(.22,1,.36,1); }
@keyframes pop { from { opacity: 0; transform: scale(.96); } }
figcaption { color: #e8eaf0; font-size: 14px; display: flex; gap: 10px; align-items: baseline; justify-content: center; flex-wrap: wrap; }
.cap-time { background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.2); border-radius: 100px; padding: 3px 10px; font-size: 12px; font-weight: 700; }
.cap-metric { font-weight: 800; font-size: 18px; color: #fff; }
.dlrow { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: center; margin-top: 6px; }
.dllabel { color: rgba(255,255,255,.7); font-size: 13px; }
.dl {
  display: inline-flex; align-items: center; gap: 7px; color: var(--color-text); border-radius: 100px; padding: 10px 18px; font-size: 13px;
  font-weight: 700; cursor: pointer; font-family: inherit; min-width: 66px; justify-content: center;
  border: 1px solid color-mix(in srgb, var(--color-text) 20%, transparent);
  background: linear-gradient(165deg,
    color-mix(in srgb, var(--color-surface-solid) 82%, transparent),
    color-mix(in srgb, var(--color-surface-solid) 58%, transparent) 55%,
    color-mix(in srgb, var(--color-surface-solid) 46%, transparent));
  backdrop-filter: blur(14px) saturate(1.4); -webkit-backdrop-filter: blur(14px) saturate(1.4);
  box-shadow: 0 6px 18px rgba(0,0,0,.3), inset 0 1px 1px color-mix(in srgb, #fff 40%, transparent);
  transition: transform .14s cubic-bezier(.22,1,.36,1), box-shadow .14s, border-color .14s, background .14s;
}
.dl small { font-weight: 500; opacity: .7; }
.dl:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--color-accent) 55%, transparent);
  box-shadow: 0 10px 26px rgba(0,0,0,.38), inset 0 1px 1px color-mix(in srgb, #fff 50%, transparent), 0 0 0 4px color-mix(in srgb, var(--color-accent) 15%, transparent);
}
.dl:disabled { opacity: .6; cursor: default; transform: none; box-shadow: none; }

/* botones esféricos glass tintados con el fondo de la app (se adaptan a claro/oscuro) */
.close, .nav {
  position: fixed; cursor: pointer; color: var(--color-text); border-radius: 50%; display: grid; place-items: center; padding: 0;
  border: 1px solid color-mix(in srgb, var(--color-text) 22%, transparent);
  background: linear-gradient(160deg,
    color-mix(in srgb, var(--color-surface-solid) 82%, transparent),
    color-mix(in srgb, var(--color-surface-solid) 56%, transparent) 50%,
    color-mix(in srgb, var(--color-surface-solid) 42%, transparent));
  backdrop-filter: blur(20px) saturate(1.5); -webkit-backdrop-filter: blur(20px) saturate(1.5);
  box-shadow: 0 10px 30px rgba(0,0,0,.4), inset 0 1.5px 1px color-mix(in srgb, #fff 42%, transparent), inset 0 -8px 16px rgba(0,0,0,.16);
  transition: transform .2s cubic-bezier(.22,1,.36,1), box-shadow .2s, border-color .2s, background .2s;
}
.close svg, .nav svg { width: 42%; height: 42%; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; filter: drop-shadow(0 1px 1px rgba(0,0,0,.25)); }
.close:hover, .nav:hover {
  border-color: color-mix(in srgb, var(--color-accent) 60%, transparent);
  background: linear-gradient(160deg,
    color-mix(in srgb, var(--color-surface-solid) 92%, transparent),
    color-mix(in srgb, var(--color-surface-solid) 64%, transparent) 55%,
    color-mix(in srgb, var(--color-surface-solid) 48%, transparent));
  box-shadow: 0 14px 38px rgba(0,0,0,.48), inset 0 1.5px 1px color-mix(in srgb, #fff 55%, transparent), 0 0 0 5px color-mix(in srgb, var(--color-accent) 16%, transparent);
}
.close { top: 20px; right: 20px; width: 46px; height: 46px; }
.close:hover { transform: scale(1.07); }
.close:active { transform: scale(.94); }
.nav { top: 50%; transform: translateY(-50%); width: 58px; height: 58px; }
.nav:hover { transform: translateY(-50%) scale(1.08); }
.nav:active { transform: translateY(-50%) scale(.94); }
.nav.prev { left: 22px; }
.nav.next { right: 22px; }
.nav[hidden] { display: none; }

.count {
  color: var(--color-text); font-size: 12.5px; font-weight: 700; letter-spacing: .05em; font-variant-numeric: tabular-nums; order: -1;
  border: 1px solid color-mix(in srgb, var(--color-text) 22%, transparent); border-radius: 100px; padding: 5px 14px;
  background: linear-gradient(165deg, color-mix(in srgb, var(--color-surface-solid) 78%, transparent), color-mix(in srgb, var(--color-surface-solid) 48%, transparent));
  backdrop-filter: blur(14px) saturate(1.4); -webkit-backdrop-filter: blur(14px) saturate(1.4);
  box-shadow: 0 4px 14px rgba(0,0,0,.28), inset 0 1px 1px color-mix(in srgb, #fff 40%, transparent);
}
.count:empty { display: none; }
@media (max-width: 560px) {
  .nav { width: 48px; height: 48px; }
  .nav.prev { left: 10px; } .nav.next { right: 10px; }
  .close { width: 42px; height: 42px; top: 14px; right: 14px; }
}
@media (prefers-reduced-motion: reduce) { .close, .nav, .dl { transition: none; } }
`;

Object.assign(__x, { styles });

};

__m["js/components/ui/image-lightbox/image-lightbox.js"] = function (__x, __req) {
const { DjiElement } = __req("js/core/DjiElement.js");
const { escapeHtml } = __req("js/core/escape-html.js");
const { t } = __req("js/i18n/index.js");
const { downloadBlob } = __req("js/exports.js");
const { grabFullFrame } = __req("js/frames.js");
const { styles } = __req("js/components/ui/image-lightbox/image-lightbox.css.js");

/**
 * Visor de imagen a pantalla completa, en modo galería por bloques.
 * Se abre con open(items, index, meta):
 *   items = [{ src, label?, time?, metric?, secs? }]  (las imágenes del bloque)
 *   index = posición inicial
 *   meta  = { title?, mp4File? }  (comunes: para nombre de archivo y re-extracción 4K)
 * Las flechas ‹ › (o ←/→) recorren solo las imágenes de ese bloque.
 */
class ImageLightbox extends DjiElement {
  static styles = [styles];

  constructor() {
    super();
    this._key = (e) => {
      if (e.key === 'Escape') this.close();
      else if (e.key === 'ArrowRight') this._go(1);
      else if (e.key === 'ArrowLeft') this._go(-1);
    };
  }

  render() {
    this.setAttribute('role', 'dialog');
    this.setAttribute('aria-modal', 'true');
    this.shadowRoot.innerHTML = `
      <button class="close" id="x" aria-label="${escapeHtml(t('lightbox.close'))}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
      <button class="nav prev" id="prev" aria-label="${escapeHtml(t('lightbox.prev'))}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>
      </button>
      <button class="nav next" id="next" aria-label="${escapeHtml(t('lightbox.next'))}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>
      </button>
      <figure>
        <img id="img" src="" alt="">
        <span class="count" id="count"></span>
        <figcaption id="cap"></figcaption>
        <div class="dlrow">
          <span class="dllabel">⤓ ${escapeHtml(t('lightbox.download'))}</span>
          <button class="dl" data-fmt="jpg" type="button">JPG</button>
          <button class="dl" data-fmt="png" type="button">PNG <small>${escapeHtml(t('lightbox.lossless'))}</small></button>
        </div>
      </figure>`;
  }

  afterRender() {
    this.on(this, 'click', (e) => { if (e.target === this) this.close(); });
    this.on(this.$('#x'), 'click', () => this.close());
    this.on(this.$('#prev'), 'click', () => this._go(-1));
    this.on(this.$('#next'), 'click', () => this._go(1));
    this.$$('.dl').forEach((b) => this.on(b, 'click', () => this._download(b.dataset.fmt)));
  }

  /** @param {'jpg'|'png'} fmt */
  async _download(fmt) {
    if (!this._src) return;
    const btns = this.$$('.dl');
    const clicked = this.$(`.dl[data-fmt="${fmt}"]`);
    const prev = clicked.innerHTML;
    btns.forEach((b) => (b.disabled = true));
    try {
      // resolución nativa; PNG sin pérdidas o JPG de alta calidad
      if (this._full) {
        clicked.textContent = '…';
        try {
          const type = fmt === 'png' ? 'image/png' : 'image/jpeg';
          const blob = await grabFullFrame(this._full.file, this._full.secs, type, fmt === 'jpg' ? 0.95 : undefined);
          downloadBlob(this._nameBase + '.' + fmt, blob);
          return;
        } catch (e) {
          console.warn('Re-extracción falló; se descarga el fotograma visible.', e);
        }
      }
      // respaldo: descarga el fotograma que se muestra (JPG)
      const blob = await (await fetch(this._src)).blob();
      downloadBlob(this._nameBase + '.jpg', blob);
    } catch (e) {
      console.error(e);
    } finally {
      btns.forEach((b) => (b.disabled = false));
      clicked.innerHTML = prev;
    }
  }

  /**
   * @param {Array<{src:string,label?:string,time?:string,metric?:string,secs?:number}>|string} items
   * @param {number} [index]
   * @param {{title?:string, mp4File?:File}} [meta]
   */
  open(items, index = 0, meta = {}) {
    if (typeof items === 'string') items = [{ src: items, ...meta }]; // compat: una sola imagen
    this._items = (items || []).filter((it) => it && it.src);
    if (!this._items.length) return;
    this._meta = meta;
    this._i = Math.max(0, Math.min(index, this._items.length - 1));
    this.setAttribute('open', '');
    this._show();
    document.addEventListener('keydown', this._key);
  }

  /** Recorre la galería (circular). */
  _go(d) {
    if (!this._items || this._items.length < 2) return;
    const n = this._items.length;
    this._i = (this._i + d + n) % n;
    this._show();
  }

  /** Pinta la imagen actual y actualiza pie, contador y flechas. */
  _show() {
    const it = this._items[this._i];
    this._src = it.src;
    this._full = (this._meta.mp4File && it.secs != null) ? { file: this._meta.mp4File, secs: +it.secs } : null;
    const base = [this._meta.title, it.label, it.time].filter(Boolean).join(' - ') || 'fotograma';
    this._nameBase = base.replace(/:/g, '-').replace(/[/\\?%*|"<>]/g, '').trim();
    const img = this.$('#img');
    img.src = it.src; img.alt = it.label || '';
    this.$('#cap').innerHTML = `${it.time ? `<span class="cap-time">${escapeHtml(it.time)}</span>` : ''}`
      + `${it.metric ? `<span class="cap-metric">${escapeHtml(it.metric)}</span>` : ''}`
      + `${it.label ? `<span>${escapeHtml(it.label)}</span>` : ''}`;
    const many = this._items.length > 1;
    this.$('#prev').hidden = !many;
    this.$('#next').hidden = !many;
    this.$('#count').textContent = many ? `${this._i + 1} / ${this._items.length}` : '';
  }

  close() {
    this.removeAttribute('open');
    this.$('#img').src = '';
    document.removeEventListener('keydown', this._key);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this._key);
  }
}

customElements.define('image-lightbox', ImageLightbox);

Object.assign(__x, { ImageLightbox });

};

__m["js/components/ui/moment-card/moment-card.css.js"] = function (__x, __req) {
const { css } = __req("js/core/css.js");

const styles = css`
:host { display: block; }
.mo {
  background: var(--color-surface); border: 1px solid var(--color-divider); border-radius: 16px; overflow: hidden;
  transition: transform .16s, box-shadow .16s; height: 100%;
  &:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
}
.img { position: relative; aspect-ratio: 16/9; background: #000; overflow: hidden; }
.img img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .3s ease; }
.img.clickable { cursor: zoom-in; }
.img.clickable::after {
  content: "⤢"; position: absolute; top: 8px; right: 9px; width: 26px; height: 26px; display: grid; place-items: center;
  border-radius: 8px; background: rgba(0,0,0,.5); color: #fff; font-size: 14px; opacity: 0; pointer-events: none;
  backdrop-filter: blur(4px); transition: opacity .15s;
}
.mo:hover .img.clickable::after { opacity: 1; }
.mo:hover .img.clickable img { transform: scale(1.04); }
.ph {
  width: 100%; height: 100%; display: grid; place-items: center;
  background: linear-gradient(135deg, var(--color-tile), color-mix(in srgb, var(--color-violet) 10%, var(--color-surface-solid)));
}
.ph .ico { font-size: 22px; opacity: .5; }
.t {
  position: absolute; left: 9px; bottom: 9px; background: rgba(0,0,0,.6); color: #fff; font-size: 12px; font-weight: 700;
  padding: 3px 9px; border-radius: 100px; backdrop-filter: blur(4px);
}
.cap { padding: 12px 14px 14px; }
.label { font-size: 12px; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: .05em; }
.metric { font-size: 19px; font-weight: 800; margin-top: 3px; letter-spacing: -.01em; }
.sub { font-size: 12px; color: color-mix(in srgb, var(--color-text) 74%, transparent); margin-top: 1px; }
`;

Object.assign(__x, { styles });

};

__m["js/components/ui/moment-card/moment-card.js"] = function (__x, __req) {
const { DjiElement } = __req("js/core/DjiElement.js");
const { escapeHtml } = __req("js/core/escape-html.js");
const { styles } = __req("js/components/ui/moment-card/moment-card.css.js");

/** Tarjeta de un momento del vuelo. Atributos: time, label, metric, sub; propiedad .img (dataURL). */
class MomentCard extends DjiElement {
  static styles = [styles];
  static observedAttributes = ['time', 'label', 'metric', 'sub'];

  attributeChangedCallback() { if (this.isConnected) this._paint(); }

  render() {
    const img = this.img || this.getAttribute('img');
    this.shadowRoot.innerHTML = `
      <div class="mo">
        <div class="img${img ? ' clickable' : ''}">
          ${img ? `<img src="${img}" alt="${escapeHtml(this.getAttribute('label'))}">` : `<div class="ph"><span class="ico">🎞️</span></div>`}
          <span class="t">${escapeHtml(this.getAttribute('time'))}</span>
        </div>
        <div class="cap">
          <div class="label">${escapeHtml(this.getAttribute('label'))}</div>
          <div class="metric">${escapeHtml(this.getAttribute('metric'))}</div>
          <div class="sub">${escapeHtml(this.getAttribute('sub'))}</div>
        </div>
      </div>`;
  }

  afterRender() {
    const img = this.img || this.getAttribute('img');
    const box = this.$('.img.clickable');
    if (img && box) {
      box.setAttribute('role', 'button');
      box.setAttribute('tabindex', '0');
      const open = () => this.emit('moment:open', {
        img, time: this.getAttribute('time'), metric: this.getAttribute('metric'),
        label: this.getAttribute('label'), secs: this.getAttribute('secs'),
      });
      this.on(box, 'click', open);
      this.on(box, 'keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    }
  }
}

customElements.define('moment-card', MomentCard);

Object.assign(__x, { MomentCard });

};

__m["js/components/ui/reading-nav/reading-nav.css.js"] = function (__x, __req) {
const { css } = __req("js/core/css.js");

const styles = css`
:host { position: fixed; inset: 0; z-index: 35; pointer-events: none; }

/* barra de progreso de lectura (arriba del todo) */
.bar { position: fixed; top: 0; left: 0; right: 0; height: 3px; background: transparent; }
.bar > i {
  display: block; height: 100%; width: 100%; transform: scaleX(0); transform-origin: left center;
  background: linear-gradient(90deg, var(--color-accent-2), var(--color-accent), var(--color-violet));
  box-shadow: 0 0 12px color-mix(in srgb, var(--color-accent) 55%, transparent);
}

/* mini-nav de secciones (lateral derecho) */
.dots {
  position: fixed; right: 16px; top: 50%; transform: translateY(-50%);
  display: flex; flex-direction: column; gap: 12px; pointer-events: auto;
}
.dot {
  position: relative; width: 11px; height: 11px; padding: 0; border-radius: 50%; cursor: pointer;
  border: 1.5px solid color-mix(in srgb, var(--color-text) 42%, transparent); background: transparent;
  transition: transform .18s, border-color .18s, background .18s;
}
.dot:hover { transform: scale(1.25); border-color: var(--color-accent); }
.dot.on {
  background: var(--color-accent); border-color: var(--color-accent);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-accent) 18%, transparent);
}
.dot .tip {
  position: absolute; right: 22px; top: 50%; transform: translateY(-50%) translateX(6px);
  white-space: nowrap; font-size: 12px; font-weight: 600; color: #fff; background: rgba(20,22,28,.92);
  border: 1px solid rgba(255,255,255,.12); padding: 4px 9px; border-radius: 8px;
  opacity: 0; pointer-events: none; transition: opacity .15s, transform .15s; box-shadow: var(--shadow-lg);
}
.dot:hover .tip, .dot.on .tip { opacity: 1; transform: translateY(-50%) translateX(0); }

@media (max-width: 1180px) { .dots { display: none; } }
@media (prefers-reduced-motion: reduce) { .dot, .dot .tip { transition: none; } }
`;

Object.assign(__x, { styles });

};

__m["js/components/ui/reading-nav/reading-nav.js"] = function (__x, __req) {
const { DjiElement } = __req("js/core/DjiElement.js");
const { escapeHtml } = __req("js/core/escape-html.js");
const { styles } = __req("js/components/ui/reading-nav/reading-nav.css.js");

/**
 * Barra de progreso de lectura (arriba) + mini-nav de secciones (lateral).
 * Se le pasa el objetivo por propiedad:
 *   el.target = { scroller: <flight-report>, items: [{ label, el }] }
 */
class ReadingNav extends DjiElement {
  static styles = [styles];

  set target(v) { this._t = v; if (this.isConnected) this._paint(); }
  get target() { return this._t; }

  render() {
    const items = this._t?.items || [];
    this.shadowRoot.innerHTML = `
      <div class="bar"><i></i></div>
      <nav class="dots" aria-label="Secciones">
        ${items.map((it, i) => `<button class="dot" data-i="${i}"><span class="tip">${escapeHtml(it.label)}</span></button>`).join('')}
      </nav>`;
  }

  afterRender() {
    if (!this._t) return;
    this._bar = this.$('.bar > i');
    this._dots = this.$$('.dot');
    const smooth = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    this._dots.forEach((d, i) => this.on(d, 'click', () =>
      this._t.items[i].el.scrollIntoView({ behavior: smooth, block: 'start' })));
    const onScroll = () => {
      if (this._raf) return;
      this._raf = requestAnimationFrame(() => { this._raf = 0; this._update(); });
    };
    this.on(window, 'scroll', onScroll, { passive: true });
    this.on(window, 'resize', onScroll, { passive: true });
    this._update();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._raf) cancelAnimationFrame(this._raf);
  }

  /** Actualiza el progreso y resalta la sección activa (barato, en rAF). */
  _update() {
    const { scroller, items } = this._t;
    const total = scroller.offsetHeight - innerHeight;
    const scrolled = -scroller.getBoundingClientRect().top;
    const p = total > 0 ? Math.max(0, Math.min(1, scrolled / total)) : 0;
    if (this._bar) this._bar.style.transform = `scaleX(${p})`;
    const line = innerHeight * 0.3;
    let active = 0;
    items.forEach((it, i) => { if (it.el.getBoundingClientRect().top - line <= 0) active = i; });
    this._dots.forEach((d, i) => d.classList.toggle('on', i === active));
  }
}

customElements.define('reading-nav', ReadingNav);

Object.assign(__x, { ReadingNav });

};

__m["js/components/ui/sat-map/sat-map.css.js"] = function (__x, __req) {
const { css } = __req("js/core/css.js");

const styles = css`
:host { display: block; }
/* Llena el bloque a lo ancho y se limita por alto (74vh) sin deformar. */
.map-wrap { position: relative; width: min(100%, calc(74vh * var(--ar, 1.5))); margin: 0 auto; border-radius: 14px; overflow: hidden; }
.map-svg { border-radius: 14px; display: block; width: 100%; height: auto; }
.map-wrap.loading::before {
  content: ""; position: absolute; inset: 0; z-index: 2; border-radius: 14px;
  background: linear-gradient(100deg, var(--color-tile) 30%, color-mix(in srgb, var(--color-text) 8%, var(--color-tile)) 50%, var(--color-tile) 70%);
  background-size: 220% 100%; animation: shimmer 1.3s ease-in-out infinite;
}
.map-loading { position: absolute; inset: 0; z-index: 3; display: grid; place-items: center; color: var(--color-text-muted); font-size: 13px; }
.map-wrap:not(.loading) .map-loading { display: none; }
@keyframes shimmer { 0% { background-position: 130% 0; } 100% { background-position: -130% 0; } }
@media (prefers-reduced-motion: reduce) { .map-wrap.loading::before { animation: none; } }

.kp-overlay { position: absolute; inset: 0; pointer-events: none; }
.kp-btn { position: absolute; width: 42px; height: 42px; margin: -21px 0 0 -21px; border: none; background: transparent; cursor: pointer; pointer-events: auto; }
.kp-tip {
  position: absolute; left: 50%; bottom: calc(100% - 12px); transform: translateX(-50%); width: 184px;
  background: var(--color-surface-solid); border: 1px solid var(--color-divider); border-radius: 12px; overflow: hidden;
  box-shadow: var(--shadow-lg); opacity: 0; visibility: hidden; transition: opacity .12s; z-index: 9;
}
.kp-tip.left { left: auto; right: calc(50% - 21px); transform: none; }
.kp-tip.right { left: calc(50% - 21px); transform: none; }
.kp-tip img { width: 100%; display: block; aspect-ratio: 16/9; object-fit: cover; }
.kp-b { display: block; padding: 8px 11px; }
.kp-l { display: block; font-size: 12.5px; font-weight: 700; }
.kp-m { display: block; font-size: 11.5px; color: color-mix(in srgb, var(--color-text) 74%, transparent); margin-top: 1px; }
.kp-btn:hover .kp-tip, .kp-btn:focus .kp-tip { opacity: 1; visibility: visible; }
`;

Object.assign(__x, { styles });

};

__m["js/components/ui/sat-map/sat-map.js"] = function (__x, __req) {
const { DjiElement } = __req("js/core/DjiElement.js");
const { buildMap } = __req("js/satmap.js");
const { t } = __req("js/i18n/index.js");
const { styles } = __req("js/components/ui/sat-map/sat-map.css.js");

/**
 * Mapa de satélite con el recorrido. Recibe los datos por propiedad:
 *   el.flight = { model, kps }
 */
class SatMap extends DjiElement {
  static styles = [styles];

  /** @param {{model:object, kps:Array}} v */
  set flight(v) { this._flight = v; if (this.isConnected) this._paint(); }
  get flight() { return this._flight; }

  render() { this.shadowRoot.innerHTML = `<div id="slot"></div>`; }

  afterRender() {
    const f = this._flight;
    if (!f) return;
    this._map = buildMap(f.model, f.kps, t('map.loading'));
    this.$('#slot').replaceChildren(this._map.el);
    this._setupTrackReveal();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._trackIO?.disconnect(); this._trackIO = null;
    clearTimeout(this._trackSafety);
  }

  /** Dibuja el recorrido (draw-in) cuando el mapa entra en pantalla. */
  _setupTrackReveal() {
    this._trackIO?.disconnect(); this._trackIO = null;
    clearTimeout(this._trackSafety);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window) || !this._map.armTrack) return; // track visible tal cual
    this._map.armTrack(); // ocultar hasta que entre en pantalla
    let played = false;
    const play = () => {
      if (played) return; played = true;
      this._trackIO?.disconnect(); this._trackIO = null;
      clearTimeout(this._trackSafety);
      this._map.playTrack();
    };
    this._trackIO = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) play(); }, { threshold: 0.35 });
    this._trackIO.observe(this);
    this._trackSafety = setTimeout(play, 4500); // salvavidas si el observer no dispara
  }

  /** Mueve el dron al instante t (reproducción). */
  playhead(t) { this._map && this._map.setPlayhead(t); }

  /** Esconde el dron. */
  clearPlayhead() { this._map && this._map.clearPlayhead(); }
}

customElements.define('sat-map', SatMap);

Object.assign(__x, { SatMap });

};

__m["js/components/ui/stat-tile/stat-tile.css.js"] = function (__x, __req) {
const { css } = __req("js/core/css.js");

const styles = css`
:host { display: block; }
.tile {
  background: var(--color-surface); border: 1px solid var(--color-divider); border-radius: 16px; padding: 18px;
  backdrop-filter: blur(10px); transition: transform .16s, border-color .16s; height: 100%;
  &:hover { transform: translateY(-3px); border-color: color-mix(in srgb, var(--color-text) 16%, transparent); }
}
.v { font-size: 30px; font-weight: 820; line-height: 1; letter-spacing: -.02em; }
.v small { font-size: 15px; font-weight: 600; color: color-mix(in srgb, var(--color-text) 74%, transparent); }
.l { font-size: 12px; color: var(--color-text-muted); margin-top: 9px; text-transform: uppercase; letter-spacing: .05em; }
.k { font-size: 12.5px; color: color-mix(in srgb, var(--color-text) 74%, transparent); margin-top: 3px; }

:host([hero]) .tile {
  background: color-mix(in srgb, #0a0b0f 55%, transparent); border-color: var(--color-divider);
  backdrop-filter: blur(12px); padding: 14px 20px; border-radius: 16px;
  &:hover { transform: none; }
}
:host([hero]) .v { font-size: 27px; color: #fff; }
:host([hero]) .v small { font-size: 14px; color: rgba(255,255,255,.72); }
:host([hero]) .l { color: #c7ccd6; font-size: 11px; margin-top: 6px; }
`;

Object.assign(__x, { styles });

};

__m["js/components/ui/stat-tile/stat-tile.js"] = function (__x, __req) {
const { DjiElement } = __req("js/core/DjiElement.js");
const { escapeHtml } = __req("js/core/escape-html.js");
const { getLang } = __req("js/i18n/index.js");
const { styles } = __req("js/components/ui/stat-tile/stat-tile.css.js");

/** Una cifra con su rótulo y pista. Atributos: value, unit, label, hint, [hero]. */
class StatTile extends DjiElement {
  static styles = [styles];
  static observedAttributes = ['value', 'unit', 'label', 'hint'];

  attributeChangedCallback() { if (this.isConnected) this._paint(); }

  connectedCallback() {
    super.connectedCallback();
    this._setupCounter();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._io?.disconnect(); this._io = null;
  }

  render() {
    const unit = this.getAttribute('unit');
    const hint = this.getAttribute('hint');
    this.shadowRoot.innerHTML = `
      <div class="tile">
        <div class="v">${escapeHtml(this.getAttribute('value'))}${unit ? ` <small>${escapeHtml(unit)}</small>` : ''}</div>
        <div class="l">${escapeHtml(this.getAttribute('label'))}</div>
        ${hint ? `<div class="k">${escapeHtml(hint)}</div>` : ''}
      </div>`;
  }

  /** Prepara el contador ascendente: se dispara una vez al entrar en pantalla. */
  _setupCounter() {
    if (this._io || this._counted) return;
    const spec = this._counterSpec(this.getAttribute('value') || '');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!spec || reduce || !('IntersectionObserver' in window)) return; // muestra el valor tal cual
    this._io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        this._io.disconnect(); this._io = null;
        this._runCount(spec);
      }
    }, { threshold: 0.4 });
    this._io.observe(this);
  }

  /**
   * Analiza el valor formateado y decide si es un número animable.
   * Ignora tiempos (`5:31`) y rangos (`859–870`). Devuelve {target, dec, original} o null.
   */
  _counterSpec(raw) {
    const s = String(raw).trim();
    if (!s || /:/.test(s) || /\d\s*[–—-]\s*\d/.test(s)) return null;
    const decIdx = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'));
    let dec = 0, norm;
    if (decIdx > -1) {
      const after = s.length - decIdx - 1;
      if (after >= 1 && after <= 2) { // separador decimal
        dec = after;
        norm = s.slice(0, decIdx).replace(/[.,\s]/g, '') + '.' + s.slice(decIdx + 1);
      } else { // agrupador de miles
        norm = s.replace(/[.,\s]/g, '');
      }
    } else {
      norm = s.replace(/[.,\s]/g, '');
    }
    const target = parseFloat(norm);
    if (!isFinite(target)) return null;
    return { target, dec, original: s };
  }

  /** Cuenta de 0 al valor con easeOut; el último fotograma fija el texto exacto original. */
  _runCount(spec) {
    this._counted = true;
    const vEl = this.shadowRoot.querySelector('.v');
    if (!vEl) return;
    const unit = this.getAttribute('unit');
    const suffix = unit ? ` <small>${escapeHtml(unit)}</small>` : '';
    const locale = getLang() === 'es' ? 'es-ES' : 'en-US';
    const fmt = (n) => n.toLocaleString(locale, { minimumFractionDigits: spec.dec, maximumFractionDigits: spec.dec });
    const dur = 1100, t0 = performance.now();
    const ease = (x) => 1 - Math.pow(1 - x, 3);
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      vEl.innerHTML = escapeHtml(fmt(spec.target * ease(p))) + suffix;
      if (p < 1) requestAnimationFrame(step);
      else vEl.innerHTML = escapeHtml(spec.original) + suffix; // estado final exacto
    };
    requestAnimationFrame(step);
  }
}

customElements.define('stat-tile', StatTile);

Object.assign(__x, { StatTile });

};

__m["js/components/ui/time-chart/time-chart.css.js"] = function (__x, __req) {
const { css } = __req("js/core/css.js");

const styles = css`
:host { display: block; }
.chartbox { position: relative; }
svg { display: block; width: 100%; height: auto; overflow: visible; }
.chart .grid { stroke: var(--grid); stroke-width: 1; fill: none; }
.chart .grid-0 { stroke-width: 1.2; }
.chart .axlbl { font-size: 11px; fill: var(--color-text-muted); }
.chart .series-line { stroke-width: 2.4; }
.chart .crosshair { stroke: var(--color-text-muted); stroke-width: 1.4; }
.chart .cdot { stroke: var(--color-bg); stroke-width: 2; }
.chart-tip {
  position: absolute; top: 8px; transform: translateX(-50%); background: var(--color-surface-solid); color: var(--color-text);
  border: 1px solid var(--color-divider); font-size: 12.5px; font-weight: 600; line-height: 1.55; padding: 8px 11px; border-radius: 10px;
  white-space: nowrap; opacity: 0; pointer-events: none; box-shadow: var(--shadow-lg); z-index: 6;
}
.chart-tip.flip { transform: translateX(-100%); }
.chart-tip i { display: inline-block; width: 9px; height: 9px; border-radius: 2px; margin-right: 6px; vertical-align: middle; }
`;

Object.assign(__x, { styles });

};

__m["js/components/ui/time-chart/time-chart.js"] = function (__x, __req) {
const { DjiElement } = __req("js/core/DjiElement.js");
const { timeChart } = __req("js/charts.js");
const { styles } = __req("js/components/ui/time-chart/time-chart.css.js");

/**
 * Gráfica de series temporales. Recibe los datos por propiedad:
 *   el.data = { series, dur, cfgs }
 */
class TimeChart extends DjiElement {
  static styles = [styles];

  /** @param {{series:Array, dur:number, cfgs:Array}} v */
  set data(v) { this._data = v; if (this.isConnected) this._paint(); }
  get data() { return this._data; }

  render() {
    this.shadowRoot.innerHTML = `<div class="chartbox" id="box"></div>`;
  }

  afterRender() {
    const d = this._data;
    if (!d) return;
    this._chart = timeChart(this.$('#box'), d.series, d.dur, d.cfgs);
  }

  /** Coloca el cursor en el instante t (reproducción). */
  playhead(t) { this._chart && this._chart.showAtTime(t); }

  /** Esconde el cursor de reproducción. */
  clearPlayhead() { this._chart && this._chart.leave(); }
}

customElements.define('time-chart', TimeChart);

Object.assign(__x, { TimeChart });

};

__m["js/components/views/flight-report/flight-report.css.js"] = function (__x, __req) {
const { css } = __req("js/core/css.js");

const styles = css`
:host { display: block; animation: rise .6s cubic-bezier(.22,1,.36,1) both; padding-bottom: clamp(96px, 14vh, 140px); }
/* con vídeo, la miniatura (PiP) sube más: reserva algo más de hueco al final */
:host(.has-video) { padding-bottom: clamp(150px, 24vh, 240px); }
@keyframes rise { from { opacity: 0; transform: translateY(16px); } }
.wrap { max-width: var(--maxw); margin: 0 auto; padding: 0 24px; }

/* scroll-reveal: las secciones entran al aparecer en pantalla (la clase la pone reveal.js) */
section.blk.reveal { opacity: 0; transform: translateY(42px) scale(.985); transition: opacity .7s cubic-bezier(.22,1,.36,1), transform .7s cubic-bezier(.22,1,.36,1); will-change: opacity, transform; }
section.blk.reveal.in { opacity: 1; transform: none; }
/* cascada: dentro de una sección revelada, las tarjetas entran escalonadas */
section.blk.reveal .tiles > stat-tile,
section.blk.reveal .mos > moment-card { opacity: 0; transform: translateY(26px); transition: opacity .55s cubic-bezier(.22,1,.36,1), transform .55s cubic-bezier(.22,1,.36,1); }
section.blk.reveal.in .tiles > stat-tile,
section.blk.reveal.in .mos > moment-card { opacity: 1; transform: none; }
section.blk.reveal .tiles > *:nth-child(2), section.blk.reveal .mos > *:nth-child(2) { transition-delay: .05s; }
section.blk.reveal .tiles > *:nth-child(3), section.blk.reveal .mos > *:nth-child(3) { transition-delay: .10s; }
section.blk.reveal .tiles > *:nth-child(4), section.blk.reveal .mos > *:nth-child(4) { transition-delay: .15s; }
section.blk.reveal .tiles > *:nth-child(5), section.blk.reveal .mos > *:nth-child(5) { transition-delay: .20s; }
section.blk.reveal .tiles > *:nth-child(6), section.blk.reveal .mos > *:nth-child(6) { transition-delay: .25s; }
section.blk.reveal .tiles > *:nth-child(7), section.blk.reveal .mos > *:nth-child(7) { transition-delay: .30s; }
section.blk.reveal .tiles > *:nth-child(8), section.blk.reveal .mos > *:nth-child(8) { transition-delay: .35s; }
@media (prefers-reduced-motion: reduce) {
  section.blk.reveal,
  section.blk.reveal .tiles > stat-tile,
  section.blk.reveal .mos > moment-card { opacity: 1; transform: none; transition: none; }
}

/* portada */
.r-hero { position: relative; min-height: clamp(440px, 66vh, 640px); display: flex; flex-direction: column; justify-content: flex-end;
  padding: 0 0 44px; overflow: hidden; border-bottom: 1px solid var(--color-divider); }
.r-hero .bg { position: absolute; inset: 0; background-size: cover; background-position: center 40%; }
.r-hero .bg.gradient { background: radial-gradient(120% 120% at 20% 10%, var(--color-accent), transparent 55%),
  radial-gradient(120% 120% at 90% 20%, var(--color-violet), transparent 55%), linear-gradient(160deg, #0b1220, #0a0b0f); }
.r-hero .scrim { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(6,7,10,.15) 0%, rgba(6,7,10,.45) 50%, rgba(6,7,10,.92) 100%); }
.r-hero .inner { position: relative; max-width: var(--maxw); margin: 0 auto; padding: 0 24px; width: 100%; }
.r-hero .kick { display: inline-flex; align-items: center; gap: 9px; text-transform: uppercase; letter-spacing: .2em; font-size: 11.5px;
  font-weight: 700; color: #fff; background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.2); padding: 7px 14px; border-radius: 100px; backdrop-filter: blur(6px); }
.r-hero h1 { font-size: clamp(36px, 6.5vw, 72px); font-weight: 850; line-height: 1.03; margin: 20px 0 12px; color: #fff; text-shadow: 0 2px 30px rgba(0,0,0,.5); letter-spacing: -.02em; }
.r-hero .lede { font-size: clamp(15px, 2vw, 19px); color: #e8eaf0; max-width: 60ch; margin: 0 0 26px; text-shadow: 0 1px 12px rgba(0,0,0,.5); }
.hstats { display: flex; flex-wrap: wrap; gap: 14px; }
.hstats stat-tile { min-width: 118px; }
.hmeta { margin-top: 22px; font-size: 13px; color: #d4d7de; display: flex; gap: 20px; flex-wrap: wrap; }
.hmeta b { color: #fff; }

/* secciones */
section.blk { padding: 60px 0; }
.eyebrow { text-transform: uppercase; letter-spacing: .16em; font-size: 12px; font-weight: 700; color: var(--color-accent); }
h2 { font-size: clamp(24px, 3.4vw, 34px); font-weight: 820; margin: 10px 0 6px; letter-spacing: -.02em; line-height: 1.1; }
.sub { color: color-mix(in srgb, var(--color-text) 74%, transparent); max-width: 70ch; margin: 0 0 26px; font-size: 16px; }
h3 { font-size: 15px; color: color-mix(in srgb, var(--color-text) 74%, transparent); margin: 0 0 12px; font-weight: 650; }
.card { background: var(--color-surface); border: 1px solid var(--color-divider); border-radius: var(--radius-md); padding: 22px; backdrop-filter: blur(12px); }

/* altura sobre el terreno */
.hidden { display: none; }
.terrain-loading { color: var(--color-text-muted); font-size: 13px; padding: 30px 0; text-align: center; }
.terrain-tiles { grid-template-columns: repeat(3, 1fr); margin-top: 16px; }
@media (max-width: 620px) { .terrain-tiles { grid-template-columns: 1fr; } }

/* contexto solar */
.solar-grid { align-items: stretch; }
.sun-card { display: grid; place-items: center; }
.compass { width: min(100%, 260px); height: auto; overflow: visible; }
.cmp-ring { fill: color-mix(in srgb, var(--c-yellow) 5%, transparent); stroke: var(--color-divider); stroke-width: 1.5; }
.cmp-tick { stroke: color-mix(in srgb, var(--color-text) 30%, transparent); stroke-width: 1.5; }
.cmp-card { fill: var(--color-text-muted); font-size: 13px; font-weight: 700; }
.cmp-ray { stroke: var(--c-yellow); stroke-width: 3; stroke-linecap: round; stroke-dasharray: 2 6; opacity: .8; }
.cmp-sun { fill: var(--c-yellow); stroke: var(--color-surface-solid); stroke-width: 2; filter: drop-shadow(0 0 6px color-mix(in srgb, var(--c-yellow) 70%, transparent)); }
.cmp-center { fill: var(--color-text-muted); }
.cmp-flight { stroke: var(--color-accent); stroke-width: 2.5; stroke-linecap: round; }
.cmp-flight-dot { fill: var(--color-accent); }
.cmp-wind { stroke: var(--c-aqua); stroke-width: 3.5; stroke-linecap: round; opacity: .9; }
.cmp-wind-head { fill: var(--c-aqua); filter: drop-shadow(0 0 5px color-mix(in srgb, var(--c-aqua) 55%, transparent)); }
.solar-tiles { grid-template-columns: 1fr; height: 100%; align-content: center; gap: 12px; }
@media (max-width: 760px) { .solar-tiles { grid-template-columns: 1fr; } }

/* scrollytelling del recorrido: la tarjeta del mapa se fija mientras el scroll hace volar el dron */
.route-scrolly .scrolly-track { position: relative; height: 240vh; }
.route-scrolly .scrolly-stick { position: sticky; top: 0; min-height: 100vh; display: flex; align-items: center; }
.route-scrolly .scrolly-stick .card { width: 100%; margin: 0; }
.scrolly-hint { text-align: center; font-size: 12.5px; font-weight: 600; color: var(--color-accent); margin: 12px 0 2px; }
@media (max-width: 760px) { .route-scrolly .scrolly-track { height: 200vh; } }
.card + .card { margin-top: 18px; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
@media (max-width: 760px) { .grid2 { grid-template-columns: 1fr; } }

.tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
@media (max-width: 760px) { .tiles { grid-template-columns: repeat(2, 1fr); } }
.mos { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
@media (max-width: 860px) { .mos { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 480px) { .mos { grid-template-columns: 1fr; } }
app-callout { display: block; margin-bottom: 22px; }

.legend { display: flex; gap: 18px; flex-wrap: wrap; font-size: 12.5px; color: color-mix(in srgb, var(--color-text) 74%, transparent); margin-bottom: 8px; }
.legend span { display: inline-flex; align-items: center; gap: 7px; }
.legend .sw { width: 13px; height: 3px; border-radius: 2px; }
.legend .dot { width: 9px; height: 9px; border-radius: 50%; }
.chart-note { font-size: 12px; color: var(--color-text-muted); margin: 14px 0 0; }

.lstrip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
@media (max-width: 560px) { .lstrip { grid-template-columns: 1fr; } }
.lstrip figure { margin: 0; }
.lstrip img { width: 100%; aspect-ratio: 16/9; object-fit: cover; border-radius: 10px; display: block; }
.lstrip figcaption { font-size: 12.5px; color: color-mix(in srgb, var(--color-text) 74%, transparent); margin-top: 7px; }
.lstrip figcaption b { color: var(--color-text); }

table { width: 100%; border-collapse: collapse; font-size: 14px; }
td { text-align: left; padding: 9px 10px; border-bottom: 1px solid var(--color-divider); }
td.n { text-align: right; font-variant-numeric: tabular-nums; }
tbody tr:last-child td { border-bottom: none; }
code { background: var(--color-tile); border: 1px solid var(--color-divider); border-radius: 6px; padding: 1px 7px; font-size: 12.5px; font-family: ui-monospace, Menlo, monospace; }

.foot { padding: 40px 0 70px; border-top: 1px solid var(--color-divider); color: var(--color-text-muted); font-size: 12.5px; text-align: center; }

/* Móvil: margen lateral de 1rem, consistente en todas las secciones y la portada */
@media (max-width: 560px) {
  .wrap { padding: 0 16px; }
  .r-hero .inner { padding: 0 16px; }
  section.blk { padding: 44px 0; }
  .tiles { gap: 12px; }
  .mos { gap: 14px; }
  /* portada: los bloques llenan el ancho en 2 columnas iguales */
  .hstats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .hstats stat-tile { min-width: 0; }
}
`;

Object.assign(__x, { styles });

};

__m["js/components/views/flight-report/flight-report.js"] = function (__x, __req) {
const { DjiElement } = __req("js/core/DjiElement.js");
const { escapeHtml } = __req("js/core/escape-html.js");
const { t, getLang } = __req("js/i18n/index.js");
const { keypoints, mmss } = __req("js/geo.js");
const { hav } = __req("js/srt.js");
const { dayBand } = __req("js/daypart.js");
const { solarPosition, lightPhase, azToCompass } = __req("js/solar.js");
const { fetchTerrain } = __req("js/terrain.js");
const { estimateWind } = __req("js/wind.js");
__req("js/components/ui/stat-tile/stat-tile.js");
__req("js/components/ui/moment-card/moment-card.js");
__req("js/components/ui/callout/callout.js");
__req("js/components/ui/time-chart/time-chart.js");
__req("js/components/ui/sat-map/sat-map.js");
__req("js/components/ui/export-bar/export-bar.js");
__req("js/components/ui/image-lightbox/image-lightbox.js");
__req("js/components/ui/flight-player/flight-player.js");
__req("js/components/ui/reading-nav/reading-nav.js");
const { PlayerClock } = __req("js/core/player-clock.js");
const { reveal } = __req("js/core/reveal.js");
const { styles } = __req("js/components/views/flight-report/flight-report.css.js");

const f = (v, d = 0) => (v == null ? '—' : v.toFixed(d));
const nfmt = (n) => n.toLocaleString(getLang() === 'es' ? 'es-ES' : 'en-US');
const strip = (s) => s.replace(/\s*\(.*?\)/, '');
/** Rumbo inicial (grados, 0=N) del punto A al B por la loxodrómica/gran círculo. */
const bearing = (la1, lo1, la2, lo2) => {
  const p1 = la1 * Math.PI / 180, p2 = la2 * Math.PI / 180, dl = (lo2 - lo1) * Math.PI / 180;
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
};
const MES = {
  es: ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  en: ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
function fecha(start) {
  const m = start.match(/(\d{4})-(\d\d)-(\d\d)/); const y = +m[1], mo = +m[2], d = +m[3];
  return getLang() === 'es' ? `${d} de ${MES.es[mo]} de ${y}` : `${MES.en[mo]} ${d}, ${y}`;
}

/** Informe completo del vuelo. Recibe los datos con show(model, assets). */
class FlightReport extends DjiElement {
  static styles = [styles];

  /** @param {object} model @param {object} assets */
  show(model, assets) {
    this.model = model; this.assets = assets;
    this.kps = assets.kps || keypoints(model);
    this._paint();
  }

  render() {
    if (!this.model) return;
    const m = this.model.meta, r = this.model.ranges, cam = this.model.cam, a = this.assets;
    const dur = m.dur, relmax = f(r.rel[1]), hsmax = f(r.hspeed[1] * 3.6), hsavg = f(r.hspeed_avg * 3.6);
    const iso = cam.iso.length ? `${Math.min(...cam.iso)}–${Math.max(...cam.iso)}` : '—';
    this.shadowRoot.innerHTML = `
      ${this._heroTpl(m, r, dur, relmax, hsmax)}
      <div class="wrap">
        ${this._resumenTpl(m, r, dur, relmax, hsavg, hsmax, iso)}
        ${this._momentosTpl(a)}
        ${this._routeTpl()}
        ${this._sectionChart('alt', 'c-alt', `<div class="legend"><span><span class="sw" style="background:var(--c-blue)"></span>${t('alt.series')}</span></div>`)}
        ${this._terrainTpl()}
        ${this._dynamicsTpl()}
        ${this._windTpl()}
        ${this._cameraTpl(cam, r, iso, a)}
        ${this._solarTpl(m)}
        ${this._gimbalTpl(r)}
        ${this._locationTpl()}
        ${this._notesTpl()}
      </div>
      <div class="foot">${escapeHtml(t('foot', { n: nfmt(m.frames), fecha: fecha(m.start) }))}</div>`;
  }

  connectedCallback() {
    super.connectedCallback();
    // el visor vive en el body (overlay a pantalla completa, sobre el chrome)
    if (!this._lb) { this._lb = document.createElement('image-lightbox'); document.body.appendChild(this._lb); }
    if (!this._lbWired) {
      this._lbWired = true;
      // galería del bloque "Momentos clave": todas las tarjetas con fotograma
      this.shadowRoot.addEventListener('moment:open', (e) => {
        if (!this._lb) return;
        const cards = this.$$('.mos moment-card').filter((c) => c.getAttribute('img'));
        const items = cards.map((c) => ({
          src: c.getAttribute('img'), label: c.getAttribute('label'),
          time: c.getAttribute('time'), metric: c.getAttribute('metric'),
          secs: c.getAttribute('secs') != null ? +c.getAttribute('secs') : null,
        }));
        const idx = Math.max(0, items.findIndex((it) => it.src === e.detail.img));
        this._lb.open(items, idx, { title: this.assets?.title, mp4File: this.assets?.mp4File });
      });
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._lb) { this._lb.remove(); this._lb = null; }
    if (this._clock) { this._clock.destroy(); this._clock = null; }
    if (this._player) { this._player.remove(); this._player = null; }
    if (this._video) { this._video.removeAttribute('src'); this._video.load(); this._video = null; }
    if (this._videoUrl) { URL.revokeObjectURL(this._videoUrl); this._videoUrl = null; }
    this._revealOff?.(); this._revealOff = null;
    if (this._nav) { this._nav.remove(); this._nav = null; }
    if (this._scrollyRaf) { cancelAnimationFrame(this._scrollyRaf); this._scrollyRaf = 0; }
    this._playerIO?.disconnect(); this._playerIO = null;
  }

  _heroTpl(m, r, dur, relmax, hsmax) {
    const a = this.assets;
    const stat = (v, unit, label) => `<stat-tile hero value="${v}" unit="${unit}" label="${escapeHtml(label)}"></stat-tile>`;
    return `
      <header class="r-hero">
        <div class="bg ${a.hero ? '' : 'gradient'}" ${a.hero ? `style="background-image:url('${a.hero}')"` : ''}></div>
        <div class="scrim"></div>
        <div class="inner">
          <span class="kick">${escapeHtml(t('hero.kicker'))}</span>
          <h1>${escapeHtml(a.title || 'DJI')}</h1>
          <p class="lede">${escapeHtml(this._lede(m))}</p>
          <div class="hstats">
            ${stat(mmss(dur), '', t('hero.duration'))}
            ${stat(relmax, 'm', t('hero.altmax'))}
            ${stat(nfmt(this.model.maxfar), 'm', t('hero.away'))}
            ${stat(hsmax, 'km/h', t('hero.vmax'))}
          </div>
          <div class="hmeta">
            <span>📅 <b>${fecha(m.start)}</b></span>
            <span>🕘 <b>${m.start.slice(11, 19)} – ${m.end.slice(11, 19)}</b></span>
            <span>🎞️ <b>${escapeHtml(t('hero.frames', { n: nfmt(m.frames) }))}</b> · ${m.fps} fps</span>
          </div>
        </div>
      </header>`;
  }

  /** Descripción dinámica: duración + franja del día + lugar. */
  _lede(m) {
    const mins = Math.max(1, Math.floor(m.dur / 60));
    const dur = mins === 1 ? t('dur.one') : t('dur.many', { n: mins });
    const band = dayBand(m.start, this.model.takeoff[0], this.model.takeoff[1]);
    let lede = t('hero.lede.base', { dur, daypart: t('daypart.' + band) });
    if (this.assets.place) lede += t('hero.lede.place', { place: this.assets.place });
    return lede + t('hero.lede.tail');
  }

  _resumenTpl(m, r, dur, relmax, hsavg, hsmax, iso) {
    const tile = (v, unit, label, hint) => `<stat-tile value="${v}" unit="${unit}" label="${escapeHtml(label)}" hint="${escapeHtml(hint)}"></stat-tile>`;
    return `
      <section class="blk">
        <div class="eyebrow">${escapeHtml(t('resumen.eyebrow'))}</div>
        <h2>${escapeHtml(t('resumen.title'))}</h2>
        <p class="sub">${escapeHtml(t('resumen.sub'))}</p>
        <div class="tiles">
          ${tile(mmss(dur), '', t('tile.duration'), t('tile.frames', { n: nfmt(m.frames) }))}
          ${tile(relmax, 'm', t('tile.altmax'), t('tile.altmax.k'))}
          ${tile(nfmt(this.model.maxfar), 'm', t('tile.awaymax'), t('tile.awaymax.k'))}
          ${tile(nfmt(this.model.dist), 'm', t('tile.distance'), t('tile.distance.k'))}
          ${tile(hsavg, 'km/h', t('tile.speedavg'), t('tile.speedavg.k', { v: hsmax }))}
          ${tile(f(r.vspeed[1], 1), 'm/s', t('tile.climb'), t('tile.climb.k'))}
          ${tile(`${f(r.ab[0])}–${f(r.ab[1])}`, 'm', t('tile.altitude'), t('tile.altitude.k'))}
          ${tile(iso, '', t('tile.iso'), t('tile.iso.k'))}
        </div>
      </section>`;
  }

  _momentosTpl(a) {
    const cards = this.kps.map((k) => `<moment-card time="${mmss(k.t)}" secs="${k.t}" label="${escapeHtml(t('kp.' + k.key))}" metric="${escapeHtml(k.metric)}" sub="${escapeHtml(t('kp.' + k.key + '.sub'))}" ${k.frame ? `img="${k.frame}"` : ''}></moment-card>`).join('');
    let callout = '';
    if (!a.hasFrames) {
      const warn = !!a.frameError;
      callout = `<app-callout ${warn ? 'variant="warn"' : ''} title="${escapeHtml(warn ? t('mom.error.t') : t('mom.novideo.t'))}">${escapeHtml(warn ? a.frameError : t('mom.novideo.d'))}</app-callout>`;
    }
    return `
      <section class="blk">
        <div class="eyebrow">${escapeHtml(t('mom.eyebrow'))}</div>
        <h2>${escapeHtml(t('mom.title'))}</h2>
        <p class="sub">${escapeHtml(a.hasFrames ? t('mom.sub.frames') : t('mom.sub'))}</p>
        ${callout}
        <div class="mos">${cards}</div>
      </section>`;
  }

  _routeTpl() {
    const scrolly = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    const head = `
        <div class="eyebrow">${escapeHtml(t('route.eyebrow'))}</div>
        <h2>${escapeHtml(t('route.title'))}</h2>
        <p class="sub">${escapeHtml(t('route.sub'))}</p>`;
    const card = `
        <div class="card">
          <div class="legend">
            <span><span class="dot" style="background:var(--c-green)"></span>${escapeHtml(t('route.leg.takeoff'))}</span>
            <span><span class="dot" style="background:#fff;border:2px solid var(--color-accent)"></span>${escapeHtml(t('route.leg.moments'))}</span>
            <span><span class="sw" style="background:linear-gradient(90deg,var(--c-blue),var(--c-orange))"></span>${escapeHtml(t('route.leg.height'))}</span>
          </div>
          <sat-map id="map"></sat-map>
          ${scrolly ? `<p class="scrolly-hint">${escapeHtml(t('route.scrolly'))}</p>` : ''}
          <p class="chart-note" style="text-align:center">${escapeHtml(t('route.note'))}</p>
        </div>`;
    // scrollytelling: la tarjeta del mapa se fija (sticky) mientras el scroll hace volar el dron
    if (scrolly) return `
      <section class="blk route-scrolly">${head}
        <div class="scrolly-track"><div class="scrolly-stick">${card}</div></div>
      </section>`;
    return `<section class="blk">${head}${card}</section>`;
  }

  _sectionChart(prefix, id, legend) {
    return `
      <section class="blk">
        <div class="eyebrow">${escapeHtml(t(prefix + '.eyebrow'))}</div>
        <h2>${escapeHtml(t(prefix + '.title'))}</h2>
        <p class="sub">${escapeHtml(t(prefix + '.sub'))}</p>
        <div class="card">${legend}<time-chart id="${id}"></time-chart></div>
      </section>`;
  }

  _dynamicsTpl() {
    return `
      <section class="blk">
        <div class="eyebrow">${escapeHtml(t('dyn.eyebrow'))}</div>
        <h2>${escapeHtml(t('dyn.title'))}</h2>
        <p class="sub">${escapeHtml(t('dyn.sub'))}</p>
        <div class="card">
          <h3>${escapeHtml(t('dyn.speed.h3'))}</h3>
          <div class="legend"><span><span class="sw" style="background:var(--c-blue)"></span>${escapeHtml(t('dyn.speed.h'))}</span><span><span class="sw" style="background:var(--c-violet)"></span>${escapeHtml(t('dyn.speed.v'))}</span></div>
          <time-chart id="c-sp"></time-chart>
        </div>
        <div class="card">
          <h3>${escapeHtml(t('dyn.dist.h3'))}</h3>
          <div class="legend"><span><span class="sw" style="background:var(--c-aqua)"></span>${escapeHtml(t('dyn.dist.legend'))}</span></div>
          <time-chart id="c-far"></time-chart>
        </div>
      </section>`;
  }

  _cameraTpl(cam, r, iso, a) {
    const strip3 = a.light && a.light.length === 3 ? `
      <div class="card">
        <h3>${escapeHtml(t('cam.light.h3'))}</h3>
        <div class="lstrip">
          <figure><img src="${a.light[0]}" alt=""><figcaption><b>${mmss(this.model.meta.dur * 0.15)}</b> · ${escapeHtml(t('cam.light.start'))}</figcaption></figure>
          <figure><img src="${a.light[1]}" alt=""><figcaption><b>${mmss(this.model.meta.dur * 0.5)}</b> · ${escapeHtml(t('cam.light.mid'))}</figcaption></figure>
          <figure><img src="${a.light[2]}" alt=""><figcaption><b>${mmss(this.model.meta.dur * 0.92)}</b> · ${escapeHtml(t('cam.light.end'))}</figcaption></figure>
        </div>
      </div>` : '';
    return `
      <section class="blk">
        <div class="eyebrow">${escapeHtml(t('cam.eyebrow'))}</div>
        <h2>${escapeHtml(t('cam.title'))}</h2>
        <p class="sub">${escapeHtml(t('cam.sub', { iso, ctmin: f(r.ct[0]), ctmax: f(r.ct[1]) }))}</p>
        <div class="card">
          <h3>${escapeHtml(t('cam.h3'))}</h3>
          <div class="legend"><span><span class="sw" style="background:var(--c-blue)"></span>${escapeHtml(t('cam.iso'))}</span><span><span class="sw" style="background:var(--c-yellow)"></span>${escapeHtml(t('cam.ct'))}</span></div>
          <time-chart id="c-cam"></time-chart>
        </div>
        ${strip3}
      </section>`;
  }

  _terrainTpl() {
    return `
      <section class="blk" id="sec-terrain">
        <div class="eyebrow">${escapeHtml(t('terrain.eyebrow'))}</div>
        <h2>${escapeHtml(t('terrain.title'))}</h2>
        <p class="sub">${escapeHtml(t('terrain.sub'))}</p>
        <div class="card">
          <div class="terrain-loading">${escapeHtml(t('terrain.loading'))}</div>
          <div class="terrain-error hidden"><app-callout variant="warn" title="${escapeHtml(t('terrain.error.t'))}">${escapeHtml(t('terrain.error.d'))}</app-callout></div>
          <div class="terrain-body hidden">
            <div class="legend"><span><span class="sw" style="background:var(--c-aqua)"></span>${escapeHtml(t('terrain.legend'))}</span></div>
            <time-chart id="c-terrain"></time-chart>
          </div>
        </div>
        <div class="tiles terrain-tiles hidden" id="terrain-tiles"></div>
      </section>`;
  }

  /** Descarga la elevación del terreno una vez y rellena la sección (o avisa si falla). */
  _setupTerrain() {
    if (this._terrainData !== undefined) { this._fillTerrain(); return; }
    if (this._terrainFetching) return;
    this._terrainFetching = true;
    const S = this.model.series;
    const step = Math.max(1, Math.ceil(S.length / 90));
    const pts = S.filter((s, i) => i % step === 0 && s.lat != null);
    fetchTerrain(pts.map((s) => [s.lat, s.lon])).then((elev) => {
      this._terrainFetching = false;
      if (!elev) { this._terrainData = null; }
      else {
        pts.forEach((s, i) => { s.ground = elev[i]; s.agl = (s.ab != null && elev[i] != null) ? s.ab - elev[i] : null; });
        this._terrainData = { pts };
      }
      this._fillTerrain();
    });
  }

  /** Pinta la gráfica de altura sobre el suelo y las cifras (o el aviso de error). */
  _fillTerrain() {
    if (this._terrainData === undefined) return; // aún cargando
    this.$('#sec-terrain .terrain-loading')?.classList.add('hidden');
    if (!this._terrainData) { this.$('#sec-terrain .terrain-error')?.classList.remove('hidden'); return; }
    const pts = this._terrainData.pts, dur = this.model.meta.dur;
    this.$('#c-terrain').data = { series: pts, dur, cfgs: [
      { k: 'agl', color: '--c-aqua', area: true, min: 0, fmt: (v) => `${Math.round(v)}`, label: t('terrain.legend'), unit: 'm', dec: 0 },
    ] };
    this.$('#sec-terrain .terrain-body')?.classList.remove('hidden');
    const agls = pts.map((s) => s.agl).filter((v) => v != null);
    const grounds = pts.map((s) => s.ground).filter((v) => v != null);
    if (!agls.length) return;
    const tile = (v, label, hint) => `<stat-tile value="${Math.round(v)}" unit="m" label="${escapeHtml(label)}" hint="${escapeHtml(hint)}"></stat-tile>`;
    const tilesEl = this.$('#terrain-tiles');
    tilesEl.innerHTML = tile(Math.max(...agls), t('terrain.aglmax'), t('terrain.aglmax.k'))
      + tile(Math.min(...agls), t('terrain.clearance'), t('terrain.clearance.k'))
      + tile(Math.max(...grounds) - Math.min(...grounds), t('terrain.relief'), t('terrain.relief.k'));
    tilesEl.classList.remove('hidden');
  }

  _windTpl() {
    const w = estimateWind(this.model.series);
    const head = `
        <div class="eyebrow">${escapeHtml(t('wind.eyebrow'))}</div>
        <h2>${escapeHtml(t('wind.title'))}</h2>
        <p class="sub">${escapeHtml(t('wind.sub'))}</p>`;
    if (!w) {
      return `<section class="blk">${head}
        <app-callout variant="warn" title="${escapeHtml(t('wind.na.t'))}">${escapeHtml(t('wind.na.d'))}</app-callout>
      </section>`;
    }
    const kmh = Math.round(w.speed * 3.6), asKmh = Math.round(w.airspeed * 3.6);
    const compass = azToCompass(w.fromDeg);
    const tile = (v, unit, label, hint) => `<stat-tile value="${escapeHtml(String(v))}" unit="${unit}" label="${escapeHtml(label)}" hint="${escapeHtml(hint)}"></stat-tile>`;
    return `
      <section class="blk">${head}
        <div class="grid2 solar-grid">
          <div class="card sun-card">${this._windCompass(w.fromDeg)}</div>
          <div class="card">
            <div class="tiles solar-tiles">
              ${tile(kmh, 'km/h', t('wind.speed'), t('wind.speed.k'))}
              ${tile(compass, '', t('wind.dir'), t('wind.dir.k', { deg: Math.round(w.fromDeg) }))}
              ${tile(asKmh, 'km/h', t('wind.airspeed'), t('wind.airspeed.k'))}
            </div>
          </div>
        </div>
        <app-callout title="${escapeHtml(t('wind.note.t'))}">${escapeHtml(t('wind.quality.' + w.quality))} ${escapeHtml(t('wind.note.d'))}</app-callout>
      </section>`;
  }

  /** Brújula de viento: una flecha que cruza la escena en el sentido del viento. */
  _windCompass(fromDeg) {
    const cx = 110, cy = 110, R = 84;
    const pt = (a, r) => [cx + r * Math.sin(a * Math.PI / 180), cy - r * Math.cos(a * Math.PI / 180)];
    const toward = (fromDeg + 180) % 360;
    const [x1, y1] = pt(fromDeg, R - 12);
    const [x2, y2] = pt(toward, R - 12);
    const dir = toward * Math.PI / 180, fx = Math.sin(dir), fy = -Math.cos(dir), px = Math.cos(dir), py = Math.sin(dir);
    const ah = 12, w2 = 7;
    const head = `${x2.toFixed(1)},${y2.toFixed(1)} ${(x2 - ah * fx + w2 * px).toFixed(1)},${(y2 - ah * fy + w2 * py).toFixed(1)} ${(x2 - ah * fx - w2 * px).toFixed(1)},${(y2 - ah * fy - w2 * py).toFixed(1)}`;
    const card = [['N', 0], ['E', 90], ['S', 180], ['O', 270]].map(([lbl, a]) => {
      const [x, y] = pt(a, R + 16);
      return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" class="cmp-card" dominant-baseline="middle" text-anchor="middle">${lbl}</text>`;
    }).join('');
    const ticks = Array.from({ length: 12 }, (_, i) => {
      const [a1, b1] = pt(i * 30, R), [a2, b2] = pt(i * 30, R - 8);
      return `<line x1="${a1.toFixed(1)}" y1="${b1.toFixed(1)}" x2="${a2.toFixed(1)}" y2="${b2.toFixed(1)}" class="cmp-tick"/>`;
    }).join('');
    return `<svg viewBox="0 0 220 220" class="compass" role="img" aria-label="${escapeHtml(t('wind.eyebrow'))}">
      <circle cx="${cx}" cy="${cy}" r="${R}" class="cmp-ring"/>
      ${ticks}${card}
      <line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" class="cmp-wind"/>
      <polygon points="${head}" class="cmp-wind-head"/>
    </svg>`;
  }

  _solarTpl(m) {
    const [clat, clon] = this.model.center;
    const start = new Date(m.start.replace(' ', 'T'));
    const end = new Date(start.getTime() + m.dur * 1000);
    const s0 = solarPosition(start, clat, clon);
    const s1 = solarPosition(end, clat, clon);
    const phase = lightPhase((s0.elevation + s1.elevation) / 2);
    const az = s0.azimuth;
    const far = this.kps.find((k) => k.key === 'far');
    const flightAz = far ? bearing(this.model.takeoff[0], this.model.takeoff[1], far.lat, far.lon) : null;
    const tile = (v, unit, label, hint) => `<stat-tile value="${escapeHtml(v)}" unit="${unit}" label="${escapeHtml(label)}" hint="${escapeHtml(hint)}"></stat-tile>`;
    return `
      <section class="blk">
        <div class="eyebrow">${escapeHtml(t('solar.eyebrow'))}</div>
        <h2>${escapeHtml(t('solar.title'))}</h2>
        <p class="sub">${escapeHtml(t('solar.sub'))}</p>
        <div class="grid2 solar-grid">
          <div class="card sun-card">${this._sunCompass(az, flightAz)}</div>
          <div class="card">
            <div class="tiles solar-tiles">
              ${tile(`${Math.round(s0.elevation)}`, '°', t('solar.elev'), t('solar.elev.k', { end: Math.round(s1.elevation) }))}
              ${tile(azToCompass(az), '', t('solar.dir'), t('solar.dir.k', { az: Math.round(az) }))}
              ${tile(t('solar.phase.' + phase), '', t('solar.phase'), t('solar.phase.k'))}
            </div>
          </div>
        </div>
      </section>`;
  }

  /** Brújula solar: dónde estaba el sol (azimut) y el rumbo del vuelo. */
  _sunCompass(azSun, azFlight) {
    const cx = 110, cy = 110, R = 84;
    const pt = (a, r) => [cx + r * Math.sin(a * Math.PI / 180), cy - r * Math.cos(a * Math.PI / 180)];
    const [sx, sy] = pt(azSun, R);
    const card = [['N', 0], ['E', 90], ['S', 180], ['O', 270]].map(([lbl, a]) => {
      const [x, y] = pt(a, R + 16);
      return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" class="cmp-card" dominant-baseline="middle" text-anchor="middle">${lbl}</text>`;
    }).join('');
    const ticks = Array.from({ length: 12 }, (_, i) => {
      const [x1, y1] = pt(i * 30, R), [x2, y2] = pt(i * 30, R - 8);
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" class="cmp-tick"/>`;
    }).join('');
    let flight = '';
    if (azFlight != null) {
      const [fx, fy] = pt(azFlight, R - 26);
      flight = `<line x1="${cx}" y1="${cy}" x2="${fx.toFixed(1)}" y2="${fy.toFixed(1)}" class="cmp-flight"/>`
        + `<circle cx="${fx.toFixed(1)}" cy="${fy.toFixed(1)}" r="4" class="cmp-flight-dot"/>`;
    }
    return `<svg viewBox="0 0 220 220" class="compass" role="img" aria-label="${escapeHtml(t('solar.eyebrow'))}">
      <defs><radialGradient id="sunglow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="var(--c-yellow)" stop-opacity="0.55"/><stop offset="1" stop-color="var(--c-yellow)" stop-opacity="0"/>
      </radialGradient></defs>
      <circle cx="${cx}" cy="${cy}" r="${R}" class="cmp-ring"/>
      ${ticks}${card}
      <line x1="${sx.toFixed(1)}" y1="${sy.toFixed(1)}" x2="${cx}" y2="${cy}" class="cmp-ray"/>
      ${flight}
      <circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="26" fill="url(#sunglow)"/>
      <circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="11" class="cmp-sun"/>
      <circle cx="${cx}" cy="${cy}" r="3.5" class="cmp-center"/>
    </svg>`;
  }

  _gimbalTpl(r) {
    return `
      <section class="blk">
        <div class="eyebrow">${escapeHtml(t('gim.eyebrow'))}</div>
        <h2>${escapeHtml(t('gim.title'))}</h2>
        <p class="sub">${escapeHtml(t('gim.sub'))}</p>
        <div class="card">
          <h3>${escapeHtml(t('gim.h3'))}</h3>
          <div class="legend"><span><span class="sw" style="background:var(--c-green)"></span>${escapeHtml(t('gim.legend'))}</span></div>
          <time-chart id="c-gb"></time-chart>
          <p class="chart-note">${escapeHtml(t('gim.note', { min: f(r.pitch[0]), max: f(r.pitch[1]) }))}</p>
        </div>
      </section>`;
  }

  _locationTpl() {
    const d = this.model;
    return `
      <section class="blk">
        <div class="eyebrow">${escapeHtml(t('loc.eyebrow'))}</div>
        <h2>${escapeHtml(t('loc.title'))}</h2>
        <div class="grid2">
          <div class="card">
            <h3>${escapeHtml(t('loc.coords'))}</h3>
            <table><tbody>
              <tr><td>${escapeHtml(t('loc.takeoff'))}</td><td class="n"><code>${f(d.takeoff[0], 6)}, ${f(d.takeoff[1], 6)}</code></td></tr>
              <tr><td>${escapeHtml(t('loc.center'))}</td><td class="n"><code>${f(d.center[0], 6)}, ${f(d.center[1], 6)}</code></td></tr>
            </tbody></table>
            <p style="margin:12px 0 0"><a href="https://www.google.com/maps?q=${d.takeoff[0]},${d.takeoff[1]}" target="_blank" rel="noopener">${escapeHtml(t('loc.gmaps'))}</a></p>
          </div>
          <div class="card" data-noexport>
            <h3>${escapeHtml(t('loc.downloads'))}</h3>
            <export-bar id="exp"></export-bar>
          </div>
        </div>
      </section>`;
  }

  _notesTpl() {
    return `
      <section class="blk">
        <div class="eyebrow">${escapeHtml(t('notes.eyebrow'))}</div>
        <h2>${escapeHtml(t('notes.title'))}</h2>
        <app-callout variant="warn" title="${escapeHtml(t('notes.warn.t'))}">${escapeHtml(t('notes.warn.d', { v: f(this.model.glitch_max * 3.6) }))}</app-callout>
        <app-callout variant="good" title="${escapeHtml(t('notes.good.t'))}">${escapeHtml(t('notes.good.d'))}</app-callout>
      </section>`;
  }

  afterRender() {
    if (!this.model) return;
    const S = this.model.series, dur = this.model.meta.dur, [tk0, tk1] = this.model.takeoff;
    for (const s of S) { s.hskmh = s.hs != null ? s.hs * 3.6 : null; if (s.far == null) s.far = hav(tk0, tk1, s.lat, s.lon); }

    this.$('#c-alt').data = { series: S, dur, cfgs: [{ k: 'rel', color: '--c-blue', area: true, min: 0, fmt: (v) => `${Math.round(v)}`, label: t('alt.series'), unit: 'm', dec: 0 }] };
    this.$('#c-sp').data = { series: S, dur, cfgs: [
      { k: 'hskmh', color: '--c-blue', min: 0, fmt: (v) => `${Math.round(v)}`, label: strip(t('dyn.speed.h')), unit: 'km/h', dec: 1 },
      { k: 'vs', color: '--c-violet', fmt: (v) => `${Math.round(v)}`, label: strip(t('dyn.speed.v')), unit: 'm/s', dec: 1 },
    ] };
    this.$('#c-far').data = { series: S, dur, cfgs: [{ k: 'far', color: '--c-aqua', area: true, min: 0, fmt: (v) => `${Math.round(v)}`, label: strip(t('dyn.dist.legend')), unit: 'm', dec: 0 }] };
    this.$('#c-cam').data = { series: S, dur, cfgs: [
      { k: 'iso', color: '--c-blue', fmt: (v) => `${Math.round(v)}`, label: t('cam.iso'), unit: '', dec: 0 },
      { k: 'ct', color: '--c-yellow', fmt: (v) => `${Math.round(v / 100) / 10}k`, label: strip(t('cam.ct')), unit: 'K', dec: 0 },
    ] };
    this.$('#c-gb').data = { series: S, dur, cfgs: [{ k: 'pitch', color: '--c-green', area: true, fmt: (v) => `${Math.round(v)}°`, label: strip(t('gim.legend')), unit: '°', dec: 0 }] };

    this.$('#map').flight = { model: this.model, kps: this.kps };
    this.$('#exp').flight = { model: this.model, assets: this.assets };
    this._setupTerrain();

    // tira de luz: su propia galería de bloque (3 imágenes)
    const lightFracs = [0.15, 0.5, 0.92];
    const figs = this.$$('.lstrip figure');
    const litems = figs.map((fig, i) => ({
      src: fig.querySelector('img')?.src,
      label: fig.querySelector('figcaption')?.textContent?.trim(),
      secs: this.model.meta.dur * lightFracs[i],
    })).filter((it) => it.src);
    figs.forEach((fig, i) => {
      const img = fig.querySelector('img'); if (!img) return;
      img.style.cursor = 'zoom-in';
      this.on(img, 'click', () => this._lb && this._lb.open(litems, i, { title: this.assets?.title, mp4File: this.assets?.mp4File }));
    });

    this._setupPlayer();
    this._setupPlayerVisibility();
    this._setupScrolly();
    this._setupReveal();
    this._setupNav();
  }

  /** El player (barra + miniatura) solo aparece al llegar a la sección del mapa. */
  _setupPlayerVisibility() {
    this._playerIO?.disconnect(); this._playerIO = null;
    const anchor = this.$('#map');
    if (!anchor || !this._player) return;
    this._player.classList.add('away'); // arranca oculto
    if (!('IntersectionObserver' in window)) { this._player.classList.remove('away'); return; }
    this._playerIO = new IntersectionObserver((es) => {
      const vis = es.some((e) => e.isIntersecting);
      // se mantiene visible mientras se reproduce, aunque el mapa quede fuera de pantalla
      this._player.classList.toggle('away', !vis && !this._clock?.playing);
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0 });
    this._playerIO.observe(anchor);
  }

  /**
   * Scrollytelling del recorrido: mientras el track sticky cruza la pantalla, mapea
   * el progreso del scroll al tiempo de vuelo y hace clock.seek (que ya propaga al
   * mapa, gráficas y player). Solo actúa si no se está reproduciendo con el botón ▶.
   */
  _setupScrolly() {
    if (this._scrollyBound) return;
    this._scrollyBound = true;
    const onScroll = () => {
      if (this._scrollyRaf) return;
      this._scrollyRaf = requestAnimationFrame(() => {
        this._scrollyRaf = 0;
        const track = this.$('.scrolly-track');
        if (!track || !this._clock || this._clock.playing) return;
        const rect = track.getBoundingClientRect();
        const span = track.offsetHeight - innerHeight;
        if (span <= 0 || rect.top > innerHeight || rect.bottom < 0) return; // fuera de pantalla
        const p = Math.max(0, Math.min(1, -rect.top / span));
        this._clock.seek(p * this._clock.dur);
      });
    };
    this.on(window, 'scroll', onScroll, { passive: true });
  }

  /** Scroll-reveal de las secciones al entrar en pantalla (respeta reduced-motion). */
  _setupReveal() {
    this._revealOff?.();
    this._revealOff = reveal(this.$$('section.blk'));
  }

  /** Barra de progreso de lectura + mini-nav de secciones (montada en el body). */
  _setupNav() {
    if (!this._nav) {
      this._nav = document.createElement('reading-nav');
      document.body.appendChild(this._nav);
    }
    const items = this.$$('section.blk').map((el) => ({ el, label: el.querySelector('.eyebrow')?.textContent?.trim() || '' }));
    this._nav.target = { scroller: this, items };
  }

  /** Reproducción del vuelo: reloj + barra flotante + sincronía de mapa y gráficas. */
  _setupPlayer() {
    if (!this.model) return;
    if (!this._clock) {
      this._clock = new PlayerClock(this.model.meta.dur);
      this._clock.addEventListener('tick', (e) => this._onTick(e.detail.t));
    }
    // si hay vídeo: úsalo como fuente de tiempo y muéstralo como miniatura sincronizada
    if (this.assets?.mp4File && !this._video) {
      this._videoUrl = URL.createObjectURL(this.assets.mp4File);
      this._video = document.createElement('video');
      this._video.src = this._videoUrl;
      this._video.muted = true; this._video.playsInline = true; this._video.preload = 'auto';
      this._clock.setSource(this._video);
    }
    if (!this._player) {
      this._player = document.createElement('flight-player');
      document.body.appendChild(this._player);
    }
    this._player.clock = this._clock;
    this._player.video = this._video || null;
    // reserva hueco al final para que la barra fija del reproductor no tape el contenido
    this.classList.toggle('has-video', !!this._video);
  }

  /** Propaga el instante actual al mapa y a todas las gráficas. */
  _onTick(t) {
    this.$('#map')?.playhead(t);
    this.$$('time-chart').forEach((c) => c.playhead(t));
  }
}

customElements.define('flight-report', FlightReport);

Object.assign(__x, { FlightReport });

};

__m["js/components/views/progress-view/progress-view.css.js"] = function (__x, __req) {
const { css } = __req("js/core/css.js");

const styles = css`
:host { display: block; }
.wrap { text-align: center; padding: clamp(60px, 12vh, 140px) 24px 40px; }
.progress {
  max-width: 620px; margin: 0 auto; background: var(--color-surface); border: 1px solid var(--color-divider);
  border-radius: 24px; padding: 34px; backdrop-filter: blur(16px); box-shadow: var(--shadow-lg); text-align: left;
}
h3 { margin: 0 0 6px; font-size: 22px; }
.lead { margin: 0 0 22px; color: var(--color-text-muted); font-size: 14px; }
.steps { display: flex; flex-direction: column; gap: 12px; }
.pstep { display: flex; align-items: center; gap: 13px; font-size: 15px; color: var(--color-text-muted); transition: color .2s; }
.pstep .bullet {
  width: 26px; height: 26px; border-radius: 50%; border: 2px solid var(--color-divider); display: grid; place-items: center;
  font-size: 13px; flex: none; transition: all .2s;
}
.pstep.active { color: var(--color-text); }
.pstep.active .bullet { border-color: var(--color-accent); box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-accent) 22%, transparent); }
.pstep.done { color: color-mix(in srgb, var(--color-text) 74%, transparent); }
.pstep.done .bullet { background: var(--c-green); border-color: var(--c-green); color: #05231a; }
.pbar { height: 6px; border-radius: 100px; background: var(--color-divider); overflow: hidden; margin-top: 24px; }
.pbar > span { display: block; height: 100%; width: 0; background: linear-gradient(90deg, var(--color-accent), var(--color-violet)); transition: width .4s ease; }
.spin { display: inline-block; width: 13px; height: 13px; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
`;

Object.assign(__x, { styles });

};

__m["js/components/views/progress-view/progress-view.js"] = function (__x, __req) {
const { DjiElement } = __req("js/core/DjiElement.js");
const { t } = __req("js/i18n/index.js");
const { styles } = __req("js/components/views/progress-view/progress-view.css.js");

const STEPS = ['parse', 'model', 'frames', 'map', 'render'];

/**
 * Pantalla de progreso. Muestra los pasos y una barra; el orquestador la
 * controla con setStep(id, status, pct) y stepLabel(id, key).
 */
class ProgressView extends DjiElement {
  static styles = [styles];

  render() {
    this.shadowRoot.innerHTML = `
      <div class="wrap">
        <div class="progress">
          <h3>${t('progress.title')}</h3>
          <p class="lead">${t('progress.sub')}</p>
          <div class="steps" role="status" aria-live="polite">
            ${STEPS.map((id) => `<div class="pstep" data-step="${id}"><span class="bullet">•</span><span class="lbl" data-key="step.${id}">${t('step.' + id)}</span></div>`).join('')}
          </div>
          <div class="pbar"><span id="fill"></span></div>
        </div>
      </div>`;
  }

  /**
   * @param {string} id  paso
   * @param {'active'|'done'} status
   * @param {number} [pct]
   */
  setStep(id, status, pct) {
    const el = this.$(`[data-step="${id}"]`);
    if (el) {
      if (status === 'active') this.$$('.pstep').forEach((s) => { if (s !== el) s.classList.remove('active'); });
      el.classList.remove('active', 'done'); el.classList.add(status);
      el.querySelector('.bullet').innerHTML = status === 'done' ? '✓' : (status === 'active' ? '<span class="spin"></span>' : '•');
    }
    const fill = this.$('#fill');
    if (pct != null && fill) fill.style.width = pct + '%';
  }

  /** Cambia el rótulo de un paso a otra clave i18n (p. ej. 'step.frames.novideo'). */
  stepLabel(id, key) {
    const lbl = this.$(`[data-step="${id}"] .lbl`);
    if (lbl) { lbl.dataset.key = key; lbl.textContent = t(key); }
  }
}

customElements.define('progress-view', ProgressView);

Object.assign(__x, { ProgressView });

};

__m["js/components/views/upload-view/upload-view.css.js"] = function (__x, __req) {
const { css } = __req("js/core/css.js");

const styles = css`
:host { display: block; }
.hero { text-align: center; padding: clamp(48px, 9vw, 110px) 24px 40px; }
.eyebrow-pill {
  display: inline-flex; align-items: center; gap: 9px; text-transform: uppercase; letter-spacing: .2em;
  font-size: 12px; font-weight: 700; color: var(--color-text-muted); background: var(--color-surface);
  border: 1px solid var(--color-divider); padding: 8px 15px; border-radius: 100px; backdrop-filter: blur(8px);
}
h1 {
  font-size: clamp(40px, 7.5vw, 82px); font-weight: 850; line-height: 1.02; margin: 24px auto 16px; max-width: 15ch;
  background: linear-gradient(135deg, var(--color-text) 40%, var(--color-accent));
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
p.sub { font-size: clamp(16px, 2.1vw, 20px); color: color-mix(in srgb, var(--color-text) 74%, transparent); max-width: 60ch; margin: 0 auto 40px; }

.gen { max-width: 620px; margin: 20px auto 0; text-align: left; }
.gen label { display: block; font-size: 13px; color: var(--color-text-muted); margin: 0 0 6px; }
.gen input {
  width: 100%; background: var(--color-surface); border: 1px solid var(--color-divider); border-radius: 12px;
  padding: 12px 14px; color: var(--color-text); font-size: 15px; font-family: inherit; backdrop-filter: blur(8px);
}
.gen .go {
  margin-top: 0; width: 100%; border: none; cursor: pointer; color: #fff; font-weight: 700; font-size: 15px;
  padding: 14px 26px; border-radius: 100px; background: linear-gradient(135deg, var(--color-accent-2), var(--color-accent));
  box-shadow: 0 10px 26px color-mix(in srgb, var(--color-accent) 38%, transparent); transition: transform .12s;
  &:hover { transform: translateY(-2px); }
}
/* Botón de vídeo resaltado (encima de Generar), con barrido de brillo animado. */
.gen .addmp4 {
  position: relative; overflow: hidden; margin-top: 14px; margin-bottom: 12px; width: 100%; display: flex; align-items: center; gap: 12px;
  text-align: left; cursor: pointer; color: var(--color-text); font-family: inherit; border-radius: 16px; padding: 13px 15px;
  border: 1px solid color-mix(in srgb, var(--color-accent) 45%, transparent);
  background: color-mix(in srgb, var(--color-accent) 9%, var(--color-surface));
  box-shadow: 0 0 26px -10px color-mix(in srgb, var(--color-accent) 60%, transparent);
  transition: transform .14s, box-shadow .14s, border-color .14s;
  &:hover { transform: translateY(-1px); box-shadow: 0 0 34px -6px color-mix(in srgb, var(--color-accent) 68%, transparent); }
}
.gen .addmp4::after {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(100deg, transparent 34%, color-mix(in srgb, var(--color-accent) 28%, transparent) 50%, transparent 66%);
  transform: translateX(-120%); animation: mp4shine 3.6s ease-in-out infinite;
}
@keyframes mp4shine { 0%, 55% { transform: translateX(-120%); } 100% { transform: translateX(120%); } }
@media (prefers-reduced-motion: reduce) { .gen .addmp4::after { animation: none; opacity: 0; } }
.mp4-ico { position: relative; z-index: 1; flex: none; width: 42px; height: 42px; display: grid; place-items: center; font-size: 22px;
  border-radius: 12px; background: color-mix(in srgb, var(--color-accent) 18%, transparent); }
.mp4-txt { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 1px; flex: 1; min-width: 0; }
.mp4-t { font-size: 14.5px; font-weight: 750; letter-spacing: -.01em; }
.mp4-sub { font-size: 12px; color: var(--color-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mp4-badge { position: relative; z-index: 1; flex: none; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .07em;
  color: #fff; background: linear-gradient(135deg, var(--color-accent), var(--color-violet)); border-radius: 100px; padding: 4px 10px; }
.gen .addmp4.has { border-color: color-mix(in srgb, var(--c-green) 50%, transparent); background: color-mix(in srgb, var(--c-green) 10%, var(--color-surface)); box-shadow: none; }
.gen .addmp4.has::after { display: none; }
.gen .addmp4.has .mp4-ico { background: color-mix(in srgb, var(--c-green) 22%, transparent); color: var(--c-green); }

/* aviso de coincidencia SRT ↔ vídeo */
.pairmsg {
  display: flex; align-items: center; gap: 12px; margin: 14px 2px; font-size: 13px; line-height: 1.45; font-weight: 600;
  border-radius: 14px; padding: 12px 14px; border: 1px solid var(--color-divider); background: var(--color-surface); color: var(--color-text-muted);
}
.pairmsg[hidden] { display: none; }
.pm-text { flex: 1; min-width: 0; }
.pm-remove {
  flex: none; cursor: pointer; font-family: inherit; font-size: 12.5px; font-weight: 700; color: inherit;
  border: 1px solid currentColor; background: transparent; border-radius: 100px; padding: 6px 13px; white-space: nowrap;
  opacity: .85; transition: opacity .12s, background .12s;
}
.pm-remove:hover { opacity: 1; background: color-mix(in srgb, currentColor 14%, transparent); }
.pairmsg.ok { color: color-mix(in srgb, var(--c-green) 78%, var(--color-text)); border-color: color-mix(in srgb, var(--c-green) 38%, transparent); background: color-mix(in srgb, var(--c-green) 9%, var(--color-surface)); }
.pairmsg.error { color: color-mix(in srgb, var(--c-red) 82%, var(--color-text)); border-color: color-mix(in srgb, var(--c-red) 45%, transparent); background: color-mix(in srgb, var(--c-red) 10%, var(--color-surface)); }
.pairmsg.warn { color: color-mix(in srgb, var(--c-orange) 82%, var(--color-text)); border-color: color-mix(in srgb, var(--c-orange) 42%, transparent); background: color-mix(in srgb, var(--c-orange) 10%, var(--color-surface)); }
.pairmsg.checking { color: var(--color-text-muted); }

.gen .go:disabled { cursor: not-allowed; opacity: .5; filter: grayscale(.35); box-shadow: none; }
.gen .go:disabled:hover { transform: none; }

.feats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; max-width: 720px; margin: 44px auto 0; }
@media (max-width: 620px) { .feats { grid-template-columns: 1fr; } }
.feat { text-align: left; background: var(--color-surface); border: 1px solid var(--color-divider); border-radius: 16px; padding: 18px; backdrop-filter: blur(10px); }
.feat .fi { font-size: 22px; }
.feat h4 { margin: 8px 0 4px; font-size: 15px; }
.feat p { margin: 0; font-size: 13px; color: var(--color-text-muted); }
.hidden { display: none; }
`;

Object.assign(__x, { styles });

};

__m["js/components/views/upload-view/upload-view.js"] = function (__x, __req) {
const { DjiElement } = __req("js/core/DjiElement.js");
const { escapeHtml } = __req("js/core/escape-html.js");
const { t, getLang } = __req("js/i18n/index.js");
const { reverseGeocode, firstCoords } = __req("js/geocode.js");
__req("js/components/ui/drop-zone/drop-zone.js");
const { styles } = __req("js/components/views/upload-view/upload-view.css.js");

/** Nombre sin extensión, en minúsculas (los DJI comparten base SRT/MP4). */
const baseName = (n) => n.replace(/\.[^.]+$/, '').trim().toLowerCase();

const TS_RE = /(\d{4})-(\d\d)-(\d\d) (\d\d):(\d\d):(\d\d)\.(\d+)/g;

/** Duración del vuelo según el SRT (último timestamp − primero), en segundos. */
function srtDurationSec(text) {
  TS_RE.lastIndex = 0;
  let first = null, last = null, m;
  while ((m = TS_RE.exec(text))) {
    const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6], +m[7].slice(0, 3)).getTime();
    if (first === null) first = d;
    last = d;
  }
  return (first != null && last != null) ? (last - first) / 1000 : null;
}

/** Fecha/hora de grabación según el SRT (timestamp del primer fotograma). */
function srtStartDate(text) {
  const m = /(\d{4})-(\d\d)-(\d\d) (\d\d):(\d\d):(\d\d)\.(\d+)/.exec(text || '');
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6], +m[7].slice(0, 3)) : null;
}

/**
 * Fecha de grabación embebida en el MP4 (átomo moov › mvhd, creation_time).
 * Recorre las cajas de nivel superior saltando mdat por su tamaño (sin leerlo),
 * así funciona con vídeos grandes. Devuelve Date o null.
 */
async function mp4CreationDate(file) {
  try {
    const EPOCH_1904 = 2082844800; // segundos entre 1904-01-01 y 1970-01-01
    const size = file.size;
    let offset = 0;
    for (let i = 0; i < 64 && offset + 8 <= size; i++) {
      const head = new DataView(await file.slice(offset, offset + 16).arrayBuffer());
      let boxSize = head.getUint32(0);
      const type = String.fromCharCode(head.getUint8(4), head.getUint8(5), head.getUint8(6), head.getUint8(7));
      let headerLen = 8;
      if (boxSize === 1) { boxSize = Number(head.getBigUint64(8)); headerLen = 16; }
      else if (boxSize === 0) { boxSize = size - offset; }
      if (type === 'moov') {
        const buf = new DataView(await file.slice(offset, offset + Math.min(boxSize, 1 << 20)).arrayBuffer());
        for (let p = headerLen; p + 20 < buf.byteLength; p++) {
          if (buf.getUint8(p) === 0x6d && buf.getUint8(p + 1) === 0x76 && buf.getUint8(p + 2) === 0x68 && buf.getUint8(p + 3) === 0x64) {
            const version = buf.getUint8(p + 4);
            const ct = version === 1 ? Number(buf.getBigUint64(p + 8)) : buf.getUint32(p + 8);
            const unix = ct - EPOCH_1904;
            return unix > 0 ? new Date(unix * 1000) : null;
          }
        }
        return null;
      }
      if (boxSize <= 0) break;
      offset += boxSize;
    }
    return null;
  } catch { return null; }
}

/**
 * ¿Coinciden dos instantes de grabación? Tolera el desfase de zona horaria
 * (DJI a veces guarda el creation_time en local vs UTC): acepta diferencias
 * pequeñas o cercanas a un número entero de horas (hasta ±14 h).
 */
function sameRecordingTime(a, b) {
  if (!a || !b) return null;
  const diff = Math.abs(a - b) / 1000;
  if (diff <= 150) return true;
  const modHour = diff % 3600;
  return diff <= 14 * 3600 && Math.min(modHour, 3600 - modHour) <= 150;
}

/** Duración del vídeo leyendo sus metadatos (sin decodificar el clip). */
function videoDurationSec(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    let done = false;
    const finish = (val) => { if (done) return; done = true; URL.revokeObjectURL(url); resolve(val); };
    v.preload = 'metadata';
    v.onloadedmetadata = () => finish(isFinite(v.duration) && v.duration > 0 ? v.duration : null);
    v.onerror = () => finish(null);
    setTimeout(() => finish(null), 8000); // salvavidas
    v.src = url;
  });
}

/**
 * Pantalla de subida (landing). Reúne la zona de subida, el título y el botón
 * de generar; emite `dji:generate` con { srtText, mp4, title }.
 */
class UploadView extends DjiElement {
  static styles = [styles];

  constructor() {
    super();
    /** @type {{srt: File|null, srtText: string|null, mp4: File|null}} */
    this.files = { srt: null, srtText: null, mp4: null };
  }

  render() {
    this.shadowRoot.innerHTML = `
      <div class="hero">
        <span class="eyebrow-pill">${escapeHtml(t('landing.eyebrow'))}</span>
        <h1>${escapeHtml(t('landing.title'))}</h1>
        <p class="sub">${escapeHtml(t('landing.sub'))}</p>

        <drop-zone id="dz"></drop-zone>

        <div class="gen ${this.files.srt ? '' : 'hidden'}" id="gen">
          <label>${escapeHtml(t('form.title_label'))}</label>
          <input id="title" value="${escapeHtml(t('form.default_title'))}">
          <button class="addmp4" id="addmp4" type="button">
            <span class="mp4-ico">🎬</span>
            <span class="mp4-txt"><span class="mp4-t">${escapeHtml(t('form.add_mp4'))}</span><span class="mp4-sub">${escapeHtml(t('form.add_mp4.sub'))}</span></span>
            <span class="mp4-badge">${escapeHtml(t('form.recommended'))}</span>
          </button>
          <div class="pairmsg" id="pairmsg" hidden></div>
          <button class="go" id="go" type="button">${escapeHtml(t('form.generate'))}</button>
        </div>

        <div class="feats">
          ${this._feat('🛰️', 'feat.map')}
          ${this._feat('🎥', 'feat.frames')}
          ${this._feat('🎯', 'feat.gimbal')}
        </div>
      </div>`;
  }

  _feat(icon, key) {
    return `<div class="feat"><div class="fi">${icon}</div><h4>${escapeHtml(t(key + '.t'))}</h4><p>${escapeHtml(t(key + '.d'))}</p></div>`;
  }

  afterRender() {
    const dz = this.$('#dz');
    this.on(this.$('#title'), 'input', () => { this._titleEdited = true; });
    this.on(dz, 'dz:change', (e) => {
      this.files = e.detail;
      this.$('#gen').classList.toggle('hidden', !this.files.srt);
      this._updateMp4Btn();
      this._validatePair();
      if (this.files.srtText) this._suggestTitle(this.files.srtText);
    });
    this.on(this.$('#addmp4'), 'click', () => dz.pickMp4());
    this.on(this.$('#pairmsg'), 'click', (e) => { if (e.target.closest('.pm-remove')) this._removeVideo(); });
    this._updateMp4Btn();
    this._renderPairMsg();
    this.on(this.$('#go'), 'click', () => {
      if (!this.files.srtText || this._pairStatus?.level === 'error') return;
      const title = (this.$('#title').value || '').trim() || t('form.default_title');
      this.emit('dji:generate', { srtText: this.files.srtText, mp4: this.files.mp4, title, place: this._place || null });
    });
  }

  /** Refleja en el botón si ya hay vídeo (estado "añadido"). */
  _updateMp4Btn() {
    const btn = this.$('#addmp4'); if (!btn) return;
    const has = !!(this.files && this.files.mp4);
    btn.classList.toggle('has', has);
    const ico = btn.querySelector('.mp4-ico'), tt = btn.querySelector('.mp4-t'), sub = btn.querySelector('.mp4-sub'), badge = btn.querySelector('.mp4-badge');
    if (has) { ico.textContent = '✓'; tt.textContent = t('form.mp4_added'); sub.textContent = this.files.mp4.name; badge.hidden = true; }
    else { ico.textContent = '🎬'; tt.textContent = t('form.add_mp4'); sub.textContent = t('form.add_mp4.sub'); badge.hidden = false; }
  }

  /**
   * Comprueba que el SRT y el vídeo sean del mismo vuelo: primero por nombre
   * (los DJI comparten base SRT/MP4) y, si difieren, por duración.
   */
  async _validatePair() {
    const seq = (this._valSeq = (this._valSeq || 0) + 1); // guard de carrera: solo la validación más nueva escribe
    const stale = () => seq !== this._valSeq;
    const { srt, mp4, srtText } = this.files;
    if (!srt || !mp4) { this._pairStatus = null; this._renderPairMsg(); return; }
    // 1) nombre base igual (DJI conserva el nombre entre SRT y MP4)
    if (baseName(srt.name) === baseName(mp4.name)) { this._pairStatus = { level: 'ok', key: 'pair.ok' }; this._renderPairMsg(); return; }
    // si no, comprobamos por contenido: fecha de grabación (principal) y duración
    this._pairStatus = { level: 'checking', key: 'pair.checking' }; this._renderPairMsg();
    const sd = srtDurationSec(srtText || '');
    const sStart = srtStartDate(srtText || '');
    // la fecha de grabación es rápida de leer; con ella ya resolvemos el mismatch
    const vStart = await mp4CreationDate(mp4);
    if (stale()) return; // llegó una validación más nueva mientras comprobábamos
    const tsMatch = sameRecordingTime(sStart, vStart);
    if (tsMatch === false) { // grabación de otro momento → vuelo distinto (sin esperar duración)
      this._pairStatus = { level: 'error', key: 'pair.mismatch_time', dates: { srt: sStart, mp4: vStart } };
      this._renderPairMsg(); return;
    }
    // resto de casos: hace falta la duración del vídeo
    const vd = await videoDurationSec(mp4);
    if (stale()) return;
    const dur = (sd != null && vd != null) ? { srt: sd, mp4: vd } : null;
    const durMatch = (sd != null && vd != null) ? Math.abs(sd - vd) <= Math.max(2.5, sd * 0.04) : null;
    if (tsMatch === true) {
      // misma fecha de grabación → mismo vuelo (aunque renombrado); avisa si es más corto (recorte)
      this._pairStatus = (durMatch === false && vd < sd) ? { level: 'warn', key: 'pair.trim' } : { level: 'ok', key: 'pair.ts_ok' };
    } else if (durMatch === true) {
      this._pairStatus = { level: 'ok', key: 'pair.dur_ok' };
    } else if (durMatch === false) {
      this._pairStatus = vd < sd ? { level: 'warn', key: 'pair.trim' } : { level: 'error', key: 'pair.mismatch', dur };
    } else {
      this._pairStatus = { level: 'warn', key: 'pair.unverified' };
    }
    this._renderPairMsg();
  }

  /** Pinta el aviso de coincidencia SRT↔vídeo y bloquea "Generar" si no cuadra. */
  _renderPairMsg() {
    const el = this.$('#pairmsg'); if (!el) return;
    const s = this._pairStatus;
    if (!s) { el.hidden = true; el.innerHTML = ''; el.className = 'pairmsg'; this._updateGo(); return; }
    const mmss = (n) => `${Math.floor(n / 60)}:${String(Math.round(n % 60)).padStart(2, '0')}`;
    const dfmt = (d) => d.toLocaleString(getLang() === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    const icon = { ok: '✓', checking: '⏳', warn: '⚠️', error: '⚠️' }[s.level] || '';
    let vars = {};
    if (s.dur) vars = { srt: mmss(s.dur.srt), mp4: mmss(s.dur.mp4) };
    else if (s.dates) vars = { srt: dfmt(s.dates.srt), mp4: dfmt(s.dates.mp4) };
    const canRemove = s.level === 'error' || s.level === 'warn';
    el.hidden = false;
    el.className = 'pairmsg ' + s.level;
    el.innerHTML = `<span class="pm-text">${icon} ${escapeHtml(t(s.key, vars))}</span>`
      + (canRemove ? `<button class="pm-remove" type="button">${escapeHtml(t('pair.remove'))}</button>` : '');
    this._updateGo();
  }

  /** Deshabilita "Generar" cuando el vídeo no corresponde al SRT (mismatch). */
  _updateGo() {
    const go = this.$('#go'); if (!go) return;
    go.disabled = this._pairStatus?.level === 'error';
  }

  /** Quita el vídeo cargado (aviso "Quitar vídeo"). */
  _removeVideo() {
    const dz = this.$('#dz'); if (dz) dz.clearMp4();
  }

  /** Prerellena el título con el lugar del vuelo (geocodificación inversa). */
  async _suggestTitle(srtText) {
    if (this._geoSrt === srtText || this._titleEdited) return;
    this._geoSrt = srtText;
    const c = firstCoords(srtText);
    if (!c) return;
    const place = await reverseGeocode(c[0], c[1]);
    if (!place) return;
    this._place = place;
    const input = this.$('#title');
    if (input && !this._titleEdited) input.value = t('form.title_place', { place });
  }
}

customElements.define('upload-view', UploadView);

Object.assign(__x, { UploadView });

};

__m["js/core/base.css.js"] = function (__x, __req) {
const { css } = __req("js/core/css.js");

/** Estilos compartidos por todos los componentes (se adoptan antes que los propios). */
const base = css`
:host { display: block; font-family: var(--font-body); color: var(--color-text); }
* { box-sizing: border-box; }
a { color: var(--color-accent); text-decoration: none; }
a:hover { text-decoration: underline; }
:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 3px; border-radius: 6px; }

.card {
  background: var(--color-surface); border: 1px solid var(--color-divider);
  border-radius: var(--radius-md); padding: var(--space-6);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
}
.eyebrow { text-transform: uppercase; letter-spacing: .16em; font-size: 12px; font-weight: 700; color: var(--color-accent); }
h2.title { font-size: clamp(24px, 3.4vw, 34px); font-weight: 820; letter-spacing: -.02em; margin: 10px 0 6px; line-height: 1.1; }
.sub { color: color-mix(in srgb, var(--color-text) 74%, transparent); max-width: 70ch; margin: 0 0 var(--space-6); font-size: 16px; }
h3 { font-size: 15px; color: color-mix(in srgb, var(--color-text) 74%, transparent); margin: 0 0 12px; font-weight: 650; }
.muted { color: var(--color-text-muted); }

.legend { display: flex; gap: 18px; flex-wrap: wrap; font-size: 12.5px; color: color-mix(in srgb, var(--color-text) 74%, transparent); margin-bottom: 8px; }
.legend span { display: inline-flex; align-items: center; gap: 7px; }
.legend .sw { width: 13px; height: 3px; border-radius: 2px; }
.legend .dot { width: 9px; height: 9px; border-radius: 50%; }

code { background: var(--color-tile); border: 1px solid var(--color-divider); border-radius: 6px; padding: 1px 7px; font-size: 12.5px; font-family: ui-monospace, Menlo, monospace; }
`;

Object.assign(__x, { base });

};

__m["js/core/css.js"] = function (__x, __req) {
/**
 * Helper de estilos: css`…` → CSSStyleSheet adoptable por un shadow root.
 * @param {TemplateStringsArray} strings
 * @param {...unknown} values
 * @returns {CSSStyleSheet}
 */
function css(strings, ...values) {
  const text = strings.reduce((out, s, i) => out + s + (values[i] ?? ''), '');
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(text);
  return sheet;
}

Object.assign(__x, { css });

};

__m["js/core/DjiElement.js"] = function (__x, __req) {
const { base } = __req("js/core/base.css.js");

/**
 * Clase base de todo componente: crea el shadow root, adopta los estilos,
 * re-renderiza al cambiar el idioma y limpia sus listeners al desconectarse.
 */
class DjiElement extends HTMLElement {
  /** @type {CSSStyleSheet[]} Hojas propias del componente. */
  static styles = [];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.adoptedStyleSheets = [base, ...this.constructor.styles];
    /** @type {Array<() => void>} */
    this._off = [];
  }

  connectedCallback() {
    this._paint();
    this.on(window, 'i18n:changed', () => this._paint());
  }

  disconnectedCallback() {
    this._off.forEach((off) => off());
    this._off = [];
  }

  /** Render + wiring en el orden que fija el patrón. */
  _paint() {
    this.render();
    this.afterRender();
  }

  /** Compone los getters de plantilla en el shadow root. Lo implementa cada componente. */
  render() {}

  /** Todo el cableado: listeners, options, fetch. Lo implementa cada componente. */
  afterRender() {}

  /**
   * Listener que se elimina solo al desconectar el componente.
   * @param {EventTarget} target
   * @param {string} event
   * @param {(e: Event) => void} fn
   * @param {AddEventListenerOptions} [opts]
   */
  on(target, event, fn, opts) {
    target.addEventListener(event, fn, opts);
    this._off.push(() => target.removeEventListener(event, fn, opts));
  }

  /** Emite un evento que burbujea fuera del shadow. */
  emit(name, detail) {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  /** Consulta dentro del shadow (nunca document). */
  $(sel) { return this.shadowRoot.querySelector(sel); }

  /** Consulta múltiple dentro del shadow. */
  $$(sel) { return [...this.shadowRoot.querySelectorAll(sel)]; }
}

Object.assign(__x, { DjiElement });

};

__m["js/core/escape-html.js"] = function (__x, __req) {
const MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/**
 * Escapa texto que se interpola en una plantilla.
 * @param {unknown} value
 * @returns {string}
 */
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => MAP[c]);
}

Object.assign(__x, { escapeHtml });

};

__m["js/core/player-clock.js"] = function (__x, __req) {
// Reloj de reproducción del vuelo: mantiene el instante actual (t) y avisa a
// quien se suscriba (mapa, gráficas, vídeo) en cada fotograma. Es un EventTarget:
//   clock.addEventListener('tick', (e) => ...e.detail.t...)   // instante
//   clock.addEventListener('state', (e) => ...playing/speed...) // controles

class PlayerClock extends EventTarget {
  /** @param {number} dur duración del vuelo en segundos */
  constructor(dur) {
    super();
    this.dur = dur || 0;
    this.t = 0;
    this.playing = false;
    this.speed = 1;
    this._raf = 0;
    this._last = 0;
    this._src = null; // <video> opcional como fuente de tiempo
  }

  /** Usa un vídeo como fuente de tiempo (reproducción nativa, suave). */
  setSource(video) { this._src = video || null; }

  play() {
    if (this.playing || this.dur <= 0) return;
    if (this.t >= this.dur) this.t = 0;
    this.playing = true;
    if (this._src) { this._src.playbackRate = this.speed; this._src.currentTime = this.t; this._src.play().catch(() => {}); }
    else this._last = performance.now();
    this._emit('state');
    this._loop();
  }

  pause() {
    if (!this.playing) return;
    this.playing = false;
    if (this._src) this._src.pause();
    cancelAnimationFrame(this._raf);
    this._emit('state');
  }

  toggle() { this.playing ? this.pause() : this.play(); }

  /** Salta a un instante (segundos). */
  seek(t) {
    this.t = Math.max(0, Math.min(this.dur, t));
    if (this._src) this._src.currentTime = this.t;
    this._emit('tick');
    if (!this.playing) this._emit('state');
  }

  /** @param {number} s velocidad (1, 2, 4…) */
  setSpeed(s) {
    this.speed = s;
    if (this._src) this._src.playbackRate = s;
    this._emit('state');
  }

  /** Detiene el bucle y libera (al desmontar el informe). */
  destroy() { cancelAnimationFrame(this._raf); this.playing = false; }

  _loop() {
    this._raf = requestAnimationFrame((now) => {
      if (!this.playing) return;
      if (this._src) {
        this.t = this._src.currentTime;
        if (this._src.ended || this.t >= this.dur) { this.t = this.dur; this.playing = false; this._emit('tick'); this._emit('state'); return; }
      } else {
        const dt = ((now - this._last) / 1000) * this.speed;
        this._last = now;
        this.t += dt;
        if (this.t >= this.dur) { this.t = this.dur; this.playing = false; this._emit('tick'); this._emit('state'); return; }
      }
      this._emit('tick');
      this._loop();
    });
  }

  _emit(type) {
    this.dispatchEvent(new CustomEvent(type, {
      detail: { t: this.t, playing: this.playing, speed: this.speed, dur: this.dur },
    }));
  }
}

Object.assign(__x, { PlayerClock });

};

__m["js/core/reveal.js"] = function (__x, __req) {
// Revela elementos al entrar en el viewport (scroll-reveal) con IntersectionObserver.
// Progresivo: la clase inicial se pone desde JS, así que sin JS el contenido se ve igual.
// Respeta prefers-reduced-motion y navegadores sin IntersectionObserver (revela al instante).

/**
 * Observa `els`, les añade la clase `hidden` al momento y la clase `in` cuando
 * entran en pantalla (con un escalonado por orden dentro de cada tanda).
 * @param {Element[]} els Elementos a revelar (se les añade la clase `reveal`).
 * @param {object} [opts]
 * @param {number} [opts.threshold=0.12] Fracción visible para disparar.
 * @param {number} [opts.stagger=70] Retardo en ms entre elementos de una misma tanda.
 * @param {string} [opts.cls='reveal'] Clase de estado inicial.
 * @param {number} [opts.fallbackMs=4000] Red de seguridad: si el observer no
 *   dispara (p.ej. pestaña en segundo plano), pasado este tiempo revela lo que
 *   ya esté en pantalla para no dejar contenido oculto.
 * @returns {() => void} Función de limpieza (desconecta el observer).
 */
function reveal(els, { threshold = 0.12, stagger = 70, cls = 'reveal', fallbackMs = 4000 } = {}) {
  els.forEach((el) => el.classList.add(cls));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('in'));
    return () => {};
  }
  const io = new IntersectionObserver((entries, obs) => {
    // escalona solo los que entran juntos en una misma notificación
    entries
      .filter((e) => e.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      .forEach((e, i) => {
        const el = e.target;
        setTimeout(() => el.classList.add('in'), i * stagger);
        obs.unobserve(el);
      });
  }, { threshold, rootMargin: '0px 0px -8% 0px' });
  els.forEach((el) => io.observe(el));
  // Red de seguridad: revela lo que ya debería verse aunque el observer no dispare.
  const safety = setTimeout(() => {
    els.forEach((el) => {
      if (!el.classList.contains('in') && el.getBoundingClientRect().top < innerHeight) {
        el.classList.add('in');
        io.unobserve(el);
      }
    });
  }, fallbackMs);
  return () => { clearTimeout(safety); io.disconnect(); };
}

Object.assign(__x, { reveal });

};

__m["js/daypart.js"] = function (__x, __req) {
// Franja del día del vuelo a partir de la elevación del sol en el instante,
// lugar y fecha de inicio (algoritmo NOAA, sin dependencias).

const RAD = Math.PI / 180;

/**
 * Elevación solar (grados) y signo del ángulo horario (mañana<0 / tarde>0).
 * @param {Date} date instante (UTC) @param {number} lat @param {number} lon
 */
function solarElevation(date, lat, lon) {
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((date - yearStart) / 86400000);
  const hourUTC = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const g = (2 * Math.PI / 365) * (dayOfYear - 1 + (hourUTC - 12) / 24);
  const eqtime = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g)
    - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g)
    + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const tst = hourUTC * 60 + eqtime + 4 * lon; // tiempo solar verdadero (min)
  const ha = (tst / 4 - 180) * RAD;            // ángulo horario (rad)
  const latR = lat * RAD;
  const cosZ = Math.sin(latR) * Math.sin(decl) + Math.cos(latR) * Math.cos(decl) * Math.cos(ha);
  const elevation = 90 - Math.acos(Math.max(-1, Math.min(1, cosZ))) / RAD;
  return { elevation, ha };
}

/**
 * Clasifica la franja del día.
 * @param {string} startStr fecha/hora local del SRT ("YYYY-MM-DD HH:MM:SS")
 * @param {number} lat @param {number} lon
 * @returns {'sunrise'|'sunset'|'morning'|'afternoon'|'night'}
 */
function dayBand(startStr, lat, lon) {
  const date = new Date(startStr.replace(' ', 'T')); // hora local → instante UTC (según zona del navegador)
  const { elevation, ha } = solarElevation(date, lat, lon);
  // orto/ocaso y noche por posición solar; mañana/tarde por hora de reloj (más natural)
  if (elevation < -6) return 'night';
  if (elevation <= 8) return ha < 0 ? 'sunrise' : 'sunset';
  const localHour = parseInt(startStr.slice(11, 13), 10) + parseInt(startStr.slice(14, 16), 10) / 60;
  return localHour < 12 ? 'morning' : 'afternoon';
}

Object.assign(__x, { dayBand });

};

__m["js/export-html.js"] = function (__x, __req) {
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
function buildStandaloneHtml(reportEl, opts = {}) {
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

Object.assign(__x, { buildStandaloneHtml });

};

__m["js/exports.js"] = function (__x, __req) {
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

Object.assign(__x, { toGPX, toKML, toCSV, download, downloadBlob });

};

__m["js/frames.js"] = function (__x, __req) {
// Extracción de fotogramas del MP4 en el propio navegador con <video> + <canvas>.
// El vídeo nunca sale del equipo: se lee con un object URL local y se descarta al terminar.

/**
 * Extrae fotogramas JPEG (dataURL) en los tiempos dados de un archivo de vídeo.
 * @param {File} file archivo MP4/MOV
 * @param {number[]} times segundos a capturar
 * @param {(p:number)=>void} onProgress 0..1
 * @param {number} maxW ancho máximo de salida
 * @param {number} quality calidad JPEG (0..1)
 * @returns {Promise<string[]>} dataURLs alineados con `times`
 */
async function grabFrames(file, times, onProgress = () => {}, maxW = 1600, quality = 0.9) {
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
      out.push(canvas.toDataURL('image/jpeg', quality));
      onProgress((i + 1) / times.length);
    }
    return out;
  } finally {
    v.removeAttribute('src'); v.load(); URL.revokeObjectURL(url);
  }
}

/**
 * Extrae un solo fotograma a resolución nativa del vídeo como Blob (usa toBlob
 * para evitar cadenas gigantes en 4K). PNG sin pérdidas o JPEG de alta calidad.
 * @param {File} file @param {number} secs
 * @param {string} [type='image/png'] MIME de salida
 * @param {number} [quality] calidad JPEG (0..1); ignorado en PNG
 * @returns {Promise<Blob>}
 */
async function grabFullFrame(file, secs, type = 'image/png', quality) {
  const url = URL.createObjectURL(file);
  const v = document.createElement('video');
  v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
  try {
    await withTimeout(once(v, 'loadedmetadata'), 20000);
    try { await v.play(); v.pause(); } catch (_) {}
    const cw = v.videoWidth, ch = v.videoHeight;
    const canvas = document.createElement('canvas'); canvas.width = cw; canvas.height = ch;
    canvas.getContext('2d').drawImage(v, 0, 0, cw, ch);
    const t = Math.max(0, Math.min((v.duration || 1e9) - 0.05, secs));
    await seek(v, t);
    canvas.getContext('2d').drawImage(v, 0, 0, cw, ch);
    const blob = await new Promise((res) => canvas.toBlob(res, type, quality));
    if (!blob) throw new Error('No se pudo codificar el fotograma.');
    return blob;
  } finally {
    v.removeAttribute('src'); v.load(); URL.revokeObjectURL(url);
  }
}

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
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

Object.assign(__x, { grabFrames, grabFullFrame });

};

__m["js/geo.js"] = function (__x, __req) {
// Proyección Web Mercator, configuración de teselas y puntos clave del vuelo.
// Puerto de src/common.py (keypoints) y src/satellite.py (cálculo de teselas).

const { hav } = __req("js/srt.js");

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
  const dla = (la1 - la0) * 0.06 || 1e-4, dlo = (lo1 - lo0) * 0.06 || 1e-4;
  la0 -= dla; la1 += dla; lo0 -= dlo; lo1 += dlo;
  // ensancha el encuadre a formato ligeramente apaisado para que el mapa llene el
  // bloque, pero ceñido al recorrido: así entra más zoom y no se ve pequeño.
  const targetAR = 1.15;
  const cosLat = Math.cos(((la0 + la1) / 2) * Math.PI / 180);
  const wSpan = (lo1 - lo0) * cosLat, hSpan = (la1 - la0);
  if (wSpan / hSpan < targetAR) {
    const add = (hSpan * targetAR / cosLat - (lo1 - lo0)) / 2;
    lo0 -= add; lo1 += add;
  }
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

Object.assign(__x, { mmss, keypoints, tileConfig, projector });

};

__m["js/geocode.js"] = function (__x, __req) {
// Geocodificación inversa (coordenadas -> lugar) con Nominatim de OpenStreetMap,
// sin clave. Falla en silencio (devuelve null) si no hay red o la responde mal.

const { getLang } = __req("js/i18n/index.js");

/**
 * Devuelve el nombre de lugar más adecuado para unas coordenadas.
 * @param {number} lat @param {number} lon
 * @returns {Promise<string|null>}
 */
async function reverseGeocode(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=12&addressdetails=1&lat=${lat}&lon=${lon}&accept-language=${getLang()}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const d = await res.json();
    const a = d.address || {};
    return a.village || a.town || a.city || a.municipality || a.county || a.state_district || a.state || d.name || null;
  } catch (_) {
    return null;
  }
}

/** Extrae las primeras coordenadas (lat, lon) del texto de un .SRT. */
function firstCoords(srtText) {
  const la = srtText.match(/latitude:\s*([-\d.]+)/);
  const lo = srtText.match(/longitude:\s*([-\d.]+)/);
  return la && lo ? [parseFloat(la[1]), parseFloat(lo[1])] : null;
}

Object.assign(__x, { reverseGeocode, firstCoords });

};

__m["js/i18n/en.js"] = function (__x, __req) {
/** English dictionary. Keep key parity with es.js (checked by the test). */
__x.default = {
  // chrome
  'brand.name': 'DJI Flight Analysis',
  'brand.tag': 'Telemetry · Route · Gimbal',
  'chrome.reset': '↺ Another flight',
  'chrome.theme': 'Toggle theme',
  'chrome.lang': 'Change language',

  // landing
  'landing.eyebrow': '✦ DJI Flight Analysis',
  'landing.title': 'Turn your drone telemetry into a stunning report',
  'landing.sub': 'Drop your flight .SRT (and, if you like, the .MP4) and instantly get a report with the route over satellite, altitude, speed, camera and gimbal orientation. All in your browser: nothing is uploaded to any server.',
  'drop.title': 'Drop your .SRT file here',
  'drop.hint': 'or click to choose it — you can also add the .MP4 video',
  'drop.cta': 'Choose .SRT file',
  'drop.srt': 'SRT',
  'drop.mp4': 'MP4',
  'drop.none': 'none',
  'drop.optional': 'optional',
  'drop.novideo': 'Without video the report still works, just without the moment frames.',
  'form.title_label': 'Report title',
  'form.default_title': 'Flight with DJI Neo 2',
  'form.title_place': 'Flight over {place}',
  'form.generate': 'Generate report →',
  'form.add_mp4': 'Add the flight video',
  'form.add_mp4.sub': 'Real frames, flight replay and 4K downloads',
  'form.mp4_added': 'Video added',
  'form.recommended': 'Recommended',
  'pair.ok': 'The video matches the SRT.',
  'pair.ts_ok': 'The recording date and time match the SRT.',
  'pair.dur_ok': 'The video duration matches the SRT.',
  'pair.trim': 'Looks like the same flight but the video is shorter: if you trimmed it, later moments will have no frame.',
  'pair.checking': 'Checking they are the same flight…',
  'pair.unverified': 'Could not verify the video duration; make sure it is the same flight as the SRT.',
  'pair.mismatch': 'The video does not look like the same flight as the SRT: durations differ (SRT {srt}, video {mp4}). Check they are the same clip.',
  'pair.mismatch_time': 'The video was recorded at a different date/time than the SRT (video {mp4} · SRT {srt}): not the same flight.',
  'pair.remove': 'Remove video',
  'feat.map.t': 'Route over satellite',
  'feat.map.d': 'GPS track colored by height over real Esri imagery.',
  'feat.frames.t': 'Video frames',
  'feat.frames.d': 'Key moments are cut from the MP4 without uploading it.',
  'feat.gimbal.t': 'Gimbal and camera',
  'feat.gimbal.d': 'Estimated tilt, ISO, color temperature and speed.',

  // progress
  'progress.title': 'Generating your report…',
  'progress.sub': 'All processing happens in your browser.',
  'step.parse': 'Reading the SRT telemetry',
  'step.model': 'Computing route, speed and gimbal',
  'step.frames': 'Cutting frames from the video',
  'step.frames.novideo': 'No video: frames are skipped',
  'step.frames.error': 'The video could not be decoded: report without frames',
  'step.map': 'Downloading satellite imagery',
  'step.render': 'Building the report',
  'error.title': 'Could not generate the report',
  'error.back': '← Back',

  // report · hero
  'hero.kicker': '🚁 Flight telemetry · DJI Neo 2',
  'hero.lede.base': 'A complete frame-by-frame analysis of a {dur} flight {daypart}',
  'hero.lede.place': ' over {place}',
  'hero.lede.tail': ': route, altitude, speed and the key moments captured by the camera.',
  'dur.one': 'one-minute',
  'dur.many': '{n}-minute',
  'daypart.sunrise': 'at sunrise',
  'daypart.sunset': 'at sunset',
  'daypart.morning': 'in the morning',
  'daypart.afternoon': 'in the afternoon',
  'daypart.night': 'at night',
  'hero.duration': 'Duration',
  'hero.altmax': 'Max height',
  'hero.away': 'Farthest',
  'hero.vmax': 'Max speed',
  'hero.frames': '{n} frames',

  // report · summary
  'resumen.eyebrow': 'Summary',
  'resumen.title': 'The flight in numbers',
  'resumen.sub': 'Everything is extracted from the .SRT the drone records alongside the video: one sensor reading per frame, synced with the image.',
  'tile.duration': 'Duration',
  'tile.frames': '{n} frames',
  'tile.altmax': 'Maximum height',
  'tile.altmax.k': 'above takeoff',
  'tile.awaymax': 'Max distance',
  'tile.awaymax.k': 'from the start point',
  'tile.distance': 'Total route',
  'tile.distance.k': 'horizontal distance',
  'tile.speedavg': 'Average speed',
  'tile.speedavg.k': 'max {v} km/h',
  'tile.climb': 'Max climb',
  'tile.climb.k': 'vertical speed',
  'tile.altitude': 'Altitude (MSL)',
  'tile.altitude.k': 'absolute',
  'tile.iso': 'ISO range',
  'tile.iso.k': 'the camera compensated the light',

  // report · moments
  'mom.eyebrow': 'Key moments',
  'mom.title': 'Eight instants of the flight',
  'mom.sub': 'Each card marks a flight milestone with its timestamp and its highlight value.',
  'mom.sub.frames': 'Each card marks a flight milestone with its timestamp and its highlight value, over the real video frame.',
  'mom.novideo.t': '🎬 Add the video to see the frames',
  'mom.novideo.d': 'Start over and add the flight .MP4: the eight moments will appear with the real image of each instant. The video is processed on your device, never uploaded.',
  'mom.error.t': '⚠️ Video not decoded',
  'mom.novideo.badge': 'no video',
  'kp.up': 'Takeoff', 'kp.up.sub': 'Height at start',
  'kp.light': 'Least light', 'kp.light.sub': 'Maximum sensitivity',
  'kp.far': 'Farthest point', 'kp.far.sub': 'From takeoff',
  'kp.hi': 'Highest point', 'kp.hi.sub': 'Above takeoff',
  'kp.topdesc': 'Descent start', 'kp.topdesc.sub': 'Starts coming down',
  'kp.fast': 'Top speed', 'kp.fast.sub': 'Horizontal',
  'kp.dive': 'Fastest descent', 'kp.dive.sub': 'Max drop',
  'kp.down': 'Landing', 'kp.down.sub': 'On touchdown',

  // report · route
  'route.eyebrow': 'Route',
  'route.title': 'The route over the terrain',
  'route.sub': 'Real track over satellite imagery. Color shows height: blue = low → orange = high.',
  'route.leg.takeoff': 'Takeoff / landing',
  'route.leg.moments': 'Key moments',
  'route.leg.height': 'Low → high',
  'route.note': 'Satellite imagery: Esri World Imagery · track reconstructed from the flight GPS',
  'route.scrolly': 'Scroll to fly the route · or press ▶',
  'map.loading': 'Loading satellite imagery…',
  'player.play': 'Play the flight',
  'player.pause': 'Pause',
  'player.seek': 'Seek in the flight',
  'lightbox.close': 'Close',
  'lightbox.prev': 'Previous',
  'lightbox.next': 'Next',
  'lightbox.download': 'Download',
  'lightbox.downloading': 'Preparing…',
  'lightbox.lossless': 'lossless',

  // report · altitude
  'alt.eyebrow': 'Altitude',
  'alt.title': 'Height profile',
  'alt.sub': 'Height above the takeoff point over time.',
  'alt.series': 'Height',

  // report · dynamics
  'dyn.eyebrow': 'Dynamics',
  'dyn.title': 'Speed and distance',
  'dyn.sub': 'Ground and vertical speed, and how far the drone went from the takeoff point.',
  'dyn.speed.h3': 'Horizontal and vertical speed',
  'dyn.speed.h': 'Horizontal (km/h)',
  'dyn.speed.v': 'Vertical (m/s)',
  'dyn.dist.h3': 'Distance to takeoff point',
  'dyn.dist.legend': 'Distance (m)',

  // report · camera
  'cam.eyebrow': 'Camera',
  'cam.title': 'The light during the flight',
  'cam.sub': 'Exposure settings are recorded in every frame: you can see how the camera compensated the light. ISO {iso}, color temp {ctmin}–{ctmax} K.',
  'cam.h3': 'ISO and color temperature over time',
  'cam.iso': 'ISO',
  'cam.ct': 'Color temp (K)',
  'cam.light.h3': 'How the light changed',
  'cam.light.start': 'start',
  'cam.light.mid': 'middle',
  'cam.light.end': 'end',

  // report · estimated wind
  'wind.eyebrow': 'Estimated wind',
  'wind.title': 'The wind during the flight',
  'wind.sub': 'Estimated with the wind-triangle method: how ground speed changed with the drone\'s heading.',
  'wind.speed': 'Wind speed',
  'wind.speed.k': 'estimated',
  'wind.dir': 'Coming from',
  'wind.dir.k': 'azimuth {deg}°',
  'wind.airspeed': 'Airspeed',
  'wind.airspeed.k': 'of the drone, estimated',
  'wind.quality.good': 'Reliable estimate: the flight had varied headings.',
  'wind.quality.rough': 'Rough estimate: the flight had few distinct headings.',
  'wind.note.t': '💨 It\'s an estimate',
  'wind.note.d': 'Derived from GPS only (no wind sensor): it assumes constant airspeed and works best on flights with turns.',
  'wind.na.t': '💨 Wind not estimable',
  'wind.na.d': 'This flight does not have enough distinct headings to estimate the wind reliably.',

  // report · height above terrain
  'terrain.eyebrow': 'Height above terrain',
  'terrain.title': 'Real height above ground',
  'terrain.sub': 'Drone height above the terrain below it: flight altitude minus ground elevation (Copernicus elevation model). Differs from height above takeoff when the terrain is not flat.',
  'terrain.loading': '⏳ Fetching terrain elevation…',
  'terrain.error.t': '⚠️ No terrain data',
  'terrain.error.d': 'Could not fetch terrain elevation (offline or service unavailable). The rest of the report is unaffected.',
  'terrain.legend': 'Height above ground',
  'terrain.aglmax': 'Max height above ground',
  'terrain.aglmax.k': 'of the terrain below',
  'terrain.clearance': 'Min height above ground',
  'terrain.clearance.k': 'closest to the ground',
  'terrain.relief': 'Terrain relief',
  'terrain.relief.k': 'under the route',

  // report · solar context
  'solar.eyebrow': 'Solar context',
  'solar.title': 'The sunlight',
  'solar.sub': 'Sun position during the flight, computed from the time, date and takeoff coordinates.',
  'solar.elev': 'Sun elevation',
  'solar.elev.k': 'above the horizon · {end}° at the end',
  'solar.dir': 'Light direction',
  'solar.dir.k': 'azimuth {az}°',
  'solar.phase': 'Light phase',
  'solar.phase.k': 'by the sun height',
  'solar.phase.day': 'Daylight',
  'solar.phase.golden': 'Golden hour',
  'solar.phase.blue': 'Blue hour',
  'solar.phase.twilight': 'Twilight',
  'solar.phase.night': 'Night',

  // report · gimbal
  'gim.eyebrow': 'Gimbal',
  'gim.title': 'Camera orientation (gimbal)',
  'gim.sub': 'The file includes the stabilizer orientation as quaternions (pp_target = target, pp_current = actual) in every frame, plus the EIS and stabilization-crop state. The camera tilt is estimated from that.',
  'gim.h3': 'Estimated camera tilt (pitch)',
  'gim.legend': 'Estimated pitch (°)',
  'gim.note': 'Estimated range: {min}° to {max}°. Value derived from the quaternion; DJI\'s exact axis convention is undocumented, so take it as approximate.',

  // report · location and data
  'loc.eyebrow': 'Location and data',
  'loc.title': 'Where it flew and what you get',
  'loc.coords': 'Coordinates',
  'loc.takeoff': 'Takeoff / landing',
  'loc.center': 'Flight center',
  'loc.gmaps': 'Open in Google Maps ↗',
  'loc.downloads': 'Download flight data',
  'exp.kmz': '🌍 3D KMZ for Google Earth',
  'exp.html': 'HTML report',
  'exp.kmz.gen': '⏳ Generating KMZ…',
  'exp.kmz.hint': 'Downloaded. Open it with Google Earth Pro (double-click), or import it into {link} (Projects menu → Import KML file).',
  'exp.earthweb': 'Google Earth Web',
  'exp.note': 'The .kmz replays the flight animated in 3D in Google Earth, with altitude walls, the key moments and the embedded frames. The .csv has all per-frame data; .gpx/.kml open the track in map apps.',
  'exp.kmz.error': 'Could not generate the KMZ: {msg}',

  // report · notes
  'notes.eyebrow': 'Data quality',
  'notes.title': 'Honest notes',
  'notes.warn.t': '⚠️ GPS micro-jumps',
  'notes.warn.d': 'Between frames the GPS has small jumps that, unfiltered, give impossible speeds (up to {v} km/h). All speeds and distances are computed over 0.5 s windows to remove them.',
  'notes.good.t': '✅ All in your browser',
  'notes.good.d': 'The SRT and video are processed on your device; nothing is uploaded to any server.',
  'foot': 'Generated in the browser from the telemetry · {n} frames · {fecha}',
};

};

__m["js/i18n/es.js"] = function (__x, __req) {
/** Diccionario español. Mantener paridad de claves con en.js (lo comprueba el test). */
__x.default = {
  // chrome
  'brand.name': 'Análisis de vuelos DJI',
  'brand.tag': 'Telemetría · Recorrido · Gimbal',
  'chrome.reset': '↺ Otro vuelo',
  'chrome.theme': 'Cambiar tema',
  'chrome.lang': 'Cambiar idioma',

  // landing
  'landing.eyebrow': '✦ Análisis de vuelos DJI',
  'landing.title': 'Convierte la telemetría de tu dron en un informe espectacular',
  'landing.sub': 'Suelta el .SRT de tu vuelo (y, si quieres, el .MP4) y obtén al instante un informe con recorrido sobre satélite, altitud, velocidad, cámara y orientación del gimbal. Todo en tu navegador: nada se sube a ningún servidor.',
  'drop.title': 'Suelta aquí tu archivo .SRT',
  'drop.hint': 'o haz clic para elegirlo — también puedes añadir el vídeo .MP4',
  'drop.cta': 'Elegir archivo .SRT',
  'drop.srt': 'SRT',
  'drop.mp4': 'MP4',
  'drop.none': 'ninguno',
  'drop.optional': 'opcional',
  'drop.novideo': 'Sin vídeo el informe sale igual, pero sin los fotogramas de los momentos.',
  'form.title_label': 'Título del informe',
  'form.default_title': 'Vuelo con DJI Neo 2',
  'form.title_place': 'Vuelo en {place}',
  'form.generate': 'Generar informe →',
  'form.add_mp4': 'Añade el vídeo del vuelo',
  'form.add_mp4.sub': 'Fotogramas reales, replay del vuelo y descargas en 4K',
  'form.mp4_added': 'Vídeo añadido',
  'form.recommended': 'Recomendado',
  'pair.ok': 'El vídeo coincide con el SRT.',
  'pair.ts_ok': 'La fecha y hora de grabación coinciden con el SRT.',
  'pair.dur_ok': 'La duración del vídeo coincide con el SRT.',
  'pair.trim': 'Parece el mismo vuelo pero el vídeo es más corto: si lo recortaste, los momentos posteriores no tendrán fotograma.',
  'pair.checking': 'Comprobando que sean del mismo vuelo…',
  'pair.unverified': 'No se pudo verificar la duración del vídeo; asegúrate de que sea del mismo vuelo que el SRT.',
  'pair.mismatch': 'El vídeo no parece del mismo vuelo que el SRT: duraciones distintas (SRT {srt}, vídeo {mp4}). Revisa que sean del mismo clip.',
  'pair.mismatch_time': 'El vídeo se grabó en otra fecha/hora que el SRT (vídeo {mp4} · SRT {srt}): no es el mismo vuelo.',
  'pair.remove': 'Quitar vídeo',
  'feat.map.t': 'Recorrido sobre satélite',
  'feat.map.d': 'Trazado GPS coloreado por altura sobre imagen real de Esri.',
  'feat.frames.t': 'Fotogramas del vídeo',
  'feat.frames.d': 'Los momentos clave se recortan del MP4 sin subirlo a internet.',
  'feat.gimbal.t': 'Gimbal y cámara',
  'feat.gimbal.d': 'Inclinación estimada, ISO, temperatura de color y velocidad.',

  // progreso
  'progress.title': 'Generando tu informe…',
  'progress.sub': 'Todo el procesado ocurre en tu navegador.',
  'step.parse': 'Leyendo la telemetría del SRT',
  'step.model': 'Calculando recorrido, velocidad y gimbal',
  'step.frames': 'Recortando fotogramas del vídeo',
  'step.frames.novideo': 'Sin vídeo: se omiten los fotogramas',
  'step.frames.error': 'El vídeo no se pudo decodificar: informe sin fotogramas',
  'step.map': 'Descargando imagen de satélite',
  'step.render': 'Montando el informe',
  'error.title': 'No se pudo generar el informe',
  'error.back': '← Volver',

  // informe · portada
  'hero.kicker': '🚁 Telemetría de vuelo · DJI Neo 2',
  'hero.lede.base': 'Un análisis completo, fotograma a fotograma, de un vuelo de {dur} {daypart}',
  'hero.lede.place': ' sobre {place}',
  'hero.lede.tail': ': recorrido, altitud, velocidad y los momentos clave capturados por la cámara.',
  'dur.one': 'un minuto',
  'dur.many': '{n} minutos',
  'daypart.sunrise': 'al amanecer',
  'daypart.sunset': 'al atardecer',
  'daypart.morning': 'por la mañana',
  'daypart.afternoon': 'por la tarde',
  'daypart.night': 'nocturno',
  'hero.duration': 'Duración',
  'hero.altmax': 'Altura máx.',
  'hero.away': 'Alejamiento',
  'hero.vmax': 'Vel. máx.',
  'hero.frames': '{n} fotogramas',

  // informe · resumen
  'resumen.eyebrow': 'Resumen',
  'resumen.title': 'El vuelo en cifras',
  'resumen.sub': 'Todo se extrae del archivo .SRT que el dron graba junto al vídeo: una lectura de sensores por cada fotograma, sincronizada con la imagen.',
  'tile.duration': 'Duración',
  'tile.frames': '{n} fotogramas',
  'tile.altmax': 'Altura máxima',
  'tile.altmax.k': 'sobre el despegue',
  'tile.awaymax': 'Alejamiento máx.',
  'tile.awaymax.k': 'del punto de inicio',
  'tile.distance': 'Recorrido total',
  'tile.distance.k': 'distancia horizontal',
  'tile.speedavg': 'Velocidad media',
  'tile.speedavg.k': 'máx. {v} km/h',
  'tile.climb': 'Ascenso máx.',
  'tile.climb.k': 'velocidad vertical',
  'tile.altitude': 'Altitud (msnm)',
  'tile.altitude.k': 'absoluta',
  'tile.iso': 'Rango ISO',
  'tile.iso.k': 'la cámara compensó la luz',

  // informe · momentos
  'mom.eyebrow': 'Momentos clave',
  'mom.title': 'Ocho instantes del vuelo',
  'mom.sub': 'Cada tarjeta marca un hito del vuelo con su marca de tiempo y su dato destacado.',
  'mom.sub.frames': 'Cada tarjeta marca un hito del vuelo con su marca de tiempo y su dato destacado, sobre el fotograma real del vídeo.',
  'mom.novideo.t': '🎬 Añade el vídeo para ver los fotogramas',
  'mom.novideo.d': 'Vuelve a empezar y añade el .MP4 del vuelo: los ocho momentos aparecerán con la imagen real de cada instante. El vídeo se procesa en tu equipo, no se sube.',
  'mom.error.t': '⚠️ Vídeo no decodificado',
  'mom.novideo.badge': 'sin vídeo',
  'kp.up': 'Despegue', 'kp.up.sub': 'Altura al iniciar',
  'kp.light': 'Menos luz', 'kp.light.sub': 'Máxima sensibilidad',
  'kp.far': 'Punto más lejano', 'kp.far.sub': 'Del despegue',
  'kp.hi': 'Punto más alto', 'kp.hi.sub': 'Sobre el despegue',
  'kp.topdesc': 'Inicio del descenso', 'kp.topdesc.sub': 'Empieza a bajar',
  'kp.fast': 'Velocidad máxima', 'kp.fast.sub': 'Horizontal',
  'kp.dive': 'Descenso más rápido', 'kp.dive.sub': 'Bajada máxima',
  'kp.down': 'Aterrizaje', 'kp.down.sub': 'Al tocar suelo',

  // informe · recorrido
  'route.eyebrow': 'Recorrido',
  'route.title': 'El recorrido sobre el terreno',
  'route.sub': 'Trazado real sobre imagen de satélite. El color indica la altura: azul = bajo → naranja = alto.',
  'route.leg.takeoff': 'Despegue / aterrizaje',
  'route.leg.moments': 'Momentos clave',
  'route.leg.height': 'Altura baja → alta',
  'route.note': 'Imagen de satélite: Esri World Imagery · trazado reconstruido con el GPS del vuelo',
  'route.scrolly': 'Desplázate para volar el recorrido · o pulsa ▶',
  'map.loading': 'Cargando imagen de satélite…',
  'player.play': 'Reproducir el vuelo',
  'player.pause': 'Pausa',
  'player.seek': 'Buscar en el vuelo',
  'lightbox.close': 'Cerrar',
  'lightbox.prev': 'Anterior',
  'lightbox.next': 'Siguiente',
  'lightbox.download': 'Descargar',
  'lightbox.downloading': 'Preparando…',
  'lightbox.lossless': 'sin pérdidas',

  // informe · altitud
  'alt.eyebrow': 'Altitud',
  'alt.title': 'Perfil de altura',
  'alt.sub': 'Altura sobre el punto de despegue a lo largo del tiempo.',
  'alt.series': 'Altura',

  // informe · dinámica
  'dyn.eyebrow': 'Dinámica',
  'dyn.title': 'Velocidad y distancia',
  'dyn.sub': 'Velocidad sobre el terreno y vertical, y cuánto se alejó el dron del punto de despegue.',
  'dyn.speed.h3': 'Velocidad horizontal y vertical',
  'dyn.speed.h': 'Horizontal (km/h)',
  'dyn.speed.v': 'Vertical (m/s)',
  'dyn.dist.h3': 'Distancia al punto de despegue',
  'dyn.dist.legend': 'Distancia (m)',

  // informe · cámara
  'cam.eyebrow': 'Cámara',
  'cam.title': 'La luz durante el vuelo',
  'cam.sub': 'Los ajustes de exposición van grabados en cada fotograma: se ve cómo la cámara compensó la luz. ISO {iso}, temp. de color {ctmin}–{ctmax} K.',
  'cam.h3': 'ISO y temperatura de color en el tiempo',
  'cam.iso': 'ISO',
  'cam.ct': 'Temp. color (K)',
  'cam.light.h3': 'Cómo cambió la luz',
  'cam.light.start': 'inicio',
  'cam.light.mid': 'mitad',
  'cam.light.end': 'final',

  // informe · viento estimado
  'wind.eyebrow': 'Viento estimado',
  'wind.title': 'El viento durante el vuelo',
  'wind.sub': 'Estimado con el método del triángulo del viento: cómo cambiaba la velocidad sobre el suelo según el rumbo del dron.',
  'wind.speed': 'Velocidad del viento',
  'wind.speed.k': 'estimada',
  'wind.dir': 'Viene del',
  'wind.dir.k': 'azimut {deg}°',
  'wind.airspeed': 'Vel. respecto al aire',
  'wind.airspeed.k': 'del dron, estimada',
  'wind.quality.good': 'Estimación fiable: el vuelo tuvo rumbos variados.',
  'wind.quality.rough': 'Estimación aproximada: el vuelo tuvo pocos rumbos distintos.',
  'wind.note.t': '💨 Es una estimación',
  'wind.note.d': 'Se deduce solo del GPS (no hay sensor de viento): supone velocidad respecto al aire constante y sale mejor en vuelos con giros.',
  'wind.na.t': '💨 Viento no estimable',
  'wind.na.d': 'Este vuelo no tiene suficientes rumbos distintos para estimar el viento de forma fiable.',

  // informe · altura sobre el terreno
  'terrain.eyebrow': 'Altura sobre el terreno',
  'terrain.title': 'Altura real sobre el suelo',
  'terrain.sub': 'Altura del dron sobre el terreno que sobrevuela: altitud del vuelo menos la elevación del suelo (modelo de elevación Copernicus). Difiere de la altura sobre el despegue cuando el terreno no es plano.',
  'terrain.loading': '⏳ Obteniendo la elevación del terreno…',
  'terrain.error.t': '⚠️ Sin datos de terreno',
  'terrain.error.d': 'No se pudo obtener la elevación del terreno (sin conexión o servicio no disponible). El resto del informe no se ve afectado.',
  'terrain.legend': 'Altura sobre el suelo',
  'terrain.aglmax': 'Altura máx. sobre el suelo',
  'terrain.aglmax.k': 'del terreno que sobrevuela',
  'terrain.clearance': 'Altura mín. sobre el suelo',
  'terrain.clearance.k': 'lo más cerca del suelo',
  'terrain.relief': 'Desnivel del terreno',
  'terrain.relief.k': 'bajo el recorrido',

  // informe · contexto solar
  'solar.eyebrow': 'Contexto solar',
  'solar.title': 'La luz del sol',
  'solar.sub': 'Posición del sol durante el vuelo, calculada a partir de la hora, la fecha y las coordenadas del despegue.',
  'solar.elev': 'Elevación del sol',
  'solar.elev.k': 'sobre el horizonte · {end}° al final',
  'solar.dir': 'Dirección de la luz',
  'solar.dir.k': 'azimut {az}°',
  'solar.phase': 'Fase de luz',
  'solar.phase.k': 'según la altura del sol',
  'solar.phase.day': 'Día',
  'solar.phase.golden': 'Hora dorada',
  'solar.phase.blue': 'Hora azul',
  'solar.phase.twilight': 'Crepúsculo',
  'solar.phase.night': 'Noche',

  // informe · gimbal
  'gim.eyebrow': 'Gimbal',
  'gim.title': 'Orientación de la cámara (gimbal)',
  'gim.sub': 'El archivo incluye la orientación del estabilizador como cuaterniones (pp_target = objetivo, pp_current = real) en cada fotograma, más el estado del EIS y del recorte de estabilización. De ahí se estima la inclinación de la cámara.',
  'gim.h3': 'Inclinación estimada de cámara (pitch)',
  'gim.legend': 'Pitch estimado (°)',
  'gim.note': 'Rango estimado: {min}° a {max}°. Valor derivado del cuaternión; la convención exacta de ejes de DJI no está documentada, tómalo como aproximado.',

  // informe · ubicación y datos
  'loc.eyebrow': 'Ubicación y datos',
  'loc.title': 'Dónde voló y qué te llevas',
  'loc.coords': 'Coordenadas',
  'loc.takeoff': 'Despegue / aterrizaje',
  'loc.center': 'Centro del vuelo',
  'loc.gmaps': 'Ver en Google Maps ↗',
  'loc.downloads': 'Descargar datos del vuelo',
  'exp.kmz': '🌍 KMZ 3D para Google Earth',
  'exp.html': 'Informe HTML',
  'exp.kmz.gen': '⏳ Generando KMZ…',
  'exp.kmz.hint': 'Descargado. Ábrelo con Google Earth Pro (doble clic), o impórtalo en {link} (menú Proyectos → Importar archivo KML).',
  'exp.earthweb': 'Google Earth Web',
  'exp.note': 'El .kmz reproduce el vuelo animado en 3D en Google Earth, con muros de altitud, los momentos clave y los fotogramas incrustados. El .csv tiene todos los datos por fotograma; .gpx/.kml abren el trazado en apps de mapas.',
  'exp.kmz.error': 'No se pudo generar el KMZ: {msg}',

  // informe · notas
  'notes.eyebrow': 'Calidad de los datos',
  'notes.title': 'Notas honestas',
  'notes.warn.t': '⚠️ Micro-saltos del GPS',
  'notes.warn.d': 'Entre fotogramas el GPS tiene pequeños saltos que, sin filtrar, dan velocidades imposibles (hasta {v} km/h). Todas las velocidades y distancias se calculan en ventanas de 0,5 s para eliminarlos.',
  'notes.good.t': '✅ Todo en tu navegador',
  'notes.good.d': 'El SRT y el vídeo se procesan en tu equipo; no se sube nada a ningún servidor.',
  'foot': 'Generado en el navegador a partir de la telemetría · {n} fotogramas · {fecha}',
};

};

__m["js/i18n/index.js"] = function (__x, __req) {
const es = __req("js/i18n/es.js").default;
const en = __req("js/i18n/en.js").default;

const DICTS = { es, en };
let lang = 'es';

/**
 * Traduce una clave del diccionario activo.
 * @param {string} key
 * @param {Record<string, string|number>} [vars] Sustituye los huecos {nombre}.
 * @returns {string}
 */
function t(key, vars) {
  const s = DICTS[lang][key] ?? DICTS.es[key] ?? key;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;
}

/**
 * Cambia el idioma y avisa a los componentes para que se repinten.
 * @param {'es'|'en'} next
 */
function setLang(next) {
  if (!DICTS[next] || next === lang) return;
  lang = next;
  document.documentElement.lang = next;
  try { localStorage.setItem('dji-lang', next); } catch (_) {}
  window.dispatchEvent(new CustomEvent('i18n:changed', { detail: { lang: next } }));
}

/** @returns {'es'|'en'} El idioma activo. */
function getLang() { return lang; }

/** Restaura el idioma guardado (o el del navegador) sin emitir evento. */
function initLang() {
  let saved;
  try { saved = localStorage.getItem('dji-lang'); } catch (_) {}
  const nav = (navigator.language || 'es').slice(0, 2);
  lang = DICTS[saved] ? saved : (DICTS[nav] ? nav : 'es');
  document.documentElement.lang = lang;
}

Object.assign(__x, { t, setLang, getLang, initLang });

};

__m["js/kmz.js"] = function (__x, __req) {
// Genera el .kmz avanzado en el navegador: track animado en 3D (barra de tiempo),
// muros de altitud, puntos clave con globos ricos y fotogramas, marcas de minuto.
// Iconos y sparkline se dibujan en canvas → KMZ autónomo, sin assets externos.
// Puerto de src/kmz.py.

const { hav } = __req("js/srt.js");
const { keypoints } = __req("js/geo.js");
const { makeZip, dataUrlToBytes } = __req("js/zip.js");

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

Object.assign(__x, { buildKMZ });

};

__m["js/satmap.js"] = function (__x, __req) {
// Mapa de satélite: teselas Esri World Imagery (sin clave) + track coloreado por altura
// + marcadores de despegue e hitos con miniatura. Devuelve un elemento listo para insertar.

const { tileConfig, projector } = __req("js/geo.js");

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
function buildMap(model, kps, loadingText = '') {
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

  // track: halo + segmentos por color, agrupados bajo una máscara para el "draw-in"
  // (un path blanco de todo el recorrido revela el track a lo largo del trazado).
  const full = 'M' + T.map(p => `${PX(p[1]).toFixed(1)},${PY(p[0]).toFixed(1)}`).join('L');
  const maskId = 'trk-' + Math.random().toString(36).slice(2, 9);
  const maskPath = el('path', { d: full, stroke: '#fff', 'stroke-width': 16, fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
  const maskEl = el('mask', { id: maskId, maskUnits: 'userSpaceOnUse' });
  maskEl.appendChild(maskPath);
  const defs = el('defs'); defs.appendChild(maskEl); svg.appendChild(defs);
  const trackG = el('g', { mask: `url(#${maskId})` });
  trackG.appendChild(el('path', { d: full, stroke: 'rgba(0,0,0,.55)', 'stroke-width': 11, fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
  for (let i = 1; i < T.length; i++)
    trackG.appendChild(el('path', { d: `M${PX(T[i - 1][1]).toFixed(1)},${PY(T[i - 1][0]).toFixed(1)}L${PX(T[i][1]).toFixed(1)},${PY(T[i][0]).toFixed(1)}`, stroke: colorForAlt(T[i][2], relmax), 'stroke-width': 7, fill: 'none', 'stroke-linecap': 'round' }));
  svg.appendChild(trackG);

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

  // draw-in del recorrido: oculta el track (armTrack) y lo dibuja a lo largo del
  // trazado (playTrack). Si nunca se llaman, el track se ve completo (máscara al 100%).
  let trackLen = 0;
  const armTrack = () => {
    trackLen = maskPath.getTotalLength();
    maskPath.style.strokeDasharray = `${trackLen}`;
    maskPath.style.strokeDashoffset = `${trackLen}`;
  };
  const playTrack = () => {
    if (!trackLen) armTrack();
    const dur = 1400, t0 = performance.now(), ease = (x) => 1 - Math.pow(1 - x, 3);
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      maskPath.style.strokeDashoffset = `${trackLen * (1 - ease(p))}`;
      if (p < 1) requestAnimationFrame(step); else maskPath.style.strokeDashoffset = '0';
    };
    requestAnimationFrame(step);
  };

  wrap.appendChild(ov);
  return { el: wrap, setPlayhead, clearPlayhead, armTrack, playTrack };
}

const mmss = (t) => { t = Math.round(t); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };

Object.assign(__x, { buildMap });

};

__m["js/solar.js"] = function (__x, __req) {
// Posición del sol (elevación y azimut) y fase de luz para un instante y lugar.
// Algoritmo NOAA, sin dependencias. Complementa a daypart.js con el azimut.

const RAD = Math.PI / 180;

/**
 * Posición del sol para una fecha (instante UTC) y coordenadas.
 * @param {Date} date @param {number} lat @param {number} lon
 * @returns {{elevation:number, azimuth:number}} grados; azimut 0=N, 90=E, 180=S, 270=O.
 */
function solarPosition(date, lat, lon) {
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((date - yearStart) / 86400000);
  const hourUTC = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const g = (2 * Math.PI / 365) * (dayOfYear - 1 + (hourUTC - 12) / 24);
  const eqtime = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g)
    - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g)
    + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const tst = hourUTC * 60 + eqtime + 4 * lon; // tiempo solar verdadero (min)
  const ha = (tst / 4 - 180) * RAD;            // ángulo horario (rad)
  const latR = lat * RAD;
  const cosZ = Math.sin(latR) * Math.sin(decl) + Math.cos(latR) * Math.cos(decl) * Math.cos(ha);
  const elevation = 90 - Math.acos(Math.max(-1, Math.min(1, cosZ))) / RAD;
  // azimut desde el sur (+ hacia el oeste); se pasa a desde el norte (0=N, sentido horario)
  const azSouth = Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(latR) - Math.tan(decl) * Math.cos(latR));
  const azimuth = (azSouth / RAD + 180 + 360) % 360;
  return { elevation, azimuth };
}

/**
 * Fase de luz según la elevación solar.
 * @param {number} elevation grados
 * @returns {'day'|'golden'|'blue'|'twilight'|'night'}
 */
function lightPhase(elevation) {
  if (elevation < -6) return 'night';
  if (elevation < -0.833) return 'blue';   // hora azul (crepúsculo civil)
  if (elevation <= 6) return 'golden';     // hora dorada (sol bajo)
  return 'day';
}

/** Punto cardinal (16 rumbos) para un azimut en grados. */
function azToCompass(az) {
  const pts = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
  return pts[Math.round(((az % 360) / 22.5)) % 16];
}

Object.assign(__x, { solarPosition, lightPhase, azToCompass });

};

__m["js/srt.js"] = function (__x, __req) {
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

Object.assign(__x, { hav, parseSRT });

};

__m["js/terrain.js"] = function (__x, __req) {
// Elevación del terreno bajo el vuelo, para calcular la altura real sobre el suelo (AGL).
// Usa la API de elevación de Open-Meteo (DEM Copernicus ~90 m, con CORS, sin clave).
// No sube el SRT ni el vídeo; solo consulta coordenadas, como las teselas del mapa.

const ENDPOINT = 'https://api.open-meteo.com/v1/elevation';

/**
 * Elevación (m sobre el nivel del mar) para una lista de puntos [lat, lon].
 * Trocea en peticiones de ≤100 puntos. Devuelve un array alineado o null si falla.
 * @param {Array<[number, number]>} points
 * @returns {Promise<number[]|null>}
 */
async function fetchTerrain(points) {
  if (!Array.isArray(points) || !points.length) return null;
  const out = [];
  try {
    for (let i = 0; i < points.length; i += 100) {
      const chunk = points.slice(i, i + 100);
      const lat = chunk.map((p) => p[0].toFixed(5)).join(',');
      const lon = chunk.map((p) => p[1].toFixed(5)).join(',');
      const res = await fetch(`${ENDPOINT}?latitude=${lat}&longitude=${lon}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (!Array.isArray(data.elevation) || data.elevation.length !== chunk.length) return null;
      out.push(...data.elevation);
    }
  } catch {
    return null;
  }
  return out.length === points.length ? out : null;
}

Object.assign(__x, { fetchTerrain });

};

__m["js/wind.js"] = function (__x, __req) {
// Viento estimado por el método del triángulo del viento.
// Si el dron vuela a velocidad respecto al aire ~constante en varios rumbos,
// sus vectores de velocidad de tierra (este, norte) trazan un círculo cuyo
// CENTRO es el viento y cuyo RADIO es la velocidad respecto al aire (airspeed).
// Es una estimación: requiere variedad de rumbos y sale mejor en vuelos con giros.

/** Ajuste de círculo por mínimos cuadrados algebraicos (método de Kåsa). */
function kasaFit(pts) {
  let Sx = 0, Sy = 0, Sxx = 0, Syy = 0, Sxy = 0, Sxz = 0, Syz = 0, Sz = 0;
  const n = pts.length;
  for (const [x, y] of pts) {
    const z = x * x + y * y;
    Sx += x; Sy += y; Sxx += x * x; Syy += y * y; Sxy += x * y; Sxz += x * z; Syz += y * z; Sz += z;
  }
  // Resuelve [Sxx Sxy Sx; Sxy Syy Sy; Sx Sy n]·[A;B;C] = [Sxz;Syz;Sz]  (círculo x²+y² = A·x + B·y + C)
  const M = [[Sxx, Sxy, Sx], [Sxy, Syy, Sy], [Sx, Sy, n]];
  const rhs = [Sxz, Syz, Sz];
  const det3 = (m) =>
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
    - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
    + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const D = det3(M);
  if (Math.abs(D) < 1e-9) return null;
  const col = (m, i, v) => m.map((row, r) => row.map((val, c) => (c === i ? v[r] : val)));
  const A = det3(col(M, 0, rhs)) / D;
  const B = det3(col(M, 1, rhs)) / D;
  const C = det3(col(M, 2, rhs)) / D;
  const a = A / 2, b = B / 2;
  const r2 = C + a * a + b * b;
  if (r2 <= 0) return null;
  const r = Math.sqrt(r2);
  // residuo relativo del ajuste (0 = perfecto)
  let res = 0;
  for (const [x, y] of pts) res += (Math.hypot(x - a, y - b) - r) ** 2;
  return { a, b, r, rms: Math.sqrt(res / n) };
}

/**
 * Estima el viento a partir de la serie del vuelo.
 * @param {Array<{t:number,lat:number,lon:number}>} series
 * @returns {null | {speed:number, fromDeg:number, airspeed:number, quality:'good'|'rough', n:number}}
 *   speed = m/s del viento; fromDeg = dirección DE DÓNDE viene (0=N); airspeed = m/s respecto al aire.
 */
function estimateWind(series) {
  // velocidad de tierra (este, norte) sobre ventanas de ~2 s para suavizar el ruido GPS
  const samples = [];
  let prev = null;
  for (const s of series) {
    if (s.lat == null || s.lon == null) continue;
    if (!prev) { prev = s; continue; }
    const dt = s.t - prev.t;
    if (dt < 1.5) continue;
    const latR = (prev.lat + s.lat) / 2 * Math.PI / 180;
    const vE = (s.lon - prev.lon) * 111320 * Math.cos(latR) / dt;
    const vN = (s.lat - prev.lat) * 110540 / dt;
    prev = s;
    const sp = Math.hypot(vE, vN);
    if (sp < 2 || sp > 25) continue; // solo crucero razonable
    samples.push([vE, vN]);
  }
  if (samples.length < 12) return null;
  // variedad de rumbos: repartimos en 8 sectores; hacen falta ≥5 ocupados
  const sectors = new Set();
  for (const [x, y] of samples) sectors.add(Math.floor(((Math.atan2(x, y) * 180 / Math.PI + 360) % 360) / 45));
  if (sectors.size < 5) return null;
  const fit = kasaFit(samples);
  if (!fit) return null;
  const speed = Math.hypot(fit.a, fit.b);
  if (fit.r < 1 || speed > fit.r * 1.5) return null; // airspeed irreal o viento mayor que airspeed → poco fiable
  const towardDeg = (Math.atan2(fit.a, fit.b) * 180 / Math.PI + 360) % 360; // hacia donde empuja el viento
  const fromDeg = (towardDeg + 180) % 360;                                  // de dónde viene (convención meteo)
  const quality = (sectors.size >= 6 && fit.rms < fit.r * 0.35) ? 'good' : 'rough';
  return { speed, fromDeg, airspeed: fit.r, quality, n: samples.length };
}

Object.assign(__x, { estimateWind });

};

__m["js/zip.js"] = function (__x, __req) {
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

Object.assign(__x, { makeZip, dataUrlToBytes });

};

  __req('main.js');
})();
