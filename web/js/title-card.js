// Portada animada para el inicio del trailer: fondo premium, el recorrido del
// vuelo dibujándose con glow, título + lugar con animación de entrada y las
// cifras clave. Se pinta por frame con el progreso p (0..1) y funde a negro al
// final para encadenar con la primera escena.

const FONT = '-apple-system, "SF Pro Display", system-ui, sans-serif';
const ls = (ctx, v) => { if ('letterSpacing' in ctx) ctx.letterSpacing = `${v}px`; };
const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
const ease = (x) => 1 - (1 - Math.max(0, Math.min(1, x))) ** 3;           // easeOutCubic
const easeBack = (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2; };
const seg = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));      // tramo normalizado (en segundos)

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} t instante de la portada (s)
 * @param {number} dur duración total de la portada (s); el fundido de salida ocurre al final
 * @param {{kicker?:string,title?:string,place?:string,accent?:string,track?:Array<[number,number]>,stats?:Array<{label:string,value:string}>}} data
 */
export function drawTitleCard(ctx, W, H, t, dur, data) {
  const { kicker = '', title = '', place = '', accent = '#5b9dff', track = [], stats = [] } = data || {};
  const U = Math.min(W, H) * 0.03;
  ctx.save();
  ctx.textAlign = 'center';

  // fondo premium: radial oscuro + glow de acento + viñeta
  let bg = ctx.createRadialGradient(W / 2, H * 0.5, 0, W / 2, H * 0.5, Math.max(W, H) * 0.72);
  bg.addColorStop(0, '#13161f'); bg.addColorStop(1, '#05070b');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  let gl = ctx.createRadialGradient(W / 2, H * 0.56, 0, W / 2, H * 0.56, W * 0.55);
  gl.addColorStop(0, hexA(accent, 0.18)); gl.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
  let vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, Math.max(W, H) * 0.72);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.6)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

  // recorrido dibujándose (glow), en la banda central-inferior
  const T = track.filter((pt) => pt && pt[0] != null);
  if (T.length > 1) {
    const lats = T.map((a) => a[0]), lons = T.map((a) => a[1]);
    const la0 = Math.min(...lats), la1 = Math.max(...lats), lo0 = Math.min(...lons), lo1 = Math.max(...lons);
    const cosLat = Math.cos((la0 + la1) / 2 * Math.PI / 180) || 1;
    const cx = W / 2, cy = H * 0.58, bw = W * 0.46, bh = H * 0.26;
    const spanLo = (lo1 - lo0) * cosLat || 1e-6, spanLa = (la1 - la0) || 1e-6;
    const sc = Math.min(bw / spanLo, bh / spanLa);
    const mLo = (lo0 + lo1) / 2, mLa = (la0 + la1) / 2;
    const PX = (lo) => cx + (lo - mLo) * cosLat * sc, PY = (la) => cy - (la - mLa) * sc;
    const td = ease(seg(t, 0.15, 1.4));
    const n = Math.max(2, Math.floor(T.length * td));
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = hexA(accent, 0.12); ctx.lineWidth = U * 0.3;
    ctx.beginPath(); T.forEach((pt, i) => { const x = PX(pt[1]), y = PY(pt[0]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
    ctx.strokeStyle = accent; ctx.lineWidth = U * 0.36; ctx.shadowColor = accent; ctx.shadowBlur = U * 1.2;
    ctx.beginPath(); for (let i = 0; i < n; i++) { const x = PX(T[i][1]), y = PY(T[i][0]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#37cf6b'; ctx.beginPath(); ctx.arc(PX(T[0][1]), PY(T[0][0]), U * 0.26, 0, 7); ctx.fill();
    if (td < 1) { const pt = T[n - 1]; ctx.fillStyle = '#fff'; ctx.shadowColor = accent; ctx.shadowBlur = U * 1.6; ctx.beginPath(); ctx.arc(PX(pt[1]), PY(pt[0]), U * 0.3, 0, 7); ctx.fill(); ctx.shadowBlur = 0; }
  }

  // kicker (mayúsculas, tracking amplio)
  const kA = ease(seg(t, 0.4, 0.9));
  if (kA > 0 && kicker) {
    ctx.globalAlpha = kA; ctx.textBaseline = 'middle'; ctx.fillStyle = accent;
    ctx.font = `700 ${U * 0.92}px ${FONT}`; ls(ctx, U * 0.42);
    ctx.fillText(kicker.toUpperCase(), W / 2, H * 0.16); ls(ctx, 0); ctx.globalAlpha = 1;
  }
  // título (scale con rebote + fade)
  const tp = seg(t, 0.6, 1.35), tA = ease(tp);
  if (tA > 0 && title) {
    ctx.save(); ctx.globalAlpha = tA; ctx.translate(W / 2, H * 0.28);
    const scv = 0.9 + 0.1 * easeBack(Math.min(1, tp / 0.9)); ctx.scale(scv, scv);
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.font = `800 ${U * 2.5}px ${FONT}`; ls(ctx, U * 0.01);
    ctx.fillText(title, 0, 0); ls(ctx, 0); ctx.restore();
  }
  // lugar (pin + nombre)
  const pA = ease(seg(t, 1.0, 1.5));
  if (pA > 0 && place) {
    ctx.globalAlpha = pA; ctx.textBaseline = 'middle';
    ctx.font = `600 ${U * 1.05}px ${FONT}`;
    const tw = ctx.measureText(place).width, dot = U * 0.85, gap = U * 0.35, x0 = W / 2 - (dot + gap + tw) / 2, y = H * 0.38;
    const px = x0 + dot / 2, py = y;
    ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(px, py - dot * 0.12, dot * 0.4, Math.PI, 0); ctx.lineTo(px, py + dot * 0.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px, py - dot * 0.12, dot * 0.14, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.textAlign = 'left'; ctx.fillText(place, x0 + dot + gap, py);
    ctx.textAlign = 'center'; ctx.globalAlpha = 1;
  }
  // cifras clave (fila inferior, con stagger)
  if (stats.length) {
    const nS = stats.length, gapx = (W * 0.78) / Math.max(1, nS - 1), x0 = nS > 1 ? W / 2 - gapx * (nS - 1) / 2 : W / 2, yv = H * 0.84;
    stats.forEach((st, i) => {
      const a = ease(seg(t, 1.2 + i * 0.18, 1.6 + i * 0.18)); if (a <= 0) return;
      const x = x0 + gapx * i; ctx.globalAlpha = a;
      ctx.fillStyle = '#fff'; ctx.textBaseline = 'alphabetic'; ctx.font = `700 ${U * 1.55}px ${FONT}`; ls(ctx, -U * 0.01);
      ctx.fillText(st.value, x, yv); ls(ctx, 0);
      ctx.fillStyle = accent; ctx.textBaseline = 'top'; ctx.font = `700 ${U * 0.66}px ${FONT}`; ls(ctx, U * 0.12);
      ctx.fillText(st.label.toUpperCase(), x, yv + U * 0.35); ls(ctx, 0); ctx.globalAlpha = 1;
    });
  }

  // fundidos: desde negro al abrir, a negro al cerrar (encadena con la primera escena)
  const dark = Math.max(1 - seg(t, 0, 0.25), seg(t, dur - 0.4, dur));
  if (dark > 0) { ctx.fillStyle = `rgba(0,0,0,${dark})`; ctx.fillRect(0, 0, W, H); }
  ctx.restore();
}
