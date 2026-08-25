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
// WCS de Modelos Digitales del Terreno del IGN: MDT05 (5 m, de PNOA LiDAR) para
// España. Sirve el relieve MUCHO más fino que Terrarium (SRTM ~30 m). Envía
// `Access-Control-Allow-Origin: *`, así que se consume directo desde el navegador.
const IGN_WCS = 'https://servicios.idee.es/wcs-inspire/mdt';
// WFS INSPIRE de edificios del Catastro: huellas + nº de plantas de TODA España
// (también aldeas, a diferencia de OSM). Con `Access-Control-Allow-Origin: *`.
const CATASTRO_WFS = 'https://ovc.catastro.meh.es/INSPIRE/wfsBU.aspx';
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
 * Parser mínimo de GeoTIFF de una banda entera de 16 bits SIN comprimir (justo lo
 * que devuelve el WCS del IGN con `format=image/tiff`). No usa librería: lee la IFD
 * y vuelca los píxeles a un Float32Array. Devuelve {width,height,grid} o null si no
 * lo reconoce. La georreferencia no se lee del TIFF: se usa el bbox pedido (el WCS
 * remuestrea justo a ese extent), lo que evita ambigüedades de orden de ejes.
 * @param {ArrayBuffer} buf
 */
function parseGeoTiffInt16(buf) {
  const dv = new DataView(buf);
  if (buf.byteLength < 8) return null;
  const le = dv.getUint16(0, false) === 0x4949; // 'II' little-endian, 'MM' big
  const u16 = (o) => dv.getUint16(o, le);
  const u32 = (o) => dv.getUint32(o, le);
  if (dv.getUint16(2, le) !== 42) return null;
  const ifd = u32(4);
  const n = u16(ifd);
  const SZ = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 8: 2, 9: 4, 11: 4, 12: 8 };
  const tags = {};
  for (let i = 0; i < n; i++) {
    const e = ifd + 2 + i * 12, tag = u16(e), type = u16(e + 2), cnt = u32(e + 4);
    const bytes = (SZ[type] || 1) * cnt;
    tags[tag] = { type, cnt, voff: bytes <= 4 ? e + 8 : u32(e + 8) };
  }
  const nums = (t) => {
    if (!t) return [];
    const out = [], s = SZ[t.type] || 1;
    for (let i = 0; i < t.cnt; i++) {
      const o = t.voff + i * s;
      out.push(t.type === 3 ? u16(o) : t.type === 4 ? u32(o) : t.type === 12 ? dv.getFloat64(o, le)
        : t.type === 8 ? dv.getInt16(o, le) : dv.getUint8(o));
    }
    return out;
  };
  const width = nums(tags[256])[0], height = nums(tags[257])[0];
  const signed = (nums(tags[339])[0] || 1) === 2; // SampleFormat: 2 = entero con signo
  const stripOffsets = nums(tags[273]), stripCounts = nums(tags[279]);
  const rowsPerStrip = nums(tags[278])[0] || height;
  if (!width || !height || !stripOffsets.length) return null;
  const grid = new Float32Array(width * height);
  let p = 0;
  for (let s = 0; s < stripOffsets.length && p < grid.length; s++) {
    let o = stripOffsets[s];
    const count = (stripCounts[s] ?? rowsPerStrip * width * 2) / 2;
    for (let k = 0; k < count && p < grid.length; k++, o += 2) {
      let v = signed ? dv.getInt16(o, le) : dv.getUint16(o, le);
      if (v < -1000 || v > 9000) v = 0; // descarta nodata / valores absurdos
      grid[p++] = v;
    }
  }
  return { width, height, grid };
}

/**
 * DEM del terreno del IGN (MDT05, 5 m) para un bbox en España. Pide una única
 * cobertura GeoTIFF al WCS, acotando los píxeles a `budget` con SCALESIZE para que
 * un mapa ancho no se dispare de tamaño, y devuelve un muestreador `heightAt` con
 * la misma forma que `fetchTerrainDEM`. Lanza si falla (el llamante cae a Terrarium).
 * @returns {Promise<{heightAt:(lat:number,lon:number)=>number, hiRes:boolean}>}
 */
