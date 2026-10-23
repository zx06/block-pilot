import { describe, it, expect } from 'vitest'
import { createEmptyBoard, clearFullLines, lockCells } from '../game/board'
import { COLS, ROWS } from '../game/types'

describe('line clear', () => {
  it('clears complete rows and packs down', () => {
    let board = createEmptyBoard()
    // fill bottom two rows completely
    for (let c = 0; c < COLS; c++) {
      board[ROWS - 1][c] = { color: '#fff' }
      board[ROWS - 2][c] = { color: '#eee' }
    }
    // partial third
    board[ROWS - 3][0] = { color: '#abc' }

    const { board: next, cleared } = clearFullLines(board)
    expect(cleared).toBe(2)
    expect(next[ROWS - 1][0]).toEqual({ color: '#abc' })
    expect(next[ROWS - 1][1]).toBeNull()
    expect(next[0].every((c) => c === null)).toBe(true)
  })

  it('lockCells writes into board', () => {
    const board = createEmptyBoard()
    const locked = lockCells(board, [
      { r: 5, c: 3, color: '#38bdf8' },
      { r: 5, c: 4, color: '#38bdf8' },
    ])
    expect(locked[5][3]?.color).toBe('#38bdf8')
    expect(locked[5][4]?.color).toBe('#38bdf8')
  })
})
