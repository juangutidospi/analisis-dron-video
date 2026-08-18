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
export const DEFAULT_CFG = { units: 'metric', theme: 'modern', gauges: { speed: 1, alt: 1, dist: 1, vspeed: 0, heading: 1, clock: 1, minimap: 1, progress: 1, watermark: 0 } };
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
  // máximos reales del vuelo → escala estable de los diales de aviación
  const maxHs = S.reduce((m, p) => Math.max(m, p.hs || 0), 1);
  const maxRel = S.reduce((m, p) => Math.max(m, p.rel || 0), 1);
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
    // alabeo estimado (giro coordinado): tan(bank) = v·ω/g
    let bank = 0;
    const j0 = Math.max(1, i - 1), j1 = Math.min(i + 1, S.length - 1);
    if (S[j0 - 1]?.lat != null && S[j0].lat != null && S[j1 - 1]?.lat != null && S[j1]?.lat != null && S[j1].t > S[j0].t) {
      const h1 = bearing(S[j0 - 1].lat, S[j0 - 1].lon, S[j0].lat, S[j0].lon);
      const h2 = bearing(S[j1 - 1].lat, S[j1 - 1].lon, S[j1].lat, S[j1].lon);
      const dh = ((h2 - h1 + 540) % 360) - 180;
      const om = dh * Math.PI / 180 / (S[j1].t - S[j0].t);
      bank = Math.max(-40, Math.min(40, Math.atan((lerp('hs') || 0) * om / 9.81) * 180 / Math.PI));
    }
    return {
      hs: lerp('hs'), rel: lerp('rel'), vs: lerp('vs'), lat, lon, pitch: lerp('pitch'), bank,
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

  // ---- tema "instrumentos de aviación" ----
  const AMBER = '#ffb43d';
  // redondea a un máximo "bonito" (1/2/5 ×10ⁿ) para graduar los diales
  const niceMax = (v) => { if (v <= 0) return 1; const p = 10 ** Math.floor(Math.log10(v)); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; };

  // bisel metálico + filo brillante (aro del instrumento)
  const bezel = (ctx, cx, cy, R) => {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = R * 0.16; ctx.shadowOffsetY = R * 0.06;
    const g = ctx.createLinearGradient(cx, cy - R, cx, cy + R);
    g.addColorStop(0, '#676e7d'); g.addColorStop(.5, '#20242e'); g.addColorStop(1, '#090b10');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();
    ctx.restore();
    // reflejo torneado (sheen): luz arriba-izquierda, sombra abajo-derecha
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,.24)'; ctx.lineWidth = R * 0.05; ctx.beginPath(); ctx.arc(cx, cy, R * 0.955, Math.PI * 1.08, Math.PI * 1.62); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.arc(cx, cy, R * 0.955, Math.PI * 0.12, Math.PI * 0.6); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = R * 0.012; ctx.beginPath(); ctx.arc(cx, cy, R * 0.985, 0, 7); ctx.stroke();
  };

  // cara oscura abombada + viñeta (fondo de los diales)
  const instrBase = (ctx, cx, cy, R) => {
    bezel(ctx, cx, cy, R);
    const rf = R * 0.9;
    let f = ctx.createRadialGradient(cx - rf * 0.3, cy - rf * 0.35, rf * 0.1, cx, cy, rf);
    f.addColorStop(0, '#1b212c'); f.addColorStop(.7, '#0c0f15'); f.addColorStop(1, '#05070b');
    ctx.fillStyle = f; ctx.beginPath(); ctx.arc(cx, cy, rf, 0, 7); ctx.fill();
    let v = ctx.createRadialGradient(cx, cy, rf * 0.55, cx, cy, rf);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.5)');
    ctx.fillStyle = v; ctx.beginPath(); ctx.arc(cx, cy, rf, 0, 7); ctx.fill();
    // chaflán interior (bisel torneado): luz arriba, sombra abajo
    ctx.lineWidth = R * 0.02;
    ctx.strokeStyle = 'rgba(255,255,255,.26)'; ctx.beginPath(); ctx.arc(cx, cy, rf, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.arc(cx, cy, rf, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
  };

  // reflejo de cristal (se pinta al final, sobre el contenido)
  const glass = (ctx, cx, cy, R) => {
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.9, 0, 7); ctx.clip();
    const g = ctx.createLinearGradient(cx, cy - R, cx, cy + R * 0.15);
    g.addColorStop(0, 'rgba(255,255,255,.15)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, cy - R * 0.34, R * 0.72, R * 0.44, 0, 0, 7); ctx.fill();
    const sp = ctx.createRadialGradient(cx - R * 0.34, cy - R * 0.42, 0, cx - R * 0.34, cy - R * 0.42, R * 0.42);
    sp.addColorStop(0, 'rgba(255,255,255,.4)'); sp.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sp; ctx.beginPath(); ctx.arc(cx - R * 0.34, cy - R * 0.42, R * 0.42, 0, 7); ctx.fill();
    ctx.restore();
  };

  const dial = (ctx, cx, cy, R, value, unit, label, max, redline) => {
    const A0 = 135 * Math.PI / 180, SPAN = 270 * Math.PI / 180; // arco abierto abajo
    instrBase(ctx, cx, cy, R);
    ctx.save();
    // pista + arco de valor (con brillo)
    ctx.lineCap = 'round'; ctx.lineWidth = R * 0.05;
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.arc(cx, cy, R * 0.78, A0, A0 + SPAN); ctx.stroke();
    const frac = Math.max(0, Math.min(1, value / (max || 1)));
    ctx.strokeStyle = accent; ctx.shadowColor = accent; ctx.shadowBlur = R * 0.12;
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.78, A0, A0 + SPAN * frac); ctx.stroke();
    ctx.shadowColor = 'transparent';
    if (redline) { ctx.strokeStyle = '#ff4d4d'; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.arc(cx, cy, R * 0.78, A0 + SPAN * 0.9, A0 + SPAN); ctx.stroke(); ctx.lineCap = 'round'; }
    // graduaciones + números
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i <= 10; i++) {
      const a = A0 + SPAN * i / 10, major = i % 2 === 0, r1 = R * 0.68, r2 = major ? R * 0.56 : R * 0.62;
      ctx.strokeStyle = `rgba(255,255,255,${major ? .8 : .38})`; ctx.lineWidth = R * (major ? 0.028 : 0.015);
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); ctx.stroke();
      if (major) { ctx.fillStyle = 'rgba(255,255,255,.78)'; ctx.font = `600 ${R * 0.12}px ${FONT}`; ctx.fillText(`${Math.round(max * i / 10)}`, cx + Math.cos(a) * R * 0.42, cy + Math.sin(a) * R * 0.42); }
    }
    // marcas finas intermedias
    for (let i = 1; i < 20; i += 2) {
      const a = A0 + SPAN * i / 20;
      ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = R * 0.01;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * R * 0.68, cy + Math.sin(a) * R * 0.68); ctx.lineTo(cx + Math.cos(a) * R * 0.63, cy + Math.sin(a) * R * 0.63); ctx.stroke();
    }
    // aguja afilada + contrapeso
    const a = A0 + SPAN * frac;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = R * 0.04; ctx.shadowOffsetX = R * 0.015; ctx.shadowOffsetY = R * 0.015;
    ctx.fillStyle = accent; ctx.beginPath(); ctx.moveTo(-R * 0.14, R * 0.03); ctx.lineTo(R * 0.62, 0); ctx.lineTo(-R * 0.14, -R * 0.03); ctx.closePath(); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#c9ced8'; ctx.beginPath(); ctx.arc(-R * 0.14, 0, R * 0.045, 0, 7); ctx.fill();
    ctx.restore();
    // buje central (metálico)
    let hub = ctx.createRadialGradient(cx - R * 0.02, cy - R * 0.02, R * 0.005, cx, cy, R * 0.09);
    hub.addColorStop(0, '#eef1f6'); hub.addColorStop(1, '#444a56');
    ctx.fillStyle = hub; ctx.beginPath(); ctx.arc(cx, cy, R * 0.075, 0, 7); ctx.fill();
    // etiqueta arriba + lectura digital abajo
    ctx.fillStyle = accent; ctx.font = `700 ${R * 0.13}px ${FONT}`; ls(ctx, R * 0.02); ctx.fillText(label, cx, cy - R * 0.54); ls(ctx, 0);
    const vs = `${Math.round(value)}`;
    ctx.font = `600 ${R * 0.24}px ${FONT}`; const vw = ctx.measureText(vs).width;
    ctx.font = `600 ${R * 0.12}px ${FONT}`; const uw = ctx.measureText(unit).width;
    const pw = vw + uw + R * 0.28, py = cy + R * 0.5;
    roundRect(ctx, cx - pw / 2, py - R * 0.16, pw, R * 0.32, R * 0.06); ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff'; ctx.font = `600 ${R * 0.24}px ${FONT}`; ctx.fillText(vs, cx - pw / 2 + R * 0.1, py);
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.font = `600 ${R * 0.12}px ${FONT}`; ctx.fillText(unit, cx - pw / 2 + R * 0.1 + vw + R * 0.07, py);
    ctx.restore();
    glass(ctx, cx, cy, R);
  };

  const attitude = (ctx, cx, cy, R, pitch, roll) => {
    const ppd = R / 30; // píxeles por grado
    bezel(ctx, cx, cy, R);
    // horizonte (recortado al cristal, girado por alabeo)
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.9, 0, 7); ctx.clip();
    ctx.translate(cx, cy); ctx.rotate(-roll * Math.PI / 180);
    const hy = pitch * ppd;
    let sky = ctx.createLinearGradient(0, -2.4 * R, 0, hy);
    sky.addColorStop(0, '#0e3c74'); sky.addColorStop(1, '#5ba0da');
    ctx.fillStyle = sky; ctx.fillRect(-2 * R, -2.4 * R, 4 * R, 2.4 * R + hy);
    let gnd = ctx.createLinearGradient(0, hy, 0, 2.4 * R);
    gnd.addColorStop(0, '#9c7238'); gnd.addColorStop(1, '#3f2d12');
    ctx.fillStyle = gnd; ctx.fillRect(-2 * R, hy, 4 * R, 2.4 * R);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = R * 0.018; ctx.beginPath(); ctx.moveTo(-2 * R, hy); ctx.lineTo(2 * R, hy); ctx.stroke();
    // escalera de cabeceo
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineCap = 'round';
    for (const d of [-20, -15, -10, -5, 5, 10, 15, 20]) {
      const y = hy - d * ppd, major = d % 10 === 0, ww = major ? R * 0.3 : R * 0.15;
      ctx.strokeStyle = 'rgba(255,255,255,.88)'; ctx.lineWidth = R * 0.013;
      ctx.beginPath(); ctx.moveTo(-ww, y); ctx.lineTo(ww, y); ctx.stroke();
      if (major) { ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.font = `500 ${R * 0.1}px ${FONT}`; ctx.fillText(`${Math.abs(d)}`, -ww - R * 0.13, y); ctx.fillText(`${Math.abs(d)}`, ww + R * 0.13, y); }
    }
    ctx.restore();
    // escala de alabeo fija + puntero móvil
    ctx.save(); ctx.translate(cx, cy);
    for (const b of [-60, -45, -30, -20, -10, 0, 10, 20, 30, 45, 60]) {
      const a = (-90 + b) * Math.PI / 180, major = b % 30 === 0, r1 = R * 0.9, r2 = major ? R * 0.79 : R * 0.84;
      ctx.strokeStyle = 'rgba(255,255,255,.82)'; ctx.lineWidth = R * (major ? 0.02 : 0.012);
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.moveTo(0, -R * 0.79); ctx.lineTo(-R * 0.05, -R * 0.9); ctx.lineTo(R * 0.05, -R * 0.9); ctx.closePath(); ctx.fill();
    ctx.rotate(-roll * Math.PI / 180);
    ctx.fillStyle = AMBER; ctx.beginPath(); ctx.moveTo(0, -R * 0.77); ctx.lineTo(-R * 0.055, -R * 0.66); ctx.lineTo(R * 0.055, -R * 0.66); ctx.closePath(); ctx.fill();
    ctx.restore();
    // símbolo del avión (fijo, ámbar)
    ctx.save();
    ctx.strokeStyle = AMBER; ctx.lineWidth = R * 0.045; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - R * 0.42, cy); ctx.lineTo(cx - R * 0.16, cy); ctx.lineTo(cx - R * 0.16, cy + R * 0.09);
    ctx.moveTo(cx + R * 0.42, cy); ctx.lineTo(cx + R * 0.16, cy); ctx.lineTo(cx + R * 0.16, cy + R * 0.09);
    ctx.stroke();
    ctx.fillStyle = AMBER; ctx.beginPath(); ctx.arc(cx, cy, R * 0.03, 0, 7); ctx.fill();
    ctx.restore();
    // inclinómetro (bola de derrape) — vuelo coordinado → centrada
    ctx.save();
    const by = cy + R * 0.64;
    ctx.strokeStyle = 'rgba(255,255,255,.32)'; ctx.lineWidth = R * 0.1; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, by - R * 1.15, R * 1.25, Math.PI * 0.455, Math.PI * 0.545); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = R * 0.012;
    ctx.beginPath(); ctx.moveTo(cx - R * 0.08, by - R * 0.075); ctx.lineTo(cx - R * 0.08, by + R * 0.055); ctx.moveTo(cx + R * 0.08, by - R * 0.075); ctx.lineTo(cx + R * 0.08, by + R * 0.055); ctx.stroke();
    ctx.fillStyle = '#f4f6fa'; ctx.beginPath(); ctx.arc(cx, by, R * 0.05, 0, 7); ctx.fill();
    ctx.restore();
    glass(ctx, cx, cy, R);
  };

  // cinta de rumbo (ribbon) con marcas, cardinales e índice central
  const headingTape = (ctx, cx, cy, W, heading) => {
    const H = W * 0.14, x0 = cx - W / 2, y0 = cy - H / 2, ppd = W / 84;
    ctx.save();
    roundRect(ctx, x0, y0, W, H, H * 0.32);
    ctx.fillStyle = 'rgba(8,10,15,.72)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.save(); roundRect(ctx, x0, y0, W, H, H * 0.32); ctx.clip();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const start = Math.floor((heading - 45) / 5) * 5;
    for (let deg = start; deg <= heading + 45; deg += 5) {
      const x = cx + (deg - heading) * ppd, dd = ((deg % 360) + 360) % 360, major = dd % 10 === 0;
      ctx.strokeStyle = `rgba(255,255,255,${major ? .6 : .32})`; ctx.lineWidth = major ? 1.6 : 1;
      ctx.beginPath(); ctx.moveTo(x, y0 + H * (major ? 0.42 : 0.5)); ctx.lineTo(x, y0 + H * 0.64); ctx.stroke();
      if (dd % 30 === 0) {
        const lbl = dd % 90 === 0 ? ['N', 'E', 'S', 'O'][dd / 90 % 4] : String(dd / 10).padStart(2, '0');
        ctx.fillStyle = dd % 90 === 0 ? accent : 'rgba(255,255,255,.85)';
        ctx.font = `700 ${H * 0.26}px ${FONT}`; ctx.fillText(lbl, x, y0 + H * 0.26);
      }
    }
    ctx.restore();
    // índice central + lectura recuadrada
    const bw = H * 1.5, bh = H * 0.62;
    roundRect(ctx, cx - bw / 2, y0 - bh * 0.72, bw, bh, bh * 0.22); ctx.fillStyle = accent; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `700 ${bh * 0.5}px ${FONT}`; ctx.fillText(`${Math.round(heading)}°`, cx, y0 - bh * 0.4);
    ctx.fillStyle = accent; ctx.beginPath(); ctx.moveTo(cx - H * 0.11, y0); ctx.lineTo(cx + H * 0.11, y0); ctx.lineTo(cx, y0 + H * 0.16); ctx.closePath(); ctx.fill();
    ctx.restore();
  };

  const drawAviation = (ctx, s, w, h, U, un) => {
    const R = Math.min(w, h) * 0.135, cy = h - R - U * 1.4, gap = R * 2.3;
    ctx.save(); ctx.shadowColor = 'transparent';
    dial(ctx, w / 2 - gap, cy, R * 0.9, un.spd(s.hs || 0), un.spdU, 'VEL', niceMax(un.spd(maxHs)), true);
    attitude(ctx, w / 2, cy, R, s.pitch || 0, s.bank || 0);
    dial(ctx, w / 2 + gap, cy, R * 0.9, un.len(s.rel || 0), un.lenU, 'ALT', niceMax(un.len(maxRel)), false);
    if (s.heading != null) headingTape(ctx, w / 2, cy - R - U * 2.1, R * 3.4, s.heading);
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

    if (cfg.theme === 'aviation') { drawAviation(ctx, s, w, h, U, un); } else {
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
