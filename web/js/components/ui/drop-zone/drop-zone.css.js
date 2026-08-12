import { css } from '../../../core/css.js';

export const styles = css`
:host { display: block; }
.drop {
  max-width: 620px; margin: 0 auto; background: var(--color-surface);
  border: 1.5px dashed var(--color-divider); border-radius: var(--radius-lg);
  padding: 44px 30px; backdrop-filter: blur(16px); box-shadow: var(--shadow-lg);
  transition: border-color .18s, transform .18s, background .18s; cursor: pointer; text-align: center;
  &:hover, &.over { border-color: var(--color-accent); transform: translateY(-3px); }
  &.over { background: color-mix(in srgb, var(--color-accent) 10%, var(--color-surface)); }
}
.ico {
  width: 74px; height: 74px; margin: 0 auto 18px; border-radius: 20px; display: grid; place-items: center; font-size: 34px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 26%, transparent), color-mix(in srgb, var(--color-violet) 26%, transparent));
  border: 1px solid var(--color-divider);
}
h3 { font-size: 21px; margin: 0 0 6px; font-weight: 800; }
.hint { color: var(--color-text-muted); margin: 0 0 20px; font-size: 14.5px; }
.cta {
  display: inline-block; background: linear-gradient(135deg, var(--color-accent), var(--color-violet)); color: #fff;
  font-weight: 700; padding: 13px 26px; border-radius: 100px; font-size: 15px; border: none; cursor: pointer;
  box-shadow: 0 10px 26px color-mix(in srgb, var(--color-accent) 40%, transparent); transition: transform .12s, box-shadow .12s;
  &:hover { transform: translateY(-2px); box-shadow: 0 16px 34px color-mix(in srgb, var(--color-accent) 50%, transparent); }
}
.files { display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap; margin-top: 18px; font-size: 13.5px; }
.chip {
  display: inline-flex; align-items: center; gap: 8px; background: var(--color-tile);
  border: 1px solid var(--color-divider); border-radius: 100px; padding: 7px 14px; color: var(--color-text-muted);
  b { color: var(--color-text); }
  &.ok { border-color: color-mix(in srgb, var(--c-green) 50%, transparent); color: var(--c-green); }
}
.note { margin-top: 22px; font-size: 13px; color: var(--color-text-muted); min-height: 1em; }
.hidden { display: none; }
`;
