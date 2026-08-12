// Orquestador de la web: pantalla de subida, procesado en el navegador y render del informe.
import { parseSRT } from './srt.js';
import { keypoints } from './geo.js';
import { grabFrames } from './frames.js';
import { buildReport } from './report.js';

const app = document.getElementById('app');
const state = { srt: null, srtText: null, mp4: null, title: 'Vuelo con DJI Neo 2' };

/* ---------- tema ---------- */
function initTheme() {
  const btn = document.getElementById('themeBtn');
  const saved = localStorage.getItem('dji-theme');
  if (saved === 'light') { document.documentElement.setAttribute('data-theme', 'light'); btn.textContent = '☀️'; }
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

    <div class="drop" id="drop">
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
      <div class="steps">${STEPS.map(([id, t]) => `<div class="pstep" data-step="${id}"><span class="bullet">•</span><span>${t}</span></div>`).join('')}</div>
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
    if (state.mp4) {
      step('frames', 'active', 44);
      const dur = model.meta.dur;
      const kpTimes = kps.map(k => k.t);
      const lightTimes = [dur * 0.15, dur * 0.5, dur * 0.92];
      const heroT = kps.find(k => k.key === 'hi')?.t ?? dur * 0.3;
      const times = [...kpTimes, ...lightTimes, heroT];
      let done = 0;
      const frames = await grabFrames(state.mp4, times, (p) => step('frames', 'active', 44 + Math.round(p * 26)));
      kps.forEach((k, i) => k.frame = frames[i]);
      assets.light = frames.slice(kpTimes.length, kpTimes.length + 3);
      assets.hero = frames[frames.length - 1];
      assets.hasFrames = true;
      step('frames', 'done', 70);
    } else {
      step('frames', 'done', 70);
      const s = app.querySelector('[data-step="frames"]'); if (s) s.querySelector('span:last-child').textContent = 'Sin vídeo: se omiten los fotogramas';
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
