import { describe, it, expect } from 'vitest'
import { createGame, movePlane } from '../game/game'
import { COLS, ROWS } from '../game/types'

describe('plane 4-way movement', () => {
  it('moves up down left right within board', () => {
    const g = createGame()
    expect(g.planeRow).toBe(ROWS - 1)
    expect(movePlane(g, 0, -1)).toBe(true)
    expect(g.planeRow).toBe(ROWS - 2)
    expect(movePlane(g, -1, 0)).toBe(true)
    expect(g.planeCol).toBe(Math.floor(COLS / 2) - 1)
    expect(movePlane(g, 1, 0)).toBe(true)
    expect(movePlane(g, 0, 1)).toBe(true)
    expect(g.planeRow).toBe(ROWS - 1)
  })

  it('cannot leave the board', () => {
    const g = createGame()
    g.planeCol = 0
    g.planeRow = 0
    expect(movePlane(g, -1, 0)).toBe(false)
    expect(movePlane(g, 0, -1)).toBe(false)
    g.planeCol = COLS - 1
    g.planeRow = ROWS - 1
    expect(movePlane(g, 1, 0)).toBe(false)
    expect(movePlane(g, 0, 1)).toBe(false)
  })

  it('cannot enter stacked cells (wall)', () => {
    const g = createGame()
    g.planeCol = 4
    g.planeRow = 10
    g.board[9][4] = { color: '#fff' }
    expect(movePlane(g, 0, -1)).toBe(false)
    expect(g.planeRow).toBe(10)
    expect(movePlane(g, 1, 0)).toBe(true)
  })

  it('collision with stacked cell at plane position still possible via hit check path', () => {
    // when plane sits on a stack cell (e.g. block locked on it), lives drop in tick —
    // here we only assert movePlane refuses entry so wall rule holds.
    const g = createGame()
    g.board[g.planeRow][g.planeCol + 1] = { color: '#abc' }
    expect(movePlane(g, 1, 0)).toBe(false)
  })
})
