/** MIT. Deterministic synthetic geometry; never a real person's GPS record. */
export type SyntheticKind = 'dense' | 'segments' | 'antimeridian' | 'long' | 'polar' | 'short' | 'coastal' | 'extreme';
export function syntheticGpx(count: number, kind: SyntheticKind = 'dense', title = `Синтетический ${kind} · ${count} точек`): string {
  if (!Number.isInteger(count) || count < 2 || count > 50_001) throw new Error('Synthetic fixture count: 2..50001 (last case tests rejection).');
  if (!['dense','segments','antimeridian','long','polar','short','coastal','extreme'].includes(kind)) throw new Error('Unknown synthetic case.');
  const escape = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const segments = kind === 'segments' ? 4 : 1;
  let xml = `<gpx version="1.1" creator="Route Story synthetic benchmark"><metadata><name>${escape(title)}</name><desc>SYNTHETIC; deterministic generated geometry, no real journey.</desc></metadata><trk>`;
  let previous = '', previousSegment = -1;
  for (let i = 0; i < count; i++) {
    const segment = Math.min(segments - 1, Math.floor(i * segments / count));
    if (segment !== previousSegment) { if (i) xml += '</trkseg>'; xml += '<trkseg>'; previousSegment = segment; previous = ''; }
    const t = i / (count - 1);
    let lon = 7 + t * .125, lat = 45 + Math.sin(t * Math.PI * 12) * .025;
    if (kind === 'segments') { lon += segment * 2; lat += segment; }
    if (kind === 'antimeridian') { lon = ((179.7 + t * .6 + 180) % 360) - 180; lat = 15 + Math.sin(t * Math.PI * 4) * .03; }
    if (kind === 'long') { lon = -150 + t * 300; lat = 10 + Math.sin(t * Math.PI * 6) * 25; }
    if (kind === 'polar') { lon = -30 + t * 60; lat = 86 + t * 3; }
    if (kind === 'short') { lon = 7 + t * .00001; lat = 45 + t * .00001; }
    if (kind === 'coastal') { lon = -5.3 + t * .2; lat = 50 + Math.sin(t * Math.PI * 4) * .04; }
    if (kind === 'extreme') { lon = i % 2 ? 180 : 0; lat = 0; }
    const coordinates = previous && i % 7 === 0 && i !== count - 1 ? previous : `lat="${lat.toFixed(7)}" lon="${lon.toFixed(7)}"`;
    previous = coordinates;
    xml += `<trkpt ${coordinates}><ele>${Math.round(100 + Math.sin(t * Math.PI * 20) * 20)}</ele></trkpt>`;
  }
  return xml + '</trkseg></trk></gpx>';
}
