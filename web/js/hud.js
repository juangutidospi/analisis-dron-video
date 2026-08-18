// Motor de HUD: dibuja gauges de telemetría sobre un canvas, sincronizados por
// tiempo con la serie del vuelo. Independiente del render: dado t, pinta el frame.
// Convención de overlay de vídeo: texto blanco + scrim oscuro (legible sobre
// cualquier metraje), con el color de acento para los realces.

import { hav } from './srt.js';

const bearing = (la1, lo1, la2, lo2) => {
  const p1 = la1 * Math.PI / 180, p2 = la2 * Math.PI / 180, dl = (lo2 - lo1) * Math.PI / 180;
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
};

const CARD = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];

/** Config por defecto del HUD (qué gauges y unidades). */
export const DEFAULT_CFG = { units: 'metric', gauges: { speed: 1, alt: 1, dist: 1, vspeed: 0, heading: 1, clock: 1 } };
/** Orden de los gauges para el panel de ajustes. */
export const GAUGE_KEYS = ['speed', 'alt', 'dist', 'vspeed', 'heading', 'clock'];

const CONV = {
  metric: { spd: (v) => v * 3.6, spdU: 'km/h', len: (v) => v, lenU: 'm', vs: (v) => v, vsU: 'm/s' },
  imperial: { spd: (v) => v * 2.23694, spdU: 'mph', len: (v) => v * 3.28084, lenU: 'ft', vs: (v) => v * 3.28084, vsU: 'ft/s' },
};

/**
 * @param {object} model modelo del vuelo (series, meta, takeoff)
 * @param {{accent?:string}} [opts]
 * @returns {{draw:(ctx:CanvasRenderingContext2D, t:number, w:number, h:number)=>void}}
 */
