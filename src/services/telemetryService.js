/**
 * telemetryService: the ONLY data entry point for the UI.
 * ─────────────────────────────────────────────────────────────────────────────
 * Every function below has two branches:
 *   1. USE_MOCK === true  → the in-browser simulator (services/mock/*)
 *   2. USE_MOCK === false → real fetch / WebSocket calls via apiClient.js
 *
 * Components and stores never import the simulator directly, so going live is:
 *   • flip USE_MOCK in services/apiClient.js, and
 *   • make the Laravel API / ESP32 firmware return the same JSON shapes
 *     (see README.md › "Data contracts").
 */
import { USE_MOCK, configureApi, getApiConfig, http, realtimeUrl } from './apiClient'
import { simulator } from './mock/simulator'
import { generateEvents, generateHistory, generatePerformance, resolveRange } from './mock/history'
import { delay, rand } from './mock/random'

export { CommandError } from './mock/simulator'

/** Fake network latency so loading skeletons are visible in the mock. */
const mockLatency = (min = 250, max = 700) => delay(rand(min, max))

async function mock(fn, latency) {
  await mockLatency(...(latency || []))
  simulator.assertHealthy()
  return fn()
}

/* ── Live telemetry ────────────────────────────────────────────────────── */

/** Latest snapshot of every sensor, valve and connection flag. */
export async function getLiveTelemetry() {
  if (USE_MOCK) return mock(() => simulator.getSnapshot())
  // Cloud: GET {API}/telemetry/latest        (Laravel → latest row from `telemetry` table)
  // Local: GET http://192.168.4.1/api/telemetry (ESP32 → current readings as JSON)
  return http('telemetry')
}

/**
 * Subscribe to realtime messages. Callback receives envelopes:
 *   { type: 'telemetry' | 'alert' | 'sms' | 'command' | 'event' | 'preemption' | 'weather', payload }
 * Returns an unsubscribe function.
 */
export function subscribe(callback) {
  if (USE_MOCK) return simulator.subscribe(callback)

  const { connectionMode, deviceId } = getApiConfig()
  if (connectionMode === 'cloud') {
    // Cloud: Laravel Reverb / Pusher-protocol WebSocket. With laravel-echo this becomes:
    //   echo.private(`devices.${deviceId}`).listen('.telemetry', (e) => callback({ type: 'telemetry', payload: e }))
    const ws = new WebSocket(realtimeUrl())
    ws.onopen = () =>
      ws.send(JSON.stringify({ event: 'pusher:subscribe', data: { channel: `devices.${deviceId}` } }))
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.event?.startsWith('pusher')) return
        callback({ type: msg.event.replace(/^\./, ''), payload: JSON.parse(msg.data) })
      } catch {
        /* ignore malformed frames */
      }
    }
    return () => ws.close()
  }

  // Local / offline: poll the ESP32 every 2 s (simplest for the firmware).
  // Swap for `new WebSocket(realtimeUrl())` if the firmware exposes /ws.
  const id = setInterval(async () => {
    try {
      callback({ type: 'telemetry', payload: await http('telemetry', { timeoutMs: 1800 }) })
    } catch {
      /* device unreachable this tick */
    }
  }, 2000)
  return () => clearInterval(id)
}

/* ── Commands ──────────────────────────────────────────────────────────── */

/** Open/close a 12V solenoid valve. `opts.durationMin` starts a timed manual run. */
export async function sendValveCommand(valveId, state, opts = {}) {
  if (USE_MOCK) return simulator.sendValveCommand(valveId, state, opts)
  // Cloud: POST {API}/devices/{device}/valves/{valve}   Local: POST http://192.168.4.1/api/valve/{valve}
  return http('valve', {
    params: { valve: valveId },
    method: 'POST',
    body: { state: state ? 'on' : 'off', duration_min: opts.durationMin ?? null },
  })
}

/** Switch the ESP32 between 'auto' and 'manual'. */
export async function setControlMode(mode) {
  if (USE_MOCK) return simulator.setControlMode(mode)
  return http('mode', { method: 'PUT', body: { mode } })
}

