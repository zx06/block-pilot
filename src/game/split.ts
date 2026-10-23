import type { Cell, FallingBlock, ShapeCell } from './types'
import { COLS, ROWS, FALL_MS_NO_CHUTE } from './types'

const DIRS: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

function key(r: number, c: number) {
  return `${r},${c}`
}

/** 4-connected components of shape cells. */
export function connectedComponents(cells: ShapeCell[]): ShapeCell[][] {
  if (cells.length === 0) return []
  const byKey = new Map<string, ShapeCell>()
  for (const c of cells) byKey.set(key(c.r, c.c), c)
  const seen = new Set<string>()
  const groups: ShapeCell[][] = []

  for (const cell of cells) {
    const k0 = key(cell.r, cell.c)
    if (seen.has(k0)) continue
    const group: ShapeCell[] = []
    const q: ShapeCell[] = [cell]
    seen.add(k0)
    while (q.length) {
      const cur = q.pop()!
      group.push(cur)
      for (const [dr, dc] of DIRS) {
        const nk = key(cur.r + dr, cur.c + dc)
        if (byKey.has(nk) && !seen.has(nk)) {
          seen.add(nk)
          q.push(byKey.get(nk)!)
        }
      }
    }
    groups.push(group)
  }
  return groups
}

/**
 * After a cell is removed from a falling block, split into independent pieces.
 * Multiple components → each is a fast, no-chute FallingBlock.
 * Single component → keep original chute/speed flags (caller passes template).
 */
export function splitFallingAfterDestroy(
  remaining: ShapeCell[],
  template: FallingBlock,
  nextId: () => number,
): FallingBlock[] {
  if (remaining.length === 0) return []
  const groups = connectedComponents(remaining)
  if (groups.length === 1) {
    return [{ ...template, cells: groups[0] }]
  }
  return groups.map((cells) => ({
    id: nextId(),
    cells,
    hasChute: false,
    fallAccMs: 0,
    fallIntervalMs: FALL_MS_NO_CHUTE,
  }))
}

/** Occupied board cells as ShapeCell list. */
export function boardToCells(board: Cell[][]): ShapeCell[] {
  const out: ShapeCell[] = []
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = board[r][c]
      if (cell) out.push({ r, c, color: cell.color, hits: cell.hits })
    }
  }
  return out
}

/**
 * Mark cells grounded if 4-connected through occupied cells to the bottom row.
 * Ungrounded components are removed from the board and returned as floating groups.
 */
export function extractFloatingGroups(board: Cell[][]): {
  board: Cell[][]
  floating: ShapeCell[][]
} {
  const occupied = new Set<string>()
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c]) occupied.add(key(r, c))
    }
  }
  if (occupied.size === 0) {
    return { board, floating: [] }
  }

  const grounded = new Set<string>()
  const q: [number, number][] = []
  for (let c = 0; c < COLS; c++) {
    if (board[ROWS - 1][c]) {
      const k = key(ROWS - 1, c)
      grounded.add(k)
      q.push([ROWS - 1, c])
    }
  }
  while (q.length) {
    const [r, c] = q.pop()!
    for (const [dr, dc] of DIRS) {
      const nr = r + dr
      const nc = c + dc
      const nk = key(nr, nc)
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue
      if (!occupied.has(nk) || grounded.has(nk)) continue
      grounded.add(nk)
      q.push([nr, nc])
    }
  }

  const floatingCells: ShapeCell[] = []
  const next = board.map((row) => row.slice())
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = board[r][c]
      if (!cell) continue
      const k = key(r, c)
      if (!grounded.has(k)) {
        floatingCells.push({ r, c, color: cell.color, hits: cell.hits })
        next[r][c] = null
      }
    }
  }

  return {
    board: next,
    floating: connectedComponents(floatingCells),
  }
}

/** Turn floating cell groups into fast no-chute falling blocks. */
export function floatingToFalling(groups: ShapeCell[][], nextId: () => number): FallingBlock[] {
  return groups
    .filter((g) => g.length > 0)
    .map((cells) => ({
      id: nextId(),
      cells,
      hasChute: false,
      fallAccMs: 0,
      fallIntervalMs: FALL_MS_NO_CHUTE,
    }))
}
