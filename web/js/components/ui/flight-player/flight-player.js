import { DjiElement } from '../../../core/DjiElement.js';
import { mmss } from '../../../geo.js';
import { t } from '../../../i18n/index.js';
import { DEFAULT_CFG, GAUGE_KEYS } from '../../../hud.js';
import { exportHudVideo } from '../../../hud-export.js';
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
    if (!this._hudCfg) this._hudCfg = { units: DEFAULT_CFG.units, gauges: { ...DEFAULT_CFG.gauges } };
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
    this.$$('.cfg-units button').forEach((b) => this.on(b, 'click', () => {
      cfg.units = b.dataset.u; this.$$('.cfg-units button').forEach((x) => x.classList.toggle('on', x === b)); this._drawHud();
    }));
    const exp = this.$('#exportbtn');
    if (exp) this.on(exp, 'click', () => this._exportVideo());
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
      const blob = await exportHudVideo({ video: this._video, draw: this._hud, cfg: this._cfg(), onProgress: ov.set, signal: ctrl.signal });
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
