import { DjiElement } from '../../../core/DjiElement.js';
import { buildMap } from '../../../satmap.js';
import { t } from '../../../i18n/index.js';
import { styles } from './sat-map.css.js';

/**
 * Mapa de satélite con el recorrido. Recibe los datos por propiedad:
 *   el.flight = { model, kps }
 */
export class SatMap extends DjiElement {
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
