// Preparación de la escena 3D del vuelo (agnóstica del motor de render).
// Proyecta lat/lon a metros locales (ENU), baja el DEM de Open-Meteo para la malla
// del terreno, compone la textura de satélite (teselas Esri) drapeada sobre el
// relieve, y expone la posición/rumbo/pitch del dron en cada instante.
// La usan tanto la rama de Three.js como la del renderer propio en canvas.

import { tileConfig, projector } from './geo.js';

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile';
const ELEV = 'https://api.open-meteo.com/v1/elevation';
const MPD_LAT = 111320; // metros por grado de latitud
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Elevación (m MSL) de una lista de puntos [lat,lon], en lotes de ≤100 con un
 * pequeño respiro entre peticiones y reintento con backoff ante el 429 de la API.
 * @param {Array<[number,number]>} points @returns {Promise<number[]|null>}
 */
async function fetchElevationGrid(points) {
  const out = [];
  for (let i = 0; i < points.length; i += 100) {
    const chunk = points.slice(i, i + 100);
    const lat = chunk.map((p) => p[0].toFixed(5)).join(',');
    const lon = chunk.map((p) => p[1].toFixed(5)).join(',');
    let ok = false;
    for (let tryN = 0; tryN < 4 && !ok; tryN++) {
      try {
        const res = await fetch(`${ELEV}?latitude=${lat}&longitude=${lon}`);
        if (res.status === 429) { await sleep(1200 * (tryN + 1)); continue; }
        if (!res.ok) return null;
        const data = await res.json();
        if (!Array.isArray(data.elevation) || data.elevation.length !== chunk.length) return null;
        out.push(...data.elevation); ok = true;
      } catch { await sleep(500); }
    }
    if (!ok) return null;
    if (i + 100 < points.length) await sleep(180); // respiro entre lotes
  }
  return out.length === points.length ? out : null;
}

/** lat/lon de las esquinas del lienzo de teselas (Web Mercator). */
function tileBounds(tc) {
  const n = 2 ** tc.z;
  const lon = (x) => x / n * 360 - 180;
  const lat = (y) => Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) * 180 / Math.PI;
  return { west: lon(tc.x0), east: lon(tc.x1 + 1), north: lat(tc.y0), south: lat(tc.y1 + 1) };
}

/** Compone las teselas Esri del encuadre en un <canvas> (para drapear como textura). */
async function buildTexture(tc) {
  const cv = document.createElement('canvas');
  cv.width = tc.compW; cv.height = tc.compH;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#243447'; ctx.fillRect(0, 0, cv.width, cv.height);
  const jobs = [];
  for (let ri = 0, y = tc.y0; y <= tc.y1; y++, ri++)
    for (let ci = 0, x = tc.x0; x <= tc.x1; x++, ci++) {
      const dx = ci * 256, dy = ri * 256;
      jobs.push(new Promise((res) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => { try { ctx.drawImage(img, dx, dy, 256, 256); } catch { /* taint */ } res(); };
        img.onerror = () => res();
        img.src = `${ESRI}/${tc.z}/${y}/${x}`;
      }));
    }
  await Promise.all(jobs);
  return cv;
}

/**
 * Prepara todos los datos de la escena 3D del vuelo.
 * @param {object} model modelo del vuelo
 * @param {{grid?:number}} [opts] grid = nº de vértices por lado de la malla del terreno
 * @returns {Promise<object>} datos listos para cualquier motor de render
 */
