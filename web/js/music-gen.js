// Generador de música ambiental sintética (Web Audio, sin archivos): renderiza
// un AudioBuffer con OfflineAudioContext a partir de pads de acordes, campanas
// esporádicas y una reverb sencilla. Pensado para banda sonora de fondo de los
// vídeos, con estilos distintos y fundidos de entrada/salida.

/** Estilos disponibles: acordes (Hz), duración de acorde y timbre. */
export const STYLES = {
  calma:      { chords: [[220, 277.18, 329.63], [196, 246.94, 293.66], [174.61, 220, 261.63], [196, 246.94, 329.63]], chordDur: 8, wave: 'sine',     bells: 0.5, cutoff: 1400 },
  epico:      { chords: [[130.81, 196, 261.63], [146.83, 220, 293.66], [174.61, 261.63, 349.23], [130.81, 196, 246.94]], chordDur: 6, wave: 'sawtooth', bells: 0.9, cutoff: 1800 },
  cinematico: { chords: [[164.81, 246.94, 329.63], [146.83, 220, 293.66], [123.47, 185, 246.94], [164.81, 220, 329.63]], chordDur: 7, wave: 'triangle', bells: 0.7, cutoff: 1600 },
};

/** Impulso de reverb: ruido con caída exponencial. */
function makeImpulse(ctx, seconds, decay) {
  const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

/** Una voz del pad: dos osciladores con detune, envolvente lenta y filtro. */
function pad(ctx, out, freq, t0, dur, wave, cutoff) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(0.16, t0 + 1.8);         // ataque lento
  g.gain.setValueAtTime(0.16, t0 + dur - 2);
  g.gain.linearRampToValueAtTime(0, t0 + dur);            // caída lenta
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cutoff; lp.Q.value = 0.6;
  g.connect(lp); lp.connect(out);
  for (const det of [-6, 6]) {
    const o = ctx.createOscillator(); o.type = wave; o.frequency.value = freq; o.detune.value = det;
    o.connect(g); o.start(t0); o.stop(t0 + dur);
  }
}

/** Campana/nota cristalina: seno con envolvente percusiva. */
function bell(ctx, out, freq, t0) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(0.12, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0008, t0 + 3.2);
  const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
  o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + 3.3);
}

/**
 * Renderiza música ambiental a un AudioBuffer.
 * @param {number} sampleRate
 * @param {number} duration segundos
 * @param {keyof STYLES} [style]
 * @returns {Promise<AudioBuffer>}
 */
export async function generateAmbient(sampleRate, duration, style = 'cinematico') {
  const S = STYLES[style] || STYLES.cinematico;
  const dur = Math.max(6, duration);
  const ctx = new OfflineAudioContext(2, Math.ceil(sampleRate * dur), sampleRate);

  const master = ctx.createGain();
  master.gain.setValueAtTime(0, 0);
  master.gain.linearRampToValueAtTime(0.9, 2);            // fundido de entrada
  master.gain.setValueAtTime(0.9, Math.max(2.1, dur - 3));
  master.gain.linearRampToValueAtTime(0, dur);           // fundido de salida
  master.connect(ctx.destination);
  const rev = ctx.createConvolver(); rev.buffer = makeImpulse(ctx, 2.6, 2.4);
  const revGain = ctx.createGain(); revGain.gain.value = 0.4;
  master.connect(rev); rev.connect(revGain); revGain.connect(ctx.destination);

  let t = 0, ci = 0;
  while (t < dur) {
    const chord = S.chords[ci % S.chords.length];
    for (const f of chord) pad(ctx, master, f, t, S.chordDur + 1.5, S.wave, S.cutoff);
    // campanas: notas del acorde una octava arriba, en tiempos aleatorios
    const nb = Math.round(S.bells * 3);
    for (let k = 0; k < nb; k++) {
      const bt = t + Math.random() * S.chordDur;
      if (bt < dur) bell(ctx, master, chord[Math.floor(Math.random() * chord.length)] * 2, bt);
    }
    t += S.chordDur; ci++;
  }
  return ctx.startRendering();
}