async function fetchTerrainDEM_IGN(b, budget = 1200, timeoutMs = 18000) {
  const CELL = 0.000045; // ~5 m por píxel del MDT05
  const W = Math.max(2, Math.min(budget, Math.round((b.east - b.west) / CELL)));
  const H = Math.max(2, Math.min(budget, Math.round((b.north - b.south) / CELL)));
  const url = `${IGN_WCS}?service=WCS&version=2.0.1&request=GetCoverage`
    + `&coverageId=Elevacion4258_5`
    + `&subset=Lat(${b.south},${b.north})&subset=Long(${b.west},${b.east})`
    + `&scalesize=long(${W}),lat(${H})&format=image/tiff`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let buf;
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error('IGN WCS ' + res.status);
    if (!(res.headers.get('content-type') || '').includes('tiff')) throw new Error('IGN WCS sin TIFF'); // excepción XML
    buf = await res.arrayBuffer();
  } finally { clearTimeout(timer); }
  const t = parseGeoTiffInt16(buf);
  if (!t || !t.width) throw new Error('GeoTIFF IGN ilegible');
  const { width, height, grid } = t;
  const dLon = (b.east - b.west) || 1e-6, dLat = (b.north - b.south) || 1e-6;
  const at = (px, py) => grid[py * width + px];
  return {
    hiRes: true,
    heightAt(lat, lon) {
      const fx = Math.max(0, Math.min(width - 1.001, (lon - b.west) / dLon * (width - 1)));
      const fy = Math.max(0, Math.min(height - 1.001, (b.north - lat) / dLat * (height - 1))); // fila 0 = norte
      const xa = Math.floor(fx), ya = Math.floor(fy), tx = fx - xa, ty = fy - ya;
      const top = at(xa, ya) + (at(xa + 1, ya) - at(xa, ya)) * tx;
      const bot = at(xa, ya + 1) + (at(xa + 1, ya + 1) - at(xa, ya + 1)) * tx;
      return top + (bot - top) * ty;
    },
  };
}

// Caché de DEM por bbox+fuente: la escena puede reconstruirse (IntersectionObserver,
// resize) y así no se vuelve a descargar/parsear el terreno.
const _demCache = new Map();

/**
 * Descarga las huellas de los edificios del Catastro en un bbox (WFS INSPIRE) y las
 * devuelve como polígonos con nº de plantas, para extruir "casas con volumen" y
 * tejados reales (mapeados con la foto satélite) en el visor 3D. Solo España.
 * @param {{south:number,west:number,north:number,east:number}} bx
 * @returns {Promise<Array<{ring:Array<[number,number]>, floors:number}>>}  ring = [lat,lon]
 */
function parseBuildingsGML(txt) {
  const doc = new DOMParser().parseFromString(txt, 'application/xml');
  const parts = Array.from(doc.getElementsByTagName('*')).filter((n) => n.localName === 'BuildingPart');
  const out = [];
  for (const p of parts) {
    const kids = Array.from(p.getElementsByTagName('*'));
    const pl = kids.find((n) => n.localName === 'posList');       // 1er anillo = exterior
    if (!pl) continue;
    const nums = pl.textContent.trim().split(/\s+/).map(Number);
    const ring = [];
    for (let i = 0; i + 1 < nums.length; i += 2) ring.push([nums[i], nums[i + 1]]); // [lat, lon]
    if (ring.length < 4) continue;
    const fEl = kids.find((n) => n.localName === 'numberOfFloorsAboveGround');
    const floors = fEl ? Math.max(1, parseInt(fEl.textContent, 10) || 1) : 2; // 2 plantas por defecto
    out.push({ ring, floors });
  }
  return out;
}

/**
 * Descarga los edificios del Catastro en un bbox, TROCEADO en celdas pequeñas: el
 * WFS del Catastro escala muy mal con el área (300 m ≈ 8 s, 1 km se cuelga), así que
 * se parte en celdas de ~`cell` grados y se piden en paralelo (concurrencia limitada),
 * con timeout por celda; las que fallan/vacían se ignoran. Robusto ante su lentitud.
 */
