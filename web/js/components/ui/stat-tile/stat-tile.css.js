import { css } from '../../../core/css.js';

export const styles = css`
:host { display: block; }
.tile {
  background: var(--color-surface); border: 1px solid var(--color-divider); border-radius: 16px; padding: 18px;
  backdrop-filter: blur(10px); transition: transform .16s, border-color .16s; height: 100%;
  &:hover { transform: translateY(-3px); border-color: color-mix(in srgb, var(--color-text) 16%, transparent); }
}
.v { font-size: 30px; font-weight: 820; line-height: 1; letter-spacing: -.02em; }
.v small { font-size: 15px; font-weight: 600; color: color-mix(in srgb, var(--color-text) 74%, transparent); }
.l { font-size: 12px; color: var(--color-text-muted); margin-top: 9px; text-transform: uppercase; letter-spacing: .05em; }
.k { font-size: 12.5px; color: color-mix(in srgb, var(--color-text) 74%, transparent); margin-top: 3px; }

:host([hero]) .tile {
  background: color-mix(in srgb, #0a0b0f 55%, transparent); border-color: var(--color-divider);
  backdrop-filter: blur(12px); padding: 14px 20px; border-radius: 16px;
  &:hover { transform: none; }
}
:host([hero]) .v { font-size: 27px; color: #fff; }
:host([hero]) .v small { font-size: 14px; color: rgba(255,255,255,.72); }
:host([hero]) .l { color: #c7ccd6; font-size: 11px; margin-top: 6px; }
`;
