// Reloj de reproducción del vuelo: mantiene el instante actual (t) y avisa a
// quien se suscriba (mapa, gráficas, vídeo) en cada fotograma. Es un EventTarget:
//   clock.addEventListener('tick', (e) => ...e.detail.t...)   // instante
//   clock.addEventListener('state', (e) => ...playing/speed...) // controles

export class PlayerClock extends EventTarget {
  /** @param {number} dur duración del vuelo en segundos */
  constructor(dur) {
    super();
    this.dur = dur || 0;
    this.t = 0;
    this.playing = false;
    this.speed = 1;
    this._raf = 0;
    this._last = 0;
  }

  play() {
    if (this.playing || this.dur <= 0) return;
    if (this.t >= this.dur) this.t = 0;
    this.playing = true;
    this._last = performance.now();
    this._emit('state');
    this._loop();
  }

  pause() {
    if (!this.playing) return;
    this.playing = false;
    cancelAnimationFrame(this._raf);
    this._emit('state');
  }

  toggle() { this.playing ? this.pause() : this.play(); }

  /** Salta a un instante (segundos). */
  seek(t) {
    this.t = Math.max(0, Math.min(this.dur, t));
    this._emit('tick');
    if (!this.playing) this._emit('state');
  }

  /** @param {number} s velocidad (1, 2, 4…) */
  setSpeed(s) {
    this.speed = s;
    this._emit('state');
  }

  /** Detiene el bucle y libera (al desmontar el informe). */
  destroy() { cancelAnimationFrame(this._raf); this.playing = false; }

  _loop() {
    this._raf = requestAnimationFrame((now) => {
      if (!this.playing) return;
      const dt = ((now - this._last) / 1000) * this.speed;
      this._last = now;
      this.t += dt;
      if (this.t >= this.dur) {
        this.t = this.dur; this.playing = false;
        this._emit('tick'); this._emit('state');
        return;
      }
      this._emit('tick');
      this._loop();
    });
  }

  _emit(type) {
    this.dispatchEvent(new CustomEvent(type, {
      detail: { t: this.t, playing: this.playing, speed: this.speed, dur: this.dur },
    }));
  }
}
