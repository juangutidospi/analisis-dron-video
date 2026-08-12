import { DjiElement } from '../../../core/DjiElement.js';
import { timeChart } from '../../../charts.js';
import { styles } from './time-chart.css.js';

/**
 * Gráfica de series temporales. Recibe los datos por propiedad:
 *   el.data = { series, dur, cfgs }
 */
export class TimeChart extends DjiElement {
  static styles = [styles];

  /** @param {{series:Array, dur:number, cfgs:Array}} v */
  set data(v) { this._data = v; if (this.isConnected) this._paint(); }
  get data() { return this._data; }

  render() {
    this.shadowRoot.innerHTML = `<div class="chartbox" id="box"></div>`;
  }

  afterRender() {
    const d = this._data;
    if (!d) return;
    timeChart(this.$('#box'), d.series, d.dur, d.cfgs);
  }
}

customElements.define('time-chart', TimeChart);
