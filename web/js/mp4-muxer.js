// Muxer MP4 mínimo para vídeo H.264 (muestras en formato AVCC), salida progresiva
// estándar (moov al final): compatible con iOS/QuickTime, a diferencia del MP4
// fragmentado que produce MediaRecorder. Sin audio (vídeo puro).

const TS = 90000; // timescale de medios

const u8 = (...n) => new Uint8Array(n);
const u16 = (n) => new Uint8Array([(n >> 8) & 255, n & 255]);
const u32 = (n) => { n >>>= 0; return new Uint8Array([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]); };
const str = (s) => new Uint8Array([...s].map((c) => c.charCodeAt(0)));
const cat = (arrs) => { let len = 0; for (const a of arrs) len += a.length; const o = new Uint8Array(len); let p = 0; for (const a of arrs) { o.set(a, p); p += a.length; } return o; };
const box = (type, ...payload) => { const body = cat(payload); return cat([u32(body.length + 8), str(type), body]); };
const fbox = (type, version, flags, ...payload) => box(type, u8(version), u8((flags >> 16) & 255, (flags >> 8) & 255, flags & 255), ...payload);
const MATRIX = cat([u32(0x00010000), u32(0), u32(0), u32(0), u32(0x00010000), u32(0), u32(0), u32(0), u32(0x40000000)]);

/**
 * @param {{width:number,height:number}} o
 * @returns {{setDescription:(d:BufferSource)=>void, addSample:(bytes:Uint8Array,isKey:boolean,tsMicros:number)=>void, finalize:()=>Blob}}
 */
export function createMp4({ width, height }) {
  let description = null;
  const samples = [];      // { size, key, ts (en TS), offset }
  const data = [];
  let dataLen = 0;

  return {
    setDescription(d) { description = new Uint8Array(d instanceof ArrayBuffer ? d : d.buffer || d); },
    addSample(bytes, isKey, tsMicros) {
      const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
      samples.push({ size: b.length, key: !!isKey, ts: Math.round(tsMicros * TS / 1e6), offset: dataLen });
      data.push(b); dataLen += b.length;
    },
    finalize() {
      if (!description || !samples.length) throw new Error('MP4 sin datos.');
      // duraciones a partir de los timestamps
      for (let i = 0; i < samples.length; i++) {
        samples[i].dur = i < samples.length - 1
          ? Math.max(1, samples[i + 1].ts - samples[i].ts)
          : (samples.length > 1 ? samples[i - 1].ts - (samples[i - 2]?.ts ?? samples[i - 1].ts) || 3000 : 3000);
      }
      if (samples.length > 1) samples[samples.length - 1].dur = samples[samples.length - 2].dur;
      const totalDur = samples.reduce((s, x) => s + x.dur, 0);
      const durMovie = Math.round(totalDur / TS * 1000);

      const ftyp = box('ftyp', str('isom'), u32(0x200), str('isom'), str('iso2'), str('avc1'), str('mp41'));
      const mdatHeader = cat([u32(dataLen + 8), str('mdat')]);
      const mdatDataOffset = ftyp.length + mdatHeader.length; // offset absoluto del primer byte de muestra

      const avc1 = box('avc1',
        u8(0, 0, 0, 0, 0, 0), u16(1),                       // reserved + data_reference_index
        u16(0), u16(0), u8(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0), // pre_defined + reserved + pre_defined[3]
        u16(width), u16(height),
        u32(0x00480000), u32(0x00480000), u32(0), u16(1),
        new Uint8Array(32),                                  // compressorname
        u16(0x0018), u16(0xFFFF),
        box('avcC', description));
      const stsd = fbox('stsd', 0, 0, u32(1), avc1);
      const sttsE = [];
      for (const s of samples) { const l = sttsE[sttsE.length - 1]; if (l && l.dur === s.dur) l.count++; else sttsE.push({ count: 1, dur: s.dur }); }
      const stts = fbox('stts', 0, 0, u32(sttsE.length), cat(sttsE.map((e) => cat([u32(e.count), u32(e.dur)]))));
      const stsc = fbox('stsc', 0, 0, u32(1), cat([u32(1), u32(samples.length), u32(1)]));
      const stsz = fbox('stsz', 0, 0, u32(0), u32(samples.length), cat(samples.map((s) => u32(s.size))));
      const stco = fbox('stco', 0, 0, u32(1), u32(mdatDataOffset));
      const keys = samples.map((s, i) => (s.key ? i + 1 : 0)).filter(Boolean);
      const stss = fbox('stss', 0, 0, u32(keys.length), cat(keys.map((k) => u32(k))));
      const stbl = box('stbl', stsd, stts, stsc, stsz, stco, stss);
      const vmhd = fbox('vmhd', 0, 1, u16(0), u16(0), u16(0), u16(0));
      const dinf = box('dinf', fbox('dref', 0, 0, u32(1), fbox('url ', 0, 1)));
      const minf = box('minf', vmhd, dinf, stbl);
      const hdlr = fbox('hdlr', 0, 0, u32(0), str('vide'), u8(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0), cat([str('VideoHandler'), u8(0)]));
      const mdhd = fbox('mdhd', 0, 0, u32(0), u32(0), u32(TS), u32(totalDur), u16(0x55c4), u16(0));
      const mdia = box('mdia', mdhd, hdlr, minf);
      const tkhd = fbox('tkhd', 0, 7, u32(0), u32(0), u32(1), u32(0), u32(durMovie),
        u8(0, 0, 0, 0, 0, 0, 0, 0), u16(0), u16(0), u16(0), u16(0), MATRIX, u32(width << 16), u32(height << 16));
      const trak = box('trak', tkhd, mdia);
      const mvhd = fbox('mvhd', 0, 0, u32(0), u32(0), u32(1000), u32(durMovie), u32(0x00010000), u16(0x0100), u16(0),
        u32(0), u32(0), MATRIX, u32(0), u32(0), u32(0), u32(0), u32(0), u32(0), u32(2));
      const moov = box('moov', mvhd, trak);

      return new Blob([ftyp, mdatHeader, ...data, moov], { type: 'video/mp4' });
    },
  };
}
