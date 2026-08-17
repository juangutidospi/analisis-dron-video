import { DjiElement } from '../../../core/DjiElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { styles } from './reading-nav.css.js';

/**
 * Barra de progreso de lectura (arriba) + mini-nav de secciones (lateral).
 * Se le pasa el objetivo por propiedad:
 *   el.target = { scroller: <flight-report>, items: [{ label, el }] }
 */
export class ReadingNav extends DjiElement {
  static styles = [styles];

  set target(v) { this._t = v; if (this.isConnected) this._paint(); }
  get target() { return this._t; }

  render() {
    const items = this._t?.items || [];
    this.shadowRoot.innerHTML = `
      <div class="bar"><i></i></div>
      <nav class="dots" aria-label="Secciones">
        ${items.map((it, i) => `<button class="dot" data-i="${i}"><span class="tip">${escapeHtml(it.label)}</span></button>`).join('')}
      </nav>`;
  }

  afterRender() {
    if (!this._t) return;
    this._bar = this.$('.bar > i');
    this._dots = this.$$('.dot');
    const smooth = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    this._dots.forEach((d, i) => this.on(d, 'click', () =>
      this._t.items[i].el.scrollIntoView({ behavior: smooth, block: 'start' })));
    const onScroll = () => {
      if (this._raf) return;
      this._raf = requestAnimationFrame(() => { this._raf = 0; this._update(); });
    };
    this.on(window, 'scroll', onScroll, { passive: true });
    this.on(window, 'resize', onScroll, { passive: true });
    this._update();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._raf) cancelAnimationFrame(this._raf);
  }

  /** Actualiza el progreso y resalta la sección activa (barato, en rAF). */
  _update() {
    const { scroller, items } = this._t;
    const total = scroller.offsetHeight - innerHeight;
    const scrolled = -scroller.getBoundingClientRect().top;
    const p = total > 0 ? Math.max(0, Math.min(1, scrolled / total)) : 0;
    if (this._bar) this._bar.style.transform = `scaleX(${p})`;
    const line = innerHeight * 0.3;
    let active = 0;
    items.forEach((it, i) => { if (it.el.getBoundingClientRect().top - line <= 0) active = i; });
    this._dots.forEach((d, i) => d.classList.toggle('on', i === active));
  }
}

customElements.define('reading-nav', ReadingNav);
