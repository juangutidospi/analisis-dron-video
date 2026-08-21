import { DjiElement } from '../../../core/DjiElement.js';
import { t } from '../../../i18n/index.js';
import { buildScene3D, altColor } from '../../../scene-3d.js';
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
        </div>
        <div class="v3d-bar" hidden>
          <button class="v3d-btn primary" id="play" type="button">
            <svg viewBox="0 0 24 24" fill="currentColor" id="playic"><path d="M8 5v14l11-7z"/></svg>${t('v3d.flyover')}
          </button>
          <div class="v3d-prog" id="prog"><div class="v3d-prog-f" id="progf"></div></div>
          <span class="v3d-time" id="time">0:00 / 0:00</span>
          <button class="v3d-btn" id="speed" type="button" title="${t('v3d.speed')}">1×</button>
          <button class="v3d-btn" id="reset" type="button" title="${t('v3d.reset')}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 4v4h4"/></svg>
          </button>
        </div>
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

  _build() {
    const token = (this._token = Symbol('build'));
    buildScene3D(this._flight.model).then((scene) => {
      if (token !== this._token || !this.isConnected) return;
      this._scene = scene;
      this._initThree(scene);
      this.$('#wrap').classList.remove('loading');
      this._wireControls(); // la barra aparece tras la intro (o si no hay globo)
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

    scene.add(this._buildTerrain(data));
    scene.add(this._buildSkirt(data)); // faldón: bloque de tierra, no lámina flotante
    scene.add(this._buildTrack(data));
    this._drone = this._buildDrone(data);
    scene.add(this._drone);
    this._trail = this._buildTrail();
    scene.add(this._trail);
    this._placeDrone(0);

    // órbita: objetivo en el centro del terreno, a media altura
    this._target = new THREE.Vector3(0, data.terrain.midY ?? 0, 0);
    this._orbit = { r: span * 1.15, theta: -Math.PI * 0.7, phi: 1.2, min: span * 0.05, max: span * 4 };
    this._applyOrbit();

    this._localScene = scene; // escena del vuelo (el globo de la intro es aparte)
    this._resize();
    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(this.$('#wrap'));
    this._setupIntro(data); // deja el globo de póster con el botón de inicio
    this._loop();
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

    // 3) CINTA superior: tubo naranja brillante + halo aditivo (bloom)
    const curve = new THREE.CatmullRomCurve3(T.map((p) => new THREE.Vector3(p.x, p.y, p.z)));
    const segs = Math.min(900, Math.max(90, T.length * 2)), radial = 10;
    const tubeGeo = new THREE.TubeGeometry(curve, segs, radius, radial, false);
    const tube = new THREE.Mesh(tubeGeo, new THREE.MeshBasicMaterial({ color: 0xffa24d }));
    grp.add(tube);
    const haloGeo = new THREE.TubeGeometry(curve, segs, radius * 2.6, radial, false);
    const halo = new THREE.Mesh(haloGeo, new THREE.MeshBasicMaterial({ color: 0xff7d1a, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending }));
    grp.add(halo);

    // 4) marcador de despegue (aro luminoso)
    const tk = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.8, radius * 1.8, radius * 0.6, 24),
      new THREE.MeshStandardMaterial({ color: 0x37cf6b, emissive: 0x1a8a44, emissiveIntensity: 0.9 }));
    tk.position.set(data.takeoffXZ.x, data.takeoffXZ.y, data.takeoffXZ.z);
    grp.add(tk);

    // datos para el revelado progresivo durante el sobrevuelo
    this._trackReveal = { curtain, hatch, tube, halo, cn, segs, radial, times: T.map((p) => p.t) };
    return grp;
  }

  /** Revela el recorrido hasta el instante t (efecto de "dibujado" en el sobrevuelo). */
  _revealTrack(time) {
    const R = this._trackReveal; if (!R) return;
    let k = 1; while (k < R.times.length && R.times[k] <= time) k++;
    const f = Math.max(0.002, Math.min(1, k / (R.times.length - 1)));
    R.curtain.geometry.setDrawRange(0, Math.max(0, k - 1) * 6);
    R.hatch.geometry.setDrawRange(0, k * 2);
    const tc = Math.max(6, Math.floor(R.segs * f) * R.radial * 6);
    R.tube.geometry.setDrawRange(0, tc);
    R.halo.geometry.setDrawRange(0, tc);
  }

  /** Muestra el recorrido completo (fuera de la reproducción). */
  _revealTrackFull() {
    const R = this._trackReveal; if (!R) return;
    for (const m of [R.curtain, R.hatch, R.tube, R.halo]) m.geometry.setDrawRange(0, Infinity);
  }

  /** Dron modelado como el DJI Neo 2: cuerpo gris, 4 conductos con hélice,
   *  cámara/gimbal frontal y antenas en V. Materiales con emissive para que se
   *  vea (no una silueta negra) aunque la luz de la escena sea baja. */
  _buildDrone(data) {
    const THREE = window.THREE;
    const span = Math.max(data.bounds.spanX, Math.abs(data.bounds.spanZ)) || 500;
    const s = Math.max(9, span * 0.012); // marcador exagerado, pero sin pasarse
    const grp = new THREE.Group();
    const body = new THREE.Group(); // gira según el rumbo (el frente mira a -Z)

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

    grp.add(body); this._droneBody = body;

    // cono de visión: parte del dron y apunta según rumbo + pitch del gimbal
    const len = s * 3.2, rad = len * Math.tan(28 * Math.PI / 180);
    const coneGeo = new THREE.ConeGeometry(rad, len, 24, 1, true);
    coneGeo.translate(0, -len / 2, 0); // vértice en el origen, se abre hacia -Y
    const cone = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({ color: 0x8ec5ff, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
    this._cone = cone; grp.add(cone);
    return grp;
  }

  /** Coloca el dron, lo orienta por rumbo y apunta su cono en el instante t. */
  _placeDrone(time) {
    const THREE = window.THREE, d = this._scene.droneAt(time);
    this._drone.position.set(d.x, d.y, d.z);
    // en hover el rumbo es NaN: mantenemos el último para que no gire de golpe
    const h = isNaN(d.heading) ? (this._bodyHeading ?? 0) : d.heading;
    this._bodyHeading = h;
    if (this._droneBody) this._droneBody.rotation.y = -h; // el frente (-Z) mira al rumbo
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

  _resize() {
    const wrap = this.$('#wrap'); if (!wrap || !this._renderer) return;
    const w = wrap.clientWidth, h = wrap.clientHeight;
    this._renderer.setSize(w, h, false);
    this._cam.aspect = w / h; this._cam.updateProjectionMatrix();
  }

  _loop() {
    const tick = () => {
      this._raf = requestAnimationFrame(tick);
      if (this._introT0 != null) this._stepIntro();
      else if (this._playing) this._advanceFlyover();
      if (this._rotors) for (const r of this._rotors) r.rotation.y += 0.9; // hélices girando
      this._renderer.render(this._three, this._cam);
    };
    this._raf = requestAnimationFrame(tick);
  }

  /* ---------- controles ---------- */

  _wireControls() {
    const canvas = this.$('#cv');
    let drag = null;
    this.on(canvas, 'pointerdown', (e) => {
      if (this._introT0 != null) { this._endIntro(); return; } // la 1ª pulsación salta la intro
      drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId);
    });
    this.on(canvas, 'pointermove', (e) => {
      if (!drag) return;
      const o = this._orbit;
      o.theta += (e.clientX - drag.x) * 0.006;
      o.phi = Math.max(0.18, Math.min(1.48, o.phi - (e.clientY - drag.y) * 0.005));
      drag = { x: e.clientX, y: e.clientY };
      if (!this._playing) this._applyOrbit();
    });
    const stop = () => { drag = null; };
    this.on(canvas, 'pointerup', stop); this.on(canvas, 'pointercancel', stop);
    this.on(canvas, 'wheel', (e) => {
      e.preventDefault();
      if (this._introT0 != null) this._endIntro();
      const o = this._orbit;
      o.r = Math.max(o.min, Math.min(o.max, o.r * (1 + Math.sign(e.deltaY) * 0.09)));
      if (!this._playing) this._applyOrbit();
    }, { passive: false });

    this.on(this.$('#play'), 'click', () => { if (this._introT0 != null) this._endIntro(); this._toggleFlyover(); });
    this.on(this.$('#reset'), 'click', () => { this._stopFlyover(); this._orbit.theta = -Math.PI * 0.7; this._orbit.phi = 1.2; this._applyOrbit(); });
    this.on(this.$('#prog'), 'pointerdown', (e) => this._seek(e));
    this.on(this.$('#speed'), 'click', () => this._cycleSpeed());
    this.on(this.$('#startBtn'), 'click', () => this._runIntro());

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

  _toggleFlyover() { this._playing ? this._stopFlyover(true) : this._startFlyover(); }

  _startFlyover() {
    if (this._time == null || this._time >= this._scene.duration - 0.05) this._time = 0;
    this._playing = true; this._last = performance.now();
    this._look = null;
    // intro cinematográfica: arranca amplio y la cámara se acerca al dron sola
    this._orbit.r = this._orbit.max * 0.3; this._orbit.phi = 1.0;
    this._chaseTargetR = this._orbit.max * 0.055; this._introStart = performance.now();
    this.$('#hud').hidden = false;
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

  /** Avanza el sobrevuelo: mueve el dron, la estela y encadena la cámara. */
  _advanceFlyover() {
    const now = performance.now(), dt = Math.min(0.05, (now - this._last) / 1000); this._last = now;
    this._time = Math.min(this._scene.duration, (this._time || 0) + dt * (this._speed || 1));
    this._placeDrone(this._time);
    this._updateTrail(this._time);
    this._revealTrack(this._time);
    this._chaseCam();
    this._updateTime(this._time);
    if (this._time >= this._scene.duration) this._stopFlyover();
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
      if (performance.now() - this._introStart < 2600) {
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
    if (this._raf) cancelAnimationFrame(this._raf); this._raf = null;
    this._playing = false;
    this._io?.disconnect(); this._io = null;
    this._ro?.disconnect(); this._ro = null;
    this._introT0 = null; this._introPlayed = false; this._globe = null;
    if (this._renderer) { this._renderer.dispose(); this._renderer = null; }
    this._three = null; this._localScene = null; this._scene = null; this._time = null; this._look = null;
  }
}

customElements.define('flight-3d', Flight3D);
