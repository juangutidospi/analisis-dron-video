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
.v3d-bar[hidden] { display: none; } /* el atributo hidden debe ganar a display:flex */
.v3d-btn {
  flex: none; display: inline-flex; align-items: center; gap: 6px;
  height: 34px; padding: 0 14px; border-radius: 100px; cursor: pointer;
  border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.08);
  color: #eef2f8; font: inherit; font-size: 13px; font-weight: 600;
  transition: background .12s, border-color .12s;
}
.v3d-btn:hover { background: rgba(255,255,255,.16); }
.v3d-btn.primary { background: var(--color-accent); border-color: transparent; color: #fff; }
.v3d-btn.on { background: var(--color-accent); border-color: transparent; color: #fff; }
#speed { min-width: 40px; font-variant-numeric: tabular-nums; }
.v3d-btn svg { width: 15px; height: 15px; }
#settings { padding: 0 10px; }

/* panel de ajustes (capas del render) */
.v3d-opts {
  position: absolute; right: 12px; bottom: 64px; z-index: 7;
  min-width: 200px; padding: 10px 12px; border-radius: 14px;
  background: rgba(12,17,26,.82); backdrop-filter: blur(14px);
  border: 1px solid rgba(255,255,255,.12); box-shadow: 0 10px 30px rgba(0,0,0,.4);
  display: flex; flex-direction: column; gap: 2px;
}
.v3d-opts[hidden] { display: none; }
.v3d-opts-t {
  font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
  color: rgba(238,242,248,.55); margin: 2px 2px 6px;
}
.v3d-opts label {
  display: flex; align-items: center; gap: 9px; cursor: pointer;
  padding: 6px 6px; border-radius: 8px; color: #eef2f8; font-size: 13px;
}
.v3d-opts label:hover { background: rgba(255,255,255,.07); }
.v3d-opts input { width: 15px; height: 15px; accent-color: var(--color-accent); cursor: pointer; }
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
.v3d-legend .line { width: 26px; height: 5px; border-radius: 100px; background: #ff7d1a; box-shadow: 0 0 8px rgba(255,125,26,.6); }

.v3d-hint {
  position: absolute; top: 12px; right: 12px; z-index: 6;
  font-size: 11px; color: #aeb8cc; padding: 6px 11px; border-radius: 100px;
  background: rgba(12,17,26,.5); backdrop-filter: blur(10px);
}

/* pantalla de inicio: el globo queda de póster hasta que el usuario pulsa */
.v3d-start {
  position: absolute; inset: 0; z-index: 8; display: grid; place-items: center;
  background: radial-gradient(circle at 50% 40%, rgba(5,7,14,.15), rgba(5,7,14,.55));
}
.v3d-start[hidden] { display: none; }
.v3d-start-btn {
  display: inline-flex; align-items: center; gap: 11px; cursor: pointer;
  padding: 14px 26px 14px 22px; border-radius: 100px; font: inherit; font-size: 16px; font-weight: 700;
  color: #fff; border: 1px solid rgba(255,255,255,.25);
  background: color-mix(in srgb, var(--color-accent) 88%, #000); box-shadow: 0 10px 34px rgba(0,0,0,.45);
  transition: transform .14s, box-shadow .14s;
}
.v3d-start-btn:hover { transform: translateY(-2px) scale(1.02); box-shadow: 0 16px 42px rgba(0,0,0,.5); }
.v3d-start-btn svg { width: 20px; height: 20px; }

/* destello de transición de la intro (globo → escena local) */
.v3d-flash {
  position: absolute; inset: 0; z-index: 7; pointer-events: none; border-radius: 16px;
  background: radial-gradient(circle at 50% 48%, rgba(226,232,242,.85), rgba(150,168,196,.75));
  opacity: 0; transition: opacity .3s ease;
}
.v3d-flash.on { opacity: 1; }

/* viñeta cinematográfica */
.v3d-vignette {
  position: absolute; inset: 0; z-index: 5; pointer-events: none; border-radius: 16px;
  box-shadow: inset 0 0 120px 10px rgba(0,0,0,.55), inset 0 0 40px rgba(0,0,0,.35);
}

/* HUD de telemetría durante el sobrevuelo */
.v3d-hud {
  position: absolute; top: 46px; right: 12px; z-index: 6;
  display: flex; flex-direction: column; gap: 7px;
  opacity: 0; transform: translateX(8px); transition: opacity .35s, transform .35s;
}
.v3d-hud:not([hidden]) { opacity: 1; transform: none; }
.hud-item {
  display: grid; grid-template-columns: auto auto; align-items: baseline; gap: 0 5px;
  min-width: 108px; padding: 8px 12px; border-radius: 12px;
  background: rgba(12,17,26,.52); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,.1);
}
.hud-v { font-size: 22px; font-weight: 800; color: #fff; font-variant-numeric: tabular-nums; text-align: right; }
.hud-u { font-size: 11px; color: #aeb8cc; font-weight: 600; }
.hud-l { grid-column: 1 / -1; font-size: 9.5px; letter-spacing: .12em; text-transform: uppercase; color: #8794ab; margin-top: 2px; }
@media (max-width: 640px) { .v3d-hud { display: none; } }
.v3d-fallback { position: absolute; inset: 0; display: grid; place-items: center; color: #aeb8cc; font-size: 13px; text-align: center; padding: 0 28px; }
@media (prefers-reduced-motion: reduce) { .v3d.loading::after { animation: none; } }
`;
