/** Narrow repair for Mozilla bug 2049470, reproduced in Firefox 157 on Windows.
 * Only out-of-band duplicated SPS/PPS headers are repaired; encoded frames are untouched.
 * https://bugzilla.mozilla.org/show_bug.cgi?id=2049470
 */
export function normalizeAvcDescription(input: AllowSharedBufferSource): Uint8Array<ArrayBuffer> {
  const bytes = Uint8Array.from(ArrayBuffer.isView(input) ? new Uint8Array(input.buffer, input.byteOffset, input.byteLength) : new Uint8Array(input));
  const invalid = () => { throw new Error('Кодировщик вернул некорректные параметры H.264. Попробуйте Chrome или Edge.'); };
  if (bytes.length < 7 || bytes.length > 1024 * 1024 || bytes[0] !== 1) return invalid();
  let offset = 6;
  const readNals = (count: number, type: number): Uint8Array[] => {
    if (!count) return invalid();
    const result: Uint8Array[] = [];
    for (let i = 0; i < count; i++) {
      if (offset + 2 > bytes.length) return invalid();
      const size = bytes[offset] * 256 + bytes[offset + 1]; offset += 2;
      if (!size || offset + size > bytes.length) return invalid();
      const nal = bytes.slice(offset, offset + size); offset += size;
      if ((nal[0] & 31) !== type) return invalid(); result.push(nal);
    }
    return result;
  };
  const sps = readNals(bytes[5] & 31, 7);
  if (offset >= bytes.length) return invalid();
  const pps = readNals(bytes[offset++], 8);
  const matchesProfile = (nal: Uint8Array, start: number) => nal[start] === bytes[1] && nal[start + 1] === bytes[2] && nal[start + 2] === bytes[3];
  if (sps.every(nal => matchesProfile(nal, 1))) return bytes;
  // Match the exact demonstrated defect, not a browser name or a speculative byte heuristic.
  if (!sps.every(nal => nal.length >= 5 && nal[0] === nal[1] && matchesProfile(nal, 2)) || !pps.every(nal => nal.length >= 3 && nal[0] === nal[1])) return invalid();
  const fixed: number[] = [...bytes.slice(0, 5), 0xe0 | sps.length]; fixed[4] |= 0xfc;
  const write = (nals: Uint8Array[]) => { for (const nal of nals) { const size = nal.length - 1; fixed.push(size >>> 8, size & 255, ...nal.slice(1)); } };
  write(sps); fixed.push(pps.length); write(pps); fixed.push(...bytes.slice(offset));
  return Uint8Array.from(fixed);
}
