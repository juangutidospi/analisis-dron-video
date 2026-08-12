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

  render() {
    this.shadowRoot.innerHTML = `
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
      </div>`;
  }

  afterRender() {
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
