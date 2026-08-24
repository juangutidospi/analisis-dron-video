// Parser de telemetría DJI: convierte el texto de un .SRT en un modelo de vuelo.
// Puerto fiel de src/extract.py — mismos cálculos, mismos filtros de glitch (25 m/s).

const R_EARTH = 6371000;
const GLITCH = 25.0; // m/s

/** Distancia haversine en metros entre dos coordenadas. */
export function hav(a, b, c, e) {
  const p1 = a * Math.PI / 180, p2 = c * Math.PI / 180;
  const dp = (c - a) * Math.PI / 180, dl = (e - b) * Math.PI / 180;
  const x = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.sqrt(x));
}

/** Inclinación (pitch) de la cámara en grados desde el cuaternión pp_current (orden w,x,y,z). */
function gimbalPitch(body) {
  const mm = body.match(/pp_current:\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)/);
  if (!mm) return null;
  const w = +mm[1], x = +mm[2], y = +mm[3], z = +mm[4];
  const s = Math.max(-1, Math.min(1, 2 * (x * z - y * w)));
  return Math.round(Math.asin(s) * 180 / Math.PI * 100) / 100;
}

function parseTs(s) {
  // "2026-08-06 21:25:32.749" -> Date (local, sirve para diferencias)
  const m = s.match(/(\d{4})-(\d\d)-(\d\d) (\d\d):(\d\d):(\d\d)\.(\d+)/);
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6], +m[7].slice(0, 3));
}

const num = (body, k) => {
  const mm = body.match(new RegExp(k + ': ?([-\\d.]+)'));
  return mm ? parseFloat(mm[1]) : null;
};

/**
 * Analiza el texto completo de un .SRT DJI.
 * @returns {object} modelo de vuelo (meta, ranges, series, track, keypoints…)
 */
