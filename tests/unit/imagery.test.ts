import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateImagery,imageryUV,imageryCoversTerrain} from '../../src/imagery';
import {TerrainDataset} from '../../src/terrain';
import {validateStoryConfig,defaultStoryConfig} from '../../src/story';
const manifest=JSON.parse(readFileSync('public/imagery/sogne-sentinel.json','utf8'));
describe('reviewed georeferenced photographic terrain',()=>{
 it('verifies real source crop provenance and bounded derivative checksum',()=>{const m=validateImagery(manifest),bytes=readFileSync('public/imagery/'+m.file);expect(bytes.length).toBe(m.bytes);expect(createHash('sha256').update(bytes).digest('hex')).toBe(m.sha256);expect(manifest.sources).toHaveLength(2);for(const s of manifest.sources)for(const a of s.assets)expect(a.cropSha256).toMatch(/^[a-f0-9]{64}$/);expect(manifest.coveragePixels).toBe(m.width*m.height);expect(Object.isFrozen(m.bounds)).toBe(true);});
 it('maps north/south/east/west and pixel centres without mirrored imagery',()=>{expect(imageryUV(manifest,[-15000,20000])).toEqual([0,0]);expect(imageryUV(manifest,[15000,-20000])).toEqual([1,1]);expect(imageryUV(manifest,[0,0])).toEqual([.5,.5]);const [u,v]=imageryUV(manifest,[-14990,19990]);expect(u).toBeCloseTo(.5/1500);expect(v).toBeCloseTo(.5/2000);expect(()=>imageryUV(manifest,[NaN,0])).toThrow();});
 it.each([{width:30000},{height:Infinity},{bytes:3*1024*1024},{file:'https://untrusted/image.jpg'},{bounds:[0,0,0,1]},{origin:[NaN,60]},{sha256:'z'.repeat(64)},{attribution:'unknown'},{spacingMeters:10}])('rejects unbounded, unreviewed or misaligned input %j',override=>expect(()=>validateImagery({...manifest,...override})).toThrow());
 it('requires entire mesh coverage and the same geographic origin',()=>{const m=JSON.parse(readFileSync('public/terrain/sogne.json','utf8')),l=m.lods[1],t=new TerrainDataset(m,l,new Int16Array(readFileSync('public/terrain/'+l.file).buffer.slice(0)));expect(imageryCoversTerrain(manifest,t)).toBe(true);expect(imageryCoversTerrain({...manifest,origin:[6,61.28]},t)).toBe(false);expect(imageryCoversTerrain({...manifest,bounds:[-15000,-20000,10000,20000]},t)).toBe(false);});
 it('keeps surface selection in the immutable export snapshot and rejects arbitrary modes',()=>{const c=validateStoryConfig({...defaultStoryConfig(),terrainSurface:'photo'});expect(c.terrainSurface).toBe('photo');expect(Object.isFrozen(c)).toBe(true);expect(()=>validateStoryConfig({...c,terrainSurface:'arbitrary' as 'photo'})).toThrow();});
});
