import { beforeAll, describe, expect, it } from 'vitest';
import { DOMParser as XmlParser, onErrorStopParsing } from '@xmldom/xmldom';
import { readFileSync } from 'node:fs';
import { MAX_BYTES, MAX_POINTS, parseGpx, readGpx } from '../../src/gpx';
beforeAll(() => { Object.defineProperty(globalThis, 'DOMParser', { value: class { parseFromString(xml: string) { return new XmlParser({ onError: onErrorStopParsing }).parseFromString(xml, 'application/xml'); } }, configurable: true }); });
const fixture = (name: string) => readFileSync(`tests/fixtures/${name}`, 'utf8');
const gpx = (points: string) => `<gpx><trk><trkseg>${points}</trkseg></trk></gpx>`;
describe('GPX import', () => {
  it('preserves segments, duplicates, elevation, optional times and metadata', () => {
    const route = parseGpx(fixture('segmented.gpx')); expect(route.segments.map(s => s.length)).toEqual([3, 2]); expect(route.pointCount).toBe(5);
    expect(route.segments[0][0]).toEqual({ lon: 0, lat: 0, elevation: 10, time: '2026-01-01T00:00:00Z' }); expect(route.segments[0][1].time).toBeUndefined();
    expect(route.elevationGain).toBe(10); expect(route.distanceKm).toBeCloseTo(215.684, 2); expect(route.name).toBe('Синтетический тест разрывов');
  });
  it('reads route points and GPX namespace prefixes', () => {
    expect(parseGpx(fixture('antimeridian.gpx')).pointCount).toBe(2);
    expect(parseGpx('<g:gpx xmlns:g="http://www.topografix.com/GPX/1/0"><g:rte><g:rtept lon="10" lat="20"/></g:rte></g:gpx>').segments[0][0]).toEqual({ lon: 10, lat: 20 });
  });
  it('preserves interleaved track and route order', () => { const r = parseGpx('<gpx><rte><rtept lon="1" lat="2"/></rte><trk><trkseg><trkpt lon="3" lat="4"/></trkseg></trk><rte><rtept lon="5" lat="6"/></rte></gpx>'); expect(r.segments.map(s => s[0].lon)).toEqual([1,3,5]); });
  it('does not infer ascent from incomplete elevation data', () => { expect(parseGpx(gpx('<trkpt lon="1" lat="2"><ele>1</ele></trkpt><trkpt lon="1.1" lat="2"/>')).elevationGain).toBeUndefined(); });
  it.each(['invalid-coordinate.gpx', 'malformed.gpx'])('rejects %s', name => { expect(() => parseGpx(fixture(name))).toThrow(); });
  it.each(['NaN', 'Infinity', '', '0x10', '181'])('rejects invalid longitude %s', lon => { expect(() => parseGpx(gpx(`<trkpt lon="${lon}" lat="0"/>`))).toThrow(); });
  it.each(['<notgpx/>', '<gpx/>', '<gpx xmlns="https://evil.test"><rte><rtept lon="0" lat="0"/></rte></gpx>', '<!DOCTYPE gpx SYSTEM "https://evil.test"><gpx/>', '<!DOCTYPE gpx [<!ENTITY x "bomb">]><gpx/>', '<gpx><script>alert(1)</script></gpx>', '<gpx><svg/></gpx>', '<gpx onclick="evil()"/>'])('rejects dangerous/empty input %#', xml => { expect(() => parseGpx(xml)).toThrow(); });
  it('treats encoded HTML metadata as inert text', () => { const r = parseGpx('<gpx><metadata><name>&lt;script&gt;hello&lt;/script&gt;</name></metadata><rte><rtept lon="0" lat="0"/></rte></gpx>'); expect(r.name).toBe('<script>hello</script>'); });
  it.each(['2026-02-30T00:00:00Z', 'yesterday', '2026-01-01T24:00:00Z', ''])('rejects invalid time %s', time => { expect(() => parseGpx(gpx(`<trkpt lon="0" lat="0"><time>${time}</time></trkpt>`))).toThrow(); });
  it('rejects over 50,000 points and accepts the exact limit without truncation', () => { const p = '<trkpt lon="0" lat="0"/>'; expect(parseGpx(gpx(p.repeat(MAX_POINTS))).pointCount).toBe(MAX_POINTS); expect(() => parseGpx(gpx(p.repeat(MAX_POINTS + 1)))).toThrow(/50 000/); });
  it('rejects files over 10 MiB before reading', async () => { const f = new File([new Uint8Array(MAX_BYTES + 1)], 'big.gpx'); await expect(readGpx(f)).rejects.toThrow(/10 МиБ/); });
  it('rejects oversized text and deep trees', () => { expect(() => parseGpx(' '.repeat(MAX_BYTES + 1))).toThrow(/10 МиБ/); expect(() => parseGpx('<gpx>' + '<x>'.repeat(70) + '</x>'.repeat(70) + '</gpx>')).toThrow(/структуры/); });
  it('rejects invalid UTF-8 and reads file metadata safely', async () => { await expect(readGpx(new File([new Uint8Array([255])], 'x.gpx'))).rejects.toThrow(/UTF-8/); const r = await readGpx(new File([gpx('<trkpt lon="1" lat="2"/>')], 'route.gpx')); expect(r.name).toBe('route'); });
  it('rejects oversized fallback names without silent truncation', async () => { await expect(readGpx(new File([gpx('<trkpt lon="1" lat="2"/>')], 'x'.repeat(201)+'.gpx'))).rejects.toThrow(/Название/); });
});
