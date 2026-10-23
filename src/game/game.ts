import {
  COLS,
  ROWS,
  MAX_LIVES,
  PLANE_START_ROW,
  FALL_MS_WITH_CHUTE,
  BULLET_SPEED_CELLS_PER_SEC,
  FIRE_COOLDOWN_MS,
  type GameState,
  type FallingBlock,
  type Bullet,
} from './types'
import { createEmptyBoard, clearFullLines, lockCells } from './board'
import { randomShape, placeShapeAtTop } from './shapes'
import {
  applyBulletHit,
  applyBoardHit,
  chuteCells,
  isChuteHit,
} from './combat'
import { extractFloatingGroups, floatingToFalling } from './split'

export function createGame(): GameState {
  return {
    phase: 'playing',
    board: createEmptyBoard(),
    falling: [],
    planeCol: Math.floor(COLS / 2),
    planeRow: PLANE_START_ROW,
    lives: MAX_LIVES,
    score: 0,
    bullets: [],
    fireCooldownMs: 0,
    spawnCooldownMs: 0,
    invulnMs: 0,
    nextId: 1,
    linesCleared: 0,
  }
}

function allocId(state: GameState): number {
  const id = state.nextId
  state.nextId++
  return id
}

function spawnBlock(state: GameState, rng: () => number = Math.random): FallingBlock {
  const shape = randomShape(rng)
  const cells = placeShapeAtTop(shape, COLS, rng)
  return {
    id: allocId(state),
    cells,
    hasChute: true,
    fallAccMs: 0,
    fallIntervalMs: FALL_MS_WITH_CHUTE,
  }
}

function allOccupiedExcept(
  state: GameState,
  exceptId: number,
): Set<string> {
  const set = new Set<string>()
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (state.board[r][c]) set.add(`${r},${c}`)
    }
  }
  for (const b of state.falling) {
    if (b.id === exceptId) continue
    for (const cell of b.cells) set.add(`${cell.r},${cell.c}`)
  }
  return set
}

function cellsFree(
  state: GameState,
  exceptId: number,
  cells: { r: number; c: number }[],
): boolean {
  const blocked = allOccupiedExcept(state, exceptId)
  for (const c of cells) {
    if (c.c < 0 || c.c >= COLS || c.r >= ROWS) return false
    if (c.r >= 0 && blocked.has(`${c.r},${c.c}`)) return false
  }
  return true
}

function tryMoveBlock(state: GameState, block: FallingBlock, dr: number, dc: number): FallingBlock | null {
  const nextCells = block.cells.map((c) => ({ ...c, r: c.r + dr, c: c.c + dc }))
  if (nextCells.some((c) => c.r >= ROWS)) return null
  if (!cellsFree(state, block.id, nextCells)) return null
  return { ...block, cells: nextCells }
}

function applyLineClear(state: GameState) {
  const { board, cleared } = clearFullLines(state.board)
  state.board = board
  if (cleared > 0) {
    state.linesCleared += cleared
    state.score += [0, 100, 300, 500, 800][cleared] ?? cleared * 200
  }
}

function lockBlock(state: GameState, block: FallingBlock) {
  state.board = lockCells(state.board, block.cells)
  state.falling = state.falling.filter((b) => b.id !== block.id)
  applyLineClear(state)
  if (state.falling.length === 0) {
    state.spawnCooldownMs = Math.max(state.spawnCooldownMs, 350)
  }
}

function afterBoardDestroy(state: GameState) {
  const { board, floating } = extractFloatingGroups(state.board)
  state.board = board
  if (floating.length > 0) {
    const spawned = floatingToFalling(floating, () => allocId(state))
    state.falling.push(...spawned)
  }
  applyLineClear(state)
}

function planeHitCheck(state: GameState) {
  if (state.invulnMs > 0) return
  const pc = state.planeCol
  const pr = state.planeRow
  const hitStack = pr >= 0 && pr < ROWS && state.board[pr]?.[pc] != null
  let hitFall = false
  for (const b of state.falling) {
    if (b.cells.some((c) => c.r === pr && c.c === pc) || isChuteHit(b, pr, pc)) {
      hitFall = true
      break
    }
  }
  if (hitStack || hitFall) {
    state.lives -= 1
    state.invulnMs = 1200
    state.score = Math.max(0, state.score - 20)
    if (state.lives <= 0) {
      state.phase = 'gameover'
    }
  }
}

/**
 * Resolve one grid sample for a bullet.
 * Priority: falling chute/body first, then locked board. One target only.
 */