async function fetchBuildings(bx, { timeoutMs = 22000, cell = 0.0045, conc = 4 } = {}) {
  const cols = Math.max(1, Math.ceil((bx.east - bx.west) / cell));
  const rows = Math.max(1, Math.ceil((bx.north - bx.south) / cell));
  const cells = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) cells.push({
      west: bx.west + c * (bx.east - bx.west) / cols, east: bx.west + (c + 1) * (bx.east - bx.west) / cols,
      south: bx.south + r * (bx.north - bx.south) / rows, north: bx.south + (r + 1) * (bx.north - bx.south) / rows,
    });
  const fetchCell = async (q) => {
    const url = `${CATASTRO_WFS}?service=WFS&version=2.0.0&request=GetFeature`
      + `&typenames=BU.BuildingPart&srsname=urn:ogc:def:crs:EPSG::4326`
      + `&bbox=${q.south},${q.west},${q.north},${q.east},urn:ogc:def:crs:EPSG::4326&count=4000`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) return [];
      return parseBuildingsGML(await res.text());
    } catch { return []; } finally { clearTimeout(timer); }
  };
  const out = [];
  for (let i = 0; i < cells.length; i += conc) {
    const batch = await Promise.all(cells.slice(i, i + conc).map(fetchCell));
    for (const a of batch) out.push(...a);
  }
  return out;
}

/**
 * Hornea el relieve dentro de la textura satélite para que se vea 3D real aunque el
 * terreno sea auto-iluminado (emissiveMap). Combina tres cosas, compuestas en
 * `multiply` sobre el lienzo de la textura (así persiste aunque el sol esté bajo):
 *  - hillshade direccional del sol (laderas al sol claras, en contra oscuras),
 *  - OSCURECIDO por pendiente (marca paredes/farallones verticales),
 *  - SOMBRAS PROYECTADAS reales del sol sobre el DEM (ray-march): montañas que
 *    ensombrecen valles y paredes que tapan lo de detrás — clave a horas bajas.
 * @param {HTMLCanvasElement} texCanvas  @param {{west,east,north,south}} b
 * @param {(lat:number,lon:number)=>number} heightAt  @param {{x,y,z}} sun  @param {number} VE
 */
function reliefShade(texCanvas, b, heightAt, sun, VE) {
  const OW = Math.min(1500, texCanvas.width);
  const OH = Math.max(2, Math.round(OW * texCanvas.height / texCanvas.width));
  const latMid = (b.north + b.south) / 2;
  const eastM = (b.east - b.west) * 111320 * Math.cos(latMid * Math.PI / 180);
  const southM = (b.north - b.south) * 110574;
  const mx = eastM / OW, mz = southM / OH; // metros por píxel del overlay
  const lonAt = (i) => b.west + (b.east - b.west) * i / (OW - 1);
  const latAt = (j) => b.north + (b.south - b.north) * j / (OH - 1);
  // alturas a resolución del overlay (una sola pasada; se reusa para el hillshade)
  const hgt = new Float32Array(OW * OH);
  for (let j = 0; j < OH; j++) { const lat = latAt(j); for (let i = 0; i < OW; i++) hgt[j * OW + i] = heightAt(lat, lonAt(i)); }
  const Hc = (i, j) => hgt[Math.max(0, Math.min(OH - 1, j)) * OW + Math.max(0, Math.min(OW - 1, i))];

  // --- sombras proyectadas del sol: ray-march en malla gruesa (más que de sobra;
  //     las sombras son de escala grande). Cada punto mira hacia el sol y, si el
  //     terreno se interpone por encima del rayo, queda en sombra. ---
  const hm = Math.hypot(sun.x, sun.z) || 1e-3;   // componente horizontal del sol
  const elevSlope = sun.y / hm;                  // subida del rayo por metro horizontal (tan de la elevación)
  const SW = Math.min(560, OW), SH = Math.max(2, Math.round(SW * OH / OW));
  const shadow = new Float32Array(SW * SH); shadow.fill(1);
  if (elevSlope < 6) {                           // con el sol casi cenital las sombras son inapreciables
    const smx = eastM / SW, smz = southM / SH;
    const dirE = sun.x / hm, dirS = sun.z / hm;  // paso hacia el sol (este, sur) en celdas
    const stepM = Math.hypot(dirE * smx, dirS * smz) || 1;
    const hsG = new Float32Array(SW * SH);
    for (let j = 0; j < SH; j++) { const lat = b.north + (b.south - b.north) * j / (SH - 1); for (let i = 0; i < SW; i++) hsG[j * SW + i] = heightAt(lat, b.west + (b.east - b.west) * i / (SW - 1)); }
    const maxSteps = 180;
    for (let j = 0; j < SH; j++)
      for (let i = 0; i < SW; i++) {
        const h0 = hsG[j * SW + i]; let fi = i, fj = j, dist = 0;
        for (let k = 0; k < maxSteps; k++) {
          fi += dirE; fj += dirS; dist += stepM;
          const xi = fi | 0, yj = fj | 0;
          if (xi < 0 || yj < 0 || xi >= SW || yj >= SH) break;
          if (hsG[yj * SW + xi] > h0 + dist * elevSlope + 0.5) { shadow[j * SW + i] = 0.42; break; }
        }
      }
  }
  const shAt = (i, j) => { // muestreo bilineal del mapa de sombra (penumbra suave)
    const fx = i / (OW - 1) * (SW - 1), fy = j / (OH - 1) * (SH - 1);
    const xa = Math.min(SW - 2, fx | 0), ya = Math.min(SH - 2, fy | 0), tx = fx - xa, ty = fy - ya;
    const a = shadow[ya * SW + xa], b2 = shadow[ya * SW + xa + 1], c = shadow[(ya + 1) * SW + xa], d = shadow[(ya + 1) * SW + xa + 1];
    return (a + (b2 - a) * tx) + ((c + (d - c) * tx) - (a + (b2 - a) * tx)) * ty;
  };

  // --- composición final ---
  const sl = Math.hypot(sun.x, sun.y, sun.z) || 1;
  const sx = sun.x / sl, sy = sun.y / sl, sz = sun.z / sl;
  const ov = document.createElement('canvas'); ov.width = OW; ov.height = OH;
  const octx = ov.getContext('2d'); const img = octx.createImageData(OW, OH);
  for (let j = 0; j < OH; j++)
    for (let i = 0; i < OW; i++) {
      const gx = (Hc(i + 1, j) - Hc(i - 1, j)) / (2 * mx); // pendiente este
      const gz = (Hc(i, j + 1) - Hc(i, j - 1)) / (2 * mz); // pendiente sur
      const nx = -VE * gx, ny = 1, nz = -VE * gz, nl = Math.hypot(nx, ny, nz) || 1;
      const hs = Math.max(0, (nx * sx + ny * sy + nz * sz) / nl);      // iluminación por el sol
      const slope = Math.hypot(VE * gx, VE * gz);
      let fct = 0.6 + 0.7 * hs;                                         // relieve direccional
      fct *= (1 - 0.5 * Math.min(1, slope / 2.2));                      // paredes: hasta -50%
      fct *= shAt(i, j);                                                // sombra proyectada del sol
      fct = Math.max(0.3, Math.min(1, fct));                            // solo oscurece (multiply)
      const v = Math.round(fct * 255), k = (j * OW + i) * 4;
      img.data[k] = v; img.data[k + 1] = v; img.data[k + 2] = v; img.data[k + 3] = 255;
    }
  octx.putImageData(img, 0, 0);
  const tctx = texCanvas.getContext('2d');
  tctx.save();
  tctx.globalCompositeOperation = 'multiply'; tctx.imageSmoothingEnabled = true;
  tctx.drawImage(ov, 0, 0, texCanvas.width, texCanvas.height);
  tctx.restore();
}

