/**
 * Deterministic historical data generator (MOCK ONLY).
 * With the real backend, getHistory()/getEvents()/getPerformance() hit
 * Laravel endpoints that aggregate the readings the ESP32 uploaded.
 */
import { HARDWARE } from '../../config/device'
import { hashNoise, round, startOfDay } from './random'

const MIN = 60 * 1000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

function parseDateInput(value) {
  const [y, m, d] = String(value).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1).getTime()
}

/** Turn a UI range ({ preset, from, to }) into absolute timestamps + sample step. */
export function resolveRange(range, now = Date.now()) {
  switch (range.preset) {
    case 'today':
      return { from: startOfDay(now), to: now, step: 10 * MIN }
    case '7d':
      return { from: now - 7 * DAY, to: now, step: HOUR }
    case '28d':
      return { from: now - 28 * DAY, to: now, step: 4 * HOUR }
    case 'custom': {
      if (!range.from || !range.to) throw new Error('Pick both a start and an end date.')
      const from = parseDateInput(range.from)
      const to = Math.min(parseDateInput(range.to) + DAY - 1, now)
      if (from > to) throw new Error('The start date must be before the end date.')
      const step = Math.max(10 * MIN, Math.ceil((to - from) / 240 / (10 * MIN)) * 10 * MIN)
      return { from, to, step }
    }
    default:
      return { from: now - DAY, to: now, step: 10 * MIN }
  }
}

/**
 * Synthetic sensor value at any timestamp:
 * soil moisture follows an 8-hour dry-down sawtooth (irrigation at each reset),
 * EC decays between fertigations every 3 days, tanks drain and refill.
 */
function sampleAt(t) {
  const h = t / HOUR
  const cycle = (h % 8) / 8
  const base = 72 - cycle * 20
  const m1 = base + hashNoise(Math.floor(h * 6)) * 2.2
  const m2 = base + 3 + hashNoise(Math.floor(h * 6) + 5000) * 2.2
  const m3 = base - 3 + hashNoise(Math.floor(h * 6) + 9000) * 2.2
  return {
    ts: t,
    m1: round(m1, 1),
    m2: round(m2, 1),
    m3: round(m3, 1),
    avg: round((m1 + m2 + m3) / 3, 1),
    ec: round(2.3 - ((h % 72) / 72) * 0.7 + hashNoise(Math.floor(h * 4) + 300) * 0.05, 2),
    tank: round(Math.max(3, 95 - ((h % 36) / 36) * 80 + hashNoise(Math.floor(h)) * 1.2), 1),
    fert: round(Math.max(3, 100 - ((h % 168) / 168) * 85), 1),
  }
}

export function generateHistory(range, now = Date.now()) {
  const { from, to, step } = resolveRange(range, now)
  if (from > now) return []
  const points = []
  const start = Math.ceil(from / step) * step
  for (let t = start; t <= to; t += step) points.push(sampleAt(t))
  return points
}

/** Irrigation & fertigation events in a range (newest first), merged with live events. */
export function generateEvents(range, liveEvents = [], now = Date.now()) {
  const { from, to } = resolveRange(range, now)
  const events = []
  const firstSlot = Math.ceil(from / (8 * HOUR)) * 8
  const lastSlot = Math.floor(to / HOUR)

  for (let h = firstSlot; h <= lastSlot; h += 8) {
    const n = hashNoise(h)
    if (n > 0.72) continue // that slot was rain-preempted
    const durationMin = 10 + Math.round(Math.abs(hashNoise(h + 1)) * 10)
    events.push({
      id: `hist-irr-${h}`,
      type: 'irrigation',
      start: h * HOUR + Math.round(Math.abs(hashNoise(h + 2)) * 20) * MIN,
      durationSec: durationMin * 60,
      volumeL: round(durationMin * HARDWARE.irrigationFlowLpm, 1),
      trigger: n < -0.7 ? 'Manual' : n > 0.45 ? 'Schedule' : 'Auto',
    })
  }

  const firstFert = Math.ceil(from / (72 * HOUR)) * 72
  for (let h = firstFert; h <= lastSlot; h += 72) {
    const n = hashNoise(h + 77)
    const durSec = 60 + Math.round(Math.abs(n) * 60)
    events.push({
      id: `hist-fert-${h}`,
      type: 'fertigation',
      start: h * HOUR + 30 * MIN,
      durationSec: durSec,
      volumeL: round((durSec / 60) * HARDWARE.fertFlowLpm, 2),
      trigger: n < -0.6 ? 'Manual' : 'Auto',
      targetEc: 2.0,
      finalEc: round(2.0 + n * 0.08, 2),
      accuracy: round(100 - Math.abs(n * 0.08 / 2) * 100, 1),
    })
  }

  const live = liveEvents.filter((e) => e.start >= from && e.start <= to)
  return [...live, ...events.filter((e) => e.start <= now)].sort((a, b) => b.start - a.start)
}

