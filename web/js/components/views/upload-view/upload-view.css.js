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
  margin-top: 0; width: 100%; border: none; cursor: pointer; color: #fff; font-weight: 700; font-size: 15px;
  padding: 14px 26px; border-radius: 100px; background: linear-gradient(135deg, var(--color-accent-2), var(--color-accent));
  box-shadow: 0 10px 26px color-mix(in srgb, var(--color-accent) 38%, transparent); transition: transform .12s;
  &:hover { transform: translateY(-2px); }
}
/* Botón de vídeo resaltado (encima de Generar), con barrido de brillo animado. */
.gen .addmp4 {
  position: relative; overflow: hidden; margin-top: 14px; margin-bottom: 12px; width: 100%; display: flex; align-items: center; gap: 12px;
  text-align: left; cursor: pointer; color: var(--color-text); font-family: inherit; border-radius: 16px; padding: 13px 15px;
  border: 1px solid color-mix(in srgb, var(--color-accent) 45%, transparent);
  background: color-mix(in srgb, var(--color-accent) 9%, var(--color-surface));
  box-shadow: 0 0 26px -10px color-mix(in srgb, var(--color-accent) 60%, transparent);
  transition: transform .14s, box-shadow .14s, border-color .14s;
  &:hover { transform: translateY(-1px); box-shadow: 0 0 34px -6px color-mix(in srgb, var(--color-accent) 68%, transparent); }
}
.gen .addmp4::after {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(100deg, transparent 34%, color-mix(in srgb, var(--color-accent) 28%, transparent) 50%, transparent 66%);
  transform: translateX(-120%); animation: mp4shine 3.6s ease-in-out infinite;
}
@keyframes mp4shine { 0%, 55% { transform: translateX(-120%); } 100% { transform: translateX(120%); } }
@media (prefers-reduced-motion: reduce) { .gen .addmp4::after { animation: none; opacity: 0; } }
.mp4-ico { position: relative; z-index: 1; flex: none; width: 42px; height: 42px; display: grid; place-items: center; font-size: 22px;
  border-radius: 12px; background: color-mix(in srgb, var(--color-accent) 18%, transparent); }
.mp4-txt { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 1px; flex: 1; min-width: 0; }
.mp4-t { font-size: 14.5px; font-weight: 750; letter-spacing: -.01em; }
.mp4-sub { font-size: 12px; color: var(--color-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mp4-badge { position: relative; z-index: 1; flex: none; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .07em;
  color: #fff; background: linear-gradient(135deg, var(--color-accent), var(--color-violet)); border-radius: 100px; padding: 4px 10px; }
.gen .addmp4.has { border-color: color-mix(in srgb, var(--c-green) 50%, transparent); background: color-mix(in srgb, var(--c-green) 10%, var(--color-surface)); box-shadow: none; }
.gen .addmp4.has::after { display: none; }
.gen .addmp4.has .mp4-ico { background: color-mix(in srgb, var(--c-green) 22%, transparent); color: var(--c-green); }

/* aviso de coincidencia SRT ↔ vídeo */
.pairmsg {
  display: flex; align-items: center; gap: 12px; margin: 14px 2px; font-size: 13px; line-height: 1.45; font-weight: 600;
  border-radius: 14px; padding: 12px 14px; border: 1px solid var(--color-divider); background: var(--color-surface); color: var(--color-text-muted);
}
.pairmsg[hidden] { display: none; }
.pm-text { flex: 1; min-width: 0; }
.pm-remove {
  flex: none; cursor: pointer; font-family: inherit; font-size: 12.5px; font-weight: 700; color: inherit;
  border: 1px solid currentColor; background: transparent; border-radius: 100px; padding: 6px 13px; white-space: nowrap;
  opacity: .85; transition: opacity .12s, background .12s;
}
.pm-remove:hover { opacity: 1; background: color-mix(in srgb, currentColor 14%, transparent); }
.pairmsg.ok { color: color-mix(in srgb, var(--c-green) 78%, var(--color-text)); border-color: color-mix(in srgb, var(--c-green) 38%, transparent); background: color-mix(in srgb, var(--c-green) 9%, var(--color-surface)); }
.pairmsg.error { color: color-mix(in srgb, var(--c-red) 82%, var(--color-text)); border-color: color-mix(in srgb, var(--c-red) 45%, transparent); background: color-mix(in srgb, var(--c-red) 10%, var(--color-surface)); }
.pairmsg.warn { color: color-mix(in srgb, var(--c-orange) 82%, var(--color-text)); border-color: color-mix(in srgb, var(--c-orange) 42%, transparent); background: color-mix(in srgb, var(--c-orange) 10%, var(--color-surface)); }
.pairmsg.checking { color: var(--color-text-muted); }

.gen .go:disabled { cursor: not-allowed; opacity: .5; filter: grayscale(.35); box-shadow: none; }
.gen .go:disabled:hover { transform: none; }

.feats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; max-width: 720px; margin: 44px auto 0; }
@media (max-width: 620px) { .feats { grid-template-columns: 1fr; } }
.feat { text-align: left; background: var(--color-surface); border: 1px solid var(--color-divider); border-radius: 16px; padding: 18px; backdrop-filter: blur(10px); }
.feat .fi { font-size: 22px; }
.feat h4 { margin: 8px 0 4px; font-size: 15px; }
.feat p { margin: 0; font-size: 13px; color: var(--color-text-muted); }
.hidden { display: none; }
`;
