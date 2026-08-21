// Preparación de la escena 3D del vuelo (agnóstica del motor de render).
// Proyecta lat/lon a metros locales (ENU), baja el DEM del terreno de teselas
// Terrarium (terrain-RGB de AWS: sin clave, con CORS y sin límite por minuto),
// compone la textura de satélite (teselas Esri) drapeada sobre el relieve, y
// expone la posición/rumbo/pitch del dron en cada instante.
// La usan tanto la rama de Three.js como la del renderer propio en canvas.

import { projector, keypoints } from './geo.js';
import { solarPosition, lightPhase } from './solar.js';

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
  const ze = 14; // zoom del DEM: más teselas pero más detalle de relieve
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

/**
 * Encuadre de teselas para el 3D: expande el bbox del vuelo por `factor` (4× por
 * defecto) para mostrar más contexto alrededor, y elige el zoom para no pasar de
 * un presupuesto de teselas. Devuelve la misma forma que geo.tileConfig.
 */
function wideConfig(track, factor = 4) {
  const T = track.filter((p) => p[0] != null);
  const lats = T.map((p) => p[0]), lons = T.map((p) => p[1]);
  let la0 = Math.min(...lats), la1 = Math.max(...lats), lo0 = Math.min(...lons), lo1 = Math.max(...lons);
  const dla = (la1 - la0) || 1e-4, dlo = (lo1 - lo0) || 1e-4, pad = (factor - 1) / 2;
  la0 -= dla * pad; la1 += dla * pad; lo0 -= dlo * pad; lo1 += dlo * pad;
  const tilesAt = (z) => {
    const n = 2 ** z;
    const xt = (lon) => (lon + 180) / 360 * n;
    const yt = (lat) => { const r = lat * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n; };
    const x0 = Math.floor(xt(lo0)), x1 = Math.floor(xt(lo1)), y0 = Math.floor(yt(la1)), y1 = Math.floor(yt(la0));
    return { x0, x1, y0, y1, count: (x1 - x0 + 1) * (y1 - y0 + 1) };
  };
  let z = 15;
  for (let zz = 18; zz >= 10; zz--) { if (tilesAt(zz).count <= 48) { z = zz; break; } }
  const { x0, x1, y0, y1 } = tilesAt(z);
  const cols = x1 - x0 + 1, rows = y1 - y0 + 1;
  return { z, x0, x1, y0, y1, cols, rows, originX: x0 * 256, originY: y0 * 256, compW: cols * 256, compH: rows * 256 };
}

/** lat/lon de las esquinas del lienzo de teselas (Web Mercator). */
function tileBounds(tc) {
  const n = 2 ** tc.z;
  const lon = (x) => x / n * 360 - 180;
  const lat = (y) => Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) * 180 / Math.PI;
  return { west: lon(tc.x0), east: lon(tc.x1 + 1), north: lat(tc.y0), south: lat(tc.y1 + 1) };
}

/**
 * Compone las teselas Esri del encuadre en un <canvas> para drapear como textura.
 * Usa un zoom superior (más nítida) cubriendo exactamente el mismo bbox `b`; como
 * el bbox está alineado a teselas de tc.z, también lo está en zoom+boost. El
 * mapeo uv sigue siendo normalizado [0,1] sobre `b`, así que no cambia.
 */
async function buildTexture(tc, boost = 3) {
  const f = 2 ** boost, z = tc.z + boost;
  const x0 = tc.x0 * f, x1 = (tc.x1 + 1) * f - 1;
  const y0 = tc.y0 * f, y1 = (tc.y1 + 1) * f - 1;
  const cols = x1 - x0 + 1, rows = y1 - y0 + 1;
  // baja de zoom si se pasa de teselas (descargas) o del tamaño máximo de textura
  // del GPU (8192 px por lado en tarjetas modestas)
  if (boost > 0 && (cols * rows > 520 || cols * 256 > 8192 || rows * 256 > 8192)) return buildTexture(tc, boost - 1);
  const cv = document.createElement('canvas');
  cv.width = cols * 256; cv.height = rows * 256;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#243447'; ctx.fillRect(0, 0, cv.width, cv.height);
  // color más rico sin oscurecer (el terreno es auto-iluminado en la escena 3D)
  ctx.filter = 'saturate(1.3) contrast(1.07) brightness(1.0)';
  const jobs = [];
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const dx = (x - x0) * 256, dy = (y - y0) * 256;
      jobs.push(new Promise((res) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => { try { ctx.drawImage(img, dx, dy, 256, 256); } catch { /* taint */ } res(); };
        img.onerror = () => res();
        img.src = `${ESRI}/${z}/${y}/${x}`;
      }));
    }
  await Promise.all(jobs);
  ctx.filter = 'none';
  return cv;
}

