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

__m["js/components/ui/flight-3d/flight-3d.css.js"] = function (__x, __req) {
const { css } = __req("js/core/css.js");

const styles = css`
:host { display: block; }
.v3d {
  position: relative; width: 100%; aspect-ratio: 16 / 10; border-radius: 16px; overflow: hidden;
  background: radial-gradient(120% 120% at 50% 0%, #1b2740 0%, #0d131f 70%);
  border: 1px solid var(--color-divider);
}
canvas { display: block; width: 100%; height: 100%; touch-action: none; cursor: grab; }
canvas:active { cursor: grabbing; }

/* pantalla completa: el contenedor llena la pantalla (sin aspect-ratio ni bordes) */
.v3d:fullscreen { width: 100%; height: 100%; aspect-ratio: auto; border-radius: 0; border: none; }
.v3d:fullscreen canvas { height: 100%; }

/* estado de carga */
.v3d.loading::after {
  content: ""; position: absolute; inset: 0; z-index: 4;
  background: linear-gradient(100deg, #131c2c 30%, #1c2840 50%, #131c2c 70%);
  background-size: 220% 100%; animation: shimmer 1.3s ease-in-out infinite;
}
.v3d-loading {
  position: absolute; inset: 0; z-index: 5; display: grid; place-items: center;
  color: #aeb8cc; font-size: 13px; text-align: center; padding: 0 24px; pointer-events: none;
}
.v3d:not(.loading) .v3d-loading { display: none; }
@keyframes shimmer { 0% { background-position: 130% 0; } 100% { background-position: -130% 0; } }

/* controles */
.v3d-bar {
  position: absolute; left: 12px; right: 12px; bottom: 12px; z-index: 6;
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap; row-gap: 8px;
  padding: 9px 12px; border-radius: 100px;
  background: rgba(12,17,26,.62); backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,.1);
}
.v3d-bar[hidden] { display: none; } /* el atributo hidden debe ganar a display:flex */
.v3d-btn {
  flex: none; display: inline-flex; align-items: center; gap: 6px;
  height: 34px; padding: 0 14px; border-radius: 100px; cursor: pointer;
  border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.08);
  color: #eef2f8; font: inherit; font-size: 13px; font-weight: 600;
  transition: background .12s, border-color .12s;
}
.v3d-btn:hover { background: rgba(255,255,255,.16); }
.v3d-btn.primary { background: var(--color-accent); border-color: transparent; color: #fff; }
.v3d-btn.on { background: var(--color-accent); border-color: transparent; color: #fff; }
#speed { min-width: 40px; font-variant-numeric: tabular-nums; }
.v3d-btn svg { width: 15px; height: 15px; }
#settings, #export, #reset, #fs { padding: 0 10px; }
.v3d-btn[hidden] { display: none; }
.v3d-sep { flex: none; width: 1px; align-self: stretch; margin: 2px 1px; background: rgba(255,255,255,.14); }
#fs .fs-in { display: none; }
#fs.on .fs-out { display: none; }
#fs.on .fs-in { display: block; }

/* panel de ajustes (capas del render) */
.v3d-opts {
  position: absolute; right: 12px; bottom: 64px; z-index: 10;
  min-width: 200px; padding: 10px 12px; border-radius: 14px;
  background: rgba(12,17,26,.95); backdrop-filter: blur(14px);
  border: 1px solid rgba(255,255,255,.12); box-shadow: 0 10px 30px rgba(0,0,0,.4);
  display: flex; flex-direction: column; gap: 2px;
}
.v3d-opts[hidden] { display: none; }
.v3d-opts-t {
  font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
  color: rgba(238,242,248,.55); margin: 2px 2px 6px;
}
.v3d-opts label {
  display: flex; align-items: center; gap: 9px; cursor: pointer;
  padding: 6px 6px; border-radius: 8px; color: #eef2f8; font-size: 13px;
}
.v3d-opts label:hover { background: rgba(255,255,255,.07); }
.v3d-opts input { width: 15px; height: 15px; accent-color: var(--color-accent); cursor: pointer; }

/* selector de tamaño del dron (segmentado de 3 opciones, apilado bajo su etiqueta) */
.v3d-size {
  display: flex; flex-direction: column; gap: 7px;
  margin: 6px 2px 2px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,.1);
}
.v3d-size-l { color: #eef2f8; font-size: 13px; padding-left: 4px; }
.v3d-seg { display: flex; width: 100%; border-radius: 8px; overflow: hidden; border: 1px solid rgba(255,255,255,.16); }
.v3d-seg button {
  flex: 1; appearance: none; border: 0; cursor: pointer; padding: 6px 4px; font-size: 12px; font-weight: 600;
  background: rgba(255,255,255,.05); color: #cdd5e0; border-left: 1px solid rgba(255,255,255,.12);
}
.v3d-seg button:first-child { border-left: 0; }
.v3d-seg button:hover { background: rgba(255,255,255,.12); }
.v3d-seg button.on { background: var(--color-accent); color: #fff; }

/* overlay de progreso de la exportación de vídeo */
.v3d-export {
  position: absolute; inset: 0; z-index: 9; display: grid; place-items: center;
  background: rgba(6,10,16,.55); backdrop-filter: blur(3px);
}
.v3d-export[hidden] { display: none; }
.v3d-export-box {
  display: flex; flex-direction: column; align-items: center; gap: 14px;
  padding: 22px 26px; border-radius: 16px; min-width: 240px;
  background: rgba(12,17,26,.9); border: 1px solid rgba(255,255,255,.12);
  box-shadow: 0 16px 40px rgba(0,0,0,.5);
}
.v3d-export-t { color: #eef2f8; font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums; }
.v3d-export-t.err { color: #ff8f8f; }
.v3d-export-bar { width: 220px; height: 7px; border-radius: 100px; background: rgba(255,255,255,.12); overflow: hidden; }
.v3d-export-f { height: 100%; width: 0; background: var(--color-accent); transition: width .15s ease; }
.v3d-export-est { color: rgba(238,242,248,.6); font-size: 12px; font-variant-numeric: tabular-nums; }
.v3d-export-est:empty { display: none; }

/* cartel de ayuda del modo vuelo libre */
.v3d-free-hint {
  position: absolute; left: 50%; bottom: 62px; transform: translateX(-50%); z-index: 7;
  padding: 7px 14px; border-radius: 100px; white-space: nowrap;
  background: rgba(12,17,26,.72); backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,.12); color: #eef2f8; font-size: 12px; font-weight: 500;
}
.v3d-free-hint[hidden] { display: none; }
@media (max-width: 720px) { .v3d-free-hint { white-space: normal; max-width: 90%; text-align: center; } }
.v3d-prog { flex: 1; height: 6px; border-radius: 100px; background: rgba(255,255,255,.16); position: relative; cursor: pointer; }
.v3d-prog-f { position: absolute; left: 0; top: 0; bottom: 0; width: 0; border-radius: 100px; background: linear-gradient(90deg, var(--color-accent), var(--color-violet)); }
.v3d-time { flex: none; font-size: 12px; color: #c9d2e2; font-variant-numeric: tabular-nums; min-width: 76px; text-align: right; }

/* leyenda de altura */
.v3d-legend {
  position: absolute; top: 12px; left: 12px; z-index: 6;
  display: flex; align-items: center; gap: 8px; font-size: 11.5px; color: #dbe2ee;
  padding: 6px 11px; border-radius: 100px; background: rgba(12,17,26,.55); backdrop-filter: blur(10px);
}
.v3d-legend .grad { width: 60px; height: 7px; border-radius: 100px; background: linear-gradient(90deg, rgb(76,149,255), rgb(255,138,76)); }
.v3d-legend .line { width: 26px; height: 5px; border-radius: 100px; background: #ff7d1a; box-shadow: 0 0 8px rgba(255,125,26,.6); }

.v3d-hint {
  position: absolute; top: 12px; right: 12px; z-index: 6;
  font-size: 11px; color: #aeb8cc; padding: 6px 11px; border-radius: 100px;
  background: rgba(12,17,26,.5); backdrop-filter: blur(10px);
}

/* pantalla de inicio: el globo queda de póster hasta que el usuario pulsa */
.v3d-start {
  position: absolute; inset: 0; z-index: 8; display: grid; place-items: center;
  background: radial-gradient(circle at 50% 40%, rgba(5,7,14,.15), rgba(5,7,14,.55));
}
.v3d-start[hidden] { display: none; }
.v3d-start-btn {
  display: inline-flex; align-items: center; gap: 11px; cursor: pointer;
  padding: 14px 26px 14px 22px; border-radius: 100px; font: inherit; font-size: 16px; font-weight: 700;
  color: #fff; border: 1px solid rgba(255,255,255,.25);
  background: color-mix(in srgb, var(--color-accent) 88%, #000); box-shadow: 0 10px 34px rgba(0,0,0,.45);
  transition: transform .14s, box-shadow .14s;
}
.v3d-start-btn:hover { transform: translateY(-2px) scale(1.02); box-shadow: 0 16px 42px rgba(0,0,0,.5); }
.v3d-start-btn svg { width: 20px; height: 20px; }

/* destello de transición de la intro (globo → escena local) */
.v3d-flash {
  position: absolute; inset: 0; z-index: 7; pointer-events: none; border-radius: 16px;
  background: radial-gradient(circle at 50% 48%, rgba(226,232,242,.85), rgba(150,168,196,.75));
  opacity: 0; transition: opacity .3s ease;
}
.v3d-flash.on { opacity: 1; }

/* viñeta cinematográfica */
.v3d-vignette {
  position: absolute; inset: 0; z-index: 5; pointer-events: none; border-radius: 16px;
  box-shadow: inset 0 0 120px 10px rgba(0,0,0,.55), inset 0 0 40px rgba(0,0,0,.35);
}

/* HUD de telemetría durante el sobrevuelo */
.v3d-hud {
  position: absolute; top: 46px; right: 12px; z-index: 6;
  display: flex; flex-direction: column; gap: 7px;
  opacity: 0; transform: translateX(8px); transition: opacity .35s, transform .35s;
}
.v3d-hud:not([hidden]) { opacity: 1; transform: none; }
.hud-item {
  display: grid; grid-template-columns: auto auto; align-items: baseline; gap: 0 5px;
  min-width: 108px; padding: 8px 12px; border-radius: 12px;
  background: rgba(12,17,26,.52); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,.1);
}
.hud-v { font-size: 22px; font-weight: 800; color: #fff; font-variant-numeric: tabular-nums; text-align: right; }
.hud-u { font-size: 11px; color: #aeb8cc; font-weight: 600; }
.hud-l { grid-column: 1 / -1; font-size: 9.5px; letter-spacing: .12em; text-transform: uppercase; color: #8794ab; margin-top: 2px; }
@media (max-width: 640px) { .v3d-hud { display: none; } }
.v3d-fallback { position: absolute; inset: 0; display: grid; place-items: center; color: #aeb8cc; font-size: 13px; text-align: center; padding: 0 28px; }
@media (prefers-reduced-motion: reduce) { .v3d.loading::after { animation: none; } }
`;

Object.assign(__x, { styles });

};

__m["js/components/ui/flight-3d/flight-3d.js"] = function (__x, __req) {
const { DjiElement } = __req("js/core/DjiElement.js");
const { t } = __req("js/i18n/index.js");
const { buildScene3D, altColor } = __req("js/scene-3d.js");
const { createMp4Recorder, createMp4StreamRecorder, canExportVideo } = __req("js/flyover-export.js");
const { downloadBlob } = __req("js/exports.js");
const { styles } = __req("js/components/ui/flight-3d/flight-3d.css.js");

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/**
 * Reconstrucción 3D navegable del vuelo (Three.js): terreno con relieve real
 * texturizado por satélite, recorrido coloreado por altura, dron con su cono de
 * visión y sobrevuelo cinematográfico. Recibe los datos por propiedad:
 *   el.flight = { model }
 */
class Flight3D extends DjiElement {
  static styles = [styles];

  /** Capas visibles del render (las controla el panel de ajustes). */
  _show = { track: true, kp: true, places: true, water: true, hud: true };

  /** Escala del marcador del dron (y su sombra), elegible en el panel de ajustes:
   *  1 = grande (original), 0.75 = intermedio, 0.5 = mitad. */
  _droneScale = 0.75;

  /** Estado del modo vuelo libre (WASD + ratón). null u {on:false} = desactivado. */
  _free = null;

  /** Estado del modo pilotar el dron (WASD mueve el dron, la cámara lo sigue). */
  _pilot = null;

  /** Velocidad de vuelo (modos libre/pilotar): 0=lenta, 1=media, 2=rápida. */
  _flySpeedIdx = 0;

  /** @param {{model:object}} v */
  set flight(v) { this._flight = v; if (this.isConnected) this._paint(); }
  get flight() { return this._flight; }

  render() {
    this.shadowRoot.innerHTML = `
      <div class="v3d loading" id="wrap">
        <canvas id="cv"></canvas>
        <div class="v3d-vignette"></div>
        <div class="v3d-flash" id="flash"></div>
        <div class="v3d-start" id="start" hidden>
          <button class="v3d-start-btn" id="startBtn" type="button">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            <span>${t('v3d.start')}</span>
          </button>
        </div>
        <div class="v3d-loading">${t('v3d.loading')}</div>
        <div class="v3d-legend"><span class="line"></span><span>${t('v3d.path')}</span></div>
        <div class="v3d-hint">${t('v3d.hint')}</div>
        <div class="v3d-hud" id="hud" hidden>
          <div class="hud-item"><span class="hud-v" id="hudAlt">0</span><span class="hud-u">m</span><span class="hud-l">${t('v3d.hud.alt')}</span></div>
          <div class="hud-item"><span class="hud-v" id="hudSpd">0</span><span class="hud-u">km/h</span><span class="hud-l">${t('v3d.hud.spd')}</span></div>
          <div class="hud-item"><span class="hud-v" id="hudVs">0</span><span class="hud-u">m/s</span><span class="hud-l">${t('v3d.hud.vs')}</span></div>
          <div class="hud-item"><span class="hud-v" id="hudFar">0</span><span class="hud-u">m</span><span class="hud-l">${t('v3d.hud.far')}</span></div>
        </div>
        <div class="v3d-opts" id="opts" hidden>
          <div class="v3d-opts-t">${t('v3d.opts.title')}</div>
          <label><input type="checkbox" data-k="track" checked><span>${t('v3d.opt.track')}</span></label>
          <label><input type="checkbox" data-k="kp" checked><span>${t('v3d.opt.kp')}</span></label>
          <label><input type="checkbox" data-k="places" checked><span>${t('v3d.opt.places')}</span></label>
          <label><input type="checkbox" data-k="water" checked><span>${t('v3d.opt.water')}</span></label>
          <label><input type="checkbox" data-k="hud" checked><span>${t('v3d.opt.hud')}</span></label>
          <div class="v3d-size">
            <span class="v3d-size-l">${t('v3d.opt.size')}</span>
            <div class="v3d-seg" id="dsize">
              <button type="button" data-sz="1">${t('v3d.size.l')}</button>
              <button type="button" data-sz="0.75">${t('v3d.size.m')}</button>
              <button type="button" data-sz="0.5">${t('v3d.size.s')}</button>
            </div>
          </div>
        </div>
        <div class="v3d-bar" hidden>
          <button class="v3d-btn primary" id="play" type="button">
            <svg viewBox="0 0 24 24" fill="currentColor" id="playic"><path d="M8 5v14l11-7z"/></svg>${t('v3d.flyover')}
          </button>
          <div class="v3d-prog" id="prog"><div class="v3d-prog-f" id="progf"></div></div>
          <span class="v3d-time" id="time">0:00 / 0:00</span>
          <button class="v3d-btn" id="speed" type="button" title="${t('v3d.speed')}">1×</button>
          <button class="v3d-btn on" id="cine" type="button" title="${t('v3d.cine')}">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h3l1 2H5l-1-2zm5 0h3l1 2h-3l-1-2zm5 0h3l1 2h-3l-1-2zM3 8h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8z"/></svg>
            <span>${t('v3d.cine.short')}</span>
          </button>
          <span class="v3d-sep"></span>
          <button class="v3d-btn" id="flyspeed" type="button" title="${t('v3d.flyspeed')}" hidden>${t('v3d.flyspeed.slow')}</button>
          <button class="v3d-btn" id="free" type="button" title="${t('v3d.free')}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l3 3-3 3-3-3 3-3zm0 12l3 3-3 3-3-3 3-3zM3 12l3-3 3 3-3 3-3-3zm12 0l3-3 3 3-3 3-3-3z"/></svg>
            <span>${t('v3d.free.short')}</span>
          </button>
          <button class="v3d-btn" id="pilot" type="button" title="${t('v3d.pilot')}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="2.2"/><circle cx="5.5" cy="5.5" r="2.6"/><circle cx="18.5" cy="5.5" r="2.6"/><circle cx="5.5" cy="18.5" r="2.6"/><circle cx="18.5" cy="18.5" r="2.6"/><path d="M7 7l3.4 3.4M17 7l-3.4 3.4M7 17l3.4-3.4M17 17l-3.4-3.4"/></svg>
            <span>${t('v3d.pilot.short')}</span>
          </button>
          <span class="v3d-sep"></span>
          <button class="v3d-btn" id="reset" type="button" title="${t('v3d.reset')}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 4v4h4"/></svg>
          </button>
          <button class="v3d-btn" id="settings" type="button" title="${t('v3d.settings')}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
          <button class="v3d-btn" id="export" type="button" title="${t('v3d.export')}" aria-label="${t('v3d.export.short')}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12"/><path d="M8 11l4 4 4-4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>
          </button>
          <button class="v3d-btn" id="fs" type="button" title="${t('v3d.fullscreen')}" aria-label="${t('v3d.fullscreen')}">
            <svg class="fs-out" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>
            <svg class="fs-in" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>
          </button>
        </div>
        <div class="v3d-export" id="exp" hidden>
          <div class="v3d-export-box">
            <div class="v3d-export-t" id="expT">${t('v3d.export.running')} 0%</div>
            <div class="v3d-export-bar"><div class="v3d-export-f" id="expF"></div></div>
            <div class="v3d-export-est" id="expEst"></div>
            <button class="v3d-btn" id="expCancel" type="button">${t('v3d.export.cancel')}</button>
          </div>
        </div>
        <div class="v3d-free-hint" id="freeHint" hidden>${t('v3d.free.hint')}</div>
      </div>`;
  }

  afterRender() {
    if (!this._flight) return;
    this._teardown();
    const THREE = window.THREE;
    if (!THREE || !this._webglOk()) { this._fallback(); return; }
    // construcción perezosa: solo al acercarse a la pantalla (baja el DEM y las teselas)
    if ('IntersectionObserver' in window) {
      this._io = new IntersectionObserver((es) => {
        if (es.some((e) => e.isIntersecting)) { this._io.disconnect(); this._io = null; this._build(); }
      }, { rootMargin: '400px' });
      this._io.observe(this);
    } else this._build();
  }

  /** Tamaño máximo de textura de la GPU. Se consulta UNA sola vez (con un contexto
   *  WebGL temporal que se libera enseguida) y se cachea, para no ir agotando los
   *  contextos del navegador en cada reconstrucción. */
  static _maxTextureSize() {
    if (Flight3D._maxTex) return Flight3D._maxTex;
    let m = 8192;
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      if (gl) { m = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 8192; gl.getExtension('WEBGL_lose_context')?.loseContext(); }
    } catch { /* usa 8192 */ }
    Flight3D._maxTex = m;
    return m;
  }

  _build() {
    const token = (this._token = Symbol('build'));
    buildScene3D(this._flight.model, { maxTex: Flight3D._maxTextureSize() }).then((scene) => {
      if (token !== this._token || !this.isConnected) return;
      this._scene = scene;
      this._initThree(scene);
      this.$('#wrap').classList.remove('loading');
      this._wireControls(); // la barra aparece tras la intro (o si no hay globo)
      // rótulos del horizonte: entran cuando Overpass responde (no bloquean la escena)
      scene.poisReady?.then((pois) => {
        if (token !== this._token || !this.isConnected) return;
        this._buildHorizonLabels(pois);
      }).catch(() => {});
    }).catch((err) => { console.error('[flight-3d]', err); this._fallback(); });
  }

  disconnectedCallback() { super.disconnectedCallback(); this._teardown(); }

  /* ---------- montaje de la escena ---------- */

  /** Construye escena, cámara, luces, terreno, track y dron con Three.js. */
  _initThree(data) {
    const THREE = window.THREE;
    const canvas = this.$('#cv');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    this._renderer = renderer;

    const scene = new THREE.Scene();
    const span = Math.max(data.bounds.spanX, Math.abs(data.bounds.spanZ)) || 500;
    this._span = span;
    this._three = scene;

    const cam = new THREE.PerspectiveCamera(52, 16 / 10, 1, span * 16);
    this._cam = cam;

    // paleta de cielo/luz según la fase solar real del vuelo
    const pal = this._skyPalette(data.sun);
    scene.background = new THREE.Color(pal.horizon);
    scene.fog = new THREE.Fog(pal.horizon, span * 2.2, span * 7);
    scene.add(this._buildSky(data, pal));

    // luces: cielo/suelo + sol direccional desde la posición real del sol
    scene.add(new THREE.HemisphereLight(pal.top, 0x40382c, pal.hemiI));
    const sun = new THREE.DirectionalLight(pal.sun, pal.sunI);
    const sd = data.sun.dir;
    sun.position.set(sd.x * span, sd.y * span, sd.z * span);
    scene.add(sun);
    this._sunDir = { x: sd.x, y: sd.y, z: sd.z }; // para desplazar la sombra hacia donde cae la luz

    this._terrainMesh = this._buildTerrain(data);
    scene.add(this._terrainMesh);
    scene.add(this._buildSkirt(data)); // faldón: bloque de tierra, no lámina flotante
    this._trackGroup = this._buildTrack(data);
    scene.add(this._trackGroup);
    this._kpGroup = this._buildLabels(data); // rótulos 3D de los hitos
    scene.add(this._kpGroup);
    this._drone = this._buildDrone(data);
    scene.add(this._drone);
    this._shadow = this._buildShadow();
    scene.add(this._shadow);
    this._trail = this._buildTrail();
    scene.add(this._trail);
    this._placeDrone(0);

    // órbita: objetivo en el centro del terreno, a media altura
    this._target = new THREE.Vector3(0, data.terrain.midY ?? 0, 0);
    this._orbit = { r: span * 1.15, theta: -Math.PI * 0.7, phi: 1.2, min: span * 0.05, max: span * 4 };
    this._home = { target: this._target.clone(), r: this._orbit.r, theta: this._orbit.theta, phi: this._orbit.phi };
    this._applyOrbit();

    this._localScene = scene; // escena del vuelo (el globo de la intro es aparte)
    this._resize();
    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(this.$('#wrap'));
    this._setupIntro(data); // deja el globo de póster con el botón de inicio
    this._loop();
    // ahorro: pausa el bucle de render cuando el visor no está en pantalla
    if ('IntersectionObserver' in window) {
      this._visIO = new IntersectionObserver((es) => {
        const vis = es.some((e) => e.isIntersecting);
        if (vis && !this._raf && !this._exporting) this._loop();
        else if (!vis && this._raf && !this._exporting) { cancelAnimationFrame(this._raf); this._raf = null; }
      }, { rootMargin: '80px' });
      this._visIO.observe(this);
    }
  }

  /* ---------- intro cinematográfica (globo → zoom al vuelo) ---------- */

  /** Globo terráqueo texturizado con satélite (shader Web Mercator) + pin. */
  _buildGlobe(data) {
    const THREE = window.THREE, R = 100, scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070e);
    const tex = new THREE.CanvasTexture(data.world); tex.colorSpace = THREE.SRGBColorSpace;
    tex.flipY = false; // el shader mapea la V con el norte arriba; sin voltear el canvas
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: tex } },
      vertexShader: 'varying vec3 vN; void main(){ vN = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `
        varying vec3 vN; uniform sampler2D map; const float PI = 3.14159265;
        void main(){
          vec3 n = normalize(vN);
          float lat = asin(clamp(n.y, -1.0, 1.0));
          float lon = atan(n.x, n.z);
          float u = lon / (2.0 * PI) + 0.5;
          float maxLat = radians(85.05);
          float la = clamp(lat, -maxLat, maxLat);
          float v = 0.5 - log(tan(PI / 4.0 + la / 2.0)) / (2.0 * log(tan(PI / 4.0 + maxLat / 2.0)));
          gl_FragColor = texture2D(map, vec2(u, v));
        }`,
    });
    // todo el planeta va en un grupo que rota para orientar el punto del vuelo
    const group = new THREE.Group(); scene.add(group);
    group.add(new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), mat));
    group.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.035, 64, 48),
      new THREE.MeshBasicMaterial({ color: 0x6ab0ff, transparent: true, opacity: 0.14, side: THREE.BackSide, depthWrite: false })));
    // punto del vuelo sobre la esfera (gira con el grupo)
    const [lat, lon] = data.center, la = lat * Math.PI / 180, lo = lon * Math.PI / 180;
    const nrm = new THREE.Vector3(Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo));
    const pin = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(this._sunSprite()), color: 0xff7d1a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    pin.position.copy(nrm.clone().multiplyScalar(R * 1.02)); pin.scale.set(R * 0.09, R * 0.09, 1);
    group.add(pin);
    // dirección fija de cámara (frente ligeramente elevado); el planeta gira para
    // llevar el punto del vuelo a esa dirección → efecto "girar hacia la ubicación"
    const camDir = new THREE.Vector3(0, 0.32, 1).normalize();
    const qEnd = new THREE.Quaternion().setFromUnitVectors(nrm, camDir);
    const qStart = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -2.6).multiply(qEnd);
    return { scene, group, R, camDir, qStart, qEnd };
  }

  /** Deja el globo quieto de póster y muestra el botón de inicio (no auto-arranca). */
  _setupIntro(data) {
    this._introDur = 3800;
    if (!data.world) { this._localReady(); return; } // sin textura de mundo → escena local
    this._globe = this._buildGlobe(data);
    this._three = this._globe.scene;
    this._posterFrame();
    this.$('#start').hidden = false;
  }

  /** Coloca el globo en su orientación inicial y la cámara en el plano de mundo. */
  _posterFrame() {
    const THREE = window.THREE, g = this._globe, R = g.R;
    g.group.quaternion.copy(g.qStart);
    this._cam.position.copy(g.camDir.clone().multiplyScalar(R * 3.6));
    this._cam.lookAt(new THREE.Vector3(0, 0, 0));
  }

  /** Arranca la animación de zoom desde el espacio (al pulsar el botón). */
  _runIntro() {
    if (!this._globe) { this._localReady(); return; }
    this.$('#start').hidden = true;
    this._introT0 = performance.now();
  }

  /** Pasa directamente a la escena del vuelo (cuando no hay globo). */
  _localReady() {
    this.$('#start').hidden = true;
    this._three = this._localScene;
    this._applyOrbit();
    this.$('.v3d-bar').hidden = false;
  }

  /** Gira el planeta hacia el punto del vuelo mientras la cámara hace zoom, y
   *  al final funde a la escena local. */
  _stepIntro() {
    const THREE = window.THREE, p = Math.min(1, (performance.now() - this._introT0) / this._introDur);
    const eZoom = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; // easeInOutCubic
    const eRot = 1 - Math.pow(1 - Math.min(1, p / 0.62), 3); // la rotación acaba en p=0.62
    const g = this._globe, R = g.R, cd = g.camDir;
    // rotación del planeta: pone el vuelo de cara ANTES del destello (se ve llegar)
    g.group.quaternion.copy(g.qStart).slerp(g.qEnd, eRot);
    // cámara: para a nivel regional (Iberia reconocible), no un punto borroso; el
    // relevo a la escena detallada aporta el detalle fino
    const dist = R * (3.6 + (1.62 - 3.6) * eZoom);
    const tan = new THREE.Vector3().crossVectors(cd, new THREE.Vector3(0, 1, 0)).normalize();
    this._cam.position.copy(cd.clone().multiplyScalar(dist).add(tan.multiplyScalar(R * 0.3 * (1 - eZoom))));
    this._cam.lookAt(cd.clone().multiplyScalar(R * 0.98));
    if (p > 0.86) this.$('#flash')?.classList.add('on');
    if (p >= 1) this._endIntro();
  }

  /** Cierra la intro: pasa a la escena del vuelo con encuadre cenital y funde. */
  _endIntro() {
    if (this._introT0 == null) return;
    this._introT0 = null;
    this._three = this._localScene;
    // aterriza cerca y en ángulo (el terreno llena el plano; no se ve la "isla")
    this._orbit.r = this._orbit.max * 0.24; this._orbit.phi = 1.12; this._orbit.theta = -Math.PI * 0.62;
    this._applyOrbit();
    this.$('.v3d-bar').hidden = false; // la barra aparece al aterrizar en el vuelo
    setTimeout(() => this.$('#flash')?.classList.remove('on'), 60);
    if (this._globe) {
      this._globe.scene.traverse((o) => { o.geometry?.dispose?.(); o.material?.map?.dispose?.(); o.material?.dispose?.(); });
      this._globe = null;
    }
  }

  /** Paleta de cielo y luz según la fase solar real del vuelo. La textura del
   *  terreno es auto-iluminada (emissive), así que la luz 3D es sutil (solo
   *  relieve/calidez); `glow` controla el halo del sol en el cielo. */
  _skyPalette(sun) {
    const P = {
      day: { top: 0x4a86c0, horizon: 0xcfdcea, sun: 0xffffff, sunI: 0.3, hemiI: 0.2, glow: 0.5 },
      golden: { top: 0x35508a, horizon: 0xffb072, sun: 0xffd9a0, sunI: 0.34, hemiI: 0.18, glow: 1.5 },
      blue: { top: 0x21315a, horizon: 0x6f80ab, sun: 0xbcccec, sunI: 0.18, hemiI: 0.18, glow: 0.8 },
      night: { top: 0x0b132a, horizon: 0x223052, sun: 0xb9c6e6, sunI: 0.12, hemiI: 0.16, glow: 0.35 },
    };
    return P[sun && sun.phase] || P.day;
  }

  /** Textura de disco luminoso (para el sol y la cabeza de la estela). */
  _sunSprite() {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.2, 'rgba(255,246,228,0.92)');
    g.addColorStop(0.5, 'rgba(255,220,170,0.32)'); g.addColorStop(1, 'rgba(255,200,150,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128); return c;
  }

  /** Cúpula de cielo con degradado + sol en la dirección real. */
  _buildSky(data, pal) {
    const THREE = window.THREE, span = this._span, grp = new THREE.Group(), R = span * 6;
    const sd = data.sun.dir;
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: {
        top: { value: new THREE.Color(pal.top) }, horizon: { value: new THREE.Color(pal.horizon) },
        sunDir: { value: new THREE.Vector3(sd.x, sd.y, sd.z).normalize() },
        sunCol: { value: new THREE.Color(pal.sun) }, glow: { value: pal.glow },
      },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `
        varying vec3 vP; uniform vec3 top; uniform vec3 horizon; uniform vec3 sunDir; uniform vec3 sunCol; uniform float glow;
        void main(){
          vec3 dir = normalize(vP);
          float h = clamp(dir.y, 0.0, 1.0);
          vec3 col = mix(horizon, top, pow(h, 0.55));
          float s = max(dot(dir, sunDir), 0.0);
          col += sunCol * pow(s, 4.0) * glow * 0.35; // resplandor cálido amplio y sutil
          col += sunCol * pow(s, 22.0) * glow;       // halo concentrado junto al sol
          col += sunCol * pow(s, 350.0) * 2.0;       // disco brillante del sol
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    grp.add(new THREE.Mesh(new THREE.SphereGeometry(R, 48, 24), mat));
    // bloom suave del sol con un sprite aditivo encima del disco del shader
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(this._sunSprite()), color: pal.sun, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    sp.position.set(sd.x * R * 0.9, sd.y * R * 0.9, sd.z * R * 0.9);
    const s = span * (data.sun.elevation > 4 ? 0.6 : 1.2); sp.scale.set(s, s, 1);
    if (data.sun.elevation > -4) grp.add(sp);
    return grp;
  }

  /** Estela del dron: línea aditiva de los últimos segundos que se desvanece hacia
   *  la cola (tipo cola de cometa), sin bola de luz. */
  _buildTrail() {
    const THREE = window.THREE, grp = new THREE.Group();
    this._trailMax = 56;
    const geo = new THREE.BufferGeometry();
    this._trailPos = new Float32Array(this._trailMax * 3);
    this._trailCol = new Float32Array(this._trailMax * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(this._trailPos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this._trailCol, 3));
    geo.setDrawRange(0, 0);
    this._trailLine = new THREE.Line(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    grp.add(this._trailLine);
    grp.visible = false;
    return grp;
  }

  /** Rellena la estela con la trayectoria de los últimos ~4 s: brillante junto al
   *  dron y desvaneciéndose hacia la cola (sin cabeza luminosa). */
  _updateTrail(time) {
    if (!this._trail || !this._trail.visible) return;
    const n = this._trailMax, dur = 4; let count = 0;
    for (let i = 0; i < n; i++) {
      const tt = time - dur + dur * i / (n - 1);
      if (tt < 0) continue;
      const d = this._scene.droneAt(tt);
      this._trailPos[count * 3] = d.x; this._trailPos[count * 3 + 1] = d.y; this._trailPos[count * 3 + 2] = d.z;
      const a = Math.pow(i / (n - 1), 2) * 0.85; // desvanecido cuadrático hacia la cola
      this._trailCol[count * 3] = a; this._trailCol[count * 3 + 1] = a * 0.6; this._trailCol[count * 3 + 2] = a * 0.28;
      count++;
    }
    this._trailLine.geometry.setDrawRange(0, count);
    this._trailLine.geometry.attributes.position.needsUpdate = true;
    this._trailLine.geometry.attributes.color.needsUpdate = true;
  }

  /** Malla del terreno (grid) desplazada por el DEM y texturizada con satélite. */
  _buildTerrain(data) {
    const THREE = window.THREE;
    const g = data.terrain.grid, geo = new THREE.BufferGeometry();
    const pos = new Float32Array(g * g * 3), uvs = new Float32Array(g * g * 2);
    for (let r = 0; r < g; r++)
      for (let c = 0; c < g; c++) {
        const v = data.terrain.vertex(r, c), k = r * g + c;
        pos[k * 3] = v.x; pos[k * 3 + 1] = v.y; pos[k * 3 + 2] = v.z;
        uvs[k * 2] = v.u; uvs[k * 2 + 1] = 1 - v.v; // V invertida (textura top-down)
      }
    const idx = [];
    for (let r = 0; r < g - 1; r++)
      for (let c = 0; c < g - 1; c++) {
        const a = r * g + c, b = a + 1, d = a + g, e = d + 1;
        idx.push(a, d, b, b, d, e);
      }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const tex = new THREE.CanvasTexture(data.texture);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this._renderer.capabilities.getMaxAnisotropy(); // nítida en ángulo
    tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false; // canvas NPOT
    // la imagen de satélite ya trae su luz: la usamos como emissive (auto-iluminada)
    // para que el mapa se vea siempre, aunque el sol esté bajo y a contraluz; la luz
    // 3D solo añade relieve y calidez encima.
    const mat = new THREE.MeshStandardMaterial({
      map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.72,
      roughness: 1, metalness: 0,
    });
    // agua: superficie lisa (rugosidad baja donde hay agua) para que el sol
    // genere un destello especular; sin entorno global, para no lavar el mapa.
    if (data.water) {
      const wm = new THREE.CanvasTexture(data.water);
      wm.colorSpace = THREE.NoColorSpace; wm.minFilter = THREE.LinearFilter; wm.generateMipmaps = false;
      mat.roughnessMap = wm; mat.roughness = 1; mat.metalness = 0;
    }
    if (!data.terrain.hasDEM) mat.wireframe = false;
    return new THREE.Mesh(geo, mat);
  }

  /** Faldón oscuro alrededor del terreno (de los bordes hacia abajo) para que
   *  parezca un bloque de tierra macizo y no una lámina flotando en el cielo. */
  _buildSkirt(data) {
    const THREE = window.THREE, g = data.terrain.grid;
    // recorrido del perímetro en orden
    const per = [];
    for (let c = 0; c < g; c++) per.push([0, c]);
    for (let r = 1; r < g; r++) per.push([r, g - 1]);
    for (let c = g - 2; c >= 0; c--) per.push([g - 1, c]);
    for (let r = g - 2; r >= 1; r--) per.push([r, 0]);
    const H = (data.terrain.elevMax - data.terrain.elevMin) * 1.7 || 200; // *VE aprox
    const bottom = -Math.max(160, H * 0.6);
    const n = per.length, pos = new Float32Array(n * 2 * 3), col = new Float32Array(n * 2 * 3);
    for (let i = 0; i < n; i++) {
      const v = data.terrain.vertex(per[i][0], per[i][1]);
      pos.set([v.x, v.y, v.z], i * 6); pos.set([v.x, bottom, v.z], i * 6 + 3);
      col.set([0.16, 0.13, 0.10], i * 6); col.set([0.05, 0.04, 0.03], i * 6 + 3); // arriba→abajo más oscuro
    }
    const idx = [];
    for (let i = 0; i < n - 1; i++) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, b, c, c, b, d); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setIndex(idx);
    return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  }

  /** Recorrido 3D estilo Google Earth: línea naranja sólida + cortina rayada al suelo. */
  _buildTrack(data) {
    const THREE = window.THREE;
    const T = data.track;
    const grp = new THREE.Group();
    if (T.length < 2) return grp;
    const span = Math.max(data.bounds.spanX, Math.abs(data.bounds.spanZ)) || 500;
    const radius = Math.max(3.5, Math.min(15, span * 0.0065));
    const groundOf = (p) => (p.gy != null ? p.gy : data.takeoffXZ.y) - radius;
    const TOP = [0.85, 0.42, 0.12], BOT = [0.03, 0.012, 0.0]; // degradado: brillante arriba

    // 1) CORTINA DE LUZ: aditiva, brillante junto al recorrido y desvanecida al suelo
    const cv = new THREE.BufferGeometry();
    const cn = T.length, cpos = new Float32Array(cn * 2 * 3), ccol = new Float32Array(cn * 2 * 3);
    for (let i = 0; i < cn; i++) {
      const p = T[i];
      cpos.set([p.x, p.y, p.z], i * 6); cpos.set([p.x, groundOf(p), p.z], i * 6 + 3);
      ccol.set(TOP, i * 6); ccol.set(BOT, i * 6 + 3);
    }
    const cidx = [];
    for (let i = 0; i < cn - 1; i++) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; cidx.push(a, b, c, c, b, d); }
    cv.setAttribute('position', new THREE.BufferAttribute(cpos, 3));
    cv.setAttribute('color', new THREE.BufferAttribute(ccol, 3));
    cv.setIndex(cidx);
    const curtain = new THREE.Mesh(cv, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    grp.add(curtain);

    // 2) RAYADO vertical con el mismo degradado (aditivo)
    const hpos = new Float32Array(cn * 2 * 3), hcol = new Float32Array(cn * 2 * 3);
    for (let i = 0; i < cn; i++) {
      const p = T[i];
      hpos.set([p.x, p.y, p.z], i * 6); hpos.set([p.x, groundOf(p), p.z], i * 6 + 3);
      hcol.set([0.9, 0.46, 0.14], i * 6); hcol.set([0.06, 0.024, 0.0], i * 6 + 3);
    }
    const hg = new THREE.BufferGeometry();
    hg.setAttribute('position', new THREE.BufferAttribute(hpos, 3));
    hg.setAttribute('color', new THREE.BufferAttribute(hcol, 3));
    const hatch = new THREE.LineSegments(hg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
    grp.add(hatch);

    // 3) LÍNEA superior fina que marca el recorrido (sustituye al "tubo" grueso
    //    naranja + halo, que tapaba el top de la cortina)
    const lpos = new Float32Array(cn * 3);
    for (let i = 0; i < cn; i++) { const p = T[i]; lpos.set([p.x, p.y, p.z], i * 3); }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(lpos, 3));
    const line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xffb060, transparent: true, opacity: 0.95, depthWrite: false }));
    grp.add(line);

    // 4) marcador de despegue (aro luminoso)
    const tk = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.8, radius * 1.8, radius * 0.6, 24),
      new THREE.MeshStandardMaterial({ color: 0x37cf6b, emissive: 0x1a8a44, emissiveIntensity: 0.9 }));
    tk.position.set(data.takeoffXZ.x, data.takeoffXZ.y, data.takeoffXZ.z);
    grp.add(tk);

    // datos para el revelado progresivo durante el sobrevuelo
    this._trackReveal = { curtain, hatch, line, cn, times: T.map((p) => p.t) };
    return grp;
  }

  /** Revela el recorrido hasta el instante t (efecto de "dibujado" en el sobrevuelo). */
  _revealTrack(time) {
    const R = this._trackReveal; if (!R) return;
    let k = 1; while (k < R.times.length && R.times[k] <= time) k++;
    R.curtain.geometry.setDrawRange(0, Math.max(0, k - 1) * 6);
    R.hatch.geometry.setDrawRange(0, k * 2);
    R.line.geometry.setDrawRange(0, k);
  }

  /** Muestra el recorrido completo (fuera de la reproducción). */
  _revealTrackFull() {
    const R = this._trackReveal; if (!R) return;
    for (const m of [R.curtain, R.hatch, R.line]) m.geometry.setDrawRange(0, Infinity);
  }

  /** Etiqueta flotante elegante (pastilla fina translúcida con sombra) que mira a
   *  la cámara. */
  _labelSprite(text) {
    const THREE = window.THREE, dpr = 3, fs = 23, padX = 15, padY = 7, mg = 11, dotW = 15;
    const font = `600 ${fs}px -apple-system, system-ui, sans-serif`;
    const meas = document.createElement('canvas').getContext('2d');
    meas.font = font; meas.letterSpacing = '0.2px';
    const tw = meas.measureText(text).width;
    const pw = Math.ceil(tw + padX * 2 + dotW), ph = fs + padY * 2;
    const w = pw + mg * 2, h = ph + mg * 2;
    const c = document.createElement('canvas'); c.width = w * dpr; c.height = h * dpr;
    const x = c.getContext('2d'); x.scale(dpr, dpr);
    const r = ph / 2;
    const pill = () => { x.beginPath(); x.moveTo(mg + r, mg); x.arcTo(mg + pw, mg, mg + pw, mg + ph, r); x.arcTo(mg + pw, mg + ph, mg, mg + ph, r); x.arcTo(mg, mg + ph, mg, mg, r); x.arcTo(mg, mg, mg + pw, mg, r); x.closePath(); };
    x.save(); x.shadowColor = 'rgba(0,0,0,0.5)'; x.shadowBlur = 11; x.shadowOffsetY = 3;
    pill(); x.fillStyle = 'rgba(11,15,22,0.82)'; x.fill(); x.restore();
    pill(); x.lineWidth = 1; x.strokeStyle = 'rgba(255,255,255,0.13)'; x.stroke();
    x.beginPath(); x.arc(mg + padX - 1, mg + ph / 2, 3.4, 0, 7); x.fillStyle = '#ff8a3d'; x.fill();
    x.font = font; x.letterSpacing = '0.2px'; x.fillStyle = 'rgba(255,255,255,0.94)'; x.textBaseline = 'middle';
    x.fillText(text, mg + padX + dotW - 3, mg + ph / 2 + 1);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter;
    // sizeAttenuation false → tamaño constante en pantalla (no gigante al acercarse)
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, sizeAttenuation: false }));
    sp.userData.ar = w / h; sp.renderOrder = 10;
    return sp;
  }

  /** Marcador fino (aro delgado con centro) de tamaño constante en pantalla. */
  _dotSprite() {
    const THREE = window.THREE, c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d');
    x.strokeStyle = '#ff7d1a'; x.lineWidth = 4; x.beginPath(); x.arc(32, 32, 20, 0, 7); x.stroke();
    x.fillStyle = '#ff7d1a'; x.beginPath(); x.arc(32, 32, 6, 0, 7); x.fill();
    const tex = new THREE.CanvasTexture(c); tex.minFilter = THREE.LinearFilter;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, sizeAttenuation: false }));
    sp.renderOrder = 8; return sp;
  }

  /** Rótulos 3D en los hitos del vuelo (despegue, punto más alto, más rápido…). */
  _buildLabels(data) {
    const THREE = window.THREE, grp = new THREE.Group(), s = this._span;
    this._labelItems = [];
    this._kpMarks = []; // posición/instante de cada hito (para saltar la cámara al hacer click)
    if (!data.keypoints) return grp;
    for (const kp of data.keypoints) {
      const up = s * 0.03; // línea guía más corta: los rótulos no flotan tan alto
      const sp = this._labelSprite(t('kp.' + kp.key));
      sp.position.set(kp.x, kp.y + up, kp.z);
      const hh = 0.05; sp.scale.set(hh * sp.userData.ar, hh, 1); // tamaño constante en pantalla
      grp.add(sp);
      const lg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(kp.x, kp.y, kp.z), new THREE.Vector3(kp.x, kp.y + up, kp.z)]);
      const line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xff7d1a, transparent: true, opacity: 0.45, depthTest: false }));
      grp.add(line);
      const dot = this._dotSprite(); // marcador fino de tamaño constante
      dot.position.set(kp.x, kp.y, kp.z); dot.scale.set(0.016, 0.016, 1); grp.add(dot);
      this._labelItems.push({ sprite: sp, line, prio: 0 }); // los hitos ganan al horizonte
      this._kpMarks.push({ x: kp.x, y: kp.y, z: kp.z, t: kp.t, key: kp.key, sprite: sp });
    }
    return grp;
  }

  /** Pastilla del horizonte (cima, pueblo o masa de agua de OSM): más tenue y
   *  fría que la de los hitos, con un icono según el tipo. */
  _horizonSprite(text, kind) {
    const THREE = window.THREE, dpr = 3, fs = 19, padX = 13, padY = 6, mg = 10, icoW = 15;
    const accent = kind === 'peak' ? '#8fe0bd' : kind === 'water' ? '#69c8f5' : '#98c2ff';
    const font = `500 ${fs}px -apple-system, system-ui, sans-serif`;
    const meas = document.createElement('canvas').getContext('2d');
    meas.font = font; meas.letterSpacing = '0.2px';
    const tw = meas.measureText(text).width;
    const pw = Math.ceil(tw + padX * 2 + icoW), ph = fs + padY * 2;
    const w = pw + mg * 2, h = ph + mg * 2;
    const c = document.createElement('canvas'); c.width = w * dpr; c.height = h * dpr;
    const x = c.getContext('2d'); x.scale(dpr, dpr);
    const r = ph / 2;
    const pill = () => { x.beginPath(); x.moveTo(mg + r, mg); x.arcTo(mg + pw, mg, mg + pw, mg + ph, r); x.arcTo(mg + pw, mg + ph, mg, mg + ph, r); x.arcTo(mg, mg + ph, mg, mg, r); x.arcTo(mg, mg, mg + pw, mg, r); x.closePath(); };
    x.save(); x.shadowColor = 'rgba(0,0,0,0.45)'; x.shadowBlur = 9; x.shadowOffsetY = 2;
    pill(); x.fillStyle = 'rgba(10,14,20,0.7)'; x.fill(); x.restore();
    pill(); x.lineWidth = 1; x.strokeStyle = 'rgba(255,255,255,0.1)'; x.stroke();
    // icono: triángulo (cima), onda (agua) o aro (pueblo)
    const cx = mg + padX - 2, cy = mg + ph / 2;
    x.fillStyle = accent; x.strokeStyle = accent;
    if (kind === 'peak') { x.beginPath(); x.moveTo(cx, cy - 4.5); x.lineTo(cx + 4.5, cy + 4); x.lineTo(cx - 4.5, cy + 4); x.closePath(); x.fill(); }
    else if (kind === 'water') {
      x.lineWidth = 1.6; x.lineCap = 'round';
      for (const dy of [-3, 1]) { x.beginPath(); x.moveTo(cx - 4.5, cy + dy); x.quadraticCurveTo(cx - 1.5, cy + dy - 2.4, cx, cy + dy); x.quadraticCurveTo(cx + 1.5, cy + dy + 2.4, cx + 4.5, cy + dy); x.stroke(); }
    } else { x.lineWidth = 1.8; x.beginPath(); x.arc(cx, cy, 3.4, 0, 7); x.stroke(); x.beginPath(); x.arc(cx, cy, 1.1, 0, 7); x.fill(); }
    x.font = font; x.letterSpacing = '0.2px'; x.fillStyle = 'rgba(255,255,255,0.86)'; x.textBaseline = 'middle';
    x.fillText(text, mg + padX + icoW - 4, mg + ph / 2 + 1);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter;
    // fog:false → legible aunque el POI esté lejos, en la bruma del horizonte
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.94, depthWrite: false, depthTest: false, fog: false, sizeAttenuation: false }));
    sp.userData.ar = w / h; sp.renderOrder = 9;
    return sp;
  }

  /** Rótulos del horizonte (cimas con su cota, pueblos y masas de agua del
   *  entorno). Flotan en la dirección real del lugar, sin línea guía (muchos caen
   *  lejos del terreno). Se construyen de forma perezosa cuando Overpass responde. */
  _buildHorizonLabels(pois) {
    if (!pois || !pois.length || !this._localScene) return;
    const THREE = window.THREE, up = this._span * 0.02;
    // dos grupos para poder mostrar/ocultar el agua aparte de pueblos/cimas
    const placesG = new THREE.Group(), waterG = new THREE.Group();
    for (const p of pois) {
      const text = p.kind === 'peak' && p.ele ? `${p.name} · ${Math.round(p.ele)} m` : p.name;
      const sp = this._horizonSprite(text, p.kind);
      sp.position.set(p.x, p.y + up, p.z);
      const hh = 0.04; sp.scale.set(hh * sp.userData.ar, hh, 1);
      (p.kind === 'water' ? waterG : placesG).add(sp);
      this._labelItems.push({ sprite: sp, prio: 1, cat: p.kind === 'water' ? 'water' : 'places' });
    }
    this._localScene.add(placesG); this._localScene.add(waterG);
    this._horizonPlacesGroup = placesG; this._horizonWaterGroup = waterG;
    this._applyShow(); // respeta el estado actual del panel de ajustes
  }

  /** Oculta los rótulos que se solapan en pantalla (prioriza los cercanos a la cámara). */
  _declutterLabels() {
    const items = this._labelItems; if (!items || !items.length) return;
    const cam = this._cam, thx = 0.17, thy = 0.075;
    const arr = items
      .filter((it) => it.sprite.parent && it.sprite.parent.visible) // ignora capas ocultas por el panel
      .map((it) => {
        const p = it.sprite.position.clone(), d = p.distanceTo(cam.position);
        const ndc = p.project(cam);
        return { it, x: ndc.x, y: ndc.y, front: ndc.z < 1, d, prio: it.prio || 0 };
      }).sort((a, b) => (a.prio - b.prio) || (a.d - b.d)); // hitos primero; luego más cercano
    const shown = [];
    for (const a of arr) {
      let hide = !a.front;
      if (!hide) for (const sn of shown) if (Math.abs(a.x - sn.x) < thx && Math.abs(a.y - sn.y) < thy) { hide = true; break; }
      a.it.sprite.visible = !hide; if (a.it.line) a.it.line.visible = !hide;
      if (!hide) shown.push(a);
    }
  }

  /** Aplica el estado del panel de ajustes: muestra/oculta cada capa del render. */
  _applyShow() {
    const s = this._show;
    if (this._trackGroup) this._trackGroup.visible = s.track;
    if (this._kpGroup) this._kpGroup.visible = s.kp;
    if (this._horizonPlacesGroup) this._horizonPlacesGroup.visible = s.places;
    if (this._horizonWaterGroup) this._horizonWaterGroup.visible = s.water;
    const hud = this.$('#hud'); if (hud) hud.hidden = !(s.hud && this._playing);
  }

  /** Sombra proyectada con la FORMA real del dron (silueta cenital del quad: cuerpo
   *  central + 4 rótores) en vez de una mancha. Dos grupos anidados para poder estirar
   *  la sombra en la dirección de la luz (efecto rasante al atardecer) a la vez que la
   *  silueta gira con el rumbo del dron:
   *   - `g` (externo): posición, orientación a la luz y escala/estirado.
   *   - `inner`: gira la silueta para compensar y dejarla al rumbo real.
   *  Se difumina/agranda con la altura (ver `_updateShadow`). */
  _buildShadow() {
    const THREE = window.THREE;
    const tex = new THREE.CanvasTexture(this._shadowSilhouette());
    tex.anisotropy = 4;
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.5, depthWrite: false,
        polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); // se apoya sobre el terreno sin pelearse en z
    plane.rotation.x = -Math.PI / 2; // tumbado sobre el terreno
    plane.renderOrder = 2;
    this._shadowMat = plane.material;
    const inner = new THREE.Group(); inner.add(plane); this._shadowInner = inner;
    const g = new THREE.Group(); g.add(inner);
    return g;
  }

  /** Dibuja la silueta cenital del quad en un canvas: cuerpo alargado, 4 brazos y 4
   *  rótores llenos, con los bordes difuminados para que lea como sombra. El frente
   *  del dron apunta hacia -Y del canvas (coincide con el -Z del modelo). */
  _shadowSilhouette() {
    const N = 256, c = document.createElement('canvas'); c.width = c.height = N;
    const x = c.getContext('2d'), cx = N / 2, cy = N / 2;
    x.filter = 'blur(5px)'; // borde suave de sombra
    x.fillStyle = '#000'; x.strokeStyle = '#000'; x.lineCap = 'round';
    const ducts = [[-50, -60], [50, -60], [-50, 60], [50, 60]]; // rótores en X
    // brazos (trazo grueso del centro a cada rótor)
    x.lineWidth = 22;
    for (const [dx, dy] of ducts) { x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + dx, cy + dy); x.stroke(); }
    // cuerpo central alargado (frente-atrás)
    x.beginPath(); x.roundRect(cx - 22, cy - 74, 44, 148, 20); x.fill();
    // rótores llenos
    for (const [dx, dy] of ducts) { x.beginPath(); x.arc(cx + dx, cy + dy, 46, 0, 7); x.fill(); }
    return c;
  }

  /** Cambia el tamaño del marcador del dron (y de su sombra) en caliente. `f` es el
   *  factor: 1 grande, 0.75 intermedio, 0.5 mitad. Persiste para futuras reconstrucciones. */
  _setDroneScale(f) {
    this._droneScale = f;
    if (this._drone) {
      this._drone.scale.setScalar(f);
      this._droneS = (this._droneBaseS || 12) * f;
      // refresca la sombra ya si no estamos en un modo que la actualiza cada frame
      const flying = (this._pilot && this._pilot.on) || (this._free && this._free.on);
      if (this._scene && !flying) this._placeDrone(this._time || 0);
    }
  }

  /** Orienta, desplaza, escala y atenúa la sombra del dron para un instante dado.
   *  @param {number} px @param {number} pz posición horizontal del dron
   *  @param {number} dy altura del dron  @param {number|null} gy cota del suelo debajo
   *  @param {number} yaw rumbo del cuerpo (mismo signo que `_droneBody.rotation.y`) */
  _updateShadow(px, pz, dy, gy, yaw) {
    const g = this._shadow; if (!g || gy == null) return;
    const agl = Math.max(0, dy - gy);
    const sz = (this._droneS || 12) * 2.4 + agl * 0.32; // crece con la altura
    // Desplaza la sombra hacia donde cae la luz según la hora real del vuelo (sun.dir):
    // la sombra = el dron proyectado por el rayo del sol sobre el suelo. Se muestrea la
    // cota del terreno en el punto desplazado (si no, quedaría enterrada bajo el relieve)
    // y se limita el desplazamiento para que no se despegue con el dron muy alto o el sol
    // muy bajo (ahí, físicamente, la sombra se iría lejísimos y parecería un duplicado).
    let sx = px, sz2 = pz, sgy = gy, lightAngle = 0, stretch = 1; const s = this._sunDir;
    if (s && s.y > 0.05) {
      const dirLen = Math.hypot(s.x, s.z) || 1;
      const dx = -s.x / dirLen, dz = -s.z / dirLen;      // hacia donde se proyecta la sombra
      const flat = agl / Math.max(s.y, 0.12);            // desplazamiento físico estimado
      const t = Math.min(flat, (this._droneS || 12) * 8); // tope: no se despega del dron
      sx = px + t * dx; sz2 = pz + t * dz;
      const gyOff = this._scene && this._scene.groundAtXZ ? this._scene.groundAtXZ(sx, sz2) : gy;
      if (Number.isFinite(gyOff)) sgy = gyOff;
      lightAngle = Math.atan2(dx, dz);                   // el +Z local del grupo mira a la luz
      stretch = Math.max(1, Math.min(2, 1 / s.y));       // sombra más larga cuanto más bajo el sol
    }
    g.position.set(sx, sgy + Math.max(0.8, this._span * 0.0015), sz2);
    g.rotation.y = lightAngle;                            // orienta el estirado a la dirección de la luz
    g.scale.set(sz, sz, sz * stretch);                   // estira a lo largo de la luz (Z local)
    if (this._shadowInner) this._shadowInner.rotation.y = yaw - lightAngle; // deja la silueta al rumbo real
    this._shadowMat.opacity = Math.max(0.14, 0.5 - agl * 0.0006); // se difumina con la altura
  }

  /** Dron modelado como el DJI Neo 2: cuerpo gris, 4 conductos con hélice,
   *  cámara/gimbal frontal y antenas en V. Materiales con emissive para que se
   *  vea (no una silueta negra) aunque la luz de la escena sea baja. */
  _buildDrone(data) {
    const THREE = window.THREE;
    const span = Math.max(data.bounds.spanX, Math.abs(data.bounds.spanZ)) || 500;
    const s = Math.max(9, span * 0.012); // marcador exagerado, pero sin pasarse
    this._droneBaseS = s; // tamaño base; el visible sale de multiplicar por _droneScale
    const grp = new THREE.Group();
    const body = new THREE.Group(); // gira según el rumbo (el frente mira a -Z)
    body.rotation.order = 'YXZ'; // rumbo → cabeceo → alabeo (como un avión)

    const matBody = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: 0.55, roughness: 0.42, emissive: 0x2f333a, emissiveIntensity: 0.6 });
    const matDark = new THREE.MeshStandardMaterial({ color: 0x3a3e45, metalness: 0.5, roughness: 0.55, emissive: 0x181a1e, emissiveIntensity: 0.55 });
    const matGuard = new THREE.MeshStandardMaterial({ color: 0x43474e, metalness: 0.45, roughness: 0.6, emissive: 0x1a1c20, emissiveIntensity: 0.5 });
    const matProp = new THREE.MeshStandardMaterial({ color: 0xcfd5dd, metalness: 0.2, roughness: 0.4, transparent: true, opacity: 0.42, side: THREE.DoubleSide });
    const matLens = new THREE.MeshStandardMaterial({ color: 0x0a0c12, metalness: 0.4, roughness: 0.18, emissive: 0x14335e, emissiveIntensity: 0.7 });

    // fuselaje central alargado y redondeado (frente-atrás en Z)
    const hull = new THREE.Mesh(new THREE.BoxGeometry(s * 0.46, s * 0.24, s * 0.86), matBody);
    body.add(hull);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(s * 0.24, 20, 14), matBody);
    nose.scale.set(1, 1, 1.5); nose.position.z = -s * 0.32; body.add(nose);
    const topDome = new THREE.Mesh(new THREE.SphereGeometry(s * 0.24, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), matBody);
    topDome.scale.set(1, 0.55, 1.6); topDome.position.y = s * 0.08; body.add(topDome);
    // cámara/gimbal frontal con lente
    const gim = new THREE.Mesh(new THREE.SphereGeometry(s * 0.17, 18, 16), matDark);
    gim.position.set(0, -s * 0.05, -s * 0.44); body.add(gim);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.11, s * 0.12, s * 0.08, 22), matLens);
    lens.rotation.x = Math.PI / 2; lens.position.set(0, -s * 0.05, -s * 0.53); body.add(lens);

    // 4 conductos (prop guards) circulares con su hélice dentro
    this._rotors = [];
    const Rg = s * 0.46, dx = s * 0.6, dz = s * 0.5;
    for (const [ux, uz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const cx = ux * dx, cz = uz * dz, cy = s * 0.02;
      // strut del cuerpo al conducto
      const strut = new THREE.Mesh(new THREE.BoxGeometry(s * 0.14, s * 0.1, s * 0.14), matDark);
      strut.position.set(cx * 0.5, 0, cz * 0.5); body.add(strut);
      // anillo del conducto (toro plano, hueco hacia arriba)
      const ring = new THREE.Mesh(new THREE.TorusGeometry(Rg, s * 0.055, 12, 34), matGuard);
      ring.rotation.x = Math.PI / 2; ring.position.set(cx, cy, cz); body.add(ring);
      // borde inferior del conducto (segundo aro más fino)
      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(Rg, s * 0.03, 10, 34), matGuard);
      ring2.rotation.x = Math.PI / 2; ring2.position.set(cx, cy - s * 0.11, cz); body.add(ring2);
      // dos radios en cruz (rejilla del guard)
      for (const ax of [[1, 0], [0, 1]]) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(ax[0] ? Rg * 2 : s * 0.03, s * 0.02, ax[1] ? Rg * 2 : s * 0.03), matGuard);
        spoke.position.set(cx, cy, cz); body.add(spoke);
      }
      // motor central + hélice de 3 palas (gira)
      const motor = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.08, s * 0.09, s * 0.12, 14), matDark);
      motor.position.set(cx, cy + s * 0.05, cz); body.add(motor);
      const rotor = new THREE.Group();
      for (const r of [0, 2 * Math.PI / 3, 4 * Math.PI / 3]) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(Rg * 1.7, s * 0.014, s * 0.13), matProp);
        blade.rotation.y = r; rotor.add(blade);
      }
      rotor.position.set(cx, cy + s * 0.1, cz); body.add(rotor); this._rotors.push(rotor);
    }

    // 2 antenas traseras en V
    for (const ux of [-1, 1]) {
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.018, s * 0.024, s * 0.6, 6), matDark);
      ant.position.set(ux * s * 0.13, s * 0.3, s * 0.4);
      ant.rotation.z = ux * 0.32; ant.rotation.x = -0.28; body.add(ant);
    }

    // luces de navegación: verdes delante, rojas detrás (parpadean en el bucle)
    this._leds = [];
    const ledGeo = new THREE.SphereGeometry(s * 0.05, 8, 8);
    for (const [lx, lz, col] of [[-0.5, -0.5, 0x39ff88], [0.5, -0.5, 0x39ff88], [-0.5, 0.5, 0xff3355], [0.5, 0.5, 0xff3355]]) {
      const mat = new THREE.MeshBasicMaterial({ color: col });
      const led = new THREE.Mesh(ledGeo, mat);
      led.position.set(lx * dx, s * 0.12, lz * dz); body.add(led);
      this._leds.push({ mesh: led, color: new THREE.Color(col), rear: lz > 0 });
    }

    grp.add(body); this._droneBody = body;

    // cono de visión: parte del dron y apunta según rumbo + pitch del gimbal
    const len = s * 3.2, rad = len * Math.tan(28 * Math.PI / 180);
    const coneGeo = new THREE.ConeGeometry(rad, len, 24, 1, true);
    coneGeo.translate(0, -len / 2, 0); // vértice en el origen, se abre hacia -Y
    const cone = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({ color: 0x8ec5ff, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
    this._cone = cone; grp.add(cone);
    // aplica el tamaño elegido (escala todo el marcador; la sombra usa _droneS)
    grp.scale.setScalar(this._droneScale || 1);
    this._droneS = s * (this._droneScale || 1);
    return grp;
  }

  /** Coloca el dron, lo orienta por rumbo y apunta su cono en el instante t. */
  _placeDrone(time) {
    const THREE = window.THREE, d = this._scene.droneAt(time);
    this._drone.position.set(d.x, d.y, d.z);
    // en hover el rumbo es NaN: mantenemos el último para que no gire de golpe
    const h = isNaN(d.heading) ? (this._bodyHeading ?? 0) : d.heading;
    this._bodyHeading = h;
    if (this._droneBody) {
      this._droneBody.rotation.y = -h; // el frente (-Z) mira al rumbo
      // alabeo: se inclina hacia el interior de la curva según la tasa de giro
      const h1 = this._scene.droneAt(time - 0.6).heading, h2 = this._scene.droneAt(time + 0.6).heading;
      let roll = 0;
      if (!isNaN(h1) && !isNaN(h2)) {
        const dh = ((h2 - h1 + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
        roll = Math.max(-0.5, Math.min(0.5, dh * 1.6));
      }
      this._roll = (this._roll ?? 0) + (roll - (this._roll ?? 0)) * 0.15; // suavizado
      this._droneBody.rotation.z = this._roll;
      this._droneBody.rotation.x = Math.max(-0.25, Math.min(0.25, -(d.hs || 0) * 0.012)); // morro abajo al avanzar
    }
    // sombra con la forma del dron, orientada al rumbo y proyectada por el sol
    this._updateShadow(d.x, d.z, d.y, d.gy != null ? d.gy : this._scene.takeoffXZ.y, -h);
    // dirección de la cámara: horizontal por rumbo, inclinada por el pitch del gimbal
    const el = d.pitch; // rad (negativo = mirando abajo)
    const dir = new THREE.Vector3(Math.cos(el) * Math.sin(h), Math.sin(el), -Math.cos(el) * Math.cos(h));
    this._cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.normalize());
    // HUD de telemetría
    const hudAlt = this.$('#hudAlt');
    if (hudAlt) {
      hudAlt.textContent = Math.round(d.rel || 0);
      this.$('#hudSpd').textContent = Math.round((d.hs || 0) * 3.6);
      const vs = d.vs || 0;
      this.$('#hudVs').textContent = (vs >= 0 ? '+' : '') + vs.toFixed(1);
      // alejamiento: distancia horizontal (m) al punto de despegue
      const tk = this._scene.takeoffXZ;
      this.$('#hudFar').textContent = Math.round(Math.hypot(d.x - tk.x, d.z - tk.z));
    }
  }

  /* ---------- órbita y bucle ---------- */

  _applyOrbit() {
    const o = this._orbit, tp = this._target;
    this._cam.position.set(
      tp.x + o.r * Math.sin(o.phi) * Math.cos(o.theta),
      tp.y + o.r * Math.cos(o.phi),
      tp.z + o.r * Math.sin(o.phi) * Math.sin(o.theta),
    );
    this._cam.lookAt(tp);
  }

  /** Punto del mundo bajo el cursor: lanza un rayo desde la cámara al terreno; si
   *  no lo toca (cielo/horizonte), cae a un plano horizontal a la altura del
   *  pivote. Devuelve un THREE.Vector3 o null. */
  _pointUnderCursor(e) {
    const THREE = window.THREE, canvas = this.$('#cv'); if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    const ray = (this._ray || (this._ray = new THREE.Raycaster()));
    ray.setFromCamera(ndc, this._cam);
    if (this._terrainMesh) {
      const hit = ray.intersectObject(this._terrainMesh, false)[0];
      if (hit) return hit.point;
    }
    // sin terreno bajo el cursor: intersecta el plano horizontal del pivote
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -this._target.y);
    const p = new THREE.Vector3();
    return ray.ray.intersectPlane(plane, p) ? p : null;
  }

  /** Click limpio: si cae cerca de un hito (su punto o su rótulo), lleva la cámara
   *  a ese hito. Umbral en píxeles, probando el marcador y la píldora. */
  _clickKeypoint(e) {
    const marks = this._kpMarks; if (!marks || !marks.length || !this._cam || this._three !== this._localScene) return;
    const canvas = this.$('#cv'), rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    const v = new window.THREE.Vector3();
    let best = null, bestD = 42; // umbral (px)
    for (const m of marks) {
      for (const q of [[m.x, m.y, m.z], [m.sprite.position.x, m.sprite.position.y, m.sprite.position.z]]) {
        v.set(q[0], q[1], q[2]).project(this._cam);
        if (v.z > 1) continue; // detrás de la cámara
        const sx = (v.x * 0.5 + 0.5) * rect.width, sy = (-v.y * 0.5 + 0.5) * rect.height;
        const d = Math.hypot(sx - px, sy - py);
        if (d < bestD) { bestD = d; best = m; }
      }
    }
    if (best) this._focusKeypoint(best);
  }

  /** Coloca el dron en el instante del hito y acerca la cámara a él con una
   *  transición suave (tween que avanza el bucle). */
  _focusKeypoint(mark) {
    if (this._playing) this._stopFlyover();
    this._time = mark.t; this._placeDrone(mark.t); this._updateTime(mark.t); this._revealTrackFull(); this._look = null;
    const o = this._orbit;
    this._camTween = {
      t0: performance.now(), dur: 850,
      fromT: this._target.clone(), toT: new window.THREE.Vector3(mark.x, mark.y, mark.z),
      fromR: o.r, toR: Math.max(o.min, this._span * 0.22),
      fromPhi: o.phi, toPhi: Math.min(1.15, Math.max(0.7, o.phi)),
    };
  }

  /** Avanza el tween de cámara hacia el hito (ease-in-out). */
  _stepCamTween() {
    const T = this._camTween, p = Math.min(1, (performance.now() - T.t0) / T.dur), e = p * p * (3 - 2 * p);
    this._target.lerpVectors(T.fromT, T.toT, e);
    const o = this._orbit;
    o.r = T.fromR + (T.toR - T.fromR) * e;
    o.phi = T.fromPhi + (T.toPhi - T.fromPhi) * e;
    this._applyOrbit();
    if (p >= 1) this._camTween = null;
  }

  /* ---------- modo vuelo libre (WASD + ratón) ---------- */

  /** Activa/desactiva el vuelo libre. Al entrar toma la posición y orientación
   *  actuales de la cámara; al salir reconstruye la órbita para no dar un salto. */
  _toggleFree() {
    const on = !(this._free && this._free.on);
    const THREE = window.THREE, dir = new THREE.Vector3();
    this._cam.getWorldDirection(dir);
    if (on) {
      this._stopFlyover(); this._camTween = null;
      if (this._cineMode) { this._cineMode = false; this.$('#cine').classList.remove('on'); }
      const yaw = Math.atan2(dir.x, -dir.z), pitch = Math.asin(Math.max(-1, Math.min(1, dir.y)));
      this._free = { on: true, pos: this._cam.position.clone(), yaw, pitch, keys: new Set(), speedMul: 1, last: performance.now() };
    } else {
      // reconstruye la órbita mirando a un punto por delante (sin saltos)
      const tp = this._cam.position.clone().addScaledVector(dir, this._span * 0.4);
      this._target.copy(tp);
      const off = this._cam.position.clone().sub(tp), r = off.length() || 1;
      this._orbit.r = Math.max(this._orbit.min, Math.min(this._orbit.max, r));
      this._orbit.phi = Math.acos(Math.max(-1, Math.min(1, off.y / r)));
      this._orbit.theta = Math.atan2(off.z, off.x);
      this._free = { on: false }; this._look = null; this._applyOrbit();
    }
    this.$('#free').classList.toggle('on', on);
    this._setHint(on ? 'v3d.free.hint' : null);
    this._updateFlyUi();
  }

  /** Muestra/oculta el cartel de ayuda (controles) con el texto de la clave i18n. */
  _setHint(key) { const h = this.$('#freeHint'); if (!h) return; if (key) { h.textContent = t(key); h.hidden = false; } else h.hidden = true; }

  /** Altura del terreno bajo (x,z): rayo vertical hacia abajo sobre la malla. */
  _groundYAt(x, z) {
    if (!this._terrainMesh) return null;
    const THREE = window.THREE, ray = (this._ray || (this._ray = new THREE.Raycaster()));
    ray.set(new THREE.Vector3(x, this._span * 2, z), new THREE.Vector3(0, -1, 0));
    const hit = ray.intersectObject(this._terrainMesh, false)[0];
    return hit ? hit.point.y : null;
  }

  /** Activa/desactiva el pilotaje del dron. Arranca desde la posición actual del
   *  dron; al salir reconstruye la órbita centrada en él. */
  _togglePilot() {
    const on = !(this._pilot && this._pilot.on);
    if (on) {
      this._stopFlyover(); this._camTween = null;
      if (this._free && this._free.on) { this._free = { on: false }; this.$('#free').classList.remove('on'); }
      if (this._cineMode) { this._cineMode = false; this.$('#cine').classList.remove('on'); }
      const d = this._scene.droneAt(this._time || 0);
      this._pilot = { on: true, pos: new window.THREE.Vector3(d.x, d.y, d.z), yaw: this._bodyHeading ?? 0, camYaw: this._bodyHeading ?? 0, roll: 0, keys: new Set(), camPitch: 0.5, zoom: 1, last: performance.now() };
      this._revealTrackFull(); if (this._trail) this._trail.visible = false;
    } else {
      const dp = this._drone ? this._drone.position.clone() : this._target.clone();
      this._target.copy(dp);
      const off = this._cam.position.clone().sub(dp), r = off.length() || 1;
      this._orbit.r = Math.max(this._orbit.min, Math.min(this._orbit.max, r));
      this._orbit.phi = Math.acos(Math.max(-1, Math.min(1, off.y / r)));
      this._orbit.theta = Math.atan2(off.z, off.x);
      this._pilot = { on: false }; this._look = null; this._applyOrbit();
    }
    this.$('#pilot').classList.toggle('on', on);
    this._setHint(on ? 'v3d.pilot.hint' : null);
    this._updateFlyUi();
  }

  /** Un frame de pilotaje: mueve el dron con las teclas y encadena la cámara detrás. */
  _stepPilot() {
    const P = this._pilot; if (!P || !P.on || this._three !== this._localScene || !this._drone) return;
    const THREE = window.THREE, now = performance.now(), dt = Math.min(0.05, (now - P.last) / 1000); P.last = now;
    const k = P.keys, boost = k.has('shift') ? 2.6 : 1, sm = Math.min(1, dt * 6);
    // la cámara ORBITA el dron: ratón (pointermove) y ←/→ mueven camYaw, ↑/↓ la altura
    if (k.has('arrowleft')) P.camYaw -= 1.3 * dt;
    if (k.has('arrowright')) P.camYaw += 1.3 * dt;
    if (k.has('arrowup')) P.camPitch = Math.min(1.35, P.camPitch + 1.4 * dt);
    if (k.has('arrowdown')) P.camPitch = Math.max(0.12, P.camPitch - 1.4 * dt);
    // movimiento RELATIVO A LA CÁMARA: W hacia donde mira, A/D lateral, E/Q vertical
    const camF = new THREE.Vector3(Math.sin(P.camYaw), 0, -Math.cos(P.camYaw));
    const camR = new THREE.Vector3(Math.cos(P.camYaw), 0, Math.sin(P.camYaw));
    const move = new THREE.Vector3();
    if (k.has('w')) move.add(camF);
    if (k.has('s')) move.sub(camF);
    if (k.has('d')) move.add(camR);
    if (k.has('a')) move.sub(camR);
    if (k.has('e') || k.has(' ')) move.y += 1;
    if (k.has('q') || k.has('c')) move.y -= 1;
    const spd = this._span * 0.5 * boost * this._flyMul();
    const desired = move.lengthSq() > 0 ? move.clone().normalize().multiplyScalar(spd) : new THREE.Vector3();
    if (!P.vel) P.vel = new THREE.Vector3();
    P.vel.lerp(desired, sm);
    P.pos.addScaledVector(P.vel, dt);
    // acotar al terreno (no alejarse volando fuera del mapa)
    const b = this._scene.bounds;
    const xlo = Math.min(b.x0, b.x1), xhi = Math.max(b.x0, b.x1), zlo = Math.min(b.z0, b.z1), zhi = Math.max(b.z0, b.z1);
    if (P.pos.x < xlo) { P.pos.x = xlo; if (P.vel.x < 0) P.vel.x = 0; } else if (P.pos.x > xhi) { P.pos.x = xhi; if (P.vel.x > 0) P.vel.x = 0; }
    if (P.pos.z < zlo) { P.pos.z = zlo; if (P.vel.z < 0) P.vel.z = 0; } else if (P.pos.z > zhi) { P.pos.z = zhi; if (P.vel.z > 0) P.vel.z = 0; }
    // no bajar del suelo
    const gy = this._groundYAt(P.pos.x, P.pos.z);
    if (gy != null && P.pos.y < gy + (this._droneS || 10) * 1.2) { P.pos.y = gy + (this._droneS || 10) * 1.2; if (P.vel.y < 0) P.vel.y = 0; }
    // el dron ENCARA SIEMPRE hacia el frente de la cámara (camYaw): al orbitar con
    // las flechas/ratón ya se orienta (antes de avanzar), y en lateral (A/D) no
    // gira porque el movimiento lateral no cambia camYaw.
    let d = P.camYaw - P.yaw; d = ((d + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    const turnStep = d * Math.min(1, dt * 5);
    P.yaw += turnStep;
    P.roll += ((Math.max(-0.4, Math.min(0.4, turnStep / Math.max(dt, 0.001) * 0.18)) - P.roll) * 0.1);
    const fwd = new THREE.Vector3(Math.sin(P.yaw), 0, -Math.cos(P.yaw));
    this._drone.position.copy(P.pos);
    if (this._droneBody) {
      const fwdSpeed = P.vel.x * fwd.x + P.vel.z * fwd.z;
      P.pitch2 = (P.pitch2 || 0) + (Math.max(-0.16, Math.min(0.16, -fwdSpeed / (this._span * 0.6))) - (P.pitch2 || 0)) * 0.1;
      this._droneBody.rotation.y = -P.yaw; this._droneBody.rotation.z = P.roll; this._droneBody.rotation.x = P.pitch2; // -yaw: el frente (-Z) mira al rumbo (igual que _placeDrone)
    }
    // cono de visión: apunta al frente del dron (rumbo), algo hacia abajo
    if (this._cone) {
      const el = -0.5, dir = new THREE.Vector3(Math.cos(el) * Math.sin(P.yaw), Math.sin(el), -Math.cos(el) * Math.cos(P.yaw));
      this._cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.normalize());
    }
    // sombra con la forma del dron, orientada al rumbo y proyectada por el sol
    this._updateShadow(P.pos.x, P.pos.z, P.pos.y, gy, -P.yaw);
    // cámara: orbita según camYaw/camPitch y mira AL DRON (queda centrado en pantalla)
    const r = this._span * 0.06 * P.zoom;
    const want = P.pos.clone()
      .addScaledVector(camF, -r * Math.cos(P.camPitch))
      .addScaledVector(new THREE.Vector3(0, 1, 0), r * Math.sin(P.camPitch));
    this._cam.position.lerp(want, 0.2);
    this._cam.lookAt(P.pos.x, P.pos.y, P.pos.z);
  }

  /** Un frame de vuelo libre: mueve la cámara con WASD (con inercia) y la orienta
   *  con el ratón o las flechas (para poder usarlo con trackpad, sin arrastrar). */
  _stepFree() {
    const F = this._free; if (!F || !F.on || this._three !== this._localScene) return;
    const THREE = window.THREE, now = performance.now(), dt = Math.min(0.05, (now - F.last) / 1000); F.last = now;
    const k = F.keys, lr = 1.3 * dt; // flechas: mirar (rad/frame)
    if (k.has('arrowleft')) F.yaw -= lr;
    if (k.has('arrowright')) F.yaw += lr;
    if (k.has('arrowup')) F.pitch = Math.min(1.45, F.pitch + lr);
    if (k.has('arrowdown')) F.pitch = Math.max(-1.45, F.pitch - lr);
    const cp = Math.cos(F.pitch), sp = Math.sin(F.pitch);
    const dir = new THREE.Vector3(cp * Math.sin(F.yaw), sp, -cp * Math.cos(F.yaw));
    const right = new THREE.Vector3(Math.cos(F.yaw), 0, Math.sin(F.yaw));
    const move = new THREE.Vector3();
    if (k.has('w')) move.add(dir);
    if (k.has('s')) move.sub(dir);
    if (k.has('d')) move.add(right);
    if (k.has('a')) move.sub(right);
    if (k.has('e') || k.has(' ')) move.y += 1;
    if (k.has('q') || k.has('c')) move.y -= 1;
    // velocidad con inercia (arranque/frenado suaves)
    const spd = this._span * 0.5 * (F.speedMul || 1) * (k.has('shift') ? 2.6 : 1) * this._flyMul();
    const desired = move.lengthSq() > 0 ? move.normalize().multiplyScalar(spd) : new THREE.Vector3();
    if (!F.vel) F.vel = new THREE.Vector3();
    F.vel.lerp(desired, Math.min(1, dt * 6));
    F.pos.addScaledVector(F.vel, dt);
    this._cam.position.copy(F.pos);
    this._cam.lookAt(F.pos.x + dir.x, F.pos.y + dir.y, F.pos.z + dir.z);
  }

  /** Registra/borra teclas del modo activo (vuelo libre o pilotaje). */
  _freeKey(e, down) {
    const M = (this._free && this._free.on) ? this._free : (this._pilot && this._pilot.on) ? this._pilot : null;
    if (!M) return;
    const key = e.key === ' ' ? ' ' : e.key.toLowerCase();
    if (key === 'escape') { if (down) (this._free && this._free.on ? this._toggleFree() : this._togglePilot()); return; }
    if (!'wasdqce '.includes(key) && key !== 'shift' && !key.startsWith('arrow')) return;
    e.preventDefault();
    if (down) M.keys.add(key); else M.keys.delete(key);
  }

  /** Multiplicador de velocidad de vuelo según el modo elegido (lenta/media/rápida). */
  _flyMul() { return [0.12, 0.3, 0.6][this._flySpeedIdx] ?? 0.3; }

  /** Cambia al siguiente modo de velocidad de vuelo y actualiza el botón. */
  _cycleFlySpeed() {
    this._flySpeedIdx = (this._flySpeedIdx + 1) % 3;
    const b = this.$('#flyspeed'); if (b) b.textContent = t(['v3d.flyspeed.slow', 'v3d.flyspeed.med', 'v3d.flyspeed.fast'][this._flySpeedIdx]);
  }

  /** Pone/quita el visor 3D a pantalla completa (el ResizeObserver reajusta solo). */
  _toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else this.$('#wrap')?.requestFullscreen?.().catch(() => {});
  }

  /** Sale de los modos de vuelo (libre/pilotar) si están activos. */
  _exitFlyModes() {
    if (this._free && this._free.on) this._toggleFree();
    if (this._pilot && this._pilot.on) this._togglePilot();
  }

  /** Ajusta la UI al entrar/salir de los modos de vuelo: muestra la velocidad de
   *  vuelo solo entonces, y limpia la vista (oculta hitos y trayectoria) para no
   *  estorbar; al salir restaura las capas según el panel de ajustes. */
  _updateFlyUi() {
    const flying = (this._free && this._free.on) || (this._pilot && this._pilot.on);
    const fs = this.$('#flyspeed'); if (fs) fs.hidden = !flying;
    if (flying) {
      if (this._kpGroup) this._kpGroup.visible = false;
      if (this._trackGroup) this._trackGroup.visible = false;
    } else this._applyShow();
  }

  _resize() {
    const wrap = this.$('#wrap'); if (!wrap || !this._renderer) return;
    const w = wrap.clientWidth, h = wrap.clientHeight;
    this._renderer.setSize(w, h, false);
    this._cam.aspect = w / h; this._cam.updateProjectionMatrix();
  }

  /** Reloj de animación: el real, salvo durante la exportación de vídeo, donde
   *  avanza a pasos fijos para que el resultado sea determinista y no dependa de
   *  la velocidad de codificación. */
  _now() { return this._exportClock != null ? this._exportClock : performance.now(); }

  /** Animaciones por fotograma independientes del tiempo del vuelo: hélices, LEDs
   *  de navegación y anti-solape de rótulos. Se usa en el bucle y en el export. */
  _animate() {
    if (this._rotors) for (const r of this._rotors) r.rotation.y += 0.9; // hélices girando
    if (this._leds) { // parpadeo de las luces de navegación
      const t = this._now() * 0.006;
      const rear = Math.sin(t) > 0.1 ? 1 : 0.12, front = Math.sin(t * 0.7 + 1) > -0.3 ? 1 : 0.25;
      for (const l of this._leds) l.mesh.material.color.copy(l.color).multiplyScalar(l.rear ? rear : front);
    }
    if (this._three === this._localScene) this._declutterLabels(); // rótulos sin solaparse
  }

  _loop() {
    const tick = () => {
      this._raf = requestAnimationFrame(tick);
      if (this._exporting) return; // durante la exportación conduce _exportVideo
      if (this._pilot && this._pilot.on) this._stepPilot(); // pilotar el dron (WASD)
      else if (this._free && this._free.on) this._stepFree(); // vuelo libre (WASD)
      else if (this._introT0 != null) this._stepIntro();
      else if (this._playing) this._advanceFlyover();
      else if (this._camTween) this._stepCamTween(); // vuelo de cámara al hito pulsado
      this._animate();
      this._renderer.render(this._three, this._cam);
    };
    this._raf = requestAnimationFrame(tick);
  }

  /* ---------- controles ---------- */

  _wireControls() {
    const canvas = this.$('#cv');
    let drag = null, down = null;
    this.on(canvas, 'pointerdown', (e) => {
      if (this._introT0 != null) { this._endIntro(); return; } // la 1ª pulsación salta la intro
      if (this._playing && this._cineMode) this._toggleCine(); // tomar control manual de la cámara
      drag = { x: e.clientX, y: e.clientY }; down = { x: e.clientX, y: e.clientY, moved: false };
      canvas.setPointerCapture(e.pointerId);
    });
    this.on(canvas, 'pointermove', (e) => {
      if (!drag) return;
      if (down && (Math.abs(e.clientX - down.x) > 4 || Math.abs(e.clientY - down.y) > 4)) { down.moved = true; this._camTween = null; }
      if (this._free && this._free.on) { // mirar alrededor (yaw/pitch)
        this._free.yaw += (e.clientX - drag.x) * 0.005;
        this._free.pitch = Math.max(-1.45, Math.min(1.45, this._free.pitch - (e.clientY - drag.y) * 0.005));
        drag = { x: e.clientX, y: e.clientY };
        return;
      }
      if (this._pilot && this._pilot.on) { // orbitar la cámara alrededor del dron
        this._pilot.camYaw += (e.clientX - drag.x) * 0.006;
        this._pilot.camPitch = Math.max(0.12, Math.min(1.35, this._pilot.camPitch + (e.clientY - drag.y) * 0.005));
        drag = { x: e.clientX, y: e.clientY };
        return;
      }
      const o = this._orbit;
      o.theta += (e.clientX - drag.x) * 0.006;
      o.phi = Math.max(0.18, Math.min(1.48, o.phi - (e.clientY - drag.y) * 0.005));
      drag = { x: e.clientX, y: e.clientY };
      if (!this._playing) this._applyOrbit();
    });
    this.on(canvas, 'pointerup', (e) => {
      // click limpio (sin arrastrar) sobre un hito → lleva la cámara a ese hito
      if (down && !down.moved) this._clickKeypoint(e);
      drag = null; down = null;
    });
    this.on(canvas, 'pointercancel', () => { drag = null; down = null; });
    this.on(canvas, 'wheel', (e) => {
      e.preventDefault();
      if (this._introT0 != null) this._endIntro();
      if (this._free && this._free.on) { // en vuelo libre la rueda regula la velocidad
        this._free.speedMul = Math.max(0.25, Math.min(5, (this._free.speedMul || 1) * (1 - Math.sign(e.deltaY) * 0.15)));
        return;
      }
      if (this._pilot && this._pilot.on) { // pilotando, la rueda acerca/aleja la cámara
        this._pilot.zoom = Math.max(0.4, Math.min(3, (this._pilot.zoom || 1) * (1 + Math.sign(e.deltaY) * 0.12)));
        return;
      }
      this._camTween = null; // el zoom manual cancela el vuelo a un hito
      const o = this._orbit, oldR = o.r;
      o.r = Math.max(o.min, Math.min(o.max, o.r * (1 + Math.sign(e.deltaY) * 0.09)));
      // zoom hacia el cursor: desplaza el pivote hacia el punto bajo el ratón en
      // la misma proporción que se acorta la distancia, así ese punto se mantiene
      // bajo el cursor mientras se acerca (en vez de ir siempre hacia el dron)
      const f = o.r / oldR;
      if (f !== 1 && !this._playing) {
        const hit = this._pointUnderCursor(e);
        if (hit) {
          const tp = this._target.lerp(hit, 1 - f), s = this._span; // acota el pivote al entorno del terreno
          tp.x = Math.max(-s, Math.min(s, tp.x)); tp.z = Math.max(-s, Math.min(s, tp.z)); tp.y = Math.max(0, Math.min(s * 0.5, tp.y));
        }
      }
      if (!this._playing) this._applyOrbit();
    }, { passive: false });

    this.on(this.$('#play'), 'click', () => { if (this._introT0 != null) this._endIntro(); this._toggleFlyover(); });
    this.on(this.$('#reset'), 'click', () => {
      this._exitFlyModes(); this._stopFlyover(); const h = this._home;
      if (h) { this._target.copy(h.target); this._orbit.r = h.r; this._orbit.theta = h.theta; this._orbit.phi = h.phi; }
      else { this._orbit.theta = -Math.PI * 0.7; this._orbit.phi = 1.2; }
      this._applyOrbit();
    });
    this.on(this.$('#prog'), 'pointerdown', (e) => this._seek(e));
    this.on(this.$('#speed'), 'click', () => this._cycleSpeed());
    this.on(this.$('#cine'), 'click', () => this._toggleCine());
    this.on(this.$('#startBtn'), 'click', () => this._runIntro());

    // exportar el sobrevuelo a vídeo (MP4) y cancelar en curso
    this.on(this.$('#export'), 'click', () => this._exportVideo());
    this.on(this.$('#expCancel'), 'click', () => this._exportAbort?.abort());

    // modo vuelo libre (WASD + ratón); las teclas se escuchan en window y solo
    // actúan cuando el modo está activo
    this.on(this.$('#free'), 'click', () => this._toggleFree());
    this.on(this.$('#pilot'), 'click', () => this._togglePilot());
    // libre/pilotar necesitan teclado (WASD): ocúltalos en táctiles sin ratón
    if (window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches) {
      this.$('#free').hidden = true; this.$('#pilot').hidden = true;
    }
    this.on(window, 'keydown', (e) => this._freeKey(e, true));
    this.on(window, 'keyup', (e) => this._freeKey(e, false));

    // velocidad de vuelo (3 modos) y pantalla completa
    this.$('#flyspeed').textContent = t(['v3d.flyspeed.slow', 'v3d.flyspeed.med', 'v3d.flyspeed.fast'][this._flySpeedIdx]);
    this.on(this.$('#flyspeed'), 'click', () => this._cycleFlySpeed());
    this.on(this.$('#fs'), 'click', () => this._toggleFullscreen());
    this.on(document, 'fullscreenchange', () => {
      const fs = !!document.fullscreenElement;
      this.$('#fs').classList.toggle('on', fs);
      this._resize();
    });

    // panel de ajustes: abre/cierra y aplica las casillas de capas
    const opts = this.$('#opts'), settings = this.$('#settings');
    this.on(settings, 'click', (e) => { e.stopPropagation(); opts.hidden = !opts.hidden; settings.classList.toggle('on', !opts.hidden); });
    for (const cb of this.$$('#opts input[type=checkbox]')) {
      cb.checked = this._show[cb.dataset.k] !== false;
      this.on(cb, 'change', () => { this._show[cb.dataset.k] = cb.checked; this._applyShow(); });
    }
    this._applyShow();

    // selector de tamaño del dron (3 opciones)
    const sizeBtns = this.$$('#dsize button');
    const markSize = () => { for (const b of sizeBtns) b.classList.toggle('on', +b.dataset.sz === this._droneScale); };
    for (const b of sizeBtns) this.on(b, 'click', () => { this._setDroneScale(+b.dataset.sz); markSize(); });
    markSize();

    this._cineMode = this._cineMode !== false; // por defecto activado
    this.$('#cine').classList.toggle('on', this._cineMode);
    this._speed = this._speed || 1;
    this.$('#speed').textContent = this._speed + '×';
    this.$('#speed').classList.toggle('on', this._speed !== 1);
    this._updateTime(0);
  }

  /** Cicla la velocidad del sobrevuelo 1× → 2× → 4×. */
  _cycleSpeed() {
    const seq = [1, 2, 4];
    this._speed = seq[(seq.indexOf(this._speed || 1) + 1) % seq.length];
    this.$('#speed').textContent = this._speed + '×';
    this.$('#speed').classList.toggle('on', this._speed !== 1);
  }

  /** Activa/desactiva el director de cámara automático (modo cine). */
  _toggleCine() {
    this._cineMode = !this._cineMode;
    this.$('#cine').classList.toggle('on', this._cineMode);
    this._director = null; this._look = null;
  }

  /** Elige el siguiente plano cinematográfico (planos suaves, sin extremos). */
  /** Elige el siguiente plano y lo arranca por el lado donde ya está la cámara
   *  (continuidad: evita cruzar de golpe al otro lado del dron). */
  _nextShot(dp, h) {
    const THREE = window.THREE;
    const shots = ['chase', 'orbit', 'high', 'side', 'reveal'];
    const prev = this._director && this._director.shot;
    let sh; do { sh = shots[(Math.random() * shots.length) | 0]; } while (sh === prev);
    let a0 = Math.random() * Math.PI * 2, dir = Math.random() < 0.5 ? -1 : 1;
    if (this._cam && dp) {
      const rel = this._cam.position.clone().sub(dp);
      if (sh === 'orbit') a0 = Math.atan2(rel.z, rel.x);           // órbita: parte del ángulo actual
      if (sh === 'side') dir = (Math.cos(h) * rel.x + Math.sin(h) * rel.z) >= 0 ? 1 : -1; // lateral: por el lado actual
    }
    this._director = { shot: sh, t0: this._now(), dur: 6500 + Math.random() * 3500, dir, a0 };
    // offset de la cámara relativo al dron al empezar el plano (para rodearlo en
    // la transición, no cruzarlo)
    this._shotFromRel = this._cam && dp ? this._cam.position.clone().sub(dp) : null;
  }

  /** Interpola dos offsets (cámara relativa al dron) rodeando al sujeto: el azimut
   *  por el arco más corto y el radio/altura por lerp. Evita que la cámara cruce
   *  por encima del dron en los cambios de plano de ~180°. */
  _arcBlend(a, b, t) {
    const a0 = Math.atan2(a.z, a.x), r0 = Math.hypot(a.x, a.z), y0 = a.y;
    const a1 = Math.atan2(b.z, b.x), r1 = Math.hypot(b.x, b.z), y1 = b.y;
    let da = a1 - a0; da = ((da + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    const ang = a0 + da * t, r = r0 + (r1 - r0) * t, y = y0 + (y1 - y0) * t;
    return new window.THREE.Vector3(Math.cos(ang) * r, y, Math.sin(ang) * r);
  }

  /** Cámara cinematográfica: encadena planos (persecución, órbita, grúa suave,
   *  lateral, revelado) siguiendo al dron. Cada cambio de plano se mezcla con una
   *  curva suave desde la posición actual, sin saltos ni latigazos. */
  _cineCam() {
    const THREE = window.THREE, d = this._scene.droneAt(this._time);
    const target = isNaN(d.heading) ? (this._cHead ?? 0) : d.heading;
    if (this._cHead == null) this._cHead = target;
    else { const diff = ((target - this._cHead + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; this._cHead += diff * 0.03; }
    const h = this._cHead;
    const dp = new THREE.Vector3(d.x, d.y, d.z);
    if (!this._director || this._now() - this._director.t0 > this._director.dur) this._nextShot(dp, h);
    const D = this._director, te = (this._now() - D.t0) / 1000;
    const Rb = this._span * 0.14, up = new THREE.Vector3(0, 1, 0); // distancia base de los planos al dron (más cerca)
    const fwd = new THREE.Vector3(Math.sin(h), 0, -Math.cos(h));
    const right = new THREE.Vector3().crossVectors(fwd, up).normalize();
    let want;
    if (D.shot === 'chase') want = dp.clone().addScaledVector(fwd, -Rb * 1.15).addScaledVector(up, Rb * 0.42);
    else if (D.shot === 'orbit') { const a = D.a0 + te * 0.16 * D.dir; want = dp.clone().addScaledVector(new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), Rb * 1.2).addScaledVector(up, Rb * 0.5); }
    else if (D.shot === 'high') want = dp.clone().addScaledVector(up, Rb).addScaledVector(fwd, -Rb * 0.6);
    else if (D.shot === 'side') want = dp.clone().addScaledVector(right, Rb * 1.15 * D.dir).addScaledVector(up, Rb * 0.42).addScaledVector(fwd, Rb * 0.15);
    else want = dp.clone().addScaledVector(fwd, Rb * (1.25 - te * 0.05)).addScaledVector(up, Rb * 0.35); // reveal (dolly suave)
    // transición suave entre planos: rodea al dron desde el encuadre anterior
    // hasta el nuevo con ease-in-out de ~2,6 s (smoothstep); luego sigue al dron
    const TR = 2.6, tt = Math.min(1, te / TR), ease = tt * tt * (3 - 2 * tt);
    const wantRel = want.clone().sub(dp);
    const goal = dp.clone().add(this._arcBlend(this._shotFromRel || wantRel, wantRel, ease));
    this._cam.position.lerp(goal, 0.12); // inercia leve para micro-suavizado
    this._look = this._look || dp.clone(); this._look.lerp(dp, 0.05);
    this._cam.lookAt(this._look);
  }

  _toggleFlyover() { this._playing ? this._stopFlyover(true) : this._startFlyover(); }

  _startFlyover() {
    if (this._time == null || this._time >= this._scene.duration - 0.05) this._time = 0;
    if (this._free && this._free.on) { this._free = { on: false }; this.$('#free').classList.remove('on'); }
    if (this._pilot && this._pilot.on) { this._pilot = { on: false }; this.$('#pilot').classList.remove('on'); }
    this._setHint(null); this._updateFlyUi();
    this._playing = true; this._last = this._now(); this._camTween = null;
    this._look = null;
    // intro cinematográfica: arranca amplio y la cámara se acerca al dron sola
    this._orbit.r = this._orbit.max * 0.3; this._orbit.phi = 1.0;
    this._chaseTargetR = this._orbit.max * 0.055; this._introStart = this._now();
    this._director = null; this._cHead = null; // reinicia el director de cámara
    this.$('#hud').hidden = !this._show.hud; // respeta el panel de ajustes
    if (this._trail) this._trail.visible = true;
    this._setPlayIcon(true);
  }

  _stopFlyover() {
    this._playing = false; this._introStart = null;
    this.$('#hud').hidden = true;
    if (this._trail) this._trail.visible = false;
    this._revealTrackFull(); // fuera de reproducción se ve el recorrido entero
    this._setPlayIcon(false);
  }

  /** Exporta el sobrevuelo a un MP4 (WebCodecs, muxer estándar → compatible con
   *  iOS). Renderiza la escena a pasos fijos (determinista: la cámara cine, la
   *  intro y los suavizados usan un reloj simulado), captura cada fotograma a un
   *  canvas y lo codifica. La duración = duración del vuelo / velocidad elegida. */
  async _exportVideo() {
    if (!this._scene || this._exporting || this._introT0 != null) return;
    this._exitFlyModes(); // el export conduce su propio sobrevuelo
    // ruta de codificación: WebCodecs (MP4, ideal) o, si no está, MediaRecorder
    // grabando el lienzo (plan B: funciona en más navegadores y tras un crash del
    // proceso de render que deja WebCodecs sin exponer). Si no hay ninguna, aviso.
    const useWebCodecs = canExportVideo();
    if (!useWebCodecs && !this._canRecordCanvas()) {
      this._exportMsg(t('v3d.export.unsupported'), true); this._showExport(true); setTimeout(() => this._showExport(false), 2500); return;
    }
    if (!useWebCodecs) console.warn('[flight-3d] WebCodecs no disponible; exporto con MediaRecorder');
    const cv = this.$('#cv');
    const aspect = cv.width / cv.height;
    const fps = 30, dt = 1 / fps, speed = this._speed || 1;
    // fotogramas del vuelo completo a la velocidad elegida (antes de acotar)
    const fullFrames = Math.ceil(this._scene.duration / speed / dt) + 1;
    // ¿Podemos transmitir el MP4 a disco? (File System Access API + WebCodecs). Si
    // sí, la RAM deja de ser el límite y no hace falta trocear ni bajar calidad.
    const canStream = useWebCodecs && typeof window.showSaveFilePicker === 'function';
    // PRESUPUESTO de tamaño de archivo. Al transmitir a disco es amplísimo (cualquier
    // vuelo cabe); en RAM se limita según la memoria del equipo (deviceMemory, GB) para
    // no agotarla — ahí un vuelo larguísimo baja de calidad o se recorta.
    const gb = navigator.deviceMemory || 4;
    const RAM_BUDGET_MB = Math.round(Math.min(1600, Math.max(400, gb * 200)));
    const BUDGET_MB = canStream ? 100_000 : RAM_BUDGET_MB;
    // niveles de calidad (bitrate afinado para el modo 'quality' del codificador, que
    // aprovecha mejor cada bit): 1440p a 24 Mbps (nítido en pantallas grandes/Retina)
    // y, si el vuelo es largo y no cabe en el presupuesto, baja a 1080p a 18 o 720p a 8.
    const tiers = [{ h: 1440, br: 24_000_000, long: 2560 }, { h: 1080, br: 18_000_000, long: 1920 }, { h: 720, br: 8_000_000, long: 1280 }];
    let tier = tiers[0];
    for (const tt of tiers) { tier = tt; if (fullFrames / fps * tt.br / 8 / 1e6 <= BUDGET_MB) break; }
    const bitrate = tier.br;
    // resolución de salida: altura del nivel, lado largo acotado, lados pares.
    // Se renderiza a esta resolución aunque el visor esté más pequeño en pantalla.
    let H = tier.h, W = Math.round(H * aspect);
    if (W > tier.long) { W = tier.long; H = Math.round(W / aspect); }
    W = Math.max(2, Math.round(W / 2) * 2); H = Math.max(2, Math.round(H / 2) * 2);
    const out = document.createElement('canvas'); out.width = W; out.height = H;
    const octx = out.getContext('2d', { alpha: false });
    // último recurso: si aun a 720p no cabe, recorta la duración del vídeo para no
    // pasar del presupuesto (el vuelo sale más corto, pero no se agota la memoria).
    const budgetFrames = Math.floor(BUDGET_MB * 8e6 / bitrate * fps);
    const totalFrames = Math.min(fullFrames, budgetFrames);
    const trimmed = totalFrames < fullFrames;
    // estimación de duración, resolución y peso del MP4 para avisar antes de arrancar
    const estSec = totalFrames / fps, estMB = Math.max(1, Math.round(estSec * bitrate / 8 / 1e6));
    const estEl = this.$('#expEst');
    if (estEl) {
      estEl.textContent = t('v3d.export.est', { dur: mmss(estSec), res: H, size: estMB })
        + (trimmed ? ' · ' + t('v3d.export.trim') : '');
    }
    // ¿HACE FALTA GUARDAR EN EL PC? Solo si el MP4 estimado no cabe con holgura en
    // RAM. Los vídeos pequeños se exportan en el navegador y se descargan solos, sin
    // molestar con el diálogo de guardar. Los grandes se transmiten a disco (si se
    // puede) para no agotar la memoria. El umbral escala con la RAM del equipo.
    const RAM_SAFE_MB = Math.min(300, Math.round(RAM_BUDGET_MB / 2));
    const needDisk = estMB > RAM_SAFE_MB;
    // Se pide el destino AQUÍ (aún con la activación del gesto del clic, sin awaits
    // previos) y, si el usuario cierra el diálogo, se sale limpio.
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
    const suggestedName = `sobrevuelo-3d-${stamp}.mp4`;
    let sink = null;
    if (canStream && needDisk) {
      sink = await this._makeFileSink(suggestedName);
      if (sink === 'cancelled') return; // el usuario cerró el diálogo: nada que limpiar
    }

    // renderiza a la resolución de salida (independiente del tamaño en pantalla)
    this._renderer.setSize(W, H, false);
    this._cam.aspect = W / H; this._cam.updateProjectionMatrix();

    this._exporting = true;
    const ac = (this._exportAbort = new AbortController());
    this._showExport(true); this._setExportProgress(0);

    // sobrevuelo determinista desde el principio, con reloj simulado
    const wasCine = this._cineMode;
    this._three = this._localScene; this._introT0 = null; this._time = 0;
    this._playing = true; this._look = null; this._director = null; this._cHead = null;
    this._orbit.r = this._orbit.max * 0.3; this._orbit.phi = 1.0;
    this._chaseTargetR = this._orbit.max * 0.055;
    this._exportClock = performance.now(); this._last = this._exportClock; this._introStart = this._exportClock;
    if (this._trail) this._trail.visible = true;
    // coloca la cámara en el encuadre de apertura antes de grabar (sin tirón inicial)
    const THREE = window.THREE, d0 = this._scene.droneAt(0), o = this._orbit;
    this._look = new THREE.Vector3(d0.x, d0.y, d0.z);
    this._cam.position.set(
      this._look.x + o.r * Math.sin(o.phi) * Math.cos(o.theta),
      this._look.y + o.r * Math.cos(o.phi),
      this._look.z + o.r * Math.sin(o.phi) * Math.sin(o.theta));
    this._cam.lookAt(this._look);

    // renderiza un fotograma del sobrevuelo al lienzo de salida `out`
    const drawFrame = () => {
      this._exportClock += dt * 1000; // avanza el reloj un fotograma
      this._advanceFlyover();          // dron/estela/cámara con ese reloj
      this._animate();                 // hélices, LEDs, rótulos
      this._renderer.render(this._three, this._cam);
      octx.drawImage(cv, 0, 0, W, H);
      if (this._show.hud) this._drawExportHud(octx, W, H, this._time);
    };

    let rec;
    try {
      if (useWebCodecs && sink) {
        // camino ideal: se transmite a disco, sin acumular el MP4 en RAM
        rec = createMp4StreamRecorder({ width: W, height: H, fps, bitrate, sink });
        for (let i = 0; i < totalFrames; i++) {
          if (ac.signal.aborted) throw new DOMException('cancelado', 'AbortError');
          drawFrame();
          await rec.encode(out);
          if (i % 4 === 0) this._setExportProgress((i + 1) / totalFrames);
        }
        await rec.finish(); // el fichero ya está escrito y cerrado en disco
      } else if (useWebCodecs) {
        // sin File System Access: acumula en RAM y descarga como Blob
        rec = createMp4Recorder({ width: W, height: H, fps, bitrate });
        for (let i = 0; i < totalFrames; i++) {
          if (ac.signal.aborted) throw new DOMException('cancelado', 'AbortError');
          drawFrame();
          await rec.encode(out);
          if (i % 4 === 0) this._setExportProgress((i + 1) / totalFrames);
        }
        downloadBlob(suggestedName, await rec.finish());
      } else {
        // plan B (sin WebCodecs): MediaRecorder al lienzo, en RAM
        const r = await this._recordCanvas({ out, drawFrame, fps, dt, totalFrames, bitrate, signal: ac.signal });
        downloadBlob(`sobrevuelo-3d-${stamp}.${r.ext}`, r.blob);
      }
      this._exportMsg(t('v3d.export.done')); await new Promise((r) => setTimeout(r, 1200));
    } catch (e) {
      await rec?.cancel();
      const cancelled = e.name === 'AbortError';
      if (!cancelled) console.error('[flight-3d] export', e);
      this._exportMsg(cancelled ? t('v3d.export.cancelled') : t('v3d.export.error'), true);
      await new Promise((r) => setTimeout(r, 1500));
    } finally {
      this._exporting = false; this._exportClock = null; this._exportAbort = null;
      this._cineMode = wasCine;
      this._resize(); // devuelve el renderer/cámara a la resolución de pantalla
      this._stopFlyover(); this._showExport(false); this._applyOrbit();
    }
  }

  /** Pide al usuario un fichero de destino (File System Access API) y devuelve un
   *  `sink` asíncrono con el que el muxer transmite el MP4 a disco. Devuelve:
   *   - un sink `{ write, close }` si eligió destino,
   *   - `'cancelled'` si cerró el diálogo (no debe exportarse nada),
   *   - `null` si el navegador no soporta la API (usar el camino en RAM).
   *  Debe llamarse aún con la activación del gesto del usuario (sin awaits previos). */
  async _makeFileSink(suggestedName) {
    if (typeof window.showSaveFilePicker !== 'function') return null;
    let handle;
    try {
      handle = await window.showSaveFilePicker({
        suggestedName,
        types: [{ description: 'Vídeo MP4', accept: { 'video/mp4': ['.mp4'] } }],
      });
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled'; // cerró el selector
      console.warn('[flight-3d] showSaveFilePicker no disponible; export a RAM', e);
      return null; // sin permiso / no soportado → camino en RAM
    }
    const writable = await handle.createWritable();
    // El muxer escribe con posiciones explícitas (parchea el tamaño de mdat al
    // final), por eso cada write lleva su `position`.
    return {
      write: (bytes, pos) => writable.write({ type: 'write', position: pos, data: bytes }),
      close: () => writable.close(),
      // descarta el fichero parcial al cancelar (no confirma nada en disco)
      abort: () => writable.abort(),
    };
  }

  /** ¿Se puede grabar el lienzo con MediaRecorder? (plan B sin WebCodecs). */
  _canRecordCanvas() {
    return typeof MediaRecorder !== 'undefined'
      && typeof HTMLCanvasElement !== 'undefined'
      && typeof HTMLCanvasElement.prototype.captureStream === 'function';
  }

  /** Mejor contenedor/codec soportado por MediaRecorder: MP4/H.264 si existe
   *  (reproducible en iOS), si no WebM. '' = deja que el navegador elija. */
  _pickRecorderMime() {
    const cands = ['video/mp4;codecs=avc1.640028', 'video/mp4', 'video/webm;codecs=h264', 'video/webm;codecs=vp9', 'video/webm'];
    for (const m of cands) { try { if (MediaRecorder.isTypeSupported(m)) return m; } catch { /* ignora */ } }
    return '';
  }

  /** Plan B de exportación: graba el lienzo `out` con MediaRecorder. Empuja cada
   *  fotograma a ritmo real (requestFrame + espera dt) para que la velocidad de
   *  reproducción sea correcta; MediaRecorder marca los tiempos por reloj de pared.
   *  Devuelve { blob, ext }. */
  async _recordCanvas({ out, drawFrame, fps, dt, totalFrames, bitrate, signal }) {
    const mime = this._pickRecorderMime();
    const stream = out.captureStream(0); // 0 fps = fotogramas manuales
    const track = stream.getVideoTracks()[0];
    const opts = { videoBitsPerSecond: bitrate }; if (mime) opts.mimeType = mime;
    const mr = new MediaRecorder(stream, opts);
    const chunks = [];
    mr.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    const stopped = new Promise((res, rej) => { mr.onstop = res; mr.onerror = (ev) => rej(ev.error || new Error('MediaRecorder')); });
    mr.start();
    const frameMs = 1000 / fps;
    let next = performance.now();
    try {
      for (let i = 0; i < totalFrames; i++) {
        if (signal.aborted) throw new DOMException('cancelado', 'AbortError');
        drawFrame();
        track.requestFrame();
        if (i % 4 === 0) this._setExportProgress((i + 1) / totalFrames);
        next += frameMs;
        const wait = next - performance.now();
        await new Promise((r) => setTimeout(r, wait > 0 ? wait : 0));
      }
    } finally {
      try { if (mr.state !== 'inactive') mr.stop(); } catch { /* ya parado */ }
    }
    await stopped;
    stream.getTracks().forEach((tk) => tk.stop());
    const type = (mime ? mime.split(';')[0] : (chunks[0] && chunks[0].type)) || 'video/webm';
    return { blob: new Blob(chunks, { type }), ext: type.includes('mp4') ? 'mp4' : 'webm' };
  }

  /** Dibuja la telemetría (altura, velocidad, v. vertical, alejamiento) sobre el
   *  fotograma exportado, en la esquina superior derecha. */
  _drawExportHud(x, W, H, time) {
    const d = this._scene.droneAt(time), tk = this._scene.takeoffXZ;
    const far = Math.round(Math.hypot(d.x - tk.x, d.z - tk.z));
    const vals = [
      [String(Math.round(d.rel || 0)), t('v3d.hud.alt')],
      [String(Math.round((d.hs || 0) * 3.6)), t('v3d.hud.spd')],
      [((d.vs || 0) >= 0 ? '+' : '') + (d.vs || 0).toFixed(1), t('v3d.hud.vs')],
      [String(far), t('v3d.hud.far')],
    ];
    const s = H / 720, cw = 116 * s, gap = 8 * s, pad = 16 * s;
    const bw = pad * 2 + vals.length * cw + (vals.length - 1) * gap, bh = 60 * s;
    const bx = W - bw - 16 * s, by = 16 * s;
    x.save();
    x.fillStyle = 'rgba(10,14,20,0.5)';
    x.beginPath(); x.roundRect(bx, by, bw, bh, 12 * s); x.fill();
    vals.forEach((v, i) => {
      const cx = bx + pad + i * (cw + gap);
      x.fillStyle = '#fff'; x.font = `700 ${27 * s}px -apple-system, system-ui, sans-serif`;
      x.fillText(v[0], cx, by + 34 * s);
      x.fillStyle = 'rgba(255,255,255,0.6)'; x.font = `600 ${10.5 * s}px -apple-system, system-ui, sans-serif`;
      x.fillText(v[1].toUpperCase(), cx, by + 49 * s);
    });
    x.restore();
  }

  _showExport(on) { const e = this.$('#exp'); if (e) e.hidden = !on; }
  _setExportProgress(p) { const f = this.$('#expF'); if (f) f.style.width = Math.round(p * 100) + '%'; const l = this.$('#expT'); if (l) l.textContent = t('v3d.export.running') + ' ' + Math.round(p * 100) + '%'; }
  _exportMsg(msg, isErr) { const l = this.$('#expT'); if (l) { l.textContent = msg; l.classList.toggle('err', !!isErr); } }

  /** Avanza el sobrevuelo: mueve el dron, la estela y encadena la cámara. */
  _advanceFlyover() {
    const now = this._now(), dt = Math.min(0.05, (now - this._last) / 1000); this._last = now;
    this._time = Math.min(this._scene.duration, (this._time || 0) + dt * (this._speed || 1));
    this._placeDrone(this._time);
    this._updateTrail(this._time);
    this._revealTrack(this._time);
    if (this._cineMode && !this._introStart) this._cineCam(); else this._chaseCam();
    this._updateTime(this._time);
    if (this._time >= this._scene.duration && !this._exporting) this._stopFlyover();
  }

  /** Cámara de seguimiento: orbita alrededor del dron; el usuario puede arrastrar
   *  y hacer zoom en pleno sobrevuelo (la órbita usa theta/phi/r de _orbit). */
  _chaseCam() {
    const THREE = window.THREE, d = this._scene.droneAt(this._time);
    const tp = new THREE.Vector3(d.x, d.y, d.z);
    this._look = this._look || tp.clone();
    this._look.lerp(tp, 0.15); // sigue al dron suavemente
    // intro: durante ~2.6 s la cámara se acerca sola (luego manda el usuario)
    if (this._introStart) {
      if (this._now() - this._introStart < 2600) {
        this._orbit.r += (this._chaseTargetR - this._orbit.r) * 0.03;
        this._orbit.phi += (1.15 - this._orbit.phi) * 0.03;
      } else this._introStart = null;
    }
    const o = this._orbit, t = this._look;
    const want = new THREE.Vector3(
      t.x + o.r * Math.sin(o.phi) * Math.cos(o.theta),
      t.y + o.r * Math.cos(o.phi),
      t.z + o.r * Math.sin(o.phi) * Math.sin(o.theta),
    );
    this._cam.position.lerp(want, 0.25);
    this._cam.lookAt(t);
  }

  _seek(e) {
    const r = this.$('#prog').getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    this._time = p * this._scene.duration;
    this._placeDrone(this._time); this._updateTime(this._time);
    if (this._playing) this._revealTrack(this._time); else { this._revealTrackFull(); this._applyOrbit(); this._look = null; }
  }

  _updateTime(time) {
    const p = this._scene.duration ? time / this._scene.duration : 0;
    this.$('#progf').style.width = (p * 100) + '%';
    this.$('#time').textContent = `${mmss(time)} / ${mmss(this._scene.duration)}`;
  }

  _setPlayIcon(playing) {
    const ic = this.$('#playic');
    ic.innerHTML = playing ? '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>' : '<path d="M8 5v14l11-7z"/>';
    this.$('#play').lastChild.textContent = playing ? t('v3d.pause') : t('v3d.flyover');
  }

  /* ---------- utilidades ---------- */

  _webglOk() {
    try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); }
    catch { return false; }
  }

  _fallback() {
    this.$('#wrap')?.classList.remove('loading');
    const wrap = this.$('#wrap');
    if (wrap) wrap.innerHTML = `<div class="v3d-fallback">${t('v3d.unsupported')}</div>`;
  }

  _teardown() {
    this._exportAbort?.abort(); this._exporting = false; this._exportClock = null;
    if (this._raf) cancelAnimationFrame(this._raf); this._raf = null;
    this._playing = false;
    this._io?.disconnect(); this._io = null;
    this._ro?.disconnect(); this._ro = null;
    this._visIO?.disconnect(); this._visIO = null;
    this._introT0 = null; this._introPlayed = false; this._globe = null;
    if (this._renderer) { this._renderer.dispose(); this._renderer = null; }
    this._three = null; this._localScene = null; this._scene = null; this._time = null; this._look = null;
    this._labelItems = null; this._terrainMesh = null; this._ray = null; this._home = null; this._kpMarks = null; this._camTween = null; this._free = null; this._pilot = null;
    this._trackGroup = null; this._kpGroup = null; this._horizonPlacesGroup = null; this._horizonWaterGroup = null;
  }
}

customElements.define('flight-3d', Flight3D);

Object.assign(__x, { Flight3D });

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
  position: relative; pointer-events: auto; width: clamp(168px, 24vw, 260px); aspect-ratio: 16 / 9; border-radius: 14px; overflow: hidden;
  border: 1px solid var(--color-divider); box-shadow: var(--shadow-lg); background: #000; display: none;
  animation: rise .35s cubic-bezier(.22,1,.36,1) both;
}
.pip.on { display: block; }
.pip video { width: 100%; height: 100%; object-fit: cover; display: block; }
.hud { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.expand {
  position: absolute; top: 8px; right: 8px; z-index: 2; width: 30px; height: 30px; border-radius: 50%;
  border: 1px solid rgba(255,255,255,.28); background: rgba(0,0,0,.42); color: #fff; font-size: 15px; line-height: 1;
  cursor: pointer; display: grid; place-items: center; backdrop-filter: blur(6px); pointer-events: auto;
  opacity: 0; transition: opacity .15s, background .15s, transform .15s;
}
.pip:hover .expand, .pip.big .expand { opacity: 1; }
.expand:hover { background: rgba(0,0,0,.6); transform: scale(1.08); }
/* fondo desenfocado detrás del vídeo grande (focaliza la vista) */
.stage {
  position: fixed; inset: 0; z-index: 1; pointer-events: none; opacity: 0; visibility: hidden;
  background: rgba(6, 7, 10, .5); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  transition: opacity .28s ease, visibility .28s;
}
:host(.big) .stage { opacity: 1; visibility: visible; pointer-events: auto; }
.pip.big {
  position: fixed; left: 50%; bottom: 84px; transform: translateX(-50%);
  width: min(96vw, calc(86vh * 16 / 9)); max-width: 1600px; z-index: 5;
  animation: bigin .26s cubic-bezier(.22,1,.36,1) both;
}
.pip.big .expand { width: 38px; height: 38px; font-size: 18px; top: 12px; right: 12px; }
@keyframes bigin { from { opacity: .4; transform: translateX(-50%) scale(.9); } }
/* en vertical (móvil) el vídeo 16:9 es bajo: centrarlo en pantalla en vez de anclarlo abajo */
@media (orientation: portrait) {
  .pip.big { top: 50%; bottom: auto; transform: translate(-50%, -50%); animation-name: bigin-v; }
}
@keyframes bigin-v { from { opacity: .4; transform: translate(-50%, -50%) scale(.9); } }
@media (prefers-reduced-motion: reduce) { .pip.big { animation: none; } }
.player {
  position: relative; z-index: 6;
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
/* bandas de maniobra al fondo de la barra (color por tipo) */
.mnv-band { position: absolute; top: 0; bottom: 0; opacity: .42; pointer-events: none; z-index: 0; }
.mnv-band:first-child { border-radius: 100px 0 0 100px; }
.mnv-band:last-of-type { border-radius: 0 100px 100px 0; }
/* marcadores de momentos destacados sobre la barra */
.hl-mark {
  position: absolute; top: 50%; transform: translate(-50%, -50%); z-index: 3;
  width: 16px; height: 18px; padding: 0; border: none; background: none; cursor: ew-resize; display: grid; place-items: center;
  touch-action: none;
}
.hl-mark::after {
  content: ""; width: 9px; height: 9px; border-radius: 50%; background: var(--color-accent);
  border: 2px solid var(--color-surface-solid); box-shadow: 0 1px 3px rgba(0,0,0,.45); transition: transform .12s;
}
.hl-mark:hover::after { transform: scale(1.4); }
.hl-alt::after { background: var(--color-violet, #a06bff); }
.hl-dist::after { background: #37cf6b; }
.hl-climb::after { background: #37cf6b; }
.hl-descent::after { background: #ff5d5d; }
.hl-turn::after { background: #ffb43d; }
.speeds { display: flex; gap: 4px; flex: none; }
.speeds button {
  border: 1px solid var(--color-divider); background: transparent; color: var(--color-text-muted); border-radius: 8px;
  padding: 5px 8px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; min-width: 32px;
}
.speeds button.on { color: #fff; background: var(--color-accent); border-color: transparent; }

/* botón de ajustes del HUD */
.cfg-btn {
  flex: none; width: 34px; height: 34px; border-radius: 9px; border: 1px solid var(--color-divider);
  background: transparent; color: var(--color-text-muted); font-size: 15px; cursor: pointer; display: grid; place-items: center;
  transition: color .12s, background .12s, transform .12s;
}
.cfg-btn:hover { color: var(--color-text); transform: rotate(35deg); }
.cfg-btn.on { color: #fff; background: var(--color-accent); border-color: transparent; }

/* panel de ajustes del HUD (sobre la barra) */
.cfgpanel {
  position: relative; z-index: 7; /* por encima del backdrop del modo grande */
  pointer-events: auto; width: min(560px, 100%); align-self: center; display: flex; flex-direction: column; gap: 0;
  background: color-mix(in srgb, var(--color-surface-solid) 68%, transparent); border: 1px solid color-mix(in srgb, var(--color-text) 14%, transparent);
  border-radius: 20px; padding: 6px; box-shadow: var(--shadow-lg); backdrop-filter: blur(32px) saturate(1.7); -webkit-backdrop-filter: blur(32px) saturate(1.7);
  animation: rise .28s cubic-bezier(.22,1,.36,1) both;
}
.cfgpanel[hidden] { display: none; }
.cfg-sec { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 6px 10px; }
.cfg-row2 { justify-content: space-between; gap: 18px; }
.cfg-col { display: flex; align-items: center; gap: 10px; min-width: 0; }
.cfg-sec + .cfg-sec, .cfg-foot { border-top: 1px solid color-mix(in srgb, var(--color-divider) 55%, transparent); }
.cfg-t { font-size: 10px; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: .1em; width: 62px; flex: none; }
.cfg-col .cfg-t { width: auto; }
.cfg-chips { display: flex; gap: 6px; flex-wrap: wrap; flex: 1; }
.cfg-chip {
  display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 550; color: var(--color-text-muted); font-family: inherit; cursor: pointer;
  border: 1px solid var(--color-divider); background: transparent; border-radius: 9px; padding: 6px 11px 6px 9px; transition: color .14s, border-color .14s, background .14s;
}
.chip-dot { width: 6px; height: 6px; border-radius: 50%; box-shadow: inset 0 0 0 1.4px currentColor; opacity: .4; transition: opacity .14s, background .14s, box-shadow .14s; }
.cfg-chip:hover { color: var(--color-text); border-color: color-mix(in srgb, var(--color-text) 24%, transparent); }
.cfg-chip.on { color: var(--color-text); border-color: color-mix(in srgb, var(--color-accent) 45%, transparent); background: color-mix(in srgb, var(--color-accent) 12%, transparent); }
.cfg-chip.on .chip-dot { background: var(--color-accent); box-shadow: 0 0 0 1.4px var(--color-accent), 0 0 6px color-mix(in srgb, var(--color-accent) 55%, transparent); opacity: 1; }
.cfg-music { display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; }
.cfg-music-btn {
  display: inline-flex; align-items: center; gap: 8px; flex: 1; min-width: 0; font-family: inherit; cursor: pointer; text-align: left;
  font-size: 12.5px; font-weight: 550; color: var(--color-text-muted); border: 1px solid var(--color-divider);
  background: transparent; border-radius: 9px; padding: 7px 11px; transition: color .14s, border-color .14s, background .14s;
}
.cfg-music-btn:hover { color: var(--color-text); border-color: color-mix(in srgb, var(--color-text) 24%, transparent); }
.cfg-music-btn.on { color: var(--color-text); border-color: color-mix(in srgb, var(--color-accent) 45%, transparent); background: color-mix(in srgb, var(--color-accent) 12%, transparent); }
.cfg-music-btn.on .cfg-music-ic { color: var(--color-accent); }
.cfg-music-ic { width: 15px; height: 15px; flex: none; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.cfg-music-btn #musicname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cfg-music-x {
  flex: none; width: 28px; height: 28px; border-radius: 8px; border: 1px solid var(--color-divider); background: transparent;
  color: var(--color-text-muted); font-size: 12px; cursor: pointer; display: grid; place-items: center; transition: color .12s, background .12s;
}
.cfg-music-x:hover { color: var(--color-text); background: color-mix(in srgb, var(--color-text) 8%, transparent); }
.cfg-music-ctrls { display: flex; gap: 16px; width: 100%; margin-top: 9px; flex-wrap: wrap; }
.cfg-music-ctrls[hidden] { display: none; }
.cfg-ctrl { display: flex; align-items: center; gap: 9px; flex: 1; min-width: 190px; }
.cfg-ctrl-t { font-size: 11px; font-weight: 600; color: var(--color-text-muted); width: 52px; flex: none; }
.cfg-ctrl-v { font-size: 11.5px; font-weight: 650; color: var(--color-text); font-variant-numeric: tabular-nums; min-width: 38px; text-align: right; }
.cfg-ctrl input[type=range] {
  flex: 1; min-width: 0; height: 4px; -webkit-appearance: none; appearance: none; border-radius: 100px; cursor: pointer;
  background: color-mix(in srgb, var(--color-text) 15%, transparent); accent-color: var(--color-accent);
}
.cfg-ctrl input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none; width: 15px; height: 15px; border-radius: 50%; background: var(--color-accent);
  border: 2px solid var(--color-surface-solid); box-shadow: 0 1px 4px rgba(0,0,0,.35); cursor: pointer;
}
.cfg-ctrl input[type=range]::-moz-range-thumb {
  width: 13px; height: 13px; border-radius: 50%; background: var(--color-accent); border: 2px solid var(--color-surface-solid); cursor: pointer;
}
.cfg-mini {
  flex: none; font-family: inherit; font-size: 11px; font-weight: 600; cursor: pointer; color: var(--color-text-muted);
  border: 1px solid var(--color-divider); background: transparent; border-radius: 7px; padding: 4px 9px; transition: color .14s, border-color .14s, background .14s;
}
.cfg-mini:hover { color: var(--color-text); border-color: color-mix(in srgb, var(--color-text) 24%, transparent); }
.cfg-mini.on { color: var(--color-text); border-color: color-mix(in srgb, var(--color-accent) 45%, transparent); background: color-mix(in srgb, var(--color-accent) 14%, transparent); }
.cfg-wave { width: 100%; display: flex; flex-direction: column; gap: 5px; }
.cfg-wave-cv {
  width: 100%; height: 46px; display: block; cursor: ew-resize; border-radius: 8px; touch-action: none;
  background: color-mix(in srgb, var(--color-text) 6%, transparent); border: 1px solid var(--color-divider);
}
.cfg-wave-foot { display: flex; align-items: center; gap: 8px; }
.cfg-wave-foot .cfg-ctrl-v { min-width: 0; }
.cfg-foot { display: flex; align-items: center; gap: 9px; padding: 9px 10px; flex-wrap: wrap; }
.cfg-units { display: flex; gap: 2px; background: color-mix(in srgb, var(--color-text) 8%, transparent); border-radius: 10px; padding: 3px; flex: none; }
.cfg-units button {
  font-size: 12.5px; font-weight: 600; color: var(--color-text-muted); border: none; background: transparent; border-radius: 7px;
  padding: 5px 15px; cursor: pointer; font-family: inherit; transition: color .14s;
}
.cfg-units button.on { color: var(--color-text); background: var(--color-surface-solid); box-shadow: 0 1px 3px rgba(0,0,0,.28); }
.cfg-export {
  flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: none; cursor: pointer; font-family: inherit;
  font-size: 13px; font-weight: 700; color: #fff; border-radius: 11px; padding: 9px 16px;
  background: linear-gradient(135deg, var(--color-accent-2, var(--color-accent)), var(--color-accent));
  box-shadow: 0 8px 20px -8px color-mix(in srgb, var(--color-accent) 70%, transparent); transition: transform .12s, box-shadow .12s;
}
.cfg-export:hover { transform: translateY(-1px); box-shadow: 0 12px 26px -8px color-mix(in srgb, var(--color-accent) 78%, transparent); }
.cfg-export-ic { width: 16px; height: 16px; flex: none; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.cfg-trailer {
  flex: none; display: inline-flex; align-items: center; gap: 6px; font-family: inherit; cursor: pointer;
  font-size: 13px; font-weight: 650; color: var(--color-text); border: 1px solid var(--color-divider);
  background: transparent; border-radius: 11px; padding: 9px 13px; transition: border-color .14s, background .14s;
}
.cfg-trailer:hover { border-color: color-mix(in srgb, var(--color-accent) 45%, transparent); background: color-mix(in srgb, var(--color-accent) 10%, transparent); }
.cfg-select {
  flex: none; font-family: inherit; font-size: 12.5px; font-weight: 600; color: var(--color-text); cursor: pointer;
  border: 1px solid var(--color-divider); background: transparent; border-radius: 9px; padding: 8px 10px;
}
.cfg-select:hover { border-color: color-mix(in srgb, var(--color-text) 24%, transparent); }

/* overlay de progreso de exportación */
.export-ov {
  position: fixed; inset: 0; z-index: 20; display: grid; place-items: center; pointer-events: auto;
  background: rgba(6,7,10,.55); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
}
.export-card {
  width: min(420px, 90vw); background: var(--color-surface-solid); border: 1px solid var(--color-divider); border-radius: 18px;
  padding: 24px; box-shadow: var(--shadow-lg); text-align: center; animation: rise .28s cubic-bezier(.22,1,.36,1) both;
}
.export-title { font-size: 16px; font-weight: 750; color: var(--color-text); }
.export-track { height: 8px; border-radius: 100px; background: color-mix(in srgb, var(--color-text) 12%, transparent); margin: 16px 0 8px; overflow: hidden; }
.export-fill { height: 100%; width: 0; border-radius: 100px; background: linear-gradient(90deg, var(--color-accent-2, var(--color-accent)), var(--color-accent)); transition: width .2s; }
.export-pct { font-size: 22px; font-weight: 800; color: var(--color-text); font-variant-numeric: tabular-nums; }
.export-note { font-size: 12.5px; color: var(--color-text-muted); margin: 8px 0 18px; }
.export-cancel {
  border: 1px solid var(--color-divider); background: transparent; color: var(--color-text); cursor: pointer; font-family: inherit;
  font-size: 13px; font-weight: 650; border-radius: 100px; padding: 8px 20px;
}
.export-cancel:hover { background: color-mix(in srgb, var(--color-text) 8%, transparent); }

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
const { DEFAULT_CFG, GAUGE_KEYS } = __req("js/hud.js");
const { exportHudVideo, exportTrailer } = __req("js/hud-export.js");
const { buildTrailerSegments } = __req("js/highlights.js");
const { MANEUVER_COLOR } = __req("js/maneuvers.js");
const { generateAmbient, generateFlightMusic, STYLES } = __req("js/music-gen.js");
const { FX, FX_KEYS, fxFilter, grainDataUri } = __req("js/video-fx.js");
const { downloadBlob } = __req("js/exports.js");
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

  /** @param {((ctx:CanvasRenderingContext2D,t:number,w:number,h:number)=>void)|null} fn HUD a pintar sobre el vídeo */
  set hud(fn) { this._hud = fn; if (this.isConnected) this._drawHud(); }
  get hud() { return this._hud; }

  /** @param {Array<{t:number,type:string,value:number,unit:string}>} h momentos destacados */
  set highlights(h) { this._highlights = h || []; if (this.isConnected) this._renderHighlights(); }
  get highlights() { return this._highlights; }

  /** @param {object} d datos de la portada del trailer (kicker, título, lugar, track, stats) */
  set intro(d) { this._intro = d; }
  get intro() { return this._intro; }

  /** @param {Array<{t0:number,t1:number,type:string}>} m tramos de maniobra para la barra */
  set maneuvers(m) { this._maneuvers = m || []; if (this.isConnected) this._renderManeuvers(); }
  get maneuvers() { return this._maneuvers; }

  /** @param {object} m modelo del vuelo, para la sonificación reactiva de la música */
  set flightModel(m) { this._flightModel = m; }
  get flightModel() { return this._flightModel; }

  render() {
    const cfg = this._cfg();
    this.shadowRoot.innerHTML = `
      <div class="stage" id="stage"></div>
      <div class="stack">
        <div class="pip" id="pip">
          <canvas class="hud" id="hud"></canvas>
          <button class="expand" id="expand" type="button" aria-label="${t('player.expand')}">⤢</button>
        </div>
        <div class="cfgpanel" id="cfgpanel" hidden>
          <div class="cfg-sec">
            <span class="cfg-t">${t('hud.metrics')}</span>
            <div class="cfg-chips">${['speed', 'alt', 'dist', 'vspeed'].map((k) => this._chipTpl(k, cfg)).join('')}</div>
          </div>
          <div class="cfg-sec">
            <span class="cfg-t">${t('hud.elements')}</span>
            <div class="cfg-chips">${['heading', 'clock', 'minimap', 'progress', 'watermark', 'location'].map((k) => this._chipTpl(k, cfg)).join('')}</div>
          </div>
          <div class="cfg-sec cfg-row2">
            <div class="cfg-col">
              <span class="cfg-t">${t('hud.theme')}</span>
              <div class="cfg-units">
                <button class="${cfg.theme === 'modern' ? 'on' : ''}" data-th="modern" type="button">${t('hud.theme.modern')}</button>
                <button class="${cfg.theme === 'aviation' ? 'on' : ''}" data-th="aviation" type="button">${t('hud.theme.aviation')}</button>
              </div>
            </div>
            <div class="cfg-col">
              <span class="cfg-t">${t('fx.label')}</span>
              <select class="cfg-select" id="fxsel" title="${t('fx.label')}">
                ${FX_KEYS.map((k) => `<option value="${k}" ${(this._fxKey ?? 'none') === k ? 'selected' : ''}>${t('fx.' + k)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="cfg-sec">
            <span class="cfg-t">${t('hud.music')}</span>
            <div class="cfg-music">
              <button class="cfg-music-btn ${this._musicName ? 'on' : ''}" id="musicbtn" type="button">
                <svg viewBox="0 0 24 24" aria-hidden="true" class="cfg-music-ic"><path d="M9 18V5l10-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/></svg>
                <span id="musicname">${this._musicName || t('hud.music.none')}</span>
              </button>
              <button class="cfg-mini" id="musicgen" type="button" title="${t('hud.music.generate.hint')}">✨ ${t('hud.music.generate')}</button>
              <button class="cfg-music-x" id="musicclear" type="button" aria-label="${t('hud.music.remove')}" ${this._musicName ? '' : 'hidden'}>✕</button>
            </div>
            <input type="file" id="musicinput" accept="audio/*" hidden>
            <div class="cfg-music-ctrls" id="musicctrls" ${this._musicName ? '' : 'hidden'}>
              <div class="cfg-ctrl">
                <span class="cfg-ctrl-t">${t('hud.music.volume')}</span>
                <input type="range" id="musicvol" min="0" max="100" value="${Math.round((this._musicVol ?? 1) * 100)}">
                <span class="cfg-ctrl-v" id="musicvollbl">${Math.round((this._musicVol ?? 1) * 100)}%</span>
                <button class="cfg-mini ${this._musicNormOn ? 'on' : ''}" id="musicnorm" type="button" title="${t('hud.music.normalize.hint')}">${t('hud.music.normalize')}</button>
              </div>
              <div class="cfg-wave">
                <canvas id="musicwave" class="cfg-wave-cv" title="${t('hud.music.start')}"></canvas>
                <div class="cfg-wave-foot">
                  <span class="cfg-ctrl-t">${t('hud.music.start')}</span>
                  <span class="cfg-ctrl-v" id="musicstartlbl">${mmss(this._musicStart || 0)}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="cfg-foot">
            <div class="cfg-units">
              <button class="${cfg.units === 'metric' ? 'on' : ''}" data-u="metric" type="button">${t('hud.metric')}</button>
              <button class="${cfg.units === 'imperial' ? 'on' : ''}" data-u="imperial" type="button">${t('hud.imperial')}</button>
            </div>
            <div class="cfg-units" title="${t('hud.format.hint')}">
              <button class="${!this._vertical ? 'on' : ''}" data-fmt="h" type="button">16:9</button>
              <button class="${this._vertical ? 'on' : ''}" data-fmt="v" type="button">9:16</button>
            </div>
            <select class="cfg-select" id="trailerfx" title="${t('hud.fx.hint')}" aria-label="${t('hud.fx.hint')}">
              ${['random', 'smooth', 'dynamic', 'none'].map((k) => `<option value="${k}" ${(this._trailerFx ?? 'random') === k ? 'selected' : ''}>${t('hud.fx.' + k)}</option>`).join('')}
            </select>
            <button class="cfg-trailer" id="trailerbtn" type="button" title="${t('hud.trailer.hint')}">🎬 ${t('hud.trailer')}</button>
            <button class="cfg-export" id="exportbtn" type="button">
              <svg viewBox="0 0 24 24" aria-hidden="true" class="cfg-export-ic"><path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"/></svg>${t('hud.export')}
            </button>
          </div>
        </div>
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
          <button class="cfg-btn" id="cfgbtn" type="button" aria-label="${t('hud.settings')}">⚙</button>
        </div>
      </div>`;
  }

  /** Config del HUD (qué gauges y unidades), persistente en memoria. */
  _cfg() {
    if (!this._hudCfg) this._hudCfg = { units: DEFAULT_CFG.units, theme: DEFAULT_CFG.theme, gauges: { ...DEFAULT_CFG.gauges } };
    return this._hudCfg;
  }

  _chipTpl(k, cfg) {
    return `<button class="cfg-chip ${cfg.gauges[k] ? 'on' : ''}" data-g="${k}" type="button"><i class="chip-dot"></i>${t('hud.g.' + k)}</button>`;
  }

  _mountVideo() {
    const pip = this.$('#pip');
    if (!pip) return;
    if (this._video) {
      if (this._video.parentElement !== pip) pip.appendChild(this._video);
      pip.classList.add('on');
      this._applyFx();
    } else {
      pip.classList.remove('on');
    }
  }

  /** Aplica el efecto a la previsualización: filtro CSS al vídeo + capas de superposición. */
  _applyFx() {
    if (this._video) this._video.style.filter = fxFilter(this._fxKey);
    this._applyFxLayers();
  }

  /** Reconstruye las capas de superposición (halo, degradado, viñeta, grano) sobre el vídeo. */
  _applyFxLayers() {
    const pip = this.$('#pip'), hud = this.$('#hud');
    if (!pip) return;
    pip.querySelectorAll('.fx-layer').forEach((e) => e.remove());
    const layers = FX[this._fxKey || 'none']?.layers || [];
    for (const L of layers) {
      const d = document.createElement('div'); d.className = 'fx-layer';
      d.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
      if (L.type === 'color') { d.style.background = L.color; d.style.mixBlendMode = L.mode; }
      else if (L.type === 'gradient') { d.style.background = `linear-gradient(180deg, ${L.stops.map((s) => `${s[1]} ${s[0] * 100}%`).join(', ')})`; d.style.mixBlendMode = L.mode; }
      else if (L.type === 'vignette') { d.style.background = `radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,${L.strength}) 100%)`; }
      else if (L.type === 'grain') { d.style.backgroundImage = `url(${grainDataUri()})`; d.style.backgroundRepeat = 'repeat'; d.style.mixBlendMode = 'overlay'; d.style.opacity = L.alpha; }
      pip.insertBefore(d, hud); // sobre el vídeo, bajo el HUD
    }
  }

  afterRender() {
    this._mountVideo();
    this.on(this.$('#expand'), 'click', () => this._toggleBig());
    this.on(this.$('#stage'), 'click', () => { if (this._big) this._toggleBig(); }); // clic fuera reduce
    if (this._big) this._applyBig();
    this._wireConfig();
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
      c.addEventListener('state', () => this._syncMusic()); // play/pausa/seek/velocidad → música
    }
    this._sync();
    this._renderManeuvers();
    this._renderHighlights();
  }

  /** Pinta las bandas de maniobra (color por tipo) al fondo de la barra. */
  _renderManeuvers() {
    const bar = this.$('#bar'); const c = this._clock;
    if (!bar) return;
    this.$$('.mnv-band').forEach((e) => e.remove());
    if (!c || !c.dur || !this._maneuvers?.length) return;
    const fill = this.$('#fill');
    for (const s of this._maneuvers) {
      const d = document.createElement('div'); d.className = 'mnv-band';
      d.style.left = Math.max(0, s.t0 / c.dur * 100) + '%';
      d.style.width = Math.max(0.5, (s.t1 - s.t0) / c.dur * 100) + '%';
      d.style.background = MANEUVER_COLOR[s.type] || '#8a93a6';
      d.title = t('mnv.' + s.type);
      bar.insertBefore(d, fill); // al fondo, bajo el progreso y los marcadores
    }
  }

  /** Pinta los marcadores de momentos (arrastrables): definen los puntos del trailer. */
  _renderHighlights() {
    const bar = this.$('#bar'); const c = this._clock;
    if (!bar) return;
    this.$$('.hl-mark').forEach((m) => m.remove());
    if (!c || !c.dur || !this._highlights?.length) return;
    const tFromX = (x) => { const r = bar.getBoundingClientRect(); return Math.max(0, Math.min(1, (x - r.left) / r.width)) * c.dur; };
    for (const h of this._highlights) {
      const m = document.createElement('button');
      m.className = 'hl-mark hl-' + h.type; m.type = 'button';
      m.style.left = Math.max(0, Math.min(100, h.t / c.dur * 100)) + '%';
      m.title = this._hlLabel(h); m.setAttribute('aria-label', m.title);
      let dragging = false, moved = false;
      this.on(m, 'pointerdown', (e) => { e.stopPropagation(); m.setPointerCapture(e.pointerId); dragging = true; moved = false; c.pause(); });
      this.on(m, 'pointermove', (e) => {
        if (!dragging) return;
        moved = true;
        h.t = tFromX(e.clientX);
        m.style.left = (h.t / c.dur * 100) + '%';
        m.title = this._hlLabel(h); m.setAttribute('aria-label', m.title);
        c.seek(h.t); // salta al frame de este punto mientras se arrastra
      });
      this.on(m, 'pointerup', (e) => { dragging = false; if (!moved) c.seek(h.t); }); // clic simple → saltar
      bar.appendChild(m);
    }
  }

  /** Formatea el valor de un momento según las unidades activas. */
  _hlFmt(h) {
    const imp = this._cfg().units === 'imperial';
    switch (h.type) {
      case 'speed': return imp ? Math.round(h.value * 2.23694) + ' mph' : Math.round(h.value * 3.6) + ' km/h';
      case 'alt': case 'dist': return imp ? Math.round(h.value * 3.28084) + ' ft' : Math.round(h.value) + ' m';
      case 'climb': case 'descent': return imp ? (h.value * 3.28084).toFixed(1) + ' ft/s' : h.value.toFixed(1) + ' m/s';
      case 'turn': return Math.round(h.value) + ' °/s';
      default: return String(h.value);
    }
  }

  /** Etiqueta de un momento: título traducido + valor + instante (se actualiza al arrastrar). */
  _hlLabel(h) { return t('hl.' + h.type) + ' · ' + this._hlFmt(h) + ' · ' + mmss(h.t); }

  _sync() {
    const c = this._clock;
    if (!c || !this.isConnected) return;
    const f = c.dur ? c.t / c.dur : 0;
    const fill = this.$('#fill'); if (fill) fill.style.width = (f * 100) + '%';
    const cur = this.$('#cur'); if (cur) cur.textContent = mmss(c.t);
    const play = this.$('#play'); if (play) { play.textContent = c.playing ? '❚❚' : '▶'; play.setAttribute('aria-label', t(c.playing ? 'player.pause' : 'player.play')); }
    this.$$('[data-sp]').forEach((b) => b.classList.toggle('on', +b.dataset.sp === c.speed));
    this._drawHud();
    if (this._musicBuf && this._musicPeaks) this._drawWaveform(); // cursor sobre la canción
  }

  /** Alterna el modo grande (teatro) del vídeo + HUD. */
  _toggleBig() { this._big = !this._big; this._applyBig(); }

  /** Sale del modo grande (p. ej. al salir de la sección del mapa). */
  collapse() { if (this._big) { this._big = false; this._applyBig(); } }

  /** Cablea el panel de ajustes del HUD (gauges + unidades). */
  _wireConfig() {
    const cfg = this._cfg();
    const btn = this.$('#cfgbtn'), panel = this.$('#cfgpanel');
    if (btn) this.on(btn, 'click', () => { panel.hidden = !panel.hidden; btn.classList.toggle('on', !panel.hidden); });
    this.$$('.cfg-chip').forEach((b) => this.on(b, 'click', () => {
      const k = b.dataset.g; cfg.gauges[k] = cfg.gauges[k] ? 0 : 1; b.classList.toggle('on', !!cfg.gauges[k]); this._drawHud();
    }));
    this.$$('button[data-u]').forEach((b) => this.on(b, 'click', () => {
      cfg.units = b.dataset.u; this.$$('button[data-u]').forEach((x) => x.classList.toggle('on', x === b)); this._drawHud();
    }));
    this.$$('button[data-th]').forEach((b) => this.on(b, 'click', () => {
      cfg.theme = b.dataset.th; this.$$('button[data-th]').forEach((x) => x.classList.toggle('on', x === b)); this._drawHud();
    }));
    this._wireMusic();
    const exp = this.$('#exportbtn');
    if (exp) this.on(exp, 'click', () => this._exportVideo());
    const tb = this.$('#trailerbtn');
    if (tb) this.on(tb, 'click', () => this._exportTrailer());
    const fx = this.$('#trailerfx');
    if (fx) this.on(fx, 'change', () => { this._trailerFx = fx.value; });
    this.$$('button[data-fmt]').forEach((b) => this.on(b, 'click', () => {
      this._vertical = b.dataset.fmt === 'v';
      this.$$('button[data-fmt]').forEach((x) => x.classList.toggle('on', x === b));
    }));
    const fxs = this.$('#fxsel');
    if (fxs) this.on(fxs, 'change', () => { this._fxKey = fxs.value; this._applyFx(); });
  }

  /** Presets de transiciones del trailer (undefined = todas al azar). */
  _trailerTransitions() {
    const p = { smooth: ['black', 'blur'], dynamic: ['zoom', 'blur'], none: [] };
    return (this._trailerFx && this._trailerFx !== 'random') ? p[this._trailerFx] : undefined;
  }

  /** Genera el auto-trailer (tramos de los momentos destacados) con HUD y música. */
  async _exportTrailer() {
    if (this._exporting) return;
    if (!this._video || !this._hud) return;
    const segs = buildTrailerSegments(this._highlights, this._clock?.dur || 0, { target: 26 }); // ~30 s con la portada
    if (!segs.length) return;
    this._exporting = true;
    this._clock?.pause();
    const ov = this._exportOverlay();
    const ctrl = new AbortController();
    ov.cancelBtn.onclick = () => ctrl.abort();
    try {
      const blob = await exportTrailer({ video: this._video, draw: this._hud, cfg: this._cfg(), segments: segs, transitions: this._trailerTransitions(), intro: this._intro, musicBuffer: this._musicBuf, musicVolume: this._musicVolEff(), musicStart: this._musicStart || 0, vertical: this._vertical, fx: this._fxKey || 'none', onProgress: ov.set, signal: ctrl.signal });
      downloadBlob('trailer-vuelo.mp4', blob);
      ov.done();
      await new Promise((r) => setTimeout(r, 1400));
    } catch (e) {
      if (e.name !== 'AbortError') { console.error(e); ov.fail(e.message); await new Promise((r) => setTimeout(r, 2600)); }
    } finally {
      this._exporting = false;
      ov.close();
    }
  }

  /** Cablea la carga/borrado del archivo de música para la exportación. */
  _wireMusic() {
    const btn = this.$('#musicbtn'), input = this.$('#musicinput'), clear = this.$('#musicclear');
    if (!btn || !input) return;
    this.on(btn, 'click', () => input.click());
    this.on(input, 'change', () => { const f = input.files?.[0]; if (f) { this._music = f; this._musicName = f.name; this._musicGen = false; this._musicBuf = null; this._musicStart = 0; this._decodeMusic(); this._refreshMusic(); } });
    if (clear) this.on(clear, 'click', () => { this._music = null; this._musicBuf = null; this._musicName = null; this._musicGen = false; this._musicStop(); input.value = ''; this._refreshMusic(); });
    const gen = this.$('#musicgen');
    if (gen) this.on(gen, 'click', () => this._generateMusic());
    const vol = this.$('#musicvol'), norm = this.$('#musicnorm');
    const applyVol = () => { if (this._musicGain && this._musicAC) this._musicGain.gain.setTargetAtTime(this._musicVolEff(), this._musicAC.currentTime, 0.02); };
    if (vol) this.on(vol, 'input', () => {
      this._musicVol = (+vol.value) / 100;
      const l = this.$('#musicvollbl'); if (l) l.textContent = vol.value + '%';
      applyVol();
    });
    if (norm) this.on(norm, 'click', () => { this._musicNormOn = !this._musicNormOn; norm.classList.toggle('on', this._musicNormOn); applyVol(); });
    const wave = this.$('#musicwave');
    if (wave) {
      const setFromX = (x) => {
        const r = wave.getBoundingClientRect(), f = Math.max(0, Math.min(1, (x - r.left) / r.width));
        this._musicStart = +(f * (this._musicBuf?.duration || 0)).toFixed(1);
        const l = this.$('#musicstartlbl'); if (l) l.textContent = mmss(this._musicStart);
        this._drawWaveform();
      };
      this.on(wave, 'pointerdown', (e) => { wave.setPointerCapture(e.pointerId); this._waveDrag = true; setFromX(e.clientX); });
      this.on(wave, 'pointermove', (e) => { if (this._waveDrag) setFromX(e.clientX); });
      this.on(wave, 'pointerup', () => { this._waveDrag = false; this._syncMusic(); });
    }
    this._drawWaveform();
  }

  /** Calcula los picos (0..1) de la canción para dibujar la forma de onda. */
  _computePeaks(buf, n = 320) {
    const ch = buf.getChannelData(0), block = Math.floor(ch.length / n) || 1, peaks = new Array(n);
    for (let i = 0; i < n; i++) {
      let m = 0; const s = i * block, e = Math.min(ch.length, s + block);
      for (let j = s; j < e; j++) { const v = Math.abs(ch[j]); if (v > m) m = v; }
      peaks[i] = m;
    }
    const mx = Math.max(0.01, ...peaks);
    return peaks.map((p) => p / mx);
  }

  /** Factor de normalización: sube el volumen percibido (RMS) sin llegar a saturar. */
  _computeNorm(buf) {
    let peak = 0, sum = 0, count = 0;
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const d = buf.getChannelData(c);
      for (let j = 0; j < d.length; j += 64) { const v = Math.abs(d[j]); if (v > peak) peak = v; sum += d[j] * d[j]; count++; }
    }
    const rms = Math.sqrt(sum / Math.max(1, count));
    let f = rms > 1e-4 ? 0.2 / rms : 1;          // RMS objetivo ~0,2
    f = Math.min(f, 0.99 / (peak || 1));          // nunca saturar
    return Math.max(0.1, Math.min(f, 8));
  }

  /** Volumen efectivo = volumen del slider × factor de normalización (si está activa). */
  _musicVolEff() { return (this._musicVol ?? 1) * (this._musicNormOn ? (this._musicNorm || 1) : 1); }

  /** Dibuja la forma de onda: región usada en acento, asa de inicio y cursor. */
  _drawWaveform() {
    const cv = this.$('#musicwave');
    if (!cv || !this._musicPeaks || !this._musicBuf) return;
    const w = cv.clientWidth, h = cv.clientHeight || 46;
    if (!w) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    const peaks = this._musicPeaks, n = peaks.length, mid = h / 2;
    const Dm = this._musicBuf.duration, Dv = this._clock?.dur || Dm, start = this._musicStart || 0;
    const cs = getComputedStyle(this);
    const accent = cs.getPropertyValue('--color-accent').trim() || '#5b9dff';
    const barW = w / n;
    for (let i = 0; i < n; i++) {
      const ti = i / n * Dm, inUse = ((ti - start + Dm) % Dm) < Dv, a = Math.max(1, peaks[i] * mid * 0.9);
      ctx.fillStyle = inUse ? accent : 'rgba(140,150,170,.4)';
      ctx.fillRect(i * barW, mid - a, Math.max(1, barW * 0.66), a * 2);
    }
    const sx = (start / Dm) * w; // asa de inicio
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, h); ctx.stroke();
    ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(sx, 5, 4, 0, 7); ctx.fill();
    if (this._clock?.playing) { // cursor de reproducción sobre la canción
      const cur = (((start + (this._clock.t || 0)) % Dm) / Dm) * w;
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cur, 0); ctx.lineTo(cur, h); ctx.stroke();
    }
  }

  /** Refresca nombre, controles y etiqueta del punto de inicio según la música. */
  _refreshMusic() {
    const name = this.$('#musicname'), btn = this.$('#musicbtn'), clear = this.$('#musicclear'), ctrls = this.$('#musicctrls');
    if (name) name.textContent = this._musicName || t('hud.music.none');
    if (btn) btn.classList.toggle('on', !!this._musicName);
    if (clear) clear.hidden = !this._musicName;
    if (ctrls) ctrls.hidden = !this._musicName;
    const lbl = this.$('#musicstartlbl');
    if (lbl) lbl.textContent = mmss(this._musicStart || 0);
  }

  /** Genera música ambiental sintética (cicla entre estilos) y la usa como banda sonora. */
  async _generateMusic() {
    const keys = this._flightModel ? ['flight', ...Object.keys(STYLES)] : Object.keys(STYLES);
    this._genIdx = ((this._genIdx ?? -1) + 1) % keys.length;
    const style = keys[this._genIdx];
    const gen = this.$('#musicgen');
    if (gen) { gen.disabled = true; gen.textContent = '⏳ ' + t('hud.music.generating'); }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this._musicAC = this._musicAC || new AC();
      const dur = Math.min(120, Math.max(20, this._clock?.dur || 60));
      const buf = style === 'flight'
        ? await generateFlightMusic(this._musicAC.sampleRate, this._flightModel, Math.min(150, this._clock?.dur || 60))
        : await generateAmbient(this._musicAC.sampleRate, dur, style);
      this._music = null; this._musicGen = true; this._musicStart = 0;
      this._musicName = style === 'flight' ? t('hud.music.style.flight') : t('hud.music.ambient') + ' · ' + t('hud.music.style.' + style);
      this._musicBuf = buf;
      this._musicPeaks = this._computePeaks(buf);
      this._musicNorm = this._computeNorm(buf);
    } catch (e) { console.error(e); }
    if (gen) { gen.disabled = false; gen.textContent = '✨ ' + t('hud.music.generate'); }
    this._refreshMusic(); this._drawWaveform(); this._syncMusic();
  }

  /** Decodifica el archivo de música para la previsualización (Web Audio). */
  async _decodeMusic() {
    if (!this._music) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this._musicAC = this._musicAC || new AC();
      this._musicBuf = await this._musicAC.decodeAudioData(await this._music.arrayBuffer());
      this._musicPeaks = this._computePeaks(this._musicBuf);
      this._musicNorm = this._computeNorm(this._musicBuf);
    } catch { this._musicBuf = null; this._musicPeaks = null; }
    this._refreshMusic();
    this._drawWaveform();
    this._syncMusic();
  }

  /** Detiene la música de previsualización, si sonaba. */
  _musicStop() {
    if (this._musicSrc) { try { this._musicSrc.stop(); } catch {} try { this._musicSrc.disconnect(); } catch {} this._musicSrc = null; }
  }

  /** Alinea la música con el reloj: suena en play (con loop y velocidad), para en pausa/seek. */
  _syncMusic() {
    const c = this._clock;
    if (!c || !this._musicBuf) { this._musicStop(); return; }
    this._musicStop();
    if (!c.playing) return;
    const ac = this._musicAC;
    if (ac.state === 'suspended') ac.resume?.();
    const src = ac.createBufferSource(); src.buffer = this._musicBuf; src.loop = true;
    src.playbackRate.value = c.speed || 1;
    const g = ac.createGain(), vol = this._musicVolEff(), now = ac.currentTime;
    g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(vol, now + 0.4); // fundido de entrada
    src.connect(g); g.connect(ac.destination);
    const dur = this._musicBuf.duration;
    const off = ((((this._musicStart || 0) + (c.t || 0)) % dur) + dur) % dur; // trim + posición del reloj
    src.start(0, off);
    this._musicSrc = src; this._musicGain = g;
  }

  /** Exporta el vídeo con el HUD quemado (graba en tiempo real → descarga .webm). */
  async _exportVideo() {
    if (this._exporting) return;
    if (!this._video || !this._hud) return;
    this._exporting = true;
    this._clock?.pause();
    const ov = this._exportOverlay();
    const ctrl = new AbortController();
    ov.cancelBtn.onclick = () => ctrl.abort();
    try {
      const blob = await exportHudVideo({ video: this._video, draw: this._hud, cfg: this._cfg(), musicBuffer: this._musicBuf, musicVolume: this._musicVolEff(), musicStart: this._musicStart || 0, vertical: this._vertical, fx: this._fxKey || 'none', onProgress: ov.set, signal: ctrl.signal });
      const ext = (blob.type || '').includes('mp4') ? 'mp4' : 'webm';
      downloadBlob('vuelo-hud.' + ext, blob);
      ov.done();
      await new Promise((r) => setTimeout(r, 1400));
    } catch (e) {
      if (e.name !== 'AbortError') { console.error(e); ov.fail(e.message); await new Promise((r) => setTimeout(r, 2600)); }
    } finally {
      this._exporting = false;
      ov.close();
    }
  }

  /** Crea el overlay de progreso de exportación en el shadow. */
  _exportOverlay() {
    const el = document.createElement('div');
    el.className = 'export-ov';
    el.innerHTML = `
      <div class="export-card">
        <div class="export-title" id="ex-title">${t('hud.exporting')}</div>
        <div class="export-track"><div class="export-fill" id="ex-fill"></div></div>
        <div class="export-pct" id="ex-pct">0%</div>
        <div class="export-note">${t('hud.export.note')}</div>
        <button class="export-cancel" id="ex-cancel" type="button">${t('hud.export.cancel')}</button>
      </div>`;
    this.shadowRoot.appendChild(el);
    const fill = el.querySelector('#ex-fill'), pct = el.querySelector('#ex-pct'), title = el.querySelector('#ex-title');
    return {
      set: (p) => { const v = Math.round(p * 100); fill.style.width = v + '%'; pct.textContent = v + '%'; },
      done: () => { title.textContent = t('hud.export.done'); fill.style.width = '100%'; pct.textContent = '100%'; },
      fail: (m) => { title.textContent = '⚠️ ' + (m || ''); },
      cancelBtn: el.querySelector('#ex-cancel'),
      close: () => el.remove(),
    };
  }

  _applyBig() {
    const pip = this.$('#pip'), btn = this.$('#expand');
    if (!pip) return;
    pip.classList.toggle('big', this._big);
    this.classList.toggle('big', this._big); // activa el backdrop desenfocado
    if (btn) { btn.textContent = this._big ? '⤡' : '⤢'; btn.setAttribute('aria-label', t(this._big ? 'player.collapse' : 'player.expand')); }
    requestAnimationFrame(() => this._drawHud()); // redibuja el HUD al nuevo tamaño
  }

  /** Pinta el HUD sobre el vídeo (si hay miniatura y HUD configurado). */
  _drawHud() {
    const canvas = this.$('#hud'), pip = this.$('#pip');
    if (!canvas || !this._hud || !this._clock || !pip || !pip.classList.contains('on')) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = pip.clientWidth, h = pip.clientHeight;
    if (!w || !h) return;
    if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    // en la previsualización pausada mostramos el HUD completo (la intro solo en reproducción)
    this._hud(ctx, this._clock.t, w, h, { ...this._cfg(), intro: !!this._clock.playing });
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

/* maniobras: leyenda con iconos + línea de tiempo con eje */
.mnv-legend { display: flex; flex-wrap: wrap; gap: 16px 26px; margin-bottom: 22px; }
.mnv-leg { display: flex; align-items: center; gap: 12px; }
.mnv-ic { width: 34px; height: 34px; padding: 7px; border-radius: 10px; flex: none; box-sizing: border-box;
  color: var(--c); background: color-mix(in srgb, var(--c) 16%, transparent); fill: none; stroke: var(--c); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.mnv-leg-txt { display: flex; flex-direction: column; line-height: 1.25; }
.mnv-leg-txt strong { font-size: 14.5px; font-weight: 700; color: var(--color-text); }
.mnv-leg-txt span { font-size: 12px; color: var(--color-text-muted); font-variant-numeric: tabular-nums; }
.mnv-track { position: relative; height: 30px; border-radius: 9px; background: color-mix(in srgb, var(--color-text) 7%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-text) 6%, transparent); }
.mnv-seg { position: absolute; top: 3px; bottom: 3px; margin: 0 1px; border-radius: 6px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--c) 88%, white 12%), var(--c));
  box-shadow: inset 0 1px 0 rgba(255,255,255,.22), 0 1px 3px color-mix(in srgb, var(--c) 40%, transparent); transition: filter .12s; }
.mnv-seg:hover { filter: brightness(1.16) saturate(1.12); transform: scaleY(1.12); }
.mnv-seg.mnv-dim { opacity: .32; filter: saturate(.55); }
/* tooltip del tramo */
.mnv-tip {
  position: absolute; bottom: calc(100% + 12px); transform: translateX(-50%); z-index: 6; pointer-events: none;
  min-width: 180px; padding: 12px 14px; border-radius: 13px; background: var(--color-surface-solid);
  border: 1px solid var(--color-divider); box-shadow: var(--shadow-lg);
}
.mnv-tip[hidden] { display: none; }
.mnv-tip::after { content: ""; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border: 7px solid transparent; border-top-color: var(--color-surface-solid); }
.mnv-tip-h { display: flex; align-items: center; gap: 9px; font-weight: 700; font-size: 14px; color: var(--color-text); margin-bottom: 9px; padding-bottom: 9px; border-bottom: 1px solid color-mix(in srgb, var(--color-divider) 60%, transparent); }
.mnv-tip-ic { width: 22px; height: 22px; padding: 4px; border-radius: 7px; box-sizing: border-box; flex: none; color: var(--c); background: color-mix(in srgb, var(--c) 18%, transparent); fill: none; stroke: var(--c); stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.mnv-tip-row { display: flex; justify-content: space-between; gap: 20px; font-size: 12.5px; padding: 2.5px 0; }
.mnv-tip-row span { color: var(--color-text-muted); }
.mnv-tip-row b { color: var(--color-text); font-variant-numeric: tabular-nums; }

/* score de pilotaje: anillo + barras + consejos */
.pscore { display: flex; align-items: center; gap: 34px; flex-wrap: wrap; }
.pscore-ring { position: relative; width: 132px; height: 132px; flex: none; }
.pscore-ring svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.pr-bg { fill: none; stroke: color-mix(in srgb, var(--color-text) 10%, transparent); stroke-width: 10; }
.pr-fg { fill: none; stroke-width: 10; stroke-linecap: round; }
.pscore-num { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.pscore-num strong { font-size: 40px; font-weight: 800; color: var(--color-text); line-height: 1; }
.pscore-num span { font-size: 11px; color: var(--color-text-muted); margin-top: 3px; text-transform: uppercase; letter-spacing: .08em; }
.pscore-bars { flex: 1; min-width: 260px; display: flex; flex-direction: column; gap: 13px; }
.pbar { display: grid; grid-template-columns: 84px 1fr 32px; align-items: center; gap: 13px; }
.pbar-l { font-size: 13.5px; font-weight: 600; color: var(--color-text-muted); }
.pbar-t { height: 9px; border-radius: 100px; background: color-mix(in srgb, var(--color-text) 9%, transparent); overflow: hidden; }
.pbar-f { height: 100%; border-radius: 100px; }
.pbar-v { font-size: 14.5px; font-weight: 700; color: var(--color-text); text-align: right; font-variant-numeric: tabular-nums; }
.pscore-tips { margin-top: 22px; display: flex; flex-direction: column; gap: 12px; }
.mnv-axis { position: relative; height: 16px; margin-top: 8px; }
.mnv-tick { position: absolute; transform: translateX(-50%); font-size: 11px; color: var(--color-text-muted); font-variant-numeric: tabular-nums; white-space: nowrap; }
.mnv-tick:first-child { transform: translateX(0); }
.mnv-tick:last-child { transform: translateX(-100%); }
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
__req("js/components/ui/flight-3d/flight-3d.js");
__req("js/components/ui/export-bar/export-bar.js");
__req("js/components/ui/image-lightbox/image-lightbox.js");
__req("js/components/ui/flight-player/flight-player.js");
__req("js/components/ui/reading-nav/reading-nav.js");
const { PlayerClock } = __req("js/core/player-clock.js");
const { reveal } = __req("js/core/reveal.js");
const { createHud } = __req("js/hud.js");
const { detectHighlights } = __req("js/highlights.js");
const { detectManeuvers, MANEUVER_TYPES, MANEUVER_COLOR, MANEUVER_ICON } = __req("js/maneuvers.js");
const { computePilotScore } = __req("js/pilot-score.js");
const { sunTimes, inGolden } = __req("js/sun-times.js");
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
        ${this._route3dTpl()}
        ${this._sectionChart('alt', 'c-alt', `<div class="legend"><span><span class="sw" style="background:var(--c-blue)"></span>${t('alt.series')}</span></div>`)}
        ${this._terrainTpl()}
        ${this._dynamicsTpl()}
        ${this._maneuversTpl()}
        ${this._pilotScoreTpl()}
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

  /** Sección de reconstrucción 3D navegable del vuelo. */
  _route3dTpl() {
    return `
      <section class="blk">
        <div class="eyebrow">${escapeHtml(t('v3d.eyebrow'))}</div>
        <h2>${escapeHtml(t('v3d.title'))}</h2>
        <p class="sub">${escapeHtml(t('v3d.sub'))}</p>
        <div class="card"><flight-3d id="v3d"></flight-3d></div>
      </section>`;
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

  _maneuversTpl() {
    this._mnv = detectManeuvers(this.model);
    const { segments, summary } = this._mnv;
    if (!segments.length) return '';
    const dur = this.model.meta.dur || 1;
    const mmss = (x) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`;
    const durBy = {}; for (const s of segments) durBy[s.type] = (durBy[s.type] || 0) + (s.t1 - s.t0);
    const icon = (ty) => `<svg viewBox="0 0 24 24" class="mnv-ic" aria-hidden="true"><path d="${MANEUVER_ICON[ty]}"/></svg>`;
    const legend = MANEUVER_TYPES.filter((ty) => summary[ty]).map((ty) => `
      <div class="mnv-leg" style="--c:${MANEUVER_COLOR[ty]}">
        ${icon(ty)}
        <div class="mnv-leg-txt"><strong>${summary[ty]} ${escapeHtml(t('mnv.' + ty + (summary[ty] > 1 ? '.pl' : '')))}</strong><span>${Math.round(durBy[ty] / dur * 100)}% ${escapeHtml(t('mnv.oftime'))}</span></div>
      </div>`).join('');
    const bands = segments.map((s, i) =>
      `<div class="mnv-seg" data-i="${i}" style="left:${(s.t0 / dur * 100).toFixed(2)}%;width:${((s.t1 - s.t0) / dur * 100).toFixed(2)}%;--c:${MANEUVER_COLOR[s.type]}"></div>`).join('');
    let axis = '';
    for (let m = 0; m <= dur; m += 60) axis += `<span class="mnv-tick" style="left:${(m / dur * 100).toFixed(2)}%">${mmss(m)}</span>`;
    return `
      <section class="blk">
        <div class="eyebrow">${escapeHtml(t('mnv.eyebrow'))}</div>
        <h2>${escapeHtml(t('mnv.title'))}</h2>
        <p class="sub">${escapeHtml(t('mnv.sub'))}</p>
        <div class="card">
          <div class="mnv-legend">${legend}</div>
          <div class="mnv-track">${bands}<div class="mnv-tip" id="mnvtip" hidden></div></div>
          <div class="mnv-axis">${axis}</div>
        </div>
      </section>`;
  }

  /** HTML del tooltip de un tramo de maniobra. */
  _mnvTipHtml(s) {
    const mmss = (x) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`;
    const rows = [`<div class="mnv-tip-row"><span>${escapeHtml(t('mnv.dur'))}</span><b>${Math.round(s.t1 - s.t0)} s</b></div>`,
      `<div class="mnv-tip-row"><span>${escapeHtml(t('mnv.avgspd'))}</span><b>${Math.round(s.avgHs * 3.6)} km/h</b></div>`];
    if (s.maxRel != null) rows.push(`<div class="mnv-tip-row"><span>${escapeHtml(t('mnv.alt'))}</span><b>${Math.round(s.minRel)}–${Math.round(s.maxRel)} m</b></div>`);
    if (s.turnDeg) rows.push(`<div class="mnv-tip-row"><span>${escapeHtml(t('mnv.turnacc'))}</span><b>${s.turnDeg}°</b></div>`);
    return `<div class="mnv-tip-h" style="--c:${MANEUVER_COLOR[s.type]}"><svg viewBox="0 0 24 24" class="mnv-tip-ic" aria-hidden="true"><path d="${MANEUVER_ICON[s.type]}"/></svg>${escapeHtml(t('mnv.' + s.type))} · ${mmss(s.t0)}–${mmss(s.t1)}</div>${rows.join('')}`;
  }

  /** Cablea el tooltip y el resaltado al pasar por los tramos de la línea de tiempo. */
  _wireManeuvers() {
    const track = this.$('.mnv-track'), tip = this.$('#mnvtip');
    if (!track || !tip || !this._mnv) return;
    const segs = this.$$('.mnv-seg');
    const move = (e) => { const r = track.getBoundingClientRect(); tip.style.left = Math.max(0, Math.min(r.width, e.clientX - r.left)) + 'px'; };
    for (const el of segs) {
      this.on(el, 'mouseenter', () => { const s = this._mnv.segments[+el.dataset.i]; if (!s) return; tip.innerHTML = this._mnvTipHtml(s); tip.hidden = false; segs.forEach((x) => x.classList.toggle('mnv-dim', x !== el)); });
      this.on(el, 'mousemove', move);
      this.on(el, 'mouseleave', () => { tip.hidden = true; segs.forEach((x) => x.classList.remove('mnv-dim')); });
    }
  }

  _pilotScoreTpl() {
    const ps = computePilotScore(this.model);
    if (!ps) return '';
    const col = (v) => (v >= 80 ? '#37cf6b' : v >= 60 ? '#5b9dff' : '#ffb43d');
    const R = 52, C = 2 * Math.PI * R, off = (C * (1 - ps.overall / 100)).toFixed(1);
    const bars = [['smoothness', ps.aspects.smoothness], ['altitude', ps.aspects.altitude], ['turns', ps.aspects.turns], ['gimbal', ps.aspects.gimbal]].map(([k, v]) =>
      `<div class="pbar"><span class="pbar-l">${escapeHtml(t('ps.' + k))}</span><div class="pbar-t"><div class="pbar-f" style="width:${v}%;background:${col(v)}"></div></div><span class="pbar-v">${v}</span></div>`).join('');
    const tips = ps.tips.map((tp) =>
      `<app-callout ${tp.level === 'warn' ? 'variant="warn"' : 'variant="good"'} title="${escapeHtml(t(tp.level === 'warn' ? 'ps.improve' : 'ps.strong'))}">${escapeHtml(t('ps.tip.' + tp.key + '.' + tp.level))}</app-callout>`).join('');
    return `
      <section class="blk">
        <div class="eyebrow">${escapeHtml(t('ps.eyebrow'))}</div>
        <h2>${escapeHtml(t('ps.title'))}</h2>
        <p class="sub">${escapeHtml(t('ps.sub'))}</p>
        <div class="card">
          <div class="pscore">
            <div class="pscore-ring">
              <svg viewBox="0 0 120 120"><circle class="pr-bg" cx="60" cy="60" r="${R}"/><circle class="pr-fg" cx="60" cy="60" r="${R}" style="stroke:${col(ps.overall)};stroke-dasharray:${C.toFixed(1)};stroke-dashoffset:${off}"/></svg>
              <div class="pscore-num"><strong>${ps.overall}</strong><span>${escapeHtml(t('ps.of100'))}</span></div>
            </div>
            <div class="pscore-bars">${bars}</div>
          </div>
          ${tips ? `<div class="pscore-tips">${tips}</div>` : ''}
        </div>
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
    // golden hour del lugar y día + si el vuelo cazó la buena luz
    const times = sunTimes(start, clat, clon);
    const hhmm = (min) => min == null ? '—' : `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(Math.round(min % 60)).padStart(2, '0')}`;
    const g = inGolden(start.getHours() * 60 + start.getMinutes(), times);
    const ranges = [
      times.goldenMorning && t('solar.golden.morning', { a: hhmm(times.goldenMorning[0]), b: hhmm(times.goldenMorning[1]) }),
      times.goldenEvening && t('solar.golden.evening', { a: hhmm(times.goldenEvening[0]), b: hhmm(times.goldenEvening[1]) }),
    ].filter(Boolean).join(' · ');
    const next = times.goldenEvening ? hhmm(times.goldenEvening[0]) : (times.goldenMorning ? hhmm(times.goldenMorning[0]) : '—');
    const body = g ? t('solar.golden.in', { when: t('solar.golden.when.' + g), ranges }) : t('solar.golden.out', { ranges, next });
    const golden = ranges ? `<app-callout ${g ? 'variant="good"' : ''} title="${escapeHtml(t('solar.golden.t'))}">${escapeHtml(body)}</app-callout>` : '';
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
        ${golden}
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
    for (const s of S) { s.hskmh = s.hs != null ? s.hs * 3.6 : null; if (s.far == null) s.far = s.lat != null ? hav(tk0, tk1, s.lat, s.lon) : null; }

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
    this.$('#v3d').flight = { model: this.model };
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
    this._wireManeuvers();
  }

  /** El player (barra + miniatura) solo aparece al llegar a la sección del mapa. */
  _setupPlayerVisibility() {
    this._playerIO?.disconnect(); this._playerIO = null;
    const anchor = this.$('#map');
    if (!anchor || !this._player) return;
    this._player.classList.add('away'); // arranca oculto
    if (!('IntersectionObserver' in window)) { this._player.classList.remove('away'); return; }
    this._playerIO = new IntersectionObserver((es) => {
      if (this._player._exporting) return; // no ocultar mientras se exporta el vídeo
      const vis = es.some((e) => e.isIntersecting);
      // al salir el mapa de pantalla: no dejamos el vídeo flotando ni el scroll bloqueado
      if (!vis) { if (this._clock?.playing) this._clock.pause(); this._player.collapse?.(); }
      this._player.classList.toggle('away', !vis);
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
    const hl = detectHighlights(this.model);
    this._player.highlights = hl; // momentos destacados en la barra
    this._player.maneuvers = (this._mnv || detectManeuvers(this.model)).segments; // bandas de maniobra
    this._player.flightModel = this.model; // sonificación reactiva de la música
    const accent = getComputedStyle(this).getPropertyValue('--color-accent').trim() || '#5b9dff';
    // HUD de telemetría sobre el vídeo (con el color de acento del tema)
    this._player.hud = this._video
      ? createHud(this.model, { accent, title: this.assets?.title, place: this.assets?.place }).draw
      : null;
    // datos de la portada del trailer
    const hv = (type) => hl.find((h) => h.type === type)?.value || 0;
    this._player.intro = {
      kicker: t('intro.kicker'),
      title: this.assets?.title || 'DJI',
      place: this.assets?.place || '',
      accent,
      track: this.model.track || [],
      stats: [
        { label: t('intro.dist'), value: Math.round(hv('dist')) + ' m' },
        { label: t('intro.alt'), value: Math.round(hv('alt')) + ' m' },
        { label: t('intro.spd'), value: Math.round(hv('speed') * 3.6) + ' km/h' },
      ],
    };
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

__m["js/flyover-export.js"] = function (__x, __req) {
// Grabador MP4 para el sobrevuelo 3D: codifica una secuencia de fotogramas con
// WebCodecs (H.264) y los empaqueta con el muxer MP4 estándar (mismo que el
// export del vídeo del dron), así el resultado es compatible con iOS/QuickTime.
// El componente 3D renderiza cada frame a un <canvas> y lo pasa a `encode()`.
//
// Dos grabadores con la misma interfaz (encode/finish/cancel/frames):
//  - createMp4Recorder(): acumula el MP4 en RAM (Blobs) y lo devuelve en finish().
//  - createMp4StreamRecorder(): transmite el MP4 a disco (File System Access) según
//    codifica; en RAM solo queda metadata, así un vuelo largo a 1080p no agota la
//    memoria de la pestaña. finish() no devuelve nada: el fichero ya está en disco.

const { createMp4, createMp4Stream } = __req("js/mp4-muxer.js");

/** @returns {boolean} true si el navegador puede generar el vídeo (WebCodecs). */
function canExportVideo() {
  return typeof window !== 'undefined' && 'VideoEncoder' in window && 'VideoFrame' in window;
}

/**
 * Crea y configura el VideoEncoder H.264, redirigiendo cada chunk (y la primera
 * `decoderConfig.description`) a `muxer`. Compartido por ambos grabadores.
 * @param {{width:number,height:number,fps:number,bitrate?:number,muxer:{setDescription:Function,addSample:Function}}} o
 * @returns {{encoder:VideoEncoder, getErr:()=>Error|null}}
 */
// Máximo de fotogramas admitidos en la cola de entrada del codificador. Cada
// VideoFrame encolado retiene una imagen respaldada en GPU/RAM, así que un tope
// bajo mantiene el pico de memoria plano aunque el vuelo dure minutos.
const MAX_QUEUE = 2;

/**
 * Contrapresión REAL: espera hasta que la cola del codificador baje del tope,
 * cediendo el hilo entre comprobaciones. Sin esto, un bucle que codifica más
 * rápido de lo que el encoder consume acumula VideoFrames sin límite y agota la
 * memoria de vídeo (peta la pestaña y arrastra al equipo). Prefiere el evento
 * `dequeue` si el navegador lo expone; si no, sondea con un respiro corto.
 * @param {VideoEncoder} encoder
 */
async function awaitQueue(encoder) {
  while (encoder.encodeQueueSize > MAX_QUEUE) {
    await new Promise((r) => {
      let done = false;
      const finish = () => { if (done) return; done = true; encoder.removeEventListener?.('dequeue', finish); clearTimeout(tid); r(); };
      encoder.addEventListener?.('dequeue', finish, { once: true });
      const tid = setTimeout(finish, 8); // red de seguridad si no hay evento `dequeue`
    });
  }
}

function buildEncoder({ width, height, fps, bitrate, muxer }) {
  let needDesc = true, err = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => {
      if (needDesc && meta?.decoderConfig?.description) { muxer.setDescription(meta.decoderConfig.description); needDesc = false; }
      const buf = new Uint8Array(chunk.byteLength); chunk.copyTo(buf);
      muxer.addSample(buf, chunk.type === 'key', chunk.timestamp);
    },
    error: (e) => { err = e; },
  });
  encoder.configure({
    codec: height > 1080 ? 'avc1.640033' : 'avc1.640028',
    width, height, bitrate: bitrate || 10_000_000,
    // modo 'quality': el codificador analiza y reparte los bits con más criterio
    // (a diferencia de 'realtime', pensado para videollamadas), así el mismo aspecto
    // cabe en menos bitrate → menos peso a igual calidad. La contrapresión de la cola
    // absorbe que codifique algo más lento.
    framerate: fps, latencyMode: 'quality', avc: { format: 'avc' },
  });
  return { encoder, getErr: () => err };
}

/**
 * Grabador incremental que acumula el MP4 en RAM. Los timestamps se derivan de
 * `fps` (frames a ritmo constante), independientes de lo que tarde en codificar
 * cada uno. finish() devuelve el MP4 como Blob.
 * @param {{width:number, height:number, fps?:number, bitrate?:number}} o
 */
function createMp4Recorder({ width, height, fps = 30, bitrate }) {
  if (!canExportVideo()) throw new Error('WebCodecs no disponible');
  const W = width, H = height;
  const muxer = createMp4({ width: W, height: H });
  const { encoder, getErr } = buildEncoder({ width: W, height: H, fps, bitrate, muxer });
  const usPerFrame = 1e6 / fps;
  let idx = 0;

  return {
    /** Codifica un fotograma desde `canvas`. Un keyframe cada ~2 s. */
    async encode(canvas) {
      if (getErr()) throw getErr();
      const frame = new VideoFrame(canvas, { timestamp: Math.round(idx * usPerFrame), duration: Math.round(usPerFrame) });
      encoder.encode(frame, { keyFrame: idx % (fps * 2) === 0 });
      frame.close(); idx++;
      // contrapresión real: no seguir hasta que el codificador drene la cola
      await awaitQueue(encoder);
    },
    /** Vacía el codificador y devuelve el MP4 como Blob. */
    async finish() { await encoder.flush(); encoder.close(); if (getErr()) throw getErr(); return muxer.finalize(); },
    /** Aborta sin producir salida. */
    cancel() { try { encoder.close(); } catch { /* ya cerrado */ } },
    get frames() { return idx; },
  };
}

/**
 * Grabador incremental que transmite el MP4 a disco según codifica, vía un `sink`
 * (envoltorio sobre un FileSystemWritableFileStream). En RAM solo queda metadata
 * de las muestras, así que el pico de memoria es plano sin importar la duración.
 * Aplica backpressure: espera a que se vacíe la escritura a disco entre frames.
 * finish() no devuelve nada — al terminar, el fichero ya está escrito y cerrado.
 * @param {{width:number, height:number, fps?:number, bitrate?:number, sink:{write:Function,close:Function}}} o
 */
function createMp4StreamRecorder({ width, height, fps = 30, bitrate, sink }) {
  if (!canExportVideo()) throw new Error('WebCodecs no disponible');
  const W = width, H = height;
  const muxer = createMp4Stream({ width: W, height: H, sink });
  const { encoder, getErr } = buildEncoder({ width: W, height: H, fps, bitrate, muxer });
  const usPerFrame = 1e6 / fps;
  let idx = 0;

  return {
    /** Codifica un fotograma desde `canvas` y espera a que la escritura a disco
     *  alcance (backpressure), para no acumular buffers pendientes en RAM. */
    async encode(canvas) {
      if (getErr()) throw getErr();
      const frame = new VideoFrame(canvas, { timestamp: Math.round(idx * usPerFrame), duration: Math.round(usPerFrame) });
      encoder.encode(frame, { keyFrame: idx % (fps * 2) === 0 });
      frame.close(); idx++;
      await awaitQueue(encoder); // contrapresión de la cola de entrada del codificador
      await muxer.drain();       // vacía la cola de escritura a disco antes del siguiente frame
    },
    /** Vacía el codificador, escribe el moov y cierra el fichero en disco. */
    async finish() { await encoder.flush(); encoder.close(); if (getErr()) throw getErr(); await muxer.finalize(); },
    /** Aborta: cierra el codificador y el fichero (queda incompleto, a descartar). */
    async cancel() { try { encoder.close(); } catch { /* ya cerrado */ } try { await muxer.abort(); } catch { /* ignora */ } },
    get frames() { return idx; },
  };
}

Object.assign(__x, { canExportVideo, createMp4Recorder, createMp4StreamRecorder });

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
  // solo muestras con GPS válido: así el despegue/aterrizaje y el punto más lejano
  // se sitúan sobre coordenadas reales (nunca en los frames previos al fix GPS).
  const S = d.series.filter(x => x.lat != null), tk = d.takeoff;
  if (!S.length) return [];
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

/** Extrae las primeras coordenadas (lat, lon) con GPS válido del texto de un .SRT.
 *  Salta el sentinela `0.000000, 0.000000` que DJI escribe antes del fix GPS
 *  (si no, el nombre del lugar se geocodifica en el golfo de Guinea). */
function firstCoords(srtText) {
  const re = /latitude:\s*(-?[\d.]+)\]\s*\[longitude:\s*(-?[\d.]+)/g;
  let m;
  while ((m = re.exec(srtText)) !== null) {
    const la = parseFloat(m[1]), lo = parseFloat(m[2]);
    if (la !== 0 || lo !== 0) return [la, lo];
  }
  return null;
}

Object.assign(__x, { reverseGeocode, firstCoords });

};

__m["js/highlights.js"] = function (__x, __req) {
// Detección de "momentos destacados" del vuelo: analiza la serie y extrae los
// instantes clave (máxima velocidad, altura, distancia, ascenso/descenso y giro
// más cerrado). Base para marcar el timeline y montar un auto-trailer.

const { hav } = __req("js/srt.js");

const bearing = (la1, lo1, la2, lo2) => {
  const p1 = la1 * Math.PI / 180, p2 = la2 * Math.PI / 180, dl = (lo2 - lo1) * Math.PI / 180;
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
};

/** Prioridad al desempatar momentos próximos o recortar el número. */
const PRIO = { speed: 5, alt: 4, dist: 3, climb: 2, descent: 2, turn: 1 };

/**
 * @param {object} model modelo del vuelo (series, takeoff)
 * @param {{minGap?:number, max?:number}} [opts] minGap = seg mínimos entre momentos; max = nº máximo
 * @returns {Array<{t:number, type:'speed'|'alt'|'dist'|'climb'|'descent'|'turn', value:number, unit:string}>}
 */
function detectHighlights(model, opts = {}) {
  const S = model.series || [], tk = model.takeoff || [];
  if (S.length < 2) return [];
  const minGap = opts.minGap ?? 2.5, max = opts.max ?? 7;
  const minTurnSpeed = opts.minTurnSpeed ?? 3; // m/s: por debajo, el rumbo GPS es ruido

  let iSpd = -1, vSpd = -1, iAlt = -1, vAlt = -1, iDist = -1, vDist = -1;
  let iClimb = -1, vClimb = -1, iDesc = -1, vDesc = Infinity, iTurn = -1, vTurn = -1;
  for (let i = 0; i < S.length; i++) {
    const s = S[i];
    if (s.hs != null && s.hs > vSpd) { vSpd = s.hs; iSpd = i; }
    if (s.rel != null && s.rel > vAlt) { vAlt = s.rel; iAlt = i; }
    if (s.lat != null && tk.length) { const d = hav(tk[0], tk[1], s.lat, s.lon); if (d > vDist) { vDist = d; iDist = i; } }
    if (s.vs != null && s.vs > vClimb) { vClimb = s.vs; iClimb = i; }
    if (s.vs != null && s.vs < vDesc) { vDesc = s.vs; iDesc = i; }
    if (i >= 2 && S[i - 2].lat != null && S[i - 1].lat != null && s.lat != null && (s.hs ?? 0) >= minTurnSpeed) {
      const h1 = bearing(S[i - 2].lat, S[i - 2].lon, S[i - 1].lat, S[i - 1].lon);
      const h2 = bearing(S[i - 1].lat, S[i - 1].lon, s.lat, s.lon);
      const dt = s.t - S[i - 2].t;
      if (dt > 0) { const rate = Math.abs(((h2 - h1 + 540) % 360) - 180) / dt; if (rate > vTurn) { vTurn = rate; iTurn = i; } }
    }
  }

  const cand = [];
  const add = (i, type, value, unit) => { if (i >= 0 && isFinite(value)) cand.push({ t: S[i].t, type, value, unit }); };
  add(iSpd, 'speed', vSpd, 'm/s');
  add(iAlt, 'alt', vAlt, 'm');
  add(iDist, 'dist', vDist, 'm');
  if (vClimb > 0.5) add(iClimb, 'climb', vClimb, 'm/s');
  if (vDesc < -0.5) add(iDesc, 'descent', vDesc, 'm/s');
  if (vTurn > 5) add(iTurn, 'turn', vTurn, '°/s');

  // fusionar los momentos demasiado próximos, quedándose con el de mayor prioridad
  cand.sort((a, b) => a.t - b.t);
  const out = [];
  for (const c of cand) {
    const near = out.find((o) => Math.abs(o.t - c.t) < minGap);
    if (!near) out.push(c);
    else if (PRIO[c.type] > PRIO[near.type]) Object.assign(near, c);
  }
  // recortar al máximo por prioridad y devolver en orden temporal
  if (out.length > max) { out.sort((a, b) => PRIO[b.type] - PRIO[a.type]); out.length = max; }
  return out.sort((a, b) => a.t - b.t);
}

/**
 * Ventanas de tiempo para el auto-trailer: un tramo alrededor de cada momento,
 * recortado al vuelo y fusionando los que se solapan.
 * @param {Array<{t:number}>} highlights
 * @param {number} dur duración del vuelo (s)
 * @param {{pre?:number, post?:number}} [opts] segundos antes/después de cada momento
 * @returns {Array<{start:number, end:number}>}
 */
function buildTrailerSegments(highlights, dur, opts = {}) {
  if (!highlights?.length || !dur) return [];
  let pre = opts.pre ?? 1.5, post = opts.post ?? 2.5;
  if (opts.target) { const per = opts.target / highlights.length; pre = per * 0.4; post = per * 0.6; } // reparte la duración objetivo
  const wins = highlights
    .map((h) => ({ start: Math.max(0, h.t - pre), end: Math.min(dur, h.t + post) }))
    .filter((w) => w.end > w.start)
    .sort((a, b) => a.start - b.start);
  const merged = [];
  for (const w of wins) {
    const last = merged[merged.length - 1];
    if (last && w.start <= last.end) last.end = Math.max(last.end, w.end);
    else merged.push({ ...w });
  }
  return merged;
}

/**
 * Opacidad del fundido a negro para un instante de un tramo del trailer: 1 en
 * los extremos (negro), 0 en el interior. Da la transición entre cortes y la
 * apertura/cierre del trailer.
 * @param {number} ct instante actual dentro del tramo (s)
 * @param {number} start inicio del tramo (s)
 * @param {number} end fin del tramo (s)
 * @param {number} xf duración del fundido (s)
 * @returns {number} 0..1
 */
function trailerFade(ct, start, end, xf) {
  const w = Math.min(xf, (end - start) / 2);
  if (w <= 0) return 0;
  const a = Math.max(1 - (ct - start) / w, 1 - (end - ct) / w);
  return Math.max(0, Math.min(1, a));
}


Object.assign(__x, { detectHighlights, buildTrailerSegments, trailerFade });

};

__m["js/hud-export.js"] = function (__x, __req) {
// Exporta el vídeo con el HUD "quemado" encima, 100% en el navegador.
// Compone cada fotograma (vídeo + HUD) en un canvas. Preferimos WebCodecs +
// muxer MP4 estándar (compatible con iOS, con audio AAC si el navegador y el
// vídeo lo permiten); si no hay WebCodecs, se usa MediaRecorder (webm/mp4
// fragmentado, con audio). Siempre en tiempo real.

const { createMp4 } = __req("js/mp4-muxer.js");
const { trailerFade } = __req("js/highlights.js");
const { drawTitleCard } = __req("js/title-card.js");
const { fxFilter, paintFxLayers } = __req("js/video-fx.js");

/** Dimensiones de salida (pares): 16:9 escalado a maxHeight, o 9:16 vertical para redes. */
function outDims(video, maxHeight, vertical) {
  const vw = video.videoWidth, vh = video.videoHeight;
  if (vertical) { const H = Math.round(Math.min(1920, vh) / 2) * 2; return { W: Math.round(H * 9 / 16 / 2) * 2, H }; }
  const scale = Math.min(1, maxHeight / vh);
  return { W: Math.round(vw * scale / 2) * 2, H: Math.round(vh * scale / 2) * 2 };
}

/** Pinta el vídeo (16:9 o recorte central en vertical) con el efecto: filtro CSS + segunda capa. */
function paintVideo(ctx, video, W, H, vertical, fx) {
  const f = fxFilter(fx);
  if (f) ctx.filter = f;
  if (vertical) { const dw = H * (video.videoWidth / video.videoHeight); ctx.drawImage(video, (W - dw) / 2, 0, dw, H); }
  else ctx.drawImage(video, 0, 0, W, H);
  if (f) ctx.filter = 'none';
  paintFxLayers(ctx, W, H, fx);
}

/** Elige el mejor método disponible. */
async function exportHudVideo(opts) {
  if ('VideoEncoder' in window && 'VideoFrame' in window) {
    try { return await exportViaWebCodecs(opts); }
    catch (e) { if (e.name === 'AbortError') throw e; console.warn('WebCodecs falló, se usa MediaRecorder.', e); }
  }
  return exportViaMediaRecorder(opts);
}

/** WebCodecs → MP4 estándar (H.264 + AAC). Compatible con iPhone/QuickTime. */
async function exportViaWebCodecs({ video, draw, cfg, musicBuffer, musicVolume = 1, musicStart = 0, vertical = false, fx = '', maxHeight = 1080, onProgress, signal }) {
  const vw = video.videoWidth, vh = video.videoHeight;
  if (!vw || !vh) throw new Error('El vídeo aún no está listo.');
  const { W, H } = outDims(video, maxHeight, vertical);
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d', { alpha: false });
  const muxer = createMp4({ width: W, height: H });

  let needDesc = true, encErr = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => {
      if (needDesc && meta?.decoderConfig?.description) { muxer.setDescription(meta.decoderConfig.description); needDesc = false; }
      const buf = new Uint8Array(chunk.byteLength); chunk.copyTo(buf);
      muxer.addSample(buf, chunk.type === 'key', chunk.timestamp);
    },
    error: (e) => { encErr = e; },
  });
  encoder.configure({ codec: H > 1080 ? 'avc1.640033' : 'avc1.640028', width: W, height: H, bitrate: 12_000_000, framerate: 30, latencyMode: 'realtime', avc: { format: 'avc' } });

  await seek(video, 0);
  // Con música propia usamos ese audio; si no, capturamos el audio del vídeo.
  const audioCap = musicBuffer ? null : await setupAudioCapture(video, muxer).catch(() => null);
  let running = true, cancelled = false, idx = 0;
  const dur = video.duration || 0;
  const finish = () => { running = false; try { video.pause(); } catch {} };
  if (signal) signal.addEventListener('abort', () => { cancelled = true; finish(); }, { once: true });

  const useRVFC = 'requestVideoFrameCallback' in video;
  await video.play();
  await new Promise((resolve) => {
    const onFrame = () => {
      if (!running || encErr) { resolve(); return; }
      paintVideo(ctx, video, W, H, vertical, fx);
      draw(ctx, video.currentTime, W, H, cfg);
      const frame = new VideoFrame(canvas, { timestamp: Math.round(video.currentTime * 1e6) });
      encoder.encode(frame, { keyFrame: idx % 60 === 0 });
      frame.close(); idx++;
      onProgress?.(dur ? Math.min(1, video.currentTime / dur) : 0);
      useRVFC ? video.requestVideoFrameCallback(onFrame) : requestAnimationFrame(onFrame);
    };
    video.onended = () => { finish(); resolve(); };
    useRVFC ? video.requestVideoFrameCallback(onFrame) : requestAnimationFrame(onFrame);
  });
  if (audioCap) await audioCap.stop();
  if (musicBuffer) await encodeMusic(muxer, musicBuffer, video.duration || 0, { volume: musicVolume, start: musicStart }).catch(() => {});
  await encoder.flush(); encoder.close();
  if (cancelled) throw new DOMException('Exportación cancelada', 'AbortError');
  if (encErr) throw encErr;
  return muxer.finalize();
}

/**
 * Codifica un AudioBuffer (música cargada o generada) a AAC como pista del
 * muxer: en bucle si es más corto que el vídeo, recortado a su duración, con
 * volumen, punto de inicio (trim) y fundidos de entrada/salida. Offline.
 * @param {{volume?:number, start?:number}} [opts]
 * @returns {Promise<boolean>} true si añadió audio
 */
async function encodeMusic(muxer, audioBuf, durationSec, opts = {}) {
  if (!('AudioEncoder' in window) || !durationSec || !audioBuf) return false;
  const vol = opts.volume ?? 1;
  const SR = audioBuf.sampleRate, CH = Math.min(2, audioBuf.numberOfChannels), srcLen = audioBuf.length;
  const srcCh = []; for (let c = 0; c < CH; c++) srcCh.push(audioBuf.getChannelData(c % audioBuf.numberOfChannels));
  const startS = Math.round((opts.start ?? 0) * SR);   // punto de inicio de la canción
  const totalFrames = Math.ceil(durationSec * SR);
  const fade = Math.min(SR * 0.8, totalFrames * 0.15) | 0; // fundidos ~0,8 s

  let encErr = null, needCfg = true;
  const enc = new AudioEncoder({
    output: (chunk, meta) => {
      if (needCfg && meta?.decoderConfig?.description) { muxer.setAudioConfig({ sampleRate: SR, channels: CH, description: meta.decoderConfig.description }); needCfg = false; }
      if (needCfg) return;
      const b = new Uint8Array(chunk.byteLength); chunk.copyTo(b); muxer.addAudioSample(b, chunk.timestamp);
    },
    error: (e) => { encErr = e; },
  });
  enc.configure({ codec: 'mp4a.40.2', sampleRate: SR, numberOfChannels: CH, bitrate: 192_000, aac: { format: 'aac' } });

  const N = 1024;
  for (let off = 0; off < totalFrames && !encErr; off += N) {
    const n = Math.min(N, totalFrames - off);
    const data = new Float32Array(N * CH); // el resto del último bloque queda en silencio
    for (let c = 0; c < CH; c++) {
      const src = srcCh[c];
      for (let j = 0; j < n; j++) {
        const gi = off + j, rem = totalFrames - gi;
        let v = src[(startS + gi) % srcLen] * vol; // trim + bucle + volumen
        if (gi < fade) v *= gi / fade;             // fundido de entrada
        if (rem < fade) v *= rem / fade;           // fundido de salida
        data[c * N + j] = v;
      }
    }
    const ad = new AudioData({ format: 'f32-planar', sampleRate: SR, numberOfChannels: CH, numberOfFrames: N, timestamp: Math.round(off / SR * 1e6), data });
    enc.encode(ad); ad.close();
  }
  try { await enc.flush(); } catch {} try { enc.close(); } catch {}
  return !needCfg && !encErr;
}

/**
 * Captura el audio del vídeo y lo codifica a AAC en paralelo, alimentando el
 * muxer. Best-effort: devuelve null si el navegador no soporta la captura o el
 * códec, o si el vídeo no tiene pista de audio.
 * @returns {Promise<{stop:()=>Promise<void>}|null>}
 */
async function setupAudioCapture(video, muxer) {
  if (!('AudioEncoder' in window) || typeof MediaStreamTrackProcessor === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!video._hudAudioCtx) { video._hudAudioCtx = new AC(); video._hudAudioSrc = video._hudAudioCtx.createMediaElementSource(video); }
  const actx = video._hudAudioCtx;
  await actx.resume?.();
  const dest = actx.createMediaStreamDestination();
  video._hudAudioSrc.connect(dest);
  const track = dest.stream.getAudioTracks()[0];
  if (!track) { try { video._hudAudioSrc.disconnect(dest); } catch {} return null; }

  let sr = 0, ch = 0, needCfg = true, encErr = null;
  const enc = new AudioEncoder({
    output: (chunk, meta) => {
      if (needCfg && meta?.decoderConfig?.description) { muxer.setAudioConfig({ sampleRate: sr, channels: ch, description: meta.decoderConfig.description }); needCfg = false; }
      if (needCfg) return; // sin AudioSpecificConfig no podemos muxear
      const buf = new Uint8Array(chunk.byteLength); chunk.copyTo(buf);
      muxer.addAudioSample(buf, chunk.timestamp);
    },
    error: (e) => { encErr = e; },
  });

  const reader = track && new MediaStreamTrackProcessor({ track }).readable.getReader();
  let configured = false;
  const pump = (async () => {
    try {
      while (!encErr) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!configured) {
          sr = value.sampleRate; ch = value.numberOfChannels;
          enc.configure({ codec: 'mp4a.40.2', sampleRate: sr, numberOfChannels: ch, bitrate: 128_000, aac: { format: 'aac' } });
          configured = true;
        }
        if (enc.state === 'configured') enc.encode(value);
        value.close();
      }
    } catch { /* fin de la captura */ }
  })();

  return {
    async stop() {
      try { await reader.cancel(); } catch {}
      await pump;
      try { if (enc.state === 'configured') await enc.flush(); } catch {}
      try { enc.close(); } catch {}
      try { video._hudAudioSrc.disconnect(dest); } catch {}
    },
  };
}

/** Efectos de transición disponibles entre tramos del trailer (fundido, zoom, desenfoque). */
const TRANSITIONS = ['black', 'zoom', 'blur'];

/**
 * Compone un frame aplicando el efecto de transición. `src` es el frame ya
 * pintado (vídeo + HUD); `t` es 0 (sin efecto) → 1 (extremo del corte).
 * @param {CanvasRenderingContext2D} ctx destino
 * @param {CanvasImageSource} src frame base
 * @param {boolean} entering true si entra el clip, false si sale
 */
function applyTransition(ctx, src, W, H, effect, t, entering) {
  if (t <= 0) { ctx.drawImage(src, 0, 0, W, H); return; }
  switch (effect) {
    case 'white':
      ctx.drawImage(src, 0, 0, W, H);
      ctx.fillStyle = `rgba(255,255,255,${t})`; ctx.fillRect(0, 0, W, H); break;
    case 'zoom': {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      const s = 1 + 0.22 * t, dw = W * s, dh = H * s;
      ctx.drawImage(src, (W - dw) / 2, (H - dh) / 2, dw, dh);
      ctx.fillStyle = `rgba(0,0,0,${t})`; ctx.fillRect(0, 0, W, H); break;
    }
    case 'slide': {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      ctx.drawImage(src, (entering ? W * t : -W * t), 0, W, H); break;
    }
    case 'blur': {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      ctx.filter = `blur(${Math.round(t * 16)}px)`; ctx.drawImage(src, 0, 0, W, H); ctx.filter = 'none';
      ctx.fillStyle = `rgba(0,0,0,${t * 0.5})`; ctx.fillRect(0, 0, W, H); break;
    }
    case 'black': default:
      ctx.drawImage(src, 0, 0, W, H);
      ctx.fillStyle = `rgba(0,0,0,${t})`; ctx.fillRect(0, 0, W, H); break;
  }
}

/**
 * Genera un auto-trailer: concatena varios tramos del vídeo (segments) con el
 * HUD quemado y música, en un único MP4 con timestamps continuos. Requiere
 * WebCodecs. El HUD se pinta con el tiempo real de cada tramo; la música cubre
 * la duración total del trailer.
 * @returns {Promise<Blob>}
 */
async function exportTrailer({ video, draw, cfg, segments, transitions, xf = 0.4, intro, introDur = 3.8, musicBuffer, musicVolume = 1, musicStart = 0, vertical = false, fx = '', maxHeight = 1080, onProgress, signal }) {
  if (!('VideoEncoder' in window) || !('VideoFrame' in window)) throw new Error('Tu navegador no soporta la generación del trailer.');
  if (!segments?.length) throw new Error('No hay momentos para el trailer.');
  const vw = video.videoWidth, vh = video.videoHeight;
  if (!vw || !vh) throw new Error('El vídeo aún no está listo.');
  const { W, H } = outDims(video, maxHeight, vertical);
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d', { alpha: false });
  const muxer = createMp4({ width: W, height: H });

  let needDesc = true, encErr = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => {
      if (needDesc && meta?.decoderConfig?.description) { muxer.setDescription(meta.decoderConfig.description); needDesc = false; }
      const buf = new Uint8Array(chunk.byteLength); chunk.copyTo(buf);
      muxer.addSample(buf, chunk.type === 'key', chunk.timestamp);
    },
    error: (e) => { encErr = e; },
  });
  encoder.configure({ codec: H > 1080 ? 'avc1.640033' : 'avc1.640028', width: W, height: H, bitrate: 12_000_000, framerate: 30, latencyMode: 'realtime', avc: { format: 'avc' } });

  const introSec = intro ? introDur : 0;
  const total = introSec + (segments.reduce((s, g) => s + (g.end - g.start), 0)) || 1;
  const pool = transitions === undefined ? TRANSITIONS : transitions;
  const XF = pool.length ? xf : 0; // sin efectos permitidos → corte seco
  // un efecto aleatorio por corte (compartido entre la salida de un tramo y la entrada del siguiente)
  const effects = Array.from({ length: segments.length + 1 }, () => (pool.length ? pool[(Math.random() * pool.length) | 0] : 'black'));
  const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H;
  const tctx = tmp.getContext('2d', { alpha: false });
  let cancelled = false;
  if (signal) signal.addEventListener('abort', () => { cancelled = true; try { video.pause(); } catch {} }, { once: true });
  const useRVFC = 'requestVideoFrameCallback' in video;
  video.muted = true;
  let outSec = 0, idx = 0;

  // portada animada al inicio (sin vídeo; se genera cuadro a cuadro)
  if (intro) {
    const nF = Math.max(1, Math.round(introDur * 30));
    for (let f = 0; f < nF && !cancelled && !encErr; f++) {
      drawTitleCard(ctx, W, H, f / 30, introDur, intro);
      const frame = new VideoFrame(canvas, { timestamp: Math.round(f / 30 * 1e6) });
      encoder.encode(frame, { keyFrame: f === 0 || f % 60 === 0 }); frame.close(); idx++;
      onProgress?.(Math.min(1, (f / 30) / total));
      if (f % 6 === 0) await new Promise((r) => requestAnimationFrame(r)); // ceder el hilo
    }
    outSec += introDur;
  }

  for (let si = 0; si < segments.length; si++) {
    if (cancelled || encErr) break;
    const seg = segments[si], entryFx = effects[si], exitFx = effects[si + 1];
    await seek(video, seg.start);
    await video.play().catch(() => {});
    let firstOfSeg = true;
    await new Promise((resolve) => {
      const onFrame = () => {
        if (cancelled || encErr) { resolve(); return; }
        const ct = video.currentTime;
        if (ct >= seg.end - 0.001) { resolve(); return; }
        const t = trailerFade(ct, seg.start, seg.end, XF);
        if (t <= 0) {
          paintVideo(ctx, video, W, H, vertical, fx); draw(ctx, ct, W, H, cfg);
        } else {
          paintVideo(tctx, video, W, H, vertical, fx); draw(tctx, ct, W, H, cfg);
          const entering = (ct - seg.start) <= (seg.end - ct);
          applyTransition(ctx, tmp, W, H, entering ? entryFx : exitFx, t, entering);
        }
        const ts = Math.max(0, Math.round((outSec + (ct - seg.start)) * 1e6));
        const frame = new VideoFrame(canvas, { timestamp: ts });
        encoder.encode(frame, { keyFrame: firstOfSeg || idx % 60 === 0 });
        frame.close(); idx++; firstOfSeg = false;
        onProgress?.(Math.min(1, (outSec + (ct - seg.start)) / total));
        useRVFC ? video.requestVideoFrameCallback(onFrame) : requestAnimationFrame(onFrame);
      };
      video.onended = () => resolve();
      useRVFC ? video.requestVideoFrameCallback(onFrame) : requestAnimationFrame(onFrame);
    });
    try { video.pause(); } catch {}
    outSec += (seg.end - seg.start);
  }

  if (musicBuffer) await encodeMusic(muxer, musicBuffer, outSec, { volume: musicVolume, start: musicStart }).catch(() => {});
  await encoder.flush(); encoder.close();
  if (cancelled) throw new DOMException('Generación cancelada', 'AbortError');
  if (encErr) throw encErr;
  return muxer.finalize();
}

/** Espera a que el vídeo termine de buscar a t. */
function seek(video, t) {
  return new Promise((res) => {
    const on = () => { video.removeEventListener('seeked', on); res(); };
    video.addEventListener('seeked', on);
    video.currentTime = t;
  });
}

/**
 * @param {object} o
 * @param {HTMLVideoElement} o.video  vídeo fuente (a resolución nativa)
 * @param {(ctx:CanvasRenderingContext2D,t:number,w:number,h:number,cfg:object)=>void} o.draw  HUD
 * @param {object} o.cfg  config del HUD (gauges/unidades)
 * @param {number} [o.maxHeight=1080]  alto máximo del export
 * @param {number} [o.fps=30]
 * @param {(p:number)=>void} [o.onProgress]  0..1
 * @param {AbortSignal} [o.signal]
 * @returns {Promise<Blob>}
 */
async function exportViaMediaRecorder({ video, draw, cfg, musicBuffer, musicVolume = 1, musicStart = 0, vertical = false, fx = '', maxHeight = 1080, fps = 30, onProgress, signal }) {
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
    throw new Error('Tu navegador no soporta la grabación de canvas.');
  }
  const vw = video.videoWidth, vh = video.videoHeight;
  if (!vw || !vh) throw new Error('El vídeo aún no está listo.');
  const { W, H } = outDims(video, maxHeight, vertical);
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d', { alpha: false });
  const stream = canvas.captureStream(fps);

  // Pista de audio: música propia (en bucle) o el audio del vídeo (silencioso).
  let startMusic = null, musicCtx = null;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC && musicBuffer) {
      musicCtx = new AC();
      const src = musicCtx.createBufferSource(); src.buffer = musicBuffer; src.loop = true;
      const g = musicCtx.createGain();
      const dest = musicCtx.createMediaStreamDestination();
      src.connect(g); g.connect(dest);
      const at = dest.stream.getAudioTracks()[0];
      if (at) {
        stream.addTrack(at);
        const dur = video.duration || 0, fd = 0.8;
        startMusic = () => {
          try {
            const t0 = musicCtx.currentTime;
            g.gain.setValueAtTime(0, t0);
            g.gain.linearRampToValueAtTime(musicVolume, t0 + fd);        // fundido de entrada
            if (dur > 2 * fd) { g.gain.setValueAtTime(musicVolume, t0 + dur - fd); g.gain.linearRampToValueAtTime(0, t0 + dur); } // fundido de salida
            src.start(0, musicStart || 0);
          } catch {}
        };
      }
    } else if (AC) {
      if (!video._hudAudioCtx) { video._hudAudioCtx = new AC(); video._hudAudioSrc = video._hudAudioCtx.createMediaElementSource(video); }
      await video._hudAudioCtx.resume?.();
      const dest = video._hudAudioCtx.createMediaStreamDestination();
      video._hudAudioSrc.connect(dest);
      const at = dest.stream.getAudioTracks()[0];
      if (at) { stream.addTrack(at); video.muted = false; }
    }
  } catch { /* seguimos sin audio */ }

  // MP4 (H.264 + AAC) si el navegador lo soporta; si no, webm. La extensión sale de blob.type.
  const mime = [
    'video/mp4;codecs=avc1.640028,mp4a.40.2',
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ].find((m) => MediaRecorder.isTypeSupported(m)) || 'video/webm';
  const chunks = [];
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 10_000_000 });
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const stopped = new Promise((res) => { rec.onstop = res; });

  const dur = video.duration || 0;
  await seek(video, 0);

  let running = true, cancelled = false;
  const finish = () => { if (!running) return; running = false; try { rec.stop(); } catch {} try { video.pause(); } catch {} };
  if (signal) signal.addEventListener('abort', () => { cancelled = true; finish(); }, { once: true });

  const drawFrame = () => {
    paintVideo(ctx, video, W, H, vertical, fx);
    draw(ctx, video.currentTime, W, H, cfg);
    onProgress?.(dur ? Math.min(1, video.currentTime / dur) : 0);
  };
  const useRVFC = 'requestVideoFrameCallback' in video;
  const loop = () => { if (!running) return; drawFrame(); useRVFC ? video.requestVideoFrameCallback(loop) : requestAnimationFrame(loop); };

  rec.start(1000);
  video.onended = finish;
  await video.play();
  startMusic?.();
  loop();

  await stopped;
  video.muted = true;
  try { video._hudAudioSrc?.disconnect(); } catch {}
  try { musicCtx?.close(); } catch {}
  if (cancelled) throw new DOMException('Exportación cancelada', 'AbortError');
  return new Blob(chunks, { type: mime });
}

Object.assign(__x, { exportHudVideo, TRANSITIONS, applyTransition, exportTrailer });

};

__m["js/hud.js"] = function (__x, __req) {
// Motor de HUD: dibuja gauges de telemetría sobre un canvas, sincronizados por
// tiempo con la serie del vuelo. Independiente del render: dado t, pinta el frame.
// Convención de overlay de vídeo: texto blanco + scrim oscuro (legible sobre
// cualquier metraje), con el color de acento para los realces.

const { hav } = __req("js/srt.js");

const bearing = (la1, lo1, la2, lo2) => {
  const p1 = la1 * Math.PI / 180, p2 = la2 * Math.PI / 180, dl = (lo2 - lo1) * Math.PI / 180;
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
};

const CARD = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];

/** Config por defecto del HUD (qué gauges y unidades). */
const DEFAULT_CFG = { units: 'metric', theme: 'modern', gauges: { speed: 1, alt: 1, dist: 1, vspeed: 0, heading: 1, clock: 1, minimap: 1, progress: 1, watermark: 0, location: 0 } };
/** Orden de los gauges para el panel de ajustes. */
const GAUGE_KEYS = ['speed', 'alt', 'dist', 'vspeed', 'heading', 'clock', 'minimap', 'progress', 'watermark', 'location'];

const CONV = {
  metric: { spd: (v) => v * 3.6, spdU: 'km/h', len: (v) => v, lenU: 'm', vs: (v) => v, vsU: 'm/s' },
  imperial: { spd: (v) => v * 2.23694, spdU: 'mph', len: (v) => v * 3.28084, lenU: 'ft', vs: (v) => v * 3.28084, vsU: 'ft/s' },
};

/**
 * @param {object} model modelo del vuelo (series, meta, takeoff)
 * @param {{accent?:string}} [opts]
 * @returns {{draw:(ctx:CanvasRenderingContext2D, t:number, w:number, h:number)=>void}}
 */
function createHud(model, opts = {}) {
  const S = model.series, tk = model.takeoff;
  // máximos reales del vuelo → escala estable de los diales de aviación
  const maxHs = S.reduce((m, p) => Math.max(m, p.hs || 0), 1);
  const maxRel = S.reduce((m, p) => Math.max(m, p.rel || 0), 1);
  const accent = opts.accent || '#5b9dff';
  const title = opts.title || '';
  const place = opts.place || '';
  // track para el mini-mapa (bounding box en proyección equirectangular sencilla)
  const T = (model.track || []).filter((p) => p && p[0] != null);
  const lats = T.map((p) => p[0]), lons = T.map((p) => p[1]);
  const mm = T.length ? {
    la0: Math.min(...lats), la1: Math.max(...lats), lo0: Math.min(...lons), lo1: Math.max(...lons),
    cosLat: Math.cos((Math.min(...lats) + Math.max(...lats)) / 2 * Math.PI / 180) || 1,
  } : null;

  const sample = (t) => {
    let i = 1;
    while (i < S.length && S[i].t < t) i++;
    const a = S[i - 1], b = S[Math.min(i, S.length - 1)];
    const span = (b.t - a.t) || 1, f = Math.max(0, Math.min(1, (t - a.t) / span));
    const lerp = (k) => (a[k] != null && b[k] != null) ? a[k] + (b[k] - a[k]) * f : (a[k] ?? b[k]);
    const lat = lerp('lat'), lon = lerp('lon');
    // alabeo estimado (giro coordinado): tan(bank) = v·ω/g
    let bank = 0;
    const j0 = Math.max(1, i - 1), j1 = Math.min(i + 1, S.length - 1);
    if (S[j0 - 1]?.lat != null && S[j0].lat != null && S[j1 - 1]?.lat != null && S[j1]?.lat != null && S[j1].t > S[j0].t) {
      const h1 = bearing(S[j0 - 1].lat, S[j0 - 1].lon, S[j0].lat, S[j0].lon);
      const h2 = bearing(S[j1 - 1].lat, S[j1 - 1].lon, S[j1].lat, S[j1].lon);
      const dh = ((h2 - h1 + 540) % 360) - 180;
      const om = dh * Math.PI / 180 / (S[j1].t - S[j0].t);
      bank = Math.max(-40, Math.min(40, Math.atan((lerp('hs') || 0) * om / 9.81) * 180 / Math.PI));
    }
    return {
      hs: lerp('hs'), rel: lerp('rel'), vs: lerp('vs'), lat, lon, pitch: lerp('pitch'), bank,
      far: (lat != null) ? hav(tk[0], tk[1], lat, lon) : null,
      heading: (a.lat != null && b.lat != null) ? bearing(a.lat, a.lon, b.lat, b.lon) : null,
    };
  };

  const roundRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  };

  const FONT = '-apple-system, "SF Pro Display", system-ui, sans-serif';
  const ls = (ctx, v) => { if ('letterSpacing' in ctx) ctx.letterSpacing = `${v}px`; };

  const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return Number.isNaN(n) ? hex : `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };

  // valor de cada métrica para la mini-gráfica (sparkline)
  const METRIC_VAL = {
    speed: (r) => r.hs,
    alt: (r) => r.rel,
    dist: (r) => (r.lat != null ? hav(tk[0], tk[1], r.lat, r.lon) : null),
    vspeed: (r) => r.vs,
  };

  // mini-gráfica de la evolución reciente de una métrica (últimos ~22 s)
  const spark = (ctx, x, y, w, h, tNow, key) => {
    const fn = METRIC_VAL[key]; if (!fn) return;
    const t0 = Math.max(0, tNow - 22), pts = [];
    for (let i = 0; i < S.length; i++) { const st = S[i].t; if (st < t0) continue; if (st > tNow) break; const v = fn(S[i]); if (v != null && isFinite(v)) pts.push([st, v]); }
    if (pts.length < 2) return;
    let mn = Infinity, mx = -Infinity; for (const p of pts) { if (p[1] < mn) mn = p[1]; if (p[1] > mx) mx = p[1]; }
    if (mx - mn < 1e-6) mx = mn + 1; const pad = (mx - mn) * 0.2; mn -= pad; mx += pad;
    const span = (tNow - t0) || 1, PX = (tt) => x + (tt - t0) / span * w, PY = (v) => y + h - (v - mn) / (mx - mn) * h;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(PX(pts[0][0]), y + h);
    for (const p of pts) ctx.lineTo(PX(p[0]), PY(p[1]));
    ctx.lineTo(PX(pts[pts.length - 1][0]), y + h); ctx.closePath();
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, hexA(accent, 0.32)); g.addColorStop(1, hexA(accent, 0));
    ctx.fillStyle = g; ctx.fill();
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(PX(p[0]), PY(p[1])) : ctx.moveTo(PX(p[0]), PY(p[1]))));
    ctx.strokeStyle = accent; ctx.lineWidth = Math.max(1, h * 0.1); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.shadowColor = hexA(accent, 0.6); ctx.shadowBlur = h * 0.25; ctx.stroke(); ctx.shadowBlur = 0;
    const last = pts[pts.length - 1];
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(PX(last[0]), PY(last[1]), Math.max(1.5, h * 0.12), 0, 7); ctx.fill();
    ctx.restore();
  };

  // panel de cristal (glassmorphism) para el grupo de métricas
  const glassPanel = (ctx, x, y, w2, h2, r) => {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = r * 1.1; ctx.shadowOffsetY = r * 0.25;
    roundRect(ctx, x, y, w2, h2, r);
    const g = ctx.createLinearGradient(0, y, 0, y + h2); g.addColorStop(0, 'rgba(22,26,34,.42)'); g.addColorStop(1, 'rgba(8,10,14,.52)');
    ctx.fillStyle = g; ctx.fill();
    ctx.shadowColor = 'transparent';
    roundRect(ctx, x, y, w2, h2, r); ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1; ctx.stroke();
    roundRect(ctx, x, y, w2, h2, r); ctx.clip();
    const gg = ctx.createLinearGradient(0, y, 0, y + h2 * 0.5); gg.addColorStop(0, 'rgba(255,255,255,.09)'); gg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gg; ctx.fillRect(x, y, w2, h2 * 0.5);
    ctx.restore();
  };

  // iconos de línea por métrica
  const metricIcon = (ctx, key, cx, cy, r, color) => {
    ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = Math.max(1, r * 0.18); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (key === 'speed') { ctx.beginPath(); ctx.arc(cx, cy + r * 0.18, r * 0.68, Math.PI * 0.88, Math.PI * 2.12); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx, cy + r * 0.18); ctx.lineTo(cx + r * 0.42, cy - r * 0.28); ctx.stroke(); }
    else if (key === 'alt') { ctx.beginPath(); ctx.moveTo(cx - r * 0.7, cy + r * 0.5); ctx.lineTo(cx - r * 0.12, cy - r * 0.42); ctx.lineTo(cx + r * 0.18, cy + r * 0.02); ctx.lineTo(cx + r * 0.42, cy - r * 0.24); ctx.lineTo(cx + r * 0.74, cy + r * 0.5); ctx.stroke(); }
    else if (key === 'dist') { ctx.beginPath(); ctx.moveTo(cx - r * 0.55, cy); ctx.lineTo(cx + r * 0.55, cy); ctx.stroke(); ctx.beginPath(); ctx.arc(cx - r * 0.58, cy, r * 0.2, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(cx + r * 0.58, cy, r * 0.2, 0, 7); ctx.fill(); }
    else if (key === 'vspeed') { ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.62); ctx.lineTo(cx, cy + r * 0.62); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx - r * 0.3, cy - r * 0.28); ctx.lineTo(cx, cy - r * 0.62); ctx.lineTo(cx + r * 0.3, cy - r * 0.28); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx - r * 0.3, cy + r * 0.28); ctx.lineTo(cx, cy + r * 0.62); ctx.lineTo(cx + r * 0.3, cy + r * 0.28); ctx.stroke(); }
    ctx.restore();
  };

  // celda de métrica premium: icono + etiqueta, valor y mini-gráfica (escala con la altura del panel)
  const metricCell = (ctx, x, y, cw, ch, m, sep, tNow) => {
    const cx = x + cw / 2;
    if (sep) { ctx.strokeStyle = 'rgba(255,255,255,.09)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y + ch * 0.24); ctx.lineTo(x, y + ch * 0.76); ctx.stroke(); }
    // etiqueta con icono, centradas como grupo
    ctx.textBaseline = 'middle'; ctx.font = `700 ${ch * 0.15}px ${FONT}`; ls(ctx, ch * 0.02);
    const lblW = ctx.measureText(m.label).width, icoR = ch * 0.105, gap = ch * 0.07, grpW = icoR * 2 + gap + lblW, gx = cx - grpW / 2, lblY = y + ch * 0.2;
    metricIcon(ctx, m.key, gx + icoR, lblY, icoR, accent);
    ctx.fillStyle = accent; ctx.textAlign = 'left'; ctx.fillText(m.label, gx + icoR * 2 + gap, lblY); ls(ctx, 0);
    // valor + unidad
    const vFont = `500 ${ch * 0.42}px ${FONT}`, uFont = `500 ${ch * 0.18}px ${FONT}`, vy = y + ch * 0.62;
    ctx.font = vFont; ls(ctx, -ch * 0.006); const vw = ctx.measureText(m.value).width; ls(ctx, 0);
    ctx.font = uFont; const uw = ctx.measureText(m.unit).width, g2 = ch * 0.05, sx = cx - (vw + g2 + uw) / 2;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.font = vFont; ls(ctx, -ch * 0.006); ctx.fillStyle = '#fff'; ctx.fillText(m.value, sx, vy); ls(ctx, 0);
    ctx.font = uFont; ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillText(m.unit, sx + vw + g2, vy);
    // mini-gráfica en vivo
    spark(ctx, x + cw * 0.16, y + ch * 0.74, cw * 0.68, ch * 0.18, tNow, m.key);
  };

  const compass = (ctx, cx, cy, R, heading) => {
    ctx.save();
    ctx.lineCap = 'round';
    // disco de cristal (radial) + doble anillo
    ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = R * 0.16; ctx.shadowOffsetY = R * 0.04;
    const disc = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R);
    disc.addColorStop(0, 'rgba(30,36,48,.42)'); disc.addColorStop(1, 'rgba(8,10,16,.5)');
    ctx.fillStyle = disc; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = R * 0.02; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = R * 0.012; ctx.beginPath(); ctx.arc(cx, cy, R * 0.82, 0, 7); ctx.stroke();
    // marcas cada 30° (mayores en los cardinales)
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6, major = i % 3 === 0, r1 = R * 0.9, r2 = major ? R * 0.74 : R * 0.82;
      ctx.strokeStyle = `rgba(255,255,255,${major ? .6 : .28})`; ctx.lineWidth = R * (major ? 0.028 : 0.016);
      ctx.beginPath(); ctx.moveTo(cx + Math.sin(a) * r1, cy - Math.cos(a) * r1); ctx.lineTo(cx + Math.sin(a) * r2, cy - Math.cos(a) * r2); ctx.stroke();
    }
    // cardinales
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `700 ${R * 0.2}px ${FONT}`;
    ctx.fillStyle = accent; ctx.fillText('N', cx, cy - R * 0.6);
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.fillText('S', cx, cy + R * 0.6); ctx.fillText('E', cx + R * 0.6, cy); ctx.fillText('O', cx - R * 0.6, cy);
    // aguja bicolor con brillo
    const a = (heading || 0) * Math.PI / 180, sn = Math.sin(a), cs = Math.cos(a);
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = R * 0.05;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx - sn * R * 0.36, cy + cs * R * 0.36); ctx.stroke();
    ctx.shadowColor = hexA(accent, 0.7); ctx.shadowBlur = R * 0.14;
    ctx.strokeStyle = accent; ctx.lineWidth = R * 0.07;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + sn * R * 0.46, cy - cs * R * 0.46); ctx.stroke();
    ctx.shadowColor = 'transparent';
    const hub = ctx.createRadialGradient(cx - R * 0.02, cy - R * 0.02, R * 0.005, cx, cy, R * 0.09);
    hub.addColorStop(0, '#fff'); hub.addColorStop(1, hexA(accent, 0.9));
    ctx.fillStyle = hub; ctx.beginPath(); ctx.arc(cx, cy, R * 0.07, 0, 7); ctx.fill();
    ctx.restore();
  };

  // mini-mapa: trazado + despegue + posición actual, ajustado al rectángulo dado
  const minimap = (ctx, x, y, bw, bh, curLat, curLon) => {
    if (!mm) return;
    ctx.save();
    roundRect(ctx, x, y, bw, bh, bw * 0.06);
    ctx.fillStyle = 'rgba(10,12,18,.42)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = bw * 0.012; ctx.stroke();
    ctx.clip();
    const pad = 0.16;
    const spanLo = (mm.lo1 - mm.lo0) * mm.cosLat || 1e-6, spanLa = (mm.la1 - mm.la0) || 1e-6;
    const sc = Math.min(bw * (1 - pad) / spanLo, bh * (1 - pad) / spanLa);
    const cx = x + bw / 2, cy = y + bh / 2, mLo = (mm.lo0 + mm.lo1) / 2, mLa = (mm.la0 + mm.la1) / 2;
    const PX = (lo) => cx + (lo - mLo) * mm.cosLat * sc, PY = (la) => cy - (la - mLa) * sc;
    ctx.beginPath();
    T.forEach((p, i) => { const px = PX(p[1]), py = PY(p[0]); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = Math.max(1, bw * 0.016); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
    ctx.fillStyle = '#37cf6b'; ctx.beginPath(); ctx.arc(PX(tk[1]), PY(tk[0]), bw * 0.03, 0, 7); ctx.fill();
    if (curLat != null) {
      ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(PX(curLon), PY(curLat), bw * 0.045, 0, 7); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = bw * 0.016; ctx.stroke();
    }
    ctx.restore();
  };

  // ---- tema "instrumentos de aviación" ----
  const AMBER = '#ffb43d';
  // redondea a un máximo "bonito" (1/2/5 ×10ⁿ) para graduar los diales
  const niceMax = (v) => { if (v <= 0) return 1; const p = 10 ** Math.floor(Math.log10(v)); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; };

  // bisel metálico + filo brillante (aro del instrumento)
  const bezel = (ctx, cx, cy, R) => {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = R * 0.16; ctx.shadowOffsetY = R * 0.06;
    const g = ctx.createLinearGradient(cx, cy - R, cx, cy + R);
    g.addColorStop(0, '#676e7d'); g.addColorStop(.5, '#20242e'); g.addColorStop(1, '#090b10');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();
    ctx.restore();
    // reflejo torneado (sheen): luz arriba-izquierda, sombra abajo-derecha
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,.24)'; ctx.lineWidth = R * 0.05; ctx.beginPath(); ctx.arc(cx, cy, R * 0.955, Math.PI * 1.08, Math.PI * 1.62); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.arc(cx, cy, R * 0.955, Math.PI * 0.12, Math.PI * 0.6); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = R * 0.012; ctx.beginPath(); ctx.arc(cx, cy, R * 0.985, 0, 7); ctx.stroke();
  };

  // cara oscura abombada + viñeta (fondo de los diales)
  const instrBase = (ctx, cx, cy, R) => {
    bezel(ctx, cx, cy, R);
    const rf = R * 0.9;
    let f = ctx.createRadialGradient(cx - rf * 0.3, cy - rf * 0.35, rf * 0.1, cx, cy, rf);
    f.addColorStop(0, '#1b212c'); f.addColorStop(.7, '#0c0f15'); f.addColorStop(1, '#05070b');
    ctx.fillStyle = f; ctx.beginPath(); ctx.arc(cx, cy, rf, 0, 7); ctx.fill();
    let v = ctx.createRadialGradient(cx, cy, rf * 0.55, cx, cy, rf);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.5)');
    ctx.fillStyle = v; ctx.beginPath(); ctx.arc(cx, cy, rf, 0, 7); ctx.fill();
    // chaflán interior (bisel torneado): luz arriba, sombra abajo
    ctx.lineWidth = R * 0.02;
    ctx.strokeStyle = 'rgba(255,255,255,.26)'; ctx.beginPath(); ctx.arc(cx, cy, rf, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.arc(cx, cy, rf, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
  };

  // reflejo de cristal (se pinta al final, sobre el contenido)
  const glass = (ctx, cx, cy, R) => {
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.9, 0, 7); ctx.clip();
    const g = ctx.createLinearGradient(cx, cy - R, cx, cy + R * 0.15);
    g.addColorStop(0, 'rgba(255,255,255,.15)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, cy - R * 0.34, R * 0.72, R * 0.44, 0, 0, 7); ctx.fill();
    const sp = ctx.createRadialGradient(cx - R * 0.34, cy - R * 0.42, 0, cx - R * 0.34, cy - R * 0.42, R * 0.42);
    sp.addColorStop(0, 'rgba(255,255,255,.4)'); sp.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sp; ctx.beginPath(); ctx.arc(cx - R * 0.34, cy - R * 0.42, R * 0.42, 0, 7); ctx.fill();
    ctx.restore();
  };

  const dial = (ctx, cx, cy, R, value, unit, label, max, redline) => {
    const A0 = 135 * Math.PI / 180, SPAN = 270 * Math.PI / 180; // arco abierto abajo
    instrBase(ctx, cx, cy, R);
    ctx.save();
    // pista + arco de valor (con brillo)
    ctx.lineCap = 'round'; ctx.lineWidth = R * 0.05;
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.arc(cx, cy, R * 0.78, A0, A0 + SPAN); ctx.stroke();
    const frac = Math.max(0, Math.min(1, value / (max || 1)));
    ctx.strokeStyle = accent; ctx.shadowColor = accent; ctx.shadowBlur = R * 0.12;
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.78, A0, A0 + SPAN * frac); ctx.stroke();
    ctx.shadowColor = 'transparent';
    if (redline) { ctx.strokeStyle = '#ff4d4d'; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.arc(cx, cy, R * 0.78, A0 + SPAN * 0.9, A0 + SPAN); ctx.stroke(); ctx.lineCap = 'round'; }
    // graduaciones + números
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i <= 10; i++) {
      const a = A0 + SPAN * i / 10, major = i % 2 === 0, r1 = R * 0.68, r2 = major ? R * 0.56 : R * 0.62;
      ctx.strokeStyle = `rgba(255,255,255,${major ? .8 : .38})`; ctx.lineWidth = R * (major ? 0.028 : 0.015);
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); ctx.stroke();
      if (major) { ctx.fillStyle = 'rgba(255,255,255,.78)'; ctx.font = `600 ${R * 0.12}px ${FONT}`; ctx.fillText(`${Math.round(max * i / 10)}`, cx + Math.cos(a) * R * 0.42, cy + Math.sin(a) * R * 0.42); }
    }
    // marcas finas intermedias
    for (let i = 1; i < 20; i += 2) {
      const a = A0 + SPAN * i / 20;
      ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = R * 0.01;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * R * 0.68, cy + Math.sin(a) * R * 0.68); ctx.lineTo(cx + Math.cos(a) * R * 0.63, cy + Math.sin(a) * R * 0.63); ctx.stroke();
    }
    // aguja afilada + contrapeso
    const a = A0 + SPAN * frac;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = R * 0.04; ctx.shadowOffsetX = R * 0.015; ctx.shadowOffsetY = R * 0.015;
    ctx.fillStyle = accent; ctx.beginPath(); ctx.moveTo(-R * 0.14, R * 0.03); ctx.lineTo(R * 0.62, 0); ctx.lineTo(-R * 0.14, -R * 0.03); ctx.closePath(); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#c9ced8'; ctx.beginPath(); ctx.arc(-R * 0.14, 0, R * 0.045, 0, 7); ctx.fill();
    ctx.restore();
    // buje central (metálico)
    let hub = ctx.createRadialGradient(cx - R * 0.02, cy - R * 0.02, R * 0.005, cx, cy, R * 0.09);
    hub.addColorStop(0, '#eef1f6'); hub.addColorStop(1, '#444a56');
    ctx.fillStyle = hub; ctx.beginPath(); ctx.arc(cx, cy, R * 0.075, 0, 7); ctx.fill();
    // etiqueta arriba + lectura digital abajo
    ctx.fillStyle = accent; ctx.font = `700 ${R * 0.13}px ${FONT}`; ls(ctx, R * 0.02); ctx.fillText(label, cx, cy - R * 0.54); ls(ctx, 0);
    const vs = `${Math.round(value)}`;
    ctx.font = `600 ${R * 0.24}px ${FONT}`; const vw = ctx.measureText(vs).width;
    ctx.font = `600 ${R * 0.12}px ${FONT}`; const uw = ctx.measureText(unit).width;
    const pw = vw + uw + R * 0.28, py = cy + R * 0.5;
    roundRect(ctx, cx - pw / 2, py - R * 0.16, pw, R * 0.32, R * 0.06); ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff'; ctx.font = `600 ${R * 0.24}px ${FONT}`; ctx.fillText(vs, cx - pw / 2 + R * 0.1, py);
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.font = `600 ${R * 0.12}px ${FONT}`; ctx.fillText(unit, cx - pw / 2 + R * 0.1 + vw + R * 0.07, py);
    ctx.restore();
    glass(ctx, cx, cy, R);
  };

  const attitude = (ctx, cx, cy, R, pitch, roll) => {
    const ppd = R / 30; // píxeles por grado
    bezel(ctx, cx, cy, R);
    // horizonte (recortado al cristal, girado por alabeo)
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.9, 0, 7); ctx.clip();
    ctx.translate(cx, cy); ctx.rotate(-roll * Math.PI / 180);
    const hy = pitch * ppd;
    let sky = ctx.createLinearGradient(0, -2.4 * R, 0, hy);
    sky.addColorStop(0, '#0e3c74'); sky.addColorStop(1, '#5ba0da');
    ctx.fillStyle = sky; ctx.fillRect(-2 * R, -2.4 * R, 4 * R, 2.4 * R + hy);
    let gnd = ctx.createLinearGradient(0, hy, 0, 2.4 * R);
    gnd.addColorStop(0, '#9c7238'); gnd.addColorStop(1, '#3f2d12');
    ctx.fillStyle = gnd; ctx.fillRect(-2 * R, hy, 4 * R, 2.4 * R);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = R * 0.018; ctx.beginPath(); ctx.moveTo(-2 * R, hy); ctx.lineTo(2 * R, hy); ctx.stroke();
    // escalera de cabeceo
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineCap = 'round';
    for (const d of [-20, -15, -10, -5, 5, 10, 15, 20]) {
      const y = hy - d * ppd, major = d % 10 === 0, ww = major ? R * 0.3 : R * 0.15;
      ctx.strokeStyle = 'rgba(255,255,255,.88)'; ctx.lineWidth = R * 0.013;
      ctx.beginPath(); ctx.moveTo(-ww, y); ctx.lineTo(ww, y); ctx.stroke();
      if (major) { ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.font = `500 ${R * 0.1}px ${FONT}`; ctx.fillText(`${Math.abs(d)}`, -ww - R * 0.13, y); ctx.fillText(`${Math.abs(d)}`, ww + R * 0.13, y); }
    }
    ctx.restore();
    // escala de alabeo fija + puntero móvil
    ctx.save(); ctx.translate(cx, cy);
    for (const b of [-60, -45, -30, -20, -10, 0, 10, 20, 30, 45, 60]) {
      const a = (-90 + b) * Math.PI / 180, major = b % 30 === 0, r1 = R * 0.9, r2 = major ? R * 0.79 : R * 0.84;
      ctx.strokeStyle = 'rgba(255,255,255,.82)'; ctx.lineWidth = R * (major ? 0.02 : 0.012);
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.moveTo(0, -R * 0.79); ctx.lineTo(-R * 0.05, -R * 0.9); ctx.lineTo(R * 0.05, -R * 0.9); ctx.closePath(); ctx.fill();
    ctx.rotate(-roll * Math.PI / 180);
    ctx.fillStyle = AMBER; ctx.beginPath(); ctx.moveTo(0, -R * 0.77); ctx.lineTo(-R * 0.055, -R * 0.66); ctx.lineTo(R * 0.055, -R * 0.66); ctx.closePath(); ctx.fill();
    ctx.restore();
    // símbolo del avión (fijo, ámbar)
    ctx.save();
    ctx.strokeStyle = AMBER; ctx.lineWidth = R * 0.045; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - R * 0.42, cy); ctx.lineTo(cx - R * 0.16, cy); ctx.lineTo(cx - R * 0.16, cy + R * 0.09);
    ctx.moveTo(cx + R * 0.42, cy); ctx.lineTo(cx + R * 0.16, cy); ctx.lineTo(cx + R * 0.16, cy + R * 0.09);
    ctx.stroke();
    ctx.fillStyle = AMBER; ctx.beginPath(); ctx.arc(cx, cy, R * 0.03, 0, 7); ctx.fill();
    ctx.restore();
    // inclinómetro (bola de derrape) — vuelo coordinado → centrada
    ctx.save();
    const by = cy + R * 0.64;
    ctx.strokeStyle = 'rgba(255,255,255,.32)'; ctx.lineWidth = R * 0.1; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, by - R * 1.15, R * 1.25, Math.PI * 0.455, Math.PI * 0.545); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = R * 0.012;
    ctx.beginPath(); ctx.moveTo(cx - R * 0.08, by - R * 0.075); ctx.lineTo(cx - R * 0.08, by + R * 0.055); ctx.moveTo(cx + R * 0.08, by - R * 0.075); ctx.lineTo(cx + R * 0.08, by + R * 0.055); ctx.stroke();
    ctx.fillStyle = '#f4f6fa'; ctx.beginPath(); ctx.arc(cx, by, R * 0.05, 0, 7); ctx.fill();
    ctx.restore();
    glass(ctx, cx, cy, R);
  };

  // cinta de rumbo (ribbon) con marcas, cardinales e índice central
  const headingTape = (ctx, cx, cy, W, heading) => {
    const H = W * 0.14, x0 = cx - W / 2, y0 = cy - H / 2, ppd = W / 84;
    ctx.save();
    roundRect(ctx, x0, y0, W, H, H * 0.32);
    ctx.fillStyle = 'rgba(8,10,15,.72)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.save(); roundRect(ctx, x0, y0, W, H, H * 0.32); ctx.clip();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const start = Math.floor((heading - 45) / 5) * 5;
    for (let deg = start; deg <= heading + 45; deg += 5) {
      const x = cx + (deg - heading) * ppd, dd = ((deg % 360) + 360) % 360, major = dd % 10 === 0;
      ctx.strokeStyle = `rgba(255,255,255,${major ? .6 : .32})`; ctx.lineWidth = major ? 1.6 : 1;
      ctx.beginPath(); ctx.moveTo(x, y0 + H * (major ? 0.42 : 0.5)); ctx.lineTo(x, y0 + H * 0.64); ctx.stroke();
      if (dd % 30 === 0) {
        const lbl = dd % 90 === 0 ? ['N', 'E', 'S', 'O'][dd / 90 % 4] : String(dd / 10).padStart(2, '0');
        ctx.fillStyle = dd % 90 === 0 ? accent : 'rgba(255,255,255,.85)';
        ctx.font = `700 ${H * 0.26}px ${FONT}`; ctx.fillText(lbl, x, y0 + H * 0.26);
      }
    }
    ctx.restore();
    // índice central + lectura recuadrada
    const bw = H * 1.5, bh = H * 0.62;
    roundRect(ctx, cx - bw / 2, y0 - bh * 0.72, bw, bh, bh * 0.22); ctx.fillStyle = accent; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `700 ${bh * 0.5}px ${FONT}`; ctx.fillText(`${Math.round(heading)}°`, cx, y0 - bh * 0.4);
    ctx.fillStyle = accent; ctx.beginPath(); ctx.moveTo(cx - H * 0.11, y0); ctx.lineTo(cx + H * 0.11, y0); ctx.lineTo(cx, y0 + H * 0.16); ctx.closePath(); ctx.fill();
    ctx.restore();
  };

  const drawAviation = (ctx, s, w, h, U, un) => {
    const R = Math.min(w, h) * 0.135, cy = h - R - U * 1.4, gap = R * 2.3;
    ctx.save(); ctx.shadowColor = 'transparent';
    dial(ctx, w / 2 - gap, cy, R * 0.9, un.spd(s.hs || 0), un.spdU, 'VEL', niceMax(un.spd(maxHs)), true);
    attitude(ctx, w / 2, cy, R, s.pitch || 0, s.bank || 0);
    dial(ctx, w / 2 + gap, cy, R * 0.9, un.len(s.rel || 0), un.lenU, 'ALT', niceMax(un.len(maxRel)), false);
    if (s.heading != null) headingTape(ctx, w / 2, cy - R - U * 2.1, R * 3.4, s.heading);
    ctx.restore();
  };

  const draw = (ctx, t, w, h, cfg) => {
    cfg = cfg || DEFAULT_CFG;
    const gz = cfg.gauges || DEFAULT_CFG.gauges;
    const un = CONV[cfg.units] || CONV.metric;
    const s = sample(t);
    const U = Math.max(6, Math.min(w, h) * 0.03); // unidad proporcional
    ctx.save();
    ctx.textBaseline = 'alphabetic';

    // intro animada (fade + subida) en el primer instante; desactivable con cfg.intro=false
    const intro = cfg.intro === false ? 1 : 1 - (1 - Math.min(1, Math.max(0, t / 0.7))) ** 3;
    if (intro < 1) { ctx.globalAlpha = intro; ctx.translate(0, (1 - intro) * U * 1.4); }

    // scrims sutiles (arriba y abajo) para legibilidad, sin sombra
    let g = ctx.createLinearGradient(0, h * 0.68, 0, h);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.4)');
    ctx.fillStyle = g; ctx.fillRect(0, h * 0.68, w, h * 0.32);
    g = ctx.createLinearGradient(0, 0, 0, h * 0.24);
    g.addColorStop(0, 'rgba(0,0,0,.26)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h * 0.24);

    // sombra suave: los elementos "flotan" sobre el metraje
    ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = U * 0.7; ctx.shadowOffsetY = U * 0.06;

    if (cfg.theme === 'aviation') { drawAviation(ctx, s, w, h, U, un); } else {
    // métricas abajo (según los gauges activos y las unidades)
    const metrics = [];
    if (gz.speed) metrics.push({ value: `${Math.round(un.spd(s.hs || 0))}`, unit: un.spdU, label: 'VEL', key: 'speed' });
    if (gz.alt) metrics.push({ value: `${Math.round(un.len(s.rel || 0))}`, unit: un.lenU, label: 'ALT', key: 'alt' });
    if (gz.dist) metrics.push({ value: `${Math.round(un.len(s.far || 0))}`, unit: un.lenU, label: 'DIST', key: 'dist' });
    if (gz.vspeed) metrics.push({ value: `${un.vs(s.vs || 0).toFixed(1)}`, unit: un.vsU, label: 'VERT', key: 'vspeed' });
    if (metrics.length) {
      const cellW = Math.min(w * 0.56 / metrics.length, U * 4.9), panelW = cellW * metrics.length, panelH = U * 2.95;
      const px = (w - panelW) / 2, py = h - panelH - U * 0.7;
      ctx.shadowColor = 'transparent';
      glassPanel(ctx, px, py, panelW, panelH, U * 0.75);
      metrics.forEach((m, i) => metricCell(ctx, px + cellW * i, py, cellW, panelH, m, i > 0, t));
    }

    // brújula arriba derecha (más fina y compacta)
    if (gz.heading) {
      const R = Math.min(w, h) * 0.078;
      compass(ctx, w - R - U * 1.3, R + U * 1.2, R, s.heading);
      if (s.heading != null) {
        ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.font = `600 ${U * 0.95}px ${FONT}`; ls(ctx, U * 0.05);
        ctx.fillText(`${CARD[Math.round(s.heading / 45) % 8]} ${Math.round(s.heading)}°`, w - R - U * 1.4, R * 2 + U * 1.45); ls(ctx, 0);
      }
    }
    }

    // reloj arriba izquierda (píldora fina)
    if (gz.clock) {
      ctx.textBaseline = 'middle';
      const tm = `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
      ctx.font = `550 ${U * 1.15}px ${FONT}`; ls(ctx, U * 0.02);
      const tw = ctx.measureText(tm).width;
      ctx.fillStyle = 'rgba(10,12,18,.32)'; roundRect(ctx, U * 1.3, U * 1.15, tw + U * 1.5, U * 1.9, U * 0.95); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.96)'; ctx.textAlign = 'left';
      ctx.fillText(tm, U * 2.05, U * 2.1); ls(ctx, 0);
    }

    // mini-mapa (arriba izquierda, bajo el reloj)
    if (gz.minimap) {
      ctx.shadowColor = 'transparent';
      const mw = Math.min(w, h) * 0.21, mh = mw * 0.64;
      minimap(ctx, U * 1.3, gz.clock ? U * 4.1 : U * 1.3, mw, mh, s.lat, s.lon);
    }

    // barra de progreso (borde inferior)
    if (gz.progress) {
      ctx.shadowColor = 'transparent';
      const p = Math.max(0, Math.min(1, t / (S[S.length - 1].t || 1)));
      const bh = Math.max(2, U * 0.3);
      ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(0, h - bh, w, bh);
      ctx.fillStyle = accent; ctx.fillRect(0, h - bh, w * p, bh);
    }

    // marca de agua (arriba centro)
    if (gz.watermark && title) {
      ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = U * 0.6; ctx.shadowOffsetY = U * 0.06;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.font = `600 ${U * 1.05}px ${FONT}`; ls(ctx, U * 0.05);
      ctx.fillStyle = 'rgba(255,255,255,.72)';
      ctx.fillText(title, w / 2, U * 1.5); ls(ctx, 0);
    }

    // rótulo de ubicación (píldora con pin, arriba centro)
    if (gz.location && place) {
      ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = U * 0.6; ctx.shadowOffsetY = U * 0.06;
      ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      ctx.font = `600 ${U * 1.05}px ${FONT}`; ls(ctx, U * 0.02);
      const tw = ctx.measureText(place).width, padX = U * 0.85, dot = U * 0.9, gap = U * 0.4;
      const pw = padX * 2 + dot + gap + tw, ph = U * 2.2;
      const y0 = (gz.watermark && title) ? U * 3.5 : U * 1.4, x0 = w / 2 - pw / 2, cyp = y0 + ph / 2;
      ctx.fillStyle = 'rgba(10,12,18,.4)'; roundRect(ctx, x0, y0, pw, ph, ph / 2); ctx.fill();
      ctx.shadowColor = 'transparent';
      // pin (gota)
      const px = x0 + padX + dot / 2, py = cyp - dot * 0.12;
      ctx.fillStyle = accent; ctx.beginPath();
      ctx.arc(px, py - dot * 0.12, dot * 0.4, Math.PI, 0); ctx.lineTo(px, py + dot * 0.5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px, py - dot * 0.12, dot * 0.15, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.96)';
      ctx.fillText(place, x0 + padX + dot + gap, cyp); ls(ctx, 0);
    }

    ctx.restore();
  };

  return { draw };
}

Object.assign(__x, { DEFAULT_CFG, GAUGE_KEYS, createHud });

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
  'v3d.eyebrow': 'Flight in 3D',
  'v3d.title': 'Navigable 3D reconstruction',
  'v3d.sub': 'The route over the real terrain, with satellite imagery draped on top. Drag to orbit, wheel to zoom, or press Flyover.',
  'v3d.loading': 'Rebuilding the terrain in 3D…',
  'v3d.low': 'Low',
  'v3d.high': 'High',
  'v3d.path': 'Flight path',
  'v3d.hint': 'Drag to orbit · wheel to zoom',
  'v3d.flyover': 'Flyover',
  'v3d.pause': 'Pause',
  'v3d.reset': 'Reset view',
  'v3d.speed': 'Playback speed',
  'v3d.cine': 'Cinematic mode: auto camera with shots. Drag to take control.',
  'v3d.cine.short': 'Cine',
  'v3d.start': 'Start 3D flight',
  'v3d.hud.alt': 'Altitude',
  'v3d.hud.spd': 'Speed',
  'v3d.hud.vs': 'Vertical',
  'v3d.hud.far': 'Farthest',
  'v3d.flyspeed': 'Flight speed (free and pilot)',
  'v3d.flyspeed.slow': 'Slow',
  'v3d.flyspeed.med': 'Medium',
  'v3d.flyspeed.fast': 'Fast',
  'v3d.fullscreen': 'Fullscreen',
  'v3d.free': 'Free flight: move with WASD, look with the mouse',
  'v3d.free.short': 'Free',
  'v3d.free.hint': 'WASD move · arrows or mouse to look · E/Q up/down · Shift sprint · wheel speed · Esc exit',
  'v3d.pilot': 'Pilot the drone: move it with WASD (the camera follows)',
  'v3d.pilot.short': 'Pilot',
  'v3d.pilot.hint': 'Mouse or ←→ orbit the camera (drone faces that way) · WASD move · ↑↓ height · E/Q up/down · Shift boost · wheel zoom · Esc exit',
  'v3d.settings': 'Settings: choose what to show in the render',
  'v3d.export': 'Export the flyover to video (MP4)',
  'v3d.export.short': 'Export',
  'v3d.export.running': 'Rendering video…',
  'v3d.export.done': 'Video ready! Downloading…',
  'v3d.export.error': 'Could not generate the video',
  'v3d.export.cancelled': 'Export cancelled',
  'v3d.export.cancel': 'Cancel',
  'v3d.export.unsupported': 'Your browser does not support export (WebCodecs)',
  'v3d.export.est': 'Duration ≈ {dur} · {res}p · ~{size} MB',
  'v3d.export.trim': 'trimmed to avoid running out of memory',
  'v3d.opts.title': 'Show in the render',
  'v3d.opt.track': 'Flight path',
  'v3d.opt.kp': 'Flight highlights',
  'v3d.opt.places': 'Towns and peaks',
  'v3d.opt.water': 'Rivers and reservoirs',
  'v3d.opt.hud': 'Telemetry (HUD)',
  'v3d.opt.size': 'Drone size',
  'v3d.size.l': 'Large',
  'v3d.size.m': 'Medium',
  'v3d.size.s': 'Small',
  'v3d.unsupported': 'Your browser does not support the 3D view (WebGL).',
  'player.play': 'Play the flight',
  'player.pause': 'Pause',
  'player.seek': 'Seek in the flight',
  'hud.settings': 'HUD settings',
  'hud.gauges': 'Data',
  'hud.metrics': 'Metrics',
  'hud.elements': 'Elements',
  'hud.units': 'Units',
  'hud.metric': 'Metric',
  'hud.imperial': 'Imperial',
  'hud.theme': 'Theme',
  'hud.theme.modern': 'Modern',
  'hud.theme.aviation': 'Aviation',
  'hud.music': 'Music',
  'hud.music.none': 'None (video audio)',
  'hud.music.remove': 'Remove music',
  'hud.music.volume': 'Volume',
  'hud.music.start': 'Start',
  'hud.music.normalize': 'Normalize',
  'hud.music.normalize.hint': 'Even out the track loudness',
  'hud.music.generate': 'Generate',
  'hud.music.generate.hint': 'Create ambient music (cycles styles)',
  'hud.music.generating': 'Generating…',
  'hud.music.ambient': 'Ambient',
  'hud.music.style.calma': 'Calm',
  'hud.music.style.epico': 'Epic',
  'hud.music.style.cinematico': 'Cinematic',
  'hud.music.style.flight': 'Flight music',
  'hud.g.speed': 'Speed',
  'hud.g.alt': 'Altitude',
  'hud.g.dist': 'Distance',
  'hud.g.vspeed': 'Vertical',
  'hud.g.heading': 'Heading',
  'hud.g.clock': 'Clock',
  'hud.g.minimap': 'Mini-map',
  'hud.g.progress': 'Progress',
  'hud.g.watermark': 'Watermark',
  'hud.g.location': 'Location',
  'hud.export': 'Export video with HUD',
  'hud.vertical.hint': 'Vertical 9:16 for social (Reels/TikTok)',
  'hud.format.hint': 'Video and trailer format (landscape or vertical)',
  'hud.trailer': 'Trailer',
  'hud.trailer.hint': 'Assemble a highlights reel with the music',
  'hud.fx.hint': 'Trailer transition style',
  'hud.fx.random': 'Transitions: random',
  'hud.fx.smooth': 'Transitions: smooth',
  'hud.fx.dynamic': 'Transitions: dynamic',
  'hud.fx.none': 'Transitions: none',
  'hud.exporting': 'Exporting the video with the HUD…',
  'hud.export.note': 'Records in real time; do not close or switch tabs.',
  'hud.export.cancel': 'Cancel',
  'hud.export.done': '✅ Video ready',
  'player.expand': 'Enlarge video',
  'player.collapse': 'Shrink video',
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
  'hl.speed': 'Top speed',
  'hl.alt': 'Max altitude',
  'hl.dist': 'Max distance',
  'hl.climb': 'Max climb',
  'hl.descent': 'Max descent',
  'hl.turn': 'Sharpest turn',
  'intro.kicker': 'Flight analysis',
  'intro.dist': 'Distance',
  'intro.alt': 'Altitude',
  'intro.spd': 'Speed',
  'fx.label': 'Effect',
  'fx.none': 'None',
  'fx.vivid': 'Vivid',
  'fx.sunset': 'Sunset',
  'fx.warm': 'Warm',
  'fx.cool': 'Cool',
  'fx.sepia': 'Sepia',
  'fx.bw': 'B&W',
  'fx.vintage': 'Vintage',
  'fx.drama': 'Dramatic',
  'mnv.eyebrow': 'Maneuvers',
  'mnv.title': 'How it was flown',
  'mnv.sub': 'Automatic detection of shot types from the path and the gimbal.',
  'mnv.orbit': 'Orbit',
  'mnv.orbit.pl': 'Orbits',
  'mnv.turn': 'Turn',
  'mnv.turn.pl': 'Turns',
  'mnv.climb': 'Climb',
  'mnv.climb.pl': 'Climbs',
  'mnv.descent': 'Descent',
  'mnv.descent.pl': 'Descents',
  'mnv.cruise': 'Pass',
  'mnv.cruise.pl': 'Passes',
  'mnv.hover': 'Hover',
  'mnv.hover.pl': 'Hovers',
  'mnv.oftime': 'of the time',
  'mnv.dur': 'Duration',
  'mnv.avgspd': 'Avg speed',
  'mnv.alt': 'Altitude',
  'mnv.turnacc': 'Turn',
  'ps.eyebrow': 'Piloting',
  'ps.title': 'You as a pilot',
  'ps.sub': 'A smoothness score from the telemetry, with tips to improve.',
  'ps.of100': 'out of 100',
  'ps.smoothness': 'Smoothness',
  'ps.altitude': 'Altitude',
  'ps.turns': 'Turns',
  'ps.gimbal': 'Camera',
  'ps.improve': 'To improve',
  'ps.strong': 'Strength',
  'ps.tip.smoothness.warn': 'Ease your accelerations and stops for a more cinematic flight.',
  'ps.tip.smoothness.good': 'Very fluid flight, no jerks.',
  'ps.tip.altitude.warn': 'Try to keep altitude steadier while moving.',
  'ps.tip.altitude.good': 'Excellent altitude control.',
  'ps.tip.turns.warn': 'Make turns steadier and more progressive, less jerky.',
  'ps.tip.turns.good': 'Very clean, steady turns.',
  'ps.tip.gimbal.warn': 'Move the camera more smoothly to avoid jumps.',
  'ps.tip.gimbal.good': 'Very stable gimbal: smooth footage.',
  'solar.golden.t': 'Best light for this spot',
  'solar.golden.morning': 'morning {a}–{b}',
  'solar.golden.evening': 'evening {a}–{b}',
  'solar.golden.when.morning': 'morning',
  'solar.golden.when.evening': 'evening',
  'solar.golden.in': 'You flew during the {when} golden hour: the light was at its best ({ranges}).',
  'solar.golden.out': 'Golden hour here: {ranges}. For the most cinematic light, come back around {next}.',
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
  'v3d.eyebrow': 'Vuelo en 3D',
  'v3d.title': 'Reconstrucción 3D navegable',
  'v3d.sub': 'El recorrido sobre el terreno real, con imagen de satélite drapeada. Arrastra para orbitar, rueda para acercar, o pulsa Sobrevuelo.',
  'v3d.loading': 'Reconstruyendo el terreno en 3D…',
  'v3d.low': 'Bajo',
  'v3d.high': 'Alto',
  'v3d.path': 'Trayectoria del vuelo',
  'v3d.hint': 'Arrastra para orbitar · rueda para zoom',
  'v3d.flyover': 'Sobrevuelo',
  'v3d.pause': 'Pausa',
  'v3d.reset': 'Reiniciar la vista',
  'v3d.speed': 'Velocidad de reproducción',
  'v3d.cine': 'Modo cine: cámara automática con planos. Arrastra para tomar el control.',
  'v3d.cine.short': 'Cine',
  'v3d.start': 'Iniciar vuelo 3D',
  'v3d.hud.alt': 'Altura',
  'v3d.hud.spd': 'Velocidad',
  'v3d.hud.vs': 'V. vertical',
  'v3d.hud.far': 'Alejamiento',
  'v3d.flyspeed': 'Velocidad de vuelo (libre y pilotar)',
  'v3d.flyspeed.slow': 'Lenta',
  'v3d.flyspeed.med': 'Media',
  'v3d.flyspeed.fast': 'Rápida',
  'v3d.fullscreen': 'Pantalla completa',
  'v3d.free': 'Vuelo libre: muévete con WASD y mira con el ratón',
  'v3d.free.short': 'Libre',
  'v3d.free.hint': 'WASD moverse · flechas o ratón para mirar · E/Q subir/bajar · Shift correr · rueda velocidad · Esc salir',
  'v3d.pilot': 'Pilotar el dron: muévelo con WASD (la cámara lo sigue)',
  'v3d.pilot.short': 'Pilotar',
  'v3d.pilot.hint': 'Ratón o ←→ orbitan la cámara (el dron encara hacia ahí) · WASD mover · ↑↓ altura · E/Q subir/bajar · Shift acelerar · rueda acercar · Esc salir',
  'v3d.settings': 'Ajustes: elige qué ver en el render',
  'v3d.export': 'Exportar el sobrevuelo a vídeo (MP4)',
  'v3d.export.short': 'Exportar',
  'v3d.export.running': 'Generando vídeo…',
  'v3d.export.done': '¡Vídeo listo! Descargando…',
  'v3d.export.error': 'No se pudo generar el vídeo',
  'v3d.export.cancelled': 'Exportación cancelada',
  'v3d.export.cancel': 'Cancelar',
  'v3d.export.unsupported': 'Tu navegador no soporta la exportación (WebCodecs)',
  'v3d.export.est': 'Duración ≈ {dur} · {res}p · ~{size} MB',
  'v3d.export.trim': 'recortado para no agotar la memoria',
  'v3d.opts.title': 'Mostrar en el render',
  'v3d.opt.track': 'Trayectoria del vuelo',
  'v3d.opt.kp': 'Hitos del vuelo',
  'v3d.opt.places': 'Pueblos y cimas',
  'v3d.opt.water': 'Ríos y embalses',
  'v3d.opt.hud': 'Telemetría (HUD)',
  'v3d.opt.size': 'Tamaño del dron',
  'v3d.size.l': 'Grande',
  'v3d.size.m': 'Medio',
  'v3d.size.s': 'Pequeño',
  'v3d.unsupported': 'Tu navegador no admite la vista 3D (WebGL).',
  'player.play': 'Reproducir el vuelo',
  'player.pause': 'Pausa',
  'player.seek': 'Buscar en el vuelo',
  'hud.settings': 'Ajustes del HUD',
  'hud.gauges': 'Datos',
  'hud.metrics': 'Métricas',
  'hud.elements': 'Elementos',
  'hud.units': 'Unidades',
  'hud.metric': 'Métrico',
  'hud.imperial': 'Imperial',
  'hud.theme': 'Tema',
  'hud.theme.modern': 'Moderno',
  'hud.theme.aviation': 'Aviación',
  'hud.music': 'Música',
  'hud.music.none': 'Ninguna (audio del vídeo)',
  'hud.music.remove': 'Quitar música',
  'hud.music.volume': 'Volumen',
  'hud.music.start': 'Inicio',
  'hud.music.normalize': 'Normalizar',
  'hud.music.normalize.hint': 'Iguala el volumen de la canción',
  'hud.music.generate': 'Generar',
  'hud.music.generate.hint': 'Crea música ambiental (cambia de estilo cada vez)',
  'hud.music.generating': 'Generando…',
  'hud.music.ambient': 'Ambiente',
  'hud.music.style.calma': 'Calma',
  'hud.music.style.epico': 'Épico',
  'hud.music.style.cinematico': 'Cinemático',
  'hud.music.style.flight': 'Música del vuelo',
  'hud.g.speed': 'Velocidad',
  'hud.g.alt': 'Altura',
  'hud.g.dist': 'Distancia',
  'hud.g.vspeed': 'V. vertical',
  'hud.g.heading': 'Rumbo',
  'hud.g.clock': 'Reloj',
  'hud.g.minimap': 'Mini-mapa',
  'hud.g.progress': 'Progreso',
  'hud.g.watermark': 'Marca de agua',
  'hud.g.location': 'Lugar',
  'hud.export': 'Exportar vídeo con HUD',
  'hud.vertical.hint': 'Formato vertical 9:16 para redes (Reels/TikTok)',
  'hud.format.hint': 'Formato del vídeo y del trailer (horizontal o vertical)',
  'hud.trailer': 'Trailer',
  'hud.trailer.hint': 'Monta un resumen con los momentos destacados y la música',
  'hud.fx.hint': 'Estilo de transición del trailer',
  'hud.fx.random': 'Transiciones: aleatorias',
  'hud.fx.smooth': 'Transiciones: suaves',
  'hud.fx.dynamic': 'Transiciones: dinámicas',
  'hud.fx.none': 'Transiciones: ninguna',
  'hud.exporting': 'Exportando el vídeo con el HUD…',
  'hud.export.note': 'Se graba en tiempo real; no cierres ni cambies de pestaña.',
  'hud.export.cancel': 'Cancelar',
  'hud.export.done': '✅ Vídeo listo',
  'player.expand': 'Ampliar vídeo',
  'player.collapse': 'Reducir vídeo',
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
  'hl.speed': 'Velocidad máx',
  'hl.alt': 'Altura máx',
  'hl.dist': 'Distancia máx',
  'hl.climb': 'Ascenso máx',
  'hl.descent': 'Descenso máx',
  'hl.turn': 'Giro más cerrado',
  'intro.kicker': 'Análisis de vuelo',
  'intro.dist': 'Distancia',
  'intro.alt': 'Altura',
  'intro.spd': 'Velocidad',
  'fx.label': 'Efecto',
  'fx.none': 'Ninguno',
  'fx.vivid': 'Vívido',
  'fx.sunset': 'Atardecer',
  'fx.warm': 'Cálido',
  'fx.cool': 'Frío',
  'fx.sepia': 'Sepia',
  'fx.bw': 'Blanco y negro',
  'fx.vintage': 'Vintage',
  'fx.drama': 'Dramático',
  'mnv.eyebrow': 'Maniobras',
  'mnv.title': 'Cómo se voló',
  'mnv.sub': 'Detección automática de los tipos de plano a partir de la trayectoria y el gimbal.',
  'mnv.orbit': 'Órbita',
  'mnv.orbit.pl': 'Órbitas',
  'mnv.turn': 'Giro',
  'mnv.turn.pl': 'Giros',
  'mnv.climb': 'Ascenso',
  'mnv.climb.pl': 'Ascensos',
  'mnv.descent': 'Descenso',
  'mnv.descent.pl': 'Descensos',
  'mnv.cruise': 'Pasada',
  'mnv.cruise.pl': 'Pasadas',
  'mnv.hover': 'Estático',
  'mnv.hover.pl': 'Estáticos',
  'mnv.oftime': 'del tiempo',
  'mnv.dur': 'Duración',
  'mnv.avgspd': 'Velocidad media',
  'mnv.alt': 'Altura',
  'mnv.turnacc': 'Giro',
  'ps.eyebrow': 'Pilotaje',
  'ps.title': 'Tu vuelo como piloto',
  'ps.sub': 'Nota de suavidad del vuelo a partir de la telemetría, con consejos para mejorar.',
  'ps.of100': 'de 100',
  'ps.smoothness': 'Suavidad',
  'ps.altitude': 'Altura',
  'ps.turns': 'Giros',
  'ps.gimbal': 'Cámara',
  'ps.improve': 'A mejorar',
  'ps.strong': 'Punto fuerte',
  'ps.tip.smoothness.warn': 'Suaviza las aceleraciones y frenadas para un vuelo más cinematográfico.',
  'ps.tip.smoothness.good': 'Vuelo muy fluido, sin tirones.',
  'ps.tip.altitude.warn': 'Intenta mantener la altura más estable en los desplazamientos.',
  'ps.tip.altitude.good': 'Excelente control de altura.',
  'ps.tip.turns.warn': 'Haz los giros más constantes y progresivos, menos a tirones.',
  'ps.tip.turns.good': 'Giros muy limpios y constantes.',
  'ps.tip.gimbal.warn': 'Mueve la cámara con más suavidad para evitar saltos.',
  'ps.tip.gimbal.good': 'Gimbal muy estable: imagen suave.',
  'solar.golden.t': 'La mejor luz para este lugar',
  'solar.golden.morning': 'mañana {a}–{b}',
  'solar.golden.evening': 'tarde {a}–{b}',
  'solar.golden.when.morning': 'de la mañana',
  'solar.golden.when.evening': 'de la tarde',
  'solar.golden.in': 'Volaste en la golden hour {when}: la luz estaba en su mejor momento ({ranges}).',
  'solar.golden.out': 'Golden hour aquí: {ranges}. Para la luz más cinematográfica, vuelve sobre las {next}.',
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

__m["js/maneuvers.js"] = function (__x, __req) {
// Etiquetado automático de maniobras: segmenta la trayectoria del vuelo y
// clasifica cada tramo (órbita, ascenso, descenso, pasada, estático) según la
// velocidad, la tasa de giro y la velocidad vertical. Devuelve los tramos y un
// resumen por tipo.

const { hav } = __req("js/srt.js");

/** Tipos de maniobra y su color (para timeline e informe). */
const MANEUVER_TYPES = ['orbit', 'turn', 'climb', 'descent', 'cruise', 'hover'];
const MANEUVER_COLOR = { orbit: '#a06bff', turn: '#ffb43d', climb: '#37cf6b', descent: '#ff5d5d', cruise: '#5b9dff', hover: '#8a93a6' };
/** Icono (path SVG 24×24, solo trazo) por tipo de maniobra. */
const MANEUVER_ICON = {
  orbit: 'M20 12a8 8 0 1 1-3-6.2 M20 4v4h-4',
  turn: 'M4 13a8 8 0 0 1 13-5 M18 4v4h-4',
  climb: 'M12 20V6 M6 11l6-6 6 6',
  descent: 'M12 4v14 M6 13l6 6 6-6',
  cruise: 'M3 12h15 M13 7l5 5-5 5',
  hover: 'M9 5v14 M15 5v14',
};

const bearing = (la1, lo1, la2, lo2) => {
  const p1 = la1 * Math.PI / 180, p2 = la2 * Math.PI / 180, dl = (lo2 - lo1) * Math.PI / 180;
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
};

/**
 * @param {object} model modelo del vuelo (series)
 * @param {{minDur?:number, turnRate?:number, vsTh?:number, hoverSpd?:number, orbitDeg?:number}} [opts]
 * @returns {{segments:Array<{t0:number,t1:number,type:string,turnDeg?:number}>, summary:Object}}
 */
function detectManeuvers(model, opts = {}) {
  const S = model.series || [];
  const minDur = opts.minDur ?? 3, turnRate = opts.turnRate ?? 8, vsTh = opts.vsTh ?? 1.2;
  const hoverSpd = opts.hoverSpd ?? 1.2, orbitDeg = opts.orbitDeg ?? 200;
  if (S.length < 4) return { segments: [], summary: {} };

  // 1) estado de cada muestra + tasa de giro con signo (°/s)
  const P = [];
  for (let i = 0; i < S.length; i++) {
    const s = S[i], hs = s.hs ?? 0, vs = s.vs ?? 0;
    let turn = 0;
    if (i >= 1 && i < S.length - 1 && S[i - 1].lat != null && s.lat != null && S[i + 1].lat != null) {
      const h1 = bearing(S[i - 1].lat, S[i - 1].lon, s.lat, s.lon);
      const h2 = bearing(s.lat, s.lon, S[i + 1].lat, S[i + 1].lon);
      const dt = (S[i + 1].t - S[i - 1].t) / 2; // intervalo entre los centros de los dos tramos
      if (dt > 0) turn = (((h2 - h1 + 540) % 360) - 180) / dt;
    }
    let st;
    if (hs < hoverSpd) st = 'hover';
    else if (Math.abs(turn) > turnRate && hs > 1.5) st = 'turn';
    else if (vs > vsTh) st = 'climb';
    else if (vs < -vsTh) st = 'descent';
    else st = 'cruise';
    P.push({ t: s.t, st, turn });
  }

  // 2) agrupar muestras consecutivas del mismo estado
  const raw = [];
  for (const p of P) {
    const last = raw[raw.length - 1];
    if (last && last.st === p.st) { last.t1 = p.t; last.pts.push(p); }
    else raw.push({ st: p.st, t0: p.t, t1: p.t, pts: [p] });
  }

  // 3) filtrar por duración y refinar (los giros largos y sostenidos son órbitas)
  const segments = [];
  for (const seg of raw) {
    if (seg.t1 - seg.t0 < minDur) continue;
    let type = seg.st, turnDeg;
    if (seg.st === 'turn') {
      let acc = 0;
      for (let i = 1; i < seg.pts.length; i++) acc += seg.pts[i].turn * (seg.pts[i].t - seg.pts[i - 1].t);
      turnDeg = Math.round(Math.abs(acc));
      type = turnDeg >= orbitDeg ? 'orbit' : 'turn';
    }
    segments.push(turnDeg != null ? { t0: seg.t0, t1: seg.t1, type, turnDeg } : { t0: seg.t0, t1: seg.t1, type });
  }

  // 4) los giros muy leves no son maniobra: pasan a pasada
  for (const s of segments) if (s.type === 'turn' && (s.turnDeg || 0) < (opts.minTurnDeg ?? 25)) { s.type = 'cruise'; delete s.turnDeg; }
  // 5) fusionar tramos consecutivos del mismo tipo separados por huecos cortos
  const merged = [];
  for (const s of segments) {
    const last = merged[merged.length - 1];
    if (last && last.type === s.type && s.t0 - last.t1 <= (opts.mergeGap ?? 4)) { last.t1 = s.t1; if (s.turnDeg) last.turnDeg = (last.turnDeg || 0) + s.turnDeg; }
    else merged.push({ ...s });
  }

  // 6) estadísticas por tramo (para los tooltips)
  for (const seg of merged) {
    let n = 0, sumHs = 0, minR = Infinity, maxR = -Infinity;
    for (const s of S) {
      if (s.t < seg.t0) continue; if (s.t > seg.t1) break;
      if (s.hs != null) { sumHs += s.hs; n++; }
      if (s.rel != null) { if (s.rel < minR) minR = s.rel; if (s.rel > maxR) maxR = s.rel; }
    }
    seg.avgHs = n ? sumHs / n : 0;
    seg.minRel = isFinite(minR) ? minR : null;
    seg.maxRel = isFinite(maxR) ? maxR : null;
  }

  // 7) resumen por tipo (nº de tramos)
  const summary = {};
  for (const s of merged) summary[s.type] = (summary[s.type] || 0) + 1;
  return { segments: merged, summary };
}

Object.assign(__x, { MANEUVER_TYPES, MANEUVER_COLOR, MANEUVER_ICON, detectManeuvers });

};

__m["js/mp4-muxer.js"] = function (__x, __req) {
// Muxer MP4 mínimo, salida progresiva estándar (moov al final): compatible con
// iOS/QuickTime, a diferencia del MP4 fragmentado que produce MediaRecorder.
// Pista de vídeo H.264 (muestras AVCC) + pista de audio AAC opcional. Si no se
// aporta audio, la salida es idéntica al muxer de vídeo puro.
//
// Dos modos:
//  - createMp4(): acumula todas las muestras en memoria (Blobs) y devuelve el MP4
//    como Blob en finalize(). Bien para vídeos cortos.
//  - createMp4Stream({ sink }): escribe cada muestra directamente al `sink` (un
//    fichero en disco vía File System Access API) según llegan, sin retenerlas en
//    RAM. Solo queda metadata en memoria (unos pocos MB), así un vuelo largo a
//    1080p no agota la memoria de la pestaña. Solo vídeo (sin audio).

const VTS = 90000; // timescale de la pista de vídeo

const u8 = (...n) => new Uint8Array(n);
const u16 = (n) => new Uint8Array([(n >> 8) & 255, n & 255]);
const u32 = (n) => { n >>>= 0; return new Uint8Array([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]); };
// entero de 64 bits big-endian (para el largesize del box mdat en modo streaming)
const u64 = (n) => new Uint8Array([...u32(Math.floor(n / 2 ** 32)), ...u32(n % 2 ** 32)]);
const str = (s) => new Uint8Array([...s].map((c) => c.charCodeAt(0)));
const cat = (arrs) => { let len = 0; for (const a of arrs) len += a.length; const o = new Uint8Array(len); let p = 0; for (const a of arrs) { o.set(a, p); p += a.length; } return o; };
const box = (type, ...payload) => { const body = cat(payload); return cat([u32(body.length + 8), str(type), body]); };
const fbox = (type, version, flags, ...payload) => box(type, u8(version), u8((flags >> 16) & 255, (flags >> 8) & 255, flags & 255), ...payload);
// descriptor MPEG-4 (tag + longitud en 1 byte; suficiente para AudioSpecificConfig)
const descr = (tag, payload) => cat([u8(tag), u8(payload.length), payload]);
const MATRIX = cat([u32(0x00010000), u32(0), u32(0), u32(0), u32(0x00010000), u32(0), u32(0), u32(0), u32(0x40000000)]);

const ftypBox = () => box('ftyp', str('isom'), u32(0x200), str('isom'), str('iso2'), str('avc1'), str('mp41'));

/**
 * Construye el box `moov` a partir de la metadata de las muestras. Puro: no toca
 * los bytes de los datos, solo describe dónde viven (`vBase`/`aBase`).
 * @param {{width:number,height:number,description:Uint8Array,samples:Array,dataLen:number,vBase:number,audio?:object,aSamples?:Array,aDataLen?:number,aBase?:number}} s
 */
function assembleMoov(s) {
  const { width, height, description, samples, vBase } = s;
  const hasAudio = !!(s.audio && s.aSamples && s.aSamples.length);
  const audio = s.audio, aSamples = s.aSamples || [];

  // duraciones de vídeo a partir de los timestamps
  for (let i = 0; i < samples.length; i++) {
    samples[i].dur = i < samples.length - 1
      ? Math.max(1, samples[i + 1].ts - samples[i].ts)
      : (samples.length > 1 ? samples[i - 1].ts - (samples[i - 2]?.ts ?? samples[i - 1].ts) || 3000 : 3000);
  }
  if (samples.length > 1) samples[samples.length - 1].dur = samples[samples.length - 2].dur;
  const vTotal = samples.reduce((a, x) => a + x.dur, 0);
  const vDurMs = Math.round(vTotal / VTS * 1000);

  // audio: 1024 muestras PCM por frame AAC-LC
  const AAC_FRAME = 1024;
  const aTotal = hasAudio ? aSamples.length * AAC_FRAME : 0;
  const aDurMs = hasAudio ? Math.round(aTotal / audio.sampleRate * 1000) : 0;
  const durMovie = Math.max(vDurMs, aDurMs);

  // ---- pista de vídeo ----
  const avc1 = box('avc1',
    u8(0, 0, 0, 0, 0, 0), u16(1),
    u16(0), u16(0), u8(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
    u16(width), u16(height),
    u32(0x00480000), u32(0x00480000), u32(0), u16(1),
    new Uint8Array(32),
    u16(0x0018), u16(0xFFFF),
    box('avcC', description));
  const vStsd = fbox('stsd', 0, 0, u32(1), avc1);
  const sttsE = [];
  for (const smp of samples) { const l = sttsE[sttsE.length - 1]; if (l && l.dur === smp.dur) l.count++; else sttsE.push({ count: 1, dur: smp.dur }); }
  const vStts = fbox('stts', 0, 0, u32(sttsE.length), cat(sttsE.map((e) => cat([u32(e.count), u32(e.dur)]))));
  const vStsc = fbox('stsc', 0, 0, u32(1), cat([u32(1), u32(samples.length), u32(1)]));
  const vStsz = fbox('stsz', 0, 0, u32(0), u32(samples.length), cat(samples.map((x) => u32(x.size))));
  const vStco = fbox('stco', 0, 0, u32(1), u32(vBase));
  const keys = samples.map((x, i) => (x.key ? i + 1 : 0)).filter(Boolean);
  const vStss = fbox('stss', 0, 0, u32(keys.length), cat(keys.map((k) => u32(k))));
  const vStbl = box('stbl', vStsd, vStts, vStsc, vStsz, vStco, vStss);
  const vmhd = fbox('vmhd', 0, 1, u16(0), u16(0), u16(0), u16(0));
  const dinf = box('dinf', fbox('dref', 0, 0, u32(1), fbox('url ', 0, 1)));
  const vMinf = box('minf', vmhd, dinf, vStbl);
  const vHdlr = fbox('hdlr', 0, 0, u32(0), str('vide'), u8(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0), cat([str('VideoHandler'), u8(0)]));
  const vMdhd = fbox('mdhd', 0, 0, u32(0), u32(0), u32(VTS), u32(vTotal), u16(0x55c4), u16(0));
  const vMdia = box('mdia', vMdhd, vHdlr, vMinf);
  const vTkhd = fbox('tkhd', 0, 7, u32(0), u32(0), u32(1), u32(0), u32(durMovie),
    u8(0, 0, 0, 0, 0, 0, 0, 0), u16(0), u16(0), u16(0), u16(0), MATRIX, u32(width << 16), u32(height << 16));
  const vTrak = box('trak', vTkhd, vMdia);

  // ---- pista de audio (opcional) ----
  let aTrak = null;
  if (hasAudio) {
    const aBase = s.aBase;
    const esds = fbox('esds', 0, 0,
      descr(0x03, cat([u16(0), u8(0),                                  // ES_ID + flags
        descr(0x04, cat([u8(0x40), u8(0x15), u8(0, 0, 0), u32(0), u32(128000), // AAC, audioStream, buffer/max/avg bitrate
          descr(0x05, audio.desc)])),                                  // AudioSpecificConfig
        descr(0x06, u8(0x02))])));                                     // SLConfig
    const mp4a = box('mp4a',
      u8(0, 0, 0, 0, 0, 0), u16(1),           // reserved + data_reference_index
      u32(0), u32(0),                         // reserved
      u16(audio.channels), u16(16),           // channelcount + samplesize
      u16(0), u16(0),                         // pre_defined + reserved
      u32((audio.sampleRate * 65536) >>> 0),  // samplerate 16.16
      esds);
    const aStsd = fbox('stsd', 0, 0, u32(1), mp4a);
    const aStts = fbox('stts', 0, 0, u32(1), cat([u32(aSamples.length), u32(AAC_FRAME)]));
    const aStsc = fbox('stsc', 0, 0, u32(1), cat([u32(1), u32(aSamples.length), u32(1)]));
    const aStsz = fbox('stsz', 0, 0, u32(0), u32(aSamples.length), cat(aSamples.map((x) => u32(x.size))));
    const aStco = fbox('stco', 0, 0, u32(1), u32(aBase));
    const aStbl = box('stbl', aStsd, aStts, aStsc, aStsz, aStco);
    const smhd = fbox('smhd', 0, 0, u16(0), u16(0));
    const aMinf = box('minf', smhd, dinf, aStbl);
    const aHdlr = fbox('hdlr', 0, 0, u32(0), str('soun'), u8(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0), cat([str('SoundHandler'), u8(0)]));
    const aMdhd = fbox('mdhd', 0, 0, u32(0), u32(0), u32(audio.sampleRate), u32(aTotal), u16(0x55c4), u16(0));
    const aMdia = box('mdia', aMdhd, aHdlr, aMinf);
    const aTkhd = fbox('tkhd', 0, 7, u32(0), u32(0), u32(2), u32(0), u32(durMovie),
      u8(0, 0, 0, 0, 0, 0, 0, 0), u16(0), u16(0), u16(0x0100), u16(0), MATRIX, u32(0), u32(0));
    aTrak = box('trak', aTkhd, aMdia);
  }

  const nextTrack = hasAudio ? 3 : 2;
  const mvhd = fbox('mvhd', 0, 0, u32(0), u32(0), u32(1000), u32(durMovie), u32(0x00010000), u16(0x0100), u16(0),
    u32(0), u32(0), MATRIX, u32(0), u32(0), u32(0), u32(0), u32(0), u32(0), u32(nextTrack));
  return hasAudio ? box('moov', mvhd, vTrak, aTrak) : box('moov', mvhd, vTrak);
}

/**
 * @param {{width:number,height:number}} o
 * @returns {{setDescription:(d:BufferSource)=>void, addSample:(bytes:Uint8Array,isKey:boolean,tsMicros:number)=>void, setAudioConfig:(c:{sampleRate:number,channels:number,description:BufferSource})=>void, addAudioSample:(bytes:BufferSource,tsMicros:number)=>void, finalize:()=>Blob}}
 */
function createMp4({ width, height }) {
  let description = null;
  const samples = [];      // vídeo: { size, key, ts (en VTS), offset }
  // Los bytes de cada muestra se guardan como Blob (no Uint8Array): Chrome los
  // respalda en su almacén de blobs, paginable a disco, en vez del heap del
  // renderer. Así un vuelo largo no dispara la RAM y el Blob final no duplica.
  const data = [];
  let dataLen = 0;

  // audio (opcional)
  let audio = null;        // { sampleRate, channels, desc }
  const aSamples = [];     // { size }
  const aData = [];
  let aDataLen = 0;

  return {
    setDescription(d) { description = new Uint8Array(d instanceof ArrayBuffer ? d : d.buffer || d); },
    addSample(bytes, isKey, tsMicros) {
      const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
      samples.push({ size: b.length, key: !!isKey, ts: Math.round(tsMicros * VTS / 1e6), offset: dataLen });
      data.push(new Blob([b])); dataLen += b.length;
    },
    setAudioConfig({ sampleRate, channels, description: d }) {
      audio = { sampleRate, channels: channels || 2, desc: new Uint8Array(d instanceof ArrayBuffer ? d : d.buffer || d) };
    },
    addAudioSample(bytes) {
      const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
      aSamples.push({ size: b.length });
      aData.push(new Blob([b])); aDataLen += b.length;
    },
    finalize() {
      if (!description || !samples.length) throw new Error('MP4 sin datos.');
      const ftyp = ftypBox();
      const totalData = dataLen + aDataLen;
      const mdatHeader = cat([u32(totalData + 8), str('mdat')]); // mdat de 32 bits (tamaño conocido)
      const vBase = ftyp.length + mdatHeader.length;   // offset del primer byte de vídeo
      const aBase = vBase + dataLen;                   // el audio va tras el vídeo en el mdat
      const moov = assembleMoov({ width, height, description, samples, dataLen, vBase, audio, aSamples, aDataLen, aBase });
      return new Blob([ftyp, mdatHeader, ...data, ...aData, moov], { type: 'video/mp4' });
    },
  };
}

/**
 * Muxer en streaming: escribe el MP4 directamente a `sink` (un fichero en disco)
 * según llegan las muestras, sin retenerlas en RAM. Solo vídeo. Estructura:
 * ftyp → mdat (con largesize de 64 bits: se reserva y se parchea al final) →
 * moov. En memoria solo queda la metadata de cada muestra (tamaño, ts, clave).
 *
 * `sink` es asíncrono: { write(bytes, position?): Promise, close(): Promise,
 * abort?(): Promise }. `abort` (opcional) descarta el fichero al cancelar. Sobre
 * File System Access API se envuelve un FileSystemWritableFileStream.
 *
 * @param {{width:number,height:number,sink:{write:(b:Uint8Array,pos?:number)=>Promise<void>,close:()=>Promise<void>}}} o
 */
function createMp4Stream({ width, height, sink }) {
  let description = null;
  const samples = [];      // { size, key, ts }
  let dataLen = 0;         // bytes de datos de vídeo escritos hasta ahora
  const ftyp = ftypBox();
  const mdatOffset = ftyp.length;          // dónde empieza el box mdat
  const vBase = mdatOffset + 16;           // datos tras el header mdat de 64 bits
  let writePos = 0;        // posición del próximo byte a escribir en el fichero
  let chain = Promise.resolve(); // cola de escrituras serializadas, en orden
  let writeErr = null;
  let started = false;

  // Encadena una escritura posicionada; captura el primer error para relanzarlo.
  const enqueue = (bytes, pos) => {
    const at = pos;
    chain = chain.then(() => sink.write(bytes, at)).catch((e) => { if (!writeErr) writeErr = e; });
    return chain;
  };

  // Cabecera: ftyp + header mdat con largesize provisional (se parchea al final).
  const start = () => {
    const mdatHeader = cat([u32(1), str('mdat'), u64(0)]); // size=1 → largesize de 64 bits
    enqueue(ftyp, 0); writePos = ftyp.length;
    enqueue(mdatHeader, writePos); writePos += mdatHeader.length; // = vBase
    started = true;
  };

  return {
    setDescription(d) { description = new Uint8Array(d instanceof ArrayBuffer ? d : d.buffer || d); },
    addSample(bytes, isKey, tsMicros) {
      if (writeErr) throw writeErr;
      if (!started) start();
      const b = bytes instanceof Uint8Array ? bytes.slice() : new Uint8Array(bytes); // copia: el buffer del chunk se reutiliza
      samples.push({ size: b.length, key: !!isKey, ts: Math.round(tsMicros * VTS / 1e6) });
      enqueue(b, writePos); writePos += b.length; dataLen += b.length;
    },
    /** Espera a que se vacíe la cola de escrituras (backpressure). */
    async drain() { await chain; if (writeErr) throw writeErr; },
    /** Cierra el fichero tras escribir moov y parchear el tamaño de mdat. */
    async finalize() {
      if (!started || !description || !samples.length) throw new Error('MP4 sin datos.');
      const mdatSize = 16 + dataLen; // header de 64 bits + datos
      const moov = assembleMoov({ width, height, description, samples, dataLen, vBase });
      enqueue(moov, writePos); writePos += moov.length;
      enqueue(u64(mdatSize), mdatOffset + 8); // parchea el largesize del mdat
      await chain;
      if (writeErr) throw writeErr;
      await sink.close();
    },
    /** Aborta: descarta el fichero (sink.abort() si existe) o, si no, lo cierra
     *  como esté para que el llamante lo elimine. */
    async abort() {
      try { await chain; } catch { /* ignora */ }
      try { if (sink.abort) await sink.abort(); else await sink.close(); } catch { /* ignora */ }
    },
  };
}

Object.assign(__x, { createMp4, createMp4Stream });

};

__m["js/music-gen.js"] = function (__x, __req) {
// Generador de música ambiental sintética (Web Audio, sin archivos): renderiza
// un AudioBuffer con OfflineAudioContext a partir de pads de acordes, campanas
// esporádicas y una reverb sencilla. Pensado para banda sonora de fondo de los
// vídeos, con estilos distintos y fundidos de entrada/salida.

/** Estilos disponibles: acordes (Hz), duración de acorde y timbre. */
const STYLES = {
  calma:      { chords: [[220, 277.18, 329.63], [196, 246.94, 293.66], [174.61, 220, 261.63], [196, 246.94, 329.63]], chordDur: 8, wave: 'sine',     bells: 0.5, cutoff: 1400 },
  epico:      { chords: [[130.81, 196, 261.63], [146.83, 220, 293.66], [174.61, 261.63, 349.23], [130.81, 196, 246.94]], chordDur: 6, wave: 'sawtooth', bells: 0.9, cutoff: 1800 },
  cinematico: { chords: [[164.81, 246.94, 329.63], [146.83, 220, 293.66], [123.47, 185, 246.94], [164.81, 220, 329.63]], chordDur: 7, wave: 'triangle', bells: 0.7, cutoff: 1600 },
};

/** Impulso de reverb: ruido con caída exponencial. */
function makeImpulse(ctx, seconds, decay) {
  const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

/** Una voz del pad: dos osciladores con detune, envolvente lenta y filtro. */
function pad(ctx, out, freq, t0, dur, wave, cutoff) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(0.16, t0 + 1.8);         // ataque lento
  g.gain.setValueAtTime(0.16, t0 + dur - 2);
  g.gain.linearRampToValueAtTime(0, t0 + dur);            // caída lenta
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cutoff; lp.Q.value = 0.6;
  g.connect(lp); lp.connect(out);
  for (const det of [-6, 6]) {
    const o = ctx.createOscillator(); o.type = wave; o.frequency.value = freq; o.detune.value = det;
    o.connect(g); o.start(t0); o.stop(t0 + dur);
  }
}

/** Campana/nota cristalina: seno con envolvente percusiva. */
function bell(ctx, out, freq, t0) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(0.12, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0008, t0 + 3.2);
  const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
  o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + 3.3);
}

/**
 * Renderiza música ambiental a un AudioBuffer.
 * @param {number} sampleRate
 * @param {number} duration segundos
 * @param {keyof STYLES} [style]
 * @returns {Promise<AudioBuffer>}
 */
async function generateAmbient(sampleRate, duration, style = 'cinematico') {
  const S = STYLES[style] || STYLES.cinematico;
  const dur = Math.max(6, duration);
  const ctx = new OfflineAudioContext(2, Math.ceil(sampleRate * dur), sampleRate);

  const master = ctx.createGain();
  master.gain.setValueAtTime(0, 0);
  master.gain.linearRampToValueAtTime(0.9, 2);            // fundido de entrada
  master.gain.setValueAtTime(0.9, Math.max(2.1, dur - 3));
  master.gain.linearRampToValueAtTime(0, dur);           // fundido de salida
  master.connect(ctx.destination);
  const rev = ctx.createConvolver(); rev.buffer = makeImpulse(ctx, 2.6, 2.4);
  const revGain = ctx.createGain(); revGain.gain.value = 0.4;
  master.connect(rev); rev.connect(revGain); revGain.connect(ctx.destination);

  let t = 0, ci = 0;
  while (t < dur) {
    const chord = S.chords[ci % S.chords.length];
    for (const f of chord) pad(ctx, master, f, t, S.chordDur + 1.5, S.wave, S.cutoff);
    // campanas: notas del acorde una octava arriba, en tiempos aleatorios
    const nb = Math.round(S.bells * 3);
    for (let k = 0; k < nb; k++) {
      const bt = t + Math.random() * S.chordDur;
      if (bt < dur) bell(ctx, master, chord[Math.floor(Math.random() * chord.length)] * 2, bt);
    }
    t += S.chordDur; ci++;
  }
  return ctx.startRendering();
}

/**
 * Sonificación reactiva: música generada a partir de la telemetría del vuelo.
 * La altura modula el brillo y el tono; la velocidad, la densidad de notas.
 * @param {number} sampleRate @param {object} model @param {number} duration
 * @returns {Promise<AudioBuffer>}
 */
async function generateFlightMusic(sampleRate, model, duration) {
  const S = (model.series || []).filter((s) => s.t != null);
  if (S.length < 4) return generateAmbient(sampleRate, duration, 'cinematico');
  const dur = Math.max(6, duration);
  const ctx = new OfflineAudioContext(2, Math.ceil(sampleRate * dur), sampleRate);
  let rMin = Infinity, rMax = -Infinity, hMax = 1;
  for (const s of S) { if (s.rel != null) { if (s.rel < rMin) rMin = s.rel; if (s.rel > rMax) rMax = s.rel; } if (s.hs != null && s.hs > hMax) hMax = s.hs; }
  if (!isFinite(rMin)) { rMin = 0; rMax = 1; } if (rMax <= rMin) rMax = rMin + 1;
  const at = (t) => { let i = 1; while (i < S.length && S[i].t < t) i++; const a = S[i - 1], b = S[Math.min(i, S.length - 1)]; const sp = (b.t - a.t) || 1, f = Math.max(0, Math.min(1, (t - a.t) / sp)); const L = (k) => (a[k] != null && b[k] != null) ? a[k] + (b[k] - a[k]) * f : (a[k] ?? b[k] ?? 0); return { hs: L('hs'), rel: L('rel') }; };

  const master = ctx.createGain();
  master.gain.setValueAtTime(0, 0); master.gain.linearRampToValueAtTime(0.85, 2);
  master.gain.setValueAtTime(0.85, Math.max(2.1, dur - 3)); master.gain.linearRampToValueAtTime(0, dur);
  master.connect(ctx.destination);
  const rev = ctx.createConvolver(); rev.buffer = makeImpulse(ctx, 2.6, 2.4); const rg = ctx.createGain(); rg.gain.value = 0.4; master.connect(rev); rev.connect(rg); rg.connect(ctx.destination);

  // pad drone con brillo (cutoff) modulado por la altura
  const padG = ctx.createGain(); padG.gain.value = 0.12; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.7; padG.connect(lp); lp.connect(master);
  for (let t = 0; t < dur; t += 1) { const nr = ((at(t).rel - rMin) / (rMax - rMin)); lp.frequency.setValueAtTime(520 + nr * 2600, t); }
  [110, 164.81].forEach((f, i) => { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.detune.value = i ? 6 : -6; o.connect(padG); o.start(0); o.stop(dur); });

  // campanas: tono según altura, cadencia según velocidad (escala pentatónica menor)
  const scale = [0, 3, 5, 7, 10];
  let t = 1;
  while (t < dur - 1) {
    const { hs, rel } = at(t);
    const nr = Math.max(0, Math.min(1, (rel - rMin) / (rMax - rMin)));
    const octave = 2 + Math.round(nr * 2);
    const semis = scale[(Math.random() * scale.length) | 0] + octave * 12;
    bell(ctx, master, 220 * 2 ** (semis / 12), t);
    const speedN = Math.min(1, (hs || 0) / Math.max(4, hMax * 0.7));
    t += Math.max(0.35, 1.7 - speedN * 1.2);
  }
  return ctx.startRendering();
}

Object.assign(__x, { STYLES, generateAmbient, generateFlightMusic });

};

__m["js/pilot-score.js"] = function (__x, __req) {
// Puntuación de pilotaje + coaching: analiza la suavidad del vuelo (aceleración,
// control de altura, giros y estabilidad del gimbal) y devuelve una nota global
// 0-100 por aspecto, más consejos concretos. Todo heurístico sobre la serie.

const bearing = (la1, lo1, la2, lo2) => {
  const p1 = la1 * Math.PI / 180, p2 = la2 * Math.PI / 180, dl = (lo2 - lo1) * Math.PI / 180;
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
};
const clamp = (x) => Math.max(0, Math.min(100, Math.round(x)));

/**
 * @param {object} model modelo del vuelo (series)
 * @returns {{overall:number, aspects:{smoothness:number,altitude:number,turns:number,gimbal:number}, tips:Array<{level:'good'|'warn',key:string}>}|null}
 */
function computePilotScore(model) {
  const S = (model.series || []).filter((s) => s.hs != null && s.t != null);
  if (S.length < 8) return null;
  const t = S.map((s) => s.t);
  const sm = (vals, w = 2) => { const o = new Array(vals.length); for (let i = 0; i < vals.length; i++) { let s = 0, n = 0; for (let j = -w; j <= w; j++) { const k = i + j; if (k >= 0 && k < vals.length && vals[k] != null) { s += vals[k]; n++; } } o[i] = n ? s / n : 0; } return o; };
  const rmsDeriv = (vals) => { let s = 0, n = 0; for (let i = 1; i < vals.length; i++) { const dt = t[i] - t[i - 1]; if (dt > 0) { const d = (vals[i] - vals[i - 1]) / dt; s += d * d; n++; } } return Math.sqrt(s / Math.max(1, n)); };

  // suavizamos las señales GPS antes de derivar (evita penalizar el ruido)
  const rmsAcc = rmsDeriv(sm(S.map((s) => s.hs ?? 0)));       // aceleración horizontal
  const rmsVAcc = rmsDeriv(sm(S.map((s) => s.vs ?? 0)));      // aceleración vertical
  const rmsPitchRate = rmsDeriv(sm(S.map((s) => s.pitch ?? 0))); // velocidad de cabeceo del gimbal

  // suavidad de giro: variabilidad de la tasa de rumbo (con velocidad suficiente)
  const rate = [];
  for (let i = 1; i < S.length - 1; i++) {
    if (S[i - 1].lat != null && S[i].lat != null && S[i + 1].lat != null && (S[i].hs ?? 0) > 1.5) {
      const h1 = bearing(S[i - 1].lat, S[i - 1].lon, S[i].lat, S[i].lon);
      const h2 = bearing(S[i].lat, S[i].lon, S[i + 1].lat, S[i + 1].lon);
      const dt = (S[i + 1].t - S[i - 1].t) / 2;
      if (dt > 0) rate.push((((h2 - h1 + 540) % 360) - 180) / dt);
    }
  }
  const rateSm = sm(rate);
  let tj = 0, tn = 0; for (let i = 1; i < rateSm.length; i++) { const d = rateSm[i] - rateSm[i - 1]; tj += d * d; tn++; }
  const rmsTurnJerk = tn ? Math.sqrt(tj / tn) : 0;

  const smoothness = clamp(100 - rmsAcc * 40);
  const altitude = clamp(100 - rmsVAcc * 55);
  const turnsScore = clamp(100 - rmsTurnJerk * 22);
  const gimbal = clamp(100 - rmsPitchRate * 12);
  const overall = clamp(smoothness * 0.3 + altitude * 0.25 + turnsScore * 0.25 + gimbal * 0.2);
  const aspects = { smoothness, altitude, turns: turnsScore, gimbal };

  // coaching: avisar de los aspectos flojos y elogiar el mejor
  const rank = [['smoothness', smoothness], ['altitude', altitude], ['turns', turnsScore], ['gimbal', gimbal]];
  const tips = [];
  for (const [key, v] of rank) if (v < 55) tips.push({ level: 'warn', key });
  const best = rank.slice().sort((a, b) => b[1] - a[1])[0];
  if (best[1] >= 82) tips.push({ level: 'good', key: best[0] });
  return { overall, aspects, tips };
}

Object.assign(__x, { computePilotScore });

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

__m["js/scene-3d.js"] = function (__x, __req) {
// Preparación de la escena 3D del vuelo (agnóstica del motor de render).
// Proyecta lat/lon a metros locales (ENU), baja el DEM del terreno de teselas
// Terrarium (terrain-RGB de AWS: sin clave, con CORS y sin límite por minuto),
// compone la textura de satélite (teselas Esri) drapeada sobre el relieve, y
// expone la posición/rumbo/pitch del dron en cada instante.
// La usan tanto la rama de Three.js como la del renderer propio en canvas.

const { projector, keypoints } = __req("js/geo.js");
const { solarPosition, lightPhase } = __req("js/solar.js");

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile';
const TERRARIUM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium';
const MPD_LAT = 111320; // metros por grado de latitud

/**
 * DEM del terreno a partir de teselas Terrarium (terrain-RGB). Compone las
 * teselas que cubren el bbox en un lienzo, lee los píxeles una vez y devuelve un
 * muestreador de altura (m) interpolado bilinealmente. La cota se codifica como
 * h = R*256 + G + B/256 − 32768.
 * @returns {Promise<{heightAt:(lat:number,lon:number)=>number}|null>}
 */
async function fetchTerrainDEM(b) {
  const ze = 14; // zoom del DEM: más teselas pero más detalle de relieve
  const n = 2 ** ze;
  const lon2px = (lon) => (lon + 180) / 360 * n * 256;
  const lat2px = (lat) => { const r = lat * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n * 256; };
  const x0 = Math.floor(lon2px(b.west) / 256), x1 = Math.floor(lon2px(b.east) / 256);
  const y0 = Math.floor(lat2px(b.north) / 256), y1 = Math.floor(lat2px(b.south) / 256);
  const W = (x1 - x0 + 1) * 256, H = (y1 - y0 + 1) * 256;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = 'rgb(128,0,0)'; ctx.fillRect(0, 0, W, H); // 0 m por defecto

  let okCount = 0, total = 0;
  const jobs = [];
  for (let yt = y0; yt <= y1; yt++)
    for (let xt = x0; xt <= x1; xt++) {
      total++;
      jobs.push(new Promise((res) => {
        const img = new Image(); img.crossOrigin = 'anonymous';
        img.onload = () => { try { ctx.drawImage(img, (xt - x0) * 256, (yt - y0) * 256); okCount++; } catch { /* taint */ } res(); };
        img.onerror = () => res();
        img.src = `${TERRARIUM}/${ze}/${xt}/${yt}.png`;
      }));
    }
  await Promise.all(jobs);
  if (!okCount) return null;

  let data;
  try { data = ctx.getImageData(0, 0, W, H).data; } catch { return null; } // lienzo contaminado
  const originX = x0 * 256, originY = y0 * 256;
  const decode = (px, py) => { const i = (py * W + px) * 4; return data[i] * 256 + data[i + 1] + data[i + 2] / 256 - 32768; };
  return {
    heightAt(lat, lon) {
      const fx = Math.max(0, Math.min(W - 1.001, lon2px(lon) - originX));
      const fy = Math.max(0, Math.min(H - 1.001, lat2px(lat) - originY));
      const xa = Math.floor(fx), ya = Math.floor(fy), tx = fx - xa, ty = fy - ya;
      const top = decode(xa, ya) + (decode(xa + 1, ya) - decode(xa, ya)) * tx;
      const bot = decode(xa, ya + 1) + (decode(xa + 1, ya + 1) - decode(xa, ya + 1)) * tx;
      return top + (bot - top) * ty;
    },
  };
}

/**
 * Encuadre de teselas para el 3D: expande el bbox del vuelo por `factor` (6× por
 * defecto) para mostrar más contexto alrededor, y elige el zoom para no pasar de
 * un presupuesto de teselas. Devuelve la misma forma que geo.tileConfig.
 */
function wideConfig(track, factor = 6) {
  const T = track.filter((p) => p[0] != null);
  const lats = T.map((p) => p[0]), lons = T.map((p) => p[1]);
  let la0 = Math.min(...lats), la1 = Math.max(...lats), lo0 = Math.min(...lons), lo1 = Math.max(...lons);
  const dla = (la1 - la0) || 1e-4, dlo = (lo1 - lo0) || 1e-4, pad = (factor - 1) / 2;
  la0 -= dla * pad; la1 += dla * pad; lo0 -= dlo * pad; lo1 += dlo * pad;
  // evita el mapa en tira muy estrecha (vuelos alargados): fuerza un aspecto
  // mínimo (lado corto ≥ 60% del largo, en metros) para que entren también los
  // pueblos/cimas laterales sin que floten fuera.
  const cosLat = Math.cos((la0 + la1) / 2 * Math.PI / 180) || 1, R = 0.6;
  const wLat = la1 - la0, wLon = (lo1 - lo0) * cosLat;
  if (wLon < R * wLat) { const g = (R * wLat / cosLat - (lo1 - lo0)) / 2; lo0 -= g; lo1 += g; }
  else if (wLat < R * wLon) { const g = (R * wLon - (la1 - la0)) / 2; la0 -= g; la1 += g; }
  const tilesAt = (z) => {
    const n = 2 ** z;
    const xt = (lon) => (lon + 180) / 360 * n;
    const yt = (lat) => { const r = lat * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n; };
    const x0 = Math.floor(xt(lo0)), x1 = Math.floor(xt(lo1)), y0 = Math.floor(yt(la1)), y1 = Math.floor(yt(la0));
    return { x0, x1, y0, y1, count: (x1 - x0 + 1) * (y1 - y0 + 1) };
  };
  let z = 15;
  for (let zz = 18; zz >= 10; zz--) { if (tilesAt(zz).count <= 48) { z = zz; break; } }
  const { x0, x1, y0, y1 } = tilesAt(z);
  const cols = x1 - x0 + 1, rows = y1 - y0 + 1;
  return { z, x0, x1, y0, y1, cols, rows, originX: x0 * 256, originY: y0 * 256, compW: cols * 256, compH: rows * 256 };
}

/** lat/lon de las esquinas del lienzo de teselas (Web Mercator). */
function tileBounds(tc) {
  const n = 2 ** tc.z;
  const lon = (x) => x / n * 360 - 180;
  const lat = (y) => Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) * 180 / Math.PI;
  return { west: lon(tc.x0), east: lon(tc.x1 + 1), north: lat(tc.y0), south: lat(tc.y1 + 1) };
}

/**
 * Compone las teselas Esri del encuadre en un <canvas> para drapear como textura.
 * Usa un zoom superior (más nítida) cubriendo exactamente el mismo bbox `b`; como
 * el bbox está alineado a teselas de tc.z, también lo está en zoom+boost. El
 * mapeo uv sigue siendo normalizado [0,1] sobre `b`, así que no cambia.
 */
async function buildTexture(tc, boost = 4, maxTex = 8192) {
  const f = 2 ** boost, z = tc.z + boost;
  const x0 = tc.x0 * f, x1 = (tc.x1 + 1) * f - 1;
  const y0 = tc.y0 * f, y1 = (tc.y1 + 1) * f - 1;
  const cols = x1 - x0 + 1, rows = y1 - y0 + 1;
  // baja de zoom si se pasa del presupuesto de teselas (descargas) o del tamaño
  // de textura. TOPE DE MEMORIA: aunque la GPU declare 16384, un lienzo así (>300
  // MB) cuelga/crashea navegadores con poca memoria; nos quedamos en 8192 por lado
  // (~84 MB) y ~600 teselas, que es lo que va sobrado en cualquier equipo.
  const cap = Math.min(maxTex || 8192, 8192);
  if (boost > 0 && (cols * rows > 600 || cols * 256 > cap || rows * 256 > cap)) return buildTexture(tc, boost - 1, maxTex);
  const cv = document.createElement('canvas');
  cv.width = cols * 256; cv.height = rows * 256;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#243447'; ctx.fillRect(0, 0, cv.width, cv.height);
  // color más rico sin oscurecer (el terreno es auto-iluminado en la escena 3D)
  ctx.filter = 'saturate(1.3) contrast(1.07) brightness(1.0)';
  const jobs = [];
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const dx = (x - x0) * 256, dy = (y - y0) * 256;
      jobs.push(new Promise((res) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => { try { ctx.drawImage(img, dx, dy, 256, 256); } catch { /* taint */ } res(); };
        img.onerror = () => res();
        img.src = `${ESRI}/${z}/${y}/${x}`;
      }));
    }
  await Promise.all(jobs);
  ctx.filter = 'none';
  return cv;
}

/** Textura del mundo (Web Mercator, Esri a zoom bajo) para el globo de la intro. */
async function buildWorldTexture(z = 4) {
  const n = 2 ** z, cv = document.createElement('canvas');
  cv.width = n * 256; cv.height = n * 256;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#0a1622'; ctx.fillRect(0, 0, cv.width, cv.height);
  const jobs = [];
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      jobs.push(new Promise((res) => {
        const img = new Image(); img.crossOrigin = 'anonymous';
        img.onload = () => { try { ctx.drawImage(img, x * 256, y * 256, 256, 256); } catch { /* taint */ } res(); };
        img.onerror = () => res();
        img.src = `${ESRI}/${z}/${y}/${x}`;
      }));
    }
  await Promise.all(jobs);
  return cv;
}

/**
 * Máscara de agua a partir de la textura de satélite: detecta píxeles oscuros y
 * azulados (embalses, ríos). Codifica rugosidad en el canal G y metalización en
 * el B (los que usa MeshStandardMaterial): agua = liso y reflectante, tierra =
 * mate. Devuelve el canvas de la máscara, o null si apenas hay agua.
 */
function buildWaterMask(texCanvas) {
  const W = 256, H = Math.max(1, Math.round(256 * texCanvas.height / texCanvas.width));
  const m = document.createElement('canvas'); m.width = W; m.height = H;
  const mx = m.getContext('2d', { willReadFrequently: true });
  mx.drawImage(texCanvas, 0, 0, W, H);
  let img; try { img = mx.getImageData(0, 0, W, H); } catch { return null; }
  const d = img.data, out = mx.createImageData(W, H), o = out.data;
  let water = 0;
  for (let i = 0; i < W * H; i++) {
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2], mx2 = Math.max(r, g, b);
    // agua (embalse/río): azul claramente dominante sobre el rojo y no muy clara.
    // Umbrales estrictos para no marcar campos/sombras azuladas como agua (que
    // saldrían con un destello del sol falso). Vale para embalses turquesa (b≈g).
    const isWater = b > r + 14 && b >= g - 4 && r < 110 && mx2 < 175;
    o[i * 4] = 0;
    // G = rugosidad. Agua = liso pero NO espejo (≈0.4), para un brillo suave en
    // vez de un reflejo duro; tierra = mate (1.0).
    o[i * 4 + 1] = isWater ? 100 : 255;
    o[i * 4 + 2] = 0;                     // B sin usar (metalización a 0)
    o[i * 4 + 3] = 255;
    if (isWater) water++;
  }
  mx.putImageData(out, 0, 0);
  return water > W * H * 0.006 ? m : null;
}

/**
 * Expande un bbox alrededor de su centro por `mult`, acotando la semianchura
 * resultante entre `minKm` y `maxKm` por lado. Sirve para consultar el horizonte
 * (pueblos/cimas del entorno), que suele ser mucho más ancho que el vuelo.
 */
function expandBox(b, mult, minKm, maxKm) {
  const cLat = (b.north + b.south) / 2, cLon = (b.east + b.west) / 2;
  const kmLat = 110.6, kmLon = 110.6 * Math.cos(cLat * Math.PI / 180);
  const clamp = (h, km) => Math.min(maxKm / km, Math.max(minKm / km, h));
  const hLat = clamp((b.north - b.south) / 2 * mult, kmLat);
  const hLon = clamp((b.east - b.west) / 2 * mult, kmLon);
  return { south: cLat - hLat, north: cLat + hLat, west: cLon - hLon, east: cLon + hLon };
}

// Servidor principal de Overpass: rápido, con CORS y datos mundiales. Es el único
// del que nos fiamos para el camino rápido.
const OVERPASS_MAIN = 'https://overpass-api.de/api/interpreter';
// Espejos de respaldo (con CORS y datos mundiales) para cuando el principal falla.
// Son fiables pero LENTOS (10–30 s), así que solo se usan como último recurso; da
// igual porque los rótulos se cargan en segundo plano y no bloquean la escena.
// (Se descartan a propósito kumi/private.coffee/osm.jp —sin CORS— y osm.ch —solo
// datos de Suiza, devuelve vacío para el resto—.)
const OVERPASS_FALLBACKS = [
  'https://overpass-api.de/api/interpreter', // por si se ha recuperado
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

/** Un intento a un endpoint, abortado si supera `timeoutMs`. Lanza si falla. */
async function overpassTry(url, body, timeoutMs) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: 'POST', body, signal: ctrl.signal });
    if (!res.ok) throw new Error(String(res.status));
    return (await res.json()).elements || [];
  } finally { clearTimeout(to); }
}

/**
 * Lanza una consulta Overpass con tolerancia a fallos: primero un intento rápido al
 * servidor principal; si falla (504/timeout, frecuente por saturación), corre en
 * paralelo varios espejos (`Promise.any`, gana el que responda) con más margen.
 * Devuelve el array de elementos, o null si ninguno respondió.
 */
async function fetchOverpass(query) {
  const body = 'data=' + encodeURIComponent(query);
  try { return await overpassTry(OVERPASS_MAIN, body, 9000); } catch { /* al respaldo */ }
  try { return await Promise.any(OVERPASS_FALLBACKS.map((u) => overpassTry(u, body, 28000))); } catch { /* nada */ }
  return null;
}

/**
 * Puntos de interés del horizonte desde OpenStreetMap (Overpass): cimas
 * (natural=peak, con su cota), núcleos de población (place=city/town/village/
 * hamlet) y masas de agua (embalses, lagos, ríos). Sirven para rotular lo que se
 * ve alrededor del vuelo, en un radio bastante mayor que el terreno (los pueblos
 * vecinos quedan a varios km). Consulta con un tiempo máximo y devuelve [] ante
 * cualquier fallo (Overpass caído, CORS, timeout). Prioriza ciudades > pueblos >
 * aldeas, embalses/lagos > ríos, y cimas por altitud; limita el total.
 * @param {{west:number,east:number,north:number,south:number}} b bbox de consulta
 * @returns {Promise<Array<{lat:number,lon:number,name:string,kind:'peak'|'town'|'water',ele:number|null,rank:number}>>}
 */
async function fetchHorizonPOIs(b) {
  const bbox = `${b.south},${b.west},${b.north},${b.east}`;
  // Dos consultas independientes en paralelo: cimas/núcleos (nodos, rápida) y
  // masas de agua (vías/relaciones, con `out center`). Se separan a propósito:
  // el agua puede ser lenta o fallar (p.ej. la relación de un río largo) y no
  // debe arrastrar consigo a los pueblos/cimas. NO pedimos relaciones de río
  // (waterway) porque cargar la geometría entera de un río de cientos de km
  // dispara el tiempo de respuesta; las vías dan un centro más cercano y útil.
  const qLand = `[out:json][timeout:20];(` +
    `node["natural"="peak"]["name"](${bbox});` +
    `node["place"~"^(city|town|village|hamlet)$"]["name"](${bbox});` +
    `);out qt 200;`;
  const qWater = `[out:json][timeout:20];(` +
    `way["natural"="water"]["name"](${bbox});` +
    `relation["natural"="water"]["name"](${bbox});` +
    `way["landuse"="reservoir"]["name"](${bbox});` +
    `relation["landuse"="reservoir"]["name"](${bbox});` +
    `way["waterway"="river"]["name"](${bbox});` +
    `);out center 200;`;
  const [land, water] = await Promise.all([fetchOverpass(qLand), fetchOverpass(qWater)]);
  const els = [...(land || []), ...(water || [])];
  if (!els.length) return [];

  // rango de importancia: ciudad > pueblo > aldea; agua: embalse/lago > río;
  // cima por altitud. Se deduplica por nombre quedándose con el rango más alto.
  const PLACE = { city: 6, town: 5, village: 4, hamlet: 3 };
  const peaks = [], places = [], waters = [];
  const seenWater = new Map(); // nombre → índice en waters (dedup de ríos troceados)
  for (const e of els) {
    const tg = e.tags || {}, name = tg.name;
    const lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon;
    if (!name || lat == null || lon == null) continue;
    if (tg.natural === 'peak') {
      const ele = Number.parseFloat(tg.ele);
      peaks.push({ lat, lon, name, kind: 'peak', ele: Number.isFinite(ele) ? ele : null, rank: Number.isFinite(ele) ? ele : 0 });
    } else if (tg.place in PLACE) {
      places.push({ lat, lon, name, kind: 'town', ele: null, rank: PLACE[tg.place] * 1000 });
    } else if (tg.natural === 'water' || tg.landuse === 'reservoir' || tg.waterway === 'river') {
      const river = tg.waterway === 'river' && tg.natural !== 'water';
      const rank = river ? 2500 : 5500; // embalses/lagos destacan; ríos algo menos
      const key = name.split(' - ')[0].trim().toLowerCase(); // "Río Duero - Rio Douro" ≡ "Río Duero"
      const prev = seenWater.get(key);
      if (prev == null) { seenWater.set(key, waters.length); waters.push({ lat, lon, name, kind: 'water', ele: null, rank }); }
      else if (rank > waters[prev].rank) waters[prev] = { lat, lon, name, kind: 'water', ele: null, rank };
    }
  }
  peaks.sort((a, c) => c.rank - a.rank);
  places.sort((a, c) => c.rank - a.rank);
  waters.sort((a, c) => c.rank - a.rank);
  // conserva los más importantes de cada tipo (el declutter en pantalla recorta
  // el resto por solapamiento)
  return [...places.slice(0, 18), ...waters.slice(0, 10), ...peaks.slice(0, 16)];
}

/**
 * Prepara todos los datos de la escena 3D del vuelo.
 * @param {object} model modelo del vuelo
 * @param {{grid?:number}} [opts] grid = nº de vértices por lado de la malla del terreno
 * @returns {Promise<object>} datos listos para cualquier motor de render
 */
async function buildScene3D(model, opts = {}) {
  const tc = wideConfig(model.track, opts.extent ?? 6); // mapa ampliado a 6× el vuelo
  const { PX, PY } = projector(tc);
  const b = tileBounds(tc);

  // origen ENU en el centro del vuelo; x=este (m), z=norte→-Z (m)
  const [lat0, lon0] = model.center;
  const mpdLon = MPD_LAT * Math.cos(lat0 * Math.PI / 180);
  const X = (lon) => (lon - lon0) * mpdLon;
  const Z = (lat) => -(lat - lat0) * MPD_LAT;
  const uv = (lat, lon) => [PX(lon) / tc.compW, PY(lat) / tc.compH];

  const dem = await fetchTerrainDEM(b); // muestreador de altura (m), o null si falla
  const heightAt = (lat, lon) => (dem ? dem.heightAt(lat, lon) : 0);
  // exageración vertical: el DEM libre (SRTM ~30 m) es suave; realzamos el relieve
  // igual que Google Earth. Se aplica por igual a terreno y vuelo (la altura
  // relativa del dron sobre el suelo se mantiene correcta).
  const VE = opts.exaggeration ?? 1.7;

  // el DEM Terrarium es denso, así que renderizamos una malla fina directamente
  const rgrid = dem ? Math.max(24, Math.min(160, opts.grid ?? 128)) : 24;
  const latOf = (r) => b.north + (b.south - b.north) * (r / (rgrid - 1));
  const lonOf = (c) => b.west + (b.east - b.west) * (c / (rgrid - 1));

  // cotas mín/máx del terreno visible (muestreadas de la malla de render)
  let elevMin = Infinity, elevMax = -Infinity;
  if (dem) for (let r = 0; r < rgrid; r++) for (let c = 0; c < rgrid; c++) {
    const e = heightAt(latOf(r), lonOf(c)); if (e < elevMin) elevMin = e; if (e > elevMax) elevMax = e;
  }
  if (!isFinite(elevMin)) { elevMin = 0; elevMax = 0; }
  const base = elevMin; // restamos la cota mínima para mantener números pequeños

  // altura del suelo bajo el despegue (para colocar el track por AGL/rel)
  const takeoffGround = heightAt(model.takeoff[0], model.takeoff[1]);

  // altura de mundo (m, con exageración) para una cota MSL del terreno
  const groundY = (lat, lon) => (heightAt(lat, lon) - base) * VE;
  // altura de mundo del suelo en un punto (x,z) del mundo, invirtiendo X()/Z().
  // Sirve para apoyar la sombra del dron sobre el terreno del punto desplazado.
  const groundAtXZ = (x, z) => groundY(lat0 - z / MPD_LAT, lon0 + x / mpdLon);

  const terrain = {
    grid: rgrid, base,
    elevMin, elevMax,
    midY: (elevMax - elevMin) * VE / 2, // media altura (para encuadrar la cámara)
    // vértices en metros: {x, y, z, u, v}, con la cota del DEM y exageración.
    vertex(r, c) {
      const lat = latOf(r), lon = lonOf(c);
      const [u, v] = uv(lat, lon);
      return { x: X(lon), y: groundY(lat, lon), z: Z(lat), u, v };
    },
    hasDEM: !!dem,
  };

  // altura de mundo del dron (m) para una altura relativa rel (sobre el despegue)
  const worldY = (rel) => ((takeoffGround - base) + (rel ?? 0)) * VE;

  // track 3D: y = altura de vuelo; gy = suelo real bajo el punto (para la cortina)
  const S = model.series.filter((s) => s.lat != null && s.t != null);
  const relMax = Math.max(1, ...S.map((s) => s.rel ?? 0));
  const track = S.map((s) => ({ x: X(s.lon), y: worldY(s.rel), z: Z(s.lat), t: s.t, rel: s.rel ?? 0, gy: groundY(s.lat, s.lon) }));

  // posición interpolada del dron en un instante (m), con pitch y velocidad
  const posAt = (time) => {
    let i = 1; while (i < S.length && S[i].t < time) i++;
    const a = S[i - 1], c = S[Math.min(i, S.length - 1)];
    const span = (c.t - a.t) || 1, f = Math.max(0, Math.min(1, (time - a.t) / span));
    const lerp = (k) => (a[k] ?? 0) + ((c[k] ?? 0) - (a[k] ?? 0)) * f;
    const lat = lerp('lat'), lon = lerp('lon');
    return { x: X(lon), y: worldY(lerp('rel')), z: Z(lat), pitch: (lerp('pitch') || 0) * Math.PI / 180, hs: lerp('hs'), vs: lerp('vs'), rel: lerp('rel'), gy: groundY(lat, lon) };
  };

  /**
   * Estado del dron en el instante t. El rumbo se calcula con una ventana de
   * ±1.2 s (estable), y es NaN cuando el dron está prácticamente quieto (hover),
   * para que la cámara mantenga el último rumbo en vez de dar saltos.
   */
  const droneAt = (t) => {
    const p = posAt(t), a = posAt(t - 1.2), c = posAt(t + 1.2);
    const dxp = c.x - a.x, dzp = c.z - a.z, dist = Math.hypot(dxp, dzp);
    const heading = dist > 1.5 ? Math.atan2(dxp, -dzp) : NaN;
    return { x: p.x, y: p.y, z: p.z, pitch: p.pitch, hs: p.hs, vs: p.vs, rel: p.rel, gy: p.gy, heading };
  };

  // posición real del sol para el instante y lugar del vuelo (cielo, luz, sombras)
  const date = model.meta.start instanceof Date ? model.meta.start : new Date(model.meta.start || Date.now());
  const sp = solarPosition(date, lat0, lon0);
  const el = sp.elevation * Math.PI / 180, az = sp.azimuth * Math.PI / 180;
  const sun = {
    dir: { x: Math.cos(el) * Math.sin(az), y: Math.max(0.06, Math.sin(el)), z: -Math.cos(el) * Math.cos(az) },
    elevation: sp.elevation, azimuth: sp.azimuth, phase: lightPhase(sp.elevation),
  };

  const texture = await buildTexture(tc, 4, opts.maxTex);
  const water = buildWaterMask(texture); // máscara de agua (o null)
  const world = await buildWorldTexture(4); // globo de la intro (más nítido)

  // rótulos del horizonte (cimas/pueblos de OSM): se consultan DENTRO del terreno
  // (95%, con un pequeño margen del borde) para que ningún rótulo quede flotando
  // fuera del mapa. La cima usa su cota real; el resto (y el agua, cuyo centroide
  // puede caer lejos) usa la altura del DEM. Va en segundo plano para no retrasar
  // la escena; el componente los añade al resolver.
  const poiBox = expandBox(b, 0.95, 0, 1e4); // ≈ el terreno visible, ligeramente por dentro
  const poisReady = fetchHorizonPOIs(poiBox)
    .then((raw) => raw.map((p) => {
      let lat = p.lat, lon = p.lon;
      // el centroide (`out center`) de ríos/embalses grandes cae lejísimos de la
      // parte visible; lo acotamos al terreno para colocar el rótulo sobre el mapa
      if (p.kind === 'water') {
        lat = Math.max(b.south, Math.min(b.north, lat));
        lon = Math.max(b.west, Math.min(b.east, lon));
      }
      return {
        name: p.name, kind: p.kind, ele: p.ele, rank: p.rank,
        x: X(lon), z: Z(lat),
        y: (p.kind === 'peak' && p.ele != null) ? (p.ele - base) * VE : groundY(lat, lon),
      };
    }))
    .catch(() => []);

  return {
    center: [lat0, lon0],
    world, poisReady,
    // extensión del terreno en metros (para encuadrar la cámara)
    bounds: {
      x0: X(b.west), x1: X(b.east), z0: Z(b.north), z1: Z(b.south),
      spanX: X(b.east) - X(b.west), spanZ: Z(b.south) - Z(b.north),
    },
    terrain, texture, water, track, droneAt, relMax, sun, groundAtXZ,
    keypoints: keypoints(model).map((k) => ({ key: k.key, t: k.t, x: X(k.lon), y: worldY(k.x.rel ?? 0), z: Z(k.lat) })),
    takeoffXZ: { x: X(model.takeoff[1]), z: Z(model.takeoff[0]), y: worldY(0) },
    duration: model.meta.dur || (S.length ? S[S.length - 1].t : 0),
  };
}

/** Color RGB (0-1) por altura normalizada, azul→naranja (igual que el mapa 2D). */
function altColor(rel, relMax) {
  const t = Math.max(0, Math.min(1, (rel || 0) / relMax));
  const a = [76 / 255, 149 / 255, 1], d = [1, 138 / 255, 76 / 255];
  return [a[0] + (d[0] - a[0]) * t, a[1] + (d[1] - a[1]) * t, a[2] + (d[2] - a[2]) * t];
}

Object.assign(__x, { buildScene3D, altColor });

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
    // Antes del fix GPS, DJI escribe latitude/longitude = 0.000000: no es una
    // posición real (cae en el golfo de Guinea), así que la tratamos como sin dato
    // para que no contamine takeoff, alejamiento, recorrido ni la trayectoria.
    let lat = num(body, 'latitude'), lon = num(body, 'longitude');
    if (lat === 0 && lon === 0) { lat = null; lon = null; }
    rows.push({
      cnt: +m[1], ts: m[2],
      lat, lon,
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

  // origen del vuelo = primer fotograma con GPS válido (no el frame 0, que puede
  // ser previo al fix); el alejamiento y el despegue se miden desde ahí.
  const valid = rows.filter(r => r.lat != null);
  const lat0 = valid.length ? valid[0].lat : null, lon0 = valid.length ? valid[0].lon : null;
  const maxfar = valid.length ? Math.max(...valid.map(r => hav(lat0, lon0, r.lat, r.lon))) : 0;

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
    takeoff: [lat0, lon0],
    land: valid.length ? [valid[valid.length - 1].lat, valid[valid.length - 1].lon] : [null, null],
    center: valid.length
      ? [valid.reduce((s, r) => s + r.lat, 0) / valid.length, valid.reduce((s, r) => s + r.lon, 0) / valid.length]
      : [null, null],
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

__m["js/sun-times.js"] = function (__x, __req) {
// Horas solares del lugar y día del vuelo: amanecer, atardecer y golden hour
// (mañana y tarde), a partir de la elevación solar calculada por solar.js.
// Sirve para decir si el vuelo cazó la buena luz y cuándo volver.

const { solarPosition } = __req("js/solar.js");

/**
 * @param {Date} date día del vuelo (se usa la fecha; se recorre el día entero)
 * @param {number} lat @param {number} lon
 * @returns {{sunrise:number|null, sunset:number|null, goldenMorning:[number,number]|null, goldenEvening:[number,number]|null, noonEl:number}} minutos desde medianoche
 */
function sunTimes(date, lat, lon) {
  const base = new Date(date); base.setHours(0, 0, 0, 0);
  const el = [];
  for (let m = 0; m <= 1440; m += 2) el.push({ m, e: solarPosition(new Date(base.getTime() + m * 60000), lat, lon).elevation });
  const interp = (i, thr) => { const a = el[i - 1], b = el[i]; const f = (thr - a.e) / (b.e - a.e || 1e-9); return a.m + f * (b.m - a.m); };
  const cross = (thr, up) => { for (let i = 1; i < el.length; i++) { const a = el[i - 1].e, b = el[i].e; if (up && a < thr && b >= thr) return interp(i, thr); if (!up && a >= thr && b < thr) return interp(i, thr); } return null; };
  const sunrise = cross(0, true), sunset = cross(0, false);
  const ghMornEnd = cross(6, true), ghEveStart = cross(6, false);
  const noonEl = Math.max(...el.map((x) => x.e));
  return {
    sunrise, sunset, noonEl,
    goldenMorning: (sunrise != null && ghMornEnd != null && ghMornEnd > sunrise) ? [sunrise, ghMornEnd] : null,
    goldenEvening: (ghEveStart != null && sunset != null && sunset > ghEveStart) ? [ghEveStart, sunset] : null,
  };
}

/** ¿El minuto del día `min` cae en alguna golden hour? Devuelve 'morning'|'evening'|null. */
function inGolden(min, times) {
  if (times.goldenMorning && min >= times.goldenMorning[0] && min <= times.goldenMorning[1]) return 'morning';
  if (times.goldenEvening && min >= times.goldenEvening[0] && min <= times.goldenEvening[1]) return 'evening';
  return null;
}

Object.assign(__x, { sunTimes, inGolden });

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

__m["js/title-card.js"] = function (__x, __req) {
// Portada animada para el inicio del trailer: fondo premium, el recorrido del
// vuelo dibujándose con glow, título + lugar con animación de entrada y las
// cifras clave. Se pinta por frame con el progreso p (0..1) y funde a negro al
// final para encadenar con la primera escena.

const FONT = '-apple-system, "SF Pro Display", system-ui, sans-serif';
const ls = (ctx, v) => { if ('letterSpacing' in ctx) ctx.letterSpacing = `${v}px`; };
const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
const ease = (x) => 1 - (1 - Math.max(0, Math.min(1, x))) ** 3;           // easeOutCubic
const easeBack = (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2; };
const seg = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));      // tramo normalizado (en segundos)

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} t instante de la portada (s)
 * @param {number} dur duración total de la portada (s); el fundido de salida ocurre al final
 * @param {{kicker?:string,title?:string,place?:string,accent?:string,track?:Array<[number,number]>,stats?:Array<{label:string,value:string}>}} data
 */
function drawTitleCard(ctx, W, H, t, dur, data) {
  const { kicker = '', title = '', place = '', accent = '#5b9dff', track = [], stats = [] } = data || {};
  const U = Math.min(W, H) * 0.03;
  ctx.save();
  ctx.textAlign = 'center';

  // fondo premium: radial oscuro + glow de acento + viñeta
  let bg = ctx.createRadialGradient(W / 2, H * 0.5, 0, W / 2, H * 0.5, Math.max(W, H) * 0.72);
  bg.addColorStop(0, '#13161f'); bg.addColorStop(1, '#05070b');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  let gl = ctx.createRadialGradient(W / 2, H * 0.56, 0, W / 2, H * 0.56, W * 0.55);
  gl.addColorStop(0, hexA(accent, 0.18)); gl.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
  let vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, Math.max(W, H) * 0.72);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.6)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

  // recorrido dibujándose (glow), en la banda central-inferior
  const T = track.filter((pt) => pt && pt[0] != null);
  if (T.length > 1) {
    const lats = T.map((a) => a[0]), lons = T.map((a) => a[1]);
    const la0 = Math.min(...lats), la1 = Math.max(...lats), lo0 = Math.min(...lons), lo1 = Math.max(...lons);
    const cosLat = Math.cos((la0 + la1) / 2 * Math.PI / 180) || 1;
    const cx = W / 2, cy = H * 0.58, bw = W * 0.46, bh = H * 0.26;
    const spanLo = (lo1 - lo0) * cosLat || 1e-6, spanLa = (la1 - la0) || 1e-6;
    const sc = Math.min(bw / spanLo, bh / spanLa);
    const mLo = (lo0 + lo1) / 2, mLa = (la0 + la1) / 2;
    const PX = (lo) => cx + (lo - mLo) * cosLat * sc, PY = (la) => cy - (la - mLa) * sc;
    const td = ease(seg(t, 0.15, 1.4));
    const n = Math.max(2, Math.floor(T.length * td));
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = hexA(accent, 0.12); ctx.lineWidth = U * 0.3;
    ctx.beginPath(); T.forEach((pt, i) => { const x = PX(pt[1]), y = PY(pt[0]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
    ctx.strokeStyle = accent; ctx.lineWidth = U * 0.36; ctx.shadowColor = accent; ctx.shadowBlur = U * 1.2;
    ctx.beginPath(); for (let i = 0; i < n; i++) { const x = PX(T[i][1]), y = PY(T[i][0]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#37cf6b'; ctx.beginPath(); ctx.arc(PX(T[0][1]), PY(T[0][0]), U * 0.26, 0, 7); ctx.fill();
    if (td < 1) { const pt = T[n - 1]; ctx.fillStyle = '#fff'; ctx.shadowColor = accent; ctx.shadowBlur = U * 1.6; ctx.beginPath(); ctx.arc(PX(pt[1]), PY(pt[0]), U * 0.3, 0, 7); ctx.fill(); ctx.shadowBlur = 0; }
  }

  // kicker (mayúsculas, tracking amplio)
  const kA = ease(seg(t, 0.4, 0.9));
  if (kA > 0 && kicker) {
    ctx.globalAlpha = kA; ctx.textBaseline = 'middle'; ctx.fillStyle = accent;
    ctx.font = `700 ${U * 0.92}px ${FONT}`; ls(ctx, U * 0.42);
    ctx.fillText(kicker.toUpperCase(), W / 2, H * 0.16); ls(ctx, 0); ctx.globalAlpha = 1;
  }
  // título (scale con rebote + fade)
  const tp = seg(t, 0.6, 1.35), tA = ease(tp);
  if (tA > 0 && title) {
    ctx.save(); ctx.globalAlpha = tA; ctx.translate(W / 2, H * 0.28);
    const scv = 0.9 + 0.1 * easeBack(Math.min(1, tp / 0.9)); ctx.scale(scv, scv);
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.font = `800 ${U * 2.5}px ${FONT}`; ls(ctx, U * 0.01);
    ctx.fillText(title, 0, 0); ls(ctx, 0); ctx.restore();
  }
  // lugar (pin + nombre)
  const pA = ease(seg(t, 1.0, 1.5));
  if (pA > 0 && place) {
    ctx.globalAlpha = pA; ctx.textBaseline = 'middle';
    ctx.font = `600 ${U * 1.05}px ${FONT}`;
    const tw = ctx.measureText(place).width, dot = U * 0.85, gap = U * 0.35, x0 = W / 2 - (dot + gap + tw) / 2, y = H * 0.38;
    const px = x0 + dot / 2, py = y;
    ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(px, py - dot * 0.12, dot * 0.4, Math.PI, 0); ctx.lineTo(px, py + dot * 0.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px, py - dot * 0.12, dot * 0.14, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.textAlign = 'left'; ctx.fillText(place, x0 + dot + gap, py);
    ctx.textAlign = 'center'; ctx.globalAlpha = 1;
  }
  // cifras clave (fila inferior, con stagger)
  if (stats.length) {
    const nS = stats.length, gapx = (W * 0.78) / Math.max(1, nS - 1), x0 = nS > 1 ? W / 2 - gapx * (nS - 1) / 2 : W / 2, yv = H * 0.84;
    stats.forEach((st, i) => {
      const a = ease(seg(t, 1.2 + i * 0.18, 1.6 + i * 0.18)); if (a <= 0) return;
      const x = x0 + gapx * i; ctx.globalAlpha = a;
      ctx.fillStyle = '#fff'; ctx.textBaseline = 'alphabetic'; ctx.font = `700 ${U * 1.55}px ${FONT}`; ls(ctx, -U * 0.01);
      ctx.fillText(st.value, x, yv); ls(ctx, 0);
      ctx.fillStyle = accent; ctx.textBaseline = 'top'; ctx.font = `700 ${U * 0.66}px ${FONT}`; ls(ctx, U * 0.12);
      ctx.fillText(st.label.toUpperCase(), x, yv + U * 0.35); ls(ctx, 0); ctx.globalAlpha = 1;
    });
  }

  // fundidos: desde negro al abrir, a negro al cerrar (encadena con la primera escena)
  const dark = Math.max(1 - seg(t, 0, 0.25), seg(t, dur - 0.4, dur));
  if (dark > 0) { ctx.fillStyle = `rgba(0,0,0,${dark})`; ctx.fillRect(0, 0, W, H); }
  ctx.restore();
}

Object.assign(__x, { drawTitleCard });

};

__m["js/video-fx.js"] = function (__x, __req) {
// Filtros de color para el vídeo (estilo edición móvil). Cada efecto combina:
//  1) una cadena de filtros CSS (color/contraste/saturación…), aplicada en la
//     previsualización al <video> y en la exportación al canvas (ctx.filter);
//  2) una segunda capa opcional de superposiciones (halo de color, degradado,
//     viñeta, grano) que se dibuja sobre el vídeo y bajo el HUD.

/** Presets: filtro CSS + capas de superposición. */
const FX = {
  none: { filter: '', layers: [] },
  vivid: { filter: 'saturate(1.5) contrast(1.12)', layers: [] },
  sunset: {
    filter: 'sepia(0.3) saturate(1.35) contrast(1.04) brightness(1.04) hue-rotate(-8deg)',
    layers: [{ type: 'gradient', mode: 'soft-light', stops: [[0, 'rgba(255,120,40,0.40)'], [0.55, 'rgba(255,180,90,0.10)'], [1, 'rgba(120,90,160,0.14)']] }],
  },
  warm: { filter: 'sepia(0.18) saturate(1.2) brightness(1.05)', layers: [{ type: 'color', mode: 'soft-light', color: 'rgba(255,170,80,0.14)' }] },
  cool: { filter: 'saturate(1.1) contrast(1.05) hue-rotate(12deg) brightness(1.02)', layers: [{ type: 'color', mode: 'soft-light', color: 'rgba(60,130,255,0.16)' }] },
  sepia: { filter: 'sepia(0.65) contrast(1.05) brightness(1.02)', layers: [{ type: 'vignette', strength: 0.35 }] },
  bw: { filter: 'grayscale(1) contrast(1.14)', layers: [{ type: 'vignette', strength: 0.42 }] },
  vintage: {
    filter: 'sepia(0.4) saturate(0.82) contrast(0.92) brightness(1.08)',
    layers: [{ type: 'gradient', mode: 'soft-light', stops: [[0, 'rgba(255,180,90,0.14)'], [1, 'rgba(70,50,90,0.16)']] }, { type: 'vignette', strength: 0.45 }, { type: 'grain', alpha: 0.09 }],
  },
  drama: { filter: 'contrast(1.35) saturate(1.1) brightness(0.96)', layers: [{ type: 'vignette', strength: 0.5 }] },
};

/** Orden de los efectos para el selector. */
const FX_KEYS = ['none', 'vivid', 'sunset', 'warm', 'cool', 'sepia', 'bw', 'vintage', 'drama'];

/** Cadena de filtros CSS de un efecto. */
const fxFilter = (key) => FX[key]?.filter || '';

let _grain;
function grainCanvas() {
  if (_grain) return _grain;
  const s = 128, c = document.createElement('canvas'); c.width = s; c.height = s;
  const g = c.getContext('2d'), id = g.createImageData(s, s);
  for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
  g.putImageData(id, 0, 0); _grain = c; return c;
}
let _grainUri;
/** data: URI del patrón de grano, para la previsualización. */
const grainDataUri = () => (_grainUri || (_grainUri = grainCanvas().toDataURL()));

/** Dibuja la segunda capa de un efecto (halo, degradado, viñeta, grano) en el canvas. */
function paintFxLayers(ctx, W, H, key) {
  const layers = FX[key]?.layers; if (!layers?.length) return;
  for (const L of layers) {
    ctx.save();
    if (L.type === 'color') { ctx.globalCompositeOperation = L.mode; ctx.fillStyle = L.color; ctx.fillRect(0, 0, W, H); }
    else if (L.type === 'gradient') { ctx.globalCompositeOperation = L.mode; const g = ctx.createLinearGradient(0, 0, 0, H); for (const [o, col] of L.stops) g.addColorStop(o, col); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    else if (L.type === 'vignette') { const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.32, W / 2, H / 2, Math.max(W, H) * 0.62); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${L.strength})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    else if (L.type === 'grain') { ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = L.alpha; const ox = Math.random() * 128 | 0, oy = Math.random() * 128 | 0; ctx.fillStyle = ctx.createPattern(grainCanvas(), 'repeat'); ctx.translate(-ox, -oy); ctx.fillRect(ox, oy, W, H); }
    ctx.restore();
  }
}

Object.assign(__x, { FX, FX_KEYS, fxFilter, grainDataUri, paintFxLayers });

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
