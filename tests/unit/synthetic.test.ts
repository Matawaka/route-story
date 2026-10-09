import { beforeAll, expect, it } from 'vitest';
import { DOMParser as XmlParser, onErrorStopParsing } from '@xmldom/xmldom';
import { syntheticGpx } from '../fixtures/synthetic';
import { parseGpx, MAX_BYTES } from '../../src/gpx';
import { fitProjection } from '../../src/geo';
beforeAll(()=>Object.defineProperty(globalThis,'DOMParser',{value:class{parseFromString(xml:string){return new XmlParser({onError:onErrorStopParsing}).parseFromString(xml,'application/xml');}},configurable:true}));
it.each([100,5000,20000,50000])('synthetic %i-point fixture fits existing limits without truncation',count=>{
  const xml=syntheticGpx(count,'segments');expect(new TextEncoder().encode(xml).byteLength).toBeLessThan(MAX_BYTES);
  const r=parseGpx(xml);expect(r.pointCount).toBe(count);expect(r.segments.length).toBe(4);expect(r.elevationGain).toBeDefined();expect(xml).toBe(syntheticGpx(count,'segments'));
});
it('50,001 points are rejected instead of truncated',()=>expect(()=>parseGpx(syntheticGpx(50001))).toThrow('50 000'));
it.each(['dense','antimeridian','long','polar','short'] as const)('%s geometry remains finite and framed in both aspects',kind=>{
  const r=parseGpx(syntheticGpx(100,kind));expect(r.pointCount).toBe(100);
  for(const [w,h] of [[640,360],[360,640]]){const projection=fitProjection(r.segments,w,h);for(const p of r.segments.flat()){const[x,y]=projection.project(p);expect(x).toBeGreaterThanOrEqual(w*.05);expect(x).toBeLessThanOrEqual(w*.95);expect(y).toBeGreaterThanOrEqual(h*.249);expect(y).toBeLessThanOrEqual(h*.761);}}
});
