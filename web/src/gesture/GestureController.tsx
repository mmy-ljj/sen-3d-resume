import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { FilesetResolver, HandLandmarker, type NormalizedLandmark } from '@mediapipe/tasks-vision'
import { useStore } from '../store'
import { GestureMachine, type Pose, type GestureAction, type Feedback } from './gestureMachine'

type Status = 'idle' | 'loading' | 'ready' | 'error'
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm'
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'
const ACTION_LABEL: Record<GestureAction, string> = {
  up: '↑ 下一段简介', down: '↓ 上一段简介',
  left: '← 人物左转', right: '→ 人物右转',
  thumbsUp: '✓ 人物回正', fist: '↟ 回到简介开头', pinch: '◌ 切换景深模式',
}
const INITIAL: Feedback = { phase: 'waiting', pose: 'none', progress: 0 }

function distance(a: NormalizedLandmark, b: NormalizedLandmark, aspect: number) {
  return Math.hypot((a.x - b.x) * aspect, a.y - b.y)
}

function classifyPose(points: NormalizedLandmark[], aspect: number, scale: number): Pose {
  const pinchDistance = distance(points[4], points[8], aspect)
  if (pinchDistance < Math.max(0.035, scale * 0.68)) return 'pinch'
  const extended = [[8, 6], [12, 10], [16, 14], [20, 18]].filter(([tip, pip]) =>
    distance(points[tip], points[0], aspect) > distance(points[pip], points[0], aspect) * 1.12,
  ).length
  const thumbExtended = distance(points[4], points[0], aspect) > distance(points[3], points[0], aspect) * 1.12
  if (extended >= 3) return 'open'
  if (extended === 0 && thumbExtended && points[4].y < points[3].y - scale * 0.16) return 'thumbsUp'
  if (extended === 0 && !thumbExtended) return 'fist'
  return 'other'
}

// Land on actual section boundaries, including the desktop horizontal gallery.
function nextScrollTarget(direction: 'up' | 'down', origin: number) {
  const height = window.innerHeight
  const targets = [0, ...Array.from(document.querySelectorAll<HTMLElement>('[data-point]')).map(
    (element) => element.getBoundingClientRect().top + window.scrollY - height * 0.3,
  )]
  const gallery = document.querySelector<HTMLElement>('.wk-gallery')
  if (gallery) {
    const top = gallery.getBoundingClientRect().top + window.scrollY
    for (const card of gallery.querySelectorAll<HTMLElement>('.wk-card')) {
      targets.push(window.innerWidth <= 640
        ? card.getBoundingClientRect().top + window.scrollY - 24
        : top + card.offsetLeft)
    }
  }
  const max = Math.max(0, document.documentElement.scrollHeight - height)
  const sorted = [...new Set(targets.map((target) => Math.max(0, Math.min(max, target))))].sort((a, b) => a - b)
  return direction === 'up'
    ? sorted.find((target) => target > origin + 48) ?? max
    : sorted.reverse().find((target) => target < origin - 48) ?? 0
}

