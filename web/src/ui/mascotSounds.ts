// Small original UI cues synthesized locally. No audio network request or autoplay.
type Cue = 'wave' | 'jump' | 'spin' | 'feed' | 'tap'
let context: AudioContext | null = null

export async function playMascotSound(cue: Cue) {
  const AudioContextClass = window.AudioContext
  if (!AudioContextClass) return
  context ??= new AudioContextClass()
  if (context.state === 'suspended') await context.resume()
  const notes: Record<Cue, number[]> = {
    wave: [520, 680], jump: [390, 550, 780], spin: [680, 600, 520, 720],
    feed: [440, 660, 880], tap: [540],
  }
  const start = context.currentTime
  notes[cue].forEach((frequency, index) => {
    const oscillator = context!.createOscillator()
    const gain = context!.createGain()
    oscillator.type = cue === 'feed' ? 'sine' : 'triangle'
    oscillator.frequency.setValueAtTime(frequency, start + index * 0.09)
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.08, start + index * 0.09 + 0.085)
    gain.gain.setValueAtTime(0.0001, start + index * 0.09)
    gain.gain.exponentialRampToValueAtTime(0.055, start + index * 0.09 + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + index * 0.09 + 0.17)
    oscillator.connect(gain).connect(context!.destination)
    oscillator.start(start + index * 0.09)
    oscillator.stop(start + index * 0.09 + 0.18)
  })
}
