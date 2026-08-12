import { DjiElement } from '../../../core/DjiElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { styles } from './moment-card.css.js';

/** Tarjeta de un momento del vuelo. Atributos: time, label, metric, sub; propiedad .img (dataURL). */
export class MomentCard extends DjiElement {
  static styles = [styles];
  static observedAttributes = ['time', 'label', 'metric', 'sub'];

  attributeChangedCallback() { if (this.isConnected) this._paint(); }

  render() {
    const img = this.img || this.getAttribute('img');
    this.shadowRoot.innerHTML = `
      <div class="mo">
        <div class="img${img ? ' clickable' : ''}">
          ${img ? `<img src="${img}" alt="${escapeHtml(this.getAttribute('label'))}">` : `<div class="ph"><span class="ico">🎞️</span></div>`}
          <span class="t">${escapeHtml(this.getAttribute('time'))}</span>
        </div>
        <div class="cap">
          <div class="label">${escapeHtml(this.getAttribute('label'))}</div>
          <div class="metric">${escapeHtml(this.getAttribute('metric'))}</div>
          <div class="sub">${escapeHtml(this.getAttribute('sub'))}</div>
        </div>
      </div>`;
  }

  afterRender() {
    const img = this.img || this.getAttribute('img');
    const box = this.$('.img.clickable');
    if (img && box) {
      box.setAttribute('role', 'button');
      box.setAttribute('tabindex', '0');
      const open = () => this.emit('moment:open', {
        img, time: this.getAttribute('time'), metric: this.getAttribute('metric'), label: this.getAttribute('label'),
      });
      this.on(box, 'click', open);
      this.on(box, 'keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    }
  }
}

customElements.define('moment-card', MomentCard);
