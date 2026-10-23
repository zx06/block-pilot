import { describe, it, expect } from 'vitest'
import { applyBulletHit, popChute, chuteCell } from '../game/combat'
import { FALL_MS_WITH_CHUTE, FALL_MS_NO_CHUTE, HITS_TO_DESTROY } from '../game/types'
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

  it('hitting chute cell pops chute', () => {
    const b = makeBlock()
    const ch = chuteCell(b)!
    const result = applyBulletHit(b, ch.r, ch.c)
    expect(result.chuteHit).toBe(true)
    expect(result.block?.hasChute).toBe(false)
    expect(result.block?.fallIntervalMs).toBe(FALL_MS_NO_CHUTE)
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
