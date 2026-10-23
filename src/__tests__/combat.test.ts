import { describe, it, expect } from 'vitest'
import { applyBulletHit, popChute, chuteCell, chuteCells, isChuteHit } from '../game/combat'
import {
  FALL_MS_WITH_CHUTE,
  FALL_MS_NO_CHUTE,
  HITS_TO_DESTROY,
  CHUTE_WIDTH,
} from '../game/types'
import type { FallingBlock } from '../game/types'

function makeBlock(cells = [{ r: 2, c: 4, color: '#38bdf8' }]): FallingBlock {
  return {
    id: 1,
    cells,
    hasChute: true,
    fallAccMs: 0,
    fallIntervalMs: FALL_MS_WITH_CHUTE,
  }
}

describe('chute break accelerates', () => {
  it('popChute switches to fast fall interval', () => {
    const b = makeBlock()
    expect(b.fallIntervalMs).toBe(FALL_MS_WITH_CHUTE)
    const next = popChute(b)
    expect(next.hasChute).toBe(false)
    expect(next.fallIntervalMs).toBe(FALL_MS_NO_CHUTE)
  })

  it('chute spans 3 cells centered on block', () => {
    const b = makeBlock([
      { r: 3, c: 2, color: '#a' },
      { r: 3, c: 3, color: '#a' },
      { r: 3, c: 4, color: '#a' },
    ])
    const cells = chuteCells(b)
    expect(cells).toHaveLength(CHUTE_WIDTH)
    expect(cells.every((c) => c.r === 2)).toBe(true)
    expect(cells.map((c) => c.c).sort((a, b) => a - b)).toEqual([2, 3, 4])
  })

  it('narrow block still gets 3-wide centered chute', () => {
    const b = makeBlock([{ r: 5, c: 5, color: '#b' }])
    const cells = chuteCells(b)
    expect(cells).toHaveLength(3)
    expect(cells.map((c) => c.c)).toEqual([4, 5, 6])
    expect(cells[0].r).toBe(4)
  })

  it('hitting any chute cell pops chute', () => {
    const b = makeBlock([
      { r: 3, c: 2, color: '#a' },
      { r: 3, c: 3, color: '#a' },
      { r: 3, c: 4, color: '#a' },
    ])
    const cells = chuteCells(b)
    // hit leftmost
    const left = applyBulletHit(b, cells[0].r, cells[0].c)
    expect(left.chuteHit).toBe(true)
    expect(left.block?.hasChute).toBe(false)
    expect(left.block?.fallIntervalMs).toBe(FALL_MS_NO_CHUTE)

    // hit rightmost on fresh block
    const b2 = makeBlock([
      { r: 3, c: 2, color: '#a' },
      { r: 3, c: 3, color: '#a' },
      { r: 3, c: 4, color: '#a' },
    ])
    const right = chuteCells(b2)[2]
    const r = applyBulletHit(b2, right.r, right.c)
    expect(r.chuteHit).toBe(true)
    expect(isChuteHit(b2, right.r, right.c)).toBe(true)
  })

  it('chuteCell still returns center for compat', () => {
    const b = makeBlock([{ r: 2, c: 4, color: '#38bdf8' }])
    const mid = chuteCell(b)!
    expect(mid).toEqual({ r: 1, c: 4 })
  })
})

describe('hit destroys falling cells', () => {
  it(`removes a cell after ${HITS_TO_DESTROY} hits`, () => {
    let block: FallingBlock | null = makeBlock([
      { r: 3, c: 2, color: '#a' },
      { r: 3, c: 3, color: '#a' },
    ])
    let destroyed = false
    for (let i = 0; i < HITS_TO_DESTROY; i++) {
      const r = applyBulletHit(block!, 3, 2)
      block = r.block
      destroyed = r.destroyedCell
    }
    expect(destroyed).toBe(true)
    expect(block?.cells.length).toBe(1)
    expect(block?.cells[0].c).toBe(3)
  })

  it('destroys whole block when last cell gone', () => {
    let block: FallingBlock | null = makeBlock([{ r: 1, c: 1, color: '#b' }])
    for (let i = 0; i < HITS_TO_DESTROY; i++) {
      const r = applyBulletHit(block!, 1, 1)
      block = r.block
    }
    expect(block).toBeNull()
  })
})
