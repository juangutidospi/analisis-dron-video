// Proyección Web Mercator, configuración de teselas y puntos clave del vuelo.
// Puerto de src/common.py (keypoints) y src/satellite.py (cálculo de teselas).

import { hav } from './srt.js';

export const mmss = (t) => { t = Math.round(t); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
const kmh = (x) => x.hs != null ? x.hs * 3.6 : null;

/** Calcula los 8 hitos del vuelo (mismo orden y criterios que common.py). */
export function keypoints(d) {
  const S = d.series, tk = d.takeoff;
  for (const x of S) x.far = hav(tk[0], tk[1], x.lat, x.lon);
  const by = (fn) => S.reduce((a, b) => fn(b) > fn(a) ? b : a);
  const alto = by(x => x.rel);
  const lejano = by(x => x.far);
  const rapido = S.filter(x => x.hs != null).reduce((a, b) => b.hs > a.hs ? b : a);
  const umbral = Math.min(100, 0.8 * Math.max(...S.map(x => x.rel)));
  let desc_start = alto;
  for (let i = S.length - 1; i > 0; i--) { if (S[i].rel > umbral) { desc_start = S[i]; break; } }
  const dive = S.reduce((a, b) => (b.vs ?? 9) < (a.vs ?? 9) ? b : a);
  const luz = by(x => x.iso);
  const f0 = (v) => `${Math.round(v)}`;
  const kp = [
    ['up', 'Despegue', S[0], `${f0(S[0].rel)} m`, 'Altura al iniciar'],
    ['light', 'Menos luz', luz, `ISO ${f0(luz.iso)}`, 'Máxima sensibilidad'],
    ['far', 'Punto más lejano', lejano, `${f0(lejano.far)} m`, 'Del despegue'],
    ['hi', 'Punto más alto', alto, `${f0(alto.rel)} m`, 'Sobre el despegue'],
    ['topdesc', 'Inicio del descenso', desc_start, `${f0(desc_start.rel)} m`, 'Empieza a bajar'],
    ['fast', 'Velocidad máxima', rapido, `${f0(kmh(rapido))} km/h`, 'Horizontal'],
    ['dive', 'Descenso más rápido', dive, `${(Math.abs(dive.vs)).toFixed(1)} m/s`, 'Bajada máxima'],
    ['down', 'Aterrizaje', S[S.length - 1], `${f0(S[S.length - 1].rel)} m`, 'Al tocar suelo'],
  ];
  return kp.map(([key, label, x, metric, sub]) => ({ key, label, x, metric, sub, t: x.t, lat: x.lat, lon: x.lon }));
}

/** Determina zoom y rango de teselas que cubren el track (≤30 teselas), como satellite.py. */
export function tileConfig(track) {
  const T = track.filter(p => p[0] != null);
  const lats = T.map(p => p[0]), lons = T.map(p => p[1]);
  let la0 = Math.min(...lats), la1 = Math.max(...lats);
  let lo0 = Math.min(...lons), lo1 = Math.max(...lons);
  const dla = (la1 - la0) * 0.06 || 1e-4, dlo = (lo1 - lo0) * 0.06 || 1e-4;
  la0 -= dla; la1 += dla; lo0 -= dlo; lo1 += dlo;
  // ensancha el encuadre a formato ligeramente apaisado para que el mapa llene el
  // bloque, pero ceñido al recorrido: así entra más zoom y no se ve pequeño.
  const targetAR = 1.15;
  const cosLat = Math.cos(((la0 + la1) / 2) * Math.PI / 180);
  const wSpan = (lo1 - lo0) * cosLat, hSpan = (la1 - la0);
  if (wSpan / hSpan < targetAR) {
    const add = (hSpan * targetAR / cosLat - (lo1 - lo0)) / 2;
    lo0 -= add; lo1 += add;
  }
  const tilesAt = (z) => {
    const n = 2 ** z;
    const xt = (lon) => (lon + 180) / 360 * n;
    const yt = (lat) => { const r = lat * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n; };
    const x0 = Math.floor(xt(lo0)), x1 = Math.floor(xt(lo1));
    const y0 = Math.floor(yt(la1)), y1 = Math.floor(yt(la0));
    return { x0, x1, y0, y1, count: (x1 - x0 + 1) * (y1 - y0 + 1) };
  };
  let z = 17;
  for (let zz = 20; zz >= 14; zz--) { if (tilesAt(zz).count <= 30) { z = zz; break; } }
  const { x0, x1, y0, y1 } = tilesAt(z);
  const cols = x1 - x0 + 1, rows = y1 - y0 + 1;
  return { z, x0, x1, y0, y1, cols, rows, originX: x0 * 256, originY: y0 * 256, compW: cols * 256, compH: rows * 256 };
}

/** Proyecta lon/lat a píxel dentro del lienzo de teselas. */
export function projector(tc) {
  const n = 2 ** tc.z;
  const PX = (lon) => (lon + 180) / 360 * n * 256 - tc.originX;
  const PY = (lat) => { const r = lat * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n * 256 - tc.originY; };
  return { PX, PY };
}
