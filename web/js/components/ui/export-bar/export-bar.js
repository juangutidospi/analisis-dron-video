import { DjiElement } from '../../../core/DjiElement.js';
import { t } from '../../../i18n/index.js';
import { toGPX, toKML, toCSV, download, downloadBlob } from '../../../exports.js';
import { buildKMZ } from '../../../kmz.js';
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
        <button class="exp-btn" data-exp="gpx" type="button">🛰️ GPX</button>
        <button class="exp-btn" data-exp="kml" type="button">🗺️ KML</button>
        <button class="exp-btn" data-exp="csv" type="button">📊 CSV</button>
      </div>
      <p class="note">${t('exp.note')}</p>`;
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
    if (kind === 'kmz') {
      const prev = b.textContent; b.disabled = true; b.textContent = t('exp.kmz.gen');
      try { const { blob, filename } = buildKMZ(model, assets); downloadBlob(filename, blob); }
      catch (e) { console.error(e); alert(t('exp.kmz.error', { msg: e.message })); }
      finally { b.disabled = false; b.textContent = prev; }
    }
  }
}

customElements.define('export-bar', ExportBar);
