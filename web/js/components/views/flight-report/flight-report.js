import { DjiElement } from '../../../core/DjiElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { t, getLang } from '../../../i18n/index.js';
import { keypoints, mmss } from '../../../geo.js';
import { hav } from '../../../srt.js';
import { dayBand } from '../../../daypart.js';
import '../../ui/stat-tile/stat-tile.js';
import '../../ui/moment-card/moment-card.js';
import '../../ui/callout/callout.js';
import '../../ui/time-chart/time-chart.js';
import '../../ui/sat-map/sat-map.js';
import '../../ui/export-bar/export-bar.js';
import '../../ui/image-lightbox/image-lightbox.js';
import '../../ui/flight-player/flight-player.js';
import { PlayerClock } from '../../../core/player-clock.js';
import { styles } from './flight-report.css.js';

const f = (v, d = 0) => (v == null ? '—' : v.toFixed(d));
const nfmt = (n) => n.toLocaleString(getLang() === 'es' ? 'es-ES' : 'en-US');
const strip = (s) => s.replace(/\s*\(.*?\)/, '');
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
        ${this._dynamicsTpl()}
        ${this._cameraTpl(cam, r, iso, a)}
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
      this.shadowRoot.addEventListener('moment:open', (e) => this._lb && this._lb.open(e.detail.img, {
        ...e.detail, title: this.assets?.title, mp4File: this.assets?.mp4File, secs: e.detail.secs != null ? +e.detail.secs : null,
      }));
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._lb) { this._lb.remove(); this._lb = null; }
    if (this._clock) { this._clock.destroy(); this._clock = null; }
    if (this._player) { this._player.remove(); this._player = null; }
    if (this._video) { this._video.removeAttribute('src'); this._video.load(); this._video = null; }
    if (this._videoUrl) { URL.revokeObjectURL(this._videoUrl); this._videoUrl = null; }
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
    return `
      <section class="blk">
        <div class="eyebrow">${escapeHtml(t('route.eyebrow'))}</div>
        <h2>${escapeHtml(t('route.title'))}</h2>
        <p class="sub">${escapeHtml(t('route.sub'))}</p>
        <div class="card">
          <div class="legend">
            <span><span class="dot" style="background:var(--c-green)"></span>${escapeHtml(t('route.leg.takeoff'))}</span>
            <span><span class="dot" style="background:#fff;border:2px solid var(--color-accent)"></span>${escapeHtml(t('route.leg.moments'))}</span>
            <span><span class="sw" style="background:linear-gradient(90deg,var(--c-blue),var(--c-orange))"></span>${escapeHtml(t('route.leg.height'))}</span>
          </div>
          <sat-map id="map"></sat-map>
          <p class="chart-note" style="text-align:center">${escapeHtml(t('route.note'))}</p>
        </div>
      </section>`;
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

    // tira de luz: también abre el visor (los momentos se cablean en connectedCallback)
    const lightFracs = [0.15, 0.5, 0.92];
    this.$$('.lstrip figure').forEach((fig, i) => {
      const img = fig.querySelector('img'); if (!img) return;
      img.style.cursor = 'zoom-in';
      this.on(img, 'click', () => this._lb && this._lb.open(img.src, {
        label: fig.querySelector('figcaption')?.textContent?.trim(), title: this.assets?.title,
        mp4File: this.assets?.mp4File, secs: this.model.meta.dur * lightFracs[i],
      }));
    });

    this._setupPlayer();
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
  }

  /** Propaga el instante actual al mapa y a todas las gráficas. */
  _onTick(t) {
    this.$('#map')?.playhead(t);
    this.$$('time-chart').forEach((c) => c.playhead(t));
  }
}

customElements.define('flight-report', FlightReport);
