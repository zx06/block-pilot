import { describe, it, expect } from 'vitest'
import { isConnected, randomShape, placeShapeAtTop } from '../game/shapes'
import { COLS } from '../game/types'

describe('shape generation', () => {
  it('generates connected shapes within 4×4 bbox', () => {
    let seed = 1
    const rng = () => {
      seed = (seed * 16807) % 2147483647
      return (seed - 1) / 2147483646
    }
    for (let i = 0; i < 40; i++) {
      const shape = randomShape(rng)
      expect(shape.cells.length).toBeGreaterThan(0)
      expect(shape.width).toBeLessThanOrEqual(4)
      expect(shape.height).toBeLessThanOrEqual(4)
      const mask = Array.from({ length: 4 }, () => Array(4).fill(0))
      for (const c of shape.cells) {
        expect(c.r).toBeGreaterThanOrEqual(0)
        expect(c.c).toBeGreaterThanOrEqual(0)
        expect(c.r).toBeLessThan(4)
        expect(c.c).toBeLessThan(4)
        mask[c.r][c.c] = 1
      }
      expect(isConnected(mask)).toBe(true)
    }
  })

  it('places horizontally within board', () => {
    const rng = () => 0.42
    const shape = randomShape(rng)
    const placed = placeShapeAtTop(shape, COLS, rng)
    for (const c of placed) {
      expect(c.c).toBeGreaterThanOrEqual(0)
      expect(c.c).toBeLessThan(COLS)
    }
  })
})
