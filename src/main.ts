import './style.css'
import { createGame, tick, restart } from './game/game'
import type { GameState } from './game/types'
import { draw, resizeCanvas } from './render'
import { bindInput } from './input'

const canvas = document.getElementById('game') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!
const scoreEl = document.getElementById('score')!
const livesEl = document.getElementById('lives')!
const statusEl = document.getElementById('status')!
const overlay = document.getElementById('overlay')!
const overlayTitle = document.getElementById('overlay-title')!
const overlayMsg = document.getElementById('overlay-msg')!

const stateRef: { current: GameState } = { current: createGame() }

function doRestart() {
  stateRef.current = restart(stateRef.current)
}

const input = bindInput(stateRef, doRestart)

function syncHud() {
  const s = stateRef.current
  scoreEl.textContent = String(s.score)
  livesEl.textContent = String(s.lives)
  if (s.phase === 'playing') {
    statusEl.textContent = '进行中'
    overlay.classList.remove('show')
  } else if (s.phase === 'paused') {
    statusEl.textContent = '暂停'
    overlayTitle.textContent = '暂停'
    overlayMsg.textContent = '按 P / Esc 或点按钮继续'
    overlay.classList.add('show')
  } else {
    statusEl.textContent = 'Game Over'
    overlayTitle.textContent = 'Game Over'
    overlayMsg.textContent = `分数 ${s.score} · 消行 ${s.linesCleared} · R 再来`
    overlay.classList.add('show')
  }
}

let last = performance.now()
function frame(now: number) {
  const dt = Math.min(50, now - last)
  last = now
  input.pollMove(dt)
  tick(stateRef.current, dt)
  draw(ctx, stateRef.current)
  syncHud()
  requestAnimationFrame(frame)
}

function onResize() {
  resizeCanvas(canvas)
}
window.addEventListener('resize', onResize)
onResize()
requestAnimationFrame(frame)
