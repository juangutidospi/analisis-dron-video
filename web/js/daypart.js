// Franja del día del vuelo a partir de la elevación del sol en el instante,
// lugar y fecha de inicio (algoritmo NOAA, sin dependencias).

const RAD = Math.PI / 180;

/**
 * Elevación solar (grados) y signo del ángulo horario (mañana<0 / tarde>0).
 * @param {Date} date instante (UTC) @param {number} lat @param {number} lon
 */
function solarElevation(date, lat, lon) {
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((date - yearStart) / 86400000);
  const hourUTC = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const g = (2 * Math.PI / 365) * (dayOfYear - 1 + (hourUTC - 12) / 24);
  const eqtime = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g)
    - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g)
    + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const tst = hourUTC * 60 + eqtime + 4 * lon; // tiempo solar verdadero (min)
  const ha = (tst / 4 - 180) * RAD;            // ángulo horario (rad)
  const latR = lat * RAD;
  const cosZ = Math.sin(latR) * Math.sin(decl) + Math.cos(latR) * Math.cos(decl) * Math.cos(ha);
  const elevation = 90 - Math.acos(Math.max(-1, Math.min(1, cosZ))) / RAD;
  return { elevation, ha };
}

/**
 * Clasifica la franja del día.
 * @param {string} startStr fecha/hora local del SRT ("YYYY-MM-DD HH:MM:SS")
 * @param {number} lat @param {number} lon
 * @returns {'sunrise'|'sunset'|'morning'|'afternoon'|'night'}
 */
export function dayBand(startStr, lat, lon) {
  const date = new Date(startStr.replace(' ', 'T')); // hora local → instante UTC (según zona del navegador)
  const { elevation, ha } = solarElevation(date, lat, lon);
  // orto/ocaso y noche por posición solar; mañana/tarde por hora de reloj (más natural)
  if (elevation < -6) return 'night';
  if (elevation <= 8) return ha < 0 ? 'sunrise' : 'sunset';
  const localHour = parseInt(startStr.slice(11, 13), 10) + parseInt(startStr.slice(14, 16), 10) / 60;
  return localHour < 12 ? 'morning' : 'afternoon';
}
