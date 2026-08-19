import { css } from '../../../core/css.js';

export const styles = css`
:host { position: fixed; left: 0; right: 0; bottom: 0; z-index: 40; display: flex; justify-content: center; padding: 0 14px 16px; pointer-events: none;
  transition: opacity .35s cubic-bezier(.22,1,.36,1), transform .35s cubic-bezier(.22,1,.36,1); }
:host([hidden]) { display: none; }
/* oculto hasta llegar al mapa (lo controla flight-report según la sección visible) */
:host(.away) { opacity: 0; transform: translateY(24px); }
:host(.away) .player, :host(.away) .pip { pointer-events: none; }
@media (prefers-reduced-motion: reduce) { :host { transition: opacity .2s; } :host(.away) { transform: none; } }
.stack { display: flex; flex-direction: column; align-items: center; gap: 10px; width: min(720px, 100%); }
.pip {
  position: relative; pointer-events: auto; width: clamp(168px, 24vw, 260px); aspect-ratio: 16 / 9; border-radius: 14px; overflow: hidden;
  border: 1px solid var(--color-divider); box-shadow: var(--shadow-lg); background: #000; display: none;
  animation: rise .35s cubic-bezier(.22,1,.36,1) both;
}
.pip.on { display: block; }
.pip video { width: 100%; height: 100%; object-fit: cover; display: block; }
.hud { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.expand {
  position: absolute; top: 8px; right: 8px; z-index: 2; width: 30px; height: 30px; border-radius: 50%;
  border: 1px solid rgba(255,255,255,.28); background: rgba(0,0,0,.42); color: #fff; font-size: 15px; line-height: 1;
  cursor: pointer; display: grid; place-items: center; backdrop-filter: blur(6px); pointer-events: auto;
  opacity: 0; transition: opacity .15s, background .15s, transform .15s;
}
.pip:hover .expand, .pip.big .expand { opacity: 1; }
.expand:hover { background: rgba(0,0,0,.6); transform: scale(1.08); }
/* fondo desenfocado detrás del vídeo grande (focaliza la vista) */
.stage {
  position: fixed; inset: 0; z-index: 1; pointer-events: none; opacity: 0; visibility: hidden;
  background: rgba(6, 7, 10, .5); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  transition: opacity .28s ease, visibility .28s;
}
:host(.big) .stage { opacity: 1; visibility: visible; pointer-events: auto; }
.pip.big {
  position: fixed; left: 50%; bottom: 84px; transform: translateX(-50%);
  width: min(96vw, calc(86vh * 16 / 9)); max-width: 1600px; z-index: 5;
  animation: bigin .26s cubic-bezier(.22,1,.36,1) both;
}
.pip.big .expand { width: 38px; height: 38px; font-size: 18px; top: 12px; right: 12px; }
@keyframes bigin { from { opacity: .4; transform: translateX(-50%) scale(.9); } }
/* en vertical (móvil) el vídeo 16:9 es bajo: centrarlo en pantalla en vez de anclarlo abajo */
@media (orientation: portrait) {
  .pip.big { top: 50%; bottom: auto; transform: translate(-50%, -50%); animation-name: bigin-v; }
}
@keyframes bigin-v { from { opacity: .4; transform: translate(-50%, -50%) scale(.9); } }
@media (prefers-reduced-motion: reduce) { .pip.big { animation: none; } }
.player {
  position: relative; z-index: 6;
  pointer-events: auto; display: flex; align-items: center; gap: 13px; width: 100%;
  background: color-mix(in srgb, var(--color-surface-solid) 92%, transparent); border: 1px solid var(--color-divider);
  border-radius: 100px; padding: 10px 16px; box-shadow: var(--shadow-lg); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  animation: rise .35s cubic-bezier(.22,1,.36,1) both;
}
@keyframes rise { from { opacity: 0; transform: translateY(14px); } }
@media (prefers-reduced-motion: reduce) { .player { animation: none; } }

.play {
  width: 42px; height: 42px; flex: none; border-radius: 50%; border: none; cursor: pointer; color: #fff; font-size: 15px;
  display: grid; place-items: center; background: linear-gradient(135deg, var(--color-accent), var(--color-violet));
  box-shadow: 0 6px 16px color-mix(in srgb, var(--color-accent) 40%, transparent); transition: transform .12s;
}
.play:hover { transform: scale(1.06); }
.time { font-family: ui-monospace, Menlo, monospace; font-size: 12.5px; color: var(--color-text-muted); font-variant-numeric: tabular-nums; min-width: 40px; text-align: center; }
.bar { flex: 1; height: 7px; border-radius: 100px; background: color-mix(in srgb, var(--color-text) 13%, transparent); position: relative; cursor: pointer; touch-action: none; }
.fill { position: absolute; left: 0; top: 0; bottom: 0; width: 0; border-radius: 100px; background: linear-gradient(90deg, var(--color-accent), var(--color-violet)); }
.fill::after { content: ""; position: absolute; right: -7px; top: 50%; width: 14px; height: 14px; border-radius: 50%; background: #fff; transform: translateY(-50%); box-shadow: 0 1px 5px rgba(0,0,0,.45); }
/* bandas de maniobra al fondo de la barra (color por tipo) */
.mnv-band { position: absolute; top: 0; bottom: 0; opacity: .42; pointer-events: none; z-index: 0; }
.mnv-band:first-child { border-radius: 100px 0 0 100px; }
.mnv-band:last-of-type { border-radius: 0 100px 100px 0; }
/* marcadores de momentos destacados sobre la barra */
.hl-mark {
  position: absolute; top: 50%; transform: translate(-50%, -50%); z-index: 3;
  width: 16px; height: 18px; padding: 0; border: none; background: none; cursor: ew-resize; display: grid; place-items: center;
  touch-action: none;
}
.hl-mark::after {
  content: ""; width: 9px; height: 9px; border-radius: 50%; background: var(--color-accent);
  border: 2px solid var(--color-surface-solid); box-shadow: 0 1px 3px rgba(0,0,0,.45); transition: transform .12s;
}
.hl-mark:hover::after { transform: scale(1.4); }
.hl-alt::after { background: var(--color-violet, #a06bff); }
.hl-dist::after { background: #37cf6b; }
.hl-climb::after { background: #37cf6b; }
.hl-descent::after { background: #ff5d5d; }
.hl-turn::after { background: #ffb43d; }
.speeds { display: flex; gap: 4px; flex: none; }
.speeds button {
  border: 1px solid var(--color-divider); background: transparent; color: var(--color-text-muted); border-radius: 8px;
  padding: 5px 8px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; min-width: 32px;
}
.speeds button.on { color: #fff; background: var(--color-accent); border-color: transparent; }

/* botón de ajustes del HUD */
.cfg-btn {
  flex: none; width: 34px; height: 34px; border-radius: 9px; border: 1px solid var(--color-divider);
  background: transparent; color: var(--color-text-muted); font-size: 15px; cursor: pointer; display: grid; place-items: center;
  transition: color .12s, background .12s, transform .12s;
}
.cfg-btn:hover { color: var(--color-text); transform: rotate(35deg); }
.cfg-btn.on { color: #fff; background: var(--color-accent); border-color: transparent; }

/* panel de ajustes del HUD (sobre la barra) */
.cfgpanel {
  position: relative; z-index: 7; /* por encima del backdrop del modo grande */
  pointer-events: auto; width: min(560px, 100%); align-self: center; display: flex; flex-direction: column; gap: 0;
  background: color-mix(in srgb, var(--color-surface-solid) 68%, transparent); border: 1px solid color-mix(in srgb, var(--color-text) 14%, transparent);
  border-radius: 20px; padding: 6px; box-shadow: var(--shadow-lg); backdrop-filter: blur(32px) saturate(1.7); -webkit-backdrop-filter: blur(32px) saturate(1.7);
  animation: rise .28s cubic-bezier(.22,1,.36,1) both;
}
.cfgpanel[hidden] { display: none; }
.cfg-sec { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 6px 10px; }
.cfg-row2 { justify-content: space-between; gap: 18px; }
.cfg-col { display: flex; align-items: center; gap: 10px; min-width: 0; }
.cfg-sec + .cfg-sec, .cfg-foot { border-top: 1px solid color-mix(in srgb, var(--color-divider) 55%, transparent); }
.cfg-t { font-size: 10px; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: .1em; width: 62px; flex: none; }
.cfg-col .cfg-t { width: auto; }
.cfg-chips { display: flex; gap: 6px; flex-wrap: wrap; flex: 1; }
.cfg-chip {
  display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 550; color: var(--color-text-muted); font-family: inherit; cursor: pointer;
  border: 1px solid var(--color-divider); background: transparent; border-radius: 9px; padding: 6px 11px 6px 9px; transition: color .14s, border-color .14s, background .14s;
}
.chip-dot { width: 6px; height: 6px; border-radius: 50%; box-shadow: inset 0 0 0 1.4px currentColor; opacity: .4; transition: opacity .14s, background .14s, box-shadow .14s; }
.cfg-chip:hover { color: var(--color-text); border-color: color-mix(in srgb, var(--color-text) 24%, transparent); }
.cfg-chip.on { color: var(--color-text); border-color: color-mix(in srgb, var(--color-accent) 45%, transparent); background: color-mix(in srgb, var(--color-accent) 12%, transparent); }
.cfg-chip.on .chip-dot { background: var(--color-accent); box-shadow: 0 0 0 1.4px var(--color-accent), 0 0 6px color-mix(in srgb, var(--color-accent) 55%, transparent); opacity: 1; }
.cfg-music { display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; }
.cfg-music-btn {
  display: inline-flex; align-items: center; gap: 8px; flex: 1; min-width: 0; font-family: inherit; cursor: pointer; text-align: left;
  font-size: 12.5px; font-weight: 550; color: var(--color-text-muted); border: 1px solid var(--color-divider);
  background: transparent; border-radius: 9px; padding: 7px 11px; transition: color .14s, border-color .14s, background .14s;
}
.cfg-music-btn:hover { color: var(--color-text); border-color: color-mix(in srgb, var(--color-text) 24%, transparent); }
.cfg-music-btn.on { color: var(--color-text); border-color: color-mix(in srgb, var(--color-accent) 45%, transparent); background: color-mix(in srgb, var(--color-accent) 12%, transparent); }
.cfg-music-btn.on .cfg-music-ic { color: var(--color-accent); }
.cfg-music-ic { width: 15px; height: 15px; flex: none; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.cfg-music-btn #musicname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cfg-music-x {
  flex: none; width: 28px; height: 28px; border-radius: 8px; border: 1px solid var(--color-divider); background: transparent;
  color: var(--color-text-muted); font-size: 12px; cursor: pointer; display: grid; place-items: center; transition: color .12s, background .12s;
}
.cfg-music-x:hover { color: var(--color-text); background: color-mix(in srgb, var(--color-text) 8%, transparent); }
.cfg-music-ctrls { display: flex; gap: 16px; width: 100%; margin-top: 9px; flex-wrap: wrap; }
.cfg-music-ctrls[hidden] { display: none; }
.cfg-ctrl { display: flex; align-items: center; gap: 9px; flex: 1; min-width: 190px; }
.cfg-ctrl-t { font-size: 11px; font-weight: 600; color: var(--color-text-muted); width: 52px; flex: none; }
.cfg-ctrl-v { font-size: 11.5px; font-weight: 650; color: var(--color-text); font-variant-numeric: tabular-nums; min-width: 38px; text-align: right; }
.cfg-ctrl input[type=range] {
  flex: 1; min-width: 0; height: 4px; -webkit-appearance: none; appearance: none; border-radius: 100px; cursor: pointer;
  background: color-mix(in srgb, var(--color-text) 15%, transparent); accent-color: var(--color-accent);
}
.cfg-ctrl input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none; width: 15px; height: 15px; border-radius: 50%; background: var(--color-accent);
  border: 2px solid var(--color-surface-solid); box-shadow: 0 1px 4px rgba(0,0,0,.35); cursor: pointer;
}
.cfg-ctrl input[type=range]::-moz-range-thumb {
  width: 13px; height: 13px; border-radius: 50%; background: var(--color-accent); border: 2px solid var(--color-surface-solid); cursor: pointer;
}
.cfg-mini {
  flex: none; font-family: inherit; font-size: 11px; font-weight: 600; cursor: pointer; color: var(--color-text-muted);
  border: 1px solid var(--color-divider); background: transparent; border-radius: 7px; padding: 4px 9px; transition: color .14s, border-color .14s, background .14s;
}
.cfg-mini:hover { color: var(--color-text); border-color: color-mix(in srgb, var(--color-text) 24%, transparent); }
.cfg-mini.on { color: var(--color-text); border-color: color-mix(in srgb, var(--color-accent) 45%, transparent); background: color-mix(in srgb, var(--color-accent) 14%, transparent); }
.cfg-wave { width: 100%; display: flex; flex-direction: column; gap: 5px; }
.cfg-wave-cv {
  width: 100%; height: 46px; display: block; cursor: ew-resize; border-radius: 8px; touch-action: none;
  background: color-mix(in srgb, var(--color-text) 6%, transparent); border: 1px solid var(--color-divider);
}
.cfg-wave-foot { display: flex; align-items: center; gap: 8px; }
.cfg-wave-foot .cfg-ctrl-v { min-width: 0; }
.cfg-foot { display: flex; align-items: center; gap: 9px; padding: 9px 10px; flex-wrap: wrap; }
.cfg-units { display: flex; gap: 2px; background: color-mix(in srgb, var(--color-text) 8%, transparent); border-radius: 10px; padding: 3px; flex: none; }
.cfg-units button {
  font-size: 12.5px; font-weight: 600; color: var(--color-text-muted); border: none; background: transparent; border-radius: 7px;
  padding: 5px 15px; cursor: pointer; font-family: inherit; transition: color .14s;
}
.cfg-units button.on { color: var(--color-text); background: var(--color-surface-solid); box-shadow: 0 1px 3px rgba(0,0,0,.28); }
.cfg-export {
  flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: none; cursor: pointer; font-family: inherit;
  font-size: 13px; font-weight: 700; color: #fff; border-radius: 11px; padding: 9px 16px;
  background: linear-gradient(135deg, var(--color-accent-2, var(--color-accent)), var(--color-accent));
  box-shadow: 0 8px 20px -8px color-mix(in srgb, var(--color-accent) 70%, transparent); transition: transform .12s, box-shadow .12s;
}
.cfg-export:hover { transform: translateY(-1px); box-shadow: 0 12px 26px -8px color-mix(in srgb, var(--color-accent) 78%, transparent); }
.cfg-export-ic { width: 16px; height: 16px; flex: none; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.cfg-trailer {
  flex: none; display: inline-flex; align-items: center; gap: 6px; font-family: inherit; cursor: pointer;
  font-size: 13px; font-weight: 650; color: var(--color-text); border: 1px solid var(--color-divider);
  background: transparent; border-radius: 11px; padding: 9px 13px; transition: border-color .14s, background .14s;
}
.cfg-trailer:hover { border-color: color-mix(in srgb, var(--color-accent) 45%, transparent); background: color-mix(in srgb, var(--color-accent) 10%, transparent); }
.cfg-select {
  flex: none; font-family: inherit; font-size: 12.5px; font-weight: 600; color: var(--color-text); cursor: pointer;
  border: 1px solid var(--color-divider); background: transparent; border-radius: 9px; padding: 8px 10px;
}
.cfg-select:hover { border-color: color-mix(in srgb, var(--color-text) 24%, transparent); }

/* overlay de progreso de exportación */
.export-ov {
  position: fixed; inset: 0; z-index: 20; display: grid; place-items: center; pointer-events: auto;
  background: rgba(6,7,10,.55); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
}
.export-card {
  width: min(420px, 90vw); background: var(--color-surface-solid); border: 1px solid var(--color-divider); border-radius: 18px;
  padding: 24px; box-shadow: var(--shadow-lg); text-align: center; animation: rise .28s cubic-bezier(.22,1,.36,1) both;
}
.export-title { font-size: 16px; font-weight: 750; color: var(--color-text); }
.export-track { height: 8px; border-radius: 100px; background: color-mix(in srgb, var(--color-text) 12%, transparent); margin: 16px 0 8px; overflow: hidden; }
.export-fill { height: 100%; width: 0; border-radius: 100px; background: linear-gradient(90deg, var(--color-accent-2, var(--color-accent)), var(--color-accent)); transition: width .2s; }
.export-pct { font-size: 22px; font-weight: 800; color: var(--color-text); font-variant-numeric: tabular-nums; }
.export-note { font-size: 12.5px; color: var(--color-text-muted); margin: 8px 0 18px; }
.export-cancel {
  border: 1px solid var(--color-divider); background: transparent; color: var(--color-text); cursor: pointer; font-family: inherit;
  font-size: 13px; font-weight: 650; border-radius: 100px; padding: 8px 20px;
}
.export-cancel:hover { background: color-mix(in srgb, var(--color-text) 8%, transparent); }

@media (max-width: 480px) {
  .player { gap: 10px; padding: 9px 12px; }
  .speeds button { padding: 5px 6px; min-width: 28px; font-size: 11px; }
  .time { min-width: 34px; font-size: 11.5px; }
}
`;
