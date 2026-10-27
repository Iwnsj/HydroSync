/**
 * HTTP / realtime client for the future real backends.
 * ─────────────────────────────────────────────────────────────────────────────
 *  ▶ THE ONE-LINE SWITCH: set USE_MOCK = false to stop simulating and call the
 *    real Laravel API (Cloud mode) or the ESP32's local JSON API (Local mode).
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const USE_MOCK = true

/** Runtime config, kept in sync with user Settings via syncDeviceConfig(). */
const config = {
  connectionMode: 'cloud', // 'cloud' | 'local' | 'offline'
  apiBaseUrl: 'https://api.hydrosync.example/api/v1',
  esp32Ip: '192.168.4.1',
  deviceId: 'esp32-hydrosync-01',
  reverbKey: 'hydrosync-key', // Laravel Reverb app key (placeholder)
}

export function configureApi(patch) {
  Object.assign(config, patch)
}

export function getApiConfig() {
  return { ...config }
}

/**
 * REST paths per backend.
 *  cloud → Laravel routes (routes/api.php), base = Settings › API base URL
 *  local → ESP32 firmware web server (ESPAsyncWebServer), base = http://<ESP32 IP>
 * Offline mode uses the local paths too: if the phone can still reach the
 * ESP32 hotspot it reads from the device directly.
 */
export const ENDPOINTS = {
  cloud: {
    telemetry: '/telemetry/latest',
    history: '/telemetry/history',
    events: '/irrigation-events',
    alerts: '/alerts',
    alertAck: '/alerts/{id}/acknowledge',
    weather: '/weather/forecast',
    sms: '/sms-logs',
    commands: '/commands',
    preemptions: '/rain-preemptions',
    performance: '/metrics/performance',
    valve: '/devices/{device}/valves/{valve}',
    mode: '/devices/{device}/mode',
    fertigation: '/devices/{device}/fertigation',
    config: '/devices/{device}/config',
  },
  local: {
    telemetry: '/api/telemetry',
    history: '/api/history',
    events: '/api/events',
    alerts: '/api/alerts',
    alertAck: '/api/alerts/{id}/ack',
    weather: '/api/weather-cache',
    sms: '/api/sms',
    commands: '/api/commands',
    preemptions: '/api/preemptions',
    performance: '/api/metrics',
    valve: '/api/valve/{valve}',
    mode: '/api/mode',
    fertigation: '/api/fertigation',
    config: '/api/config',
  },
}

const backendFor = (mode = config.connectionMode) => (mode === 'cloud' ? 'cloud' : 'local')

export function baseUrl(mode = config.connectionMode) {
  return backendFor(mode) === 'local' ? `http://${config.esp32Ip}` : config.apiBaseUrl.replace(/\/$/, '')
}

/** Build a full URL, e.g. endpoint('valve', { valve: 'irrigation' }). */
export function endpoint(name, params = {}, mode) {
  const backend = backendFor(mode)
  let path = ENDPOINTS[backend][name]
  const all = { device: config.deviceId, ...params }
  Object.entries(all).forEach(([k, v]) => {
    path = path.replace(`{${k}}`, encodeURIComponent(v))
  })
  return `${baseUrl(mode)}${path}`
}

/** Realtime transport URL: Laravel Reverb (Pusher protocol) or the ESP32 WebSocket. */
export function realtimeUrl() {
  if (backendFor() === 'local') return `ws://${config.esp32Ip}/ws`
  const host = new URL(config.apiBaseUrl).host
  return `wss://${host}/app/${config.reverbKey}?protocol=7&client=js&version=8.4.0`
}

/** Minimal fetch wrapper with timeout + JSON handling. */
export async function http(name, { params, query, method = 'GET', body, timeoutMs = 8000 } = {}) {
  const url = new URL(endpoint(name, params))
  if (query) Object.entries(query).forEach(([k, v]) => v != null && url.searchParams.set(k, v))
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        // Cloud: add the Laravel Sanctum token here, e.g.
        // Authorization: `Bearer ${localStorage.getItem('hydrosync-token')}`,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${url.pathname}`)
    return res.status === 204 ? null : res.json()
  } catch (err) {
    if (err.name === 'AbortError') throw new Error(`Request timed out after ${timeoutMs} ms`)
    throw err
  } finally {
    clearTimeout(timer)
  }
}