/** Textura del mundo (Web Mercator, Esri a zoom bajo) para el globo de la intro. */
async function buildWorldTexture(z = 4) {
  const n = 2 ** z, cv = document.createElement('canvas');
  cv.width = n * 256; cv.height = n * 256;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#0a1622'; ctx.fillRect(0, 0, cv.width, cv.height);
  const jobs = [];
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      jobs.push(new Promise((res) => {
        const img = new Image(); img.crossOrigin = 'anonymous';
        img.onload = () => { try { ctx.drawImage(img, x * 256, y * 256, 256, 256); } catch { /* taint */ } res(); };
        img.onerror = () => res();
        img.src = `${ESRI}/${z}/${y}/${x}`;
      }));
    }
  await Promise.all(jobs);
  return cv;
}

/**
 * Máscara de agua a partir de la textura de satélite: detecta píxeles oscuros y
 * azulados (embalses, ríos). Codifica rugosidad en el canal G y metalización en
 * el B (los que usa MeshStandardMaterial): agua = liso y reflectante, tierra =
 * mate. Devuelve el canvas de la máscara, o null si apenas hay agua.
 */
function buildWaterMask(texCanvas) {
  const W = 256, H = Math.max(1, Math.round(256 * texCanvas.height / texCanvas.width));
  const m = document.createElement('canvas'); m.width = W; m.height = H;
  const mx = m.getContext('2d', { willReadFrequently: true });
  mx.drawImage(texCanvas, 0, 0, W, H);
  let img; try { img = mx.getImageData(0, 0, W, H); } catch { return null; }
  const d = img.data, out = mx.createImageData(W, H), o = out.data;
  let water = 0;
  for (let i = 0; i < W * H; i++) {
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2], mx2 = Math.max(r, g, b);
    // agua (azul o turquesa): azulada-verdosa con el rojo apagado, no vegetación
    // (verde con poco azul) ni suelo claro (todo alto). Vale para embalses turquesa.
    const isWater = b >= g - 10 && b > r + 6 && g >= r + 3 && mx2 < 205;
    o[i * 4] = 0;
    o[i * 4 + 1] = isWater ? 16 : 255;   // G = rugosidad (agua muy lisa)
    o[i * 4 + 2] = 0;                     // B sin usar (metalización a 0)
    o[i * 4 + 3] = 255;
    if (isWater) water++;
  }
  mx.putImageData(out, 0, 0);
  return water > W * H * 0.006 ? m : null;
}

/**
 * Expande un bbox alrededor de su centro por `mult`, acotando la semianchura
 * resultante entre `minKm` y `maxKm` por lado. Sirve para consultar el horizonte
 * (pueblos/cimas del entorno), que suele ser mucho más ancho que el vuelo.
 */
function expandBox(b, mult, minKm, maxKm) {
  const cLat = (b.north + b.south) / 2, cLon = (b.east + b.west) / 2;
  const kmLat = 110.6, kmLon = 110.6 * Math.cos(cLat * Math.PI / 180);
  const clamp = (h, km) => Math.min(maxKm / km, Math.max(minKm / km, h));
  const hLat = clamp((b.north - b.south) / 2 * mult, kmLat);
  const hLon = clamp((b.east - b.west) / 2 * mult, kmLon);
  return { south: cLat - hLat, north: cLat + hLat, west: cLon - hLon, east: cLon + hLon };
}

/**
 * Puntos de interés del horizonte desde OpenStreetMap (Overpass): cimas
 * (natural=peak, con su cota), núcleos de población (place=city/town/village/
 * hamlet) y masas de agua (embalses, lagos, ríos). Sirven para rotular lo que se
 * ve alrededor del vuelo, en un radio bastante mayor que el terreno (los pueblos
 * vecinos quedan a varios km). Consulta con un tiempo máximo y devuelve [] ante
 * cualquier fallo (Overpass caído, CORS, timeout). Prioriza ciudades > pueblos >
 * aldeas, embalses/lagos > ríos, y cimas por altitud; limita el total.
 * @param {{west:number,east:number,north:number,south:number}} b bbox de consulta
 * @returns {Promise<Array<{lat:number,lon:number,name:string,kind:'peak'|'town'|'water',ele:number|null,rank:number}>>}
 */
/**
 * Lanza una consulta Overpass probando el servidor principal y un espejo, con un
 * tiempo máximo. Devuelve el array de elementos, o null si ningún endpoint
 * respondió a tiempo.
 */
async function fetchOverpass(query, timeoutMs) {
  const endpoints = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
  for (const url of endpoints) {
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(query), signal: ctrl.signal });
      clearTimeout(to);
      if (!res.ok) continue;
      return (await res.json()).elements || [];
    } catch { /* siguiente espejo */ }
  }
  return null;
}

