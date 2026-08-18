import { DjiElement } from '../../../core/DjiElement.js';
import { mmss } from '../../../geo.js';
import { t } from '../../../i18n/index.js';
import { DEFAULT_CFG, GAUGE_KEYS } from '../../../hud.js';
import { exportHudVideo } from '../../../hud-export.js';
import { generateAmbient, STYLES } from '../../../music-gen.js';
import { downloadBlob } from '../../../exports.js';
import { styles } from './flight-player.css.js';

/**
 * Barra de reproducción del vuelo (flotante). Recibe el reloj por propiedad:
 *   el.clock = playerClock
 * y traduce sus acciones (play/pausa, buscar, velocidad) al reloj.
 */
export class FlightPlayer extends DjiElement {
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
            <div class="cfg-chips">${['heading', 'clock', 'minimap', 'progress', 'watermark'].map((k) => this._chipTpl(k, cfg)).join('')}</div>
          </div>
          <div class="cfg-sec">
            <span class="cfg-t">${t('hud.theme')}</span>
            <div class="cfg-units">
              <button class="${cfg.theme === 'modern' ? 'on' : ''}" data-th="modern" type="button">${t('hud.theme.modern')}</button>
              <button class="${cfg.theme === 'aviation' ? 'on' : ''}" data-th="aviation" type="button">${t('hud.theme.aviation')}</button>
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
    } else {
      pip.classList.remove('on');
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
  }

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
    const keys = Object.keys(STYLES);
    this._genIdx = ((this._genIdx ?? -1) + 1) % keys.length;
    const style = keys[this._genIdx];
    const gen = this.$('#musicgen');
    if (gen) { gen.disabled = true; gen.textContent = '⏳ ' + t('hud.music.generating'); }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this._musicAC = this._musicAC || new AC();
      const dur = Math.min(120, Math.max(20, this._clock?.dur || 60));
      const buf = await generateAmbient(this._musicAC.sampleRate, dur, style);
      this._music = null; this._musicGen = true; this._musicStart = 0;
      this._musicName = t('hud.music.ambient') + ' · ' + t('hud.music.style.' + style);
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
      const blob = await exportHudVideo({ video: this._video, draw: this._hud, cfg: this._cfg(), musicBuffer: this._musicBuf, musicVolume: this._musicVolEff(), musicStart: this._musicStart || 0, onProgress: ov.set, signal: ctrl.signal });
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
    this._hud(ctx, this._clock.t, w, h, this._cfg());
  }
}

customElements.define('flight-player', FlightPlayer);
