import type { ShapeCell } from './types'

const COLORS = ['#38bdf8', '#a78bfa', '#34d399', '#fbbf24', '#fb7185', '#f472b6']

/** Classic tetromino-ish + small polyominoes (4×4 bbox, connected). */
const TEMPLATES: number[][][] = [
  // I
  [[1, 0, 0, 0], [1, 0, 0, 0], [1, 0, 0, 0], [1, 0, 0, 0]],
  // O
  [[1, 1, 0, 0], [1, 1, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
  // T
  [[0, 1, 0, 0], [1, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
  // L
  [[1, 0, 0, 0], [1, 0, 0, 0], [1, 1, 0, 0], [0, 0, 0, 0]],
  // J
  [[0, 1, 0, 0], [0, 1, 0, 0], [1, 1, 0, 0], [0, 0, 0, 0]],
  // S
  [[0, 1, 1, 0], [1, 1, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
  // Z
  [[1, 1, 0, 0], [0, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
  // small 3-cell
  [[1, 1, 0, 0], [1, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
  [[1, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
]

function rotate90(m: number[][]): number[][] {
  const n = m.length
  const out = Array.from({ length: n }, () => Array(n).fill(0))
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) out[c][n - 1 - r] = m[r][c]
  }
  return out
}

/** Check 4-connectivity of filled cells. */
export function isConnected(mask: number[][]): boolean {
  const cells: [number, number][] = []
  for (let r = 0; r < mask.length; r++) {
    for (let c = 0; c < mask[r].length; c++) {
      if (mask[r][c]) cells.push([r, c])
    }
  }
  if (cells.length === 0) return false
  const key = (r: number, c: number) => `${r},${c}`
  const set = new Set(cells.map(([r, c]) => key(r, c)))
  const q: [number, number][] = [cells[0]]
  const seen = new Set<string>([key(cells[0][0], cells[0][1])])
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]]
  while (q.length) {
    const [r, c] = q.pop()!
    for (const [dr, dc] of dirs) {
      const nr = r + dr
      const nc = c + dc
      const k = key(nr, nc)
      if (set.has(k) && !seen.has(k)) {
        seen.add(k)
        q.push([nr, nc])
      }
    }
  }
  return seen.size === cells.length
}

export function randomShape(
  rng: () => number = Math.random,
): { cells: ShapeCell[]; width: number; height: number } {
  let mask = TEMPLATES[Math.floor(rng() * TEMPLATES.length)].map((row) => [...row])
  const rot = Math.floor(rng() * 4)
  for (let i = 0; i < rot; i++) mask = rotate90(mask)

  // Trim empty rows/cols for placement width.
  let minR = 4, maxR = -1, minC = 4, maxC = -1
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (mask[r][c]) {
        minR = Math.min(minR, r)
        maxR = Math.max(maxR, r)
        minC = Math.min(minC, c)
        maxC = Math.max(maxC, c)
      }
    }
  }
  const color = COLORS[Math.floor(rng() * COLORS.length)]
  const cells: ShapeCell[] = []
  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      if (mask[r][c]) cells.push({ r: r - minR, c: c - minC, color })
    }
  }
  return {
    cells,
    width: maxC - minC + 1,
    height: maxR - minR + 1,
  }
}

/** Place shape at top with random horizontal offset into [0, cols-width]. */
export function placeShapeAtTop(
  shape: ReturnType<typeof randomShape>,
  cols: number,
  rng: () => number = Math.random,
): ShapeCell[] {
  const maxX = Math.max(0, cols - shape.width)
  const ox = Math.floor(rng() * (maxX + 1))
  // Start with shape just above visible top so chute is visible: row offset -1..0
  const oy = 0
  return shape.cells.map((c) => ({ r: c.r + oy, c: c.c + ox, color: c.color }))
}
