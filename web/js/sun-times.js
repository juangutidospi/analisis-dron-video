// Horas solares del lugar y día del vuelo: amanecer, atardecer y golden hour
// (mañana y tarde), a partir de la elevación solar calculada por solar.js.
// Sirve para decir si el vuelo cazó la buena luz y cuándo volver.

import { solarPosition } from './solar.js';

/**
 * @param {Date} date día del vuelo (se usa la fecha; se recorre el día entero)
 * @param {number} lat @param {number} lon
 * @returns {{sunrise:number|null, sunset:number|null, goldenMorning:[number,number]|null, goldenEvening:[number,number]|null, noonEl:number}} minutos desde medianoche
 */
export function sunTimes(date, lat, lon) {
  const base = new Date(date); base.setHours(0, 0, 0, 0);
  const el = [];
  for (let m = 0; m <= 1440; m += 2) el.push({ m, e: solarPosition(new Date(base.getTime() + m * 60000), lat, lon).elevation });
  const interp = (i, thr) => { const a = el[i - 1], b = el[i]; const f = (thr - a.e) / (b.e - a.e || 1e-9); return a.m + f * (b.m - a.m); };
  const cross = (thr, up) => { for (let i = 1; i < el.length; i++) { const a = el[i - 1].e, b = el[i].e; if (up && a < thr && b >= thr) return interp(i, thr); if (!up && a >= thr && b < thr) return interp(i, thr); } return null; };
  const sunrise = cross(0, true), sunset = cross(0, false);
  const ghMornEnd = cross(6, true), ghEveStart = cross(6, false);
  const noonEl = Math.max(...el.map((x) => x.e));
  return {
    sunrise, sunset, noonEl,
    goldenMorning: (sunrise != null && ghMornEnd != null && ghMornEnd > sunrise) ? [sunrise, ghMornEnd] : null,
    goldenEvening: (ghEveStart != null && sunset != null && sunset > ghEveStart) ? [ghEveStart, sunset] : null,
  };
}

/** ¿El minuto del día `min` cae en alguna golden hour? Devuelve 'morning'|'evening'|null. */
export function inGolden(min, times) {
  if (times.goldenMorning && min >= times.goldenMorning[0] && min <= times.goldenMorning[1]) return 'morning';
  if (times.goldenEvening && min >= times.goldenEvening[0] && min <= times.goldenEvening[1]) return 'evening';
  return null;
}
