import { css } from '../../../core/css.js';

export const styles = css`
:host { display: block; }
.hero { text-align: center; padding: clamp(48px, 9vw, 110px) 24px 40px; }
.eyebrow-pill {
  display: inline-flex; align-items: center; gap: 9px; text-transform: uppercase; letter-spacing: .2em;
  font-size: 12px; font-weight: 700; color: var(--color-text-muted); background: var(--color-surface);
  border: 1px solid var(--color-divider); padding: 8px 15px; border-radius: 100px; backdrop-filter: blur(8px);
}
h1 {
  font-size: clamp(40px, 7.5vw, 82px); font-weight: 850; line-height: 1.02; margin: 24px auto 16px; max-width: 15ch;
  background: linear-gradient(135deg, var(--color-text) 40%, var(--color-accent));
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
p.sub { font-size: clamp(16px, 2.1vw, 20px); color: color-mix(in srgb, var(--color-text) 74%, transparent); max-width: 60ch; margin: 0 auto 40px; }

.gen { max-width: 620px; margin: 20px auto 0; text-align: left; }
.gen label { display: block; font-size: 13px; color: var(--color-text-muted); margin: 0 0 6px; }
.gen input {
  width: 100%; background: var(--color-surface); border: 1px solid var(--color-divider); border-radius: 12px;
  padding: 12px 14px; color: var(--color-text); font-size: 15px; font-family: inherit; backdrop-filter: blur(8px);
}
.gen .go {
  margin-top: 14px; width: 100%; border: none; cursor: pointer; color: #fff; font-weight: 700; font-size: 15px;
  padding: 14px 26px; border-radius: 100px; background: linear-gradient(135deg, var(--color-accent-2), var(--color-accent));
  box-shadow: 0 10px 26px color-mix(in srgb, var(--color-accent) 38%, transparent); transition: transform .12s;
  &:hover { transform: translateY(-2px); }
}
.gen .addmp4 {
  margin-top: 10px; width: 100%; justify-content: center; display: inline-flex; align-items: center; gap: 8px;
  border: 1px solid var(--color-divider); background: var(--color-surface); color: var(--color-text);
  border-radius: 100px; padding: 11px 15px; font-size: 13.5px; font-weight: 600; cursor: pointer; backdrop-filter: blur(8px);
  &:hover { border-color: var(--color-accent); }
}

.feats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; max-width: 720px; margin: 44px auto 0; }
@media (max-width: 620px) { .feats { grid-template-columns: 1fr; } }
.feat { text-align: left; background: var(--color-surface); border: 1px solid var(--color-divider); border-radius: 16px; padding: 18px; backdrop-filter: blur(10px); }
.feat .fi { font-size: 22px; }
.feat h4 { margin: 8px 0 4px; font-size: 15px; }
.feat p { margin: 0; font-size: 13px; color: var(--color-text-muted); }
.hidden { display: none; }
`;
