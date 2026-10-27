import { create } from 'zustand'
import * as api from '../services/telemetryService'

/**
 * Live device state, kept in memory (not persisted). Filled by
 * telemetryService.subscribe(), so it works the same with the mock or a
 * real WebSocket / polling transport.
 */

const LIVE_POINTS = 150 // 5 min at 2 s
const LIVE_WINDOW_MS = 5 * 60 * 1000
const TREND_STEP_MS = 10000
const TREND_WINDOW_MS = 30 * 60 * 1000

let unsubscribe = null
let generation = 0 // guards against stale async start() calls (React StrictMode)

export const toPoint = (t) => ({
  ts: t.ts,
  m1: t.moisture[0],
  m2: t.moisture[1],
  m3: t.moisture[2],
  avg: t.moistureAvg,
  ec: t.ec,
  tank: t.tankLevel,
  fert: t.fertTankLevel,
})

const prepend = (list, item, max = 300) => [item, ...list.filter((x) => x.id !== item.id)].slice(0, max)

export const useTelemetryStore = create((set, get) => ({
  status: 'idle', // 'idle' | 'loading' | 'ready' | 'error'
  error: null,
  live: null,
  liveBuffer: [],
  trendBuffer: [],
  alerts: [],
  smsLog: [],
  commandLog: [],
  preemptionLog: [],
  events: [],
  weather: null,

  async start() {
    const gen = ++generation
    unsubscribe?.()
    unsubscribe = null
    set({ status: 'loading', error: null })
    try {
      const [live, trend, alerts, smsLog, commandLog, preemptionLog, weather] = await Promise.all([
        api.getLiveTelemetry(),
        api.getHistory({ preset: '30m' }),
        api.getAlerts(),
        api.getSmsLog(),
        api.getCommandLog(),
        api.getPreemptionLog(),
        api.getWeather(),
      ])
      if (gen !== generation) return
      const cutoff = live.ts - LIVE_WINDOW_MS
      set({
        status: 'ready',
        live,
        trendBuffer: trend,
        liveBuffer: [...trend.filter((p) => p.ts >= cutoff && p.ts < live.ts), toPoint(live)],
        alerts,
        smsLog,
        commandLog,
        preemptionLog,
        weather,
      })
      unsubscribe = api.subscribe((msg) => get().handleMessage(msg))
    } catch (err) {
      if (gen !== generation) return
      set({ status: 'error', error: err?.message || 'Unable to reach HydroSync.' })
    }
  },

  stop() {
    generation++
    unsubscribe?.()
    unsubscribe = null
  },

  handleMessage({ type, payload }) {
    const s = get()
    switch (type) {
      case 'telemetry': {
        const point = toPoint(payload)
        const last = s.liveBuffer[s.liveBuffer.length - 1]
        const liveBuffer = last && last.ts === point.ts ? [...s.liveBuffer.slice(0, -1), point] : [...s.liveBuffer, point].slice(-LIVE_POINTS)
        const lastTrend = s.trendBuffer[s.trendBuffer.length - 1]
        const trendBuffer =
          !lastTrend || point.ts - lastTrend.ts >= TREND_STEP_MS
            ? [...s.trendBuffer, point].filter((p) => p.ts >= point.ts - TREND_WINDOW_MS)
            : s.trendBuffer
        set({ live: payload, liveBuffer, trendBuffer })
        break
      }
      case 'alert':
        set({ alerts: prepend(s.alerts, payload, 200) })
        break
      case 'sms':
        set({ smsLog: prepend(s.smsLog, payload) })
        break
      case 'command':
        set({ commandLog: prepend(s.commandLog, payload) })
        break
      case 'preemption':
        set({ preemptionLog: prepend(s.preemptionLog, payload) })
        break
      case 'event':
        set({ events: prepend(s.events, payload, 500) })
        break
      case 'weather':
        set({ weather: payload })
        break
      default:
        break
    }
  },

  markAlertRead(id) {
    api.acknowledgeAlert(id)
    set((s) => ({ alerts: s.alerts.map((a) => (a.id === id ? { ...a, read: true } : a)) }))
  },

  markAllAlertsRead() {
    api.acknowledgeAllAlerts()
    set((s) => ({ alerts: s.alerts.map((a) => ({ ...a, read: true })) }))
  },
}))
