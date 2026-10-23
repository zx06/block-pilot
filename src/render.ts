import type { GameState } from './game/types'
import { COLS, ROWS } from './game/types'
import { chuteCells } from './game/combat'

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

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cellData = state.board[r][c]
      if (cellData) {
        const alpha = (cellData.hits ?? 0) > 0 ? 0.55 : 1
        drawCell(r, c, cellData.color, alpha)
      }
    }
  }

  for (const block of state.falling) {
    for (const c of block.cells) {
      const hits = c.hits ?? 0
      const alpha = hits > 0 ? 0.55 : 1
      drawCell(c.r, c.c, c.color, alpha)
    }
    const chutes = chuteCells(block)
    if (chutes.length > 0) {
      const minC = Math.min(...chutes.map((c) => c.c))
      const maxC = Math.max(...chutes.map((c) => c.c))
      const row = chutes[0].r + PAD_TOP
      const x0 = ox + minC * cell
      const x1 = ox + (maxC + 1) * cell
      const y = oy + row * cell
      const midX = (x0 + x1) / 2
      ctx.fillStyle = '#fca5a5'
      ctx.beginPath()
      ctx.ellipse(midX, y + cell * 0.42, (x1 - x0) * 0.48, cell * 0.32, 0, Math.PI, 0)
      ctx.fill()
      ctx.strokeStyle = '#fecaca'
      ctx.lineWidth = Math.max(1, cell * 0.06)
      ctx.beginPath()
      ctx.moveTo(x0 + cell * 0.25, y + cell * 0.42)
      ctx.lineTo(midX, y + cell * 0.95)
      ctx.lineTo(x1 - cell * 0.25, y + cell * 0.42)
      ctx.stroke()
      for (const ch of chutes) {
        const x = ox + ch.c * cell
        ctx.strokeStyle = 'rgba(252,165,165,0.35)'
        ctx.strokeRect(x + cell * 0.15, y + cell * 0.1, cell * 0.7, cell * 0.55)
      }
    }
  }

  for (const b of state.bullets) {
    const r = b.y + PAD_TOP
    const x = ox + b.x * cell - cell * 0.08
    const y = oy + r * cell
    ctx.fillStyle = '#fde047'
    ctx.fillRect(x, y, cell * 0.16, cell * 0.35)
  }

  {
    const r = state.planeRow + PAD_TOP
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

  ctx.fillStyle = 'rgba(15,23,42,0.35)'
  ctx.fillRect(0, 0, w, oy + cell * 0.15)
}
