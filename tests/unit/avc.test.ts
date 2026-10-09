import { expect, it } from 'vitest';
import { normalizeAvcDescription } from '../../src/avc';
const fromHex=(hex:string)=>Uint8Array.from(hex.match(/../g)!.map(b=>parseInt(b,16)));
const broken=fromHex('0142c01e03010019676742c01e95b0280bfe5840000003004000000c03682211b80100056868ca8f20');
const fixed=fromHex('0142c01effe100186742c01e95b0280bfe5840000003004000000c03682211b801000468ca8f20');
it('repairs only the reproduced duplicate header, adjusts lengths and reserved bits',()=>{
  const before=broken.slice();expect(normalizeAvcDescription(broken)).toEqual(fixed);expect(broken).toEqual(before);
});
it('preserves a well-formed description byte for byte and accepts an offset view',()=>{
  expect(normalizeAvcDescription(fixed)).toEqual(fixed);const wrapped=new Uint8Array(fixed.length+4);wrapped.set(fixed,2);expect(normalizeAvcDescription(wrapped.subarray(2,-2))).toEqual(fixed);
});
it.each([new Uint8Array(),broken.slice(0,8),fromHex('0142c01effe100ffff'),new Uint8Array(1024*1024+1)])('rejects malformed or excessive configuration without guessing',input=>expect(()=>normalizeAvcDescription(input)).toThrow('H.264'));
it('rejects an unknown SPS corruption instead of removing arbitrary bytes',()=>{
  const unknown=broken.slice();unknown[10]=0x43;expect(()=>normalizeAvcDescription(unknown)).toThrow('H.264');
});
