import type { GameState } from './game/types'
import { COLS, ROWS, PLANE_Y } from './game/types'
import { chuteCell } from './game/combat'

const PAD_TOP = 1 // extra row for chute visibility above

export function resizeCanvas(canvas: HTMLCanvasElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const cssW = canvas.clientWidth
  const cssH = canvas.clientHeight
  canvas.width = Math.floor(cssW * dpr)
  canvas.height = Math.floor(cssH * dpr)
}

export function draw(ctx: CanvasRenderingContext2D, state: GameState) {
  const w = ctx.canvas.width
  const h = ctx.canvas.height
  const rows = ROWS + PAD_TOP
  const cell = Math.min(w / COLS, h / rows)
  const ox = (w - cell * COLS) / 2
  const oy = (h - cell * rows) / 2

  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 0, w, h)

  // grid
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = ox + c * cell
      const y = oy + r * cell
      ctx.strokeStyle = '#1e293b'
      ctx.lineWidth = Math.max(1, cell * 0.03)
      ctx.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1)
    }
  }

  const drawCell = (gr: number, gc: number, color: string, alpha = 1) => {
    const r = gr + PAD_TOP
    if (r < -1 || r >= rows || gc < 0 || gc >= COLS) return
    const x = ox + gc * cell
    const y = oy + r * cell
    ctx.globalAlpha = alpha
    ctx.fillStyle = color
    ctx.fillRect(x + cell * 0.08, y + cell * 0.08, cell * 0.84, cell * 0.84)
    ctx.fillStyle = 'rgba(255,255,255,0.18)'
    ctx.fillRect(x + cell * 0.08, y + cell * 0.08, cell * 0.84, cell * 0.22)
    ctx.globalAlpha = 1
  }

  // stacked
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cellData = state.board[r][c]
      if (cellData) drawCell(r, c, cellData.color)
    }
  }

  // falling
  if (state.falling) {
    for (const c of state.falling.cells) {
      const hits = (c as { hits?: number }).hits ?? 0
      const alpha = hits > 0 ? 0.55 : 1
      drawCell(c.r, c.c, c.color, alpha)
    }
    const ch = chuteCell(state.falling)
    if (ch) {
      const r = ch.r + PAD_TOP
      const x = ox + ch.c * cell
      const y = oy + r * cell
      // parachute canopy
      ctx.fillStyle = '#fca5a5'
      ctx.beginPath()
      ctx.ellipse(x + cell / 2, y + cell * 0.45, cell * 0.42, cell * 0.28, 0, Math.PI, 0)
      ctx.fill()
      ctx.strokeStyle = '#fecaca'
      ctx.beginPath()
      ctx.moveTo(x + cell * 0.2, y + cell * 0.45)
      ctx.lineTo(x + cell / 2, y + cell * 0.95)
      ctx.lineTo(x + cell * 0.8, y + cell * 0.45)
      ctx.stroke()
    }
  }

  // bullets
  for (const b of state.bullets) {
    const r = b.y + PAD_TOP
    const x = ox + b.x * cell - cell * 0.08
    const y = oy + r * cell
    ctx.fillStyle = '#fde047'
    ctx.fillRect(x, y, cell * 0.16, cell * 0.35)
  }

  // plane
  {
    const r = PLANE_Y + PAD_TOP
    const x = ox + state.planeCol * cell
    const y = oy + r * cell
    const blink = state.invulnMs > 0 && Math.floor(state.invulnMs / 100) % 2 === 0
    if (!blink) {
      ctx.fillStyle = '#38bdf8'
      ctx.beginPath()
      ctx.moveTo(x + cell / 2, y + cell * 0.1)
      ctx.lineTo(x + cell * 0.85, y + cell * 0.85)
      ctx.lineTo(x + cell / 2, y + cell * 0.7)
      ctx.lineTo(x + cell * 0.15, y + cell * 0.85)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#7dd3fc'
      ctx.fillRect(x + cell * 0.42, y + cell * 0.35, cell * 0.16, cell * 0.3)
    }
  }

  // soft vignette top label area
  ctx.fillStyle = 'rgba(15,23,42,0.35)'
  ctx.fillRect(0, 0, w, oy + cell * 0.15)
}
