import { describe, it, expect } from 'vitest';
import { inspectMarker, MARKER_LIMITS } from '../../src/marker';
import { validateStoryConfig, defaultStoryConfig } from '../../src/story';
const png=(width=32,height=16)=>{const b=new Uint8Array(58),v=new DataView(b.buffer);b.set([137,80,78,71,13,10,26,10]);v.setUint32(8,13);b.set([73,72,68,82],12);v.setUint32(16,width);v.setUint32(20,height);v.setUint32(33,1);b.set([73,68,65,84],37);b.set([73,69,78,68],50);return b;};
const webp=(width=32,height=16)=>{const b=new Uint8Array(26),v=new DataView(b.buffer);b.set(new TextEncoder().encode('RIFF'));v.setUint32(4,18,true);b.set(new TextEncoder().encode('WEBPVP8L'),8);v.setUint32(16,5,true);b[20]=47;v.setUint32(21,((height-1)<<14)|(width-1),true);return b;};
describe('marker file admission before decode',()=>{
  it('accepts signed static PNG/WebP and exact bounded dimensions',()=>{expect(inspectMarker(png(1024,1024),'image/png')).toEqual({type:'image/png',width:1024,height:1024});expect(inspectMarker(webp(),'image/webp')).toEqual({type:'image/webp',width:32,height:16});});
  it.each([0,1025,0xffffffff])('rejects dimensions %s before decode',width=>expect(()=>inspectMarker(png(width))).toThrow());
  it('rejects SVG/JPEG, spoofed MIME, truncation and invalid RIFF sizes',()=>{
    expect(()=>inspectMarker(new TextEncoder().encode('<svg onload="alert(1)"></svg>'),'image/png')).toThrow();expect(()=>inspectMarker(png(),'image/webp')).toThrow();expect(()=>inspectMarker(png().slice(0,34))).toThrow();const b=webp();b[4]=1;expect(()=>inspectMarker(b)).toThrow();
  });
  it('rejects oversized and animated data',()=>{
    expect(()=>inspectMarker(new Uint8Array(MARKER_LIMITS.bytes+1))).toThrow();const b=png();b.set(new TextEncoder().encode('acTL'),37);expect(()=>inspectMarker(b)).toThrow();const w=webp();w.set(new TextEncoder().encode('ANIM'),12);expect(()=>inspectMarker(w)).toThrow();
  });
  it('rejects duplicate headers/images that could disagree with decoder dimensions',()=>{
    const p=png(),duplicate=new Uint8Array(p.length+25);duplicate.set(p.subarray(0,33));duplicate.set(p.subarray(8,33),33);duplicate.set(p.subarray(33),58);expect(()=>inspectMarker(duplicate)).toThrow();
    const w=webp(),extra=new Uint8Array(w.length+14);extra.set(w);extra.set(w.subarray(12),26);new DataView(extra.buffer).setUint32(4,extra.length-8,true);expect(()=>inspectMarker(extra)).toThrow();
    const header=new Uint8Array(18);header.set(new TextEncoder().encode('VP8X'));new DataView(header.buffer).setUint32(4,10,true);header[12]=31;header[15]=15;
    const extended=new Uint8Array(w.length+36);extended.set(w.subarray(0,12));extended.set(header,12);extended.set(header,30);extended.set(w.subarray(12),48);new DataView(extended.buffer).setUint32(4,extended.length-8,true);expect(()=>inspectMarker(extended)).toThrow();
  });
  it('validates opt-in immutable configuration and retains regression defaults',()=>{
    const c=validateStoryConfig({...defaultStoryConfig(),marker:'unicycle',routeColor:'grade',replayPacing:'terrain'});expect(Object.isFrozen(c)).toBe(true);expect(c.marker).toBe('unicycle');
    for(const key of ['marker','routeColor','replayPacing'])expect(()=>validateStoryConfig({...c,[key]:'https://untrusted.invalid'})).toThrow();expect(defaultStoryConfig()).toMatchObject({marker:'point',routeColor:'plain',replayPacing:'distance'});
  });
});