/**
 * Encuadre de teselas para el 3D: expande el bbox del vuelo por `factor` (6× por
 * defecto) para mostrar más contexto alrededor, y elige el zoom para no pasar de
 * un presupuesto de teselas. Devuelve la misma forma que geo.tileConfig.
 */
function wideConfig(track, factor = 6) {
  const T = track.filter((p) => p[0] != null);
  const lats = T.map((p) => p[0]), lons = T.map((p) => p[1]);
  let la0 = Math.min(...lats), la1 = Math.max(...lats), lo0 = Math.min(...lons), lo1 = Math.max(...lons);
  const dla = (la1 - la0) || 1e-4, dlo = (lo1 - lo0) || 1e-4, pad = (factor - 1) / 2;
  la0 -= dla * pad; la1 += dla * pad; lo0 -= dlo * pad; lo1 += dlo * pad;
  // evita el mapa en tira muy estrecha (vuelos alargados): fuerza un aspecto
  // mínimo (lado corto ≥ 60% del largo, en metros) para que entren también los
  // pueblos/cimas laterales sin que floten fuera.
  const cosLat = Math.cos((la0 + la1) / 2 * Math.PI / 180) || 1, R = 0.6;
  const wLat = la1 - la0, wLon = (lo1 - lo0) * cosLat;
  if (wLon < R * wLat) { const g = (R * wLat / cosLat - (lo1 - lo0)) / 2; lo0 -= g; lo1 += g; }
  else if (wLat < R * wLon) { const g = (R * wLon - (la1 - la0)) / 2; la0 -= g; la1 += g; }
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
async function buildTexture(tc, boost = 4, maxTex = 8192) {
  const f = 2 ** boost, z = tc.z + boost;
  const x0 = tc.x0 * f, x1 = (tc.x1 + 1) * f - 1;
  const y0 = tc.y0 * f, y1 = (tc.y1 + 1) * f - 1;
  const cols = x1 - x0 + 1, rows = y1 - y0 + 1;
  // baja de zoom si se pasa del presupuesto de teselas (descargas) o del tamaño
  // de textura. TOPE DE MEMORIA: aunque la GPU declare 16384, un lienzo así (>300
  // MB) cuelga/crashea navegadores con poca memoria; nos quedamos en 8192 por lado
  // (~84 MB) y ~600 teselas, que es lo que va sobrado en cualquier equipo.
  const cap = Math.min(maxTex || 8192, 8192);
  if (boost > 0 && (cols * rows > 900 || cols * 256 > cap || rows * 256 > cap)) return buildTexture(tc, boost - 1, maxTex);
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
    // agua (embalse/río): azul claramente dominante sobre el rojo y no muy clara.
    // Umbrales estrictos para no marcar campos/sombras azuladas como agua (que
    // saldrían con un destello del sol falso). Vale para embalses turquesa (b≈g).
    const isWater = b > r + 14 && b >= g - 4 && r < 110 && mx2 < 175;
    o[i * 4] = 0;
    // G = rugosidad. Agua = liso pero NO espejo (≈0.4), para un brillo suave en
    // vez de un reflejo duro; tierra = mate (1.0).
    o[i * 4 + 1] = isWater ? 100 : 255;
    o[i * 4 + 2] = 0;                     // B sin usar (metalización a 0)
    o[i * 4 + 3] = 255;
    if (isWater) water++;
  }
  mx.putImageData(out, 0, 0);
  return water > W * H * 0.006 ? m : null;
}

