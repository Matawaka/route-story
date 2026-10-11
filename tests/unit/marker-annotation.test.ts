import { it, expect } from 'vitest';
import { annotationAt,intersectsMarker,markerSize } from '../../src/marker-annotation';
import { defaultStoryConfig,validateStoryConfig } from '../../src/story';
it('keeps the geographic anchor separate from a finite caption-safe annotation',()=>{
 for(const [w,h] of [[1280,720],[720,1280]])for(const x of [0,w/2,w])for(const y of [0,h/2,h]){
  const safe=[40,150,w-40,h-180] as const,a=annotationAt(x,y,.5,w,h,90,safe)!;
  expect(a.box[0]).toBeGreaterThanOrEqual(safe[0]);expect(a.box[1]).toBeGreaterThanOrEqual(safe[1]);expect(a.box[2]).toBeLessThanOrEqual(safe[2]);expect(a.box[3]).toBeLessThanOrEqual(safe[3]);expect(a).toEqual(annotationAt(x,y,.5,w,h,90,safe));
 }
});
it('never rescues an off-screen, behind-camera or invalid anchor',()=>{
 for(const [x,y,z] of [[-1,200,0],[721,200,0],[10,-1,0],[10,1281,0],[300,200,2],[300,200,-2],[NaN,200,0]])expect(annotationAt(x,y,z,720,1280,90,[40,150,680,1100])).toBeUndefined();
});
it('uses bounded sizes and detects endpoint label collisions',()=>{
 const c=defaultStoryConfig();expect(markerSize(c,720)).toBe(97.2);expect(markerSize({...c,markerSize:'large'},720)).toBeLessThan(125);expect(intersectsMarker([100,100,200,220],[180,200,230,240])).toBe(true);expect(intersectsMarker([100,100,200,220],[200,100,220,120])).toBe(false);
 for(const key of ['markerSize','markerPresentation'])expect(()=>validateStoryConfig({...c,[key]:'unbounded'})).toThrow();
});
