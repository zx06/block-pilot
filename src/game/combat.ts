import type { FallingBlock, ShapeCell } from './types'
import { HITS_TO_DESTROY, FALL_MS_NO_CHUTE, CHUTE_WIDTH } from './types'

export type HitResult = {
  block: FallingBlock | null
  destroyedCell: boolean
  chuteHit: boolean
}

export type ChuteCell = { r: number; c: number }

/**
 * Parachute: CHUTE_WIDTH cells in one row above the block's top,
 * horizontally centered on the block's bounding box.
 */
export function chuteCells(block: FallingBlock): ChuteCell[] {
  if (!block.hasChute || block.cells.length === 0) return []
  let minR = Infinity
  let minC = Infinity
  let maxC = -Infinity
  for (const cell of block.cells) {
    if (cell.r < minR) minR = cell.r
    if (cell.c < minC) minC = cell.c
    if (cell.c > maxC) maxC = cell.c
  }
  const blockCenter = (minC + maxC) / 2
  const startC = Math.round(blockCenter - (CHUTE_WIDTH - 1) / 2)
  const row = minR - 1
  const cells: ChuteCell[] = []
  for (let i = 0; i < CHUTE_WIDTH; i++) {
    cells.push({ r: row, c: startC + i })
  }
  return cells
}

/** @deprecated use chuteCells — single-cell helper for tests/compat */
export function chuteCell(block: FallingBlock): ChuteCell | null {
  const cells = chuteCells(block)
  if (cells.length === 0) return null
  return cells[Math.floor(cells.length / 2)]
}

export function isChuteHit(block: FallingBlock, br: number, bc: number): boolean {
  return chuteCells(block).some((c) => c.r === br && c.c === bc)
}

/**
 * Apply one bullet hit at integer grid (br, bc).
 * - If any chute cell: destroy chute and accelerate.
 * - If falling cell: increment hits; remove at threshold.
 */
export function applyBulletHit(block: FallingBlock, br: number, bc: number): HitResult {
  if (isChuteHit(block, br, bc)) {
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