async function fetchHorizonPOIs(b) {
  const bbox = `${b.south},${b.west},${b.north},${b.east}`;
  // Dos consultas independientes en paralelo: cimas/núcleos (nodos, rápida) y
  // masas de agua (vías/relaciones, con `out center`). Se separan a propósito:
  // el agua puede ser lenta o fallar (p.ej. la relación de un río largo) y no
  // debe arrastrar consigo a los pueblos/cimas. NO pedimos relaciones de río
  // (waterway) porque cargar la geometría entera de un río de cientos de km
  // dispara el tiempo de respuesta; las vías dan un centro más cercano y útil.
  const qLand = `[out:json][timeout:20];(` +
    `node["natural"="peak"]["name"](${bbox});` +
    `node["place"~"^(city|town|village|hamlet)$"]["name"](${bbox});` +
    `);out qt 200;`;
  const qWater = `[out:json][timeout:20];(` +
    `way["natural"="water"]["name"](${bbox});` +
    `relation["natural"="water"]["name"](${bbox});` +
    `way["landuse"="reservoir"]["name"](${bbox});` +
    `relation["landuse"="reservoir"]["name"](${bbox});` +
    `way["waterway"="river"]["name"](${bbox});` +
    `);out center 200;`;
  const [land, water] = await Promise.all([fetchOverpass(qLand, 12000), fetchOverpass(qWater, 12000)]);
  const els = [...(land || []), ...(water || [])];
  if (!els.length) return [];

  // rango de importancia: ciudad > pueblo > aldea; agua: embalse/lago > río;
  // cima por altitud. Se deduplica por nombre quedándose con el rango más alto.
  const PLACE = { city: 6, town: 5, village: 4, hamlet: 3 };
  const peaks = [], places = [], waters = [];
  const seenWater = new Map(); // nombre → índice en waters (dedup de ríos troceados)
  for (const e of els) {
    const tg = e.tags || {}, name = tg.name;
    const lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon;
    if (!name || lat == null || lon == null) continue;
    if (tg.natural === 'peak') {
      const ele = Number.parseFloat(tg.ele);
      peaks.push({ lat, lon, name, kind: 'peak', ele: Number.isFinite(ele) ? ele : null, rank: Number.isFinite(ele) ? ele : 0 });
    } else if (tg.place in PLACE) {
      places.push({ lat, lon, name, kind: 'town', ele: null, rank: PLACE[tg.place] * 1000 });
    } else if (tg.natural === 'water' || tg.landuse === 'reservoir' || tg.waterway === 'river') {
      const river = tg.waterway === 'river' && tg.natural !== 'water';
      const rank = river ? 2500 : 5500; // embalses/lagos destacan; ríos algo menos
      const key = name.split(' - ')[0].trim().toLowerCase(); // "Río Duero - Rio Douro" ≡ "Río Duero"
      const prev = seenWater.get(key);
      if (prev == null) { seenWater.set(key, waters.length); waters.push({ lat, lon, name, kind: 'water', ele: null, rank }); }
      else if (rank > waters[prev].rank) waters[prev] = { lat, lon, name, kind: 'water', ele: null, rank };
    }
  }
  peaks.sort((a, c) => c.rank - a.rank);
  places.sort((a, c) => c.rank - a.rank);
  waters.sort((a, c) => c.rank - a.rank);
  // conserva los más importantes de cada tipo (el declutter en pantalla recorta
  // el resto por solapamiento)
  return [...places.slice(0, 18), ...waters.slice(0, 10), ...peaks.slice(0, 16)];
}

/**
 * Prepara todos los datos de la escena 3D del vuelo.
 * @param {object} model modelo del vuelo
 * @param {{grid?:number}} [opts] grid = nº de vértices por lado de la malla del terreno
 * @returns {Promise<object>} datos listos para cualquier motor de render
 */
