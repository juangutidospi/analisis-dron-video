// Elevación del terreno bajo el vuelo, para calcular la altura real sobre el suelo (AGL).
// Usa la API de elevación de Open-Meteo (DEM Copernicus ~90 m, con CORS, sin clave).
// No sube el SRT ni el vídeo; solo consulta coordenadas, como las teselas del mapa.

const ENDPOINT = 'https://api.open-meteo.com/v1/elevation';

/**
 * Elevación (m sobre el nivel del mar) para una lista de puntos [lat, lon].
 * Trocea en peticiones de ≤100 puntos. Devuelve un array alineado o null si falla.
 * @param {Array<[number, number]>} points
 * @returns {Promise<number[]|null>}
 */
export async function fetchTerrain(points) {
  if (!Array.isArray(points) || !points.length) return null;
  const out = [];
  try {
    for (let i = 0; i < points.length; i += 100) {
      const chunk = points.slice(i, i + 100);
      const lat = chunk.map((p) => p[0].toFixed(5)).join(',');
      const lon = chunk.map((p) => p[1].toFixed(5)).join(',');
      const res = await fetch(`${ENDPOINT}?latitude=${lat}&longitude=${lon}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (!Array.isArray(data.elevation) || data.elevation.length !== chunk.length) return null;
      out.push(...data.elevation);
    }
  } catch {
    return null;
  }
  return out.length === points.length ? out : null;
}
