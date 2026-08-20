import { css } from '../../../core/css.js';

export const styles = css`
:host { display: block; }
.v3d {
  position: relative; width: 100%; aspect-ratio: 16 / 10; border-radius: 16px; overflow: hidden;
  background: radial-gradient(120% 120% at 50% 0%, #1b2740 0%, #0d131f 70%);
  border: 1px solid var(--color-divider);
}
canvas { display: block; width: 100%; height: 100%; touch-action: none; cursor: grab; }
canvas:active { cursor: grabbing; }

/* estado de carga */
.v3d.loading::after {
  content: ""; position: absolute; inset: 0; z-index: 4;
  background: linear-gradient(100deg, #131c2c 30%, #1c2840 50%, #131c2c 70%);
  background-size: 220% 100%; animation: shimmer 1.3s ease-in-out infinite;
}
.v3d-loading {
  position: absolute; inset: 0; z-index: 5; display: grid; place-items: center;
  color: #aeb8cc; font-size: 13px; text-align: center; padding: 0 24px; pointer-events: none;
}
.v3d:not(.loading) .v3d-loading { display: none; }
@keyframes shimmer { 0% { background-position: 130% 0; } 100% { background-position: -130% 0; } }

/* controles */
.v3d-bar {
  position: absolute; left: 12px; right: 12px; bottom: 12px; z-index: 6;
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px; border-radius: 100px;
  background: rgba(12,17,26,.62); backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,.1);
}
.v3d-btn {
  flex: none; display: inline-flex; align-items: center; gap: 6px;
  height: 34px; padding: 0 14px; border-radius: 100px; cursor: pointer;
  border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.08);
  color: #eef2f8; font: inherit; font-size: 13px; font-weight: 600;
  transition: background .12s, border-color .12s;
}
.v3d-btn:hover { background: rgba(255,255,255,.16); }
.v3d-btn.primary { background: var(--color-accent); border-color: transparent; color: #fff; }
.v3d-btn svg { width: 15px; height: 15px; }
.v3d-prog { flex: 1; height: 6px; border-radius: 100px; background: rgba(255,255,255,.16); position: relative; cursor: pointer; }
.v3d-prog-f { position: absolute; left: 0; top: 0; bottom: 0; width: 0; border-radius: 100px; background: linear-gradient(90deg, var(--color-accent), var(--color-violet)); }
.v3d-time { flex: none; font-size: 12px; color: #c9d2e2; font-variant-numeric: tabular-nums; min-width: 76px; text-align: right; }

/* leyenda de altura */
.v3d-legend {
  position: absolute; top: 12px; left: 12px; z-index: 6;
  display: flex; align-items: center; gap: 8px; font-size: 11.5px; color: #dbe2ee;
  padding: 6px 11px; border-radius: 100px; background: rgba(12,17,26,.55); backdrop-filter: blur(10px);
}
.v3d-legend .grad { width: 60px; height: 7px; border-radius: 100px; background: linear-gradient(90deg, rgb(76,149,255), rgb(255,138,76)); }

.v3d-hint {
  position: absolute; top: 12px; right: 12px; z-index: 6;
  font-size: 11px; color: #aeb8cc; padding: 6px 11px; border-radius: 100px;
  background: rgba(12,17,26,.5); backdrop-filter: blur(10px);
}
.v3d-fallback { position: absolute; inset: 0; display: grid; place-items: center; color: #aeb8cc; font-size: 13px; text-align: center; padding: 0 28px; }
@media (prefers-reduced-motion: reduce) { .v3d.loading::after { animation: none; } }
`;
