import { DjiElement } from '../../../core/DjiElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { t } from '../../../i18n/index.js';
import '../../ui/drop-zone/drop-zone.js';
import { styles } from './upload-view.css.js';

/**
 * Pantalla de subida (landing). Reúne la zona de subida, el título y el botón
 * de generar; emite `dji:generate` con { srtText, mp4, title }.
 */
export class UploadView extends DjiElement {
  static styles = [styles];

  constructor() {
    super();
    /** @type {{srt: File|null, srtText: string|null, mp4: File|null}} */
    this.files = { srt: null, srtText: null, mp4: null };
  }

  render() {
    this.shadowRoot.innerHTML = `
      <div class="hero">
        <span class="eyebrow-pill">${escapeHtml(t('landing.eyebrow'))}</span>
        <h1>${escapeHtml(t('landing.title'))}</h1>
        <p class="sub">${escapeHtml(t('landing.sub'))}</p>

        <drop-zone id="dz"></drop-zone>

        <div class="gen ${this.files.srt ? '' : 'hidden'}" id="gen">
          <label>${escapeHtml(t('form.title_label'))}</label>
          <input id="title" value="${escapeHtml(t('form.default_title'))}">
          <button class="go" id="go" type="button">${escapeHtml(t('form.generate'))}</button>
          <button class="addmp4" id="addmp4" type="button">${escapeHtml(t('form.add_mp4'))}</button>
        </div>

        <div class="feats">
          ${this._feat('🛰️', 'feat.map')}
          ${this._feat('🎥', 'feat.frames')}
          ${this._feat('🎯', 'feat.gimbal')}
        </div>
      </div>`;
  }

  _feat(icon, key) {
    return `<div class="feat"><div class="fi">${icon}</div><h4>${escapeHtml(t(key + '.t'))}</h4><p>${escapeHtml(t(key + '.d'))}</p></div>`;
  }

  afterRender() {
    const dz = this.$('#dz');
    this.on(dz, 'dz:change', (e) => {
      this.files = e.detail;
      this.$('#gen').classList.toggle('hidden', !this.files.srt);
    });
    this.on(this.$('#addmp4'), 'click', () => dz.pickMp4());
    this.on(this.$('#go'), 'click', () => {
      if (!this.files.srtText) return;
      const title = (this.$('#title').value || '').trim() || t('form.default_title');
      this.emit('dji:generate', { srtText: this.files.srtText, mp4: this.files.mp4, title });
    });
  }
}

customElements.define('upload-view', UploadView);
