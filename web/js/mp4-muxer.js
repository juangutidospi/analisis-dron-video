// Muxer MP4 mínimo, salida progresiva estándar (moov al final): compatible con
// iOS/QuickTime, a diferencia del MP4 fragmentado que produce MediaRecorder.
// Pista de vídeo H.264 (muestras AVCC) + pista de audio AAC opcional. Si no se
// aporta audio, la salida es idéntica al muxer de vídeo puro.
//
// Dos modos:
//  - createMp4(): acumula todas las muestras en memoria (Blobs) y devuelve el MP4
//    como Blob en finalize(). Bien para vídeos cortos.
//  - createMp4Stream({ sink }): escribe cada muestra directamente al `sink` (un
//    fichero en disco vía File System Access API) según llegan, sin retenerlas en
//    RAM. Solo queda metadata en memoria (unos pocos MB), así un vuelo largo a
//    1080p no agota la memoria de la pestaña. Solo vídeo (sin audio).

const VTS = 90000; // timescale de la pista de vídeo

const u8 = (...n) => new Uint8Array(n);
const u16 = (n) => new Uint8Array([(n >> 8) & 255, n & 255]);
const u32 = (n) => { n >>>= 0; return new Uint8Array([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]); };
// entero de 64 bits big-endian (para el largesize del box mdat en modo streaming)
const u64 = (n) => new Uint8Array([...u32(Math.floor(n / 2 ** 32)), ...u32(n % 2 ** 32)]);
const str = (s) => new Uint8Array([...s].map((c) => c.charCodeAt(0)));
const cat = (arrs) => { let len = 0; for (const a of arrs) len += a.length; const o = new Uint8Array(len); let p = 0; for (const a of arrs) { o.set(a, p); p += a.length; } return o; };
const box = (type, ...payload) => { const body = cat(payload); return cat([u32(body.length + 8), str(type), body]); };
const fbox = (type, version, flags, ...payload) => box(type, u8(version), u8((flags >> 16) & 255, (flags >> 8) & 255, flags & 255), ...payload);
// descriptor MPEG-4 (tag + longitud en 1 byte; suficiente para AudioSpecificConfig)
const descr = (tag, payload) => cat([u8(tag), u8(payload.length), payload]);
const MATRIX = cat([u32(0x00010000), u32(0), u32(0), u32(0), u32(0x00010000), u32(0), u32(0), u32(0), u32(0x40000000)]);

const ftypBox = () => box('ftyp', str('isom'), u32(0x200), str('isom'), str('iso2'), str('avc1'), str('mp41'));

/**
 * Construye el box `moov` a partir de la metadata de las muestras. Puro: no toca
 * los bytes de los datos, solo describe dónde viven (`vBase`/`aBase`).
 * @param {{width:number,height:number,description:Uint8Array,samples:Array,dataLen:number,vBase:number,audio?:object,aSamples?:Array,aDataLen?:number,aBase?:number}} s
 */
