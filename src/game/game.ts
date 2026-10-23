import {
  COLS,
  ROWS,
  MAX_LIVES,
  PLANE_Y,
  FALL_MS_WITH_CHUTE,
  BULLET_SPEED_CELLS_PER_SEC,
  FIRE_COOLDOWN_MS,
  type GameState,
  type FallingBlock,
  type Bullet,
} from './types'
import { createEmptyBoard, clearFullLines, canOccupy, lockCells } from './board'
import { randomShape, placeShapeAtTop } from './shapes'
import { applyBulletHit, chuteCell } from './combat'

export function createGame(): GameState {
  return {
    phase: 'playing',
    board: createEmptyBoard(),
    falling: null,
    planeCol: Math.floor(COLS / 2),
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
  // also can't go below floor
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
  const pr = PLANE_Y
  const hitStack = state.board[pr]?.[pc] != null
  const hitFall =
    state.falling?.cells.some((c) => c.r === pr && c.c === pc) ||
    (state.falling && (() => {
      const ch = chuteCell(state.falling!)
      return ch && ch.r === pr && ch.c === pc
    })())
  if (hitStack || hitFall) {
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
    let y = b.y - dy
    let x = b.x
    let alive = true

    // sample along path for collision
    const steps = Math.max(1, Math.ceil(dy * 2))
    for (let i = 1; i <= steps && alive; i++) {
      const sy = b.y - (dy * i) / steps
      const br = Math.floor(sy)
      const bc = Math.floor(x + 0.0001)

      if (br < -2) {
        alive = false
        break
      }

      // stacked cells: first version cannot pierce (bullet stops, no damage)
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
        // also check chute cell explicitly when apply didn't (same)
        const ch = state.falling ? chuteCell(state.falling) : null
        if (ch && ch.r === br && ch.c === bc) {
          const r2 = applyBulletHit(state.falling, br, bc)
          state.falling = r2.block
          state.score += 5
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

export function movePlane(state: GameState, dir: -1 | 1) {
  if (state.phase !== 'playing') return
  state.planeCol = Math.max(0, Math.min(COLS - 1, state.planeCol + dir))
}

export function fire(state: GameState) {
  if (state.phase !== 'playing') return
  if (state.fireCooldownMs > 0) return
  state.bullets.push({
    id: state.nextId++,
    x: state.planeCol + 0.5,
    y: PLANE_Y - 0.2,
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