/**
 * Dispersa ÁRBOLES a partir del verdor del satélite: muestrea la textura en una
 * rejilla, marca los píxeles claramente verdes (vegetación) que no sean agua, y
 * devuelve posiciones en el mundo con altura/tono variados (submuestreadas a `budget`
 * para no pasarse). Es el mismo enfoque que la máscara de agua, pero para el verde.
 * @returns {Array<{x:number,z:number,y:number,h:number,tint:number}>}
 */
function scatterTrees(texCanvas, water, b, X, Z, groundY, VE, budget = 480000) {
  const W = 960, H = Math.max(1, Math.round(960 * texCanvas.height / texCanvas.width));
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  cx.drawImage(texCanvas, 0, 0, W, H);
  let d; try { d = cx.getImageData(0, 0, W, H).data; } catch { return []; }
  let wd = null, WW = 0, WH = 0;
  if (water) { try { const wc = water.getContext('2d', { willReadFrequently: true }); WW = water.width; WH = water.height; wd = wc.getImageData(0, 0, WW, WH).data; } catch { /* taint */ } }
  const isWater = (u, v) => { if (!wd) return false; const px = Math.min(WW - 1, (u * WW) | 0), py = Math.min(WH - 1, (v * WH) | 0); return wd[(py * WW + px) * 4 + 1] < 200; };
  // MÁSCARA DE AGUA para árboles, más inclusiva que buildWaterMask: capta el agua azul
  // (azul>rojo) Y el turquesa/somero del embalse (azul relativamente alto sobre el verde).
  // Luego se DILATA para excluir TODA la lámina de agua, incluida la vegetación de ribera
  // y las islas verdes dentro del agua (que si no, se llenaban de árboles).
  // Máscara de AGUA SOMERA (cola turquesa/cian del embalse) para DILATAR y cubrir también
  // sus islas de vegetación. OJO: NO se puede meter aquí el agua oscura/teal, porque el
  // bosque más denso también es azul-oscuro (b≈g) e idéntico por color → al dilatar se
  // comería el bosque. Por eso aquí solo el turquesa CLARO (brillante y muy cian, r bajo),
  // que el bosque oscuro nunca cumple. El agua azul profunda la quita el filtro por píxel.
  const wet = new Uint8Array(W * H);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const r = d[i], g = d[i + 1], bl = d[i + 2], mxc = Math.max(r, g, bl), mnc = Math.min(r, g, bl);
    // (a) turquesa CLARO saturado; (b) agua PÁLIDA somera: brillante, poco saturada y con
    // AZUL≥ROJO (el agua refleja el cielo → b≥r; la tierra/arena seca tiene r≥b). Ambas
    // exigen brillo alto → el bosque oscuro (aunque sea teal) nunca cae aquí.
    if ((mxc > 110 && (g + bl) * 0.5 > r + 30) || (mxc > 120 && mxc - mnc < 42 && bl >= r && g >= r)) wet[p] = 1;
  }
  const R = 7, tmp = new Uint8Array(W * H), wetD = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let f = 0; for (let k = -R; k <= R; k++) { const xx = x + k; if (xx >= 0 && xx < W && wet[y * W + xx]) { f = 1; break; } } tmp[y * W + x] = f; }
  for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) { let f = 0; for (let k = -R; k <= R; k++) { const yy = y + k; if (yy >= 0 && yy < H && tmp[yy * W + x]) { f = 1; break; } } wetD[y * W + x] = f; }
  // VEGETACIÓN + BOSQUE: en el satélite el bosque DENSO es VERDE OSCURO (poco brillo)
  // y los claros/prados son verde más CLARO. Se detecta el verde (G domina, no gris ni
  // agua) y se PONDERA por lo OSCURO que es: el bosque cerrado (oscuro) recibe muchos
  // árboles y los prados claros/campos pocos.
  const cand = []; let wsum = 0;
  for (let py = 0; py < H; py++)
    for (let px = 0; px < W; px++) {
      const i = (py * W + px) * 4, r = d[i], g = d[i + 1], bl = d[i + 2];
      const mxc = Math.max(r, g, bl);
      if (mxc > 200 || mxc < 20) continue;            // ni campo claro/roca ni negro
      if (g < r - 6) continue;                        // no rojo-dominante (campo seco)
      // AGUA (embalse/río, aun turquesa): la vegetación tiene el AZUL BAJO y el ROJO ≥ AZUL
      // (clorofila); el agua tiene el azul alto y el azul > rojo. Dos cortes complementarios.
      if (bl > g * 0.82 || bl > r + 8) continue;
      if (g - Math.min(r, bl) < 6) continue;          // no gris (sombra/roca)
      const dark = Math.max(0, Math.min(1, (185 - mxc) / 150)); // más oscuro = más bosque
      if (dark < 0.42) continue;                      // CORTE: prados/campos claros → sin árboles
      if (wetD[py * W + px]) continue;                // dentro de la lámina de agua (dilatada) → sin árboles
      const u = (px + 0.5) / W, v = (py + 0.5) / H;
      const w = Math.pow(dark, 2.6);                  // concentra MUY fuerte en el bosque cerrado
      cand.push([u, v, dark, w]); wsum += w;
    }
  if (!cand.length || wsum <= 0) return [];
  const dLon = b.east - b.west, dLat = b.south - b.north;
  let seed = 1234567; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const out = [];
  // reparte ~budget árboles, proporcional a "cuánto bosque" (oscuridad del verde), con jitter
  for (const [u, v, dark, w] of cand) {
    const exact = w / wsum * budget;
    let nHere = Math.floor(exact); if (rnd() < exact - nHere) nHere++;
    for (let j = 0; j < nHere; j++) {
      const lon = b.west + (u + (rnd() - 0.5) / W) * dLon, lat = b.north + (v + (rnd() - 0.5) / H) * dLat;
      // en bosque denso (oscuro), árboles más grandes → la masa cierra la copa
      out.push({ x: X(lon), z: Z(lat), y: groundY(lat, lon), h: (6 + rnd() * 4) * (0.7 + dark * 1.15) * VE, tint: 0.28 + rnd() * 0.45 });
    }
    if (out.length >= budget * 1.3) break; // tope de seguridad
  }
  // baraja (Fisher-Yates determinista): el orden queda espacialmente aleatorio, así
  // reducir el nº de instancias (LOD al exportar) adelgaza el bosque de forma UNIFORME
  for (let i = out.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; const t = out[i]; out[i] = out[j]; out[j] = t; }
  return out;
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

