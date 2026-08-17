// Viento estimado por el método del triángulo del viento.
// Si el dron vuela a velocidad respecto al aire ~constante en varios rumbos,
// sus vectores de velocidad de tierra (este, norte) trazan un círculo cuyo
// CENTRO es el viento y cuyo RADIO es la velocidad respecto al aire (airspeed).
// Es una estimación: requiere variedad de rumbos y sale mejor en vuelos con giros.

/** Ajuste de círculo por mínimos cuadrados algebraicos (método de Kåsa). */
function kasaFit(pts) {
  let Sx = 0, Sy = 0, Sxx = 0, Syy = 0, Sxy = 0, Sxz = 0, Syz = 0, Sz = 0;
  const n = pts.length;
  for (const [x, y] of pts) {
    const z = x * x + y * y;
    Sx += x; Sy += y; Sxx += x * x; Syy += y * y; Sxy += x * y; Sxz += x * z; Syz += y * z; Sz += z;
  }
  // Resuelve [Sxx Sxy Sx; Sxy Syy Sy; Sx Sy n]·[A;B;C] = [Sxz;Syz;Sz]  (círculo x²+y² = A·x + B·y + C)
  const M = [[Sxx, Sxy, Sx], [Sxy, Syy, Sy], [Sx, Sy, n]];
  const rhs = [Sxz, Syz, Sz];
  const det3 = (m) =>
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
    - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
    + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const D = det3(M);
  if (Math.abs(D) < 1e-9) return null;
  const col = (m, i, v) => m.map((row, r) => row.map((val, c) => (c === i ? v[r] : val)));
  const A = det3(col(M, 0, rhs)) / D;
  const B = det3(col(M, 1, rhs)) / D;
  const C = det3(col(M, 2, rhs)) / D;
  const a = A / 2, b = B / 2;
  const r2 = C + a * a + b * b;
  if (r2 <= 0) return null;
  const r = Math.sqrt(r2);
  // residuo relativo del ajuste (0 = perfecto)
  let res = 0;
  for (const [x, y] of pts) res += (Math.hypot(x - a, y - b) - r) ** 2;
  return { a, b, r, rms: Math.sqrt(res / n) };
}

/**
 * Estima el viento a partir de la serie del vuelo.
 * @param {Array<{t:number,lat:number,lon:number}>} series
 * @returns {null | {speed:number, fromDeg:number, airspeed:number, quality:'good'|'rough', n:number}}
 *   speed = m/s del viento; fromDeg = dirección DE DÓNDE viene (0=N); airspeed = m/s respecto al aire.
 */
export function estimateWind(series) {
  // velocidad de tierra (este, norte) sobre ventanas de ~2 s para suavizar el ruido GPS
  const samples = [];
  let prev = null;
  for (const s of series) {
    if (s.lat == null || s.lon == null) continue;
    if (!prev) { prev = s; continue; }
    const dt = s.t - prev.t;
    if (dt < 1.5) continue;
    const latR = (prev.lat + s.lat) / 2 * Math.PI / 180;
    const vE = (s.lon - prev.lon) * 111320 * Math.cos(latR) / dt;
    const vN = (s.lat - prev.lat) * 110540 / dt;
    prev = s;
    const sp = Math.hypot(vE, vN);
    if (sp < 2 || sp > 25) continue; // solo crucero razonable
    samples.push([vE, vN]);
  }
  if (samples.length < 12) return null;
  // variedad de rumbos: repartimos en 8 sectores; hacen falta ≥5 ocupados
  const sectors = new Set();
  for (const [x, y] of samples) sectors.add(Math.floor(((Math.atan2(x, y) * 180 / Math.PI + 360) % 360) / 45));
  if (sectors.size < 5) return null;
  const fit = kasaFit(samples);
  if (!fit) return null;
  const speed = Math.hypot(fit.a, fit.b);
  if (fit.r < 1 || speed > fit.r * 1.5) return null; // airspeed irreal o viento mayor que airspeed → poco fiable
  const towardDeg = (Math.atan2(fit.a, fit.b) * 180 / Math.PI + 360) % 360; // hacia donde empuja el viento
  const fromDeg = (towardDeg + 180) % 360;                                  // de dónde viene (convención meteo)
  const quality = (sectors.size >= 6 && fit.rms < fit.r * 0.35) ? 'good' : 'rough';
  return { speed, fromDeg, airspeed: fit.r, quality, n: samples.length };
}
