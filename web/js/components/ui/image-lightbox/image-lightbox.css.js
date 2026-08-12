import { css } from '../../../core/css.js';

export const styles = css`
:host {
  position: fixed; inset: 0; z-index: 2147483000; display: none; place-items: center; padding: 24px;
  background: rgba(6, 7, 10, .92); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
}
:host([open]) { display: grid; animation: fade .18s ease; }
@keyframes fade { from { opacity: 0; } }
figure { margin: 0; display: flex; flex-direction: column; gap: 14px; align-items: center; max-width: min(1100px, 94vw); }
img { max-width: 100%; max-height: 82vh; border-radius: 14px; box-shadow: var(--shadow-lg); object-fit: contain; animation: pop .22s cubic-bezier(.22,1,.36,1); }
@keyframes pop { from { opacity: 0; transform: scale(.96); } }
figcaption { color: #e8eaf0; font-size: 14px; display: flex; gap: 10px; align-items: baseline; justify-content: center; flex-wrap: wrap; }
.cap-time { background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.2); border-radius: 100px; padding: 3px 10px; font-size: 12px; font-weight: 700; }
.cap-metric { font-weight: 800; font-size: 18px; color: #fff; }
.dlrow { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: center; }
.dllabel { color: rgba(255,255,255,.7); font-size: 13px; }
.dl {
  display: inline-flex; align-items: center; gap: 7px; border: 1px solid rgba(255,255,255,.22); background: rgba(255,255,255,.12);
  color: #fff; border-radius: 100px; padding: 9px 16px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit;
  min-width: 62px; justify-content: center; transition: background .12s, transform .12s;
}
.dl small { font-weight: 500; opacity: .7; }
.dl:hover { background: rgba(255,255,255,.24); transform: translateY(-1px); }
.dl:disabled { opacity: .6; cursor: default; transform: none; }
.close {
  position: fixed; top: 18px; right: 18px; width: 44px; height: 44px; border-radius: 100px; border: 1px solid rgba(255,255,255,.22);
  background: rgba(255,255,255,.12); color: #fff; font-size: 18px; cursor: pointer; display: grid; place-items: center;
  backdrop-filter: blur(6px); transition: background .12s;
}
.close:hover { background: rgba(255,255,255,.24); }
`;
