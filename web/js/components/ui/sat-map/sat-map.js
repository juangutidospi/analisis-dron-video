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
  }

  /** Mueve el dron al instante t (reproducción). */
  playhead(t) { this._map && this._map.setPlayhead(t); }

  /** Esconde el dron. */
  clearPlayhead() { this._map && this._map.clearPlayhead(); }
}

customElements.define('sat-map', SatMap);