export async function buildScene3D(model, opts = {}) {
  const tc = wideConfig(model.track, opts.extent ?? 4); // mapa ampliado a 4× el vuelo
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
  // exageración vertical: el DEM libre (SRTM ~30 m) es suave; realzamos el relieve
  // igual que Google Earth. Se aplica por igual a terreno y vuelo (la altura
  // relativa del dron sobre el suelo se mantiene correcta).
  const VE = opts.exaggeration ?? 1.7;

  // el DEM Terrarium es denso, así que renderizamos una malla fina directamente
  const rgrid = dem ? Math.max(24, Math.min(160, opts.grid ?? 128)) : 24;
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

  // altura de mundo (m, con exageración) para una cota MSL del terreno
  const groundY = (lat, lon) => (heightAt(lat, lon) - base) * VE;

  const terrain = {
    grid: rgrid, base,
    elevMin, elevMax,
    midY: (elevMax - elevMin) * VE / 2, // media altura (para encuadrar la cámara)
    // vértices en metros: {x, y, z, u, v}, con la cota del DEM y exageración.
    vertex(r, c) {
      const lat = latOf(r), lon = lonOf(c);
      const [u, v] = uv(lat, lon);
      return { x: X(lon), y: groundY(lat, lon), z: Z(lat), u, v };
    },
    hasDEM: !!dem,
  };

  // altura de mundo del dron (m) para una altura relativa rel (sobre el despegue)
  const worldY = (rel) => ((takeoffGround - base) + (rel ?? 0)) * VE;

  // track 3D: y = altura de vuelo; gy = suelo real bajo el punto (para la cortina)
  const S = model.series.filter((s) => s.lat != null && s.t != null);
  const relMax = Math.max(1, ...S.map((s) => s.rel ?? 0));
  const track = S.map((s) => ({ x: X(s.lon), y: worldY(s.rel), z: Z(s.lat), t: s.t, rel: s.rel ?? 0, gy: groundY(s.lat, s.lon) }));

  // posición interpolada del dron en un instante (m), con pitch y velocidad
  const posAt = (time) => {
    let i = 1; while (i < S.length && S[i].t < time) i++;
    const a = S[i - 1], c = S[Math.min(i, S.length - 1)];
    const span = (c.t - a.t) || 1, f = Math.max(0, Math.min(1, (time - a.t) / span));
    const lerp = (k) => (a[k] ?? 0) + ((c[k] ?? 0) - (a[k] ?? 0)) * f;
    const lat = lerp('lat'), lon = lerp('lon');
    return { x: X(lon), y: worldY(lerp('rel')), z: Z(lat), pitch: (lerp('pitch') || 0) * Math.PI / 180, hs: lerp('hs'), vs: lerp('vs'), rel: lerp('rel'), gy: groundY(lat, lon) };
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
    return { x: p.x, y: p.y, z: p.z, pitch: p.pitch, hs: p.hs, vs: p.vs, rel: p.rel, gy: p.gy, heading };
  };

  // posición real del sol para el instante y lugar del vuelo (cielo, luz, sombras)
  const date = model.meta.start instanceof Date ? model.meta.start : new Date(model.meta.start || Date.now());
  const sp = solarPosition(date, lat0, lon0);
  const el = sp.elevation * Math.PI / 180, az = sp.azimuth * Math.PI / 180;
  const sun = {
    dir: { x: Math.cos(el) * Math.sin(az), y: Math.max(0.06, Math.sin(el)), z: -Math.cos(el) * Math.cos(az) },
    elevation: sp.elevation, azimuth: sp.azimuth, phase: lightPhase(sp.elevation),
  };

  const texture = await buildTexture(tc);
  const water = buildWaterMask(texture); // máscara de agua (o null)
  const world = await buildWorldTexture(4); // globo de la intro (más nítido)

  // rótulos del horizonte (cimas/pueblos de OSM): consulta un radio bastante
  // mayor que el terreno (los pueblos vecinos quedan a varios km) y coloca cada
  // rótulo en su dirección real. La cima usa su cota real; el resto (y lo que
  // cae fuera del terreno) usa la altura del DEM, que se satura al borde. Va en
  // segundo plano para no retrasar la escena; el componente los añade al resolver.
  const poiBox = expandBox(b, 4, 4, 12); // 4× el terreno, entre 4 y 12 km por lado
  const poisReady = fetchHorizonPOIs(poiBox)
    .then((raw) => raw.map((p) => {
      let lat = p.lat, lon = p.lon;
      // el centroide (`out center`) de ríos/embalses grandes cae lejísimos de la
      // parte visible; lo acotamos al terreno para colocar el rótulo sobre el mapa
      if (p.kind === 'water') {
        lat = Math.max(b.south, Math.min(b.north, lat));
        lon = Math.max(b.west, Math.min(b.east, lon));
      }
      return {
        name: p.name, kind: p.kind, ele: p.ele, rank: p.rank,
        x: X(lon), z: Z(lat),
        y: (p.kind === 'peak' && p.ele != null) ? (p.ele - base) * VE : groundY(lat, lon),
      };
    }))
    .catch(() => []);

  return {
    center: [lat0, lon0],
    world, poisReady,
    // extensión del terreno en metros (para encuadrar la cámara)
    bounds: {
      x0: X(b.west), x1: X(b.east), z0: Z(b.north), z1: Z(b.south),
      spanX: X(b.east) - X(b.west), spanZ: Z(b.south) - Z(b.north),
    },
    terrain, texture, water, track, droneAt, relMax, sun,
    keypoints: keypoints(model).map((k) => ({ key: k.key, t: k.t, x: X(k.lon), y: worldY(k.x.rel ?? 0), z: Z(k.lat) })),
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
