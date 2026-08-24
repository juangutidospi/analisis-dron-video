import { DjiElement } from '../../../core/DjiElement.js';
import { t } from '../../../i18n/index.js';
import { buildScene3D, altColor } from '../../../scene-3d.js';
import { createMp4Recorder, createMp4StreamRecorder, canExportVideo } from '../../../flyover-export.js';
import { downloadBlob } from '../../../exports.js';
import { styles } from './flight-3d.css.js';

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/**
 * Reconstrucción 3D navegable del vuelo (Three.js): terreno con relieve real
 * texturizado por satélite, recorrido coloreado por altura, dron con su cono de
 * visión y sobrevuelo cinematográfico. Recibe los datos por propiedad:
 *   el.flight = { model }
 */
export class Flight3D extends DjiElement {
  static styles = [styles];

  /** Capas visibles del render (las controla el panel de ajustes). */
  _show = { track: true, kp: true, places: true, water: true, hud: true };

  /** Escala del marcador del dron (y su sombra), elegible en el panel de ajustes:
   *  1 = grande (original), 0.75 = intermedio, 0.5 = mitad. */
  _droneScale = 0.75;

  /** Estado del modo vuelo libre (WASD + ratón). null u {on:false} = desactivado. */
  _free = null;

  /** Estado del modo pilotar el dron (WASD mueve el dron, la cámara lo sigue). */
  _pilot = null;

  /** Velocidad de vuelo (modos libre/pilotar): 0=lenta, 1=media, 2=rápida. */
  _flySpeedIdx = 0;

  /** @param {{model:object}} v */
  set flight(v) { this._flight = v; if (this.isConnected) this._paint(); }
  get flight() { return this._flight; }

  render() {
    this.shadowRoot.innerHTML = `
      <div class="v3d loading" id="wrap">
        <canvas id="cv"></canvas>
        <div class="v3d-vignette"></div>
        <div class="v3d-flash" id="flash"></div>
        <div class="v3d-start" id="start" hidden>
          <button class="v3d-start-btn" id="startBtn" type="button">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            <span>${t('v3d.start')}</span>
          </button>
        </div>
        <div class="v3d-loading">${t('v3d.loading')}</div>
        <div class="v3d-legend"><span class="line"></span><span>${t('v3d.path')}</span></div>
        <div class="v3d-hint">${t('v3d.hint')}</div>
        <div class="v3d-hud" id="hud" hidden>
          <div class="hud-item"><span class="hud-v" id="hudAlt">0</span><span class="hud-u">m</span><span class="hud-l">${t('v3d.hud.alt')}</span></div>
          <div class="hud-item"><span class="hud-v" id="hudSpd">0</span><span class="hud-u">km/h</span><span class="hud-l">${t('v3d.hud.spd')}</span></div>
          <div class="hud-item"><span class="hud-v" id="hudVs">0</span><span class="hud-u">m/s</span><span class="hud-l">${t('v3d.hud.vs')}</span></div>
          <div class="hud-item"><span class="hud-v" id="hudFar">0</span><span class="hud-u">m</span><span class="hud-l">${t('v3d.hud.far')}</span></div>
        </div>
        <div class="v3d-opts" id="opts" hidden>
          <div class="v3d-opts-t">${t('v3d.opts.title')}</div>
          <label><input type="checkbox" data-k="track" checked><span>${t('v3d.opt.track')}</span></label>
          <label><input type="checkbox" data-k="kp" checked><span>${t('v3d.opt.kp')}</span></label>
          <label><input type="checkbox" data-k="places" checked><span>${t('v3d.opt.places')}</span></label>
          <label><input type="checkbox" data-k="water" checked><span>${t('v3d.opt.water')}</span></label>
          <label><input type="checkbox" data-k="hud" checked><span>${t('v3d.opt.hud')}</span></label>
          <div class="v3d-size">
            <span class="v3d-size-l">${t('v3d.opt.size')}</span>
            <div class="v3d-seg" id="dsize">
              <button type="button" data-sz="1">${t('v3d.size.l')}</button>
              <button type="button" data-sz="0.75">${t('v3d.size.m')}</button>
              <button type="button" data-sz="0.5">${t('v3d.size.s')}</button>
            </div>
          </div>
        </div>
        <div class="v3d-bar" hidden>
          <button class="v3d-btn primary" id="play" type="button">
            <svg viewBox="0 0 24 24" fill="currentColor" id="playic"><path d="M8 5v14l11-7z"/></svg>${t('v3d.flyover')}
          </button>
          <div class="v3d-prog" id="prog"><div class="v3d-prog-f" id="progf"></div></div>
          <span class="v3d-time" id="time">0:00 / 0:00</span>
          <button class="v3d-btn" id="speed" type="button" title="${t('v3d.speed')}">1×</button>
          <button class="v3d-btn on" id="cine" type="button" title="${t('v3d.cine')}">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h3l1 2H5l-1-2zm5 0h3l1 2h-3l-1-2zm5 0h3l1 2h-3l-1-2zM3 8h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8z"/></svg>
            <span>${t('v3d.cine.short')}</span>
          </button>
          <span class="v3d-sep"></span>
          <button class="v3d-btn" id="flyspeed" type="button" title="${t('v3d.flyspeed')}" hidden>${t('v3d.flyspeed.slow')}</button>
          <button class="v3d-btn" id="free" type="button" title="${t('v3d.free')}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l3 3-3 3-3-3 3-3zm0 12l3 3-3 3-3-3 3-3zM3 12l3-3 3 3-3 3-3-3zm12 0l3-3 3 3-3 3-3-3z"/></svg>
            <span>${t('v3d.free.short')}</span>
          </button>
          <button class="v3d-btn" id="pilot" type="button" title="${t('v3d.pilot')}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="2.2"/><circle cx="5.5" cy="5.5" r="2.6"/><circle cx="18.5" cy="5.5" r="2.6"/><circle cx="5.5" cy="18.5" r="2.6"/><circle cx="18.5" cy="18.5" r="2.6"/><path d="M7 7l3.4 3.4M17 7l-3.4 3.4M7 17l3.4-3.4M17 17l-3.4-3.4"/></svg>
            <span>${t('v3d.pilot.short')}</span>
          </button>
          <span class="v3d-sep"></span>
          <button class="v3d-btn" id="reset" type="button" title="${t('v3d.reset')}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 4v4h4"/></svg>
          </button>
          <button class="v3d-btn" id="settings" type="button" title="${t('v3d.settings')}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
          <button class="v3d-btn" id="export" type="button" title="${t('v3d.export')}" aria-label="${t('v3d.export.short')}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12"/><path d="M8 11l4 4 4-4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>
          </button>
          <button class="v3d-btn" id="fs" type="button" title="${t('v3d.fullscreen')}" aria-label="${t('v3d.fullscreen')}">
            <svg class="fs-out" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>
            <svg class="fs-in" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>
          </button>
        </div>
        <div class="v3d-export" id="exp" hidden>
          <div class="v3d-export-box">
            <div class="v3d-export-t" id="expT">${t('v3d.export.running')} 0%</div>
            <div class="v3d-export-bar"><div class="v3d-export-f" id="expF"></div></div>
            <div class="v3d-export-est" id="expEst"></div>
            <button class="v3d-btn" id="expCancel" type="button">${t('v3d.export.cancel')}</button>
          </div>
        </div>
        <div class="v3d-free-hint" id="freeHint" hidden>${t('v3d.free.hint')}</div>
      </div>`;
  }

  afterRender() {
    if (!this._flight) return;
    this._teardown();
    const THREE = window.THREE;
    if (!THREE || !this._webglOk()) { this._fallback(); return; }
    // construcción perezosa: solo al acercarse a la pantalla (baja el DEM y las teselas)
    if ('IntersectionObserver' in window) {
      this._io = new IntersectionObserver((es) => {
        if (es.some((e) => e.isIntersecting)) { this._io.disconnect(); this._io = null; this._build(); }
      }, { rootMargin: '400px' });
      this._io.observe(this);
    } else this._build();
  }

