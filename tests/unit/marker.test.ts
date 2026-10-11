import {describe,it,expect} from 'vitest';
import {markerFormat,MAX_MARKER_BYTES,MARKER_TEXTURE_SIDE} from '../../src/marker';
import {defaultStoryConfig,validateStoryConfig} from '../../src/story';
describe('safe local markers',()=>{
  it('sniffs authentic PNG signature instead of trusting extension',()=>{
    expect(markerFormat(Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0]))).toBe('image/png');
    expect(()=>markerFormat(Uint8Array.from([60,115,118,103,32,111,110,108,111,97,100,61]))).toThrow();
  });
  it('recognizes RIFF/WEBP and rejects unrelated RIFF payloads',()=>{
    expect(markerFormat(Uint8Array.from([82,73,70,70,0,0,0,0,87,69,66,80]))).toBe('image/webp');
    expect(()=>markerFormat(Uint8Array.from([82,73,70,70,0,0,0,0,87,65,86,69]))).toThrow();
  });
  it('has bounded file/decoded texture limits and immutable marker configuration',()=>{
    expect(MAX_MARKER_BYTES).toBe(1048576);
    expect(MARKER_TEXTURE_SIDE).toBe(256);
    const cfg=validateStoryConfig({...defaultStoryConfig(),markerStyle:'unicycle'});
    expect(cfg.markerStyle).toBe('unicycle');expect(Object.isFrozen(cfg)).toBe(true);
    expect(()=>validateStoryConfig({...defaultStoryConfig(),markerStyle:'<script>' as 'dot'})).toThrow();
    expect(defaultStoryConfig().markerStyle).toBe('dot');
  });
});