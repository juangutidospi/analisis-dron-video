// Geocodificación inversa (coordenadas -> lugar) con Nominatim de OpenStreetMap,
// sin clave. Falla en silencio (devuelve null) si no hay red o la responde mal.

import { getLang } from './i18n/index.js';

/**
 * Devuelve el nombre de lugar más adecuado para unas coordenadas.
 * @param {number} lat @param {number} lon
 * @returns {Promise<string|null>}
 */
export async function reverseGeocode(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=12&addressdetails=1&lat=${lat}&lon=${lon}&accept-language=${getLang()}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const d = await res.json();
    const a = d.address || {};
    return a.village || a.town || a.city || a.municipality || a.county || a.state_district || a.state || d.name || null;
  } catch (_) {
    return null;
  }
}

/** Extrae las primeras coordenadas (lat, lon) con GPS válido del texto de un .SRT.
 *  Salta el sentinela `0.000000, 0.000000` que DJI escribe antes del fix GPS
 *  (si no, el nombre del lugar se geocodifica en el golfo de Guinea). */
export function firstCoords(srtText) {
  const re = /latitude:\s*(-?[\d.]+)\]\s*\[longitude:\s*(-?[\d.]+)/g;
  let m;
  while ((m = re.exec(srtText)) !== null) {
    const la = parseFloat(m[1]), lo = parseFloat(m[2]);
    if (la !== 0 || lo !== 0) return [la, lo];
  }
  return null;
}