export function parseSRT(txt) {
  const re = /FrameCnt: (\d+),[^\n]*\n(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d\.\d+)\n(.*)/g;
  const rows = [];
  let m;
  while ((m = re.exec(txt)) !== null) {
    const body = m[3];
    const sh = body.match(/shutter: 1\/([\d.]+)/);
    const cm = body.match(/color_md: ?([^\],]+)/);
    const eis = body.match(/eis:\s*([^\],]+)/);
    // Antes del fix GPS, DJI escribe latitude/longitude = 0.000000: no es una
    // posición real (cae en el golfo de Guinea), así que la tratamos como sin dato
    // para que no contamine takeoff, alejamiento, recorrido ni la trayectoria.
    let lat = num(body, 'latitude'), lon = num(body, 'longitude');
    if (lat === 0 && lon === 0) { lat = null; lon = null; }
    rows.push({
      cnt: +m[1], ts: m[2],
      lat, lon,
      rel: num(body, 'rel_alt'), ab: num(body, 'abs_alt'),
      iso: num(body, 'iso'), ct: num(body, 'ct'), ev: num(body, 'ev'), fnum: num(body, 'fnum'),
      shutter: sh ? sh[1].slice(0, -2) : null,
      color_md: cm ? cm[1].trim() : '',
      pitch: gimbalPitch(body),
      eis: eis ? eis[1].trim() : null,
    });
  }
  if (rows.length < 2) throw new Error('El .SRT no contiene telemetría reconocible.');

  const t0 = parseTs(rows[0].ts);
  for (const r of rows) r.t = (parseTs(r.ts) - t0) / 1000;
  const dur = rows[rows.length - 1].t;

  // muestreo a ~0.5 s
  const step = dur > 0 ? Math.max(1, Math.round(rows.length / dur * 0.5)) : 1;
  const samp = rows.filter((_, i) => i % step === 0);

  for (let i = 0; i < samp.length; i++) {
    const r = samp[i];
    if (i === 0) { r.hs = 0; r.vs = 0; continue; }
    const p = samp[i - 1], dt = r.t - p.t;
    if (r.lat && p.lat && dt > 0) {
      const sp = hav(p.lat, p.lon, r.lat, r.lon) / dt;
      r.hs = sp <= GLITCH ? sp : null;
    } else r.hs = null;
    r.vs = (r.rel != null && p.rel != null && dt > 0)
      ? Math.round((r.rel - p.rel) / dt * 100) / 100 : null;
  }

  const hspeeds = samp.map(r => r.hs).filter(v => v != null);
  const vspeeds = samp.map(r => r.vs).filter(v => v != null);

  let dist = 0;
  for (let i = 1; i < samp.length; i++) {
    const a = samp[i - 1], b = samp[i];
    if (a.lat && b.lat) {
      const dd = hav(a.lat, a.lon, b.lat, b.lon), dt = b.t - a.t;
      if (dt > 0 && dd / dt <= GLITCH) dist += dd;
    }
  }

  let glitches = 0, gmax = 0, prev = null;
  for (const r of rows) {
    if (r.lat && r.lon) {
      if (prev) {
        const dt = r.t - prev[2];
        if (dt > 0) { const sp = hav(prev[0], prev[1], r.lat, r.lon) / dt; if (sp > GLITCH) { glitches++; gmax = Math.max(gmax, sp); } }
      }
      prev = [r.lat, r.lon, r.t];
    }
  }

  // origen del vuelo = primer fotograma con GPS válido (no el frame 0, que puede
  // ser previo al fix); el alejamiento y el despegue se miden desde ahí.
  const valid = rows.filter(r => r.lat != null);
  const lat0 = valid.length ? valid[0].lat : null, lon0 = valid.length ? valid[0].lon : null;
  const maxfar = valid.length ? Math.max(...valid.map(r => hav(lat0, lon0, r.lat, r.lon))) : 0;

  const rng = (k, src = valid) => {
    const v = src.map(r => r[k]).filter(x => x != null);
    return v.length ? [Math.min(...v), Math.max(...v)] : [null, null];
  };
  const uniq = (arr) => [...new Set(arr.filter(x => x != null && x !== ''))];

  const isos = uniq(rows.map(r => r.iso)).sort((a, b) => a - b);
  const shs = uniq(rows.map(r => r.shutter)).sort((a, b) => +a - +b);

  const meta = {
    fname: 'vuelo.SRT', frames: rows.length,
    fps: dur ? Math.round((rows.length - 1) / dur) : 0, dur,
    start: rows[0].ts, end: rows[rows.length - 1].ts,
  };

  const model = {
    meta,
    ranges: {
      rel: rng('rel'), ab: rng('ab'), ct: rng('ct'), pitch: rng('pitch', rows),
      lat: rng('lat'), lon: rng('lon'),
      hspeed: [hspeeds.length ? Math.min(...hspeeds) : 0, hspeeds.length ? Math.max(...hspeeds) : 0],
      hspeed_avg: hspeeds.length ? hspeeds.reduce((a, b) => a + b, 0) / hspeeds.length : 0,
      vspeed: [vspeeds.length ? Math.min(...vspeeds) : 0, vspeeds.length ? Math.max(...vspeeds) : 0],
    },
    dist: Math.round(dist), maxfar: Math.round(maxfar),
    takeoff: [lat0, lon0],
    land: valid.length ? [valid[valid.length - 1].lat, valid[valid.length - 1].lon] : [null, null],
    center: valid.length
      ? [valid.reduce((s, r) => s + r.lat, 0) / valid.length, valid.reduce((s, r) => s + r.lon, 0) / valid.length]
      : [null, null],
    cam: {
      iso: isos, shutter: shs,
      fnum: uniq(rows.map(r => r.fnum)).sort((a, b) => a - b),
      ev: uniq(rows.map(r => r.ev)).sort((a, b) => a - b),
      eis: uniq(rows.map(r => r.eis)).sort(),
    },
    glitches, glitch_max: Math.round(gmax * 10) / 10,
    series: samp.map(r => ({
      t: Math.round(r.t * 100) / 100, rel: r.rel, ab: r.ab,
      hs: r.hs != null ? Math.round(r.hs * 1000) / 1000 : null,
      vs: r.vs, lat: r.lat, lon: r.lon, iso: r.iso, ct: r.ct, pitch: r.pitch,
    })),
    track: rows.filter((_, i) => i % 10 === 0).filter(r => r.lat).map(r => [
      Math.round(r.lat * 1e6) / 1e6, Math.round(r.lon * 1e6) / 1e6, r.rel,
    ]),
  };
  return model;
}
