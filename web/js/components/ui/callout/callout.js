import { DjiElement } from '../../../core/DjiElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { styles } from './callout.css.js';

/** Aviso con título y cuerpo (por slot, admite HTML). Atributos: variant (warn|good), title. */
export class AppCallout extends DjiElement {
  static styles = [styles];
  static observedAttributes = ['title', 'variant'];

  attributeChangedCallback() { if (this.isConnected) this._paint(); }

  render() {
    this.shadowRoot.innerHTML = `
      <div class="callout">
        <b>${escapeHtml(this.getAttribute('title'))}</b>
        <slot></slot>
      </div>`;
  }
}

customElements.define('app-callout', AppCallout);
