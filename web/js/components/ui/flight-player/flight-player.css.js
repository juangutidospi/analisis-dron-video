import { css } from '../../../core/css.js';

export const styles = css`
:host { position: fixed; left: 0; right: 0; bottom: 0; z-index: 40; display: flex; justify-content: center; padding: 0 14px 16px; pointer-events: none; }
:host([hidden]) { display: none; }
.player {
  pointer-events: auto; display: flex; align-items: center; gap: 13px; width: min(720px, 100%);
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
.speeds { display: flex; gap: 4px; flex: none; }
.speeds button {
  border: 1px solid var(--color-divider); background: transparent; color: var(--color-text-muted); border-radius: 8px;
  padding: 5px 8px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; min-width: 32px;
}
.speeds button.on { color: #fff; background: var(--color-accent); border-color: transparent; }

@media (max-width: 480px) {
  .player { gap: 10px; padding: 9px 12px; }
  .speeds button { padding: 5px 6px; min-width: 28px; font-size: 11px; }
  .time { min-width: 34px; font-size: 11.5px; }
}
`;
