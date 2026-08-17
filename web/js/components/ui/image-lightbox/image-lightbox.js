import { DjiElement } from '../../../core/DjiElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { t } from '../../../i18n/index.js';
import { downloadBlob } from '../../../exports.js';
import { grabFullFrame } from '../../../frames.js';
import { styles } from './image-lightbox.css.js';

/**
 * Visor de imagen a pantalla completa, en modo galería por bloques.
 * Se abre con open(items, index, meta):
 *   items = [{ src, label?, time?, metric?, secs? }]  (las imágenes del bloque)
 *   index = posición inicial
 *   meta  = { title?, mp4File? }  (comunes: para nombre de archivo y re-extracción 4K)
 * Las flechas ‹ › (o ←/→) recorren solo las imágenes de ese bloque.
 */
export class ImageLightbox extends DjiElement {
  static styles = [styles];

  constructor() {
    super();
    this._key = (e) => {
      if (e.key === 'Escape') this.close();
      else if (e.key === 'ArrowRight') this._go(1);
      else if (e.key === 'ArrowLeft') this._go(-1);
    };
  }

  render() {
    this.setAttribute('role', 'dialog');
    this.setAttribute('aria-modal', 'true');
    this.shadowRoot.innerHTML = `
      <button class="close" id="x" aria-label="${escapeHtml(t('lightbox.close'))}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
      <button class="nav prev" id="prev" aria-label="${escapeHtml(t('lightbox.prev'))}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>
      </button>
      <button class="nav next" id="next" aria-label="${escapeHtml(t('lightbox.next'))}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>
      </button>
      <figure>
        <img id="img" src="" alt="">
        <span class="count" id="count"></span>
        <figcaption id="cap"></figcaption>
        <div class="dlrow">
          <span class="dllabel">⤓ ${escapeHtml(t('lightbox.download'))}</span>
          <button class="dl" data-fmt="jpg" type="button">JPG</button>
          <button class="dl" data-fmt="png" type="button">PNG <small>${escapeHtml(t('lightbox.lossless'))}</small></button>
        </div>
      </figure>`;
  }

  afterRender() {
    this.on(this, 'click', (e) => { if (e.target === this) this.close(); });
    this.on(this.$('#x'), 'click', () => this.close());
    this.on(this.$('#prev'), 'click', () => this._go(-1));
    this.on(this.$('#next'), 'click', () => this._go(1));
    this.$$('.dl').forEach((b) => this.on(b, 'click', () => this._download(b.dataset.fmt)));
  }

  /** @param {'jpg'|'png'} fmt */
  async _download(fmt) {
    if (!this._src) return;
    const btns = this.$$('.dl');
    const clicked = this.$(`.dl[data-fmt="${fmt}"]`);
    const prev = clicked.innerHTML;
    btns.forEach((b) => (b.disabled = true));
    try {
      // resolución nativa; PNG sin pérdidas o JPG de alta calidad
      if (this._full) {
        clicked.textContent = '…';
        try {
          const type = fmt === 'png' ? 'image/png' : 'image/jpeg';
          const blob = await grabFullFrame(this._full.file, this._full.secs, type, fmt === 'jpg' ? 0.95 : undefined);
          downloadBlob(this._nameBase + '.' + fmt, blob);
          return;
        } catch (e) {
          console.warn('Re-extracción falló; se descarga el fotograma visible.', e);
        }
      }
      // respaldo: descarga el fotograma que se muestra (JPG)
      const blob = await (await fetch(this._src)).blob();
      downloadBlob(this._nameBase + '.jpg', blob);
    } catch (e) {
      console.error(e);
    } finally {
      btns.forEach((b) => (b.disabled = false));
      clicked.innerHTML = prev;
    }
  }

  /**
   * @param {Array<{src:string,label?:string,time?:string,metric?:string,secs?:number}>|string} items
   * @param {number} [index]
   * @param {{title?:string, mp4File?:File}} [meta]
   */
  open(items, index = 0, meta = {}) {
    if (typeof items === 'string') items = [{ src: items, ...meta }]; // compat: una sola imagen
    this._items = (items || []).filter((it) => it && it.src);
    if (!this._items.length) return;
    this._meta = meta;
    this._i = Math.max(0, Math.min(index, this._items.length - 1));
    this.setAttribute('open', '');
    this._show();
    document.addEventListener('keydown', this._key);
  }

  /** Recorre la galería (circular). */
  _go(d) {
    if (!this._items || this._items.length < 2) return;
    const n = this._items.length;
    this._i = (this._i + d + n) % n;
    this._show();
  }

  /** Pinta la imagen actual y actualiza pie, contador y flechas. */
  _show() {
    const it = this._items[this._i];
    this._src = it.src;
    this._full = (this._meta.mp4File && it.secs != null) ? { file: this._meta.mp4File, secs: +it.secs } : null;
    const base = [this._meta.title, it.label, it.time].filter(Boolean).join(' - ') || 'fotograma';
    this._nameBase = base.replace(/:/g, '-').replace(/[/\\?%*|"<>]/g, '').trim();
    const img = this.$('#img');
    img.src = it.src; img.alt = it.label || '';
    this.$('#cap').innerHTML = `${it.time ? `<span class="cap-time">${escapeHtml(it.time)}</span>` : ''}`
      + `${it.metric ? `<span class="cap-metric">${escapeHtml(it.metric)}</span>` : ''}`
      + `${it.label ? `<span>${escapeHtml(it.label)}</span>` : ''}`;
    const many = this._items.length > 1;
    this.$('#prev').hidden = !many;
    this.$('#next').hidden = !many;
    this.$('#count').textContent = many ? `${this._i + 1} / ${this._items.length}` : '';
  }

  close() {
    this.removeAttribute('open');
    this.$('#img').src = '';
    document.removeEventListener('keydown', this._key);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this._key);
  }
}

customElements.define('image-lightbox', ImageLightbox);
