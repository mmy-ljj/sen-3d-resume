export type Pose = 'open' | 'fist' | 'thumbsUp' | 'pinch' | 'other' | 'none'
export type GestureAction = 'up' | 'down' | 'left' | 'right' | 'thumbsUp' | 'fist' | 'pinch'
type Point = { x: number; y: number }
export type Feedback = {
  phase: 'waiting' | 'uncertain' | 'ready' | 'holding' | 'release'
  pose: Pose
  progress: number
  action?: GestureAction
}

// Coordinates use video height as the unit; x is mirrored to match the preview.
// All dwell/release/cooldown times use milliseconds, independent of camera FPS.
export class GestureMachine {
  private candidate: Pose = 'none'
  private since = 0
  private lastFire = -Infinity
  private locked = false
  private releaseSince: number | null = null
  private releasePoint: Point | null = null
  private tracking: { point: Point; time: number } | null = null
  private filtered: Point | null = null
  private lastTime: number | null = null

  update(pose: Pose, raw: Point | null, scale: number, time: number): Feedback {
    const dt = this.lastTime === null ? 100 : Math.max(0, time - this.lastTime)
    this.lastTime = time
    if (pose !== this.candidate) {
      this.candidate = pose
      this.since = time
      this.tracking = null
      this.releaseSince = null
      this.releasePoint = null
    }
    if (raw) {
      const alpha = 1 - Math.exp(-dt / 45)
      this.filtered = this.filtered
        ? { x: this.filtered.x + (raw.x - this.filtered.x) * alpha, y: this.filtered.y + (raw.y - this.filtered.y) * alpha }
        : { ...raw }
    } else {
      this.filtered = null
      this.tracking = null
    }
    const held = time - this.since
    if (pose === 'none') {
      if (held >= 240) this.locked = false
      return { phase: 'waiting', pose, progress: 0 }
    }
    // Re-arm after a neutral pose, or an open palm held still. Holding a fist
    // or thumbs-up never repeats the action, even across uncertain frames.
    if (this.locked) {
      if (pose === 'other' && held >= 260) this.locked = false
      if (pose === 'open' && this.filtered) {
        if (!this.releasePoint || Math.hypot(this.filtered.x - this.releasePoint.x, this.filtered.y - this.releasePoint.y) > Math.max(0.025, scale * 0.18)) {
          this.releasePoint = { ...this.filtered }
          this.releaseSince = time
        }
        if (this.releaseSince !== null && time - this.releaseSince >= 360) this.locked = false
      }
      this.tracking = null
      if (this.locked) return { phase: 'release', pose, progress: 0 }
      this.since = time
      return { phase: 'ready', pose, progress: 0 }
    }
    if (held < 110 || pose === 'other') return { phase: 'uncertain', pose, progress: 0 }
    const fire = (action: GestureAction): Feedback => {
      if (time - this.lastFire < 800) return { phase: 'holding', pose, progress: 1 }
      this.lastFire = time
      this.locked = true
      this.releaseSince = null
      this.releasePoint = null
      this.tracking = null
      return { phase: 'release', pose, progress: 1, action }
    }
    if (pose === 'thumbsUp' || pose === 'fist' || pose === 'pinch') {
      const duration = pose === 'thumbsUp' ? 650 : pose === 'pinch' ? 720 : 900
      return held >= duration ? fire(pose) : { phase: 'holding', pose, progress: held / duration }
    }
    if (pose === 'open' && this.filtered) {
      if (!this.tracking || time - this.tracking.time > 720) this.tracking = { point: { ...this.filtered }, time }
      const dx = this.filtered.x - this.tracking.point.x
      const dy = this.filtered.y - this.tracking.point.y
      const major = Math.max(Math.abs(dx), Math.abs(dy))
      const minor = Math.min(Math.abs(dx), Math.abs(dy))
      const threshold = Math.min(0.28, Math.max(0.14, scale * 1.15))
      if (time - this.tracking.time >= 180 && major >= threshold && minor / major <= 0.65) {
        return fire(Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down'))
      }
      return { phase: 'ready', pose, progress: Math.min(major / threshold, 1) }
    }
    return { phase: 'uncertain', pose, progress: 0 }
  }
}
