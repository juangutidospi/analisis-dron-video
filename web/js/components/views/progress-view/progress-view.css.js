import { css } from '../../../core/css.js';

export const styles = css`
:host { display: block; }
.wrap { text-align: center; padding: clamp(60px, 12vh, 140px) 24px 40px; }
.progress {
  max-width: 620px; margin: 0 auto; background: var(--color-surface); border: 1px solid var(--color-divider);
  border-radius: 24px; padding: 34px; backdrop-filter: blur(16px); box-shadow: var(--shadow-lg); text-align: left;
}
h3 { margin: 0 0 6px; font-size: 22px; }
.lead { margin: 0 0 22px; color: var(--color-text-muted); font-size: 14px; }
.steps { display: flex; flex-direction: column; gap: 12px; }
.pstep { display: flex; align-items: center; gap: 13px; font-size: 15px; color: var(--color-text-muted); transition: color .2s; }
.pstep .bullet {
  width: 26px; height: 26px; border-radius: 50%; border: 2px solid var(--color-divider); display: grid; place-items: center;
  font-size: 13px; flex: none; transition: all .2s;
}
.pstep.active { color: var(--color-text); }
.pstep.active .bullet { border-color: var(--color-accent); box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-accent) 22%, transparent); }
.pstep.done { color: color-mix(in srgb, var(--color-text) 74%, transparent); }
.pstep.done .bullet { background: var(--c-green); border-color: var(--c-green); color: #05231a; }
.pbar { height: 6px; border-radius: 100px; background: var(--color-divider); overflow: hidden; margin-top: 24px; }
.pbar > span { display: block; height: 100%; width: 0; background: linear-gradient(90deg, var(--color-accent), var(--color-violet)); transition: width .4s ease; }
.spin { display: inline-block; width: 13px; height: 13px; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
`;
