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

/** Extrae las primeras coordenadas (lat, lon) del texto de un .SRT. */
export function firstCoords(srtText) {
  const la = srtText.match(/latitude:\s*([-\d.]+)/);
  const lo = srtText.match(/longitude:\s*([-\d.]+)/);
  return la && lo ? [parseFloat(la[1]), parseFloat(lo[1])] : null;
}
