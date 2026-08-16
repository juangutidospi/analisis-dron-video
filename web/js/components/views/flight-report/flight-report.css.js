import { css } from '../../../core/css.js';

export const styles = css`
:host { display: block; animation: rise .6s cubic-bezier(.22,1,.36,1) both; padding-bottom: clamp(96px, 14vh, 140px); }
/* con vídeo, la miniatura (PiP) sube más: reserva algo más de hueco al final */
:host(.has-video) { padding-bottom: clamp(150px, 24vh, 240px); }
@keyframes rise { from { opacity: 0; transform: translateY(16px); } }
.wrap { max-width: var(--maxw); margin: 0 auto; padding: 0 24px; }

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
`;
