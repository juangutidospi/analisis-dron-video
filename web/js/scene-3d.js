// Preparación de la escena 3D del vuelo (agnóstica del motor de render).
// Proyecta lat/lon a metros locales (ENU), baja el DEM del terreno de teselas
// Terrarium (terrain-RGB de AWS: sin clave, con CORS y sin límite por minuto),
// compone la textura de satélite (teselas Esri) drapeada sobre el relieve, y
// expone la posición/rumbo/pitch del dron en cada instante.
// La usan tanto la rama de Three.js como la del renderer propio en canvas.

import { tileConfig, projector } from './geo.js';

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile';
const TERRARIUM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium';
const MPD_LAT = 111320; // metros por grado de latitud

/**
 * DEM del terreno a partir de teselas Terrarium (terrain-RGB). Compone las
 * teselas que cubren el bbox en un lienzo, lee los píxeles una vez y devuelve un
 * muestreador de altura (m) interpolado bilinealmente. La cota se codifica como
 * h = R*256 + G + B/256 − 32768.
 * @returns {Promise<{heightAt:(lat:number,lon:number)=>number}|null>}
 */
async function fetchTerrainDEM(b) {
  const ze = 13; // zoom del DEM: ~1-4 teselas para un vuelo, resolución ~10-30 m
  const n = 2 ** ze;
  const lon2px = (lon) => (lon + 180) / 360 * n * 256;
  const lat2px = (lat) => { const r = lat * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n * 256; };
  const x0 = Math.floor(lon2px(b.west) / 256), x1 = Math.floor(lon2px(b.east) / 256);
  const y0 = Math.floor(lat2px(b.north) / 256), y1 = Math.floor(lat2px(b.south) / 256);
  const W = (x1 - x0 + 1) * 256, H = (y1 - y0 + 1) * 256;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = 'rgb(128,0,0)'; ctx.fillRect(0, 0, W, H); // 0 m por defecto

  let okCount = 0, total = 0;
  const jobs = [];
  for (let yt = y0; yt <= y1; yt++)
    for (let xt = x0; xt <= x1; xt++) {
      total++;
      jobs.push(new Promise((res) => {
        const img = new Image(); img.crossOrigin = 'anonymous';
        img.onload = () => { try { ctx.drawImage(img, (xt - x0) * 256, (yt - y0) * 256); okCount++; } catch { /* taint */ } res(); };
        img.onerror = () => res();
        img.src = `${TERRARIUM}/${ze}/${xt}/${yt}.png`;
      }));
    }
  await Promise.all(jobs);
  if (!okCount) return null;

  let data;
  try { data = ctx.getImageData(0, 0, W, H).data; } catch { return null; } // lienzo contaminado
  const originX = x0 * 256, originY = y0 * 256;
  const decode = (px, py) => { const i = (py * W + px) * 4; return data[i] * 256 + data[i + 1] + data[i + 2] / 256 - 32768; };
  return {
    heightAt(lat, lon) {
      const fx = Math.max(0, Math.min(W - 1.001, lon2px(lon) - originX));
      const fy = Math.max(0, Math.min(H - 1.001, lat2px(lat) - originY));
      const xa = Math.floor(fx), ya = Math.floor(fy), tx = fx - xa, ty = fy - ya;
      const top = decode(xa, ya) + (decode(xa + 1, ya) - decode(xa, ya)) * tx;
      const bot = decode(xa, ya + 1) + (decode(xa + 1, ya + 1) - decode(xa, ya + 1)) * tx;
      return top + (bot - top) * ty;
    },
  };
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
  const tc = tileConfig(model.track);
  const { PX, PY } = projector(tc);
  const b = tileBounds(tc);

  // origen ENU en el centro del vuelo; x=este (m), z=norte→-Z (m)
  const [lat0, lon0] = model.center;
  const mpdLon = MPD_LAT * Math.cos(lat0 * Math.PI / 180);
  const X = (lon) => (lon - lon0) * mpdLon;
  const Z = (lat) => -(lat - lat0) * MPD_LAT;
  const uv = (lat, lon) => [PX(lon) / tc.compW, PY(lat) / tc.compH];

  const dem = await fetchTerrainDEM(b); // muestreador de altura (m), o null si falla
  const heightAt = (lat, lon) => (dem ? dem.heightAt(lat, lon) : 0);

  // el DEM Terrarium es denso, así que renderizamos una malla fina directamente
  const rgrid = dem ? Math.max(24, Math.min(120, opts.grid ?? 96)) : 24;
  const latOf = (r) => b.north + (b.south - b.north) * (r / (rgrid - 1));
  const lonOf = (c) => b.west + (b.east - b.west) * (c / (rgrid - 1));

  // cotas mín/máx del terreno visible (muestreadas de la malla de render)
  let elevMin = Infinity, elevMax = -Infinity;
  if (dem) for (let r = 0; r < rgrid; r++) for (let c = 0; c < rgrid; c++) {
    const e = heightAt(latOf(r), lonOf(c)); if (e < elevMin) elevMin = e; if (e > elevMax) elevMax = e;
  }
  if (!isFinite(elevMin)) { elevMin = 0; elevMax = 0; }
  const base = elevMin; // restamos la cota mínima para mantener números pequeños

  // altura del suelo bajo el despegue (para colocar el track por AGL/rel)
  const takeoffGround = heightAt(model.takeoff[0], model.takeoff[1]);

  const terrain = {
    grid: rgrid, base,
    elevMin, elevMax,
    // vértices en metros: {x, y (=elev-base), z, u, v}, con la cota del DEM.
    vertex(r, c) {
      const lat = latOf(r), lon = lonOf(c);
      const [u, v] = uv(lat, lon);
      return { x: X(lon), y: heightAt(lat, lon) - base, z: Z(lat), u, v };
    },
    hasDEM: !!dem,
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

/** Color RGB (0-1) por altura normalizada, azul→naranja (igual que el mapa 2D). */
export function altColor(rel, relMax) {
  const t = Math.max(0, Math.min(1, (rel || 0) / relMax));
  const a = [76 / 255, 149 / 255, 1], d = [1, 138 / 255, 76 / 255];
  return [a[0] + (d[0] - a[0]) * t, a[1] + (d[1] - a[1]) * t, a[2] + (d[2] - a[2]) * t];
}