export async function startFertigation(targetEc) {
  if (USE_MOCK) return simulator.startFertigation(targetEc)
  return http('fertigation', { method: 'POST', body: { action: 'start', target_ec: targetEc } })
}

export async function stopFertigation() {
  if (USE_MOCK) return simulator.stopFertigation()
  return http('fertigation', { method: 'POST', body: { action: 'stop' } })
}

/* ── History & logs ────────────────────────────────────────────────────── */

/**
 * Sensor history. range = { preset: '30m' | 'today' | '7d' | '28d' | 'custom', from?, to? }
 * Returns [{ ts, m1, m2, m3, avg, ec, tank, fert }]
 */
export async function getHistory(range) {
  if (USE_MOCK) {
    return mock(() => (range.preset === '30m' ? simulator.getTrend() : generateHistory(range)), [400, 900])
  }
  // Cloud: GET {API}/telemetry/history?from=&to=&bucket=   (Laravel aggregates per bucket)
  // Local: GET http://192.168.4.1/api/history?from=&to=     (ESP32 reads from SD card)
  const r = range.preset === '30m' ? { from: Date.now() - 30 * 60000, to: Date.now(), step: 10000 } : resolveRange(range)
  return http('history', { query: { from: r.from, to: r.to, bucket_ms: r.step } })
}

/** Irrigation & fertigation events in a range. */
export async function getEvents(range) {
  if (USE_MOCK) return mock(() => generateEvents(range, simulator.getLiveEvents()), [400, 900])
  const r = resolveRange(range)
  return http('events', { query: { from: r.from, to: r.to } })
}

export async function getAlerts() {
  if (USE_MOCK) return mock(() => simulator.getAlerts())
  return http('alerts')
}

export async function acknowledgeAlert(id) {
  if (USE_MOCK) return simulator.acknowledgeAlert(id)
  return http('alertAck', { params: { id }, method: 'POST' })
}

export async function acknowledgeAllAlerts() {
  if (USE_MOCK) return simulator.acknowledgeAll()
  return http('alerts', { method: 'PATCH', body: { read: true } })
}

export async function getSmsLog() {
  if (USE_MOCK) return mock(() => simulator.getSms())
  return http('sms')
}

export async function getCommandLog() {
  if (USE_MOCK) return mock(() => simulator.getCommands())
  return http('commands')
}

export async function getPreemptionLog() {
  if (USE_MOCK) return mock(() => simulator.getPreemptions())
  return http('preemptions')
}

/* ── Weather (OpenWeatherMap via backend / ESP32 cache) ────────────────── */

/**
 * 24-hour forecast. In production the Laravel API (or the ESP32 itself) calls
 * OpenWeatherMap One Call with the API key from Settings, so the key never
 * ships in the browser bundle.
 */
export async function getWeather() {
  if (USE_MOCK) return mock(() => simulator.getWeather())
  return http('weather')
}

/* ── Thesis metrics ────────────────────────────────────────────────────── */

export async function getPerformance() {
  if (USE_MOCK) return mock(() => generatePerformance(simulator.getPerformanceInputs()), [300, 600])
  return http('performance')
}

/* ── Config ────────────────────────────────────────────────────────────── */

/**
 * Push the dashboard's config (active crop thresholds, alert settings, SMS
 * recipients, connection mode) to the device/backend.
 */
export async function syncDeviceConfig(cfg) {
  configureApi({ connectionMode: cfg.connectionMode, apiBaseUrl: cfg.apiBaseUrl, esp32Ip: cfg.esp32Ip })
  if (USE_MOCK) return simulator.configure(cfg)
  if (cfg.connectionMode === 'offline') return null // nothing reachable; ESP32 keeps its last config
  return http('config', { method: 'PUT', body: cfg })
}

/* ── Mock-only demo helpers (no-ops against a real backend) ────────────── */

export function simulateOutage(ms = 30000) {
  return USE_MOCK ? simulator.simulateOutage(ms) : false
}

export function setSimulatedFailure(enabled) {
  if (USE_MOCK) simulator.setFailMode(enabled)
}

export const isMock = USE_MOCK
