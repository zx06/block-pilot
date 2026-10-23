import { describe, it, expect } from 'vitest'
import { applyBulletHit } from '../game/combat'
import { connectedComponents, extractFloatingGroups, floatingToFalling } from '../game/split'
import { createEmptyBoard, clearFullLines } from '../game/board'
import {
  createGame,
  debugHitFalling,
  debugHitBoard,
  debugLockAll,
} from '../game/game'
import {
  FALL_MS_WITH_CHUTE,
  FALL_MS_NO_CHUTE,
  HITS_TO_DESTROY,
  ROWS,
  COLS,
} from '../game/types'
import type { FallingBlock } from '../game/types'

describe('falling split into independent pieces', () => {
  it('destroying middle of a 3-bar yields two fast no-chute pieces', () => {
    let id = 10
    const block: FallingBlock = {
      id: 1,
      cells: [
        { r: 5, c: 2, color: '#a' },
        { r: 5, c: 3, color: '#a' },
        { r: 5, c: 4, color: '#a' },
      ],
      hasChute: true,
      fallAccMs: 0,
      fallIntervalMs: FALL_MS_WITH_CHUTE,
    }
    // two hits on middle cell
    let result = applyBulletHit(block, 5, 3, () => ++id)
    expect(result.destroyedCell).toBe(false)
    result = applyBulletHit(result.pieces[0], 5, 3, () => ++id)
    expect(result.destroyedCell).toBe(true)
    expect(result.pieces).toHaveLength(2)
    for (const p of result.pieces) {
      expect(p.hasChute).toBe(false)
      expect(p.fallIntervalMs).toBe(FALL_MS_NO_CHUTE)
      expect(p.cells).toHaveLength(1)
    }
    const cols = result.pieces.flatMap((p) => p.cells.map((c) => c.c)).sort()
    expect(cols).toEqual([2, 4])
  })

  it('game state replaces one falling with two after split', () => {
    const g = createGame()
    g.falling = [
      {
        id: 1,
        cells: [
          { r: 4, c: 1, color: '#x' },
          { r: 4, c: 2, color: '#x' },
          { r: 4, c: 3, color: '#x' },
        ],
        hasChute: true,
        fallAccMs: 0,
        fallIntervalMs: FALL_MS_WITH_CHUTE,
      },
    ]
    g.nextId = 50
    for (let i = 0; i < HITS_TO_DESTROY; i++) debugHitFalling(g, 1, 4, 2)
    expect(g.falling).toHaveLength(2)
    expect(g.falling.every((b) => !b.hasChute)).toBe(true)
  })
})

describe('board destroy causes floating to fall', () => {
  it('extractFloatingGroups lifts unsupported components', () => {
    const board = createEmptyBoard()
    // pillar on floor
    board[ROWS - 1][0] = { color: '#1' }
    board[ROWS - 2][0] = { color: '#1' }
    // floating island
    board[5][5] = { color: '#2' }
    board[5][6] = { color: '#2' }
    const { board: next, floating } = extractFloatingGroups(board)
    expect(next[ROWS - 1][0]).not.toBeNull()
    expect(next[5][5]).toBeNull()
    expect(floating).toHaveLength(1)
    expect(floating[0]).toHaveLength(2)
    const blocks = floatingToFalling(floating, () => 99)
    expect(blocks[0].hasChute).toBe(false)
    expect(blocks[0].fallIntervalMs).toBe(FALL_MS_NO_CHUTE)
  })

  it('shooting a support cell drops the upper stack as falling', () => {
    const g = createGame()
    // vertical stack: bottom supported, shoot bottom → upper floats
    g.board[ROWS - 1][4] = { color: '#a' }
    g.board[ROWS - 2][4] = { color: '#a' }
    g.board[ROWS - 3][4] = { color: '#a' }
    g.falling = []
    g.spawnCooldownMs = 99999
    for (let i = 0; i < HITS_TO_DESTROY; i++) {
      debugHitBoard(g, ROWS - 1, 4)
    }
    expect(g.board[ROWS - 1][4]).toBeNull()
    // upper two should become falling (no longer grounded)
    expect(g.falling.length).toBeGreaterThanOrEqual(1)
    const cells = g.falling.flatMap((b) => b.cells)
    expect(cells.some((c) => c.r === ROWS - 2 && c.c === 4)).toBe(true)
    expect(cells.some((c) => c.r === ROWS - 3 && c.c === 4)).toBe(true)
  })
})

describe('line clear still works after lock', () => {
  it('locking a full row clears it', () => {
    const g = createGame()
    g.falling = []
    g.spawnCooldownMs = 99999
    // fill bottom row except one hole
    for (let c = 0; c < COLS - 1; c++) {
      g.board[ROWS - 1][c] = { color: '#z' }
    }
    g.falling = [
      {
        id: 7,
        cells: [{ r: ROWS - 1, c: COLS - 1, color: '#z' }],
        hasChute: false,
        fallAccMs: 0,
        fallIntervalMs: FALL_MS_NO_CHUTE,
      },
    ]
    // cannot move down → lock
    debugLockAll(g)
    expect(g.falling).toHaveLength(0)
    expect(g.linesCleared).toBe(1)
    expect(g.board[ROWS - 1].every((c) => c === null)).toBe(true)
  })

  it('clearFullLines packing still correct', () => {
    let board = createEmptyBoard()
    for (let c = 0; c < COLS; c++) board[ROWS - 1][c] = { color: '#w' }
    board[ROWS - 2][0] = { color: '#k' }
    const { board: next, cleared } = clearFullLines(board)
    expect(cleared).toBe(1)
    expect(next[ROWS - 1][0]).toEqual({ color: '#k' })
  })
})

describe('connectedComponents', () => {
  it('splits disconnected cells', () => {
    const groups = connectedComponents([
      { r: 1, c: 1, color: '#a' },
      { r: 1, c: 3, color: '#a' },
    ])
    expect(groups).toHaveLength(2)
  })
})
