import type { FallingBlock, ShapeCell } from './types'
import { HITS_TO_DESTROY, FALL_MS_NO_CHUTE } from './types'

export type HitResult = {
  block: FallingBlock | null
  destroyedCell: boolean
  chuteHit: boolean
}

/** Chute occupies the cell directly above the topmost / leftmost top cell. */
export function chuteCell(block: FallingBlock): { r: number; c: number } | null {
  if (!block.hasChute || block.cells.length === 0) return null
  let top = block.cells[0]
  for (const cell of block.cells) {
    if (cell.r < top.r || (cell.r === top.r && cell.c < top.c)) top = cell
  }
  return { r: top.r - 1, c: top.c }
}

/**
 * Apply one bullet hit at integer grid (br, bc).
 * - If chute cell: destroy chute and accelerate.
 * - If falling cell: increment hits; remove at threshold.
 */
export function applyBulletHit(block: FallingBlock, br: number, bc: number): HitResult {
  const chute = chuteCell(block)
  if (chute && chute.r === br && chute.c === bc) {
    return {
      block: {
        ...block,
        hasChute: false,
        fallIntervalMs: FALL_MS_NO_CHUTE,
      },
      destroyedCell: false,
      chuteHit: true,
    }
  }

  const idx = block.cells.findIndex((c) => c.r === br && c.c === bc)
  if (idx < 0) {
    return { block, destroyedCell: false, chuteHit: false }
  }

  const cells: ShapeCell[] = block.cells.map((c, i) => {
    if (i !== idx) return c
    return { ...c, hits: (c.hits ?? 0) + 1 }
  })

  const hits = cells[idx].hits ?? 0
  if (hits >= HITS_TO_DESTROY) {
    const remaining = cells.filter((_, i) => i !== idx)
    if (remaining.length === 0) {
      return { block: null, destroyedCell: true, chuteHit: false }
    }
    return {
      block: { ...block, cells: remaining },
      destroyedCell: true,
      chuteHit: false,
    }
  }

  return {
    block: { ...block, cells },
    destroyedCell: false,
    chuteHit: false,
  }
}

/** Destroy parachute without hitting a body cell. */
export function popChute(block: FallingBlock): FallingBlock {
  return {
    ...block,
    hasChute: false,
    fallIntervalMs: FALL_MS_NO_CHUTE,
  }
}
