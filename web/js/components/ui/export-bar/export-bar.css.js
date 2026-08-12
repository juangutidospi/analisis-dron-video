import { css } from '../../../core/css.js';

export const styles = css`
:host { display: block; }
.exports { display: flex; gap: 10px; flex-wrap: wrap; }
.exp-btn {
  display: inline-flex; align-items: center; gap: 8px; background: var(--color-tile); border: 1px solid var(--color-divider);
  color: var(--color-text); border-radius: 12px; padding: 11px 16px; font-size: 14px; font-weight: 600; cursor: pointer;
  transition: transform .12s, border-color .12s; font-family: inherit;
  &:hover { transform: translateY(-2px); border-color: var(--color-accent); }
  &:disabled { opacity: .6; cursor: default; transform: none; }
}
.exp-kmz {
  background: linear-gradient(135deg, var(--color-accent), var(--color-violet)); color: #fff; border-color: transparent;
  box-shadow: 0 8px 22px color-mix(in srgb, var(--color-accent) 38%, transparent);
  &:hover { border-color: transparent; }
}
.note { font-size: 12px; color: var(--color-text-muted); margin: 14px 0 0; line-height: 1.5; }
`;
