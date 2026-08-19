// Etiquetado automático de maniobras: segmenta la trayectoria del vuelo y
// clasifica cada tramo (órbita, ascenso, descenso, pasada, estático) según la
// velocidad, la tasa de giro y la velocidad vertical. Devuelve los tramos y un
// resumen por tipo.

import { hav } from './srt.js';

/** Tipos de maniobra y su color (para timeline e informe). */
export const MANEUVER_TYPES = ['orbit', 'turn', 'climb', 'descent', 'cruise', 'hover'];
export const MANEUVER_COLOR = { orbit: '#a06bff', turn: '#ffb43d', climb: '#37cf6b', descent: '#ff5d5d', cruise: '#5b9dff', hover: '#8a93a6' };
/** Icono (path SVG 24×24, solo trazo) por tipo de maniobra. */
export const MANEUVER_ICON = {
  orbit: 'M20 12a8 8 0 1 1-3-6.2 M20 4v4h-4',
  turn: 'M4 13a8 8 0 0 1 13-5 M18 4v4h-4',
  climb: 'M12 20V6 M6 11l6-6 6 6',
  descent: 'M12 4v14 M6 13l6 6 6-6',
  cruise: 'M3 12h15 M13 7l5 5-5 5',
  hover: 'M9 5v14 M15 5v14',
};

const bearing = (la1, lo1, la2, lo2) => {
  const p1 = la1 * Math.PI / 180, p2 = la2 * Math.PI / 180, dl = (lo2 - lo1) * Math.PI / 180;
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
};

/**
 * @param {object} model modelo del vuelo (series)
 * @param {{minDur?:number, turnRate?:number, vsTh?:number, hoverSpd?:number, orbitDeg?:number}} [opts]
 * @returns {{segments:Array<{t0:number,t1:number,type:string,turnDeg?:number}>, summary:Object}}
 */
export function detectManeuvers(model, opts = {}) {
  const S = model.series || [];
  const minDur = opts.minDur ?? 3, turnRate = opts.turnRate ?? 8, vsTh = opts.vsTh ?? 1.2;
  const hoverSpd = opts.hoverSpd ?? 1.2, orbitDeg = opts.orbitDeg ?? 200;
  if (S.length < 4) return { segments: [], summary: {} };

  // 1) estado de cada muestra + tasa de giro con signo (°/s)
  const P = [];
  for (let i = 0; i < S.length; i++) {
    const s = S[i], hs = s.hs ?? 0, vs = s.vs ?? 0;
    let turn = 0;
    if (i >= 1 && i < S.length - 1 && S[i - 1].lat != null && s.lat != null && S[i + 1].lat != null) {
      const h1 = bearing(S[i - 1].lat, S[i - 1].lon, s.lat, s.lon);
      const h2 = bearing(s.lat, s.lon, S[i + 1].lat, S[i + 1].lon);
      const dt = (S[i + 1].t - S[i - 1].t) / 2; // intervalo entre los centros de los dos tramos
      if (dt > 0) turn = (((h2 - h1 + 540) % 360) - 180) / dt;
    }
    let st;
    if (hs < hoverSpd) st = 'hover';
    else if (Math.abs(turn) > turnRate && hs > 1.5) st = 'turn';
    else if (vs > vsTh) st = 'climb';
    else if (vs < -vsTh) st = 'descent';
    else st = 'cruise';
    P.push({ t: s.t, st, turn });
  }

  // 2) agrupar muestras consecutivas del mismo estado
  const raw = [];
  for (const p of P) {
    const last = raw[raw.length - 1];
    if (last && last.st === p.st) { last.t1 = p.t; last.pts.push(p); }
    else raw.push({ st: p.st, t0: p.t, t1: p.t, pts: [p] });
  }

  // 3) filtrar por duración y refinar (los giros largos y sostenidos son órbitas)
  const segments = [];
  for (const seg of raw) {
    if (seg.t1 - seg.t0 < minDur) continue;
    let type = seg.st, turnDeg;
    if (seg.st === 'turn') {
      let acc = 0;
      for (let i = 1; i < seg.pts.length; i++) acc += seg.pts[i].turn * (seg.pts[i].t - seg.pts[i - 1].t);
      turnDeg = Math.round(Math.abs(acc));
      type = turnDeg >= orbitDeg ? 'orbit' : 'turn';
    }
    segments.push(turnDeg != null ? { t0: seg.t0, t1: seg.t1, type, turnDeg } : { t0: seg.t0, t1: seg.t1, type });
  }

  // 4) los giros muy leves no son maniobra: pasan a pasada
  for (const s of segments) if (s.type === 'turn' && (s.turnDeg || 0) < (opts.minTurnDeg ?? 25)) { s.type = 'cruise'; delete s.turnDeg; }
  // 5) fusionar tramos consecutivos del mismo tipo separados por huecos cortos
  const merged = [];
  for (const s of segments) {
    const last = merged[merged.length - 1];
    if (last && last.type === s.type && s.t0 - last.t1 <= (opts.mergeGap ?? 4)) { last.t1 = s.t1; if (s.turnDeg) last.turnDeg = (last.turnDeg || 0) + s.turnDeg; }
    else merged.push({ ...s });
  }

  // 6) estadísticas por tramo (para los tooltips)
  for (const seg of merged) {
    let n = 0, sumHs = 0, minR = Infinity, maxR = -Infinity;
    for (const s of S) {
      if (s.t < seg.t0) continue; if (s.t > seg.t1) break;
      if (s.hs != null) { sumHs += s.hs; n++; }
      if (s.rel != null) { if (s.rel < minR) minR = s.rel; if (s.rel > maxR) maxR = s.rel; }
    }
    seg.avgHs = n ? sumHs / n : 0;
    seg.minRel = isFinite(minR) ? minR : null;
    seg.maxRel = isFinite(maxR) ? maxR : null;
  }

  // 7) resumen por tipo (nº de tramos)
  const summary = {};
  for (const s of merged) summary[s.type] = (summary[s.type] || 0) + 1;
  return { segments: merged, summary };
}
