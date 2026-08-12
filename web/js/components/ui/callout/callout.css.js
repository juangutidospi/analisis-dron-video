import { css } from '../../../core/css.js';

export const styles = css`
:host { display: block; }
.callout { border-radius: 14px; padding: 16px 18px; font-size: 14px; border: 1px solid var(--color-divider); line-height: 1.55; }
b { display: block; margin-bottom: 3px; }
:host([variant="warn"]) .callout { background: color-mix(in srgb, var(--c-yellow) 12%, transparent); border-color: color-mix(in srgb, var(--c-yellow) 40%, transparent); }
:host([variant="good"]) .callout { background: color-mix(in srgb, var(--c-green) 12%, transparent); border-color: color-mix(in srgb, var(--c-green) 38%, transparent); }
::slotted(*) { margin: 0; }
`;
