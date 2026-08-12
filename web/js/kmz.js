// Genera el .kmz avanzado en el navegador: track animado en 3D (barra de tiempo),
// muros de altitud, puntos clave con globos ricos y fotogramas, marcas de minuto.
// Iconos y sparkline se dibujan en canvas → KMZ autónomo, sin assets externos.
// Puerto de src/kmz.py.

import { hav } from './srt.js';
import { keypoints } from './geo.js';
import { makeZip, dataUrlToBytes } from './zip.js';

const ACCENT = { green: '#37cf6b', blue: '#3a8bf0', orange: '#f47a3f', violet: '#9a5cf0',
  indigo: '#6e70e6', amber: '#dd8636', navy: '#3a4668', red: '#ee5555', track: '#3a8bf0' };
const HB = { green: '#3ad24f', blue: '#6db0ff', orange: '#ff8c52', violet: '#b07bff',
  indigo: '#9092ff', amber: '#f0a24e', navy: '#9fb0d8', red: '#ff6b6b', track: '#6db0ff' };
const PANEL = '#20232b', PTILE = '#2b2f39', TXT = '#f6f7f9', MUT = '#a4aab5', FOOT = '#8a909b', LBL = '#b2b8c3', BARTRACK = '#3a3f4a';
const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];

const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, '0')}`;
const kmh = (r) => r.hs != null ? r.hs * 3.6 : null;
const nf = (n) => Math.round(n).toLocaleString('es-ES');
const pct = (v, ref) => Math.max(4, Math.min(100, Math.round(v / ref * 100)));

function bearing(a, b, c, e) {
  const y = Math.sin((e - b) * Math.PI / 180) * Math.cos(c * Math.PI / 180);
  const x = Math.cos(a * Math.PI / 180) * Math.sin(c * Math.PI / 180) -
    Math.sin(a * Math.PI / 180) * Math.cos(c * Math.PI / 180) * Math.cos((e - b) * Math.PI / 180);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}
const cdir = (h) => DIRS[Math.round(h / 45) % 8];

function kmlcol(hex) { const h = hex.replace('#', ''); return 'ff' + h.slice(4, 6) + h.slice(2, 4) + h.slice(0, 2); }
function mix(h1, h2, t) {
  const a = h1.replace('#', ''), b = h2.replace('#', '');
  const c1 = [0, 2, 4].map(i => parseInt(a.slice(i, i + 2), 16)), c2 = [0, 2, 4].map(i => parseInt(b.slice(i, i + 2), 16));
  return '#' + c1.map((v, i) => Math.round(v + (c2[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

// ---- iconos generados en canvas ----
function discIcon(hex) {
  const c = document.createElement('canvas'); c.width = c.height = 48; const g = c.getContext('2d');
  g.beginPath(); g.arc(24, 24, 15, 0, 7); g.fillStyle = hex; g.fill();
  g.lineWidth = 4; g.strokeStyle = '#fff'; g.stroke();
  g.beginPath(); g.arc(24, 24, 5, 0, 7); g.fillStyle = 'rgba(255,255,255,.9)'; g.fill();
  return dataUrlToBytes(c.toDataURL('image/png'));
}
function droneIcon() {
  const c = document.createElement('canvas'); c.width = c.height = 56; const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 56, 56); grd.addColorStop(0, '#5b9dff'); grd.addColorStop(1, '#a98bff');
  g.fillStyle = grd; roundRect(g, 4, 4, 48, 48, 13); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = 3; g.lineCap = 'round';
  const C = 28, A = 12;
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([dx, dy]) => {
    g.beginPath(); g.moveTo(C, C); g.lineTo(C + dx * A, C + dy * A); g.stroke();
    g.beginPath(); g.arc(C + dx * A, C + dy * A, 6, 0, 7); g.stroke();
  });
  g.fillStyle = '#fff'; roundRect(g, C - 6, C - 6, 12, 12, 3); g.fill();
  return dataUrlToBytes(c.toDataURL('image/png'));
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

function sparkIcon(model) {
  const W = 656, H = 184, P = 6; // 2x para nitidez
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const S = model.series, dur = model.meta.dur;
  const vmax = Math.max(...S.map(s => s.rel)) || 1;
  const X = (t) => P + (t / dur) * (W - 2 * P), Y = (v) => H - P - (v / vmax) * (H - 2 * P);
  g.beginPath(); S.forEach((s, i) => { const x = X(s.t), y = Y(s.rel); i ? g.lineTo(x, y) : g.moveTo(x, y); });
  g.lineTo(X(S[S.length - 1].t), H - P); g.lineTo(X(S[0].t), H - P); g.closePath();
  const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, 'rgba(91,157,255,.5)'); grd.addColorStop(1, 'rgba(91,157,255,.05)');
  g.fillStyle = grd; g.fill();
  g.beginPath(); S.forEach((s, i) => { const x = X(s.t), y = Y(s.rel); i ? g.lineTo(x, y) : g.moveTo(x, y); });
  g.strokeStyle = '#6db0ff'; g.lineWidth = 4; g.lineJoin = 'round'; g.stroke();
  return dataUrlToBytes(c.toDataURL('image/png'));
}

// ---- balloons ----
const vv = (r) => r.vs == null ? '&mdash;' : `${r.vs >= 0 ? '&#8593;' : '&#8595;'} ${Math.abs(r.vs).toFixed(1)} m/s`;
const vel = (r) => { const s = kmh(r); return s == null ? '&mdash;' : `${Math.round(s)} km/h`; };
const rumbo = (r) => r.hd == null ? '&mdash;' : `${Math.round(r.hd)}&deg; ${cdir(r.hd)}`;

function tile(l, v) {
  return `<td style="padding:9px 12px;background:${PTILE};border-radius:10px;width:50%;vertical-align:top">`
    + `<div style="font-size:9px;letter-spacing:.6px;color:${MUT};text-transform:uppercase;line-height:1.25">${l}</div>`
    + `<div style="font-size:14px;font-weight:700;color:${TXT};margin-top:5px;line-height:1.15">${v}</div></td>`;
}
function grid(pairs) {
  const cells = pairs.map(([l, v]) => tile(l, v)); let rows = '';
  for (let i = 0; i < cells.length; i += 2) {
    const a = cells[i], b = cells[i + 1] || '<td style="width:50%"></td>';
    rows += `<tr>${a}<td style="width:12px"></td>${b}</tr><tr><td colspan="3" style="height:12px;font-size:0;line-height:0">&nbsp;</td></tr>`;
  }
  return `<table style="width:100%;border-collapse:separate;border-spacing:0">${rows}</table>`;
}
function tilesFor(r, skip) {
  const all = [['mom', 'Momento', `<b>${mmss(r.t)}</b>`], ['alt', 'Altura', `${Math.round(r.rel)} m`],
    ['altsl', 'Altitud', `${Math.round(r.ab)} m`], ['vel', 'Velocidad', vel(r)],
    ['vvert', 'Vel. vertical', vv(r)], ['rumbo', 'Rumbo', rumbo(r)], ['temp', 'Temp. color', `${Math.round(r.ct)} K`]];
  return all.filter(([k]) => k !== skip).slice(0, 6).map(([, l, v]) => [l, v]);
}
function card(accent, title, subtitle, hero, barPct, tiles, r, frameKey, hasFrame) {
  const hb = HB[accent], a2 = ACCENT[accent];
  const [hv, hu, hl] = hero;
  const photo = hasFrame ? `<img src="files/frm_${frameKey}.jpg" width="336" height="189" style="display:block;width:100%;height:auto;border-radius:9px;margin-bottom:12px">` : '';
  return `<![CDATA[<div style="width:360px;color:${TXT};font-family:-apple-system,system-ui,Segoe UI,Roboto,sans-serif">`
    + `<table style="width:100%;border-collapse:collapse"><tr><td style="padding:8px 0 13px;vertical-align:middle">`
    + `<div style="color:#fff;font-size:16px;font-weight:800;line-height:1.2">${title}</div>`
    + `<div style="color:rgba(255,255,255,.9);font-size:11px;margin-top:3px">${subtitle}</div></td></tr></table>`
    + `<div style="background:${PANEL};border-radius:14px;padding:12px">${photo}`
    + `<div style="display:flex;align-items:baseline;gap:7px">`
    + `<span style="font-size:34px;font-weight:800;line-height:1;color:${hb};letter-spacing:-1px">${hv}</span>`
    + `<span style="font-size:14px;font-weight:600;color:${MUT}">${hu}</span></div>`
    + `<div style="font-size:10px;text-transform:uppercase;letter-spacing:.6px;color:${LBL};margin:5px 0 12px">${hl}</div>`
    + `<div style="height:6px;background:${BARTRACK};border-radius:4px;overflow:hidden;margin-bottom:14px">`
    + `<div style="height:6px;width:${barPct}%;background:linear-gradient(90deg,${hb},${a2});border-radius:4px"></div></div>`
    + `${grid(tiles)}<div style="margin-top:13px;font-size:11px;color:${FOOT}">&#128205; ${r.lat.toFixed(6)}, ${r.lon.toFixed(6)}</div>`
    + `</div></div>]]>`;
}

// configuración por punto clave: key -> {accent, hero, bar, skip}
function heroFor(key, r) {
  switch (key) {
    case 'up': return ['green', [`${Math.round(r.rel)}`, 'm', 'Altura al iniciar la grabación'], pct(r.rel, 120), 'alt'];
    case 'hi': return ['blue', [`${Math.round(r.rel)}`, 'm', 'Altura máxima sobre el despegue'], 100, 'alt'];
    case 'far': return ['orange', [`${Math.round(r.far)}`, 'm', 'Distancia al punto de despegue'], 100, 'altsl'];
    case 'fast': return ['violet', [`${Math.round(kmh(r))}`, 'km/h', 'Velocidad horizontal máxima'], 100, 'vel'];
    case 'topdesc': return ['indigo', [`${Math.round(r.rel)}`, 'm', 'Empieza a bajar para aterrizar'], pct(r.rel, 120), 'alt'];
    case 'dive': return ['amber', [`${Math.abs(r.vs).toFixed(1)}`, 'm/s', 'Bajada más rápida (aterrizaje)'], 100, 'vvert'];
    case 'light': return ['navy', [`${Math.round(r.iso)}`, 'ISO', 'Máxima sensibilidad (menos luz)'], 100, 'temp'];
    case 'down': return ['red', [`${Math.round(r.rel)}`, 'm', 'Altura al tocar suelo'], pct(r.rel, 120), 'alt'];
    default: return ['track', [`${Math.round(r.rel)}`, 'm', 'Altura sobre el despegue'], pct(r.rel, 120), 'alt'];
  }
}

/**
 * Construye el KMZ avanzado.
 * @returns {{blob:Blob, filename:string}}
 */
export function buildKMZ(model, assets = {}) {
  const S = model.series, tk = model.takeoff, m = model.meta;
  const kps = assets.kps || keypoints(model);
  const start = new Date(m.start.replace(' ', 'T'));
  const utc = (sec) => new Date(start.getTime() + sec * 1000).toISOString().slice(0, 19) + 'Z';

  // rumbo por muestra
  for (let i = 0; i < S.length; i++) {
    S[i].hd = (i > 0 && S[i - 1].lat && S[i].lat) ? Math.round(bearing(S[i - 1].lat, S[i - 1].lon, S[i].lat, S[i].lon)) : null;
    if (S[i].far == null) S[i].far = hav(tk[0], tk[1], S[i].lat, S[i].lon);
  }
  S[0].hd = S[1] ? S[1].hd : 0;

  const lats = S.map(s => s.lat), lons = S.map(s => s.lon);
  const clat = (Math.min(...lats) + Math.max(...lats)) / 2, clon = (Math.min(...lons) + Math.max(...lons)) / 2;
  const relmax = Math.max(...S.map(s => s.rel));
  const rapido = S.filter(s => s.hs != null).reduce((a, b) => b.hs > a.hs ? b : a);
  const maxfar = Math.max(...S.map(s => s.far));

  // estilos
  const bstyle = (accent) => `<BalloonStyle><bgColor>${kmlcol(mix(mix(ACCENT[accent], '#000000', .35), '#2a2d35', .55))}</bgColor><text><![CDATA[$[description]]]></text></BalloonStyle>`;
  const usedAccents = ['green', 'blue', 'orange', 'violet', 'indigo', 'amber', 'navy', 'red', 'track'];
  const pinStyle = (key, accent, scale = 1.15, label = false) =>
    ` <Style id="${key}"><IconStyle><scale>${scale}</scale><Icon><href>files/pin_${accent}.png</href></Icon></IconStyle>`
    + (label ? '<LabelStyle><scale>0.8</scale></LabelStyle>' : '') + bstyle(accent) + `</Style>\n`;

  let styles = ` <Style id="track"><LineStyle><color>ff2878eb</color><width>4</width></LineStyle>${bstyle('track')}</Style>\n`
    + ` <Style id="wall"><LineStyle><color>882878eb</color><width>2</width></LineStyle><PolyStyle><color>1c2878eb</color></PolyStyle>${bstyle('track')}</Style>\n`
    + ` <Style id="drone"><IconStyle><scale>1.5</scale><Icon><href>files/drone.png</href></Icon></IconStyle><LineStyle><color>ff2878eb</color><width>4</width></LineStyle><LabelStyle><scale>0.9</scale></LabelStyle>${bstyle('track')}</Style>\n`;
  const keyToAccent = { up: 'green', hi: 'blue', far: 'orange', fast: 'violet', topdesc: 'indigo', dive: 'amber', light: 'navy', down: 'red' };
  for (const k of kps) styles += pinStyle('pin_' + k.key, keyToAccent[k.key] || 'track');
  styles += pinStyle('pin_min', 'track', 0.7, true);

  // placemarks de puntos clave
  let keypointsXml = '';
  for (const k of kps) {
    const r = k.x, accent = keyToAccent[k.key] || 'track';
    const [ac, hero, bar, skip] = heroFor(k.key, r);
    const sub = `Minuto ${mmss(r.t)} &middot; ${Math.round(r.ab)} m msnm`;
    const balloon = card(ac, k.label, sub, hero, bar, tilesFor(r, skip), r, k.key, assets.hasFrames && !!k.frame);
    keypointsXml += `  <Placemark><name>${esc(k.label)}</name><styleUrl>#pin_${k.key}</styleUrl>\n`
      + `   <description>${balloon}</description>\n`
      + `   <Point><altitudeMode>absolute</altitudeMode><coordinates>${r.lon},${r.lat},${r.ab.toFixed(1)}</coordinates></Point></Placemark>\n`;
  }

  // marcas de minuto
  let minutesXml = '';
  for (const target of [60, 120, 180, 240, 300]) {
    if (target > m.dur) break;
    const r = S.reduce((a, b) => Math.abs(b.t - target) < Math.abs(a.t - target) ? b : a);
    const nm = `${target / 60}:00`;
    const balloon = card('track', `Minuto ${nm}`, `Posición &middot; ${Math.round(r.ab)} m msnm`, [`${Math.round(r.rel)}`, 'm', 'Altura sobre el despegue'], pct(r.rel, 120), tilesFor(r, 'alt'), r, null, false);
    minutesXml += `  <Placemark><name>${nm}</name><styleUrl>#pin_min</styleUrl>\n`
      + `   <description>${balloon}</description>\n`
      + `   <Point><altitudeMode>absolute</altitudeMode><coordinates>${r.lon},${r.lat},${r.ab.toFixed(1)}</coordinates></Point></Placemark>\n`;
  }

  // globo del track (con sparkline)
  const _dur = mmss(m.dur);
  const trackDesc = `<![CDATA[<div style="width:360px;color:${TXT};font-family:-apple-system,system-ui,sans-serif">`
    + `<table style="width:100%;border-collapse:collapse"><tr><td style="width:38px;padding:8px 0 13px;vertical-align:middle">`
    + `<img src="files/drone.png" width="36" height="36" style="display:block"></td>`
    + `<td style="padding:8px 0 13px 12px;vertical-align:middle"><div style="color:#fff;font-size:16px;font-weight:800">${esc(assets.title || 'Vuelo DJI')}</div>`
    + `<div style="color:rgba(255,255,255,.9);font-size:11px;margin-top:3px">${m.start.slice(0, 10)} &middot; ${_dur} min</div></td></tr></table>`
    + `<div style="background:${PANEL};border-radius:14px;padding:12px">`
    + grid([['Altura máxima', `${Math.round(relmax)} m`], ['Alejamiento', `${nf(maxfar)} m`], ['Recorrido', `${nf(model.dist)} m`], ['Vel. máxima', `${Math.round(kmh(rapido))} km/h`], ['Duración', _dur], ['Fotogramas', nf(m.frames)]])
    + `<div style="margin-top:13px;font-size:9px;letter-spacing:.5px;color:${MUT};text-transform:uppercase">Perfil de altitud</div>`
    + `<img src="files/spark.png" width="328" height="92" style="display:block;width:100%;height:auto;margin-top:5px;border-radius:8px">`
    + `<div style="display:flex;justify-content:space-between;font-size:10px;color:${FOOT};margin-top:3px"><span>0:00</span><span>máx ${Math.round(relmax)} m</span><span>${_dur}</span></div>`
    + `<div style="margin-top:11px;font-size:11px;color:${MUT};line-height:1.5">&#9654; Usa la barra de tiempo para reproducir<br>&#128295; Clic derecho &#8594; Mostrar perfil de elevación</div>`
    + `</div></div>]]>`;

  // track animado
  const whens = S.map(r => `    <when>${utc(r.t)}</when>\n`).join('');
  const coords = S.map(r => `    <gx:coord>${r.lon} ${r.lat} ${r.ab.toFixed(1)}</gx:coord>\n`).join('');
  const line = S.map(r => `${r.lon},${r.lat},${r.ab.toFixed(1)}`).join(' ');

  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2">
<Document>
 <name>${esc(assets.title || 'Vuelo DJI')} (avanzado)</name>
 <open>1</open>
 <LookAt><longitude>${clon.toFixed(6)}</longitude><latitude>${clat.toFixed(6)}</latitude>
  <altitude>760</altitude><heading>0</heading><tilt>55</tilt><range>1800</range><altitudeMode>absolute</altitudeMode></LookAt>
${styles}
 <Folder><name>Trayectoria del vuelo</name><open>1</open>
  <Placemark><name>Recorrido</name><styleUrl>#track</styleUrl>
   <description>${trackDesc}</description>
   <LineString><tessellate>1</tessellate><altitudeMode>absolute</altitudeMode><coordinates>${line}</coordinates></LineString></Placemark>
  <Placemark><name>Muros de altitud</name><styleUrl>#wall</styleUrl>
   <LineString><extrude>1</extrude><tessellate>1</tessellate><altitudeMode>absolute</altitudeMode><coordinates>${line}</coordinates></LineString></Placemark>
 </Folder>
 <Folder><name>Vuelo animado (barra de tiempo)</name><open>1</open>
  <Placemark><name>Dron en movimiento</name><styleUrl>#drone</styleUrl>
   <description>${trackDesc}</description>
   <gx:Track><altitudeMode>absolute</altitudeMode>
${whens}${coords}   </gx:Track>
  </Placemark>
 </Folder>
 <Folder><name>Puntos clave</name><open>1</open>
${keypointsXml} </Folder>
 <Folder><name>Marcas de minuto</name><open>0</open>
${minutesXml} </Folder>
</Document></kml>`;

  // archivos del KMZ
  const files = [{ name: 'doc.kml', data: kml }];
  for (const accent of usedAccents) files.push({ name: `files/pin_${accent}.png`, data: discIcon(ACCENT[accent]) });
  files.push({ name: 'files/drone.png', data: droneIcon() });
  files.push({ name: 'files/spark.png', data: sparkIcon(model) });
  if (assets.hasFrames) for (const k of kps) if (k.frame) files.push({ name: `files/frm_${k.key}.jpg`, data: dataUrlToBytes(k.frame) });

  const filename = (assets.title || 'vuelo').replace(/[^\w.-]+/g, '_') + '-avanzado.kmz';
  return { blob: makeZip(files), filename };
}

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
