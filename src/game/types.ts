/** Board size (visible). */
export const COLS = 10
export const ROWS = 20

/** Hits needed to destroy one falling cell. */
export const HITS_TO_DESTROY = 2

/** Slow fall with parachute; fast after chute destroyed. */
export const FALL_MS_WITH_CHUTE = 900
export const FALL_MS_NO_CHUTE = 220

/** Plane. */
export const MAX_LIVES = 3
export const PLANE_Y = ROWS - 1 // bottom row index for plane body
export const BULLET_SPEED_CELLS_PER_SEC = 18
export const FIRE_COOLDOWN_MS = 180

export type Cell = { color: string } | null

export type ShapeCell = { r: number; c: number; color: string; hits?: number }

export type FallingBlock = {
  id: number
  /** Absolute grid cells occupied (row, col). */
  cells: ShapeCell[]
  hasChute: boolean
  /** Accumulated fall time toward next step. */
  fallAccMs: number
  fallIntervalMs: number
}

export type Bullet = {
  id: number
  x: number // column (float)
  y: number // row (float, upward decreases)
}

export type GamePhase = 'playing' | 'paused' | 'gameover'

export type GameState = {
  phase: GamePhase
  board: Cell[][] // [row][col]
  falling: FallingBlock | null
  planeCol: number
  lives: number
  score: number
  bullets: Bullet[]
  fireCooldownMs: number
  spawnCooldownMs: number
  invulnMs: number
  nextId: number
  linesCleared: number
}
