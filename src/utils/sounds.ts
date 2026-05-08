let audioCtx: AudioContext | null = null
let enabled = false

function getCtx(): AudioContext | null {
  if (!enabled) return null
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext()
    } catch {
      return null
    }
  }
  return audioCtx
}

function tone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.1) {
  const ctx = getCtx()
  if (!ctx) return
  try {
    if (ctx.state === 'suspended') ctx.resume()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = type
    osc.frequency.value = frequency
    gain.gain.setValueAtTime(volume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.start()
    osc.stop(ctx.currentTime + duration)
  } catch {
    // ignore audio errors silently
  }
}

export const sounds = {
  click: () => tone(440, 0.05, 'square', 0.07),
  phaseComplete: () => {
    tone(523, 0.15)
    setTimeout(() => tone(659, 0.15), 150)
    setTimeout(() => tone(784, 0.2), 300)
  },
  solved: () => {
    // Soft major chord: C5 E5 G5 played simultaneously, gentle decay
    tone(523, 0.6, 'sine', 0.055)
    tone(659, 0.6, 'sine', 0.045)
    tone(784, 0.6, 'sine', 0.035)
  },
  tutorPing: () => tone(880, 0.1, 'sine', 0.07),
  toggle(state: boolean) {
    enabled = state
    try {
      localStorage.setItem('idiotkuben:sound', state ? 'on' : 'off')
    } catch {
      // ignore
    }
    if (state && !audioCtx) {
      try {
        audioCtx = new AudioContext()
      } catch {
        // ignore
      }
    }
  },
  init() {
    try {
      const saved = localStorage.getItem('idiotkuben:sound')
      enabled = saved === 'on'
    } catch {
      enabled = false
    }
  },
  isEnabled: () => enabled,
}

sounds.init()
