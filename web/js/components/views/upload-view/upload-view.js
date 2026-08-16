import { DjiElement } from '../../../core/DjiElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { t } from '../../../i18n/index.js';
import { reverseGeocode, firstCoords } from '../../../geocode.js';
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
          <button class="addmp4" id="addmp4" type="button">
            <span class="mp4-ico">🎬</span>
            <span class="mp4-txt"><span class="mp4-t">${escapeHtml(t('form.add_mp4'))}</span><span class="mp4-sub">${escapeHtml(t('form.add_mp4.sub'))}</span></span>
            <span class="mp4-badge">${escapeHtml(t('form.recommended'))}</span>
          </button>
          <button class="go" id="go" type="button">${escapeHtml(t('form.generate'))}</button>
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
    this.on(this.$('#title'), 'input', () => { this._titleEdited = true; });
    this.on(dz, 'dz:change', (e) => {
      this.files = e.detail;
      this.$('#gen').classList.toggle('hidden', !this.files.srt);
      this._updateMp4Btn();
      if (this.files.srtText) this._suggestTitle(this.files.srtText);
    });
    this.on(this.$('#addmp4'), 'click', () => dz.pickMp4());
    this._updateMp4Btn();
    this.on(this.$('#go'), 'click', () => {
      if (!this.files.srtText) return;
      const title = (this.$('#title').value || '').trim() || t('form.default_title');
      this.emit('dji:generate', { srtText: this.files.srtText, mp4: this.files.mp4, title, place: this._place || null });
    });
  }

  /** Refleja en el botón si ya hay vídeo (estado "añadido"). */
  _updateMp4Btn() {
    const btn = this.$('#addmp4'); if (!btn) return;
    const has = !!(this.files && this.files.mp4);
    btn.classList.toggle('has', has);
    const ico = btn.querySelector('.mp4-ico'), tt = btn.querySelector('.mp4-t'), sub = btn.querySelector('.mp4-sub'), badge = btn.querySelector('.mp4-badge');
    if (has) { ico.textContent = '✓'; tt.textContent = t('form.mp4_added'); sub.textContent = this.files.mp4.name; badge.hidden = true; }
    else { ico.textContent = '🎬'; tt.textContent = t('form.add_mp4'); sub.textContent = t('form.add_mp4.sub'); badge.hidden = false; }
  }

  /** Prerellena el título con el lugar del vuelo (geocodificación inversa). */
  async _suggestTitle(srtText) {
    if (this._geoSrt === srtText || this._titleEdited) return;
    this._geoSrt = srtText;
    const c = firstCoords(srtText);
    if (!c) return;
    const place = await reverseGeocode(c[0], c[1]);
    if (!place) return;
    this._place = place;
    const input = this.$('#title');
    if (input && !this._titleEdited) input.value = t('form.title_place', { place });
  }
}

customElements.define('upload-view', UploadView);
