import { describe, expect, it } from 'vitest';
import { fitProjection, haversine, longitudeBounds, RoutePath, routeMetrics } from '../../src/geo';
describe('actual geography and segment-aware animation', () => {
  it('matches equatorial degree length and handles antipodes', () => { expect(haversine({lon:0,lat:0}, {lon:1,lat:0})).toBeCloseTo(111.195080,5); expect(haversine({lon:0,lat:0},{lon:180,lat:0})).toBeCloseTo(Math.PI*6371.0088,5); });
  it('never adds a gap to geographic distance or interpolates through it', () => {
    const segments = [[{lon:0,lat:0},{lon:1,lat:0}],[{lon:40,lat:0},{lon:41,lat:0}]];
    expect(routeMetrics(segments).distanceKm).toBeCloseTo(222.39016,4);
    const path = new RoutePath(segments); expect(path.at(.499).point.lon).toBeCloseTo(.998); expect(path.at(.5).point.lon).toBeCloseTo(40); expect(path.at(1).point.lon).toBe(41);
  });
  it('fits antimeridian geometry narrowly and follows the short arc', () => {
    const points = [{lon:179,lat:10},{lon:-179,lat:11}]; const bounds = longitudeBounds(points); expect(bounds.east-bounds.west).toBe(2);
    const view = fitProjection([points],640,360); const a=view.project(points[0]),b=view.project(points[1]); expect(Math.abs(a[0]-b[0])).toBeGreaterThan(100); expect(a.concat(b).every(Number.isFinite)).toBe(true);
    expect(Math.abs(new RoutePath([points]).at(.5).point.lon)).toBeCloseTo(180); expect(haversine(points[0],points[1])).toBeLessThan(250);
  });
  it('handles stationary routes and poles without NaN', () => { for (const lat of [0,90,-90]) { const points=[{lon:0,lat},{lon:0,lat}]; expect(fitProjection([points],360,640).project(points[0]).every(Number.isFinite)).toBe(true); expect(new RoutePath([points]).at(.7).point).toEqual(points[0]); } });
  it('keeps the recorded first/last points even with isolated segments', () => { const path = new RoutePath([[{lon:0,lat:0}],[{lon:1,lat:0},{lon:2,lat:0}],[{lon:8,lat:1}]]); expect(path.at(0).point.lon).toBe(0); expect(path.at(1).point.lon).toBe(8); });
});
