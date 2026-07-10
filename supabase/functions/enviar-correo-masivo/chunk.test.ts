import { describe, expect, it } from 'vitest'
import { chunk } from './chunk'

describe('chunk', () => {
  it('splits an array into groups of the given size', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })

  it('returns a single group when size is greater than or equal to the array length', () => {
    expect(chunk(['a', 'b'], 50)).toEqual([['a', 'b']])
  })

  it('returns an empty array of groups for empty input', () => {
    expect(chunk([], 50)).toEqual([])
  })

  it('treats size <= 0 as "one group with everything" rather than looping forever or splitting per-item', () => {
    expect(chunk([1, 2, 3], 0)).toEqual([[1, 2, 3]])
    expect(chunk([1, 2, 3], -5)).toEqual([[1, 2, 3]])
    expect(chunk([], 0)).toEqual([])
  })

  it('produces evenly-sized groups when length is an exact multiple of size (no short/long trailing group)', () => {
    expect(chunk([1, 2, 3, 4], 2)).toEqual([
      [1, 2],
      [3, 4],
    ])
  })
})
