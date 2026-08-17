import { DjiElement } from '../../../core/DjiElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { getLang } from '../../../i18n/index.js';
import { styles } from './stat-tile.css.js';

/** Una cifra con su rótulo y pista. Atributos: value, unit, label, hint, [hero]. */
export class StatTile extends DjiElement {
  static styles = [styles];
  static observedAttributes = ['value', 'unit', 'label', 'hint'];

  attributeChangedCallback() { if (this.isConnected) this._paint(); }

  connectedCallback() {
    super.connectedCallback();
    this._setupCounter();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._io?.disconnect(); this._io = null;
  }

  render() {
    const unit = this.getAttribute('unit');
    const hint = this.getAttribute('hint');
    this.shadowRoot.innerHTML = `
      <div class="tile">
        <div class="v">${escapeHtml(this.getAttribute('value'))}${unit ? ` <small>${escapeHtml(unit)}</small>` : ''}</div>
        <div class="l">${escapeHtml(this.getAttribute('label'))}</div>
        ${hint ? `<div class="k">${escapeHtml(hint)}</div>` : ''}
      </div>`;
  }

  /** Prepara el contador ascendente: se dispara una vez al entrar en pantalla. */
  _setupCounter() {
    if (this._io || this._counted) return;
    const spec = this._counterSpec(this.getAttribute('value') || '');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!spec || reduce || !('IntersectionObserver' in window)) return; // muestra el valor tal cual
    this._io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        this._io.disconnect(); this._io = null;
        this._runCount(spec);
      }
    }, { threshold: 0.4 });
    this._io.observe(this);
  }

  /**
   * Analiza el valor formateado y decide si es un número animable.
   * Ignora tiempos (`5:31`) y rangos (`859–870`). Devuelve {target, dec, original} o null.
   */
  _counterSpec(raw) {
    const s = String(raw).trim();
    if (!s || /:/.test(s) || /\d\s*[–—-]\s*\d/.test(s)) return null;
    const decIdx = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'));
    let dec = 0, norm;
    if (decIdx > -1) {
      const after = s.length - decIdx - 1;
      if (after >= 1 && after <= 2) { // separador decimal
        dec = after;
        norm = s.slice(0, decIdx).replace(/[.,\s]/g, '') + '.' + s.slice(decIdx + 1);
      } else { // agrupador de miles
        norm = s.replace(/[.,\s]/g, '');
      }
    } else {
      norm = s.replace(/[.,\s]/g, '');
    }
    const target = parseFloat(norm);
    if (!isFinite(target)) return null;
    return { target, dec, original: s };
  }

  /** Cuenta de 0 al valor con easeOut; el último fotograma fija el texto exacto original. */
  _runCount(spec) {
    this._counted = true;
    const vEl = this.shadowRoot.querySelector('.v');
    if (!vEl) return;
    const unit = this.getAttribute('unit');
    const suffix = unit ? ` <small>${escapeHtml(unit)}</small>` : '';
    const locale = getLang() === 'es' ? 'es-ES' : 'en-US';
    const fmt = (n) => n.toLocaleString(locale, { minimumFractionDigits: spec.dec, maximumFractionDigits: spec.dec });
    const dur = 1100, t0 = performance.now();
    const ease = (x) => 1 - Math.pow(1 - x, 3);
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      vEl.innerHTML = escapeHtml(fmt(spec.target * ease(p))) + suffix;
      if (p < 1) requestAnimationFrame(step);
      else vEl.innerHTML = escapeHtml(spec.original) + suffix; // estado final exacto
    };
    requestAnimationFrame(step);
  }
}

customElements.define('stat-tile', StatTile);
