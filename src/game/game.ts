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
import { createEmptyBoard, clearFullLines, canOccupy, lockCells } from './board'
import { randomShape, placeShapeAtTop } from './shapes'
import { applyBulletHit, chuteCells, isChuteHit } from './combat'

export function createGame(): GameState {
  return {
    phase: 'playing',
    board: createEmptyBoard(),
    falling: null,
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

function spawnBlock(state: GameState, rng: () => number = Math.random): FallingBlock {
  const shape = randomShape(rng)
  const cells = placeShapeAtTop(shape, COLS, rng)
  return {
    id: state.nextId,
    cells,
    hasChute: true,
    fallAccMs: 0,
    fallIntervalMs: FALL_MS_WITH_CHUTE,
  }
}

function cellsCollideBoard(board: GameState['board'], cells: { r: number; c: number }[]): boolean {
  return cells.some((c) => !canOccupy(board, c.r, c.c))
}

function tryMoveFalling(state: GameState, dr: number, dc: number): boolean {
  if (!state.falling) return false
  const next = state.falling.cells.map((c) => ({ ...c, r: c.r + dr, c: c.c + dc }))
  if (cellsCollideBoard(state.board, next)) return false
  if (next.some((c) => c.r >= ROWS)) return false
  state.falling = { ...state.falling, cells: next }
  return true
}

function lockFalling(state: GameState) {
  if (!state.falling) return
  state.board = lockCells(state.board, state.falling.cells)
  state.falling = null
  const { board, cleared } = clearFullLines(state.board)
  state.board = board
  if (cleared > 0) {
    state.linesCleared += cleared
    state.score += [0, 100, 300, 500, 800][cleared] ?? cleared * 200
  }
  state.spawnCooldownMs = 350
}

function planeHitCheck(state: GameState) {
  if (state.invulnMs > 0) return
  const pc = state.planeCol
  const pr = state.planeRow
  const hitStack = pr >= 0 && pr < ROWS && state.board[pr]?.[pc] != null
  const hitFallBody = state.falling?.cells.some((c) => c.r === pr && c.c === pc) ?? false
  const hitFallChute = state.falling ? isChuteHit(state.falling, pr, pc) : false
  if (hitStack || hitFallBody || hitFallChute) {
    state.lives -= 1
    state.invulnMs = 1200
    state.score = Math.max(0, state.score - 20)
    if (state.lives <= 0) {
      state.phase = 'gameover'
    }
  }
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

      if (br >= 0 && br < ROWS && bc >= 0 && bc < COLS && state.board[br][bc]) {
        alive = false
        break
      }

      if (state.falling) {
        const result = applyBulletHit(state.falling, br, bc)
        if (result.chuteHit || result.destroyedCell || result.block !== state.falling) {
          state.falling = result.block
          if (result.destroyedCell) state.score += 15
          if (result.chuteHit) state.score += 5
          alive = false
          break
        }
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
 * Returns whether the position changed.
 */
export function movePlane(state: GameState, dc: number, dr = 0): boolean {
  if (state.phase !== 'playing') return false
  const nc = state.planeCol + dc
  const nr = state.planeRow + dr
  if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) return false
  // 别穿墙：不能进入已落地堆叠
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
    id: state.nextId++,
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

  if (!state.falling && state.spawnCooldownMs <= 0) {
    state.falling = spawnBlock(state, rng)
    state.nextId++
  }

  if (state.falling) {
    state.falling.fallAccMs += dtMs
    while (state.falling && state.falling.fallAccMs >= state.falling.fallIntervalMs) {
      state.falling.fallAccMs -= state.falling.fallIntervalMs
      const moved = tryMoveFalling(state, 1, 0)
      if (!moved) {
        lockFalling(state)
        break
      }
    }
  }

  planeHitCheck(state)
  return state
}

// re-export for tests that need chute geometry
export { chuteCells }