// Servidor principal de Overpass: rápido, con CORS y datos mundiales. Es el único
// del que nos fiamos para el camino rápido.
const OVERPASS_MAIN = 'https://overpass-api.de/api/interpreter';
// Espejos de respaldo (con CORS y datos mundiales) para cuando el principal falla.
// Son fiables pero LENTOS (10–30 s), así que solo se usan como último recurso; da
// igual porque los rótulos se cargan en segundo plano y no bloquean la escena.
// (Se descartan a propósito kumi/private.coffee/osm.jp —sin CORS— y osm.ch —solo
// datos de Suiza, devuelve vacío para el resto—.)
const OVERPASS_FALLBACKS = [
  'https://overpass-api.de/api/interpreter', // por si se ha recuperado
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

/** Un intento a un endpoint, abortado si supera `timeoutMs`. Lanza si falla. */
async function overpassTry(url, body, timeoutMs) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: 'POST', body, signal: ctrl.signal });
    if (!res.ok) throw new Error(String(res.status));
    return (await res.json()).elements || [];
  } finally { clearTimeout(to); }
}

/**
 * Lanza una consulta Overpass con tolerancia a fallos: primero un intento rápido al
 * servidor principal; si falla (504/timeout, frecuente por saturación), corre en
 * paralelo varios espejos (`Promise.any`, gana el que responda) con más margen.
 * Devuelve el array de elementos, o null si ninguno respondió.
 */
