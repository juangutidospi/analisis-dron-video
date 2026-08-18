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
export const DEFAULT_CFG = { units: 'metric', gauges: { speed: 1, alt: 1, dist: 1, vspeed: 0, heading: 1, clock: 1, minimap: 1, progress: 1, watermark: 0 } };
/** Orden de los gauges para el panel de ajustes. */
export const GAUGE_KEYS = ['speed', 'alt', 'dist', 'vspeed', 'heading', 'clock', 'minimap', 'progress', 'watermark'];

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
  const title = opts.title || '';
  // track para el mini-mapa (bounding box en proyección equirectangular sencilla)
  const T = (model.track || []).filter((p) => p && p[0] != null);
  const lats = T.map((p) => p[0]), lons = T.map((p) => p[1]);
  const mm = T.length ? {
    la0: Math.min(...lats), la1: Math.max(...lats), lo0: Math.min(...lons), lo1: Math.max(...lons),
    cosLat: Math.cos((Math.min(...lats) + Math.max(...lats)) / 2 * Math.PI / 180) || 1,
  } : null;

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

  // mini-mapa: trazado + despegue + posición actual, ajustado al rectángulo dado
  const minimap = (ctx, x, y, bw, bh, curLat, curLon) => {
    if (!mm) return;
    ctx.save();
    roundRect(ctx, x, y, bw, bh, bw * 0.06);
    ctx.fillStyle = 'rgba(10,12,18,.42)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = bw * 0.012; ctx.stroke();
    ctx.clip();
    const pad = 0.16;
    const spanLo = (mm.lo1 - mm.lo0) * mm.cosLat || 1e-6, spanLa = (mm.la1 - mm.la0) || 1e-6;
    const sc = Math.min(bw * (1 - pad) / spanLo, bh * (1 - pad) / spanLa);
    const cx = x + bw / 2, cy = y + bh / 2, mLo = (mm.lo0 + mm.lo1) / 2, mLa = (mm.la0 + mm.la1) / 2;
    const PX = (lo) => cx + (lo - mLo) * mm.cosLat * sc, PY = (la) => cy - (la - mLa) * sc;
    ctx.beginPath();
    T.forEach((p, i) => { const px = PX(p[1]), py = PY(p[0]); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = Math.max(1, bw * 0.016); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
    ctx.fillStyle = '#37cf6b'; ctx.beginPath(); ctx.arc(PX(tk[1]), PY(tk[0]), bw * 0.03, 0, 7); ctx.fill();
    if (curLat != null) {
      ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(PX(curLon), PY(curLat), bw * 0.045, 0, 7); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = bw * 0.016; ctx.stroke();
    }
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

    // mini-mapa (arriba izquierda, bajo el reloj)
    if (gz.minimap) {
      ctx.shadowColor = 'transparent';
      const mw = Math.min(w, h) * 0.3, mh = mw * 0.64;
      minimap(ctx, U * 1.3, gz.clock ? U * 4.4 : U * 1.3, mw, mh, s.lat, s.lon);
    }

    // barra de progreso (borde inferior)
    if (gz.progress) {
      ctx.shadowColor = 'transparent';
      const p = Math.max(0, Math.min(1, t / (S[S.length - 1].t || 1)));
      const bh = Math.max(2, U * 0.3);
      ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(0, h - bh, w, bh);
      ctx.fillStyle = accent; ctx.fillRect(0, h - bh, w * p, bh);
    }

    // marca de agua (arriba centro)
    if (gz.watermark && title) {
      ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = U * 0.6; ctx.shadowOffsetY = U * 0.06;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.font = `600 ${U * 1.05}px ${FONT}`; ls(ctx, U * 0.05);
      ctx.fillStyle = 'rgba(255,255,255,.72)';
      ctx.fillText(title, w / 2, U * 1.5); ls(ctx, 0);
    }

    ctx.restore();
  };

  return { draw };
}