export function createHud(model, opts = {}) {
  const S = model.series, tk = model.takeoff;
  const accent = opts.accent || '#5b9dff';

  const sample = (t) => {
    let i = 1;
    while (i < S.length && S[i].t < t) i++;
    const a = S[i - 1], b = S[Math.min(i, S.length - 1)];
    const span = (b.t - a.t) || 1, f = Math.max(0, Math.min(1, (t - a.t) / span));
    const lerp = (k) => (a[k] != null && b[k] != null) ? a[k] + (b[k] - a[k]) * f : (a[k] ?? b[k]);
    const lat = lerp('lat'), lon = lerp('lon');
    return {
      hs: lerp('hs'), rel: lerp('rel'), vs: lerp('vs'), lat, lon,
      far: (lat != null) ? hav(tk[0], tk[1], lat, lon) : null,
      heading: (a.lat != null && b.lat != null) ? bearing(a.lat, a.lon, b.lat, b.lon) : null,
    };
  };

  const roundRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  };

  const FONT = '-apple-system, "SF Pro Display", system-ui, sans-serif';
  const ls = (ctx, v) => { if ('letterSpacing' in ctx) ctx.letterSpacing = `${v}px`; };

  const metric = (ctx, cx, baseY, U, value, unit, label) => {
    // etiqueta: fina, con tracking amplio
    ctx.textAlign = 'center';
    ctx.font = `600 ${U * 1.05}px ${FONT}`; ls(ctx, U * 0.16);
    ctx.fillStyle = accent;
    ctx.fillText(label, cx, baseY - U * 3.15); ls(ctx, 0);
    // valor + unidad, centrados como grupo, con peso ligero
    const vFont = `450 ${U * 3.0}px ${FONT}`, uFont = `500 ${U * 1.25}px ${FONT}`;
    ctx.font = vFont; ls(ctx, -U * 0.04); const vw = ctx.measureText(value).width; ls(ctx, 0);
    ctx.font = uFont; const uw = ctx.measureText(unit).width;
    const gap = U * 0.34, startX = cx - (vw + gap + uw) / 2;
    ctx.textAlign = 'left';
    ctx.font = vFont; ls(ctx, -U * 0.04); ctx.fillStyle = '#fff'; ctx.fillText(value, startX, baseY); ls(ctx, 0);
    ctx.font = uFont; ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillText(unit, startX + vw + gap, baseY);
  };

  const compass = (ctx, cx, cy, R, heading) => {
    ctx.save();
    ctx.lineCap = 'round';
    // disco muy sutil + anillo fino
    ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = R * 0.12;
    ctx.fillStyle = 'rgba(10,12,18,.26)'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = R * 0.026; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();
    // marcas cada 45° (finas)
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4, major = i % 2 === 0;
      const r2 = major ? R * 0.8 : R * 0.86;
      ctx.strokeStyle = `rgba(255,255,255,${major ? .55 : .3})`; ctx.lineWidth = R * (major ? 0.03 : 0.02);
      ctx.beginPath(); ctx.moveTo(cx + Math.sin(a) * R * 0.9, cy - Math.cos(a) * R * 0.9); ctx.lineTo(cx + Math.sin(a) * r2, cy - Math.cos(a) * r2); ctx.stroke();
    }
    // aguja fina bicolor (cola blanca, punta de acento)
    const a = (heading || 0) * Math.PI / 180, sn = Math.sin(a), cs = Math.cos(a);
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = R * 0.055;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx - sn * R * 0.4, cy + cs * R * 0.4); ctx.stroke();
    ctx.strokeStyle = accent; ctx.lineWidth = R * 0.065;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + sn * R * 0.66, cy - cs * R * 0.66); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, R * 0.055, 0, 7); ctx.fill();
    // N (fina)
    ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `600 ${R * 0.32}px ${FONT}`; ctx.fillText('N', cx, cy - R * 0.68);
    ctx.restore();
  };

  const draw = (ctx, t, w, h, cfg) => {
    cfg = cfg || DEFAULT_CFG;
    const gz = cfg.gauges || DEFAULT_CFG.gauges;
    const un = CONV[cfg.units] || CONV.metric;
    const s = sample(t);
    const U = Math.max(6, Math.min(w, h) * 0.03); // unidad proporcional
    ctx.save();
    ctx.textBaseline = 'alphabetic';

    // scrims sutiles (arriba y abajo) para legibilidad, sin sombra
    let g = ctx.createLinearGradient(0, h * 0.68, 0, h);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.4)');
    ctx.fillStyle = g; ctx.fillRect(0, h * 0.68, w, h * 0.32);
    g = ctx.createLinearGradient(0, 0, 0, h * 0.24);
    g.addColorStop(0, 'rgba(0,0,0,.26)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h * 0.24);

    // sombra suave: los elementos "flotan" sobre el metraje
    ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = U * 0.7; ctx.shadowOffsetY = U * 0.06;

    // métricas abajo (según los gauges activos y las unidades)
    const metrics = [];
    if (gz.speed) metrics.push([`${Math.round(un.spd(s.hs || 0))}`, un.spdU, 'VEL']);
    if (gz.alt) metrics.push([`${Math.round(un.len(s.rel || 0))}`, un.lenU, 'ALT']);
    if (gz.dist) metrics.push([`${Math.round(un.len(s.far || 0))}`, un.lenU, 'DIST']);
    if (gz.vspeed) metrics.push([`${un.vs(s.vs || 0).toFixed(1)}`, un.vsU, 'VERT']);
    const baseY = h - U * 1.8;
    metrics.forEach((m, i) => metric(ctx, w * ((i + 0.5) / metrics.length), baseY, U, m[0], m[1], m[2]));

    // brújula arriba derecha (más fina y compacta)
    if (gz.heading) {
      const R = Math.min(w, h) * 0.108;
      compass(ctx, w - R - U * 1.5, R + U * 1.4, R, s.heading);
      if (s.heading != null) {
        ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.font = `600 ${U * 1.1}px ${FONT}`; ls(ctx, U * 0.06);
        ctx.fillText(`${CARD[Math.round(s.heading / 45) % 8]} ${Math.round(s.heading)}°`, w - R - U * 1.5, R * 2 + U * 1.6); ls(ctx, 0);
      }
    }

    // reloj arriba izquierda (píldora fina)
    if (gz.clock) {
      ctx.textBaseline = 'middle';
      const tm = `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
      ctx.font = `550 ${U * 1.35}px ${FONT}`; ls(ctx, U * 0.02);
      const tw = ctx.measureText(tm).width;
      ctx.fillStyle = 'rgba(10,12,18,.32)'; roundRect(ctx, U * 1.3, U * 1.15, tw + U * 1.7, U * 2.2, U * 1.1); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.96)'; ctx.textAlign = 'left';
      ctx.fillText(tm, U * 2.15, U * 2.3); ls(ctx, 0);
    }

    ctx.restore();
  };

  return { draw };
}
