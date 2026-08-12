import { DjiElement } from '../../../core/DjiElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { t } from '../../../i18n/index.js';
import { styles } from './drop-zone.css.js';

/**
 * Zona de subida del .SRT (y .MP4 opcional). Mantiene el estado de los archivos
 * y emite `dz:change` con { srt, srtText, mp4 } cada vez que cambia.
 */
export class DropZone extends DjiElement {
  static styles = [styles];

  constructor() {
    super();
    /** @type {{srt: File|null, srtText: string|null, mp4: File|null}} */
    this.state = { srt: null, srtText: null, mp4: null };
  }

  render() {
    const s = this.state;
    this.shadowRoot.innerHTML = `
      ${this._dropTpl}
      <input type="file" id="srt" accept=".srt,.SRT" class="hidden">
      <input type="file" id="mp4" accept=".mp4,.MP4,.mov,.MOV" class="hidden">`;
  }

  get _dropTpl() {
    const s = this.state;
    return `
      <div class="drop" id="drop" role="button" tabindex="0" aria-label="${escapeHtml(t('drop.title'))}">
        <div class="ico">📈</div>
        <h3>${escapeHtml(t('drop.title'))}</h3>
        <p class="hint">${escapeHtml(t('drop.hint'))}</p>
        <button class="cta" id="pick" type="button">${escapeHtml(t('drop.cta'))}</button>
        <div class="files">
          <span class="chip ${s.srt ? 'ok' : ''}">${t('drop.srt')}: <b>${escapeHtml(s.srt ? s.srt.name : t('drop.none'))}</b></span>
          <span class="chip ${s.mp4 ? 'ok' : ''}">${t('drop.mp4')}: <b>${escapeHtml(s.mp4 ? s.mp4.name : t('drop.optional'))}</b></span>
        </div>
        <p class="note">${s.srt && !s.mp4 ? escapeHtml(t('drop.novideo')) : ''}</p>
      </div>`;
  }

  afterRender() {
    const drop = this.$('#drop'), srtIn = this.$('#srt'), mp4In = this.$('#mp4');
    this.on(this.$('#pick'), 'click', (e) => { e.stopPropagation(); srtIn.click(); });
    this.on(drop, 'click', () => srtIn.click());
    this.on(drop, 'keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); srtIn.click(); } });
    this.on(srtIn, 'change', () => this._take(srtIn.files));
    this.on(mp4In, 'change', () => this._take(mp4In.files));
    ['dragover', 'dragenter'].forEach((ev) => this.on(drop, ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach((ev) => this.on(drop, ev, (e) => { e.preventDefault(); if (ev === 'dragleave' && drop.contains(e.relatedTarget)) return; drop.classList.remove('over'); }));
    this.on(drop, 'drop', (e) => this._take(e.dataTransfer.files));
  }

  /** Abre el selector de MP4 (lo dispara la vista con su botón). */
  pickMp4() { this.$('#mp4').click(); }

  async _take(fileList) {
    for (const file of fileList) {
      const n = file.name.toLowerCase();
      if (n.endsWith('.srt')) { this.state.srt = file; this.state.srtText = await file.text(); }
      else if (n.endsWith('.mp4') || n.endsWith('.mov')) this.state.mp4 = file;
    }
    this._paint();
    this.emit('dz:change', { ...this.state });
  }
}

customElements.define('drop-zone', DropZone);
