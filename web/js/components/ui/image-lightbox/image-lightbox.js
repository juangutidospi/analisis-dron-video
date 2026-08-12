import { DjiElement } from '../../../core/DjiElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { t } from '../../../i18n/index.js';
import { styles } from './image-lightbox.css.js';

/** Visor de imagen a pantalla completa. Se abre con open(src, {time, metric, label}). */
export class ImageLightbox extends DjiElement {
  static styles = [styles];

  constructor() {
    super();
    this._esc = (e) => { if (e.key === 'Escape') this.close(); };
  }

  render() {
    this.setAttribute('role', 'dialog');
    this.setAttribute('aria-modal', 'true');
    this.shadowRoot.innerHTML = `
      <button class="close" id="x" aria-label="${escapeHtml(t('lightbox.close'))}">✕</button>
      <figure>
        <img id="img" src="" alt="">
        <figcaption id="cap"></figcaption>
      </figure>`;
  }

  afterRender() {
    this.on(this, 'click', (e) => { if (e.target === this) this.close(); });
    this.on(this.$('#x'), 'click', () => this.close());
  }

  /** @param {string} src @param {{time?:string, metric?:string, label?:string}} [cap] */
  open(src, cap = {}) {
    if (!src) return;
    const img = this.$('#img');
    img.src = src; img.alt = cap.label || '';
    this.$('#cap').innerHTML = `${cap.time ? `<span class="cap-time">${escapeHtml(cap.time)}</span>` : ''}`
      + `${cap.metric ? `<span class="cap-metric">${escapeHtml(cap.metric)}</span>` : ''}`
      + `${cap.label ? `<span>${escapeHtml(cap.label)}</span>` : ''}`;
    this.setAttribute('open', '');
    document.addEventListener('keydown', this._esc);
  }

  close() {
    this.removeAttribute('open');
    this.$('#img').src = '';
    document.removeEventListener('keydown', this._esc);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this._esc);
  }
}

customElements.define('image-lightbox', ImageLightbox);
