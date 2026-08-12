// Construye el informe completo a partir del modelo del vuelo y los fotogramas extraídos.
// Reúne portada, resumen, momentos, recorrido, altitud, dinámica, cámara, gimbal y exports.

import { timeChart } from './charts.js';
import { buildMap } from './satmap.js';
import { keypoints, mmss } from './geo.js';
import { hav } from './srt.js';
import { toGPX, toKML, toCSV, download } from './exports.js';

const f = (v, d = 0) => v == null ? '—' : v.toFixed(d);
const nfmt = (n) => n.toLocaleString('es-ES');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const MESES = ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/**
 * @param {object} model  modelo del vuelo
 * @param {object} assets { title, kps, light:[3 dataURL], hero:dataURL } (frames opcionales)
 * @returns {HTMLElement}
 */
export function buildReport(model, assets) {
  const m = model.meta, r = model.ranges, cam = model.cam;
  const kps = assets.kps || keypoints(model);
  const dur = m.dur;
  const dt = m.start.match(/(\d{4})-(\d\d)-(\d\d) (\d\d):(\d\d):(\d\d)/);
  const fecha = `${+dt[3]} de ${MESES[+dt[2]]} de ${dt[1]}`;
  const tstart = m.start.slice(11, 19), tend = m.end.slice(11, 19);

  const root = document.createElement('div');
  root.className = 'report';

  const relmax = f(r.rel[1]);
  const hsmax = f(r.hspeed[1] * 3.6), hsavg = f(r.hspeed_avg * 3.6);

  root.innerHTML = `
  <header class="r-hero">
    <div class="bg ${assets.hero ? '' : 'gradient'}" ${assets.hero ? `style="background-image:url('${assets.hero}')"` : ''}></div>
    <div class="scrim"></div>
    <div class="inner">
      <span class="kick">🚁 Telemetría de vuelo · DJI</span>
      <h1>${esc(assets.title || 'Vuelo con DJI')}</h1>
      <p class="lede">Un análisis completo del vuelo, fotograma a fotograma: recorrido, altitud, velocidad, cámara y los momentos clave.</p>
      <div class="hstats">
        <div class="hstat"><div class="v">${mmss(dur)}</div><div class="l">Duración</div></div>
        <div class="hstat"><div class="v">${relmax} <small>m</small></div><div class="l">Altura máx.</div></div>
        <div class="hstat"><div class="v">${nfmt(model.maxfar)} <small>m</small></div><div class="l">Alejamiento</div></div>
        <div class="hstat"><div class="v">${hsmax} <small>km/h</small></div><div class="l">Vel. máx.</div></div>
      </div>
      <div class="hmeta">
        <span>📅 <b>${fecha}</b></span>
        <span>🕘 <b>${tstart} – ${tend}</b></span>
        <span>🎞️ <b>${nfmt(m.frames)} fotogramas</b> · ${m.fps} fps</span>
      </div>
    </div>
  </header>

  <div class="wrap">
    <section class="blk">
      <div class="eyebrow-2">Resumen</div>
      <h2>El vuelo en cifras</h2>
      <p class="sub">Todo se extrae del archivo <code>.SRT</code> que el dron graba junto al vídeo: una lectura de sensores por cada fotograma, sincronizada con la imagen.</p>
      <div class="tiles">
        <div class="tile"><div class="v">${mmss(dur)}</div><div class="l">Duración</div><div class="k">${nfmt(m.frames)} fotogramas</div></div>
        <div class="tile"><div class="v">${relmax} <small>m</small></div><div class="l">Altura máxima</div><div class="k">sobre el despegue</div></div>
        <div class="tile"><div class="v">${nfmt(model.maxfar)} <small>m</small></div><div class="l">Alejamiento máx.</div><div class="k">del punto de inicio</div></div>
        <div class="tile"><div class="v">${nfmt(model.dist)} <small>m</small></div><div class="l">Recorrido total</div><div class="k">distancia horizontal</div></div>
        <div class="tile"><div class="v">${hsavg} <small>km/h</small></div><div class="l">Velocidad media</div><div class="k">máx. ${hsmax} km/h</div></div>
        <div class="tile"><div class="v">${f(r.vspeed[1], 1)} <small>m/s</small></div><div class="l">Ascenso máx.</div><div class="k">velocidad vertical</div></div>
        <div class="tile"><div class="v">${f(r.ab[0])}–${f(r.ab[1])} <small>m</small></div><div class="l">Altitud (msnm)</div><div class="k">absoluta</div></div>
        <div class="tile"><div class="v">${cam.iso.length ? Math.min(...cam.iso) + '–' + Math.max(...cam.iso) : '—'}</div><div class="l">Rango ISO</div><div class="k">la cámara compensó la luz</div></div>
      </div>
    </section>

    <section class="blk">
      <div class="eyebrow-2">Momentos clave</div>
      <h2>Ocho instantes del vuelo</h2>
      <p class="sub">Cada tarjeta marca un hito del vuelo con su marca de tiempo y su dato destacado${assets.hasFrames ? ', sobre el fotograma real del vídeo' : ''}.</p>
      <div class="mos">${kps.map(k => `
        <figure class="mo"><div class="mo-img">${k.frame ? `<img src="${k.frame}" alt="${esc(k.label)}">` : `<div class="ph">sin vídeo</div>`}<span class="mo-t">${mmss(k.t)}</span></div>
        <figcaption class="mo-cap"><div class="mo-label">${esc(k.label)}</div><div class="mo-metric">${esc(k.metric)}</div><div class="mo-sub">${esc(k.sub)}</div></figcaption></figure>`).join('')}</div>
    </section>

    <section class="blk">
      <div class="eyebrow-2">Recorrido</div>
      <h2>El recorrido sobre el terreno</h2>
      <p class="sub">Trazado real sobre imagen de satélite. El color indica la altura: <span style="color:var(--blue)">azul = bajo</span> → <span style="color:var(--orange)">naranja = alto</span>.</p>
      <div class="card">
        <div class="legend">
          <span><span class="dot" style="background:var(--green)"></span>Despegue / aterrizaje</span>
          <span><span class="dot" style="background:#fff;border:2px solid var(--accent)"></span>Momentos clave</span>
          <span><span class="sw" style="background:linear-gradient(90deg,var(--blue),var(--orange))"></span>Altura baja → alta</span>
        </div>
        <div id="mapSlot"></div>
        <p class="chart-note" style="text-align:center">Imagen de satélite: Esri World Imagery · trazado reconstruido con el GPS del vuelo</p>
      </div>
    </section>

    <section class="blk">
      <div class="eyebrow-2">Altitud</div>
      <h2>Perfil de altura</h2>
      <p class="sub">Altura sobre el punto de despegue a lo largo del tiempo.</p>
      <div class="card"><div class="chartbox" id="c-alt"></div></div>
    </section>

    <section class="blk">
      <div class="eyebrow-2">Dinámica</div>
      <h2>Velocidad y distancia</h2>
      <p class="sub">Velocidad sobre el terreno y vertical, y cuánto se alejó el dron del punto de despegue.</p>
      <div class="card">
        <h3>Velocidad horizontal y vertical</h3>
        <div class="legend"><span><span class="sw" style="background:var(--blue)"></span>Horizontal (km/h)</span><span><span class="sw" style="background:var(--violet)"></span>Vertical (m/s)</span></div>
        <div class="chartbox" id="c-sp"></div>
      </div>
      <div class="card">
        <h3>Distancia al punto de despegue</h3>
        <div class="legend"><span><span class="sw" style="background:var(--aqua)"></span>Distancia (m)</span></div>
        <div class="chartbox" id="c-far"></div>
      </div>
    </section>

    <section class="blk">
      <div class="eyebrow-2">Cámara</div>
      <h2>La luz durante el vuelo</h2>
      <p class="sub">Los ajustes de exposición van grabados en cada fotograma: se ve cómo la cámara compensó la luz. ISO ${cam.iso.length ? Math.min(...cam.iso) + '–' + Math.max(...cam.iso) : '—'}, temp. de color ${f(r.ct[0])}–${f(r.ct[1])} K.</p>
      <div class="card">
        <h3>ISO y temperatura de color en el tiempo</h3>
        <div class="legend"><span><span class="sw" style="background:var(--blue)"></span>ISO</span><span><span class="sw" style="background:var(--yellow)"></span>Temp. color (K)</span></div>
        <div class="chartbox" id="c-cam"></div>
      </div>
      ${assets.light && assets.light.length === 3 ? `
      <div class="card">
        <h3>Cómo cambió la luz</h3>
        <div class="lstrip">
          <figure><img src="${assets.light[0]}" alt=""><figcaption><b>${mmss(dur * 0.15)}</b> · inicio</figcaption></figure>
          <figure><img src="${assets.light[1]}" alt=""><figcaption><b>${mmss(dur * 0.5)}</b> · mitad</figcaption></figure>
          <figure><img src="${assets.light[2]}" alt=""><figcaption><b>${mmss(dur * 0.92)}</b> · final</figcaption></figure>
        </div>
      </div>` : ''}
    </section>

    <section class="blk">
      <div class="eyebrow-2">Gimbal</div>
      <h2>Orientación de la cámara (gimbal)</h2>
      <p class="sub">El archivo incluye la orientación del estabilizador como cuaterniones (<code>pp_target</code> = objetivo, <code>pp_current</code> = real) en cada fotograma, más el estado del EIS${cam.eis && cam.eis.length ? ` (<code>${cam.eis.join(', ')}</code>)` : ''} y del recorte de estabilización. De ahí se estima la inclinación de la cámara.</p>
      <div class="card">
        <h3>Inclinación estimada de cámara (pitch)</h3>
        <div class="legend"><span><span class="sw" style="background:var(--green)"></span>Pitch estimado (°)</span></div>
        <div class="chartbox" id="c-gb"></div>
        <p class="chart-note">Rango estimado: ${f(r.pitch[0])}° a ${f(r.pitch[1])}°. Valor derivado del cuaternión; la convención exacta de ejes de DJI no está documentada, tómalo como aproximado.</p>
      </div>
    </section>

    <section class="blk">
      <div class="eyebrow-2">Ubicación y datos</div>
      <h2>Dónde voló y qué te llevas</h2>
      <div class="grid2">
        <div class="card">
          <h3>Coordenadas</h3>
          <table><tbody>
            <tr><td>Despegue / aterrizaje</td><td class="n"><code>${f(model.takeoff[0], 6)}, ${f(model.takeoff[1], 6)}</code></td></tr>
            <tr><td>Centro del vuelo</td><td class="n"><code>${f(model.center[0], 6)}, ${f(model.center[1], 6)}</code></td></tr>
          </tbody></table>
          <p style="margin:12px 0 0"><a href="https://www.google.com/maps?q=${model.takeoff[0]},${model.takeoff[1]}" target="_blank" rel="noopener">Ver en Google Maps ↗</a></p>
        </div>
        <div class="card">
          <h3>Descargar datos del vuelo</h3>
          <div class="exports">
            <button class="exp-btn" data-exp="gpx">🛰️ GPX</button>
            <button class="exp-btn" data-exp="kml">🗺️ KML</button>
            <button class="exp-btn" data-exp="csv">📊 CSV</button>
          </div>
          <p class="chart-note">El <code>.csv</code> incluye todos los datos por fotograma; <code>.gpx</code>/<code>.kml</code> abren el trazado en Google Earth y apps de mapas.</p>
        </div>
      </div>
    </section>

    <section class="blk">
      <div class="eyebrow-2">Calidad de los datos</div>
      <h2>Notas honestas</h2>
      <div class="callout warn"><b>⚠️ Micro-saltos del GPS</b>Entre fotogramas el GPS tiene pequeños saltos que, sin filtrar, dan velocidades imposibles (hasta ${f(model.glitch_max * 3.6)} km/h). Todas las velocidades y distancias se calculan en ventanas de 0,5 s para eliminarlos.</div>
      <div class="callout good"><b>✅ Todo en tu navegador</b>El SRT y el vídeo se procesan en tu equipo; no se sube nada a ningún servidor.</div>
    </section>
  </div>

  <div class="foot">Generado en el navegador a partir de la telemetría · ${nfmt(m.frames)} fotogramas · ${fecha}</div>`;

  // ---- wiring tras insertar en el DOM ----
  queueMicrotask(() => {
    const S = model.series;
    const [tk0, tk1] = model.takeoff;
    for (const s of S) { s.hskmh = s.hs != null ? s.hs * 3.6 : null; if (s.far == null) s.far = hav(tk0, tk1, s.lat, s.lon); }

    timeChart(root.querySelector('#c-alt'), S, dur, [{ k: 'rel', color: '--blue', area: true, min: 0, fmt: v => `${Math.round(v)}`, label: 'Altura', unit: 'm', dec: 0 }]);
    timeChart(root.querySelector('#c-sp'), S, dur, [
      { k: 'hskmh', color: '--blue', min: 0, fmt: v => `${Math.round(v)}`, label: 'Horizontal', unit: 'km/h', dec: 1 },
      { k: 'vs', color: '--violet', fmt: v => `${Math.round(v)}`, label: 'Vertical', unit: 'm/s', dec: 1 },
    ]);
    timeChart(root.querySelector('#c-far'), S, dur, [{ k: 'far', color: '--aqua', area: true, min: 0, fmt: v => `${Math.round(v)}`, label: 'Distancia', unit: 'm', dec: 0 }]);
    timeChart(root.querySelector('#c-cam'), S, dur, [
      { k: 'iso', color: '--blue', fmt: v => `${Math.round(v)}`, label: 'ISO', unit: '', dec: 0 },
      { k: 'ct', color: '--yellow', fmt: v => `${(Math.round(v / 100) / 10)}k`, label: 'Temp', unit: 'K', dec: 0 },
    ]);
    timeChart(root.querySelector('#c-gb'), S, dur, [{ k: 'pitch', color: '--green', area: true, fmt: v => `${Math.round(v)}°`, label: 'Pitch', unit: '°', dec: 0 }]);

    root.querySelector('#mapSlot').appendChild(buildMap(model, kps));

    root.querySelectorAll('[data-exp]').forEach(b => b.addEventListener('click', () => {
      const kind = b.dataset.exp, name = assets.title || 'vuelo';
      if (kind === 'gpx') download(name + '.gpx', toGPX(model, name), 'application/gpx+xml');
      if (kind === 'kml') download(name + '.kml', toKML(model, name), 'application/vnd.google-earth.kml+xml');
      if (kind === 'csv') download(name + '.csv', toCSV(model), 'text/csv');
    }));
  });

  return root;
}
