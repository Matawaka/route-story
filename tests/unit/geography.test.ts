import { describe, expect, it } from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateGeography} from '../../src/geography';
import {parseGpx} from '../../src/gpx';
import {cinematicGpx} from '../fixtures/cinematic';
import {DOMParser} from '@xmldom/xmldom';
Object.assign(globalThis,{DOMParser});
const empty={schema:1,name:'Test',extent:[0,0,10,10],land:[],lakes:[],coast:[],rivers:[],labels:[]};
describe('bounded local geography and reproducible demo',()=>{
  it('checks shipped public-domain packs against their reproducible source manifest',()=>{
    const manifest=JSON.parse(readFileSync('docs/GEOGRAPHY_SOURCES.json','utf8'));
    for(const entry of manifest.outputs){const bytes=readFileSync('public/'+entry.path);expect(bytes.length).toBe(entry.bytes);expect(createHash('sha256').update(bytes).digest('hex')).toBe(entry.sha256);const pack=validateGeography(JSON.parse(bytes.toString()));expect(pack.land.length).toBe(entry.polygons);expect(pack.lakes.length).toBe(entry.lakes);expect(pack.rivers.length).toBe(entry.rivers);expect(pack.labels.length).toBe(entry.labels);}
    expect(manifest.license).toBe('public domain');expect(manifest.outputs.reduce((s:number,f:{bytes:number})=>s+f.bytes,0)).toBeLessThan(4*1024*1024);
  });
  it('rejects malformed, missing, nonfinite and unbounded map geometry',()=>{
    for(const p of [null,{}, {...empty,extent:[0,0,0,10]},{...empty,land:[[[[NaN,0],[1,1],[2,2],[NaN,0]]]]},{...empty,rivers:[[[181,0],[0,0]]]},{...empty,labels:[{point:[0,0],rank:1,text:'x'.repeat(81)}]},{...empty,coast:[Array.from({length:200001},()=>[0,0])]}])expect(()=>validateGeography(p)).toThrow();
  });
  it('keeps all 700 invented demo points and unchanged original regression fixtures',()=>{
    const xml=cinematicGpx();expect(readFileSync('public/samples/cinematic-fjords.gpx','utf8')).toBe(xml);expect(xml).toContain('SYNTHETIC');const route=parseGpx(xml);expect(route.pointCount).toBe(700);expect(route.segments.length).toBe(1);expect(route.distanceKm).toBeGreaterThan(190);expect(route.distanceKm).toBeLessThan(210);expect(route.elevationGain).toBeUndefined();expect(parseGpx(readFileSync('public/samples/synthetic.gpx','utf8')).pointCount).toBe(9);
  });
});
