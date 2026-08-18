// Detección de "momentos destacados" del vuelo: analiza la serie y extrae los
// instantes clave (máxima velocidad, altura, distancia, ascenso/descenso y giro
// más cerrado). Base para marcar el timeline y montar un auto-trailer.

import { hav } from './srt.js';

const bearing = (la1, lo1, la2, lo2) => {
  const p1 = la1 * Math.PI / 180, p2 = la2 * Math.PI / 180, dl = (lo2 - lo1) * Math.PI / 180;
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
};

/** Prioridad al desempatar momentos próximos o recortar el número. */
const PRIO = { speed: 5, alt: 4, dist: 3, climb: 2, descent: 2, turn: 1 };

/**
 * @param {object} model modelo del vuelo (series, takeoff)
 * @param {{minGap?:number, max?:number}} [opts] minGap = seg mínimos entre momentos; max = nº máximo
 * @returns {Array<{t:number, type:'speed'|'alt'|'dist'|'climb'|'descent'|'turn', value:number, unit:string}>}
 */
export function detectHighlights(model, opts = {}) {
  const S = model.series || [], tk = model.takeoff || [];
  if (S.length < 2) return [];
  const minGap = opts.minGap ?? 2.5, max = opts.max ?? 7;
  const minTurnSpeed = opts.minTurnSpeed ?? 3; // m/s: por debajo, el rumbo GPS es ruido

  let iSpd = -1, vSpd = -1, iAlt = -1, vAlt = -1, iDist = -1, vDist = -1;
  let iClimb = -1, vClimb = -1, iDesc = -1, vDesc = Infinity, iTurn = -1, vTurn = -1;
  for (let i = 0; i < S.length; i++) {
    const s = S[i];
    if (s.hs != null && s.hs > vSpd) { vSpd = s.hs; iSpd = i; }
    if (s.rel != null && s.rel > vAlt) { vAlt = s.rel; iAlt = i; }
    if (s.lat != null && tk.length) { const d = hav(tk[0], tk[1], s.lat, s.lon); if (d > vDist) { vDist = d; iDist = i; } }
    if (s.vs != null && s.vs > vClimb) { vClimb = s.vs; iClimb = i; }
    if (s.vs != null && s.vs < vDesc) { vDesc = s.vs; iDesc = i; }
    if (i >= 2 && S[i - 2].lat != null && S[i - 1].lat != null && s.lat != null && (s.hs ?? 0) >= minTurnSpeed) {
      const h1 = bearing(S[i - 2].lat, S[i - 2].lon, S[i - 1].lat, S[i - 1].lon);
      const h2 = bearing(S[i - 1].lat, S[i - 1].lon, s.lat, s.lon);
      const dt = s.t - S[i - 2].t;
      if (dt > 0) { const rate = Math.abs(((h2 - h1 + 540) % 360) - 180) / dt; if (rate > vTurn) { vTurn = rate; iTurn = i; } }
    }
  }

  const cand = [];
  const add = (i, type, value, unit) => { if (i >= 0 && isFinite(value)) cand.push({ t: S[i].t, type, value, unit }); };
  add(iSpd, 'speed', vSpd, 'm/s');
  add(iAlt, 'alt', vAlt, 'm');
  add(iDist, 'dist', vDist, 'm');
  if (vClimb > 0.5) add(iClimb, 'climb', vClimb, 'm/s');
  if (vDesc < -0.5) add(iDesc, 'descent', vDesc, 'm/s');
  if (vTurn > 5) add(iTurn, 'turn', vTurn, '°/s');

  // fusionar los momentos demasiado próximos, quedándose con el de mayor prioridad
  cand.sort((a, b) => a.t - b.t);
  const out = [];
  for (const c of cand) {
    const near = out.find((o) => Math.abs(o.t - c.t) < minGap);
    if (!near) out.push(c);
    else if (PRIO[c.type] > PRIO[near.type]) Object.assign(near, c);
  }
  // recortar al máximo por prioridad y devolver en orden temporal
  if (out.length > max) { out.sort((a, b) => PRIO[b.type] - PRIO[a.type]); out.length = max; }
  return out.sort((a, b) => a.t - b.t);
}

/**
 * Ventanas de tiempo para el auto-trailer: un tramo alrededor de cada momento,
 * recortado al vuelo y fusionando los que se solapan.
 * @param {Array<{t:number}>} highlights
 * @param {number} dur duración del vuelo (s)
 * @param {{pre?:number, post?:number}} [opts] segundos antes/después de cada momento
 * @returns {Array<{start:number, end:number}>}
 */
export function buildTrailerSegments(highlights, dur, opts = {}) {
  if (!highlights?.length || !dur) return [];
  let pre = opts.pre ?? 1.5, post = opts.post ?? 2.5;
  if (opts.target) { const per = opts.target / highlights.length; pre = per * 0.4; post = per * 0.6; } // reparte la duración objetivo
  const wins = highlights
    .map((h) => ({ start: Math.max(0, h.t - pre), end: Math.min(dur, h.t + post) }))
    .filter((w) => w.end > w.start)
    .sort((a, b) => a.start - b.start);
  const merged = [];
  for (const w of wins) {
    const last = merged[merged.length - 1];
    if (last && w.start <= last.end) last.end = Math.max(last.end, w.end);
    else merged.push({ ...w });
  }
  return merged;
}

/**
 * Opacidad del fundido a negro para un instante de un tramo del trailer: 1 en
 * los extremos (negro), 0 en el interior. Da la transición entre cortes y la
 * apertura/cierre del trailer.
 * @param {number} ct instante actual dentro del tramo (s)
 * @param {number} start inicio del tramo (s)
 * @param {number} end fin del tramo (s)
 * @param {number} xf duración del fundido (s)
 * @returns {number} 0..1
 */
export function trailerFade(ct, start, end, xf) {
  const w = Math.min(xf, (end - start) / 2);
  if (w <= 0) return 0;
  const a = Math.max(1 - (ct - start) / w, 1 - (end - ct) / w);
  return Math.max(0, Math.min(1, a));
}

