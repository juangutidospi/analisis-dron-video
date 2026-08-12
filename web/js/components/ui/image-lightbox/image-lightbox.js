import { DjiElement } from '../../../core/DjiElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { t } from '../../../i18n/index.js';
import { downloadBlob } from '../../../exports.js';
import { grabFullFrame } from '../../../frames.js';
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
        <button class="dl" id="dl" type="button">⤓ <span>${escapeHtml(t('lightbox.download'))}</span></button>
      </figure>`;
  }

  afterRender() {
    this.on(this, 'click', (e) => { if (e.target === this) this.close(); });
    this.on(this.$('#x'), 'click', () => this.close());
    this.on(this.$('#dl'), 'click', () => this._download());
  }

  async _download() {
    if (!this._src) return;
    const b = this.$('#dl');
    const label = b.querySelector('span');
    b.disabled = true;
    const prev = label.textContent;
    try {
      // si hay vídeo + tiempo, re-extrae el fotograma a resolución nativa sin pérdidas (PNG)
      let src = this._src, name = this._name;
      if (this._full) {
        label.textContent = t('lightbox.downloading');
        src = await grabFullFrame(this._full.file, this._full.secs);
        name = name.replace(/\.jpg$/, '.png');
      }
      const blob = await (await fetch(src)).blob();
      downloadBlob(name, blob);
    } catch (e) {
      console.error(e);
    } finally {
      b.disabled = false; label.textContent = prev;
    }
  }

  /** @param {string} src @param {{time?:string, metric?:string, label?:string, title?:string}} [cap] */
  open(src, cap = {}) {
    if (!src) return;
    this._src = src;
    this._full = (cap.mp4File && cap.secs != null) ? { file: cap.mp4File, secs: +cap.secs } : null;
    const base = [cap.title, cap.label, cap.time].filter(Boolean).join(' - ') || 'fotograma';
    this._name = base.replace(/:/g, '-').replace(/[/\\?%*|"<>]/g, '').trim() + '.jpg';
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
