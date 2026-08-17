import { css } from '../../../core/css.js';

export const styles = css`
:host { position: fixed; inset: 0; z-index: 35; pointer-events: none; }

/* barra de progreso de lectura (arriba del todo) */
.bar { position: fixed; top: 0; left: 0; right: 0; height: 3px; background: transparent; }
.bar > i {
  display: block; height: 100%; width: 100%; transform: scaleX(0); transform-origin: left center;
  background: linear-gradient(90deg, var(--color-accent-2), var(--color-accent), var(--color-violet));
  box-shadow: 0 0 12px color-mix(in srgb, var(--color-accent) 55%, transparent);
}

/* mini-nav de secciones (lateral derecho) */
.dots {
  position: fixed; right: 16px; top: 50%; transform: translateY(-50%);
  display: flex; flex-direction: column; gap: 12px; pointer-events: auto;
}
.dot {
  position: relative; width: 11px; height: 11px; padding: 0; border-radius: 50%; cursor: pointer;
  border: 1.5px solid color-mix(in srgb, var(--color-text) 42%, transparent); background: transparent;
  transition: transform .18s, border-color .18s, background .18s;
}
.dot:hover { transform: scale(1.25); border-color: var(--color-accent); }
.dot.on {
  background: var(--color-accent); border-color: var(--color-accent);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-accent) 18%, transparent);
}
.dot .tip {
  position: absolute; right: 22px; top: 50%; transform: translateY(-50%) translateX(6px);
  white-space: nowrap; font-size: 12px; font-weight: 600; color: #fff; background: rgba(20,22,28,.92);
  border: 1px solid rgba(255,255,255,.12); padding: 4px 9px; border-radius: 8px;
  opacity: 0; pointer-events: none; transition: opacity .15s, transform .15s; box-shadow: var(--shadow-lg);
}
.dot:hover .tip, .dot.on .tip { opacity: 1; transform: translateY(-50%) translateX(0); }

@media (max-width: 1180px) { .dots { display: none; } }
@media (prefers-reduced-motion: reduce) { .dot, .dot .tip { transition: none; } }
`;