function hitAt(state: GameState, br: number, bc: number): boolean {
  // 1) falling pieces (chute or body)
  for (let i = 0; i < state.falling.length; i++) {
    const block = state.falling[i]
    const result = applyBulletHit(block, br, bc, () => allocId(state))
    if (!result.hit) continue

    if (result.chuteHit) state.score += 5
    if (result.destroyedCell) state.score += 15

    // replace this block with resulting pieces
    const others = state.falling.filter((b) => b.id !== block.id)
    state.falling = [...others, ...result.pieces]
    return true
  }

  // 2) locked board
  if (br >= 0 && br < ROWS && bc >= 0 && bc < COLS && state.board[br][bc]) {
    const result = applyBoardHit(state.board, br, bc)
    state.board = result.board
    if (result.destroyed) {
      state.score += 15
      afterBoardDestroy(state)
    }
    return result.hit
  }

  return false
}

function updateBullets(state: GameState, dtMs: number) {
  const dy = (BULLET_SPEED_CELLS_PER_SEC * dtMs) / 1000
  const nextBullets: Bullet[] = []
  for (const b of state.bullets) {
    const y = b.y - dy
    const x = b.x
    let alive = true

    const steps = Math.max(1, Math.ceil(dy * 2))
    for (let i = 1; i <= steps && alive; i++) {
      const sy = b.y - (dy * i) / steps
      const br = Math.floor(sy)
      const bc = Math.floor(x + 0.0001)

      if (br < -2) {
        alive = false
        break
      }

      if (hitAt(state, br, bc)) {
        alive = false
        break
      }
    }

    if (alive) {
      nextBullets.push({ ...b, y, x })
    }
  }
  state.bullets = nextBullets
}

/**
 * Move plane by (dc, dr). Stays in board; cannot enter stacked cells (wall).
 */
export function movePlane(state: GameState, dc: number, dr = 0): boolean {
  if (state.phase !== 'playing') return false
  const nc = state.planeCol + dc
  const nr = state.planeRow + dr
  if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) return false
  if (state.board[nr][nc] != null) return false
  if (nc === state.planeCol && nr === state.planeRow) return false
  state.planeCol = nc
  state.planeRow = nr
  return true
}

export function fire(state: GameState) {
  if (state.phase !== 'playing') return
  if (state.fireCooldownMs > 0) return
  state.bullets.push({
    id: allocId(state),
    x: state.planeCol + 0.5,
    y: state.planeRow - 0.2,
  })
  state.fireCooldownMs = FIRE_COOLDOWN_MS
}

export function togglePause(state: GameState) {
  if (state.phase === 'playing') state.phase = 'paused'
  else if (state.phase === 'paused') state.phase = 'playing'
}

export function restart(_state?: GameState): GameState {
  return createGame()
}

export function tick(state: GameState, dtMs: number, rng: () => number = Math.random): GameState {
  if (state.phase !== 'playing') return state

  state.fireCooldownMs = Math.max(0, state.fireCooldownMs - dtMs)
  state.spawnCooldownMs = Math.max(0, state.spawnCooldownMs - dtMs)
  state.invulnMs = Math.max(0, state.invulnMs - dtMs)

  updateBullets(state, dtMs)

  if (state.falling.length === 0 && state.spawnCooldownMs <= 0) {
    state.falling.push(spawnBlock(state, rng))
  }

  // Advance each falling block once this frame; lock those that cannot move down.
  const ids = state.falling.map((b) => b.id)
  for (const id of ids) {
    const idx = state.falling.findIndex((b) => b.id === id)
    if (idx < 0) continue
    let live = state.falling[idx]
    live = { ...live, fallAccMs: live.fallAccMs + dtMs }
    state.falling[idx] = live
    while (true) {
      const curIdx = state.falling.findIndex((b) => b.id === id)
      if (curIdx < 0) break
      live = state.falling[curIdx]
      if (live.fallAccMs < live.fallIntervalMs) break
      live = { ...live, fallAccMs: live.fallAccMs - live.fallIntervalMs }
      state.falling[curIdx] = live
      const moved = tryMoveBlock(state, live, 1, 0)
      if (!moved) {
        lockBlock(state, live)
        break
      }
      state.falling[curIdx] = moved
    }
  }

  planeHitCheck(state)
  return state
}

/** Test helpers: expose gravity / split without full tick. */
export function debugHitFalling(
  state: GameState,
  blockId: number,
  br: number,
  bc: number,
): void {
  const block = state.falling.find((b) => b.id === blockId)
  if (!block) return
  const result = applyBulletHit(block, br, bc, () => allocId(state))
  if (!result.hit) return
  const others = state.falling.filter((b) => b.id !== blockId)
  state.falling = [...others, ...result.pieces]
}

export function debugHitBoard(state: GameState, br: number, bc: number): void {
  const result = applyBoardHit(state.board, br, bc)
  state.board = result.board
  if (result.destroyed) afterBoardDestroy(state)
}

export function debugLockAll(state: GameState): void {
  for (const b of [...state.falling]) {
    lockBlock(state, b)
  }
}

export { chuteCells, extractFloatingGroups, floatingToFalling }
