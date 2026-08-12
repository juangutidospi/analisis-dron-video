import { css } from './css.js';

/** Estilos compartidos por todos los componentes (se adoptan antes que los propios). */
export const base = css`
:host { display: block; font-family: var(--font-body); color: var(--color-text); }
* { box-sizing: border-box; }
a { color: var(--color-accent); text-decoration: none; }
a:hover { text-decoration: underline; }
:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 3px; border-radius: 6px; }

.card {
  background: var(--color-surface); border: 1px solid var(--color-divider);
  border-radius: var(--radius-md); padding: var(--space-6);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
}
.eyebrow { text-transform: uppercase; letter-spacing: .16em; font-size: 12px; font-weight: 700; color: var(--color-accent); }
h2.title { font-size: clamp(24px, 3.4vw, 34px); font-weight: 820; letter-spacing: -.02em; margin: 10px 0 6px; line-height: 1.1; }
.sub { color: color-mix(in srgb, var(--color-text) 74%, transparent); max-width: 70ch; margin: 0 0 var(--space-6); font-size: 16px; }
h3 { font-size: 15px; color: color-mix(in srgb, var(--color-text) 74%, transparent); margin: 0 0 12px; font-weight: 650; }
.muted { color: var(--color-text-muted); }

.legend { display: flex; gap: 18px; flex-wrap: wrap; font-size: 12.5px; color: color-mix(in srgb, var(--color-text) 74%, transparent); margin-bottom: 8px; }
.legend span { display: inline-flex; align-items: center; gap: 7px; }
.legend .sw { width: 13px; height: 3px; border-radius: 2px; }
.legend .dot { width: 9px; height: 9px; border-radius: 50%; }

code { background: var(--color-tile); border: 1px solid var(--color-divider); border-radius: 6px; padding: 1px 7px; font-size: 12.5px; font-family: ui-monospace, Menlo, monospace; }
`;