export async function buildScene3D(model, opts = {}) {
  const grid = Math.max(16, Math.min(64, opts.grid ?? 28));
  const tc = tileConfig(model.track);
  const { PX, PY } = projector(tc);
  const b = tileBounds(tc);

  // origen ENU en el centro del vuelo; x=este (m), z=norte→-Z (m)
  const [lat0, lon0] = model.center;
  const mpdLon = MPD_LAT * Math.cos(lat0 * Math.PI / 180);
  const X = (lon) => (lon - lon0) * mpdLon;
  const Z = (lat) => -(lat - lat0) * MPD_LAT;
  const uv = (lat, lon) => [PX(lon) / tc.compW, PY(lat) / tc.compH];

  // malla del terreno: grid×grid puntos sobre el bbox de teselas
  const pts = [];
  for (let r = 0; r < grid; r++)
    for (let c = 0; c < grid; c++) {
      const lat = b.north + (b.south - b.north) * (r / (grid - 1));
      const lon = b.west + (b.east - b.west) * (c / (grid - 1));
      pts.push([lat, lon]);
    }
  const elev = await fetchElevationGrid(pts); // metros MSL, o null si falla

  let elevMin = Infinity, elevMax = -Infinity;
  if (elev) for (const e of elev) { if (e < elevMin) elevMin = e; if (e > elevMax) elevMax = e; }
  if (!isFinite(elevMin)) { elevMin = 0; elevMax = 0; }
  const base = elevMin; // restamos la cota mínima para mantener números pequeños

  // altura del suelo bajo el despegue (para colocar el track por AGL/rel)
  const takeoffGround = elev ? sampleGrid(elev, grid, b, model.takeoff[0], model.takeoff[1]) : 0;

  // malla de render subdividida (más fina que el DEM) para un relieve suave
  const rgrid = elev ? Math.min(97, (grid - 1) * 3 + 1) : grid;
  const terrain = {
    grid: rgrid, base,
    elevMin, elevMax,
    // vértices en metros: {x, y (=elev-base), z, u, v}. La cota se muestrea del
    // DEM bilinealmente, así el terreno queda suave aunque el DEM sea más grueso.
    vertex(r, c) {
      const lat = b.north + (b.south - b.north) * (r / (rgrid - 1));
      const lon = b.west + (b.east - b.west) * (c / (rgrid - 1));
      const e = elev ? sampleGrid(elev, grid, b, lat, lon) : 0;
      const [u, v] = uv(lat, lon);
      return { x: X(lon), y: e - base, z: Z(lat), u, v };
    },
    hasDEM: !!elev,
  };

  // altura de mundo del dron (m) para una altura relativa rel
  const worldY = (rel) => (takeoffGround - base) + (rel ?? 0);

  // track 3D coloreado por altura
  const S = model.series.filter((s) => s.lat != null && s.t != null);
  const relMax = Math.max(1, ...S.map((s) => s.rel ?? 0));
  const track = S.map((s) => ({ x: X(s.lon), y: worldY(s.rel), z: Z(s.lat), t: s.t, rel: s.rel ?? 0 }));

  // posición interpolada del dron en un instante (m), con pitch y velocidad
  const posAt = (time) => {
    let i = 1; while (i < S.length && S[i].t < time) i++;
    const a = S[i - 1], c = S[Math.min(i, S.length - 1)];
    const span = (c.t - a.t) || 1, f = Math.max(0, Math.min(1, (time - a.t) / span));
    const lerp = (k) => (a[k] ?? 0) + ((c[k] ?? 0) - (a[k] ?? 0)) * f;
    return { x: X(lerp('lon')), y: worldY(lerp('rel')), z: Z(lerp('lat')), pitch: (lerp('pitch') || 0) * Math.PI / 180, hs: lerp('hs') };
  };

  /**
   * Estado del dron en el instante t. El rumbo se calcula con una ventana de
   * ±1.2 s (estable), y es NaN cuando el dron está prácticamente quieto (hover),
   * para que la cámara mantenga el último rumbo en vez de dar saltos.
   */
  const droneAt = (t) => {
    const p = posAt(t), a = posAt(t - 1.2), c = posAt(t + 1.2);
    const dxp = c.x - a.x, dzp = c.z - a.z, dist = Math.hypot(dxp, dzp);
    const heading = dist > 1.5 ? Math.atan2(dxp, -dzp) : NaN;
    return { x: p.x, y: p.y, z: p.z, pitch: p.pitch, hs: p.hs, heading };
  };

  const texture = await buildTexture(tc);

  return {
    // extensión del terreno en metros (para encuadrar la cámara)
    bounds: {
      x0: X(b.west), x1: X(b.east), z0: Z(b.north), z1: Z(b.south),
      spanX: X(b.east) - X(b.west), spanZ: Z(b.south) - Z(b.north),
    },
    terrain, texture, track, droneAt, relMax,
    takeoffXZ: { x: X(model.takeoff[1]), z: Z(model.takeoff[0]), y: worldY(0) },
    duration: model.meta.dur || (S.length ? S[S.length - 1].t : 0),
  };
}

/** Interpola bilinealmente un valor de la malla en (lat, lon). */
function sampleGrid(elev, grid, b, lat, lon) {
  const fr = (b.north - lat) / (b.north - b.south) * (grid - 1);
  const fc = (lon - b.west) / (b.east - b.west) * (grid - 1);
  const r = Math.max(0, Math.min(grid - 1, fr)), c = Math.max(0, Math.min(grid - 1, fc));
  const r0 = Math.floor(r), c0 = Math.floor(c), r1 = Math.min(grid - 1, r0 + 1), c1 = Math.min(grid - 1, c0 + 1);
  const tr = r - r0, tcc = c - c0;
  const g = (rr, cc) => elev[rr * grid + cc];
  const top = g(r0, c0) + (g(r0, c1) - g(r0, c0)) * tcc;
  const bot = g(r1, c0) + (g(r1, c1) - g(r1, c0)) * tcc;
  return top + (bot - top) * tr;
}

/** Color RGB (0-1) por altura normalizada, azul→naranja (igual que el mapa 2D). */
export function altColor(rel, relMax) {
  const t = Math.max(0, Math.min(1, (rel || 0) / relMax));
  const a = [76 / 255, 149 / 255, 1], d = [1, 138 / 255, 76 / 255];
  return [a[0] + (d[0] - a[0]) * t, a[1] + (d[1] - a[1]) * t, a[2] + (d[2] - a[2]) * t];
}