export default function GestureController() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const landmarkerRef = useRef<HandLandmarker | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const scrollRef = useRef<number | null>(null)
  const scrollDestinationRef = useRef<number | null>(null)
  const lookTimerRef = useRef<number | null>(null)
  const actionTimerRef = useRef<number | null>(null)
  const sessionRef = useRef(0)
  const videoTimeRef = useRef(-1)
  const machineRef = useRef(new GestureMachine())
  const aimRef = useRef({ x: 0, y: 0 })
  const [feedback, setFeedback] = useState<Feedback>(INITIAL)
  const [status, setStatus] = useState<Status>('idle')
  const [lastAction, setLastAction] = useState<{ label: string; id: number } | null>(null)
  const reducedMotion = useReducedMotion()
  const rotateCharacter = useStore((s) => s.rotateCharacter)
  const resetCharacter = useStore((s) => s.resetCharacter)
  const setGestureLook = useStore((s) => s.setGestureLook)
  const setGestureAim = useStore((s) => s.setGestureAim)
  const toggleCinematicFocus = useStore((s) => s.toggleCinematicFocus)
  const cinematicFocus = useStore((s) => s.cinematicFocus)
  const enabled = status === 'ready'

  const cancelScroll = useCallback(() => {
    if (scrollRef.current !== null) cancelAnimationFrame(scrollRef.current)
    scrollRef.current = null
    scrollDestinationRef.current = null
  }, [])

  const scrollTo = useCallback((target: number) => {
    cancelScroll()
    if (document.body.style.overflow === 'hidden') return
    const start = window.scrollY
    scrollDestinationRef.current = target
    const delta = target - start
    const duration = reducedMotion ? 0 : Math.min(1000, 520 + Math.abs(delta) * 0.1)
    const began = performance.now()
    const step = (now: number) => {
      const t = duration === 0 ? 1 : Math.min(1, (now - began) / duration)
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      // Explicit instant avoids CSS scroll-behavior starting another animation each frame.
      window.scrollTo({ top: start + delta * eased, behavior: 'instant' })
      scrollRef.current = t < 1 ? requestAnimationFrame(step) : null
      if (t === 1) scrollDestinationRef.current = null
    }
    scrollRef.current = requestAnimationFrame(step)
  }, [cancelScroll, reducedMotion])

  const stopCamera = useCallback(() => {
    sessionRef.current += 1
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    cancelScroll()
    for (const timer of [lookTimerRef, actionTimerRef]) {
      if (timer.current !== null) window.clearTimeout(timer.current)
      timer.current = null
    }
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    landmarkerRef.current?.close()
    landmarkerRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    machineRef.current = new GestureMachine()
    videoTimeRef.current = -1
    setGestureLook({ x: 0, y: 0 })
    setGestureAim({ x: 0, y: 0 })
    aimRef.current = { x: 0, y: 0 }
    setFeedback(INITIAL)
    setLastAction(null)
    setStatus('idle')
  }, [cancelScroll, setGestureAim, setGestureLook])

  const trigger = useCallback((action: GestureAction) => {
    setLastAction({ label: ACTION_LABEL[action], id: performance.now() })
    if (actionTimerRef.current !== null) window.clearTimeout(actionTimerRef.current)
    actionTimerRef.current = window.setTimeout(() => setLastAction(null), 1500)
    if (action === 'up' || action === 'down') scrollTo(nextScrollTarget(action, scrollDestinationRef.current ?? window.scrollY))
    else if (action === 'left' || action === 'right') rotateCharacter(action === 'left' ? -22 : 22)
    else if (action === 'pinch') {
      toggleCinematicFocus()
    } else {
      resetCharacter()
      if (action === 'fist') scrollTo(0)
    }
    setGestureLook({
      x: action === 'left' ? -0.9 : action === 'right' ? 0.9 : 0,
      y: action === 'up' ? 0.75 : action === 'down' ? -0.75 : 0,
    })
    if (lookTimerRef.current !== null) window.clearTimeout(lookTimerRef.current)
    lookTimerRef.current = window.setTimeout(() => setGestureLook({ x: 0, y: 0 }), 850)
  }, [resetCharacter, rotateCharacter, scrollTo, setGestureLook, toggleCinematicFocus])

  const processFrame = useCallback((time: number) => {
    const video = videoRef.current
    const landmarker = landmarkerRef.current
    if (!video || !landmarker) return
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.currentTime !== videoTimeRef.current) {
      videoTimeRef.current = video.currentTime
      try {
        const points = landmarker.detectForVideo(video, time).landmarks[0]
        const aspect = video.videoWidth / Math.max(1, video.videoHeight)
        const scale = points ? distance(points[0], points[9], aspect) : 0
        const pose = points ? classifyPose(points, aspect, scale) : 'none'
        const center = points ? [0, 5, 9, 13, 17].reduce((p, id) => ({
          x: p.x - points[id].x * aspect / 5,
          y: p.y + points[id].y / 5,
        }), { x: 0, y: 0 }) : null
        const next = machineRef.current.update(pose, center, scale, time)
        const palm = points ? [0, 5, 9, 13, 17].reduce((p, id) => ({
          x: p.x + points[id].x / 5,
          y: p.y + points[id].y / 5,
        }), { x: 0, y: 0 }) : null
        const aim = palm ? {
          // MediaPipe uses the unmirrored camera coordinate; invert x to match the mirrored preview.
          x: Math.max(-1, Math.min(1, (0.5 - palm.x) * 2.2)),
          y: Math.max(-1, Math.min(1, (0.5 - palm.y) * 2.2)),
        } : { x: 0, y: 0 }
        if (Math.hypot(aim.x - aimRef.current.x, aim.y - aimRef.current.y) > 0.035) {
          aimRef.current = aim
          setGestureAim(aim)
        }
        const progress = Math.round(next.progress * 20) / 20
        setFeedback((previous) => previous.phase === next.phase && previous.pose === next.pose && previous.progress === progress
          ? previous : { phase: next.phase, pose: next.pose, progress })
        if (next.action) trigger(next.action)
        if (!points) {
          const look = useStore.getState().gestureLook
          if (look.x !== 0 || look.y !== 0) setGestureLook({ x: 0, y: 0 })
        }
      } catch (error) {
        console.error(error)
        stopCamera()
        setStatus('error')
        return
      }
    }
    rafRef.current = requestAnimationFrame(processFrame)
  }, [setGestureAim, setGestureLook, stopCamera, trigger])

  const startCamera = useCallback(async () => {
    const session = ++sessionRef.current
    setStatus('loading')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } })
      if (session !== sessionRef.current) { stream.getTracks().forEach((track) => track.stop()); return }
      streamRef.current = stream
      const vision = await FilesetResolver.forVisionTasks(WASM_URL)
      if (session !== sessionRef.current) return
      const landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' }, runningMode: 'VIDEO', numHands: 1,
        minHandDetectionConfidence: 0.7, minHandPresenceConfidence: 0.7, minTrackingConfidence: 0.7,
      })
      if (session !== sessionRef.current) { landmarker.close(); return }
      landmarkerRef.current = landmarker
      const video = videoRef.current
      if (!video) throw new Error('找不到摄像头预览元素')
      video.srcObject = stream
      await video.play()
      if (session !== sessionRef.current) return
      machineRef.current = new GestureMachine()
      videoTimeRef.current = -1
      setStatus('ready')
      rafRef.current = requestAnimationFrame(processFrame)
    } catch (error) {
      if (session !== sessionRef.current) return
      console.error(error)
      stopCamera()
      setStatus('error')
    }
  }, [processFrame, stopCamera])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Escape'].includes(event.key)) cancelScroll()
    }
    const onVisibility = () => { if (document.hidden) stopCamera() }
    window.addEventListener('wheel', cancelScroll, { passive: true })
    window.addEventListener('touchstart', cancelScroll, { passive: true })
    window.addEventListener('keydown', onKey)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('wheel', cancelScroll)
      window.removeEventListener('touchstart', cancelScroll)
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('visibilitychange', onVisibility)
      stopCamera()
    }
  }, [cancelScroll, stopCamera])

  const message = status === 'loading' ? '正在加载摄像头与手势识别…'
    : status === 'error' ? '摄像头或识别加载失败，请检查权限后重试'
    : !enabled ? '开启摄像头后，用手掌滑动'
    : feedback.phase === 'waiting' ? '请将手掌放入画面'
    : feedback.phase === 'release' ? '张掌停稳片刻，即可继续操作'
    : feedback.phase === 'uncertain' ? '姿势确认中，请张掌或保持手势'
    : feedback.pose === 'thumbsUp' ? '保持点赞，进度满后人物回正'
    : feedback.pose === 'fist' ? '保持握拳，进度满后回到开头'
    : feedback.pose === 'pinch' ? '保持捏合，切换电影景深模式'
    : '张掌滑动：上/下翻页，左/右转身；移动手掌控制视线'

  return (
    <aside className={`gesture-panel ${enabled ? 'is-active' : ''}`} aria-label="手势交互控制">
      <video ref={videoRef} className="gesture-video" muted playsInline />
      <div className="gesture-panel-head">
        <span className={`gesture-status-dot ${status}`} /><span>GESTURE CONTROL</span>
      </div>
      <p className="gesture-message">{message}</p>
      {enabled && <div className="gesture-progress" role="progressbar" aria-label="手势确认进度" aria-valuenow={Math.round(feedback.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ transform: `scaleX(${feedback.progress})` }} />
      </div>}
      <div className="gesture-guide" aria-label="手势说明">
        <span>上/下 · 简介</span><span>左/右 · 转身</span><span>点赞 · 回正</span><span>握拳 · 回到开头</span>
        <span>移动 · 控制视线</span><span>捏合 · {cinematicFocus ? '关闭' : '开启'}景深</span>
      </div>
      <div className="gesture-action-slot" role="status" aria-live="polite">
        <AnimatePresence mode="wait">
          {lastAction && <motion.div key={lastAction.id} className="gesture-action"
            initial={{ opacity: 0, y: reducedMotion ? 0 : 5 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reducedMotion ? 0 : -3 }} transition={{ duration: reducedMotion ? 0 : 0.18 }}>
            {lastAction.label}
          </motion.div>}
        </AnimatePresence>
      </div>
      <button className="gesture-toggle" onClick={enabled ? stopCamera : startCamera} disabled={status === 'loading'}>
        {status === 'loading' ? '加载中…' : enabled ? '关闭手势' : '开启手势'}
      </button>
    </aside>
  )
}
