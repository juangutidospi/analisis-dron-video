import { css } from '../../../core/css.js';

export const styles = css`
:host { display: block; }
/* Llena el bloque a lo ancho y se limita por alto (74vh) sin deformar. */
.map-wrap { position: relative; width: min(100%, calc(74vh * var(--ar, 1.5))); margin: 0 auto; border-radius: 14px; overflow: hidden; }
.map-svg { border-radius: 14px; display: block; width: 100%; height: auto; }
.map-wrap.loading::before {
  content: ""; position: absolute; inset: 0; z-index: 2; border-radius: 14px;
  background: linear-gradient(100deg, var(--color-tile) 30%, color-mix(in srgb, var(--color-text) 8%, var(--color-tile)) 50%, var(--color-tile) 70%);
  background-size: 220% 100%; animation: shimmer 1.3s ease-in-out infinite;
}
.map-loading { position: absolute; inset: 0; z-index: 3; display: grid; place-items: center; color: var(--color-text-muted); font-size: 13px; }
.map-wrap:not(.loading) .map-loading { display: none; }
@keyframes shimmer { 0% { background-position: 130% 0; } 100% { background-position: -130% 0; } }
@media (prefers-reduced-motion: reduce) { .map-wrap.loading::before { animation: none; } }

.kp-overlay { position: absolute; inset: 0; pointer-events: none; }
.kp-btn { position: absolute; width: 42px; height: 42px; margin: -21px 0 0 -21px; border: none; background: transparent; cursor: pointer; pointer-events: auto; }
.kp-tip {
  position: absolute; left: 50%; bottom: calc(100% - 12px); transform: translateX(-50%); width: 184px;
  background: var(--color-surface-solid); border: 1px solid var(--color-divider); border-radius: 12px; overflow: hidden;
  box-shadow: var(--shadow-lg); opacity: 0; visibility: hidden; transition: opacity .12s; z-index: 9;
}
.kp-tip.left { left: auto; right: calc(50% - 21px); transform: none; }
.kp-tip.right { left: calc(50% - 21px); transform: none; }
.kp-tip img { width: 100%; display: block; aspect-ratio: 16/9; object-fit: cover; }
.kp-b { display: block; padding: 8px 11px; }
.kp-l { display: block; font-size: 12.5px; font-weight: 700; }
.kp-m { display: block; font-size: 11.5px; color: color-mix(in srgb, var(--color-text) 74%, transparent); margin-top: 1px; }
.kp-btn:hover .kp-tip, .kp-btn:focus .kp-tip { opacity: 1; visibility: visible; }
`;
