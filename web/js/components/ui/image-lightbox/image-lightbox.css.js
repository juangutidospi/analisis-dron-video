import { css } from '../../../core/css.js';

export const styles = css`
:host {
  position: fixed; inset: 0; z-index: 2147483000; display: none; place-items: center; padding: 34px 24px 60px;
  background: rgba(6, 7, 10, .92); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
}
:host([open]) { display: grid; animation: fade .18s ease; }
@keyframes fade { from { opacity: 0; } }
figure { margin: 0; display: flex; flex-direction: column; gap: 16px; align-items: center; max-width: min(1100px, 94vw); }
img { max-width: 100%; max-height: 70vh; border-radius: 14px; box-shadow: var(--shadow-lg); object-fit: contain; animation: pop .22s cubic-bezier(.22,1,.36,1); }
@keyframes pop { from { opacity: 0; transform: scale(.96); } }
figcaption { color: #e8eaf0; font-size: 14px; display: flex; gap: 10px; align-items: baseline; justify-content: center; flex-wrap: wrap; }
.cap-time { background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.2); border-radius: 100px; padding: 3px 10px; font-size: 12px; font-weight: 700; }
.cap-metric { font-weight: 800; font-size: 18px; color: #fff; }
.dlrow { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: center; margin-top: 6px; }
.dllabel { color: rgba(255,255,255,.7); font-size: 13px; }
.dl {
  display: inline-flex; align-items: center; gap: 7px; color: var(--color-text); border-radius: 100px; padding: 10px 18px; font-size: 13px;
  font-weight: 700; cursor: pointer; font-family: inherit; min-width: 66px; justify-content: center;
  border: 1px solid color-mix(in srgb, var(--color-text) 20%, transparent);
  background: linear-gradient(165deg,
    color-mix(in srgb, var(--color-surface-solid) 82%, transparent),
    color-mix(in srgb, var(--color-surface-solid) 58%, transparent) 55%,
    color-mix(in srgb, var(--color-surface-solid) 46%, transparent));
  backdrop-filter: blur(14px) saturate(1.4); -webkit-backdrop-filter: blur(14px) saturate(1.4);
  box-shadow: 0 6px 18px rgba(0,0,0,.3), inset 0 1px 1px color-mix(in srgb, #fff 40%, transparent);
  transition: transform .14s cubic-bezier(.22,1,.36,1), box-shadow .14s, border-color .14s, background .14s;
}
.dl small { font-weight: 500; opacity: .7; }
.dl:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--color-accent) 55%, transparent);
  box-shadow: 0 10px 26px rgba(0,0,0,.38), inset 0 1px 1px color-mix(in srgb, #fff 50%, transparent), 0 0 0 4px color-mix(in srgb, var(--color-accent) 15%, transparent);
}
.dl:disabled { opacity: .6; cursor: default; transform: none; box-shadow: none; }

/* botones esféricos glass tintados con el fondo de la app (se adaptan a claro/oscuro) */
.close, .nav {
  position: fixed; cursor: pointer; color: var(--color-text); border-radius: 50%; display: grid; place-items: center; padding: 0;
  border: 1px solid color-mix(in srgb, var(--color-text) 22%, transparent);
  background: linear-gradient(160deg,
    color-mix(in srgb, var(--color-surface-solid) 82%, transparent),
    color-mix(in srgb, var(--color-surface-solid) 56%, transparent) 50%,
    color-mix(in srgb, var(--color-surface-solid) 42%, transparent));
  backdrop-filter: blur(20px) saturate(1.5); -webkit-backdrop-filter: blur(20px) saturate(1.5);
  box-shadow: 0 10px 30px rgba(0,0,0,.4), inset 0 1.5px 1px color-mix(in srgb, #fff 42%, transparent), inset 0 -8px 16px rgba(0,0,0,.16);
  transition: transform .2s cubic-bezier(.22,1,.36,1), box-shadow .2s, border-color .2s, background .2s;
}
.close svg, .nav svg { width: 42%; height: 42%; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; filter: drop-shadow(0 1px 1px rgba(0,0,0,.25)); }
.close:hover, .nav:hover {
  border-color: color-mix(in srgb, var(--color-accent) 60%, transparent);
  background: linear-gradient(160deg,
    color-mix(in srgb, var(--color-surface-solid) 92%, transparent),
    color-mix(in srgb, var(--color-surface-solid) 64%, transparent) 55%,
    color-mix(in srgb, var(--color-surface-solid) 48%, transparent));
  box-shadow: 0 14px 38px rgba(0,0,0,.48), inset 0 1.5px 1px color-mix(in srgb, #fff 55%, transparent), 0 0 0 5px color-mix(in srgb, var(--color-accent) 16%, transparent);
}
.close { top: 20px; right: 20px; width: 46px; height: 46px; }
.close:hover { transform: scale(1.07); }
.close:active { transform: scale(.94); }
.nav { top: 50%; transform: translateY(-50%); width: 58px; height: 58px; }
.nav:hover { transform: translateY(-50%) scale(1.08); }
.nav:active { transform: translateY(-50%) scale(.94); }
.nav.prev { left: 22px; }
.nav.next { right: 22px; }
.nav[hidden] { display: none; }

.count {
  color: var(--color-text); font-size: 12.5px; font-weight: 700; letter-spacing: .05em; font-variant-numeric: tabular-nums; order: -1;
  border: 1px solid color-mix(in srgb, var(--color-text) 22%, transparent); border-radius: 100px; padding: 5px 14px;
  background: linear-gradient(165deg, color-mix(in srgb, var(--color-surface-solid) 78%, transparent), color-mix(in srgb, var(--color-surface-solid) 48%, transparent));
  backdrop-filter: blur(14px) saturate(1.4); -webkit-backdrop-filter: blur(14px) saturate(1.4);
  box-shadow: 0 4px 14px rgba(0,0,0,.28), inset 0 1px 1px color-mix(in srgb, #fff 40%, transparent);
}
.count:empty { display: none; }
@media (max-width: 560px) {
  .nav { width: 48px; height: 48px; }
  .nav.prev { left: 10px; } .nav.next { right: 10px; }
  .close { width: 42px; height: 42px; top: 14px; right: 14px; }
}
@media (prefers-reduced-motion: reduce) { .close, .nav, .dl { transition: none; } }
`;
