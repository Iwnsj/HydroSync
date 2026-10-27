/** Small random / math helpers for the simulator. */

export const rand = (min, max) => min + Math.random() * (max - min)
export const randInt = (min, max) => Math.floor(rand(min, max + 1))
export const jitter = (amp) => (Math.random() * 2 - 1) * amp
export const chance = (p) => Math.random() < p
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
export const round = (v, d = 1) => {
  const f = 10 ** d
  return Math.round(v * f) / f
}
export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

let counter = 0
export const uid = (prefix = 'id') => `${prefix}_${Date.now().toString(36)}${(counter++).toString(36)}`

/**
 * Deterministic pseudo-noise in [-1, 1] for a given input. Used for history
 * so the same time range always produces the same chart.
 */
export function hashNoise(n) {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453
  return (x - Math.floor(x)) * 2 - 1
}

export const startOfDay = (ts) => {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
