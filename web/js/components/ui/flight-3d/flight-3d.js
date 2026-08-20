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
        <div class="v3d-loading">${t('v3d.loading')}</div>
        <div class="v3d-legend"><span class="line"></span><span>${t('v3d.path')}</span></div>
        <div class="v3d-hint">${t('v3d.hint')}</div>
        <div class="v3d-bar" hidden>
          <button class="v3d-btn primary" id="play" type="button">
            <svg viewBox="0 0 24 24" fill="currentColor" id="playic"><path d="M8 5v14l11-7z"/></svg>${t('v3d.flyover')}
          </button>
          <div class="v3d-prog" id="prog"><div class="v3d-prog-f" id="progf"></div></div>
          <span class="v3d-time" id="time">0:00 / 0:00</span>
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
      this.$('.v3d-bar').hidden = false;
      this._wireControls();
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
    scene.background = new THREE.Color(0x0d131f);
    const span = Math.max(data.bounds.spanX, Math.abs(data.bounds.spanZ)) || 500;
    scene.fog = new THREE.Fog(0x0d131f, span * 1.8, span * 6);
    this._three = scene;

    const cam = new THREE.PerspectiveCamera(52, 16 / 10, 1, span * 8);
    this._cam = cam;

    // luces: cielo/suelo + sol direccional
    scene.add(new THREE.HemisphereLight(0xbcd3ff, 0x3a3326, 0.9));
    const sun = new THREE.DirectionalLight(0xfff2d6, 1.15);
    sun.position.set(span * 0.6, span * 0.9, span * 0.4);
    scene.add(sun);

    scene.add(this._buildTerrain(data));
    scene.add(this._buildTrack(data));
    this._drone = this._buildDrone(data);
    scene.add(this._drone);
    this._placeDrone(0);

    // órbita: objetivo en el centro del terreno, a media altura
    this._target = new THREE.Vector3(0, (data.terrain.elevMax - data.terrain.elevMin) / 2, 0);
    this._orbit = { r: span * 1.15, theta: -Math.PI * 0.7, phi: 1.2, min: span * 0.25, max: span * 4 };
    this._applyOrbit();

    this._resize();
    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(this.$('#wrap'));
    this._loop();
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
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.96, metalness: 0 });
    if (!data.terrain.hasDEM) mat.wireframe = false;
    return new THREE.Mesh(geo, mat);
  }

  /** Recorrido 3D estilo Google Earth: línea naranja sólida + cortina rayada al suelo. */
  _buildTrack(data) {
    const THREE = window.THREE;
    const T = data.track;
    const grp = new THREE.Group();
    if (T.length < 2) return grp;
    const span = Math.max(data.bounds.spanX, Math.abs(data.bounds.spanZ)) || 500;
    const radius = Math.max(3.5, Math.min(15, span * 0.0065));
    const baseY = data.takeoffXZ.y; // suelo bajo el despegue
    const ORANGE = 0xff7d1a;

    // 1) cortina naranja translúcida bajo el recorrido
    const cv = new THREE.BufferGeometry();
    const cn = T.length, cpos = new Float32Array(cn * 2 * 3);
    for (let i = 0; i < cn; i++) {
      const p = T[i];
      cpos.set([p.x, p.y, p.z], i * 6); cpos.set([p.x, baseY, p.z], i * 6 + 3);
    }
    const cidx = [];
    for (let i = 0; i < cn - 1; i++) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; cidx.push(a, b, c, c, b, d); }
    cv.setAttribute('position', new THREE.BufferAttribute(cpos, 3));
    cv.setIndex(cidx);
    grp.add(new THREE.Mesh(cv, new THREE.MeshBasicMaterial({ color: ORANGE, transparent: true, opacity: 0.26, side: THREE.DoubleSide, depthWrite: false })));

    // 2) rayado: una línea vertical del recorrido al suelo en cada muestra
    const hn = cn, hpos = new Float32Array(hn * 2 * 3);
    for (let i = 0; i < hn; i++) {
      const p = T[i];
      hpos.set([p.x, p.y, p.z], i * 6); hpos.set([p.x, baseY, p.z], i * 6 + 3);
    }
    const hg = new THREE.BufferGeometry();
    hg.setAttribute('position', new THREE.BufferAttribute(hpos, 3));
    grp.add(new THREE.LineSegments(hg, new THREE.LineBasicMaterial({ color: ORANGE, transparent: true, opacity: 0.5, depthWrite: false })));

    // 3) línea del recorrido: tubo naranja sólido y brillante (sin depender de la luz)
    const curve = new THREE.CatmullRomCurve3(T.map((p) => new THREE.Vector3(p.x, p.y, p.z)));
    const segs = Math.min(800, Math.max(80, T.length * 2));
    const geo = new THREE.TubeGeometry(curve, segs, radius, 10, false);
    grp.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: ORANGE })));
    // halo oscuro fino por debajo para que resalte sobre terreno claro
    const halo = new THREE.TubeGeometry(curve, segs, radius * 1.5, 10, false);
    grp.add(new THREE.Mesh(halo, new THREE.MeshBasicMaterial({ color: 0x5a2600, transparent: true, opacity: 0.35, side: THREE.BackSide, depthWrite: false })));

    // 4) marcador de despegue
    const tk = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.8, radius * 1.8, radius * 0.6, 20),
      new THREE.MeshStandardMaterial({ color: 0x37cf6b, emissive: 0x0e5a2a, emissiveIntensity: 0.6 }));
    tk.position.set(data.takeoffXZ.x, data.takeoffXZ.y, data.takeoffXZ.z);
    grp.add(tk);
    return grp;
  }

  /** Dron: cuadricóptero (cuerpo + brazos + motores + hélices) + cono de visión. */
  _buildDrone(data) {
    const THREE = window.THREE;
    const span = Math.max(data.bounds.spanX, Math.abs(data.bounds.spanZ)) || 500;
    const s = Math.max(14, span * 0.026);
    const grp = new THREE.Group();

    // cuerpo que gira según el rumbo (el frente mira a -Z)
    const body = new THREE.Group();
    const matBody = new THREE.MeshStandardMaterial({ color: 0x23272e, metalness: 0.5, roughness: 0.45 });
    const matArm = new THREE.MeshStandardMaterial({ color: 0x33383f, metalness: 0.4, roughness: 0.55 });
    const matDark = new THREE.MeshStandardMaterial({ color: 0x111318, metalness: 0.3, roughness: 0.6 });
    const matRotor = new THREE.MeshStandardMaterial({ color: 0xc7cfdb, metalness: 0.2, roughness: 0.4, transparent: true, opacity: 0.4, side: THREE.DoubleSide });

    // fuselaje central
    const hull = new THREE.Mesh(new THREE.BoxGeometry(s * 0.5, s * 0.2, s * 0.66), matBody);
    body.add(hull);
    // cúpula superior
    const dome = new THREE.Mesh(new THREE.SphereGeometry(s * 0.24, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), matBody);
    dome.position.y = s * 0.09; dome.scale.set(1, 0.6, 1.15); body.add(dome);
    // cámara/gimbal en el morro con lente azul
    const cam = new THREE.Mesh(new THREE.SphereGeometry(s * 0.13, 14, 12), matDark);
    cam.position.set(0, -s * 0.12, -s * 0.28); body.add(cam);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(s * 0.07, 16),
      new THREE.MeshStandardMaterial({ color: 0x5b9dff, emissive: 0x1b3a66, emissiveIntensity: 0.8 }));
    lens.position.set(0, -s * 0.13, -s * 0.4); body.add(lens);

    // 4 brazos diagonales con motor y hélice
    const L = s * 0.62;
    this._rotors = [];
    for (const a of [Math.PI / 4, 3 * Math.PI / 4, 5 * Math.PI / 4, 7 * Math.PI / 4]) {
      const dx = Math.cos(a), dz = Math.sin(a);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(L, s * 0.07, s * 0.1), matArm);
      arm.position.set(dx * L / 2, 0, dz * L / 2); arm.rotation.y = -a; body.add(arm);
      const motor = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.09, s * 0.11, s * 0.16, 14), matDark);
      motor.position.set(dx * L, s * 0.05, dz * L); body.add(motor);
      // hélice (2 palas cruzadas, casi transparentes para el efecto de giro)
      const rotor = new THREE.Group();
      for (const rot of [0, Math.PI / 2]) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(s * 0.62, s * 0.012, s * 0.09), matRotor);
        blade.rotation.y = rot; rotor.add(blade);
      }
      rotor.position.set(dx * L, s * 0.14, dz * L); body.add(rotor); this._rotors.push(rotor);
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
      if (this._playing) this._advanceFlyover();
      if (this._rotors) for (const r of this._rotors) r.rotation.y += 0.9; // hélices girando
      this._renderer.render(this._three, this._cam);
    };
    this._raf = requestAnimationFrame(tick);
  }

  /* ---------- controles ---------- */

  _wireControls() {
    const canvas = this.$('#cv');
    let drag = null;
    this.on(canvas, 'pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
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
      const o = this._orbit;
      o.r = Math.max(o.min, Math.min(o.max, o.r * (1 + Math.sign(e.deltaY) * 0.09)));
      if (!this._playing) this._applyOrbit();
    }, { passive: false });

    this.on(this.$('#play'), 'click', () => this._toggleFlyover());
    this.on(this.$('#reset'), 'click', () => { this._stopFlyover(); this._orbit.theta = -Math.PI * 0.7; this._orbit.phi = 1.2; this._applyOrbit(); });
    this.on(this.$('#prog'), 'pointerdown', (e) => this._seek(e));

    this._updateTime(0);
  }

  _toggleFlyover() { this._playing ? this._stopFlyover(true) : this._startFlyover(); }

  _startFlyover() {
    if (this._time == null || this._time >= this._scene.duration - 0.05) this._time = 0;
    this._playing = true; this._last = performance.now();
    this._headSmooth = null; this._look = null; // la cámara se coloca limpia al arrancar
    this._setPlayIcon(true);
  }

  _stopFlyover() { this._playing = false; this._setPlayIcon(false); }

  /** Avanza el sobrevuelo: mueve el dron y encadena la cámara detrás. */
  _advanceFlyover() {
    const now = performance.now(), dt = Math.min(0.05, (now - this._last) / 1000); this._last = now;
    this._time = Math.min(this._scene.duration, (this._time || 0) + dt);
    this._placeDrone(this._time);
    this._chaseCam();
    this._updateTime(this._time);
    if (this._time >= this._scene.duration) this._stopFlyover();
  }

  /** Cámara persecutoria: detrás y por encima del dron, con rumbo suavizado. */
  _chaseCam() {
    const THREE = window.THREE, d = this._scene.droneAt(this._time);
    // rumbo objetivo; en hover (NaN) mantenemos el último y no giramos
    const target = isNaN(d.heading) ? (this._headSmooth ?? 0) : d.heading;
    if (this._headSmooth == null) this._headSmooth = target;
    else {
      // interpolación por el arco más corto → giro gradual sin saltos
      const diff = ((target - this._headSmooth + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
      this._headSmooth += diff * 0.045;
    }
    const h = this._headSmooth;
    const back = 90 + this._orbit.r * 0.16, up = 34 + this._orbit.r * 0.05;
    const want = new THREE.Vector3(d.x - Math.sin(h) * back, d.y + up, d.z + Math.cos(h) * back);
    this._cam.position.lerp(want, 0.05);
    const look = new THREE.Vector3(d.x, d.y, d.z);
    this._look = this._look || look.clone();
    this._look.lerp(look, 0.08);
    this._cam.lookAt(this._look);
  }

  _seek(e) {
    const r = this.$('#prog').getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    this._time = p * this._scene.duration;
    this._placeDrone(this._time); this._updateTime(this._time);
    if (!this._playing) { this._applyOrbit(); this._look = null; }
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
    if (this._renderer) { this._renderer.dispose(); this._renderer = null; }
    this._three = null; this._scene = null; this._time = null; this._look = null;
  }
}

customElements.define('flight-3d', Flight3D);
