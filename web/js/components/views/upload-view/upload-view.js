import { DjiElement } from '../../../core/DjiElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { t, getLang } from '../../../i18n/index.js';
import { reverseGeocode, firstCoords } from '../../../geocode.js';
import '../../ui/drop-zone/drop-zone.js';
import { styles } from './upload-view.css.js';

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
export class UploadView extends DjiElement {
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
