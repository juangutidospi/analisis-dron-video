import { css } from '../../../core/css.js';

export const styles = css`
:host { display: block; animation: rise .6s cubic-bezier(.22,1,.36,1) both; padding-bottom: clamp(96px, 14vh, 140px); }
/* con vídeo, la miniatura (PiP) sube más: reserva algo más de hueco al final */
:host(.has-video) { padding-bottom: clamp(150px, 24vh, 240px); }
@keyframes rise { from { opacity: 0; transform: translateY(16px); } }
.wrap { max-width: var(--maxw); margin: 0 auto; padding: 0 24px; }

/* scroll-reveal: las secciones entran al aparecer en pantalla (la clase la pone reveal.js) */
section.blk.reveal { opacity: 0; transform: translateY(42px) scale(.985); transition: opacity .7s cubic-bezier(.22,1,.36,1), transform .7s cubic-bezier(.22,1,.36,1); will-change: opacity, transform; }
section.blk.reveal.in { opacity: 1; transform: none; }
/* cascada: dentro de una sección revelada, las tarjetas entran escalonadas */
section.blk.reveal .tiles > stat-tile,
section.blk.reveal .mos > moment-card { opacity: 0; transform: translateY(26px); transition: opacity .55s cubic-bezier(.22,1,.36,1), transform .55s cubic-bezier(.22,1,.36,1); }
section.blk.reveal.in .tiles > stat-tile,
section.blk.reveal.in .mos > moment-card { opacity: 1; transform: none; }
section.blk.reveal .tiles > *:nth-child(2), section.blk.reveal .mos > *:nth-child(2) { transition-delay: .05s; }
section.blk.reveal .tiles > *:nth-child(3), section.blk.reveal .mos > *:nth-child(3) { transition-delay: .10s; }
section.blk.reveal .tiles > *:nth-child(4), section.blk.reveal .mos > *:nth-child(4) { transition-delay: .15s; }
section.blk.reveal .tiles > *:nth-child(5), section.blk.reveal .mos > *:nth-child(5) { transition-delay: .20s; }
section.blk.reveal .tiles > *:nth-child(6), section.blk.reveal .mos > *:nth-child(6) { transition-delay: .25s; }
section.blk.reveal .tiles > *:nth-child(7), section.blk.reveal .mos > *:nth-child(7) { transition-delay: .30s; }
section.blk.reveal .tiles > *:nth-child(8), section.blk.reveal .mos > *:nth-child(8) { transition-delay: .35s; }
@media (prefers-reduced-motion: reduce) {
  section.blk.reveal,
  section.blk.reveal .tiles > stat-tile,
  section.blk.reveal .mos > moment-card { opacity: 1; transform: none; transition: none; }
}

/* portada */
.r-hero { position: relative; min-height: clamp(440px, 66vh, 640px); display: flex; flex-direction: column; justify-content: flex-end;
  padding: 0 0 44px; overflow: hidden; border-bottom: 1px solid var(--color-divider); }
.r-hero .bg { position: absolute; inset: 0; background-size: cover; background-position: center 40%; }
.r-hero .bg.gradient { background: radial-gradient(120% 120% at 20% 10%, var(--color-accent), transparent 55%),
  radial-gradient(120% 120% at 90% 20%, var(--color-violet), transparent 55%), linear-gradient(160deg, #0b1220, #0a0b0f); }
.r-hero .scrim { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(6,7,10,.15) 0%, rgba(6,7,10,.45) 50%, rgba(6,7,10,.92) 100%); }
.r-hero .inner { position: relative; max-width: var(--maxw); margin: 0 auto; padding: 0 24px; width: 100%; }
.r-hero .kick { display: inline-flex; align-items: center; gap: 9px; text-transform: uppercase; letter-spacing: .2em; font-size: 11.5px;
  font-weight: 700; color: #fff; background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.2); padding: 7px 14px; border-radius: 100px; backdrop-filter: blur(6px); }
.r-hero h1 { font-size: clamp(36px, 6.5vw, 72px); font-weight: 850; line-height: 1.03; margin: 20px 0 12px; color: #fff; text-shadow: 0 2px 30px rgba(0,0,0,.5); letter-spacing: -.02em; }
.r-hero .lede { font-size: clamp(15px, 2vw, 19px); color: #e8eaf0; max-width: 60ch; margin: 0 0 26px; text-shadow: 0 1px 12px rgba(0,0,0,.5); }
.hstats { display: flex; flex-wrap: wrap; gap: 14px; }
.hstats stat-tile { min-width: 118px; }
.hmeta { margin-top: 22px; font-size: 13px; color: #d4d7de; display: flex; gap: 20px; flex-wrap: wrap; }
.hmeta b { color: #fff; }

/* secciones */
section.blk { padding: 60px 0; }
.eyebrow { text-transform: uppercase; letter-spacing: .16em; font-size: 12px; font-weight: 700; color: var(--color-accent); }
h2 { font-size: clamp(24px, 3.4vw, 34px); font-weight: 820; margin: 10px 0 6px; letter-spacing: -.02em; line-height: 1.1; }
.sub { color: color-mix(in srgb, var(--color-text) 74%, transparent); max-width: 70ch; margin: 0 0 26px; font-size: 16px; }
h3 { font-size: 15px; color: color-mix(in srgb, var(--color-text) 74%, transparent); margin: 0 0 12px; font-weight: 650; }
.card { background: var(--color-surface); border: 1px solid var(--color-divider); border-radius: var(--radius-md); padding: 22px; backdrop-filter: blur(12px); }

/* altura sobre el terreno */
.hidden { display: none; }
.terrain-loading { color: var(--color-text-muted); font-size: 13px; padding: 30px 0; text-align: center; }
.terrain-tiles { grid-template-columns: repeat(3, 1fr); margin-top: 16px; }
@media (max-width: 620px) { .terrain-tiles { grid-template-columns: 1fr; } }

/* contexto solar */
.solar-grid { align-items: stretch; }
.sun-card { display: grid; place-items: center; }
.compass { width: min(100%, 260px); height: auto; overflow: visible; }
.cmp-ring { fill: color-mix(in srgb, var(--c-yellow) 5%, transparent); stroke: var(--color-divider); stroke-width: 1.5; }
.cmp-tick { stroke: color-mix(in srgb, var(--color-text) 30%, transparent); stroke-width: 1.5; }
.cmp-card { fill: var(--color-text-muted); font-size: 13px; font-weight: 700; }
.cmp-ray { stroke: var(--c-yellow); stroke-width: 3; stroke-linecap: round; stroke-dasharray: 2 6; opacity: .8; }
.cmp-sun { fill: var(--c-yellow); stroke: var(--color-surface-solid); stroke-width: 2; filter: drop-shadow(0 0 6px color-mix(in srgb, var(--c-yellow) 70%, transparent)); }
.cmp-center { fill: var(--color-text-muted); }
.cmp-flight { stroke: var(--color-accent); stroke-width: 2.5; stroke-linecap: round; }
.cmp-flight-dot { fill: var(--color-accent); }
.cmp-wind { stroke: var(--c-aqua); stroke-width: 3.5; stroke-linecap: round; opacity: .9; }
.cmp-wind-head { fill: var(--c-aqua); filter: drop-shadow(0 0 5px color-mix(in srgb, var(--c-aqua) 55%, transparent)); }
.solar-tiles { grid-template-columns: 1fr; height: 100%; align-content: center; gap: 12px; }
@media (max-width: 760px) { .solar-tiles { grid-template-columns: 1fr; } }

/* scrollytelling del recorrido: la tarjeta del mapa se fija mientras el scroll hace volar el dron */
.route-scrolly .scrolly-track { position: relative; height: 240vh; }
.route-scrolly .scrolly-stick { position: sticky; top: 0; min-height: 100vh; display: flex; align-items: center; }
.route-scrolly .scrolly-stick .card { width: 100%; margin: 0; }
.scrolly-hint { text-align: center; font-size: 12.5px; font-weight: 600; color: var(--color-accent); margin: 12px 0 2px; }
@media (max-width: 760px) { .route-scrolly .scrolly-track { height: 200vh; } }
.card + .card { margin-top: 18px; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
@media (max-width: 760px) { .grid2 { grid-template-columns: 1fr; } }

.tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
@media (max-width: 760px) { .tiles { grid-template-columns: repeat(2, 1fr); } }
.mos { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
@media (max-width: 860px) { .mos { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 480px) { .mos { grid-template-columns: 1fr; } }
app-callout { display: block; margin-bottom: 22px; }

.legend { display: flex; gap: 18px; flex-wrap: wrap; font-size: 12.5px; color: color-mix(in srgb, var(--color-text) 74%, transparent); margin-bottom: 8px; }
.legend span { display: inline-flex; align-items: center; gap: 7px; }
.legend .sw { width: 13px; height: 3px; border-radius: 2px; }
.legend .dot { width: 9px; height: 9px; border-radius: 50%; }
.chart-note { font-size: 12px; color: var(--color-text-muted); margin: 14px 0 0; }

.lstrip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
@media (max-width: 560px) { .lstrip { grid-template-columns: 1fr; } }
.lstrip figure { margin: 0; }
.lstrip img { width: 100%; aspect-ratio: 16/9; object-fit: cover; border-radius: 10px; display: block; }
.lstrip figcaption { font-size: 12.5px; color: color-mix(in srgb, var(--color-text) 74%, transparent); margin-top: 7px; }
.lstrip figcaption b { color: var(--color-text); }

table { width: 100%; border-collapse: collapse; font-size: 14px; }
td { text-align: left; padding: 9px 10px; border-bottom: 1px solid var(--color-divider); }
td.n { text-align: right; font-variant-numeric: tabular-nums; }
tbody tr:last-child td { border-bottom: none; }
code { background: var(--color-tile); border: 1px solid var(--color-divider); border-radius: 6px; padding: 1px 7px; font-size: 12.5px; font-family: ui-monospace, Menlo, monospace; }

.foot { padding: 40px 0 70px; border-top: 1px solid var(--color-divider); color: var(--color-text-muted); font-size: 12.5px; text-align: center; }

/* Móvil: margen lateral de 1rem, consistente en todas las secciones y la portada */
@media (max-width: 560px) {
  .wrap { padding: 0 16px; }
  .r-hero .inner { padding: 0 16px; }
  section.blk { padding: 44px 0; }
  .tiles { gap: 12px; }
  .mos { gap: 14px; }
  /* portada: los bloques llenan el ancho en 2 columnas iguales */
  .hstats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .hstats stat-tile { min-width: 0; }
}

/* maniobras: leyenda con iconos + línea de tiempo con eje */
.mnv-legend { display: flex; flex-wrap: wrap; gap: 16px 26px; margin-bottom: 22px; }
.mnv-leg { display: flex; align-items: center; gap: 12px; }
.mnv-ic { width: 34px; height: 34px; padding: 7px; border-radius: 10px; flex: none; box-sizing: border-box;
  color: var(--c); background: color-mix(in srgb, var(--c) 16%, transparent); fill: none; stroke: var(--c); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.mnv-leg-txt { display: flex; flex-direction: column; line-height: 1.25; }
.mnv-leg-txt strong { font-size: 14.5px; font-weight: 700; color: var(--color-text); }
.mnv-leg-txt span { font-size: 12px; color: var(--color-text-muted); font-variant-numeric: tabular-nums; }
.mnv-track { position: relative; height: 30px; border-radius: 9px; background: color-mix(in srgb, var(--color-text) 7%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-text) 6%, transparent); }
.mnv-seg { position: absolute; top: 3px; bottom: 3px; margin: 0 1px; border-radius: 6px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--c) 88%, white 12%), var(--c));
  box-shadow: inset 0 1px 0 rgba(255,255,255,.22), 0 1px 3px color-mix(in srgb, var(--c) 40%, transparent); transition: filter .12s; }
.mnv-seg:hover { filter: brightness(1.16) saturate(1.12); transform: scaleY(1.12); }
.mnv-seg.mnv-dim { opacity: .32; filter: saturate(.55); }
/* tooltip del tramo */
.mnv-tip {
  position: absolute; bottom: calc(100% + 12px); transform: translateX(-50%); z-index: 6; pointer-events: none;
  min-width: 180px; padding: 12px 14px; border-radius: 13px; background: var(--color-surface-solid);
  border: 1px solid var(--color-divider); box-shadow: var(--shadow-lg);
}
.mnv-tip[hidden] { display: none; }
.mnv-tip::after { content: ""; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border: 7px solid transparent; border-top-color: var(--color-surface-solid); }
.mnv-tip-h { display: flex; align-items: center; gap: 9px; font-weight: 700; font-size: 14px; color: var(--color-text); margin-bottom: 9px; padding-bottom: 9px; border-bottom: 1px solid color-mix(in srgb, var(--color-divider) 60%, transparent); }
.mnv-tip-ic { width: 22px; height: 22px; padding: 4px; border-radius: 7px; box-sizing: border-box; flex: none; color: var(--c); background: color-mix(in srgb, var(--c) 18%, transparent); fill: none; stroke: var(--c); stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.mnv-tip-row { display: flex; justify-content: space-between; gap: 20px; font-size: 12.5px; padding: 2.5px 0; }
.mnv-tip-row span { color: var(--color-text-muted); }
.mnv-tip-row b { color: var(--color-text); font-variant-numeric: tabular-nums; }

/* score de pilotaje: anillo + barras + consejos */
.pscore { display: flex; align-items: center; gap: 34px; flex-wrap: wrap; }
.pscore-ring { position: relative; width: 132px; height: 132px; flex: none; }
.pscore-ring svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.pr-bg { fill: none; stroke: color-mix(in srgb, var(--color-text) 10%, transparent); stroke-width: 10; }
.pr-fg { fill: none; stroke-width: 10; stroke-linecap: round; }
.pscore-num { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.pscore-num strong { font-size: 40px; font-weight: 800; color: var(--color-text); line-height: 1; }
.pscore-num span { font-size: 11px; color: var(--color-text-muted); margin-top: 3px; text-transform: uppercase; letter-spacing: .08em; }
.pscore-bars { flex: 1; min-width: 260px; display: flex; flex-direction: column; gap: 13px; }
.pbar { display: grid; grid-template-columns: 84px 1fr 32px; align-items: center; gap: 13px; }
.pbar-l { font-size: 13.5px; font-weight: 600; color: var(--color-text-muted); }
.pbar-t { height: 9px; border-radius: 100px; background: color-mix(in srgb, var(--color-text) 9%, transparent); overflow: hidden; }
.pbar-f { height: 100%; border-radius: 100px; }
.pbar-v { font-size: 14.5px; font-weight: 700; color: var(--color-text); text-align: right; font-variant-numeric: tabular-nums; }
.pscore-tips { margin-top: 22px; display: flex; flex-direction: column; gap: 12px; }
.mnv-axis { position: relative; height: 16px; margin-top: 8px; }
.mnv-tick { position: absolute; transform: translateX(-50%); font-size: 11px; color: var(--color-text-muted); font-variant-numeric: tabular-nums; white-space: nowrap; }
.mnv-tick:first-child { transform: translateX(0); }
.mnv-tick:last-child { transform: translateX(-100%); }
`;
