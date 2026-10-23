import type { GameState } from './game/types'
import { movePlane, fire, togglePause } from './game/game'

export type InputController = {
  dispose: () => void
  pollMove: (dtMs: number) => void
}

export function bindInput(
  stateRef: { current: GameState },
  onRestart: () => void,
): InputController {
  const held = { left: false, right: false }
  let moveAcc = 0
  const MOVE_MS = 90

  const onKeyDown = (e: KeyboardEvent) => {
    const s = stateRef.current
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
      e.preventDefault()
    }
    switch (e.key) {
      case 'a':
      case 'A':
      case 'ArrowLeft':
        held.left = true
        break
      case 'd':
      case 'D':
      case 'ArrowRight':
        held.right = true
        break
      case ' ':
      case 'j':
      case 'J':
        fire(s)
        break
      case 'p':
      case 'P':
      case 'Escape':
        if (s.phase === 'gameover') onRestart()
        else togglePause(s)
        break
      case 'r':
      case 'R':
        if (s.phase === 'gameover') onRestart()
        break
    }
  }

  const onKeyUp = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'a':
      case 'A':
      case 'ArrowLeft':
        held.left = false
        break
      case 'd':
      case 'D':
      case 'ArrowRight':
        held.right = false
        break
    }
  }

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)

  const bindHold = (el: HTMLElement | null, onDown: () => void, onUp?: () => void) => {
    if (!el) return
    const down = (ev: Event) => {
      ev.preventDefault()
      onDown()
    }
    const up = (ev: Event) => {
      ev.preventDefault()
      onUp?.()
    }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointerleave', up)
    el.addEventListener('pointercancel', up)
  }

  bindHold(
    document.getElementById('btn-left'),
    () => {
      held.left = true
    },
    () => {
      held.left = false
    },
  )
  bindHold(
    document.getElementById('btn-right'),
    () => {
      held.right = true
    },
    () => {
      held.right = false
    },
  )
  bindHold(document.getElementById('btn-shoot'), () => fire(stateRef.current))
  bindHold(document.getElementById('btn-pause'), () => {
    const s = stateRef.current
    if (s.phase === 'gameover') onRestart()
    else togglePause(s)
  })
  document.getElementById('btn-resume')?.addEventListener('click', () => {
    const s = stateRef.current
    if (s.phase === 'gameover') onRestart()
    else if (s.phase === 'paused') s.phase = 'playing'
  })

  const pollMove = (dtMs: number) => {
    if (stateRef.current.phase !== 'playing') return
    moveAcc += dtMs
    while (moveAcc >= MOVE_MS) {
      moveAcc -= MOVE_MS
      if (held.left && !held.right) movePlane(stateRef.current, -1)
      else if (held.right && !held.left) movePlane(stateRef.current, 1)
    }
  }

  return {
    dispose: () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    },
    pollMove,
  }
}
