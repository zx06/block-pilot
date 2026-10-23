import type { Cell, FallingBlock, ShapeCell } from './types'
import { HITS_TO_DESTROY, FALL_MS_NO_CHUTE, CHUTE_WIDTH, COLS, ROWS } from './types'
import { splitFallingAfterDestroy } from './split'

export type HitResult = {
  /** Updated single block before split (null if fully destroyed). */
  block: FallingBlock | null
  /** After destroy: 0..n independent pieces (already split). Empty if fully gone. */
  pieces: FallingBlock[]
  destroyedCell: boolean
  chuteHit: boolean
  /** True if this bullet interacted with the block (chute or body). */
  hit: boolean
}

export type BoardHitResult = {
  board: Cell[][]
  destroyed: boolean
  hit: boolean
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
 * - If falling cell: increment hits; remove at threshold and split if disconnected.
 */
export function applyBulletHit(
  block: FallingBlock,
  br: number,
  bc: number,
  nextId: () => number = () => block.id,
): HitResult {
  if (isChuteHit(block, br, bc)) {
    const updated = {
      ...block,
      hasChute: false,
      fallIntervalMs: FALL_MS_NO_CHUTE,
    }
    return {
      block: updated,
      pieces: [updated],
      destroyedCell: false,
      chuteHit: true,
      hit: true,
    }
  }

  const idx = block.cells.findIndex((c) => c.r === br && c.c === bc)
  if (idx < 0) {
    return {
      block,
      pieces: [block],
      destroyedCell: false,
      chuteHit: false,
      hit: false,
    }
  }

  const cells: ShapeCell[] = block.cells.map((c, i) => {
    if (i !== idx) return c
    return { ...c, hits: (c.hits ?? 0) + 1 }
  })

  const hits = cells[idx].hits ?? 0
  if (hits >= HITS_TO_DESTROY) {
    const remaining = cells.filter((_, i) => i !== idx)
    if (remaining.length === 0) {
      return {
        block: null,
        pieces: [],
        destroyedCell: true,
        chuteHit: false,
        hit: true,
      }
    }
    const template: FallingBlock = { ...block, cells: remaining }
    const pieces = splitFallingAfterDestroy(remaining, template, nextId)
    return {
      block: pieces.length === 1 ? pieces[0] : null,
      pieces,
      destroyedCell: true,
      chuteHit: false,
      hit: true,
    }
  }

  const updated = { ...block, cells }
  return {
    block: updated,
    pieces: [updated],
    destroyedCell: false,
    chuteHit: false,
    hit: true,
  }
}

/** Hit a locked board cell; destroy after HITS_TO_DESTROY. */
export function applyBoardHit(board: Cell[][], br: number, bc: number): BoardHitResult {
  if (br < 0 || br >= ROWS || bc < 0 || bc >= COLS) {
    return { board, destroyed: false, hit: false }
  }
  const cell = board[br][bc]
  if (!cell) return { board, destroyed: false, hit: false }

  const next = board.map((row) => row.slice())
  const hits = (cell.hits ?? 0) + 1
  if (hits >= HITS_TO_DESTROY) {
    next[br][bc] = null
    return { board: next, destroyed: true, hit: true }
  }
  next[br][bc] = { ...cell, hits }
  return { board: next, destroyed: false, hit: true }
}

/** Destroy parachute without hitting a body cell. */
export function popChute(block: FallingBlock): FallingBlock {
  return {
    ...block,
    hasChute: false,
    fallIntervalMs: FALL_MS_NO_CHUTE,
  }
}
