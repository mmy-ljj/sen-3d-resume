import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { playMascotSound } from './mascotSounds'

type Action = 'idle' | 'wave' | 'jump' | 'spin' | 'feed'
type Point = { x: number; y: number }

const WIDGET_WIDTH = 144
const WIDGET_HEIGHT = 172
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export default function InteractiveMascot() {
  const timerRef = useRef<number | null>(null)
  const dragRef = useRef({ active: false, moved: false, offsetX: 0, offsetY: 0 })
  const [position, setPosition] = useState<Point | null>(null)
  const [action, setAction] = useState<Action>('idle')
  const [open, setOpen] = useState(false)
  const [muted, setMuted] = useState(false)
  const [friendship, setFriendship] = useState(0)

  useEffect(() => {
    const placeAtHome = () => {
      setPosition({
        x: Math.max(16, window.innerWidth - WIDGET_WIDTH - 24),
        y: Math.max(80, window.innerHeight - WIDGET_HEIGHT - 24),
      })
    }
    placeAtHome()
    window.addEventListener('resize', placeAtHome)
    return () => {
      window.removeEventListener('resize', placeAtHome)
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    }
  }, [])

  const play = (next: Action) => {
    setAction(next)
    setOpen(true)
    if (next === 'feed') setFriendship((value) => value + 1)
    if (next !== 'idle' && !muted) void playMascotSound(next).catch(() => {})
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setAction('idle'), 900)
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button')) return
    const rect = event.currentTarget.getBoundingClientRect()
    dragRef.current = {
      active: true,
      moved: false,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return
    if (Math.abs(event.movementX) + Math.abs(event.movementY) > 1) dragRef.current.moved = true
    setPosition({
      x: clamp(event.clientX - dragRef.current.offsetX, 12, window.innerWidth - WIDGET_WIDTH - 12),
      y: clamp(event.clientY - dragRef.current.offsetY, 12, window.innerHeight - WIDGET_HEIGHT - 12),
    })
  }

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return
    const wasMoved = dragRef.current.moved
    dragRef.current.active = false
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (!wasMoved) {
      setOpen(true)
      play('wave')
    }
  }

  const resetPosition = () => {
    setPosition({
      x: Math.max(16, window.innerWidth - WIDGET_WIDTH - 24),
      y: Math.max(80, window.innerHeight - WIDGET_HEIGHT - 24),
    })
  }

  if (!position) return null

  return (
    <div
      className={`mascot-float${open ? ' is-open' : ''}`}
      style={{ left: position.x, top: position.y }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => { dragRef.current.active = false }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); play('wave') }
      }}
      tabIndex={0}
      role="application"
      aria-label="可拖动的奶龙挂件，按回车互动"
    >
      <div className="mascot-float-bubble" aria-hidden="true">
        {action === 'idle' ? friendship ? `好感 +${friendship} · 再陪我玩！` : '拖动我，点我互动' : action === 'wave' ? '你好呀！' : action === 'jump' ? '起飞！' : action === 'feed' ? '啊呜！谢谢你！' : '转起来！'}
      </div>
      {open && (
        <div className="mascot-float-panel" role="group" aria-label="桌宠动作">
          <button type="button" onClick={() => play('wave')}>👋 挥手</button>
          <button type="button" onClick={() => play('jump')}>⬆ 跳跃</button>
          <button type="button" onClick={() => play('spin')}>🌀 转圈</button>
          <button type="button" onClick={() => play('feed')}>🍪 喂点心</button>
          <button type="button" onClick={() => setMuted((value) => !value)} aria-pressed={!muted}>{muted ? '🔇 开启声音' : '🔊 关闭声音'}</button>
          <button type="button" onClick={resetPosition}>↺ 归位</button>
          <button type="button" onClick={() => setOpen(false)}>✕ 收起</button>
        </div>
      )}
      <img
        className={`mascot-float-sprite is-${action}`}
        src={`${import.meta.env.BASE_URL}images/interactive-mascot.png`}
        alt="奶龙挂件"
        draggable={false}
      />
      <span className="mascot-float-handle" aria-hidden="true">· · ·</span>
    </div>
  )
}
