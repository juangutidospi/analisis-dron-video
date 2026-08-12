import { css } from '../../../core/css.js';

export const styles = css`
:host { display: block; }
.mo {
  background: var(--color-surface); border: 1px solid var(--color-divider); border-radius: 16px; overflow: hidden;
  transition: transform .16s, box-shadow .16s; height: 100%;
  &:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
}
.img { position: relative; aspect-ratio: 16/9; background: #000; overflow: hidden; }
.img img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .3s ease; }
.img.clickable { cursor: zoom-in; }
.img.clickable::after {
  content: "⤢"; position: absolute; top: 8px; right: 9px; width: 26px; height: 26px; display: grid; place-items: center;
  border-radius: 8px; background: rgba(0,0,0,.5); color: #fff; font-size: 14px; opacity: 0; pointer-events: none;
  backdrop-filter: blur(4px); transition: opacity .15s;
}
.mo:hover .img.clickable::after { opacity: 1; }
.mo:hover .img.clickable img { transform: scale(1.04); }
.ph {
  width: 100%; height: 100%; display: grid; place-items: center;
  background: linear-gradient(135deg, var(--color-tile), color-mix(in srgb, var(--color-violet) 10%, var(--color-surface-solid)));
}
.ph .ico { font-size: 22px; opacity: .5; }
.t {
  position: absolute; left: 9px; bottom: 9px; background: rgba(0,0,0,.6); color: #fff; font-size: 12px; font-weight: 700;
  padding: 3px 9px; border-radius: 100px; backdrop-filter: blur(4px);
}
.cap { padding: 12px 14px 14px; }
.label { font-size: 12px; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: .05em; }
.metric { font-size: 19px; font-weight: 800; margin-top: 3px; letter-spacing: -.01em; }
.sub { font-size: 12px; color: color-mix(in srgb, var(--color-text) 74%, transparent); margin-top: 1px; }
`;
