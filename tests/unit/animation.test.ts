import { describe, expect, it } from 'vitest';
import { progressAt } from '../../src/animation';
describe('deterministic time state', () => {
  it('clamps and holds the finished frame', () => { expect(progressAt(-1)).toBe(0); expect(progressAt(3.5)).toBe(1); expect(progressAt(5)).toBe(1); });
  it('is pure and monotonic', () => { const values = Array.from({ length: 97 }, (_, i) => progressAt(i / 24)); expect(values).toEqual(Array.from({ length: 97 }, (_, i) => progressAt(i / 24))); expect(values.every((v, i) => i === 0 || v >= values[i - 1])).toBe(true); });
  it('rejects non-finite time', () => { expect(() => progressAt(NaN)).toThrow(); expect(() => progressAt(1, 0)).toThrow(); });
});
