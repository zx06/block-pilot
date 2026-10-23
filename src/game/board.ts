import type { Cell } from './types'
import { COLS, ROWS } from './types'

export function createEmptyBoard(): Cell[][] {
  return Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => null))
}

export function clearFullLines(board: Cell[][]): { board: Cell[][]; cleared: number } {
  const kept = board.filter((row) => row.some((cell) => cell === null))
  const cleared = ROWS - kept.length
  while (kept.length < ROWS) {
    kept.unshift(Array.from({ length: COLS }, () => null))
  }
  return { board: kept, cleared }
}

export function canOccupy(board: Cell[][], r: number, c: number): boolean {
  if (c < 0 || c >= COLS || r >= ROWS) return false
  if (r < 0) return true // above board ok while spawning
  return board[r][c] === null
}

export function lockCells(
  board: Cell[][],
  cells: { r: number; c: number; color: string }[],
): Cell[][] {
  const next = board.map((row) => row.slice())
  for (const cell of cells) {
    if (cell.r >= 0 && cell.r < ROWS && cell.c >= 0 && cell.c < COLS) {
      next[cell.r][cell.c] = { color: cell.color }
    }
  }
  return next
}
