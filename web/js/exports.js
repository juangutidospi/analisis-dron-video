// Exportaciones del vuelo: GPX, KML y CSV, generadas en el navegador desde el modelo.

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function toGPX(model, name = 'Vuelo DJI') {
  const pts = model.track.filter(p => p[0] != null)
    .map(p => `<trkpt lat="${p[0]}" lon="${p[1]}"><ele>${p[2] ?? 0}</ele></trkpt>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Análisis de vuelos DJI" xmlns="http://www.topografix.com/GPX/1/1">
<trk><name>${esc(name)}</name><trkseg>${pts}</trkseg></trk></gpx>`;
}

export function toKML(model, name = 'Vuelo DJI') {
  const coords = model.track.filter(p => p[0] != null).map(p => `${p[1]},${p[0]},${p[2] ?? 0}`).join(' ');
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${esc(name)}</name>
<Placemark><name>${esc(name)}</name><LineString><altitudeMode>relativeToGround</altitudeMode>
<coordinates>${coords}</coordinates></LineString></Placemark></Document></kml>`;
}

export function toCSV(model) {
  const head = 't_s,lat,lon,rel_alt_m,abs_alt_m,hspeed_kmh,vspeed_ms,iso,ct_k,pitch_deg';
  const rows = model.series.map(s => [
    s.t, s.lat, s.lon, s.rel, s.ab,
    s.hs != null ? (s.hs * 3.6).toFixed(2) : '', s.vs ?? '', s.iso ?? '', s.ct ?? '', s.pitch ?? '',
  ].join(','));
  return [head, ...rows].join('\n');
}

/** Dispara la descarga de un texto como archivo. */
export function download(filename, text, type = 'text/plain') {
  downloadBlob(filename, new Blob([text], { type }));
}

/** Dispara la descarga de un Blob como archivo. */
export function downloadBlob(filename, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