/**
 * Thesis metrics. Combines a deterministic 28-day "field test" baseline
 * with live data from the running simulator.
 */
export function generatePerformance({ latencies, events, preemptions, fallback }, now = Date.now()) {
  const today = startOfDay(now)
  const scheduleBaselineL = 2 * 20 * HARDWARE.irrigationFlowLpm // fixed schedule: 2 × 20 min/day

  const daily = Array.from({ length: 28 }, (_, i) => {
    const dayTs = today - (28 - i) * DAY
    const n = hashNoise(dayTs / DAY)
    const rainy = n > 0.55
    const actualL = Math.round(rainy ? 140 + n * 40 : 300 + n * 55)
    const offlineMin = n < -0.6 ? Math.round(Math.abs(n) * 180) : n > 0.8 ? Math.round(n * 60) : 0
    return {
      ts: dayTs,
      day: `D${i + 1}`,
      baselineL: scheduleBaselineL,
      actualL,
      savedL: scheduleBaselineL - actualL,
      offlineMin,
      edgeUptime: offlineMin ? round(100 - Math.abs(hashNoise(dayTs / DAY + 9)) * 2.5, 1) : 100,
    }
  })

  const totalBaseline = daily.reduce((a, d) => a + d.baselineL, 0)
  const totalActual = daily.reduce((a, d) => a + d.actualL, 0)

  const seededAccuracy = Array.from({ length: 9 }, (_, i) => round(96 + hashNoise(i + 40) * 3, 1))
  const liveAccuracy = events.filter((e) => e.type === 'fertigation' && e.accuracy != null).map((e) => e.accuracy)
  const accuracySeries = [...seededAccuracy, ...liveAccuracy.slice(0, 12).reverse()].map((accuracy, i) => ({
    cycle: `#${i + 1}`,
    accuracy,
  }))

  const recentLatency = latencies.slice(-30)
  const avgLatency = recentLatency.reduce((a, l) => a + l.ms, 0) / Math.max(1, recentLatency.length)

  // Offline uptime: share of time the ESP32 kept controlling while offline.
  const seededOfflineMs = daily.reduce((a, d) => a + d.offlineMin * MIN, 0)
  const seededUpMs = daily.reduce((a, d) => a + d.offlineMin * MIN * (d.edgeUptime / 100), 0)
  const offlineUptime = ((seededUpMs + fallback.upMs) / Math.max(1, seededOfflineMs + fallback.totalMs)) * 100

  const preemptionSavedL = preemptions.reduce((a, p) => a + (p.savedL || 0), 0)

  return {
    waterConservationRate: round((1 - totalActual / totalBaseline) * 100, 1),
    fertigationAccuracy: round(accuracySeries.reduce((a, b) => a + b.accuracy, 0) / accuracySeries.length, 1),
    avgLatencyMs: Math.round(avgLatency),
    offlineUptime: round(offlineUptime, 2),
    totals: {
      baselineL: totalBaseline,
      actualL: totalActual,
      savedL: totalBaseline - totalActual,
      preemptionSavedL,
      offlineHours: round((seededOfflineMs + fallback.totalMs) / HOUR, 1),
    },
    daily,
    accuracySeries,
    latencySeries: recentLatency.map((l, i) => ({ i: i + 1, ts: l.ts, ms: l.ms, path: l.path })),
  }
}