async function fetchOverpass(query) {
  const body = 'data=' + encodeURIComponent(query);
  try { return await overpassTry(OVERPASS_MAIN, body, 9000); } catch { /* al respaldo */ }
  try { return await Promise.any(OVERPASS_FALLBACKS.map((u) => overpassTry(u, body, 28000))); } catch { /* nada */ }
  return null;
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
  const [land, water] = await Promise.all([fetchOverpass(qLand), fetchOverpass(qWater)]);
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
  const tc = wideConfig(model.track, opts.extent ?? 6); // mapa ampliado a 6× el vuelo
  const { PX, PY } = projector(tc);
  const b = tileBounds(tc);

  // origen ENU en el centro del vuelo; x=este (m), z=norte→-Z (m)
  const [lat0, lon0] = model.center;
  const mpdLon = MPD_LAT * Math.cos(lat0 * Math.PI / 180);
  const X = (lon) => (lon - lon0) * mpdLon;
  const Z = (lat) => -(lat - lat0) * MPD_LAT;
  const uv = (lat, lon) => [PX(lon) / tc.compW, PY(lat) / tc.compH];

  // DEM: en España, MDT05 del IGN (5 m, mucho más fino); fuera, o si el IGN falla,
  // Terrarium mundial (~30 m). `hiRes` marca el DEM fino para densificar la malla.
  const inSpain = b.south > 35 && b.north < 44.5 && b.west > -10 && b.east < 5;
  const useIGN = inSpain && opts.demIGN !== false;
  const demKey = (useIGN ? 'ign:' : 'ter:') + [b.west, b.east, b.north, b.south].map((v) => v.toFixed(5)).join(',');
  let dem = _demCache.get(demKey) || null;
  if (!dem) {
    if (useIGN) {
      try { dem = await fetchTerrainDEM_IGN(b); }
      catch (e) { console.warn('[scene-3d] MDT05 IGN falló, uso Terrarium:', e.message); dem = null; }
    }
    if (!dem) dem = await fetchTerrainDEM(b); // muestreador de altura (m), o null si falla
    if (dem) _demCache.set(demKey, dem);
  }
  const heightAt = (lat, lon) => (dem ? dem.heightAt(lat, lon) : 0);
  // exageración vertical: el DEM libre (SRTM ~30 m) es suave; realzamos el relieve
  // igual que Google Earth. Con el MDT05 (5 m) el relieve ya es nítido, así que se
  // realza menos. Se aplica por igual a terreno y vuelo (la altura relativa del
  // dron sobre el suelo se mantiene correcta).
  const VE = opts.exaggeration ?? (dem && dem.hiRes ? 1.2 : 1.7);

  // malla de render: con el DEM de 5 m se densifica bastante, porque el espaciado
  // entre vértices es lo que de verdad limita el detalle visible del relieve (el
  // DEM tiene mucho más). 340² ≈ 230k triángulos, holgado para la GPU.
  const rgrid = dem ? Math.max(24, Math.min(dem.hiRes ? 340 : 160, opts.grid ?? (dem.hiRes ? 340 : 128))) : 24;
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
  // altura de mundo del suelo en un punto (x,z) del mundo, invirtiendo X()/Z().
  // Sirve para apoyar la sombra del dron sobre el terreno del punto desplazado.
  const groundAtXZ = (x, z) => groundY(lat0 - z / MPD_LAT, lon0 + x / mpdLon);

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

  const texture = await buildTexture(tc, 4, opts.maxTex);
  const water = buildWaterMask(texture); // máscara de agua (con la imagen limpia, antes de sombrear)
  // ÁRBOLES: semillas por verdor del satélite (con la textura limpia, antes de sombrear)
  const treeSeeds = dem && opts.trees !== false ? scatterTrees(texture, water, b, X, Z, groundY, VE) : [];
  // hornea el relieve en la textura (paredes/farallones bien marcados) cuando hay DEM
  if (dem) { try { reliefShade(texture, b, heightAt, sun.dir, VE); } catch (e) { console.warn('[scene-3d] reliefShade:', e.message); } }
  const world = await buildWorldTexture(4); // globo de la intro (más nítido)

  // rótulos del horizonte (cimas/pueblos de OSM): se consultan DENTRO del terreno
  // (95%, con un pequeño margen del borde) para que ningún rótulo quede flotando
  // fuera del mapa. La cima usa su cota real; el resto (y el agua, cuyo centroide
  // puede caer lejos) usa la altura del DEM. Va en segundo plano para no retrasar
  // la escena; el componente los añade al resolver.
  const poiBox = expandBox(b, 0.95, 0, 1e4); // ≈ el terreno visible, ligeramente por dentro
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

  // edificios del Catastro (casas con volumen + tejados reales). Solo España; se
  // consultan en la ZONA DEL VUELO (no en todo el mapa ancho: el GML de una ciudad
  // pesa varios MB) y se proyectan a ENU con u,v hacia la textura satélite (tejado).
  let buildingsReady = Promise.resolve([]);
  if (inSpain && opts.buildings !== false) {
    // El WFS del Catastro es lento y escala fatal con el área, así que NO se pide todo
    // el vuelo: se acota a una caja alrededor del CENTRO del vuelo (donde suele estar
    // el pueblo/sujeto sobrevolado). ~0.9 km de lado, troceada en celdas por fetchBuildings.
    const hLat = 0.004, hLon = 0.004 / Math.max(0.2, Math.cos(lat0 * Math.PI / 180));
    const bx = {
      south: Math.max(b.south, lat0 - hLat), north: Math.min(b.north, lat0 + hLat),
      west: Math.max(b.west, lon0 - hLon), east: Math.min(b.east, lon0 + hLon),
    };
    if (bx.north > bx.south && bx.east > bx.west) {
      buildingsReady = fetchBuildings(bx).then((list) => list.map((bd) => {
        const contour = bd.ring.map(([la, lo]) => ({ x: X(lo), z: Z(la), u: PX(lo) / tc.compW, v: 1 - PY(la) / tc.compH }));
        let baseG = Infinity;
        for (const [la, lo] of bd.ring) { const g = groundY(la, lo); if (g < baseG) baseG = g; }
        return { contour, baseY: baseG - 1.5 * VE, groundY: baseG, topY: baseG + bd.floors * 3.0 * VE, floors: bd.floors };
      })).catch((err) => { console.warn('[scene-3d] Catastro edificios:', err.message); return []; });
    }
  }

  // ÁRBOLES: semillas del satélite (ya calculadas) + árboles concretos de OSM
  // (natural=tree) en el entorno del vuelo. En 2º plano; el componente los añade al
  // resolver. Ante fallo de Overpass, se quedan solo los del satélite.
  const treesReady = (async () => {
    if (opts.trees === false) return treeSeeds;
    let osm = [];
    try {
      const tb = expandBox(b, 0.25, 0.3, 1.5); // km: árboles OSM en el entorno del vuelo
      const els = await fetchOverpass(`[out:json][timeout:20];node["natural"="tree"](${tb.south},${tb.west},${tb.north},${tb.east});out skel qt 5000;`);
      let seed = 987; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
      osm = (els || []).filter((e) => e.lat != null).map((e) => ({ x: X(e.lon), z: Z(e.lat), y: groundY(e.lat, e.lon), h: (5 + rnd() * 4) * VE, tint: 0.35 + rnd() * 0.35 }));
    } catch { /* sin OSM: solo satélite */ }
    return treeSeeds.concat(osm);
  })();

  return {
    center: [lat0, lon0],
    world, poisReady, buildingsReady, treesReady,
    // extensión del terreno en metros (para encuadrar la cámara)
    bounds: {
      x0: X(b.west), x1: X(b.east), z0: Z(b.north), z1: Z(b.south),
      spanX: X(b.east) - X(b.west), spanZ: Z(b.south) - Z(b.north),
    },
    terrain, texture, water, track, droneAt, relMax, sun, groundAtXZ,
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
