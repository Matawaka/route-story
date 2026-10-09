import { describe, expect, it } from 'vitest';
import { fitProjection } from '../../src/geo';
import { formatDistance, palette } from '../../src/renderer';
const luminance = (hex: string) => {
  const rgb = hex.slice(1).match(/../g)!.map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
};
const contrast = (a: string, b: string) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
describe('map and factual metric readability', () => {
  for (const [style, c] of Object.entries(palette)) {
    it(`${style} route strokes contrast with both map surfaces; overlay text remains readable`, () => {
      for (const surface of [c.land, c.water]) { expect(contrast(c.track, surface)).toBeGreaterThanOrEqual(3); expect(contrast(c.line, surface)).toBeGreaterThanOrEqual(3); }
      expect(contrast(c.ink, c.water)).toBeGreaterThanOrEqual(4.5); expect(contrast(c.quiet, c.water)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(c.line, c.track)).toBeGreaterThan(1.3);
    });
  }
  it('frames metre-scale tracks without changing points and retains finite stationary bounds', () => {
    const points = [{lon:7,lat:45},{lon:7.00001,lat:45.00001}], before=JSON.stringify(points);
    for (const [w,h] of [[640,360],[360,640],[1280,720],[720,1280]]) {
      const projection=fitProjection([points],w,h),a=projection.project(points[0]),b=projection.project(points[1]);
      expect(Math.hypot(a[0]-b[0],a[1]-b[1])).toBeGreaterThan(15);
      for(const [x,y] of [a,b]) { expect(x).toBeGreaterThan(0);expect(x).toBeLessThan(w);expect(y).toBeGreaterThan(h*.22);expect(y).toBeLessThan(h*.8); }
    }
    expect(JSON.stringify(points)).toBe(before);
    expect(fitProjection([[points[0],points[0]]],360,640).scale).toBeLessThan(50_000);
  });
  it('uses stable metre units on short tracks and factual kilometre values on longer tracks', () => {
    expect(formatDistance(.00136)).toBe('1,4 м');expect(formatDistance(0,.8)).toBe('0 м');expect(formatDistance(.1234,.8)).toBe('123,4 м');
    expect(formatDistance(0,2)).toBe('0,00 км');expect(formatDistance(2.1234)).toBe('2,12 км');
  });
});