  /** Tamaño máximo de textura de la GPU. Se consulta UNA sola vez (con un contexto
   *  WebGL temporal que se libera enseguida) y se cachea, para no ir agotando los
   *  contextos del navegador en cada reconstrucción. */
  static _maxTextureSize() {
    if (Flight3D._maxTex) return Flight3D._maxTex;
    let m = 8192;
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      if (gl) { m = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 8192; gl.getExtension('WEBGL_lose_context')?.loseContext(); }
    } catch { /* usa 8192 */ }
    Flight3D._maxTex = m;
    return m;
  }

  _build() {
    const token = (this._token = Symbol('build'));
    buildScene3D(this._flight.model, { maxTex: Flight3D._maxTextureSize() }).then((scene) => {
      if (token !== this._token || !this.isConnected) return;
      this._scene = scene;
      this._initThree(scene);
      this.$('#wrap').classList.remove('loading');
      this._wireControls(); // la barra aparece tras la intro (o si no hay globo)
      // rótulos del horizonte: entran cuando Overpass responde (no bloquean la escena)
      scene.poisReady?.then((pois) => {
        if (token !== this._token || !this.isConnected) return;
        this._buildHorizonLabels(pois);
      }).catch(() => {});
    }).catch((err) => { console.error('[flight-3d]', err); this._fallback(); });
  }

  disconnectedCallback() { super.disconnectedCallback(); this._teardown(); }

  /* ---------- montaje de la escena ---------- */

  /** Construye escena, cámara, luces, terreno, track y dron con Three.js. */
  _initThree(data) {
    const THREE = window.THREE;
    const canvas = this.$('#cv');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    this._renderer = renderer;

    const scene = new THREE.Scene();
    const span = Math.max(data.bounds.spanX, Math.abs(data.bounds.spanZ)) || 500;
    this._span = span;
    this._three = scene;

    const cam = new THREE.PerspectiveCamera(52, 16 / 10, 1, span * 16);
    this._cam = cam;

    // paleta de cielo/luz según la fase solar real del vuelo
    const pal = this._skyPalette(data.sun);
    scene.background = new THREE.Color(pal.horizon);
    scene.fog = new THREE.Fog(pal.horizon, span * 2.2, span * 7);
    scene.add(this._buildSky(data, pal));

    // luces: cielo/suelo + sol direccional desde la posición real del sol
    scene.add(new THREE.HemisphereLight(pal.top, 0x40382c, pal.hemiI));
    const sun = new THREE.DirectionalLight(pal.sun, pal.sunI);
    const sd = data.sun.dir;
    sun.position.set(sd.x * span, sd.y * span, sd.z * span);
    scene.add(sun);
    this._sunDir = { x: sd.x, y: sd.y, z: sd.z }; // para desplazar la sombra hacia donde cae la luz

    this._terrainMesh = this._buildTerrain(data);
    scene.add(this._terrainMesh);
    scene.add(this._buildSkirt(data)); // faldón: bloque de tierra, no lámina flotante
    this._trackGroup = this._buildTrack(data);
    scene.add(this._trackGroup);
    this._kpGroup = this._buildLabels(data); // rótulos 3D de los hitos
    scene.add(this._kpGroup);
    this._drone = this._buildDrone(data);
    scene.add(this._drone);
    this._shadow = this._buildShadow();
    scene.add(this._shadow);
    this._trail = this._buildTrail();
    scene.add(this._trail);
    this._placeDrone(0);

    // órbita: objetivo en el centro del terreno, a media altura
    this._target = new THREE.Vector3(0, data.terrain.midY ?? 0, 0);
    this._orbit = { r: span * 1.15, theta: -Math.PI * 0.7, phi: 1.2, min: span * 0.05, max: span * 4 };
    this._home = { target: this._target.clone(), r: this._orbit.r, theta: this._orbit.theta, phi: this._orbit.phi };
    this._applyOrbit();

    this._localScene = scene; // escena del vuelo (el globo de la intro es aparte)
    this._resize();
    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(this.$('#wrap'));
    this._setupIntro(data); // deja el globo de póster con el botón de inicio
    this._loop();
    // ahorro: pausa el bucle de render cuando el visor no está en pantalla
    if ('IntersectionObserver' in window) {
      this._visIO = new IntersectionObserver((es) => {
        const vis = es.some((e) => e.isIntersecting);
        if (vis && !this._raf && !this._exporting) this._loop();
        else if (!vis && this._raf && !this._exporting) { cancelAnimationFrame(this._raf); this._raf = null; }
      }, { rootMargin: '80px' });
      this._visIO.observe(this);
    }
  }

  /* ---------- intro cinematográfica (globo → zoom al vuelo) ---------- */

  /** Globo terráqueo texturizado con satélite (shader Web Mercator) + pin. */
  _buildGlobe(data) {
    const THREE = window.THREE, R = 100, scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070e);
    const tex = new THREE.CanvasTexture(data.world); tex.colorSpace = THREE.SRGBColorSpace;
    tex.flipY = false; // el shader mapea la V con el norte arriba; sin voltear el canvas
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: tex } },
      vertexShader: 'varying vec3 vN; void main(){ vN = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `
        varying vec3 vN; uniform sampler2D map; const float PI = 3.14159265;
        void main(){
          vec3 n = normalize(vN);
          float lat = asin(clamp(n.y, -1.0, 1.0));
          float lon = atan(n.x, n.z);
          float u = lon / (2.0 * PI) + 0.5;
          float maxLat = radians(85.05);
          float la = clamp(lat, -maxLat, maxLat);
          float v = 0.5 - log(tan(PI / 4.0 + la / 2.0)) / (2.0 * log(tan(PI / 4.0 + maxLat / 2.0)));
          gl_FragColor = texture2D(map, vec2(u, v));
        }`,
    });
    // todo el planeta va en un grupo que rota para orientar el punto del vuelo
    const group = new THREE.Group(); scene.add(group);
    group.add(new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), mat));
    group.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.035, 64, 48),
      new THREE.MeshBasicMaterial({ color: 0x6ab0ff, transparent: true, opacity: 0.14, side: THREE.BackSide, depthWrite: false })));
    // punto del vuelo sobre la esfera (gira con el grupo)
    const [lat, lon] = data.center, la = lat * Math.PI / 180, lo = lon * Math.PI / 180;
    const nrm = new THREE.Vector3(Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo));
    const pin = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(this._sunSprite()), color: 0xff7d1a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    pin.position.copy(nrm.clone().multiplyScalar(R * 1.02)); pin.scale.set(R * 0.09, R * 0.09, 1);
    group.add(pin);
    // dirección fija de cámara (frente ligeramente elevado); el planeta gira para
    // llevar el punto del vuelo a esa dirección → efecto "girar hacia la ubicación"
    const camDir = new THREE.Vector3(0, 0.32, 1).normalize();
    const qEnd = new THREE.Quaternion().setFromUnitVectors(nrm, camDir);
    const qStart = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -2.6).multiply(qEnd);
    return { scene, group, R, camDir, qStart, qEnd };
  }

  /** Deja el globo quieto de póster y muestra el botón de inicio (no auto-arranca). */
  _setupIntro(data) {
    this._introDur = 3800;
    if (!data.world) { this._localReady(); return; } // sin textura de mundo → escena local
    this._globe = this._buildGlobe(data);
    this._three = this._globe.scene;
    this._posterFrame();
    this.$('#start').hidden = false;
  }

  /** Coloca el globo en su orientación inicial y la cámara en el plano de mundo. */
  _posterFrame() {
    const THREE = window.THREE, g = this._globe, R = g.R;
    g.group.quaternion.copy(g.qStart);
    this._cam.position.copy(g.camDir.clone().multiplyScalar(R * 3.6));
    this._cam.lookAt(new THREE.Vector3(0, 0, 0));
  }

  /** Arranca la animación de zoom desde el espacio (al pulsar el botón). */
  _runIntro() {
    if (!this._globe) { this._localReady(); return; }
    this.$('#start').hidden = true;
    this._introT0 = performance.now();
  }

  /** Pasa directamente a la escena del vuelo (cuando no hay globo). */
  _localReady() {
    this.$('#start').hidden = true;
    this._three = this._localScene;
    this._applyOrbit();
    this.$('.v3d-bar').hidden = false;
  }

  /** Gira el planeta hacia el punto del vuelo mientras la cámara hace zoom, y
   *  al final funde a la escena local. */
  _stepIntro() {
    const THREE = window.THREE, p = Math.min(1, (performance.now() - this._introT0) / this._introDur);
    const eZoom = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; // easeInOutCubic
    const eRot = 1 - Math.pow(1 - Math.min(1, p / 0.62), 3); // la rotación acaba en p=0.62
    const g = this._globe, R = g.R, cd = g.camDir;
    // rotación del planeta: pone el vuelo de cara ANTES del destello (se ve llegar)
    g.group.quaternion.copy(g.qStart).slerp(g.qEnd, eRot);
    // cámara: para a nivel regional (Iberia reconocible), no un punto borroso; el
    // relevo a la escena detallada aporta el detalle fino
    const dist = R * (3.6 + (1.62 - 3.6) * eZoom);
    const tan = new THREE.Vector3().crossVectors(cd, new THREE.Vector3(0, 1, 0)).normalize();
    this._cam.position.copy(cd.clone().multiplyScalar(dist).add(tan.multiplyScalar(R * 0.3 * (1 - eZoom))));
    this._cam.lookAt(cd.clone().multiplyScalar(R * 0.98));
    if (p > 0.86) this.$('#flash')?.classList.add('on');
    if (p >= 1) this._endIntro();
  }

  /** Cierra la intro: pasa a la escena del vuelo con encuadre cenital y funde. */
  _endIntro() {
    if (this._introT0 == null) return;
    this._introT0 = null;
    this._three = this._localScene;
    // aterriza cerca y en ángulo (el terreno llena el plano; no se ve la "isla")
    this._orbit.r = this._orbit.max * 0.24; this._orbit.phi = 1.12; this._orbit.theta = -Math.PI * 0.62;
    this._applyOrbit();
    this.$('.v3d-bar').hidden = false; // la barra aparece al aterrizar en el vuelo
    setTimeout(() => this.$('#flash')?.classList.remove('on'), 60);
    if (this._globe) {
      this._globe.scene.traverse((o) => { o.geometry?.dispose?.(); o.material?.map?.dispose?.(); o.material?.dispose?.(); });
      this._globe = null;
    }
  }

  /** Paleta de cielo y luz según la fase solar real del vuelo. La textura del
   *  terreno es auto-iluminada (emissive), así que la luz 3D es sutil (solo
   *  relieve/calidez); `glow` controla el halo del sol en el cielo. */
  _skyPalette(sun) {
    const P = {
      day: { top: 0x4a86c0, horizon: 0xcfdcea, sun: 0xffffff, sunI: 0.3, hemiI: 0.2, glow: 0.5 },
      golden: { top: 0x35508a, horizon: 0xffb072, sun: 0xffd9a0, sunI: 0.34, hemiI: 0.18, glow: 1.5 },
      blue: { top: 0x21315a, horizon: 0x6f80ab, sun: 0xbcccec, sunI: 0.18, hemiI: 0.18, glow: 0.8 },
      night: { top: 0x0b132a, horizon: 0x223052, sun: 0xb9c6e6, sunI: 0.12, hemiI: 0.16, glow: 0.35 },
    };
    return P[sun && sun.phase] || P.day;
  }

  /** Textura de disco luminoso (para el sol y la cabeza de la estela). */
  _sunSprite() {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.2, 'rgba(255,246,228,0.92)');
    g.addColorStop(0.5, 'rgba(255,220,170,0.32)'); g.addColorStop(1, 'rgba(255,200,150,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128); return c;
  }

  /** Cúpula de cielo con degradado + sol en la dirección real. */
  _buildSky(data, pal) {
    const THREE = window.THREE, span = this._span, grp = new THREE.Group(), R = span * 6;
    const sd = data.sun.dir;
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: {
        top: { value: new THREE.Color(pal.top) }, horizon: { value: new THREE.Color(pal.horizon) },
        sunDir: { value: new THREE.Vector3(sd.x, sd.y, sd.z).normalize() },
        sunCol: { value: new THREE.Color(pal.sun) }, glow: { value: pal.glow },
      },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `
        varying vec3 vP; uniform vec3 top; uniform vec3 horizon; uniform vec3 sunDir; uniform vec3 sunCol; uniform float glow;
        void main(){
          vec3 dir = normalize(vP);
          float h = clamp(dir.y, 0.0, 1.0);
          vec3 col = mix(horizon, top, pow(h, 0.55));
          float s = max(dot(dir, sunDir), 0.0);
          col += sunCol * pow(s, 4.0) * glow * 0.35; // resplandor cálido amplio y sutil
          col += sunCol * pow(s, 22.0) * glow;       // halo concentrado junto al sol
          col += sunCol * pow(s, 350.0) * 2.0;       // disco brillante del sol
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    grp.add(new THREE.Mesh(new THREE.SphereGeometry(R, 48, 24), mat));
    // bloom suave del sol con un sprite aditivo encima del disco del shader
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(this._sunSprite()), color: pal.sun, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    sp.position.set(sd.x * R * 0.9, sd.y * R * 0.9, sd.z * R * 0.9);
    const s = span * (data.sun.elevation > 4 ? 0.6 : 1.2); sp.scale.set(s, s, 1);
    if (data.sun.elevation > -4) grp.add(sp);
    return grp;
  }

  /** Estela del dron: línea aditiva de los últimos segundos que se desvanece hacia
   *  la cola (tipo cola de cometa), sin bola de luz. */
  _buildTrail() {
    const THREE = window.THREE, grp = new THREE.Group();
    this._trailMax = 56;
    const geo = new THREE.BufferGeometry();
    this._trailPos = new Float32Array(this._trailMax * 3);
    this._trailCol = new Float32Array(this._trailMax * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(this._trailPos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this._trailCol, 3));
    geo.setDrawRange(0, 0);
    this._trailLine = new THREE.Line(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    grp.add(this._trailLine);
    grp.visible = false;
    return grp;
  }

  /** Rellena la estela con la trayectoria de los últimos ~4 s: brillante junto al
   *  dron y desvaneciéndose hacia la cola (sin cabeza luminosa). */
  _updateTrail(time) {
    if (!this._trail || !this._trail.visible) return;
    const n = this._trailMax, dur = 4; let count = 0;
    for (let i = 0; i < n; i++) {
      const tt = time - dur + dur * i / (n - 1);
      if (tt < 0) continue;
      const d = this._scene.droneAt(tt);
      this._trailPos[count * 3] = d.x; this._trailPos[count * 3 + 1] = d.y; this._trailPos[count * 3 + 2] = d.z;
      const a = Math.pow(i / (n - 1), 2) * 0.85; // desvanecido cuadrático hacia la cola
      this._trailCol[count * 3] = a; this._trailCol[count * 3 + 1] = a * 0.6; this._trailCol[count * 3 + 2] = a * 0.28;
      count++;
    }
    this._trailLine.geometry.setDrawRange(0, count);
    this._trailLine.geometry.attributes.position.needsUpdate = true;
    this._trailLine.geometry.attributes.color.needsUpdate = true;
  }

  /** Malla del terreno (grid) desplazada por el DEM y texturizada con satélite. */
  _buildTerrain(data) {
    const THREE = window.THREE;
    const g = data.terrain.grid, geo = new THREE.BufferGeometry();
    const pos = new Float32Array(g * g * 3), uvs = new Float32Array(g * g * 2);
    for (let r = 0; r < g; r++)
      for (let c = 0; c < g; c++) {
        const v = data.terrain.vertex(r, c), k = r * g + c;
        pos[k * 3] = v.x; pos[k * 3 + 1] = v.y; pos[k * 3 + 2] = v.z;
        uvs[k * 2] = v.u; uvs[k * 2 + 1] = 1 - v.v; // V invertida (textura top-down)
      }
    const idx = [];
    for (let r = 0; r < g - 1; r++)
      for (let c = 0; c < g - 1; c++) {
        const a = r * g + c, b = a + 1, d = a + g, e = d + 1;
        idx.push(a, d, b, b, d, e);
      }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const tex = new THREE.CanvasTexture(data.texture);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this._renderer.capabilities.getMaxAnisotropy(); // nítida en ángulo
    tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false; // canvas NPOT
    // la imagen de satélite ya trae su luz: la usamos como emissive (auto-iluminada)
    // para que el mapa se vea siempre, aunque el sol esté bajo y a contraluz; la luz
    // 3D solo añade relieve y calidez encima.
    const mat = new THREE.MeshStandardMaterial({
      map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.72,
      roughness: 1, metalness: 0,
    });
    // agua: superficie lisa (rugosidad baja donde hay agua) para que el sol
    // genere un destello especular; sin entorno global, para no lavar el mapa.
    if (data.water) {
      const wm = new THREE.CanvasTexture(data.water);
      wm.colorSpace = THREE.NoColorSpace; wm.minFilter = THREE.LinearFilter; wm.generateMipmaps = false;
      mat.roughnessMap = wm; mat.roughness = 1; mat.metalness = 0;
    }
    if (!data.terrain.hasDEM) mat.wireframe = false;
    return new THREE.Mesh(geo, mat);
  }

  /** Faldón oscuro alrededor del terreno (de los bordes hacia abajo) para que
   *  parezca un bloque de tierra macizo y no una lámina flotando en el cielo. */
  _buildSkirt(data) {
    const THREE = window.THREE, g = data.terrain.grid;
    // recorrido del perímetro en orden
    const per = [];
    for (let c = 0; c < g; c++) per.push([0, c]);
    for (let r = 1; r < g; r++) per.push([r, g - 1]);
    for (let c = g - 2; c >= 0; c--) per.push([g - 1, c]);
    for (let r = g - 2; r >= 1; r--) per.push([r, 0]);
    const H = (data.terrain.elevMax - data.terrain.elevMin) * 1.7 || 200; // *VE aprox
    const bottom = -Math.max(160, H * 0.6);
    const n = per.length, pos = new Float32Array(n * 2 * 3), col = new Float32Array(n * 2 * 3);
    for (let i = 0; i < n; i++) {
      const v = data.terrain.vertex(per[i][0], per[i][1]);
      pos.set([v.x, v.y, v.z], i * 6); pos.set([v.x, bottom, v.z], i * 6 + 3);
      col.set([0.16, 0.13, 0.10], i * 6); col.set([0.05, 0.04, 0.03], i * 6 + 3); // arriba→abajo más oscuro
    }
    const idx = [];
    for (let i = 0; i < n - 1; i++) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, b, c, c, b, d); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setIndex(idx);
    return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  }

  /** Recorrido 3D estilo Google Earth: línea naranja sólida + cortina rayada al suelo. */
  _buildTrack(data) {
    const THREE = window.THREE;
    const T = data.track;
    const grp = new THREE.Group();
    if (T.length < 2) return grp;
    const span = Math.max(data.bounds.spanX, Math.abs(data.bounds.spanZ)) || 500;
    const radius = Math.max(3.5, Math.min(15, span * 0.0065));
    const groundOf = (p) => (p.gy != null ? p.gy : data.takeoffXZ.y) - radius;
    const TOP = [0.85, 0.42, 0.12], BOT = [0.03, 0.012, 0.0]; // degradado: brillante arriba

    // 1) CORTINA DE LUZ: aditiva, brillante junto al recorrido y desvanecida al suelo
    const cv = new THREE.BufferGeometry();
    const cn = T.length, cpos = new Float32Array(cn * 2 * 3), ccol = new Float32Array(cn * 2 * 3);
    for (let i = 0; i < cn; i++) {
      const p = T[i];
      cpos.set([p.x, p.y, p.z], i * 6); cpos.set([p.x, groundOf(p), p.z], i * 6 + 3);
      ccol.set(TOP, i * 6); ccol.set(BOT, i * 6 + 3);
    }
    const cidx = [];
    for (let i = 0; i < cn - 1; i++) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; cidx.push(a, b, c, c, b, d); }
    cv.setAttribute('position', new THREE.BufferAttribute(cpos, 3));
    cv.setAttribute('color', new THREE.BufferAttribute(ccol, 3));
    cv.setIndex(cidx);
    const curtain = new THREE.Mesh(cv, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    grp.add(curtain);

    // 2) RAYADO vertical con el mismo degradado (aditivo)
    const hpos = new Float32Array(cn * 2 * 3), hcol = new Float32Array(cn * 2 * 3);
    for (let i = 0; i < cn; i++) {
      const p = T[i];
      hpos.set([p.x, p.y, p.z], i * 6); hpos.set([p.x, groundOf(p), p.z], i * 6 + 3);
      hcol.set([0.9, 0.46, 0.14], i * 6); hcol.set([0.06, 0.024, 0.0], i * 6 + 3);
    }
    const hg = new THREE.BufferGeometry();
    hg.setAttribute('position', new THREE.BufferAttribute(hpos, 3));
    hg.setAttribute('color', new THREE.BufferAttribute(hcol, 3));
    const hatch = new THREE.LineSegments(hg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
    grp.add(hatch);

    // 3) LÍNEA superior fina que marca el recorrido (sustituye al "tubo" grueso
    //    naranja + halo, que tapaba el top de la cortina)
    const lpos = new Float32Array(cn * 3);
    for (let i = 0; i < cn; i++) { const p = T[i]; lpos.set([p.x, p.y, p.z], i * 3); }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(lpos, 3));
    const line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xffb060, transparent: true, opacity: 0.95, depthWrite: false }));
    grp.add(line);

    // 4) marcador de despegue (aro luminoso)
    const tk = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.8, radius * 1.8, radius * 0.6, 24),
      new THREE.MeshStandardMaterial({ color: 0x37cf6b, emissive: 0x1a8a44, emissiveIntensity: 0.9 }));
    tk.position.set(data.takeoffXZ.x, data.takeoffXZ.y, data.takeoffXZ.z);
    grp.add(tk);

    // datos para el revelado progresivo durante el sobrevuelo
    this._trackReveal = { curtain, hatch, line, cn, times: T.map((p) => p.t) };
    return grp;
  }

  /** Revela el recorrido hasta el instante t (efecto de "dibujado" en el sobrevuelo). */
  _revealTrack(time) {
    const R = this._trackReveal; if (!R) return;
    let k = 1; while (k < R.times.length && R.times[k] <= time) k++;
    R.curtain.geometry.setDrawRange(0, Math.max(0, k - 1) * 6);
    R.hatch.geometry.setDrawRange(0, k * 2);
    R.line.geometry.setDrawRange(0, k);
  }

  /** Muestra el recorrido completo (fuera de la reproducción). */
  _revealTrackFull() {
    const R = this._trackReveal; if (!R) return;
    for (const m of [R.curtain, R.hatch, R.line]) m.geometry.setDrawRange(0, Infinity);
  }

  /** Etiqueta flotante elegante (pastilla fina translúcida con sombra) que mira a
   *  la cámara. */
  _labelSprite(text) {
    const THREE = window.THREE, dpr = 3, fs = 23, padX = 15, padY = 7, mg = 11, dotW = 15;
    const font = `600 ${fs}px -apple-system, system-ui, sans-serif`;
    const meas = document.createElement('canvas').getContext('2d');
    meas.font = font; meas.letterSpacing = '0.2px';
    const tw = meas.measureText(text).width;
    const pw = Math.ceil(tw + padX * 2 + dotW), ph = fs + padY * 2;
    const w = pw + mg * 2, h = ph + mg * 2;
    const c = document.createElement('canvas'); c.width = w * dpr; c.height = h * dpr;
    const x = c.getContext('2d'); x.scale(dpr, dpr);
    const r = ph / 2;
    const pill = () => { x.beginPath(); x.moveTo(mg + r, mg); x.arcTo(mg + pw, mg, mg + pw, mg + ph, r); x.arcTo(mg + pw, mg + ph, mg, mg + ph, r); x.arcTo(mg, mg + ph, mg, mg, r); x.arcTo(mg, mg, mg + pw, mg, r); x.closePath(); };
    x.save(); x.shadowColor = 'rgba(0,0,0,0.5)'; x.shadowBlur = 11; x.shadowOffsetY = 3;
    pill(); x.fillStyle = 'rgba(11,15,22,0.82)'; x.fill(); x.restore();
    pill(); x.lineWidth = 1; x.strokeStyle = 'rgba(255,255,255,0.13)'; x.stroke();
    x.beginPath(); x.arc(mg + padX - 1, mg + ph / 2, 3.4, 0, 7); x.fillStyle = '#ff8a3d'; x.fill();
    x.font = font; x.letterSpacing = '0.2px'; x.fillStyle = 'rgba(255,255,255,0.94)'; x.textBaseline = 'middle';
    x.fillText(text, mg + padX + dotW - 3, mg + ph / 2 + 1);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter;
    // sizeAttenuation false → tamaño constante en pantalla (no gigante al acercarse)
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, sizeAttenuation: false }));
    sp.userData.ar = w / h; sp.renderOrder = 10;
    return sp;
  }

  /** Marcador fino (aro delgado con centro) de tamaño constante en pantalla. */
  _dotSprite() {
    const THREE = window.THREE, c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d');
    x.strokeStyle = '#ff7d1a'; x.lineWidth = 4; x.beginPath(); x.arc(32, 32, 20, 0, 7); x.stroke();
    x.fillStyle = '#ff7d1a'; x.beginPath(); x.arc(32, 32, 6, 0, 7); x.fill();
    const tex = new THREE.CanvasTexture(c); tex.minFilter = THREE.LinearFilter;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, sizeAttenuation: false }));
    sp.renderOrder = 8; return sp;
  }

  /** Rótulos 3D en los hitos del vuelo (despegue, punto más alto, más rápido…). */
  _buildLabels(data) {
    const THREE = window.THREE, grp = new THREE.Group(), s = this._span;
    this._labelItems = [];
    this._kpMarks = []; // posición/instante de cada hito (para saltar la cámara al hacer click)
    if (!data.keypoints) return grp;
    for (const kp of data.keypoints) {
      const up = s * 0.03; // línea guía más corta: los rótulos no flotan tan alto
      const sp = this._labelSprite(t('kp.' + kp.key));
      sp.position.set(kp.x, kp.y + up, kp.z);
      const hh = 0.05; sp.scale.set(hh * sp.userData.ar, hh, 1); // tamaño constante en pantalla
      grp.add(sp);
      const lg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(kp.x, kp.y, kp.z), new THREE.Vector3(kp.x, kp.y + up, kp.z)]);
      const line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xff7d1a, transparent: true, opacity: 0.45, depthTest: false }));
      grp.add(line);
      const dot = this._dotSprite(); // marcador fino de tamaño constante
      dot.position.set(kp.x, kp.y, kp.z); dot.scale.set(0.016, 0.016, 1); grp.add(dot);
      this._labelItems.push({ sprite: sp, line, prio: 0 }); // los hitos ganan al horizonte
      this._kpMarks.push({ x: kp.x, y: kp.y, z: kp.z, t: kp.t, key: kp.key, sprite: sp });
    }
    return grp;
  }

  /** Pastilla del horizonte (cima, pueblo o masa de agua de OSM): más tenue y
   *  fría que la de los hitos, con un icono según el tipo. */
  _horizonSprite(text, kind) {
    const THREE = window.THREE, dpr = 3, fs = 19, padX = 13, padY = 6, mg = 10, icoW = 15;
    const accent = kind === 'peak' ? '#8fe0bd' : kind === 'water' ? '#69c8f5' : '#98c2ff';
    const font = `500 ${fs}px -apple-system, system-ui, sans-serif`;
    const meas = document.createElement('canvas').getContext('2d');
    meas.font = font; meas.letterSpacing = '0.2px';
    const tw = meas.measureText(text).width;
    const pw = Math.ceil(tw + padX * 2 + icoW), ph = fs + padY * 2;
    const w = pw + mg * 2, h = ph + mg * 2;
    const c = document.createElement('canvas'); c.width = w * dpr; c.height = h * dpr;
    const x = c.getContext('2d'); x.scale(dpr, dpr);
    const r = ph / 2;
    const pill = () => { x.beginPath(); x.moveTo(mg + r, mg); x.arcTo(mg + pw, mg, mg + pw, mg + ph, r); x.arcTo(mg + pw, mg + ph, mg, mg + ph, r); x.arcTo(mg, mg + ph, mg, mg, r); x.arcTo(mg, mg, mg + pw, mg, r); x.closePath(); };
    x.save(); x.shadowColor = 'rgba(0,0,0,0.45)'; x.shadowBlur = 9; x.shadowOffsetY = 2;
    pill(); x.fillStyle = 'rgba(10,14,20,0.7)'; x.fill(); x.restore();
    pill(); x.lineWidth = 1; x.strokeStyle = 'rgba(255,255,255,0.1)'; x.stroke();
    // icono: triángulo (cima), onda (agua) o aro (pueblo)
    const cx = mg + padX - 2, cy = mg + ph / 2;
    x.fillStyle = accent; x.strokeStyle = accent;
    if (kind === 'peak') { x.beginPath(); x.moveTo(cx, cy - 4.5); x.lineTo(cx + 4.5, cy + 4); x.lineTo(cx - 4.5, cy + 4); x.closePath(); x.fill(); }
    else if (kind === 'water') {
      x.lineWidth = 1.6; x.lineCap = 'round';
      for (const dy of [-3, 1]) { x.beginPath(); x.moveTo(cx - 4.5, cy + dy); x.quadraticCurveTo(cx - 1.5, cy + dy - 2.4, cx, cy + dy); x.quadraticCurveTo(cx + 1.5, cy + dy + 2.4, cx + 4.5, cy + dy); x.stroke(); }
    } else { x.lineWidth = 1.8; x.beginPath(); x.arc(cx, cy, 3.4, 0, 7); x.stroke(); x.beginPath(); x.arc(cx, cy, 1.1, 0, 7); x.fill(); }
    x.font = font; x.letterSpacing = '0.2px'; x.fillStyle = 'rgba(255,255,255,0.86)'; x.textBaseline = 'middle';
    x.fillText(text, mg + padX + icoW - 4, mg + ph / 2 + 1);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter;
    // fog:false → legible aunque el POI esté lejos, en la bruma del horizonte
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.94, depthWrite: false, depthTest: false, fog: false, sizeAttenuation: false }));
    sp.userData.ar = w / h; sp.renderOrder = 9;
    return sp;
  }

  /** Rótulos del horizonte (cimas con su cota, pueblos y masas de agua del
   *  entorno). Flotan en la dirección real del lugar, sin línea guía (muchos caen
   *  lejos del terreno). Se construyen de forma perezosa cuando Overpass responde. */
  _buildHorizonLabels(pois) {
    if (!pois || !pois.length || !this._localScene) return;
    const THREE = window.THREE, up = this._span * 0.02;
    // dos grupos para poder mostrar/ocultar el agua aparte de pueblos/cimas
    const placesG = new THREE.Group(), waterG = new THREE.Group();
    for (const p of pois) {
      const text = p.kind === 'peak' && p.ele ? `${p.name} · ${Math.round(p.ele)} m` : p.name;
      const sp = this._horizonSprite(text, p.kind);
      sp.position.set(p.x, p.y + up, p.z);
      const hh = 0.04; sp.scale.set(hh * sp.userData.ar, hh, 1);
      (p.kind === 'water' ? waterG : placesG).add(sp);
      this._labelItems.push({ sprite: sp, prio: 1, cat: p.kind === 'water' ? 'water' : 'places' });
    }
    this._localScene.add(placesG); this._localScene.add(waterG);
    this._horizonPlacesGroup = placesG; this._horizonWaterGroup = waterG;
    this._applyShow(); // respeta el estado actual del panel de ajustes
  }

  /** Oculta los rótulos que se solapan en pantalla (prioriza los cercanos a la cámara). */
  _declutterLabels() {
    const items = this._labelItems; if (!items || !items.length) return;
    const cam = this._cam, thx = 0.17, thy = 0.075;
    const arr = items
      .filter((it) => it.sprite.parent && it.sprite.parent.visible) // ignora capas ocultas por el panel
      .map((it) => {
        const p = it.sprite.position.clone(), d = p.distanceTo(cam.position);
        const ndc = p.project(cam);
        return { it, x: ndc.x, y: ndc.y, front: ndc.z < 1, d, prio: it.prio || 0 };
      }).sort((a, b) => (a.prio - b.prio) || (a.d - b.d)); // hitos primero; luego más cercano
    const shown = [];
    for (const a of arr) {
      let hide = !a.front;
      if (!hide) for (const sn of shown) if (Math.abs(a.x - sn.x) < thx && Math.abs(a.y - sn.y) < thy) { hide = true; break; }
      a.it.sprite.visible = !hide; if (a.it.line) a.it.line.visible = !hide;
      if (!hide) shown.push(a);
    }
  }

  /** Aplica el estado del panel de ajustes: muestra/oculta cada capa del render. */
  _applyShow() {
    const s = this._show;
    if (this._trackGroup) this._trackGroup.visible = s.track;
    if (this._kpGroup) this._kpGroup.visible = s.kp;
    if (this._horizonPlacesGroup) this._horizonPlacesGroup.visible = s.places;
    if (this._horizonWaterGroup) this._horizonWaterGroup.visible = s.water;
    const hud = this.$('#hud'); if (hud) hud.hidden = !(s.hud && this._playing);
  }

  /** Sombra proyectada con la FORMA real del dron (silueta cenital del quad: cuerpo
   *  central + 4 rótores) en vez de una mancha. Dos grupos anidados para poder estirar
   *  la sombra en la dirección de la luz (efecto rasante al atardecer) a la vez que la
   *  silueta gira con el rumbo del dron:
   *   - `g` (externo): posición, orientación a la luz y escala/estirado.
   *   - `inner`: gira la silueta para compensar y dejarla al rumbo real.
   *  Se difumina/agranda con la altura (ver `_updateShadow`). */
  _buildShadow() {
    const THREE = window.THREE;
    const tex = new THREE.CanvasTexture(this._shadowSilhouette());
    tex.anisotropy = 4;
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.5, depthWrite: false,
        polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); // se apoya sobre el terreno sin pelearse en z
    plane.rotation.x = -Math.PI / 2; // tumbado sobre el terreno
    plane.renderOrder = 2;
    this._shadowMat = plane.material;
    const inner = new THREE.Group(); inner.add(plane); this._shadowInner = inner;
    const g = new THREE.Group(); g.add(inner);
    return g;
  }

  /** Dibuja la silueta cenital del quad en un canvas: cuerpo alargado, 4 brazos y 4
   *  rótores llenos, con los bordes difuminados para que lea como sombra. El frente
   *  del dron apunta hacia -Y del canvas (coincide con el -Z del modelo). */
  _shadowSilhouette() {
    const N = 256, c = document.createElement('canvas'); c.width = c.height = N;
    const x = c.getContext('2d'), cx = N / 2, cy = N / 2;
    x.filter = 'blur(5px)'; // borde suave de sombra
    x.fillStyle = '#000'; x.strokeStyle = '#000'; x.lineCap = 'round';
    const ducts = [[-50, -60], [50, -60], [-50, 60], [50, 60]]; // rótores en X
    // brazos (trazo grueso del centro a cada rótor)
    x.lineWidth = 22;
    for (const [dx, dy] of ducts) { x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + dx, cy + dy); x.stroke(); }
    // cuerpo central alargado (frente-atrás)
    x.beginPath(); x.roundRect(cx - 22, cy - 74, 44, 148, 20); x.fill();
    // rótores llenos
    for (const [dx, dy] of ducts) { x.beginPath(); x.arc(cx + dx, cy + dy, 46, 0, 7); x.fill(); }
    return c;
  }

  /** Cambia el tamaño del marcador del dron (y de su sombra) en caliente. `f` es el
   *  factor: 1 grande, 0.75 intermedio, 0.5 mitad. Persiste para futuras reconstrucciones. */
  _setDroneScale(f) {
    this._droneScale = f;
    if (this._drone) {
      this._drone.scale.setScalar(f);
      this._droneS = (this._droneBaseS || 12) * f;
      // refresca la sombra ya si no estamos en un modo que la actualiza cada frame
      const flying = (this._pilot && this._pilot.on) || (this._free && this._free.on);
      if (this._scene && !flying) this._placeDrone(this._time || 0);
    }
  }

  /** Orienta, desplaza, escala y atenúa la sombra del dron para un instante dado.
   *  @param {number} px @param {number} pz posición horizontal del dron
   *  @param {number} dy altura del dron  @param {number|null} gy cota del suelo debajo
   *  @param {number} yaw rumbo del cuerpo (mismo signo que `_droneBody.rotation.y`) */
  _updateShadow(px, pz, dy, gy, yaw) {
    const g = this._shadow; if (!g || gy == null) return;
    const agl = Math.max(0, dy - gy);
    const sz = (this._droneS || 12) * 2.4 + agl * 0.32; // crece con la altura
    // Desplaza la sombra hacia donde cae la luz según la hora real del vuelo (sun.dir):
    // la sombra = el dron proyectado por el rayo del sol sobre el suelo. Se muestrea la
    // cota del terreno en el punto desplazado (si no, quedaría enterrada bajo el relieve)
    // y se limita el desplazamiento para que no se despegue con el dron muy alto o el sol
    // muy bajo (ahí, físicamente, la sombra se iría lejísimos y parecería un duplicado).
    let sx = px, sz2 = pz, sgy = gy, lightAngle = 0, stretch = 1; const s = this._sunDir;
    if (s && s.y > 0.05) {
      const dirLen = Math.hypot(s.x, s.z) || 1;
      const dx = -s.x / dirLen, dz = -s.z / dirLen;      // hacia donde se proyecta la sombra
      const flat = agl / Math.max(s.y, 0.12);            // desplazamiento físico estimado
      const t = Math.min(flat, (this._droneS || 12) * 8); // tope: no se despega del dron
      sx = px + t * dx; sz2 = pz + t * dz;
      const gyOff = this._scene && this._scene.groundAtXZ ? this._scene.groundAtXZ(sx, sz2) : gy;
      if (Number.isFinite(gyOff)) sgy = gyOff;
      lightAngle = Math.atan2(dx, dz);                   // el +Z local del grupo mira a la luz
      stretch = Math.max(1, Math.min(2, 1 / s.y));       // sombra más larga cuanto más bajo el sol
    }
    g.position.set(sx, sgy + Math.max(0.8, this._span * 0.0015), sz2);
    g.rotation.y = lightAngle;                            // orienta el estirado a la dirección de la luz
    g.scale.set(sz, sz, sz * stretch);                   // estira a lo largo de la luz (Z local)
    if (this._shadowInner) this._shadowInner.rotation.y = yaw - lightAngle; // deja la silueta al rumbo real
    this._shadowMat.opacity = Math.max(0.14, 0.5 - agl * 0.0006); // se difumina con la altura
  }

  /** Dron modelado como el DJI Neo 2: cuerpo gris, 4 conductos con hélice,
   *  cámara/gimbal frontal y antenas en V. Materiales con emissive para que se
   *  vea (no una silueta negra) aunque la luz de la escena sea baja. */
  _buildDrone(data) {
    const THREE = window.THREE;
    const span = Math.max(data.bounds.spanX, Math.abs(data.bounds.spanZ)) || 500;
    const s = Math.max(9, span * 0.012); // marcador exagerado, pero sin pasarse
    this._droneBaseS = s; // tamaño base; el visible sale de multiplicar por _droneScale
    const grp = new THREE.Group();
    const body = new THREE.Group(); // gira según el rumbo (el frente mira a -Z)
    body.rotation.order = 'YXZ'; // rumbo → cabeceo → alabeo (como un avión)

    const matBody = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: 0.55, roughness: 0.42, emissive: 0x2f333a, emissiveIntensity: 0.6 });
    const matDark = new THREE.MeshStandardMaterial({ color: 0x3a3e45, metalness: 0.5, roughness: 0.55, emissive: 0x181a1e, emissiveIntensity: 0.55 });
    const matGuard = new THREE.MeshStandardMaterial({ color: 0x43474e, metalness: 0.45, roughness: 0.6, emissive: 0x1a1c20, emissiveIntensity: 0.5 });
    const matProp = new THREE.MeshStandardMaterial({ color: 0xcfd5dd, metalness: 0.2, roughness: 0.4, transparent: true, opacity: 0.42, side: THREE.DoubleSide });
    const matLens = new THREE.MeshStandardMaterial({ color: 0x0a0c12, metalness: 0.4, roughness: 0.18, emissive: 0x14335e, emissiveIntensity: 0.7 });

    // fuselaje central alargado y redondeado (frente-atrás en Z)
    const hull = new THREE.Mesh(new THREE.BoxGeometry(s * 0.46, s * 0.24, s * 0.86), matBody);
    body.add(hull);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(s * 0.24, 20, 14), matBody);
    nose.scale.set(1, 1, 1.5); nose.position.z = -s * 0.32; body.add(nose);
    const topDome = new THREE.Mesh(new THREE.SphereGeometry(s * 0.24, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), matBody);
    topDome.scale.set(1, 0.55, 1.6); topDome.position.y = s * 0.08; body.add(topDome);
    // cámara/gimbal frontal con lente
    const gim = new THREE.Mesh(new THREE.SphereGeometry(s * 0.17, 18, 16), matDark);
    gim.position.set(0, -s * 0.05, -s * 0.44); body.add(gim);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.11, s * 0.12, s * 0.08, 22), matLens);
    lens.rotation.x = Math.PI / 2; lens.position.set(0, -s * 0.05, -s * 0.53); body.add(lens);

    // 4 conductos (prop guards) circulares con su hélice dentro
    this._rotors = [];
    const Rg = s * 0.46, dx = s * 0.6, dz = s * 0.5;
    for (const [ux, uz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const cx = ux * dx, cz = uz * dz, cy = s * 0.02;
      // strut del cuerpo al conducto
      const strut = new THREE.Mesh(new THREE.BoxGeometry(s * 0.14, s * 0.1, s * 0.14), matDark);
      strut.position.set(cx * 0.5, 0, cz * 0.5); body.add(strut);
      // anillo del conducto (toro plano, hueco hacia arriba)
      const ring = new THREE.Mesh(new THREE.TorusGeometry(Rg, s * 0.055, 12, 34), matGuard);
      ring.rotation.x = Math.PI / 2; ring.position.set(cx, cy, cz); body.add(ring);
      // borde inferior del conducto (segundo aro más fino)
      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(Rg, s * 0.03, 10, 34), matGuard);
      ring2.rotation.x = Math.PI / 2; ring2.position.set(cx, cy - s * 0.11, cz); body.add(ring2);
      // dos radios en cruz (rejilla del guard)
      for (const ax of [[1, 0], [0, 1]]) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(ax[0] ? Rg * 2 : s * 0.03, s * 0.02, ax[1] ? Rg * 2 : s * 0.03), matGuard);
        spoke.position.set(cx, cy, cz); body.add(spoke);
      }
      // motor central + hélice de 3 palas (gira)
      const motor = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.08, s * 0.09, s * 0.12, 14), matDark);
      motor.position.set(cx, cy + s * 0.05, cz); body.add(motor);
      const rotor = new THREE.Group();
      for (const r of [0, 2 * Math.PI / 3, 4 * Math.PI / 3]) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(Rg * 1.7, s * 0.014, s * 0.13), matProp);
        blade.rotation.y = r; rotor.add(blade);
      }
      rotor.position.set(cx, cy + s * 0.1, cz); body.add(rotor); this._rotors.push(rotor);
    }

    // 2 antenas traseras en V
    for (const ux of [-1, 1]) {
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.018, s * 0.024, s * 0.6, 6), matDark);
      ant.position.set(ux * s * 0.13, s * 0.3, s * 0.4);
      ant.rotation.z = ux * 0.32; ant.rotation.x = -0.28; body.add(ant);
    }

    // luces de navegación: verdes delante, rojas detrás (parpadean en el bucle)
    this._leds = [];
    const ledGeo = new THREE.SphereGeometry(s * 0.05, 8, 8);
    for (const [lx, lz, col] of [[-0.5, -0.5, 0x39ff88], [0.5, -0.5, 0x39ff88], [-0.5, 0.5, 0xff3355], [0.5, 0.5, 0xff3355]]) {
      const mat = new THREE.MeshBasicMaterial({ color: col });
      const led = new THREE.Mesh(ledGeo, mat);
      led.position.set(lx * dx, s * 0.12, lz * dz); body.add(led);
      this._leds.push({ mesh: led, color: new THREE.Color(col), rear: lz > 0 });
    }

    grp.add(body); this._droneBody = body;

    // cono de visión: parte del dron y apunta según rumbo + pitch del gimbal
    const len = s * 3.2, rad = len * Math.tan(28 * Math.PI / 180);
    const coneGeo = new THREE.ConeGeometry(rad, len, 24, 1, true);
    coneGeo.translate(0, -len / 2, 0); // vértice en el origen, se abre hacia -Y
    const cone = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({ color: 0x8ec5ff, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
    this._cone = cone; grp.add(cone);
    // aplica el tamaño elegido (escala todo el marcador; la sombra usa _droneS)
    grp.scale.setScalar(this._droneScale || 1);
    this._droneS = s * (this._droneScale || 1);
    return grp;
  }

  /** Coloca el dron, lo orienta por rumbo y apunta su cono en el instante t. */
  _placeDrone(time) {
    const THREE = window.THREE, d = this._scene.droneAt(time);
    this._drone.position.set(d.x, d.y, d.z);
    // en hover el rumbo es NaN: mantenemos el último para que no gire de golpe
    const h = isNaN(d.heading) ? (this._bodyHeading ?? 0) : d.heading;
    this._bodyHeading = h;
    if (this._droneBody) {
      this._droneBody.rotation.y = -h; // el frente (-Z) mira al rumbo
      // alabeo: se inclina hacia el interior de la curva según la tasa de giro
      const h1 = this._scene.droneAt(time - 0.6).heading, h2 = this._scene.droneAt(time + 0.6).heading;
      let roll = 0;
      if (!isNaN(h1) && !isNaN(h2)) {
        const dh = ((h2 - h1 + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
        roll = Math.max(-0.5, Math.min(0.5, dh * 1.6));
      }
      this._roll = (this._roll ?? 0) + (roll - (this._roll ?? 0)) * 0.15; // suavizado
      this._droneBody.rotation.z = this._roll;
      this._droneBody.rotation.x = Math.max(-0.25, Math.min(0.25, -(d.hs || 0) * 0.012)); // morro abajo al avanzar
    }
    // sombra con la forma del dron, orientada al rumbo y proyectada por el sol
    this._updateShadow(d.x, d.z, d.y, d.gy != null ? d.gy : this._scene.takeoffXZ.y, -h);
    // dirección de la cámara: horizontal por rumbo, inclinada por el pitch del gimbal
    const el = d.pitch; // rad (negativo = mirando abajo)
    const dir = new THREE.Vector3(Math.cos(el) * Math.sin(h), Math.sin(el), -Math.cos(el) * Math.cos(h));
    this._cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.normalize());
    // HUD de telemetría
    const hudAlt = this.$('#hudAlt');
    if (hudAlt) {
      hudAlt.textContent = Math.round(d.rel || 0);
      this.$('#hudSpd').textContent = Math.round((d.hs || 0) * 3.6);
      const vs = d.vs || 0;
      this.$('#hudVs').textContent = (vs >= 0 ? '+' : '') + vs.toFixed(1);
      // alejamiento: distancia horizontal (m) al punto de despegue
      const tk = this._scene.takeoffXZ;
      this.$('#hudFar').textContent = Math.round(Math.hypot(d.x - tk.x, d.z - tk.z));
    }
  }

  /* ---------- órbita y bucle ---------- */

  _applyOrbit() {
    const o = this._orbit, tp = this._target;
    this._cam.position.set(
      tp.x + o.r * Math.sin(o.phi) * Math.cos(o.theta),
      tp.y + o.r * Math.cos(o.phi),
      tp.z + o.r * Math.sin(o.phi) * Math.sin(o.theta),
    );
    this._cam.lookAt(tp);
  }

  /** Punto del mundo bajo el cursor: lanza un rayo desde la cámara al terreno; si
   *  no lo toca (cielo/horizonte), cae a un plano horizontal a la altura del
   *  pivote. Devuelve un THREE.Vector3 o null. */
  _pointUnderCursor(e) {
    const THREE = window.THREE, canvas = this.$('#cv'); if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    const ray = (this._ray || (this._ray = new THREE.Raycaster()));
    ray.setFromCamera(ndc, this._cam);
    if (this._terrainMesh) {
      const hit = ray.intersectObject(this._terrainMesh, false)[0];
      if (hit) return hit.point;
    }
    // sin terreno bajo el cursor: intersecta el plano horizontal del pivote
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -this._target.y);
    const p = new THREE.Vector3();
    return ray.ray.intersectPlane(plane, p) ? p : null;
  }

  /** Click limpio: si cae cerca de un hito (su punto o su rótulo), lleva la cámara
   *  a ese hito. Umbral en píxeles, probando el marcador y la píldora. */
  _clickKeypoint(e) {
    const marks = this._kpMarks; if (!marks || !marks.length || !this._cam || this._three !== this._localScene) return;
    const canvas = this.$('#cv'), rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    const v = new window.THREE.Vector3();
    let best = null, bestD = 42; // umbral (px)
    for (const m of marks) {
      for (const q of [[m.x, m.y, m.z], [m.sprite.position.x, m.sprite.position.y, m.sprite.position.z]]) {
        v.set(q[0], q[1], q[2]).project(this._cam);
        if (v.z > 1) continue; // detrás de la cámara
        const sx = (v.x * 0.5 + 0.5) * rect.width, sy = (-v.y * 0.5 + 0.5) * rect.height;
        const d = Math.hypot(sx - px, sy - py);
        if (d < bestD) { bestD = d; best = m; }
      }
    }
    if (best) this._focusKeypoint(best);
  }

  /** Coloca el dron en el instante del hito y acerca la cámara a él con una
   *  transición suave (tween que avanza el bucle). */
  _focusKeypoint(mark) {
    if (this._playing) this._stopFlyover();
    this._time = mark.t; this._placeDrone(mark.t); this._updateTime(mark.t); this._revealTrackFull(); this._look = null;
    const o = this._orbit;
    this._camTween = {
      t0: performance.now(), dur: 850,
      fromT: this._target.clone(), toT: new window.THREE.Vector3(mark.x, mark.y, mark.z),
      fromR: o.r, toR: Math.max(o.min, this._span * 0.22),
      fromPhi: o.phi, toPhi: Math.min(1.15, Math.max(0.7, o.phi)),
    };
  }

  /** Avanza el tween de cámara hacia el hito (ease-in-out). */
  _stepCamTween() {
    const T = this._camTween, p = Math.min(1, (performance.now() - T.t0) / T.dur), e = p * p * (3 - 2 * p);
    this._target.lerpVectors(T.fromT, T.toT, e);
    const o = this._orbit;
    o.r = T.fromR + (T.toR - T.fromR) * e;
    o.phi = T.fromPhi + (T.toPhi - T.fromPhi) * e;
    this._applyOrbit();
    if (p >= 1) this._camTween = null;
  }

  /* ---------- modo vuelo libre (WASD + ratón) ---------- */

  /** Activa/desactiva el vuelo libre. Al entrar toma la posición y orientación
   *  actuales de la cámara; al salir reconstruye la órbita para no dar un salto. */
  _toggleFree() {
    const on = !(this._free && this._free.on);
    const THREE = window.THREE, dir = new THREE.Vector3();
    this._cam.getWorldDirection(dir);
    if (on) {
      this._stopFlyover(); this._camTween = null;
      if (this._cineMode) { this._cineMode = false; this.$('#cine').classList.remove('on'); }
      const yaw = Math.atan2(dir.x, -dir.z), pitch = Math.asin(Math.max(-1, Math.min(1, dir.y)));
      this._free = { on: true, pos: this._cam.position.clone(), yaw, pitch, keys: new Set(), speedMul: 1, last: performance.now() };
    } else {
      // reconstruye la órbita mirando a un punto por delante (sin saltos)
      const tp = this._cam.position.clone().addScaledVector(dir, this._span * 0.4);
      this._target.copy(tp);
      const off = this._cam.position.clone().sub(tp), r = off.length() || 1;
      this._orbit.r = Math.max(this._orbit.min, Math.min(this._orbit.max, r));
      this._orbit.phi = Math.acos(Math.max(-1, Math.min(1, off.y / r)));
      this._orbit.theta = Math.atan2(off.z, off.x);
      this._free = { on: false }; this._look = null; this._applyOrbit();
    }
    this.$('#free').classList.toggle('on', on);
    this._setHint(on ? 'v3d.free.hint' : null);
    this._updateFlyUi();
  }

  /** Muestra/oculta el cartel de ayuda (controles) con el texto de la clave i18n. */
  _setHint(key) { const h = this.$('#freeHint'); if (!h) return; if (key) { h.textContent = t(key); h.hidden = false; } else h.hidden = true; }

  /** Altura del terreno bajo (x,z): rayo vertical hacia abajo sobre la malla. */
  _groundYAt(x, z) {
    if (!this._terrainMesh) return null;
    const THREE = window.THREE, ray = (this._ray || (this._ray = new THREE.Raycaster()));
    ray.set(new THREE.Vector3(x, this._span * 2, z), new THREE.Vector3(0, -1, 0));
    const hit = ray.intersectObject(this._terrainMesh, false)[0];
    return hit ? hit.point.y : null;
  }

  /** Activa/desactiva el pilotaje del dron. Arranca desde la posición actual del
   *  dron; al salir reconstruye la órbita centrada en él. */
  _togglePilot() {
    const on = !(this._pilot && this._pilot.on);
    if (on) {
      this._stopFlyover(); this._camTween = null;
      if (this._free && this._free.on) { this._free = { on: false }; this.$('#free').classList.remove('on'); }
      if (this._cineMode) { this._cineMode = false; this.$('#cine').classList.remove('on'); }
      const d = this._scene.droneAt(this._time || 0);
      this._pilot = { on: true, pos: new window.THREE.Vector3(d.x, d.y, d.z), yaw: this._bodyHeading ?? 0, camYaw: this._bodyHeading ?? 0, roll: 0, keys: new Set(), camPitch: 0.5, zoom: 1, last: performance.now() };
      this._revealTrackFull(); if (this._trail) this._trail.visible = false;
    } else {
      const dp = this._drone ? this._drone.position.clone() : this._target.clone();
      this._target.copy(dp);
      const off = this._cam.position.clone().sub(dp), r = off.length() || 1;
      this._orbit.r = Math.max(this._orbit.min, Math.min(this._orbit.max, r));
      this._orbit.phi = Math.acos(Math.max(-1, Math.min(1, off.y / r)));
      this._orbit.theta = Math.atan2(off.z, off.x);
      this._pilot = { on: false }; this._look = null; this._applyOrbit();
    }
    this.$('#pilot').classList.toggle('on', on);
    this._setHint(on ? 'v3d.pilot.hint' : null);
    this._updateFlyUi();
  }

  /** Un frame de pilotaje: mueve el dron con las teclas y encadena la cámara detrás. */
  _stepPilot() {
    const P = this._pilot; if (!P || !P.on || this._three !== this._localScene || !this._drone) return;
    const THREE = window.THREE, now = performance.now(), dt = Math.min(0.05, (now - P.last) / 1000); P.last = now;
    const k = P.keys, boost = k.has('shift') ? 2.6 : 1, sm = Math.min(1, dt * 6);
    // la cámara ORBITA el dron: ratón (pointermove) y ←/→ mueven camYaw, ↑/↓ la altura
    if (k.has('arrowleft')) P.camYaw -= 1.3 * dt;
    if (k.has('arrowright')) P.camYaw += 1.3 * dt;
    if (k.has('arrowup')) P.camPitch = Math.min(1.35, P.camPitch + 1.4 * dt);
    if (k.has('arrowdown')) P.camPitch = Math.max(0.12, P.camPitch - 1.4 * dt);
    // movimiento RELATIVO A LA CÁMARA: W hacia donde mira, A/D lateral, E/Q vertical
    const camF = new THREE.Vector3(Math.sin(P.camYaw), 0, -Math.cos(P.camYaw));
    const camR = new THREE.Vector3(Math.cos(P.camYaw), 0, Math.sin(P.camYaw));
    const move = new THREE.Vector3();
    if (k.has('w')) move.add(camF);
    if (k.has('s')) move.sub(camF);
    if (k.has('d')) move.add(camR);
    if (k.has('a')) move.sub(camR);
    if (k.has('e') || k.has(' ')) move.y += 1;
    if (k.has('q') || k.has('c')) move.y -= 1;
    const spd = this._span * 0.5 * boost * this._flyMul();
    const desired = move.lengthSq() > 0 ? move.clone().normalize().multiplyScalar(spd) : new THREE.Vector3();
    if (!P.vel) P.vel = new THREE.Vector3();
    P.vel.lerp(desired, sm);
    P.pos.addScaledVector(P.vel, dt);
    // acotar al terreno (no alejarse volando fuera del mapa)
    const b = this._scene.bounds;
    const xlo = Math.min(b.x0, b.x1), xhi = Math.max(b.x0, b.x1), zlo = Math.min(b.z0, b.z1), zhi = Math.max(b.z0, b.z1);
    if (P.pos.x < xlo) { P.pos.x = xlo; if (P.vel.x < 0) P.vel.x = 0; } else if (P.pos.x > xhi) { P.pos.x = xhi; if (P.vel.x > 0) P.vel.x = 0; }
    if (P.pos.z < zlo) { P.pos.z = zlo; if (P.vel.z < 0) P.vel.z = 0; } else if (P.pos.z > zhi) { P.pos.z = zhi; if (P.vel.z > 0) P.vel.z = 0; }
    // no bajar del suelo
    const gy = this._groundYAt(P.pos.x, P.pos.z);
    if (gy != null && P.pos.y < gy + (this._droneS || 10) * 1.2) { P.pos.y = gy + (this._droneS || 10) * 1.2; if (P.vel.y < 0) P.vel.y = 0; }
    // el dron ENCARA SIEMPRE hacia el frente de la cámara (camYaw): al orbitar con
    // las flechas/ratón ya se orienta (antes de avanzar), y en lateral (A/D) no
    // gira porque el movimiento lateral no cambia camYaw.
    let d = P.camYaw - P.yaw; d = ((d + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    const turnStep = d * Math.min(1, dt * 5);
    P.yaw += turnStep;
    P.roll += ((Math.max(-0.4, Math.min(0.4, turnStep / Math.max(dt, 0.001) * 0.18)) - P.roll) * 0.1);
    const fwd = new THREE.Vector3(Math.sin(P.yaw), 0, -Math.cos(P.yaw));
    this._drone.position.copy(P.pos);
    if (this._droneBody) {
      const fwdSpeed = P.vel.x * fwd.x + P.vel.z * fwd.z;
      P.pitch2 = (P.pitch2 || 0) + (Math.max(-0.16, Math.min(0.16, -fwdSpeed / (this._span * 0.6))) - (P.pitch2 || 0)) * 0.1;
      this._droneBody.rotation.y = -P.yaw; this._droneBody.rotation.z = P.roll; this._droneBody.rotation.x = P.pitch2; // -yaw: el frente (-Z) mira al rumbo (igual que _placeDrone)
    }
    // cono de visión: apunta al frente del dron (rumbo), algo hacia abajo
    if (this._cone) {
      const el = -0.5, dir = new THREE.Vector3(Math.cos(el) * Math.sin(P.yaw), Math.sin(el), -Math.cos(el) * Math.cos(P.yaw));
      this._cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.normalize());
    }
    // sombra con la forma del dron, orientada al rumbo y proyectada por el sol
    this._updateShadow(P.pos.x, P.pos.z, P.pos.y, gy, -P.yaw);
    // cámara: orbita según camYaw/camPitch y mira AL DRON (queda centrado en pantalla)
    const r = this._span * 0.06 * P.zoom;
    const want = P.pos.clone()
      .addScaledVector(camF, -r * Math.cos(P.camPitch))
      .addScaledVector(new THREE.Vector3(0, 1, 0), r * Math.sin(P.camPitch));
    this._cam.position.lerp(want, 0.2);
    this._cam.lookAt(P.pos.x, P.pos.y, P.pos.z);
  }

  /** Un frame de vuelo libre: mueve la cámara con WASD (con inercia) y la orienta
   *  con el ratón o las flechas (para poder usarlo con trackpad, sin arrastrar). */
  _stepFree() {
    const F = this._free; if (!F || !F.on || this._three !== this._localScene) return;
    const THREE = window.THREE, now = performance.now(), dt = Math.min(0.05, (now - F.last) / 1000); F.last = now;
    const k = F.keys, lr = 1.3 * dt; // flechas: mirar (rad/frame)
    if (k.has('arrowleft')) F.yaw -= lr;
    if (k.has('arrowright')) F.yaw += lr;
    if (k.has('arrowup')) F.pitch = Math.min(1.45, F.pitch + lr);
    if (k.has('arrowdown')) F.pitch = Math.max(-1.45, F.pitch - lr);
    const cp = Math.cos(F.pitch), sp = Math.sin(F.pitch);
    const dir = new THREE.Vector3(cp * Math.sin(F.yaw), sp, -cp * Math.cos(F.yaw));
    const right = new THREE.Vector3(Math.cos(F.yaw), 0, Math.sin(F.yaw));
    const move = new THREE.Vector3();
    if (k.has('w')) move.add(dir);
    if (k.has('s')) move.sub(dir);
    if (k.has('d')) move.add(right);
    if (k.has('a')) move.sub(right);
    if (k.has('e') || k.has(' ')) move.y += 1;
    if (k.has('q') || k.has('c')) move.y -= 1;
    // velocidad con inercia (arranque/frenado suaves)
    const spd = this._span * 0.5 * (F.speedMul || 1) * (k.has('shift') ? 2.6 : 1) * this._flyMul();
    const desired = move.lengthSq() > 0 ? move.normalize().multiplyScalar(spd) : new THREE.Vector3();
    if (!F.vel) F.vel = new THREE.Vector3();
    F.vel.lerp(desired, Math.min(1, dt * 6));
    F.pos.addScaledVector(F.vel, dt);
    this._cam.position.copy(F.pos);
    this._cam.lookAt(F.pos.x + dir.x, F.pos.y + dir.y, F.pos.z + dir.z);
  }

  /** Registra/borra teclas del modo activo (vuelo libre o pilotaje). */
  _freeKey(e, down) {
    const M = (this._free && this._free.on) ? this._free : (this._pilot && this._pilot.on) ? this._pilot : null;
    if (!M) return;
    const key = e.key === ' ' ? ' ' : e.key.toLowerCase();
    if (key === 'escape') { if (down) (this._free && this._free.on ? this._toggleFree() : this._togglePilot()); return; }
    if (!'wasdqce '.includes(key) && key !== 'shift' && !key.startsWith('arrow')) return;
    e.preventDefault();
    if (down) M.keys.add(key); else M.keys.delete(key);
  }

  /** Multiplicador de velocidad de vuelo según el modo elegido (lenta/media/rápida). */
  _flyMul() { return [0.12, 0.3, 0.6][this._flySpeedIdx] ?? 0.3; }

  /** Cambia al siguiente modo de velocidad de vuelo y actualiza el botón. */
  _cycleFlySpeed() {
    this._flySpeedIdx = (this._flySpeedIdx + 1) % 3;
    const b = this.$('#flyspeed'); if (b) b.textContent = t(['v3d.flyspeed.slow', 'v3d.flyspeed.med', 'v3d.flyspeed.fast'][this._flySpeedIdx]);
  }

  /** Pone/quita el visor 3D a pantalla completa (el ResizeObserver reajusta solo). */
  _toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else this.$('#wrap')?.requestFullscreen?.().catch(() => {});
  }

  /** Sale de los modos de vuelo (libre/pilotar) si están activos. */
  _exitFlyModes() {
    if (this._free && this._free.on) this._toggleFree();
    if (this._pilot && this._pilot.on) this._togglePilot();
  }

  /** Ajusta la UI al entrar/salir de los modos de vuelo: muestra la velocidad de
   *  vuelo solo entonces, y limpia la vista (oculta hitos y trayectoria) para no
   *  estorbar; al salir restaura las capas según el panel de ajustes. */
  _updateFlyUi() {
    const flying = (this._free && this._free.on) || (this._pilot && this._pilot.on);
    const fs = this.$('#flyspeed'); if (fs) fs.hidden = !flying;
    if (flying) {
      if (this._kpGroup) this._kpGroup.visible = false;
      if (this._trackGroup) this._trackGroup.visible = false;
    } else this._applyShow();
  }

  _resize() {
    const wrap = this.$('#wrap'); if (!wrap || !this._renderer) return;
    const w = wrap.clientWidth, h = wrap.clientHeight;
    this._renderer.setSize(w, h, false);
    this._cam.aspect = w / h; this._cam.updateProjectionMatrix();
  }

  /** Reloj de animación: el real, salvo durante la exportación de vídeo, donde
   *  avanza a pasos fijos para que el resultado sea determinista y no dependa de
   *  la velocidad de codificación. */
  _now() { return this._exportClock != null ? this._exportClock : performance.now(); }

  /** Animaciones por fotograma independientes del tiempo del vuelo: hélices, LEDs
   *  de navegación y anti-solape de rótulos. Se usa en el bucle y en el export. */
  _animate() {
    if (this._rotors) for (const r of this._rotors) r.rotation.y += 0.9; // hélices girando
    if (this._leds) { // parpadeo de las luces de navegación
      const t = this._now() * 0.006;
      const rear = Math.sin(t) > 0.1 ? 1 : 0.12, front = Math.sin(t * 0.7 + 1) > -0.3 ? 1 : 0.25;
      for (const l of this._leds) l.mesh.material.color.copy(l.color).multiplyScalar(l.rear ? rear : front);
    }
    if (this._three === this._localScene) this._declutterLabels(); // rótulos sin solaparse
  }

  _loop() {
    const tick = () => {
      this._raf = requestAnimationFrame(tick);
      if (this._exporting) return; // durante la exportación conduce _exportVideo
      if (this._pilot && this._pilot.on) this._stepPilot(); // pilotar el dron (WASD)
      else if (this._free && this._free.on) this._stepFree(); // vuelo libre (WASD)
      else if (this._introT0 != null) this._stepIntro();
      else if (this._playing) this._advanceFlyover();
      else if (this._camTween) this._stepCamTween(); // vuelo de cámara al hito pulsado
      this._animate();
      this._renderer.render(this._three, this._cam);
    };
    this._raf = requestAnimationFrame(tick);
  }

  /* ---------- controles ---------- */

  _wireControls() {
    const canvas = this.$('#cv');
    let drag = null, down = null;
    this.on(canvas, 'pointerdown', (e) => {
      if (this._introT0 != null) { this._endIntro(); return; } // la 1ª pulsación salta la intro
      if (this._playing && this._cineMode) this._toggleCine(); // tomar control manual de la cámara
      drag = { x: e.clientX, y: e.clientY }; down = { x: e.clientX, y: e.clientY, moved: false };
      canvas.setPointerCapture(e.pointerId);
    });
    this.on(canvas, 'pointermove', (e) => {
      if (!drag) return;
      if (down && (Math.abs(e.clientX - down.x) > 4 || Math.abs(e.clientY - down.y) > 4)) { down.moved = true; this._camTween = null; }
      if (this._free && this._free.on) { // mirar alrededor (yaw/pitch)
        this._free.yaw += (e.clientX - drag.x) * 0.005;
        this._free.pitch = Math.max(-1.45, Math.min(1.45, this._free.pitch - (e.clientY - drag.y) * 0.005));
        drag = { x: e.clientX, y: e.clientY };
        return;
      }
      if (this._pilot && this._pilot.on) { // orbitar la cámara alrededor del dron
        this._pilot.camYaw += (e.clientX - drag.x) * 0.006;
        this._pilot.camPitch = Math.max(0.12, Math.min(1.35, this._pilot.camPitch + (e.clientY - drag.y) * 0.005));
        drag = { x: e.clientX, y: e.clientY };
        return;
      }
      const o = this._orbit;
      o.theta += (e.clientX - drag.x) * 0.006;
      o.phi = Math.max(0.18, Math.min(1.48, o.phi - (e.clientY - drag.y) * 0.005));
      drag = { x: e.clientX, y: e.clientY };
      if (!this._playing) this._applyOrbit();
    });
    this.on(canvas, 'pointerup', (e) => {
      // click limpio (sin arrastrar) sobre un hito → lleva la cámara a ese hito
      if (down && !down.moved) this._clickKeypoint(e);
      drag = null; down = null;
    });
    this.on(canvas, 'pointercancel', () => { drag = null; down = null; });
    this.on(canvas, 'wheel', (e) => {
      e.preventDefault();
      if (this._introT0 != null) this._endIntro();
      if (this._free && this._free.on) { // en vuelo libre la rueda regula la velocidad
        this._free.speedMul = Math.max(0.25, Math.min(5, (this._free.speedMul || 1) * (1 - Math.sign(e.deltaY) * 0.15)));
        return;
      }
      if (this._pilot && this._pilot.on) { // pilotando, la rueda acerca/aleja la cámara
        this._pilot.zoom = Math.max(0.4, Math.min(3, (this._pilot.zoom || 1) * (1 + Math.sign(e.deltaY) * 0.12)));
        return;
      }
      this._camTween = null; // el zoom manual cancela el vuelo a un hito
      const o = this._orbit, oldR = o.r;
      o.r = Math.max(o.min, Math.min(o.max, o.r * (1 + Math.sign(e.deltaY) * 0.09)));
      // zoom hacia el cursor: desplaza el pivote hacia el punto bajo el ratón en
      // la misma proporción que se acorta la distancia, así ese punto se mantiene
      // bajo el cursor mientras se acerca (en vez de ir siempre hacia el dron)
      const f = o.r / oldR;
      if (f !== 1 && !this._playing) {
        const hit = this._pointUnderCursor(e);
        if (hit) {
          const tp = this._target.lerp(hit, 1 - f), s = this._span; // acota el pivote al entorno del terreno
          tp.x = Math.max(-s, Math.min(s, tp.x)); tp.z = Math.max(-s, Math.min(s, tp.z)); tp.y = Math.max(0, Math.min(s * 0.5, tp.y));
        }
      }
      if (!this._playing) this._applyOrbit();
    }, { passive: false });

    this.on(this.$('#play'), 'click', () => { if (this._introT0 != null) this._endIntro(); this._toggleFlyover(); });
    this.on(this.$('#reset'), 'click', () => {
      this._exitFlyModes(); this._stopFlyover(); const h = this._home;
      if (h) { this._target.copy(h.target); this._orbit.r = h.r; this._orbit.theta = h.theta; this._orbit.phi = h.phi; }
      else { this._orbit.theta = -Math.PI * 0.7; this._orbit.phi = 1.2; }
      this._applyOrbit();
    });
    this.on(this.$('#prog'), 'pointerdown', (e) => this._seek(e));
    this.on(this.$('#speed'), 'click', () => this._cycleSpeed());
    this.on(this.$('#cine'), 'click', () => this._toggleCine());
    this.on(this.$('#startBtn'), 'click', () => this._runIntro());

    // exportar el sobrevuelo a vídeo (MP4) y cancelar en curso
    this.on(this.$('#export'), 'click', () => this._exportVideo());
    this.on(this.$('#expCancel'), 'click', () => this._exportAbort?.abort());

    // modo vuelo libre (WASD + ratón); las teclas se escuchan en window y solo
    // actúan cuando el modo está activo
    this.on(this.$('#free'), 'click', () => this._toggleFree());
    this.on(this.$('#pilot'), 'click', () => this._togglePilot());
    // libre/pilotar necesitan teclado (WASD): ocúltalos en táctiles sin ratón
    if (window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches) {
      this.$('#free').hidden = true; this.$('#pilot').hidden = true;
    }
    this.on(window, 'keydown', (e) => this._freeKey(e, true));
    this.on(window, 'keyup', (e) => this._freeKey(e, false));

    // velocidad de vuelo (3 modos) y pantalla completa
    this.$('#flyspeed').textContent = t(['v3d.flyspeed.slow', 'v3d.flyspeed.med', 'v3d.flyspeed.fast'][this._flySpeedIdx]);
    this.on(this.$('#flyspeed'), 'click', () => this._cycleFlySpeed());
    this.on(this.$('#fs'), 'click', () => this._toggleFullscreen());
    this.on(document, 'fullscreenchange', () => {
      const fs = !!document.fullscreenElement;
      this.$('#fs').classList.toggle('on', fs);
      this._resize();
    });

    // panel de ajustes: abre/cierra y aplica las casillas de capas
    const opts = this.$('#opts'), settings = this.$('#settings');
    this.on(settings, 'click', (e) => { e.stopPropagation(); opts.hidden = !opts.hidden; settings.classList.toggle('on', !opts.hidden); });
    for (const cb of this.$$('#opts input[type=checkbox]')) {
      cb.checked = this._show[cb.dataset.k] !== false;
      this.on(cb, 'change', () => { this._show[cb.dataset.k] = cb.checked; this._applyShow(); });
    }
    this._applyShow();

    // selector de tamaño del dron (3 opciones)
    const sizeBtns = this.$$('#dsize button');
    const markSize = () => { for (const b of sizeBtns) b.classList.toggle('on', +b.dataset.sz === this._droneScale); };
    for (const b of sizeBtns) this.on(b, 'click', () => { this._setDroneScale(+b.dataset.sz); markSize(); });
    markSize();

    this._cineMode = this._cineMode !== false; // por defecto activado
    this.$('#cine').classList.toggle('on', this._cineMode);
    this._speed = this._speed || 1;
    this.$('#speed').textContent = this._speed + '×';
    this.$('#speed').classList.toggle('on', this._speed !== 1);
    this._updateTime(0);
  }

  /** Cicla la velocidad del sobrevuelo 1× → 2× → 4×. */
  _cycleSpeed() {
    const seq = [1, 2, 4];
    this._speed = seq[(seq.indexOf(this._speed || 1) + 1) % seq.length];
    this.$('#speed').textContent = this._speed + '×';
    this.$('#speed').classList.toggle('on', this._speed !== 1);
  }

  /** Activa/desactiva el director de cámara automático (modo cine). */
  _toggleCine() {
    this._cineMode = !this._cineMode;
    this.$('#cine').classList.toggle('on', this._cineMode);
    this._director = null; this._look = null;
  }

  /** Elige el siguiente plano cinematográfico (planos suaves, sin extremos). */
  /** Elige el siguiente plano y lo arranca por el lado donde ya está la cámara
   *  (continuidad: evita cruzar de golpe al otro lado del dron). */
  _nextShot(dp, h) {
    const THREE = window.THREE;
    const shots = ['chase', 'orbit', 'high', 'side', 'reveal'];
    const prev = this._director && this._director.shot;
    let sh; do { sh = shots[(Math.random() * shots.length) | 0]; } while (sh === prev);
    let a0 = Math.random() * Math.PI * 2, dir = Math.random() < 0.5 ? -1 : 1;
    if (this._cam && dp) {
      const rel = this._cam.position.clone().sub(dp);
      if (sh === 'orbit') a0 = Math.atan2(rel.z, rel.x);           // órbita: parte del ángulo actual
      if (sh === 'side') dir = (Math.cos(h) * rel.x + Math.sin(h) * rel.z) >= 0 ? 1 : -1; // lateral: por el lado actual
    }
    this._director = { shot: sh, t0: this._now(), dur: 6500 + Math.random() * 3500, dir, a0 };
    // offset de la cámara relativo al dron al empezar el plano (para rodearlo en
    // la transición, no cruzarlo)
    this._shotFromRel = this._cam && dp ? this._cam.position.clone().sub(dp) : null;
  }

  /** Interpola dos offsets (cámara relativa al dron) rodeando al sujeto: el azimut
   *  por el arco más corto y el radio/altura por lerp. Evita que la cámara cruce
   *  por encima del dron en los cambios de plano de ~180°. */
  _arcBlend(a, b, t) {
    const a0 = Math.atan2(a.z, a.x), r0 = Math.hypot(a.x, a.z), y0 = a.y;
    const a1 = Math.atan2(b.z, b.x), r1 = Math.hypot(b.x, b.z), y1 = b.y;
    let da = a1 - a0; da = ((da + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    const ang = a0 + da * t, r = r0 + (r1 - r0) * t, y = y0 + (y1 - y0) * t;
    return new window.THREE.Vector3(Math.cos(ang) * r, y, Math.sin(ang) * r);
  }

  /** Cámara cinematográfica: encadena planos (persecución, órbita, grúa suave,
   *  lateral, revelado) siguiendo al dron. Cada cambio de plano se mezcla con una
   *  curva suave desde la posición actual, sin saltos ni latigazos. */
  _cineCam() {
    const THREE = window.THREE, d = this._scene.droneAt(this._time);
    const target = isNaN(d.heading) ? (this._cHead ?? 0) : d.heading;
    if (this._cHead == null) this._cHead = target;
    else { const diff = ((target - this._cHead + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; this._cHead += diff * 0.03; }
    const h = this._cHead;
    const dp = new THREE.Vector3(d.x, d.y, d.z);
    if (!this._director || this._now() - this._director.t0 > this._director.dur) this._nextShot(dp, h);
    const D = this._director, te = (this._now() - D.t0) / 1000;
    const Rb = this._span * 0.14, up = new THREE.Vector3(0, 1, 0); // distancia base de los planos al dron (más cerca)
    const fwd = new THREE.Vector3(Math.sin(h), 0, -Math.cos(h));
    const right = new THREE.Vector3().crossVectors(fwd, up).normalize();
    let want;
    if (D.shot === 'chase') want = dp.clone().addScaledVector(fwd, -Rb * 1.15).addScaledVector(up, Rb * 0.42);
    else if (D.shot === 'orbit') { const a = D.a0 + te * 0.16 * D.dir; want = dp.clone().addScaledVector(new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), Rb * 1.2).addScaledVector(up, Rb * 0.5); }
    else if (D.shot === 'high') want = dp.clone().addScaledVector(up, Rb).addScaledVector(fwd, -Rb * 0.6);
    else if (D.shot === 'side') want = dp.clone().addScaledVector(right, Rb * 1.15 * D.dir).addScaledVector(up, Rb * 0.42).addScaledVector(fwd, Rb * 0.15);
    else want = dp.clone().addScaledVector(fwd, Rb * (1.25 - te * 0.05)).addScaledVector(up, Rb * 0.35); // reveal (dolly suave)
    // transición suave entre planos: rodea al dron desde el encuadre anterior
    // hasta el nuevo con ease-in-out de ~2,6 s (smoothstep); luego sigue al dron
    const TR = 2.6, tt = Math.min(1, te / TR), ease = tt * tt * (3 - 2 * tt);
    const wantRel = want.clone().sub(dp);
    const goal = dp.clone().add(this._arcBlend(this._shotFromRel || wantRel, wantRel, ease));
    this._cam.position.lerp(goal, 0.12); // inercia leve para micro-suavizado
    this._look = this._look || dp.clone(); this._look.lerp(dp, 0.05);
    this._cam.lookAt(this._look);
  }

  _toggleFlyover() { this._playing ? this._stopFlyover(true) : this._startFlyover(); }

  _startFlyover() {
    if (this._time == null || this._time >= this._scene.duration - 0.05) this._time = 0;
    if (this._free && this._free.on) { this._free = { on: false }; this.$('#free').classList.remove('on'); }
    if (this._pilot && this._pilot.on) { this._pilot = { on: false }; this.$('#pilot').classList.remove('on'); }
    this._setHint(null); this._updateFlyUi();
    this._playing = true; this._last = this._now(); this._camTween = null;
    this._look = null;
    // intro cinematográfica: arranca amplio y la cámara se acerca al dron sola
    this._orbit.r = this._orbit.max * 0.3; this._orbit.phi = 1.0;
    this._chaseTargetR = this._orbit.max * 0.055; this._introStart = this._now();
    this._director = null; this._cHead = null; // reinicia el director de cámara
    this.$('#hud').hidden = !this._show.hud; // respeta el panel de ajustes
    if (this._trail) this._trail.visible = true;
    this._setPlayIcon(true);
  }

  _stopFlyover() {
    this._playing = false; this._introStart = null;
    this.$('#hud').hidden = true;
    if (this._trail) this._trail.visible = false;
    this._revealTrackFull(); // fuera de reproducción se ve el recorrido entero
    this._setPlayIcon(false);
  }

  /** Exporta el sobrevuelo a un MP4 (WebCodecs, muxer estándar → compatible con
   *  iOS). Renderiza la escena a pasos fijos (determinista: la cámara cine, la
   *  intro y los suavizados usan un reloj simulado), captura cada fotograma a un
   *  canvas y lo codifica. La duración = duración del vuelo / velocidad elegida. */
  async _exportVideo() {
    if (!this._scene || this._exporting || this._introT0 != null) return;
    this._exitFlyModes(); // el export conduce su propio sobrevuelo
    // ruta de codificación: WebCodecs (MP4, ideal) o, si no está, MediaRecorder
    // grabando el lienzo (plan B: funciona en más navegadores y tras un crash del
    // proceso de render que deja WebCodecs sin exponer). Si no hay ninguna, aviso.
    const useWebCodecs = canExportVideo();
    if (!useWebCodecs && !this._canRecordCanvas()) {
      this._exportMsg(t('v3d.export.unsupported'), true); this._showExport(true); setTimeout(() => this._showExport(false), 2500); return;
    }
    if (!useWebCodecs) console.warn('[flight-3d] WebCodecs no disponible; exporto con MediaRecorder');
    const cv = this.$('#cv');
    const aspect = cv.width / cv.height;
    const fps = 30, dt = 1 / fps, speed = this._speed || 1;
    // fotogramas del vuelo completo a la velocidad elegida (antes de acotar)
    const fullFrames = Math.ceil(this._scene.duration / speed / dt) + 1;
    // ¿Podemos transmitir el MP4 a disco? (File System Access API + WebCodecs). Si
    // sí, la RAM deja de ser el límite y no hace falta trocear ni bajar calidad.
    const canStream = useWebCodecs && typeof window.showSaveFilePicker === 'function';
    // PRESUPUESTO de tamaño de archivo. Al transmitir a disco es amplísimo (cualquier
    // vuelo cabe); en RAM se limita según la memoria del equipo (deviceMemory, GB) para
    // no agotarla — ahí un vuelo larguísimo baja de calidad o se recorta.
    const gb = navigator.deviceMemory || 4;
    const RAM_BUDGET_MB = Math.round(Math.min(1600, Math.max(400, gb * 200)));
    const BUDGET_MB = canStream ? 100_000 : RAM_BUDGET_MB;
    // niveles de calidad (bitrate afinado para el modo 'quality' del codificador, que
    // aprovecha mejor cada bit): 1440p a 24 Mbps (nítido en pantallas grandes/Retina)
    // y, si el vuelo es largo y no cabe en el presupuesto, baja a 1080p a 18 o 720p a 8.
    const tiers = [{ h: 1440, br: 24_000_000, long: 2560 }, { h: 1080, br: 18_000_000, long: 1920 }, { h: 720, br: 8_000_000, long: 1280 }];
    let tier = tiers[0];
    for (const tt of tiers) { tier = tt; if (fullFrames / fps * tt.br / 8 / 1e6 <= BUDGET_MB) break; }
    const bitrate = tier.br;
    // resolución de salida: altura del nivel, lado largo acotado, lados pares.
    // Se renderiza a esta resolución aunque el visor esté más pequeño en pantalla.
    let H = tier.h, W = Math.round(H * aspect);
    if (W > tier.long) { W = tier.long; H = Math.round(W / aspect); }
    W = Math.max(2, Math.round(W / 2) * 2); H = Math.max(2, Math.round(H / 2) * 2);
    const out = document.createElement('canvas'); out.width = W; out.height = H;
    const octx = out.getContext('2d', { alpha: false });
    // último recurso: si aun a 720p no cabe, recorta la duración del vídeo para no
    // pasar del presupuesto (el vuelo sale más corto, pero no se agota la memoria).
    const budgetFrames = Math.floor(BUDGET_MB * 8e6 / bitrate * fps);
    const totalFrames = Math.min(fullFrames, budgetFrames);
    const trimmed = totalFrames < fullFrames;
    // estimación de duración, resolución y peso del MP4 para avisar antes de arrancar
    const estSec = totalFrames / fps, estMB = Math.max(1, Math.round(estSec * bitrate / 8 / 1e6));
    const estEl = this.$('#expEst');
    if (estEl) {
      estEl.textContent = t('v3d.export.est', { dur: mmss(estSec), res: H, size: estMB })
        + (trimmed ? ' · ' + t('v3d.export.trim') : '');
    }
    // ¿HACE FALTA GUARDAR EN EL PC? Solo si el MP4 estimado no cabe con holgura en
    // RAM. Los vídeos pequeños se exportan en el navegador y se descargan solos, sin
    // molestar con el diálogo de guardar. Los grandes se transmiten a disco (si se
    // puede) para no agotar la memoria. El umbral escala con la RAM del equipo.
    const RAM_SAFE_MB = Math.min(300, Math.round(RAM_BUDGET_MB / 2));
    const needDisk = estMB > RAM_SAFE_MB;
    // Se pide el destino AQUÍ (aún con la activación del gesto del clic, sin awaits
    // previos) y, si el usuario cierra el diálogo, se sale limpio.
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
    const suggestedName = `sobrevuelo-3d-${stamp}.mp4`;
    let sink = null;
    if (canStream && needDisk) {
      sink = await this._makeFileSink(suggestedName);
      if (sink === 'cancelled') return; // el usuario cerró el diálogo: nada que limpiar
    }

    // renderiza a la resolución de salida (independiente del tamaño en pantalla)
    this._renderer.setSize(W, H, false);
    this._cam.aspect = W / H; this._cam.updateProjectionMatrix();

    this._exporting = true;
    const ac = (this._exportAbort = new AbortController());
    this._showExport(true); this._setExportProgress(0);

    // sobrevuelo determinista desde el principio, con reloj simulado
    const wasCine = this._cineMode;
    this._three = this._localScene; this._introT0 = null; this._time = 0;
    this._playing = true; this._look = null; this._director = null; this._cHead = null;
    this._orbit.r = this._orbit.max * 0.3; this._orbit.phi = 1.0;
    this._chaseTargetR = this._orbit.max * 0.055;
    this._exportClock = performance.now(); this._last = this._exportClock; this._introStart = this._exportClock;
    if (this._trail) this._trail.visible = true;
    // coloca la cámara en el encuadre de apertura antes de grabar (sin tirón inicial)
    const THREE = window.THREE, d0 = this._scene.droneAt(0), o = this._orbit;
    this._look = new THREE.Vector3(d0.x, d0.y, d0.z);
    this._cam.position.set(
      this._look.x + o.r * Math.sin(o.phi) * Math.cos(o.theta),
      this._look.y + o.r * Math.cos(o.phi),
      this._look.z + o.r * Math.sin(o.phi) * Math.sin(o.theta));
    this._cam.lookAt(this._look);

    // renderiza un fotograma del sobrevuelo al lienzo de salida `out`
    const drawFrame = () => {
      this._exportClock += dt * 1000; // avanza el reloj un fotograma
      this._advanceFlyover();          // dron/estela/cámara con ese reloj
      this._animate();                 // hélices, LEDs, rótulos
      this._renderer.render(this._three, this._cam);
      octx.drawImage(cv, 0, 0, W, H);
      if (this._show.hud) this._drawExportHud(octx, W, H, this._time);
    };

    let rec;
    try {
      if (useWebCodecs && sink) {
        // camino ideal: se transmite a disco, sin acumular el MP4 en RAM
        rec = createMp4StreamRecorder({ width: W, height: H, fps, bitrate, sink });
        for (let i = 0; i < totalFrames; i++) {
          if (ac.signal.aborted) throw new DOMException('cancelado', 'AbortError');
          drawFrame();
          await rec.encode(out);
          if (i % 4 === 0) this._setExportProgress((i + 1) / totalFrames);
        }
        await rec.finish(); // el fichero ya está escrito y cerrado en disco
      } else if (useWebCodecs) {
        // sin File System Access: acumula en RAM y descarga como Blob
        rec = createMp4Recorder({ width: W, height: H, fps, bitrate });
        for (let i = 0; i < totalFrames; i++) {
          if (ac.signal.aborted) throw new DOMException('cancelado', 'AbortError');
          drawFrame();
          await rec.encode(out);
          if (i % 4 === 0) this._setExportProgress((i + 1) / totalFrames);
        }
        downloadBlob(suggestedName, await rec.finish());
      } else {
        // plan B (sin WebCodecs): MediaRecorder al lienzo, en RAM
        const r = await this._recordCanvas({ out, drawFrame, fps, dt, totalFrames, bitrate, signal: ac.signal });
        downloadBlob(`sobrevuelo-3d-${stamp}.${r.ext}`, r.blob);
      }
      this._exportMsg(t('v3d.export.done')); await new Promise((r) => setTimeout(r, 1200));
    } catch (e) {
      await rec?.cancel();
      const cancelled = e.name === 'AbortError';
      if (!cancelled) console.error('[flight-3d] export', e);
      this._exportMsg(cancelled ? t('v3d.export.cancelled') : t('v3d.export.error'), true);
      await new Promise((r) => setTimeout(r, 1500));
    } finally {
      this._exporting = false; this._exportClock = null; this._exportAbort = null;
      this._cineMode = wasCine;
      this._resize(); // devuelve el renderer/cámara a la resolución de pantalla
      this._stopFlyover(); this._showExport(false); this._applyOrbit();
    }
  }

  /** Pide al usuario un fichero de destino (File System Access API) y devuelve un
   *  `sink` asíncrono con el que el muxer transmite el MP4 a disco. Devuelve:
   *   - un sink `{ write, close }` si eligió destino,
   *   - `'cancelled'` si cerró el diálogo (no debe exportarse nada),
   *   - `null` si el navegador no soporta la API (usar el camino en RAM).
   *  Debe llamarse aún con la activación del gesto del usuario (sin awaits previos). */
  async _makeFileSink(suggestedName) {
    if (typeof window.showSaveFilePicker !== 'function') return null;
    let handle;
    try {
      handle = await window.showSaveFilePicker({
        suggestedName,
        types: [{ description: 'Vídeo MP4', accept: { 'video/mp4': ['.mp4'] } }],
      });
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled'; // cerró el selector
      console.warn('[flight-3d] showSaveFilePicker no disponible; export a RAM', e);
      return null; // sin permiso / no soportado → camino en RAM
    }
    const writable = await handle.createWritable();
    // El muxer escribe con posiciones explícitas (parchea el tamaño de mdat al
    // final), por eso cada write lleva su `position`.
    return {
      write: (bytes, pos) => writable.write({ type: 'write', position: pos, data: bytes }),
      close: () => writable.close(),
      // descarta el fichero parcial al cancelar (no confirma nada en disco)
      abort: () => writable.abort(),
    };
  }

  /** ¿Se puede grabar el lienzo con MediaRecorder? (plan B sin WebCodecs). */
  _canRecordCanvas() {
    return typeof MediaRecorder !== 'undefined'
      && typeof HTMLCanvasElement !== 'undefined'
      && typeof HTMLCanvasElement.prototype.captureStream === 'function';
  }

  /** Mejor contenedor/codec soportado por MediaRecorder: MP4/H.264 si existe
   *  (reproducible en iOS), si no WebM. '' = deja que el navegador elija. */
  _pickRecorderMime() {
    const cands = ['video/mp4;codecs=avc1.640028', 'video/mp4', 'video/webm;codecs=h264', 'video/webm;codecs=vp9', 'video/webm'];
    for (const m of cands) { try { if (MediaRecorder.isTypeSupported(m)) return m; } catch { /* ignora */ } }
    return '';
  }

  /** Plan B de exportación: graba el lienzo `out` con MediaRecorder. Empuja cada
   *  fotograma a ritmo real (requestFrame + espera dt) para que la velocidad de
   *  reproducción sea correcta; MediaRecorder marca los tiempos por reloj de pared.
   *  Devuelve { blob, ext }. */
  async _recordCanvas({ out, drawFrame, fps, dt, totalFrames, bitrate, signal }) {
    const mime = this._pickRecorderMime();
    const stream = out.captureStream(0); // 0 fps = fotogramas manuales
    const track = stream.getVideoTracks()[0];
    const opts = { videoBitsPerSecond: bitrate }; if (mime) opts.mimeType = mime;
    const mr = new MediaRecorder(stream, opts);
    const chunks = [];
    mr.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    const stopped = new Promise((res, rej) => { mr.onstop = res; mr.onerror = (ev) => rej(ev.error || new Error('MediaRecorder')); });
    mr.start();
    const frameMs = 1000 / fps;
    let next = performance.now();
    try {
      for (let i = 0; i < totalFrames; i++) {
        if (signal.aborted) throw new DOMException('cancelado', 'AbortError');
        drawFrame();
        track.requestFrame();
        if (i % 4 === 0) this._setExportProgress((i + 1) / totalFrames);
        next += frameMs;
        const wait = next - performance.now();
        await new Promise((r) => setTimeout(r, wait > 0 ? wait : 0));
      }
    } finally {
      try { if (mr.state !== 'inactive') mr.stop(); } catch { /* ya parado */ }
    }
    await stopped;
    stream.getTracks().forEach((tk) => tk.stop());
    const type = (mime ? mime.split(';')[0] : (chunks[0] && chunks[0].type)) || 'video/webm';
    return { blob: new Blob(chunks, { type }), ext: type.includes('mp4') ? 'mp4' : 'webm' };
  }

  /** Dibuja la telemetría (altura, velocidad, v. vertical, alejamiento) sobre el
   *  fotograma exportado, en la esquina superior derecha. */
  _drawExportHud(x, W, H, time) {
    const d = this._scene.droneAt(time), tk = this._scene.takeoffXZ;
    const far = Math.round(Math.hypot(d.x - tk.x, d.z - tk.z));
    const vals = [
      [String(Math.round(d.rel || 0)), t('v3d.hud.alt')],
      [String(Math.round((d.hs || 0) * 3.6)), t('v3d.hud.spd')],
      [((d.vs || 0) >= 0 ? '+' : '') + (d.vs || 0).toFixed(1), t('v3d.hud.vs')],
      [String(far), t('v3d.hud.far')],
    ];
    const s = H / 720, cw = 116 * s, gap = 8 * s, pad = 16 * s;
    const bw = pad * 2 + vals.length * cw + (vals.length - 1) * gap, bh = 60 * s;
    const bx = W - bw - 16 * s, by = 16 * s;
    x.save();
    x.fillStyle = 'rgba(10,14,20,0.5)';
    x.beginPath(); x.roundRect(bx, by, bw, bh, 12 * s); x.fill();
    vals.forEach((v, i) => {
      const cx = bx + pad + i * (cw + gap);
      x.fillStyle = '#fff'; x.font = `700 ${27 * s}px -apple-system, system-ui, sans-serif`;
      x.fillText(v[0], cx, by + 34 * s);
      x.fillStyle = 'rgba(255,255,255,0.6)'; x.font = `600 ${10.5 * s}px -apple-system, system-ui, sans-serif`;
      x.fillText(v[1].toUpperCase(), cx, by + 49 * s);
    });
    x.restore();
  }

  _showExport(on) { const e = this.$('#exp'); if (e) e.hidden = !on; }
  _setExportProgress(p) { const f = this.$('#expF'); if (f) f.style.width = Math.round(p * 100) + '%'; const l = this.$('#expT'); if (l) l.textContent = t('v3d.export.running') + ' ' + Math.round(p * 100) + '%'; }
  _exportMsg(msg, isErr) { const l = this.$('#expT'); if (l) { l.textContent = msg; l.classList.toggle('err', !!isErr); } }

  /** Avanza el sobrevuelo: mueve el dron, la estela y encadena la cámara. */
  _advanceFlyover() {
    const now = this._now(), dt = Math.min(0.05, (now - this._last) / 1000); this._last = now;
    this._time = Math.min(this._scene.duration, (this._time || 0) + dt * (this._speed || 1));
    this._placeDrone(this._time);
    this._updateTrail(this._time);
    this._revealTrack(this._time);
    if (this._cineMode && !this._introStart) this._cineCam(); else this._chaseCam();
    this._updateTime(this._time);
    if (this._time >= this._scene.duration && !this._exporting) this._stopFlyover();
  }

  /** Cámara de seguimiento: orbita alrededor del dron; el usuario puede arrastrar
   *  y hacer zoom en pleno sobrevuelo (la órbita usa theta/phi/r de _orbit). */
  _chaseCam() {
    const THREE = window.THREE, d = this._scene.droneAt(this._time);
    const tp = new THREE.Vector3(d.x, d.y, d.z);
    this._look = this._look || tp.clone();
    this._look.lerp(tp, 0.15); // sigue al dron suavemente
    // intro: durante ~2.6 s la cámara se acerca sola (luego manda el usuario)
    if (this._introStart) {
      if (this._now() - this._introStart < 2600) {
        this._orbit.r += (this._chaseTargetR - this._orbit.r) * 0.03;
        this._orbit.phi += (1.15 - this._orbit.phi) * 0.03;
      } else this._introStart = null;
    }
    const o = this._orbit, t = this._look;
    const want = new THREE.Vector3(
      t.x + o.r * Math.sin(o.phi) * Math.cos(o.theta),
      t.y + o.r * Math.cos(o.phi),
      t.z + o.r * Math.sin(o.phi) * Math.sin(o.theta),
    );
    this._cam.position.lerp(want, 0.25);
    this._cam.lookAt(t);
  }

  _seek(e) {
    const r = this.$('#prog').getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    this._time = p * this._scene.duration;
    this._placeDrone(this._time); this._updateTime(this._time);
    if (this._playing) this._revealTrack(this._time); else { this._revealTrackFull(); this._applyOrbit(); this._look = null; }
  }

  _updateTime(time) {
    const p = this._scene.duration ? time / this._scene.duration : 0;
    this.$('#progf').style.width = (p * 100) + '%';
    this.$('#time').textContent = `${mmss(time)} / ${mmss(this._scene.duration)}`;
  }

  _setPlayIcon(playing) {
    const ic = this.$('#playic');
    ic.innerHTML = playing ? '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>' : '<path d="M8 5v14l11-7z"/>';
    this.$('#play').lastChild.textContent = playing ? t('v3d.pause') : t('v3d.flyover');
  }

  /* ---------- utilidades ---------- */

  _webglOk() {
    try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); }
    catch { return false; }
  }

  _fallback() {
    this.$('#wrap')?.classList.remove('loading');
    const wrap = this.$('#wrap');
    if (wrap) wrap.innerHTML = `<div class="v3d-fallback">${t('v3d.unsupported')}</div>`;
  }

  _teardown() {
    this._exportAbort?.abort(); this._exporting = false; this._exportClock = null;
    if (this._raf) cancelAnimationFrame(this._raf); this._raf = null;
    this._playing = false;
    this._io?.disconnect(); this._io = null;
    this._ro?.disconnect(); this._ro = null;
    this._visIO?.disconnect(); this._visIO = null;
    this._introT0 = null; this._introPlayed = false; this._globe = null;
    if (this._renderer) { this._renderer.dispose(); this._renderer = null; }
    this._three = null; this._localScene = null; this._scene = null; this._time = null; this._look = null;
    this._labelItems = null; this._terrainMesh = null; this._ray = null; this._home = null; this._kpMarks = null; this._camTween = null; this._free = null; this._pilot = null;
    this._trackGroup = null; this._kpGroup = null; this._horizonPlacesGroup = null; this._horizonWaterGroup = null;
  }
}

customElements.define('flight-3d', Flight3D);
