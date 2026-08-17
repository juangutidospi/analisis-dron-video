import { DjiElement } from '../../../core/DjiElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { t, getLang } from '../../../i18n/index.js';
import { keypoints, mmss } from '../../../geo.js';
import { hav } from '../../../srt.js';
import { dayBand } from '../../../daypart.js';
import { solarPosition, lightPhase, azToCompass } from '../../../solar.js';
import { fetchTerrain } from '../../../terrain.js';
import { estimateWind } from '../../../wind.js';
import '../../ui/stat-tile/stat-tile.js';
import '../../ui/moment-card/moment-card.js';
import '../../ui/callout/callout.js';
import '../../ui/time-chart/time-chart.js';
import '../../ui/sat-map/sat-map.js';
import '../../ui/export-bar/export-bar.js';
import '../../ui/image-lightbox/image-lightbox.js';
import '../../ui/flight-player/flight-player.js';
import '../../ui/reading-nav/reading-nav.js';
import { PlayerClock } from '../../../core/player-clock.js';
import { reveal } from '../../../core/reveal.js';
import { styles } from './flight-report.css.js';

const f = (v, d = 0) => (v == null ? '—' : v.toFixed(d));
const nfmt = (n) => n.toLocaleString(getLang() === 'es' ? 'es-ES' : 'en-US');
const strip = (s) => s.replace(/\s*\(.*?\)/, '');
/** Rumbo inicial (grados, 0=N) del punto A al B por la loxodrómica/gran círculo. */
const bearing = (la1, lo1, la2, lo2) => {
  const p1 = la1 * Math.PI / 180, p2 = la2 * Math.PI / 180, dl = (lo2 - lo1) * Math.PI / 180;
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
};
const MES = {
  es: ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  en: ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
function fecha(start) {
  const m = start.match(/(\d{4})-(\d\d)-(\d\d)/); const y = +m[1], mo = +m[2], d = +m[3];
  return getLang() === 'es' ? `${d} de ${MES.es[mo]} de ${y}` : `${MES.en[mo]} ${d}, ${y}`;
}

/** Informe completo del vuelo. Recibe los datos con show(model, assets). */
export class FlightReport extends DjiElement {
  static styles = [styles];

  /** @param {object} model @param {object} assets */
  show(model, assets) {
    this.model = model; this.assets = assets;
    this.kps = assets.kps || keypoints(model);
    this._paint();
  }

  render() {
    if (!this.model) return;
    const m = this.model.meta, r = this.model.ranges, cam = this.model.cam, a = this.assets;
    const dur = m.dur, relmax = f(r.rel[1]), hsmax = f(r.hspeed[1] * 3.6), hsavg = f(r.hspeed_avg * 3.6);
    const iso = cam.iso.length ? `${Math.min(...cam.iso)}–${Math.max(...cam.iso)}` : '—';
    this.shadowRoot.innerHTML = `
      ${this._heroTpl(m, r, dur, relmax, hsmax)}
      <div class="wrap">
        ${this._resumenTpl(m, r, dur, relmax, hsavg, hsmax, iso)}
        ${this._momentosTpl(a)}
        ${this._routeTpl()}
        ${this._sectionChart('alt', 'c-alt', `<div class="legend"><span><span class="sw" style="background:var(--c-blue)"></span>${t('alt.series')}</span></div>`)}
        ${this._terrainTpl()}
        ${this._dynamicsTpl()}
        ${this._windTpl()}
        ${this._cameraTpl(cam, r, iso, a)}
        ${this._solarTpl(m)}
        ${this._gimbalTpl(r)}
        ${this._locationTpl()}
        ${this._notesTpl()}
      </div>
      <div class="foot">${escapeHtml(t('foot', { n: nfmt(m.frames), fecha: fecha(m.start) }))}</div>`;
  }

  connectedCallback() {
    super.connectedCallback();
    // el visor vive en el body (overlay a pantalla completa, sobre el chrome)
    if (!this._lb) { this._lb = document.createElement('image-lightbox'); document.body.appendChild(this._lb); }
    if (!this._lbWired) {
      this._lbWired = true;
      // galería del bloque "Momentos clave": todas las tarjetas con fotograma
      this.shadowRoot.addEventListener('moment:open', (e) => {
        if (!this._lb) return;
        const cards = this.$$('.mos moment-card').filter((c) => c.getAttribute('img'));
        const items = cards.map((c) => ({
          src: c.getAttribute('img'), label: c.getAttribute('label'),
          time: c.getAttribute('time'), metric: c.getAttribute('metric'),
          secs: c.getAttribute('secs') != null ? +c.getAttribute('secs') : null,
        }));
        const idx = Math.max(0, items.findIndex((it) => it.src === e.detail.img));
        this._lb.open(items, idx, { title: this.assets?.title, mp4File: this.assets?.mp4File });
      });
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._lb) { this._lb.remove(); this._lb = null; }
    if (this._clock) { this._clock.destroy(); this._clock = null; }
    if (this._player) { this._player.remove(); this._player = null; }
    if (this._video) { this._video.removeAttribute('src'); this._video.load(); this._video = null; }
    if (this._videoUrl) { URL.revokeObjectURL(this._videoUrl); this._videoUrl = null; }
    this._revealOff?.(); this._revealOff = null;
    if (this._nav) { this._nav.remove(); this._nav = null; }
    if (this._scrollyRaf) { cancelAnimationFrame(this._scrollyRaf); this._scrollyRaf = 0; }
    this._playerIO?.disconnect(); this._playerIO = null;
  }

  _heroTpl(m, r, dur, relmax, hsmax) {
    const a = this.assets;
    const stat = (v, unit, label) => `<stat-tile hero value="${v}" unit="${unit}" label="${escapeHtml(label)}"></stat-tile>`;
    return `
      <header class="r-hero">
        <div class="bg ${a.hero ? '' : 'gradient'}" ${a.hero ? `style="background-image:url('${a.hero}')"` : ''}></div>
        <div class="scrim"></div>
        <div class="inner">
          <span class="kick">${escapeHtml(t('hero.kicker'))}</span>
          <h1>${escapeHtml(a.title || 'DJI')}</h1>
          <p class="lede">${escapeHtml(this._lede(m))}</p>
          <div class="hstats">
            ${stat(mmss(dur), '', t('hero.duration'))}
            ${stat(relmax, 'm', t('hero.altmax'))}
            ${stat(nfmt(this.model.maxfar), 'm', t('hero.away'))}
            ${stat(hsmax, 'km/h', t('hero.vmax'))}
          </div>
          <div class="hmeta">
            <span>📅 <b>${fecha(m.start)}</b></span>
            <span>🕘 <b>${m.start.slice(11, 19)} – ${m.end.slice(11, 19)}</b></span>
            <span>🎞️ <b>${escapeHtml(t('hero.frames', { n: nfmt(m.frames) }))}</b> · ${m.fps} fps</span>
          </div>
        </div>
      </header>`;
  }

  /** Descripción dinámica: duración + franja del día + lugar. */
  _lede(m) {
    const mins = Math.max(1, Math.floor(m.dur / 60));
    const dur = mins === 1 ? t('dur.one') : t('dur.many', { n: mins });
    const band = dayBand(m.start, this.model.takeoff[0], this.model.takeoff[1]);
    let lede = t('hero.lede.base', { dur, daypart: t('daypart.' + band) });
    if (this.assets.place) lede += t('hero.lede.place', { place: this.assets.place });
    return lede + t('hero.lede.tail');
  }

  _resumenTpl(m, r, dur, relmax, hsavg, hsmax, iso) {
    const tile = (v, unit, label, hint) => `<stat-tile value="${v}" unit="${unit}" label="${escapeHtml(label)}" hint="${escapeHtml(hint)}"></stat-tile>`;
    return `
      <section class="blk">
        <div class="eyebrow">${escapeHtml(t('resumen.eyebrow'))}</div>
        <h2>${escapeHtml(t('resumen.title'))}</h2>
        <p class="sub">${escapeHtml(t('resumen.sub'))}</p>
        <div class="tiles">
          ${tile(mmss(dur), '', t('tile.duration'), t('tile.frames', { n: nfmt(m.frames) }))}
          ${tile(relmax, 'm', t('tile.altmax'), t('tile.altmax.k'))}
          ${tile(nfmt(this.model.maxfar), 'm', t('tile.awaymax'), t('tile.awaymax.k'))}
          ${tile(nfmt(this.model.dist), 'm', t('tile.distance'), t('tile.distance.k'))}
          ${tile(hsavg, 'km/h', t('tile.speedavg'), t('tile.speedavg.k', { v: hsmax }))}
          ${tile(f(r.vspeed[1], 1), 'm/s', t('tile.climb'), t('tile.climb.k'))}
          ${tile(`${f(r.ab[0])}–${f(r.ab[1])}`, 'm', t('tile.altitude'), t('tile.altitude.k'))}
          ${tile(iso, '', t('tile.iso'), t('tile.iso.k'))}
        </div>
      </section>`;
  }

  _momentosTpl(a) {
    const cards = this.kps.map((k) => `<moment-card time="${mmss(k.t)}" secs="${k.t}" label="${escapeHtml(t('kp.' + k.key))}" metric="${escapeHtml(k.metric)}" sub="${escapeHtml(t('kp.' + k.key + '.sub'))}" ${k.frame ? `img="${k.frame}"` : ''}></moment-card>`).join('');
    let callout = '';
    if (!a.hasFrames) {
      const warn = !!a.frameError;
      callout = `<app-callout ${warn ? 'variant="warn"' : ''} title="${escapeHtml(warn ? t('mom.error.t') : t('mom.novideo.t'))}">${escapeHtml(warn ? a.frameError : t('mom.novideo.d'))}</app-callout>`;
    }
    return `
      <section class="blk">
        <div class="eyebrow">${escapeHtml(t('mom.eyebrow'))}</div>
        <h2>${escapeHtml(t('mom.title'))}</h2>
        <p class="sub">${escapeHtml(a.hasFrames ? t('mom.sub.frames') : t('mom.sub'))}</p>
        ${callout}
        <div class="mos">${cards}</div>
      </section>`;
  }

  _routeTpl() {
    const scrolly = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    const head = `
        <div class="eyebrow">${escapeHtml(t('route.eyebrow'))}</div>
        <h2>${escapeHtml(t('route.title'))}</h2>
        <p class="sub">${escapeHtml(t('route.sub'))}</p>`;
    const card = `
        <div class="card">
          <div class="legend">
            <span><span class="dot" style="background:var(--c-green)"></span>${escapeHtml(t('route.leg.takeoff'))}</span>
            <span><span class="dot" style="background:#fff;border:2px solid var(--color-accent)"></span>${escapeHtml(t('route.leg.moments'))}</span>
            <span><span class="sw" style="background:linear-gradient(90deg,var(--c-blue),var(--c-orange))"></span>${escapeHtml(t('route.leg.height'))}</span>
          </div>
          <sat-map id="map"></sat-map>
          ${scrolly ? `<p class="scrolly-hint">${escapeHtml(t('route.scrolly'))}</p>` : ''}
          <p class="chart-note" style="text-align:center">${escapeHtml(t('route.note'))}</p>
        </div>`;
    // scrollytelling: la tarjeta del mapa se fija (sticky) mientras el scroll hace volar el dron
    if (scrolly) return `
      <section class="blk route-scrolly">${head}
        <div class="scrolly-track"><div class="scrolly-stick">${card}</div></div>
      </section>`;
    return `<section class="blk">${head}${card}</section>`;
  }

  _sectionChart(prefix, id, legend) {
    return `
      <section class="blk">
        <div class="eyebrow">${escapeHtml(t(prefix + '.eyebrow'))}</div>
        <h2>${escapeHtml(t(prefix + '.title'))}</h2>
        <p class="sub">${escapeHtml(t(prefix + '.sub'))}</p>
        <div class="card">${legend}<time-chart id="${id}"></time-chart></div>
      </section>`;
  }

  _dynamicsTpl() {
    return `
      <section class="blk">
        <div class="eyebrow">${escapeHtml(t('dyn.eyebrow'))}</div>
        <h2>${escapeHtml(t('dyn.title'))}</h2>
        <p class="sub">${escapeHtml(t('dyn.sub'))}</p>
        <div class="card">
          <h3>${escapeHtml(t('dyn.speed.h3'))}</h3>
          <div class="legend"><span><span class="sw" style="background:var(--c-blue)"></span>${escapeHtml(t('dyn.speed.h'))}</span><span><span class="sw" style="background:var(--c-violet)"></span>${escapeHtml(t('dyn.speed.v'))}</span></div>
          <time-chart id="c-sp"></time-chart>
        </div>
        <div class="card">
          <h3>${escapeHtml(t('dyn.dist.h3'))}</h3>
          <div class="legend"><span><span class="sw" style="background:var(--c-aqua)"></span>${escapeHtml(t('dyn.dist.legend'))}</span></div>
          <time-chart id="c-far"></time-chart>
        </div>
      </section>`;
  }

  _cameraTpl(cam, r, iso, a) {
    const strip3 = a.light && a.light.length === 3 ? `
      <div class="card">
        <h3>${escapeHtml(t('cam.light.h3'))}</h3>
        <div class="lstrip">
          <figure><img src="${a.light[0]}" alt=""><figcaption><b>${mmss(this.model.meta.dur * 0.15)}</b> · ${escapeHtml(t('cam.light.start'))}</figcaption></figure>
          <figure><img src="${a.light[1]}" alt=""><figcaption><b>${mmss(this.model.meta.dur * 0.5)}</b> · ${escapeHtml(t('cam.light.mid'))}</figcaption></figure>
          <figure><img src="${a.light[2]}" alt=""><figcaption><b>${mmss(this.model.meta.dur * 0.92)}</b> · ${escapeHtml(t('cam.light.end'))}</figcaption></figure>
        </div>
      </div>` : '';
    return `
      <section class="blk">
        <div class="eyebrow">${escapeHtml(t('cam.eyebrow'))}</div>
        <h2>${escapeHtml(t('cam.title'))}</h2>
        <p class="sub">${escapeHtml(t('cam.sub', { iso, ctmin: f(r.ct[0]), ctmax: f(r.ct[1]) }))}</p>
        <div class="card">
          <h3>${escapeHtml(t('cam.h3'))}</h3>
          <div class="legend"><span><span class="sw" style="background:var(--c-blue)"></span>${escapeHtml(t('cam.iso'))}</span><span><span class="sw" style="background:var(--c-yellow)"></span>${escapeHtml(t('cam.ct'))}</span></div>
          <time-chart id="c-cam"></time-chart>
        </div>
        ${strip3}
      </section>`;
  }

  _terrainTpl() {
    return `
      <section class="blk" id="sec-terrain">
        <div class="eyebrow">${escapeHtml(t('terrain.eyebrow'))}</div>
        <h2>${escapeHtml(t('terrain.title'))}</h2>
        <p class="sub">${escapeHtml(t('terrain.sub'))}</p>
        <div class="card">
          <div class="terrain-loading">${escapeHtml(t('terrain.loading'))}</div>
          <div class="terrain-error hidden"><app-callout variant="warn" title="${escapeHtml(t('terrain.error.t'))}">${escapeHtml(t('terrain.error.d'))}</app-callout></div>
          <div class="terrain-body hidden">
            <div class="legend"><span><span class="sw" style="background:var(--c-aqua)"></span>${escapeHtml(t('terrain.legend'))}</span></div>
            <time-chart id="c-terrain"></time-chart>
          </div>
        </div>
        <div class="tiles terrain-tiles hidden" id="terrain-tiles"></div>
      </section>`;
  }

  /** Descarga la elevación del terreno una vez y rellena la sección (o avisa si falla). */
  _setupTerrain() {
    if (this._terrainData !== undefined) { this._fillTerrain(); return; }
    if (this._terrainFetching) return;
    this._terrainFetching = true;
    const S = this.model.series;
    const step = Math.max(1, Math.ceil(S.length / 90));
    const pts = S.filter((s, i) => i % step === 0 && s.lat != null);
    fetchTerrain(pts.map((s) => [s.lat, s.lon])).then((elev) => {
      this._terrainFetching = false;
      if (!elev) { this._terrainData = null; }
      else {
        pts.forEach((s, i) => { s.ground = elev[i]; s.agl = (s.ab != null && elev[i] != null) ? s.ab - elev[i] : null; });
        this._terrainData = { pts };
      }
      this._fillTerrain();
    });
  }

  /** Pinta la gráfica de altura sobre el suelo y las cifras (o el aviso de error). */
  _fillTerrain() {
    if (this._terrainData === undefined) return; // aún cargando
    this.$('#sec-terrain .terrain-loading')?.classList.add('hidden');
    if (!this._terrainData) { this.$('#sec-terrain .terrain-error')?.classList.remove('hidden'); return; }
    const pts = this._terrainData.pts, dur = this.model.meta.dur;
    this.$('#c-terrain').data = { series: pts, dur, cfgs: [
      { k: 'agl', color: '--c-aqua', area: true, min: 0, fmt: (v) => `${Math.round(v)}`, label: t('terrain.legend'), unit: 'm', dec: 0 },
    ] };
    this.$('#sec-terrain .terrain-body')?.classList.remove('hidden');
    const agls = pts.map((s) => s.agl).filter((v) => v != null);
    const grounds = pts.map((s) => s.ground).filter((v) => v != null);
    if (!agls.length) return;
    const tile = (v, label, hint) => `<stat-tile value="${Math.round(v)}" unit="m" label="${escapeHtml(label)}" hint="${escapeHtml(hint)}"></stat-tile>`;
    const tilesEl = this.$('#terrain-tiles');
    tilesEl.innerHTML = tile(Math.max(...agls), t('terrain.aglmax'), t('terrain.aglmax.k'))
      + tile(Math.min(...agls), t('terrain.clearance'), t('terrain.clearance.k'))
      + tile(Math.max(...grounds) - Math.min(...grounds), t('terrain.relief'), t('terrain.relief.k'));
    tilesEl.classList.remove('hidden');
  }

  _windTpl() {
    const w = estimateWind(this.model.series);
    const head = `
        <div class="eyebrow">${escapeHtml(t('wind.eyebrow'))}</div>
        <h2>${escapeHtml(t('wind.title'))}</h2>
        <p class="sub">${escapeHtml(t('wind.sub'))}</p>`;
    if (!w) {
      return `<section class="blk">${head}
        <app-callout variant="warn" title="${escapeHtml(t('wind.na.t'))}">${escapeHtml(t('wind.na.d'))}</app-callout>
      </section>`;
    }
    const kmh = Math.round(w.speed * 3.6), asKmh = Math.round(w.airspeed * 3.6);
    const compass = azToCompass(w.fromDeg);
    const tile = (v, unit, label, hint) => `<stat-tile value="${escapeHtml(String(v))}" unit="${unit}" label="${escapeHtml(label)}" hint="${escapeHtml(hint)}"></stat-tile>`;
    return `
      <section class="blk">${head}
        <div class="grid2 solar-grid">
          <div class="card sun-card">${this._windCompass(w.fromDeg)}</div>
          <div class="card">
            <div class="tiles solar-tiles">
              ${tile(kmh, 'km/h', t('wind.speed'), t('wind.speed.k'))}
              ${tile(compass, '', t('wind.dir'), t('wind.dir.k', { deg: Math.round(w.fromDeg) }))}
              ${tile(asKmh, 'km/h', t('wind.airspeed'), t('wind.airspeed.k'))}
            </div>
          </div>
        </div>
        <app-callout title="${escapeHtml(t('wind.note.t'))}">${escapeHtml(t('wind.quality.' + w.quality))} ${escapeHtml(t('wind.note.d'))}</app-callout>
      </section>`;
  }

  /** Brújula de viento: una flecha que cruza la escena en el sentido del viento. */
  _windCompass(fromDeg) {
    const cx = 110, cy = 110, R = 84;
    const pt = (a, r) => [cx + r * Math.sin(a * Math.PI / 180), cy - r * Math.cos(a * Math.PI / 180)];
    const toward = (fromDeg + 180) % 360;
    const [x1, y1] = pt(fromDeg, R - 12);
    const [x2, y2] = pt(toward, R - 12);
    const dir = toward * Math.PI / 180, fx = Math.sin(dir), fy = -Math.cos(dir), px = Math.cos(dir), py = Math.sin(dir);
    const ah = 12, w2 = 7;
    const head = `${x2.toFixed(1)},${y2.toFixed(1)} ${(x2 - ah * fx + w2 * px).toFixed(1)},${(y2 - ah * fy + w2 * py).toFixed(1)} ${(x2 - ah * fx - w2 * px).toFixed(1)},${(y2 - ah * fy - w2 * py).toFixed(1)}`;
    const card = [['N', 0], ['E', 90], ['S', 180], ['O', 270]].map(([lbl, a]) => {
      const [x, y] = pt(a, R + 16);
      return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" class="cmp-card" dominant-baseline="middle" text-anchor="middle">${lbl}</text>`;
    }).join('');
    const ticks = Array.from({ length: 12 }, (_, i) => {
      const [a1, b1] = pt(i * 30, R), [a2, b2] = pt(i * 30, R - 8);
      return `<line x1="${a1.toFixed(1)}" y1="${b1.toFixed(1)}" x2="${a2.toFixed(1)}" y2="${b2.toFixed(1)}" class="cmp-tick"/>`;
    }).join('');
    return `<svg viewBox="0 0 220 220" class="compass" role="img" aria-label="${escapeHtml(t('wind.eyebrow'))}">
      <circle cx="${cx}" cy="${cy}" r="${R}" class="cmp-ring"/>
      ${ticks}${card}
      <line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" class="cmp-wind"/>
      <polygon points="${head}" class="cmp-wind-head"/>
    </svg>`;
  }

  _solarTpl(m) {
    const [clat, clon] = this.model.center;
    const start = new Date(m.start.replace(' ', 'T'));
    const end = new Date(start.getTime() + m.dur * 1000);
    const s0 = solarPosition(start, clat, clon);
    const s1 = solarPosition(end, clat, clon);
    const phase = lightPhase((s0.elevation + s1.elevation) / 2);
    const az = s0.azimuth;
    const far = this.kps.find((k) => k.key === 'far');
    const flightAz = far ? bearing(this.model.takeoff[0], this.model.takeoff[1], far.lat, far.lon) : null;
    const tile = (v, unit, label, hint) => `<stat-tile value="${escapeHtml(v)}" unit="${unit}" label="${escapeHtml(label)}" hint="${escapeHtml(hint)}"></stat-tile>`;
    return `
      <section class="blk">
        <div class="eyebrow">${escapeHtml(t('solar.eyebrow'))}</div>
        <h2>${escapeHtml(t('solar.title'))}</h2>
        <p class="sub">${escapeHtml(t('solar.sub'))}</p>
        <div class="grid2 solar-grid">
          <div class="card sun-card">${this._sunCompass(az, flightAz)}</div>
          <div class="card">
            <div class="tiles solar-tiles">
              ${tile(`${Math.round(s0.elevation)}`, '°', t('solar.elev'), t('solar.elev.k', { end: Math.round(s1.elevation) }))}
              ${tile(azToCompass(az), '', t('solar.dir'), t('solar.dir.k', { az: Math.round(az) }))}
              ${tile(t('solar.phase.' + phase), '', t('solar.phase'), t('solar.phase.k'))}
            </div>
          </div>
        </div>
      </section>`;
  }

  /** Brújula solar: dónde estaba el sol (azimut) y el rumbo del vuelo. */
  _sunCompass(azSun, azFlight) {
    const cx = 110, cy = 110, R = 84;
    const pt = (a, r) => [cx + r * Math.sin(a * Math.PI / 180), cy - r * Math.cos(a * Math.PI / 180)];
    const [sx, sy] = pt(azSun, R);
    const card = [['N', 0], ['E', 90], ['S', 180], ['O', 270]].map(([lbl, a]) => {
      const [x, y] = pt(a, R + 16);
      return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" class="cmp-card" dominant-baseline="middle" text-anchor="middle">${lbl}</text>`;
    }).join('');
    const ticks = Array.from({ length: 12 }, (_, i) => {
      const [x1, y1] = pt(i * 30, R), [x2, y2] = pt(i * 30, R - 8);
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" class="cmp-tick"/>`;
    }).join('');
    let flight = '';
    if (azFlight != null) {
      const [fx, fy] = pt(azFlight, R - 26);
      flight = `<line x1="${cx}" y1="${cy}" x2="${fx.toFixed(1)}" y2="${fy.toFixed(1)}" class="cmp-flight"/>`
        + `<circle cx="${fx.toFixed(1)}" cy="${fy.toFixed(1)}" r="4" class="cmp-flight-dot"/>`;
    }
    return `<svg viewBox="0 0 220 220" class="compass" role="img" aria-label="${escapeHtml(t('solar.eyebrow'))}">
      <defs><radialGradient id="sunglow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="var(--c-yellow)" stop-opacity="0.55"/><stop offset="1" stop-color="var(--c-yellow)" stop-opacity="0"/>
      </radialGradient></defs>
      <circle cx="${cx}" cy="${cy}" r="${R}" class="cmp-ring"/>
      ${ticks}${card}
      <line x1="${sx.toFixed(1)}" y1="${sy.toFixed(1)}" x2="${cx}" y2="${cy}" class="cmp-ray"/>
      ${flight}
      <circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="26" fill="url(#sunglow)"/>
      <circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="11" class="cmp-sun"/>
      <circle cx="${cx}" cy="${cy}" r="3.5" class="cmp-center"/>
    </svg>`;
  }

  _gimbalTpl(r) {
    return `
      <section class="blk">
        <div class="eyebrow">${escapeHtml(t('gim.eyebrow'))}</div>
        <h2>${escapeHtml(t('gim.title'))}</h2>
        <p class="sub">${escapeHtml(t('gim.sub'))}</p>
        <div class="card">
          <h3>${escapeHtml(t('gim.h3'))}</h3>
          <div class="legend"><span><span class="sw" style="background:var(--c-green)"></span>${escapeHtml(t('gim.legend'))}</span></div>
          <time-chart id="c-gb"></time-chart>
          <p class="chart-note">${escapeHtml(t('gim.note', { min: f(r.pitch[0]), max: f(r.pitch[1]) }))}</p>
        </div>
      </section>`;
  }

  _locationTpl() {
    const d = this.model;
    return `
      <section class="blk">
        <div class="eyebrow">${escapeHtml(t('loc.eyebrow'))}</div>
        <h2>${escapeHtml(t('loc.title'))}</h2>
        <div class="grid2">
          <div class="card">
            <h3>${escapeHtml(t('loc.coords'))}</h3>
            <table><tbody>
              <tr><td>${escapeHtml(t('loc.takeoff'))}</td><td class="n"><code>${f(d.takeoff[0], 6)}, ${f(d.takeoff[1], 6)}</code></td></tr>
              <tr><td>${escapeHtml(t('loc.center'))}</td><td class="n"><code>${f(d.center[0], 6)}, ${f(d.center[1], 6)}</code></td></tr>
            </tbody></table>
            <p style="margin:12px 0 0"><a href="https://www.google.com/maps?q=${d.takeoff[0]},${d.takeoff[1]}" target="_blank" rel="noopener">${escapeHtml(t('loc.gmaps'))}</a></p>
          </div>
          <div class="card" data-noexport>
            <h3>${escapeHtml(t('loc.downloads'))}</h3>
            <export-bar id="exp"></export-bar>
          </div>
        </div>
      </section>`;
  }

  _notesTpl() {
    return `
      <section class="blk">
        <div class="eyebrow">${escapeHtml(t('notes.eyebrow'))}</div>
        <h2>${escapeHtml(t('notes.title'))}</h2>
        <app-callout variant="warn" title="${escapeHtml(t('notes.warn.t'))}">${escapeHtml(t('notes.warn.d', { v: f(this.model.glitch_max * 3.6) }))}</app-callout>
        <app-callout variant="good" title="${escapeHtml(t('notes.good.t'))}">${escapeHtml(t('notes.good.d'))}</app-callout>
      </section>`;
  }

  afterRender() {
    if (!this.model) return;
    const S = this.model.series, dur = this.model.meta.dur, [tk0, tk1] = this.model.takeoff;
    for (const s of S) { s.hskmh = s.hs != null ? s.hs * 3.6 : null; if (s.far == null) s.far = hav(tk0, tk1, s.lat, s.lon); }

    this.$('#c-alt').data = { series: S, dur, cfgs: [{ k: 'rel', color: '--c-blue', area: true, min: 0, fmt: (v) => `${Math.round(v)}`, label: t('alt.series'), unit: 'm', dec: 0 }] };
    this.$('#c-sp').data = { series: S, dur, cfgs: [
      { k: 'hskmh', color: '--c-blue', min: 0, fmt: (v) => `${Math.round(v)}`, label: strip(t('dyn.speed.h')), unit: 'km/h', dec: 1 },
      { k: 'vs', color: '--c-violet', fmt: (v) => `${Math.round(v)}`, label: strip(t('dyn.speed.v')), unit: 'm/s', dec: 1 },
    ] };
    this.$('#c-far').data = { series: S, dur, cfgs: [{ k: 'far', color: '--c-aqua', area: true, min: 0, fmt: (v) => `${Math.round(v)}`, label: strip(t('dyn.dist.legend')), unit: 'm', dec: 0 }] };
    this.$('#c-cam').data = { series: S, dur, cfgs: [
      { k: 'iso', color: '--c-blue', fmt: (v) => `${Math.round(v)}`, label: t('cam.iso'), unit: '', dec: 0 },
      { k: 'ct', color: '--c-yellow', fmt: (v) => `${Math.round(v / 100) / 10}k`, label: strip(t('cam.ct')), unit: 'K', dec: 0 },
    ] };
    this.$('#c-gb').data = { series: S, dur, cfgs: [{ k: 'pitch', color: '--c-green', area: true, fmt: (v) => `${Math.round(v)}°`, label: strip(t('gim.legend')), unit: '°', dec: 0 }] };

    this.$('#map').flight = { model: this.model, kps: this.kps };
    this.$('#exp').flight = { model: this.model, assets: this.assets };
    this._setupTerrain();

    // tira de luz: su propia galería de bloque (3 imágenes)
    const lightFracs = [0.15, 0.5, 0.92];
    const figs = this.$$('.lstrip figure');
    const litems = figs.map((fig, i) => ({
      src: fig.querySelector('img')?.src,
      label: fig.querySelector('figcaption')?.textContent?.trim(),
      secs: this.model.meta.dur * lightFracs[i],
    })).filter((it) => it.src);
    figs.forEach((fig, i) => {
      const img = fig.querySelector('img'); if (!img) return;
      img.style.cursor = 'zoom-in';
      this.on(img, 'click', () => this._lb && this._lb.open(litems, i, { title: this.assets?.title, mp4File: this.assets?.mp4File }));
    });

    this._setupPlayer();
    this._setupPlayerVisibility();
    this._setupScrolly();
    this._setupReveal();
    this._setupNav();
  }

  /** El player (barra + miniatura) solo aparece al llegar a la sección del mapa. */
  _setupPlayerVisibility() {
    this._playerIO?.disconnect(); this._playerIO = null;
    const anchor = this.$('#map');
    if (!anchor || !this._player) return;
    this._player.classList.add('away'); // arranca oculto
    if (!('IntersectionObserver' in window)) { this._player.classList.remove('away'); return; }
    this._playerIO = new IntersectionObserver((es) => {
      const vis = es.some((e) => e.isIntersecting);
      // se mantiene visible mientras se reproduce, aunque el mapa quede fuera de pantalla
      this._player.classList.toggle('away', !vis && !this._clock?.playing);
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0 });
    this._playerIO.observe(anchor);
  }

  /**
   * Scrollytelling del recorrido: mientras el track sticky cruza la pantalla, mapea
   * el progreso del scroll al tiempo de vuelo y hace clock.seek (que ya propaga al
   * mapa, gráficas y player). Solo actúa si no se está reproduciendo con el botón ▶.
   */
  _setupScrolly() {
    if (this._scrollyBound) return;
    this._scrollyBound = true;
    const onScroll = () => {
      if (this._scrollyRaf) return;
      this._scrollyRaf = requestAnimationFrame(() => {
        this._scrollyRaf = 0;
        const track = this.$('.scrolly-track');
        if (!track || !this._clock || this._clock.playing) return;
        const rect = track.getBoundingClientRect();
        const span = track.offsetHeight - innerHeight;
        if (span <= 0 || rect.top > innerHeight || rect.bottom < 0) return; // fuera de pantalla
        const p = Math.max(0, Math.min(1, -rect.top / span));
        this._clock.seek(p * this._clock.dur);
      });
    };
    this.on(window, 'scroll', onScroll, { passive: true });
  }

  /** Scroll-reveal de las secciones al entrar en pantalla (respeta reduced-motion). */
  _setupReveal() {
    this._revealOff?.();
    this._revealOff = reveal(this.$$('section.blk'));
  }

  /** Barra de progreso de lectura + mini-nav de secciones (montada en el body). */
  _setupNav() {
    if (!this._nav) {
      this._nav = document.createElement('reading-nav');
      document.body.appendChild(this._nav);
    }
    const items = this.$$('section.blk').map((el) => ({ el, label: el.querySelector('.eyebrow')?.textContent?.trim() || '' }));
    this._nav.target = { scroller: this, items };
  }

  /** Reproducción del vuelo: reloj + barra flotante + sincronía de mapa y gráficas. */
  _setupPlayer() {
    if (!this.model) return;
    if (!this._clock) {
      this._clock = new PlayerClock(this.model.meta.dur);
      this._clock.addEventListener('tick', (e) => this._onTick(e.detail.t));
    }
    // si hay vídeo: úsalo como fuente de tiempo y muéstralo como miniatura sincronizada
    if (this.assets?.mp4File && !this._video) {
      this._videoUrl = URL.createObjectURL(this.assets.mp4File);
      this._video = document.createElement('video');
      this._video.src = this._videoUrl;
      this._video.muted = true; this._video.playsInline = true; this._video.preload = 'auto';
      this._clock.setSource(this._video);
    }
    if (!this._player) {
      this._player = document.createElement('flight-player');
      document.body.appendChild(this._player);
    }
    this._player.clock = this._clock;
    this._player.video = this._video || null;
    // reserva hueco al final para que la barra fija del reproductor no tape el contenido
    this.classList.toggle('has-video', !!this._video);
  }

  /** Propaga el instante actual al mapa y a todas las gráficas. */
  _onTick(t) {
    this.$('#map')?.playhead(t);
    this.$$('time-chart').forEach((c) => c.playhead(t));
  }
}

customElements.define('flight-report', FlightReport);
