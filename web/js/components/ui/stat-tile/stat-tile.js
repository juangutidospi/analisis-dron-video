import { DjiElement } from '../../../core/DjiElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { styles } from './stat-tile.css.js';

/** Una cifra con su rótulo y pista. Atributos: value, unit, label, hint, [hero]. */
export class StatTile extends DjiElement {
  static styles = [styles];
  static observedAttributes = ['value', 'unit', 'label', 'hint'];

  attributeChangedCallback() { if (this.isConnected) this._paint(); }

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
}

customElements.define('stat-tile', StatTile);
