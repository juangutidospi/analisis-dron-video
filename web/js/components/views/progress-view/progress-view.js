import { DjiElement } from '../../../core/DjiElement.js';
import { t } from '../../../i18n/index.js';
import { styles } from './progress-view.css.js';

const STEPS = ['parse', 'model', 'frames', 'map', 'render'];

/**
 * Pantalla de progreso. Muestra los pasos y una barra; el orquestador la
 * controla con setStep(id, status, pct) y stepLabel(id, key).
 */
export class ProgressView extends DjiElement {
  static styles = [styles];

  render() {
    this.shadowRoot.innerHTML = `
      <div class="wrap">
        <div class="progress">
          <h3>${t('progress.title')}</h3>
          <p class="lead">${t('progress.sub')}</p>
          <div class="steps" role="status" aria-live="polite">
            ${STEPS.map((id) => `<div class="pstep" data-step="${id}"><span class="bullet">•</span><span class="lbl" data-key="step.${id}">${t('step.' + id)}</span></div>`).join('')}
          </div>
          <div class="pbar"><span id="fill"></span></div>
        </div>
      </div>`;
  }

  /**
   * @param {string} id  paso
   * @param {'active'|'done'} status
   * @param {number} [pct]
   */
  setStep(id, status, pct) {
    const el = this.$(`[data-step="${id}"]`);
    if (el) {
      if (status === 'active') this.$$('.pstep').forEach((s) => { if (s !== el) s.classList.remove('active'); });
      el.classList.remove('active', 'done'); el.classList.add(status);
      el.querySelector('.bullet').innerHTML = status === 'done' ? '✓' : (status === 'active' ? '<span class="spin"></span>' : '•');
    }
    const fill = this.$('#fill');
    if (pct != null && fill) fill.style.width = pct + '%';
  }

  /** Cambia el rótulo de un paso a otra clave i18n (p. ej. 'step.frames.novideo'). */
  stepLabel(id, key) {
    const lbl = this.$(`[data-step="${id}"] .lbl`);
    if (lbl) { lbl.dataset.key = key; lbl.textContent = t(key); }
  }
}

customElements.define('progress-view', ProgressView);