function assembleMoov(s) {
  const { width, height, description, samples, vBase } = s;
  const hasAudio = !!(s.audio && s.aSamples && s.aSamples.length);
  const audio = s.audio, aSamples = s.aSamples || [];

  // duraciones de vídeo a partir de los timestamps
  for (let i = 0; i < samples.length; i++) {
    samples[i].dur = i < samples.length - 1
      ? Math.max(1, samples[i + 1].ts - samples[i].ts)
      : (samples.length > 1 ? samples[i - 1].ts - (samples[i - 2]?.ts ?? samples[i - 1].ts) || 3000 : 3000);
  }
  if (samples.length > 1) samples[samples.length - 1].dur = samples[samples.length - 2].dur;
  const vTotal = samples.reduce((a, x) => a + x.dur, 0);
  const vDurMs = Math.round(vTotal / VTS * 1000);

  // audio: 1024 muestras PCM por frame AAC-LC
  const AAC_FRAME = 1024;
  const aTotal = hasAudio ? aSamples.length * AAC_FRAME : 0;
  const aDurMs = hasAudio ? Math.round(aTotal / audio.sampleRate * 1000) : 0;
  const durMovie = Math.max(vDurMs, aDurMs);

  // ---- pista de vídeo ----
  const avc1 = box('avc1',
    u8(0, 0, 0, 0, 0, 0), u16(1),
    u16(0), u16(0), u8(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
    u16(width), u16(height),
    u32(0x00480000), u32(0x00480000), u32(0), u16(1),
    new Uint8Array(32),
    u16(0x0018), u16(0xFFFF),
    box('avcC', description));
  const vStsd = fbox('stsd', 0, 0, u32(1), avc1);
  const sttsE = [];
  for (const smp of samples) { const l = sttsE[sttsE.length - 1]; if (l && l.dur === smp.dur) l.count++; else sttsE.push({ count: 1, dur: smp.dur }); }
  const vStts = fbox('stts', 0, 0, u32(sttsE.length), cat(sttsE.map((e) => cat([u32(e.count), u32(e.dur)]))));
  const vStsc = fbox('stsc', 0, 0, u32(1), cat([u32(1), u32(samples.length), u32(1)]));
  const vStsz = fbox('stsz', 0, 0, u32(0), u32(samples.length), cat(samples.map((x) => u32(x.size))));
  const vStco = fbox('stco', 0, 0, u32(1), u32(vBase));
  const keys = samples.map((x, i) => (x.key ? i + 1 : 0)).filter(Boolean);
  const vStss = fbox('stss', 0, 0, u32(keys.length), cat(keys.map((k) => u32(k))));
  const vStbl = box('stbl', vStsd, vStts, vStsc, vStsz, vStco, vStss);
  const vmhd = fbox('vmhd', 0, 1, u16(0), u16(0), u16(0), u16(0));
  const dinf = box('dinf', fbox('dref', 0, 0, u32(1), fbox('url ', 0, 1)));
  const vMinf = box('minf', vmhd, dinf, vStbl);
  const vHdlr = fbox('hdlr', 0, 0, u32(0), str('vide'), u8(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0), cat([str('VideoHandler'), u8(0)]));
  const vMdhd = fbox('mdhd', 0, 0, u32(0), u32(0), u32(VTS), u32(vTotal), u16(0x55c4), u16(0));
  const vMdia = box('mdia', vMdhd, vHdlr, vMinf);
  const vTkhd = fbox('tkhd', 0, 7, u32(0), u32(0), u32(1), u32(0), u32(durMovie),
    u8(0, 0, 0, 0, 0, 0, 0, 0), u16(0), u16(0), u16(0), u16(0), MATRIX, u32(width << 16), u32(height << 16));
  const vTrak = box('trak', vTkhd, vMdia);

  // ---- pista de audio (opcional) ----
  let aTrak = null;
  if (hasAudio) {
    const aBase = s.aBase;
    const esds = fbox('esds', 0, 0,
      descr(0x03, cat([u16(0), u8(0),                                  // ES_ID + flags
        descr(0x04, cat([u8(0x40), u8(0x15), u8(0, 0, 0), u32(0), u32(128000), // AAC, audioStream, buffer/max/avg bitrate
          descr(0x05, audio.desc)])),                                  // AudioSpecificConfig
        descr(0x06, u8(0x02))])));                                     // SLConfig
    const mp4a = box('mp4a',
      u8(0, 0, 0, 0, 0, 0), u16(1),           // reserved + data_reference_index
      u32(0), u32(0),                         // reserved
      u16(audio.channels), u16(16),           // channelcount + samplesize
      u16(0), u16(0),                         // pre_defined + reserved
      u32((audio.sampleRate * 65536) >>> 0),  // samplerate 16.16
      esds);
    const aStsd = fbox('stsd', 0, 0, u32(1), mp4a);
    const aStts = fbox('stts', 0, 0, u32(1), cat([u32(aSamples.length), u32(AAC_FRAME)]));
    const aStsc = fbox('stsc', 0, 0, u32(1), cat([u32(1), u32(aSamples.length), u32(1)]));
    const aStsz = fbox('stsz', 0, 0, u32(0), u32(aSamples.length), cat(aSamples.map((x) => u32(x.size))));
    const aStco = fbox('stco', 0, 0, u32(1), u32(aBase));
    const aStbl = box('stbl', aStsd, aStts, aStsc, aStsz, aStco);
    const smhd = fbox('smhd', 0, 0, u16(0), u16(0));
    const aMinf = box('minf', smhd, dinf, aStbl);
    const aHdlr = fbox('hdlr', 0, 0, u32(0), str('soun'), u8(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0), cat([str('SoundHandler'), u8(0)]));
    const aMdhd = fbox('mdhd', 0, 0, u32(0), u32(0), u32(audio.sampleRate), u32(aTotal), u16(0x55c4), u16(0));
    const aMdia = box('mdia', aMdhd, aHdlr, aMinf);
    const aTkhd = fbox('tkhd', 0, 7, u32(0), u32(0), u32(2), u32(0), u32(durMovie),
      u8(0, 0, 0, 0, 0, 0, 0, 0), u16(0), u16(0), u16(0x0100), u16(0), MATRIX, u32(0), u32(0));
    aTrak = box('trak', aTkhd, aMdia);
  }

  const nextTrack = hasAudio ? 3 : 2;
  const mvhd = fbox('mvhd', 0, 0, u32(0), u32(0), u32(1000), u32(durMovie), u32(0x00010000), u16(0x0100), u16(0),
    u32(0), u32(0), MATRIX, u32(0), u32(0), u32(0), u32(0), u32(0), u32(0), u32(nextTrack));
  return hasAudio ? box('moov', mvhd, vTrak, aTrak) : box('moov', mvhd, vTrak);
}

/**
 * @param {{width:number,height:number}} o
 * @returns {{setDescription:(d:BufferSource)=>void, addSample:(bytes:Uint8Array,isKey:boolean,tsMicros:number)=>void, setAudioConfig:(c:{sampleRate:number,channels:number,description:BufferSource})=>void, addAudioSample:(bytes:BufferSource,tsMicros:number)=>void, finalize:()=>Blob}}
 */
export function createMp4({ width, height }) {
  let description = null;
  const samples = [];      // vídeo: { size, key, ts (en VTS), offset }
  // Los bytes de cada muestra se guardan como Blob (no Uint8Array): Chrome los
  // respalda en su almacén de blobs, paginable a disco, en vez del heap del
  // renderer. Así un vuelo largo no dispara la RAM y el Blob final no duplica.
  const data = [];
  let dataLen = 0;

  // audio (opcional)
  let audio = null;        // { sampleRate, channels, desc }
  const aSamples = [];     // { size }
  const aData = [];
  let aDataLen = 0;

  return {
    setDescription(d) { description = new Uint8Array(d instanceof ArrayBuffer ? d : d.buffer || d); },
    addSample(bytes, isKey, tsMicros) {
      const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
      samples.push({ size: b.length, key: !!isKey, ts: Math.round(tsMicros * VTS / 1e6), offset: dataLen });
      data.push(new Blob([b])); dataLen += b.length;
    },
    setAudioConfig({ sampleRate, channels, description: d }) {
      audio = { sampleRate, channels: channels || 2, desc: new Uint8Array(d instanceof ArrayBuffer ? d : d.buffer || d) };
    },
    addAudioSample(bytes) {
      const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
      aSamples.push({ size: b.length });
      aData.push(new Blob([b])); aDataLen += b.length;
    },
    finalize() {
      if (!description || !samples.length) throw new Error('MP4 sin datos.');
      const ftyp = ftypBox();
      const totalData = dataLen + aDataLen;
      const mdatHeader = cat([u32(totalData + 8), str('mdat')]); // mdat de 32 bits (tamaño conocido)
      const vBase = ftyp.length + mdatHeader.length;   // offset del primer byte de vídeo
      const aBase = vBase + dataLen;                   // el audio va tras el vídeo en el mdat
      const moov = assembleMoov({ width, height, description, samples, dataLen, vBase, audio, aSamples, aDataLen, aBase });
      return new Blob([ftyp, mdatHeader, ...data, ...aData, moov], { type: 'video/mp4' });
    },
  };
}

/**
 * Muxer en streaming: escribe el MP4 directamente a `sink` (un fichero en disco)
 * según llegan las muestras, sin retenerlas en RAM. Solo vídeo. Estructura:
 * ftyp → mdat (con largesize de 64 bits: se reserva y se parchea al final) →
 * moov. En memoria solo queda la metadata de cada muestra (tamaño, ts, clave).
 *
 * `sink` es asíncrono: { write(bytes, position?): Promise, close(): Promise,
 * abort?(): Promise }. `abort` (opcional) descarta el fichero al cancelar. Sobre
 * File System Access API se envuelve un FileSystemWritableFileStream.
 *
 * @param {{width:number,height:number,sink:{write:(b:Uint8Array,pos?:number)=>Promise<void>,close:()=>Promise<void>}}} o
 */
export function createMp4Stream({ width, height, sink }) {
  let description = null;
  const samples = [];      // { size, key, ts }
  let dataLen = 0;         // bytes de datos de vídeo escritos hasta ahora
  const ftyp = ftypBox();
  const mdatOffset = ftyp.length;          // dónde empieza el box mdat
  const vBase = mdatOffset + 16;           // datos tras el header mdat de 64 bits
  let writePos = 0;        // posición del próximo byte a escribir en el fichero
  let chain = Promise.resolve(); // cola de escrituras serializadas, en orden
  let writeErr = null;
  let started = false;

  // Encadena una escritura posicionada; captura el primer error para relanzarlo.
  const enqueue = (bytes, pos) => {
    const at = pos;
    chain = chain.then(() => sink.write(bytes, at)).catch((e) => { if (!writeErr) writeErr = e; });
    return chain;
  };

  // Cabecera: ftyp + header mdat con largesize provisional (se parchea al final).
  const start = () => {
    const mdatHeader = cat([u32(1), str('mdat'), u64(0)]); // size=1 → largesize de 64 bits
    enqueue(ftyp, 0); writePos = ftyp.length;
    enqueue(mdatHeader, writePos); writePos += mdatHeader.length; // = vBase
    started = true;
  };

  return {
    setDescription(d) { description = new Uint8Array(d instanceof ArrayBuffer ? d : d.buffer || d); },
    addSample(bytes, isKey, tsMicros) {
      if (writeErr) throw writeErr;
      if (!started) start();
      const b = bytes instanceof Uint8Array ? bytes.slice() : new Uint8Array(bytes); // copia: el buffer del chunk se reutiliza
      samples.push({ size: b.length, key: !!isKey, ts: Math.round(tsMicros * VTS / 1e6) });
      enqueue(b, writePos); writePos += b.length; dataLen += b.length;
    },
    /** Espera a que se vacíe la cola de escrituras (backpressure). */
    async drain() { await chain; if (writeErr) throw writeErr; },
    /** Cierra el fichero tras escribir moov y parchear el tamaño de mdat. */
    async finalize() {
      if (!started || !description || !samples.length) throw new Error('MP4 sin datos.');
      const mdatSize = 16 + dataLen; // header de 64 bits + datos
      const moov = assembleMoov({ width, height, description, samples, dataLen, vBase });
      enqueue(moov, writePos); writePos += moov.length;
      enqueue(u64(mdatSize), mdatOffset + 8); // parchea el largesize del mdat
      await chain;
      if (writeErr) throw writeErr;
      await sink.close();
    },
    /** Aborta: descarta el fichero (sink.abort() si existe) o, si no, lo cierra
     *  como esté para que el llamante lo elimine. */
    async abort() {
      try { await chain; } catch { /* ignora */ }
      try { if (sink.abort) await sink.abort(); else await sink.close(); } catch { /* ignora */ }
    },
  };
}
