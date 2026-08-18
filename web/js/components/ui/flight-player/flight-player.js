import { DjiElement } from '../../../core/DjiElement.js';
import { mmss } from '../../../geo.js';
import { t } from '../../../i18n/index.js';
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
    this.shadowRoot.innerHTML = `
      <div class="stage" id="stage"></div>
      <div class="stack">
        <div class="pip" id="pip">
          <canvas class="hud" id="hud"></canvas>
          <button class="expand" id="expand" type="button" aria-label="${t('player.expand')}">⤢</button>
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
    this.on(this.$('#expand'), 'click', () => this._toggleBig());
    this.on(this.$('#stage'), 'click', () => { if (this._big) this._toggleBig(); }); // clic fuera reduce
    if (this._big) this._applyBig();
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
    this._hud(ctx, this._clock.t, w, h);
  }
}

customElements.define('flight-player', FlightPlayer);
