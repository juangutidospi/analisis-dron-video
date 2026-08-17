// Posición del sol (elevación y azimut) y fase de luz para un instante y lugar.
// Algoritmo NOAA, sin dependencias. Complementa a daypart.js con el azimut.

const RAD = Math.PI / 180;

/**
 * Posición del sol para una fecha (instante UTC) y coordenadas.
 * @param {Date} date @param {number} lat @param {number} lon
 * @returns {{elevation:number, azimuth:number}} grados; azimut 0=N, 90=E, 180=S, 270=O.
 */
export function solarPosition(date, lat, lon) {
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
  // azimut desde el sur (+ hacia el oeste); se pasa a desde el norte (0=N, sentido horario)
  const azSouth = Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(latR) - Math.tan(decl) * Math.cos(latR));
  const azimuth = (azSouth / RAD + 180 + 360) % 360;
  return { elevation, azimuth };
}

/**
 * Fase de luz según la elevación solar.
 * @param {number} elevation grados
 * @returns {'day'|'golden'|'blue'|'twilight'|'night'}
 */
export function lightPhase(elevation) {
  if (elevation < -6) return 'night';
  if (elevation < -0.833) return 'blue';   // hora azul (crepúsculo civil)
  if (elevation <= 6) return 'golden';     // hora dorada (sol bajo)
  return 'day';
}

/** Punto cardinal (16 rumbos) para un azimut en grados. */
export function azToCompass(az) {
  const pts = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
  return pts[Math.round(((az % 360) / 22.5)) % 16];
}
