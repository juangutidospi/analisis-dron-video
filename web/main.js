// Orquestador de la web (chrome global en light DOM + cambio de vista).
// Migrado al patrón de Web Components: landing y progreso son componentes; el
// informe se genera de momento con buildReport (se migrará a <flight-report>).
import './js/components/views/upload-view/upload-view.js';
import './js/components/views/progress-view/progress-view.js';
import { t, setLang, getLang, initLang } from './js/i18n/index.js';
import './js/components/views/flight-report/flight-report.js';
import { parseSRT } from './js/srt.js';
import { keypoints } from './js/geo.js';
import { grabFrames } from './js/frames.js';

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

async function generate({ srtText, mp4, title }) {
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

    const assets = { title, kps, hasFrames: false };
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
