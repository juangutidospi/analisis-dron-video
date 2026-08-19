// Puntuación de pilotaje + coaching: analiza la suavidad del vuelo (aceleración,
// control de altura, giros y estabilidad del gimbal) y devuelve una nota global
// 0-100 por aspecto, más consejos concretos. Todo heurístico sobre la serie.

const bearing = (la1, lo1, la2, lo2) => {
  const p1 = la1 * Math.PI / 180, p2 = la2 * Math.PI / 180, dl = (lo2 - lo1) * Math.PI / 180;
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
};
const clamp = (x) => Math.max(0, Math.min(100, Math.round(x)));

/**
 * @param {object} model modelo del vuelo (series)
 * @returns {{overall:number, aspects:{smoothness:number,altitude:number,turns:number,gimbal:number}, tips:Array<{level:'good'|'warn',key:string}>}|null}
 */
export function computePilotScore(model) {
  const S = (model.series || []).filter((s) => s.hs != null && s.t != null);
  if (S.length < 8) return null;
  const t = S.map((s) => s.t);
  const sm = (vals, w = 2) => { const o = new Array(vals.length); for (let i = 0; i < vals.length; i++) { let s = 0, n = 0; for (let j = -w; j <= w; j++) { const k = i + j; if (k >= 0 && k < vals.length && vals[k] != null) { s += vals[k]; n++; } } o[i] = n ? s / n : 0; } return o; };
  const rmsDeriv = (vals) => { let s = 0, n = 0; for (let i = 1; i < vals.length; i++) { const dt = t[i] - t[i - 1]; if (dt > 0) { const d = (vals[i] - vals[i - 1]) / dt; s += d * d; n++; } } return Math.sqrt(s / Math.max(1, n)); };

  // suavizamos las señales GPS antes de derivar (evita penalizar el ruido)
  const rmsAcc = rmsDeriv(sm(S.map((s) => s.hs ?? 0)));       // aceleración horizontal
  const rmsVAcc = rmsDeriv(sm(S.map((s) => s.vs ?? 0)));      // aceleración vertical
  const rmsPitchRate = rmsDeriv(sm(S.map((s) => s.pitch ?? 0))); // velocidad de cabeceo del gimbal

  // suavidad de giro: variabilidad de la tasa de rumbo (con velocidad suficiente)
  const rate = [];
  for (let i = 1; i < S.length - 1; i++) {
    if (S[i - 1].lat != null && S[i].lat != null && S[i + 1].lat != null && (S[i].hs ?? 0) > 1.5) {
      const h1 = bearing(S[i - 1].lat, S[i - 1].lon, S[i].lat, S[i].lon);
      const h2 = bearing(S[i].lat, S[i].lon, S[i + 1].lat, S[i + 1].lon);
      const dt = (S[i + 1].t - S[i - 1].t) / 2;
      if (dt > 0) rate.push((((h2 - h1 + 540) % 360) - 180) / dt);
    }
  }
  const rateSm = sm(rate);
  let tj = 0, tn = 0; for (let i = 1; i < rateSm.length; i++) { const d = rateSm[i] - rateSm[i - 1]; tj += d * d; tn++; }
  const rmsTurnJerk = tn ? Math.sqrt(tj / tn) : 0;

  const smoothness = clamp(100 - rmsAcc * 40);
  const altitude = clamp(100 - rmsVAcc * 55);
  const turnsScore = clamp(100 - rmsTurnJerk * 22);
  const gimbal = clamp(100 - rmsPitchRate * 12);
  const overall = clamp(smoothness * 0.3 + altitude * 0.25 + turnsScore * 0.25 + gimbal * 0.2);
  const aspects = { smoothness, altitude, turns: turnsScore, gimbal };

  // coaching: avisar de los aspectos flojos y elogiar el mejor
  const rank = [['smoothness', smoothness], ['altitude', altitude], ['turns', turnsScore], ['gimbal', gimbal]];
  const tips = [];
  for (const [key, v] of rank) if (v < 55) tips.push({ level: 'warn', key });
  const best = rank.slice().sort((a, b) => b[1] - a[1])[0];
  if (best[1] >= 82) tips.push({ level: 'good', key: best[0] });
  return { overall, aspects, tips };
}
