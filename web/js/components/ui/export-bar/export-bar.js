import { DjiElement } from '../../../core/DjiElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { t } from '../../../i18n/index.js';
import { toGPX, toKML, toCSV, download, downloadBlob } from '../../../exports.js';
import { buildKMZ } from '../../../kmz.js';
import { buildStandaloneHtml } from '../../../export-html.js';
import { styles } from './export-bar.css.js';

/** Botones de descarga del vuelo. Recibe los datos por propiedad: el.flight = { model, assets }. */
export class ExportBar extends DjiElement {
  static styles = [styles];

  /** @param {{model:object, assets:object}} v */
  set flight(v) { this._flight = v; if (this.isConnected) this._paint(); }
  get flight() { return this._flight; }

  render() {
    this.shadowRoot.innerHTML = `
      <div class="exports">
        <button class="exp-btn exp-kmz" data-exp="kmz" type="button">${t('exp.kmz')}</button>
        <button class="exp-btn" data-exp="html" type="button">📄 ${t('exp.html')}</button>
        <button class="exp-btn" data-exp="gpx" type="button">🛰️ GPX</button>
        <button class="exp-btn" data-exp="kml" type="button">🗺️ KML</button>
        <button class="exp-btn" data-exp="csv" type="button">📊 CSV</button>
      </div>
      <p class="note">${t('exp.note')}</p>
      <p class="note kmz-hint hidden" id="kmzHint"></p>`;
  }

  afterRender() {
    this.$$('[data-exp]').forEach((b) => this.on(b, 'click', () => this._download(b)));
  }

  _download(b) {
    const f = this._flight;
    if (!f) return;
    const { model, assets } = f, name = assets.title || 'vuelo';
    const kind = b.dataset.exp;
    if (kind === 'gpx') download(name + '.gpx', toGPX(model, name), 'application/gpx+xml');
    if (kind === 'kml') download(name + '.kml', toKML(model, name), 'application/vnd.google-earth.kml+xml');
    if (kind === 'csv') download(name + '.csv', toCSV(model), 'text/csv');
    if (kind === 'html') {
      const report = this.getRootNode().host; // el <flight-report>
      const theme = document.documentElement.getAttribute('data-theme') || '';
      download(name + '.html', buildStandaloneHtml(report, { title: name, theme }), 'text/html');
    }
    if (kind === 'kmz') {
      const prev = b.textContent; b.disabled = true; b.textContent = t('exp.kmz.gen');
      try {
        const { blob, filename } = buildKMZ(model, assets);
        downloadBlob(filename, blob);
        this._showKmzHint();
      } catch (e) { console.error(e); alert(t('exp.kmz.error', { msg: e.message })); }
      finally { b.disabled = false; b.textContent = prev; }
    }
  }

  /** Muestra cómo abrir el KMZ (Google Earth Pro o Earth Web). */
  _showKmzHint() {
    const hint = this.$('#kmzHint');
    const link = `<a href="https://earth.google.com/web/" target="_blank" rel="noopener">${escapeHtml(t('exp.earthweb'))} ↗</a>`;
    hint.innerHTML = t('exp.kmz.hint', { link });
    hint.classList.remove('hidden');
  }
}

customElements.define('export-bar', ExportBar);
