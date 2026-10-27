import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  Cloud,
  CloudOff,
  Code2,
  Cpu,
  HardDrive,
  Radio,
  Router,
  ShieldAlert,
  Wifi,
  WifiOff,
} from 'lucide-react'
import AnimatedNumber from '../components/ui/AnimatedNumber'
import PageHeader from '../components/ui/PageHeader'
import { Badge, StatusPill } from '../components/ui/Badge'
import { Stagger, StaggerItem } from '../components/motion/Stagger'
import { CONNECTION_MODES, HARDWARE } from '../config/device'
import { useNow } from '../hooks/useNow'
import { useLive } from '../hooks/useTelemetry'
import { USE_MOCK, baseUrl, endpoint, realtimeUrl } from '../services/apiClient'
import { simulateOutage } from '../services/telemetryService'
import { useSettingsStore } from '../store/settingsStore'
import { toast } from '../store/toastStore'
import { relativeTime, shortTime } from '../utils/format'

const IPV4_RE = /^(\d{1,3}\.){3}\d{1,3}$/

export default function Connectivity() {
  const { live } = useLive()
  const now = useNow(1000)
  const settings = useSettingsStore((s) => s.settings)
  const updateSettings = useSettingsStore((s) => s.updateSettings)

  const [ipDraft, setIpDraft] = useState(settings.esp32Ip)
  const [ipError, setIpError] = useState('')

  const conn = live?.connection
  const mode = settings.connectionMode
  const fallback = conn?.edgeFallback
  const pendingRecords = live ? live.sd.logged - live.sd.synced : 0

  function handleSelectMode(nextMode) {
    updateSettings({ connectionMode: nextMode })
    const meta = CONNECTION_MODES.find((m) => m.id === nextMode)
    toast({
      title: `Switched to ${meta?.label ?? nextMode}`,
      description: meta?.description,
      tone: nextMode === 'offline' ? 'warning' : 'info',
    })
  }

  function handleSaveIp(e) {
    e.preventDefault()
    const clean = ipDraft.trim()
    if (!IPV4_RE.test(clean)) {
      setIpError('Enter a valid IPv4 address (e.g. 192.168.4.1).')
      return
    }
    setIpError('')
    updateSettings({ esp32Ip: clean })
    toast({ title: 'ESP32 IP updated', description: `http://${clean}`, tone: 'success' })
  }

  function handleSimulateOutage() {
    if (mode !== 'cloud') {
      updateSettings({ connectionMode: 'cloud' })
    }
    const started = simulateOutage(30000)
    if (started) {
      toast({
        title: 'Simulated 30s cloud outage started',
        description: 'ESP32 is now running edge fallback logic and buffering to SD card.',
        tone: 'warning',
      })
    } else {
      toast({ title: 'Outage already active', tone: 'info' })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Connectivity & Offline Mode"
        icon={Wifi}
        description="Switch between Cloud (Laravel API), Local ESP32 Wi-Fi Hotspot (192.168.4.1), and Offline Edge Fallback."
        actions={
          <button type="button" onClick={handleSimulateOutage} className="btn-secondary">
            <CloudOff className="h-4 w-4" aria-hidden="true" /> Simulate 30s cloud outage
          </button>
        }
      />

      <Stagger className="space-y-6">
        {/* Prominent Edge Fallback status card */}
        <StaggerItem>
          <section
            className={`card p-5 ${
              fallback
                ? 'border-amber-400 bg-amber-50/90 dark:border-amber-500/40 dark:bg-amber-500/10'
                : 'border-emerald-200/80 bg-emerald-50/40 dark:border-emerald-500/30 dark:bg-emerald-950/15'
            }`}
            aria-label="Edge fallback status"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${
                    fallback ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'
                  }`}
                >
                  {fallback ? <ShieldAlert className="h-6 w-6" aria-hidden="true" /> : <CheckCircle2 className="h-6 w-6" aria-hidden="true" />}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="section-title">
                      {fallback
                        ? 'Edge fallback logic ACTIVE on ESP32'
                        : 'Live link healthy · Edge rules synced'}
                    </h2>
                    <StatusPill status={fallback ? 'warn' : 'ok'} label={fallback ? 'Autonomous Edge Fallback' : 'Connected'} />
                  </div>
                  <p className="mt-1 max-w-3xl text-sm text-slate-700 dark:text-slate-300">
                    {fallback
                      ? `Internet or cloud API is unreachable. The ${HARDWARE.mcu} continues evaluating soil moisture thresholds locally, uses the last cached OpenWeatherMap forecast (${conn ? shortTime(conn.weatherFetchedAt) : '—'}), logs every 2s reading to the microSD card, and dispatches critical alerts via the ${HARDWARE.gsmModule} GSM module.`
                      : 'Telemetry is streaming every 2 seconds and SD card logs are synchronized with the dashboard.'}
                  </p>
                </div>
              </div>
              {conn?.outageUntil && conn.outageUntil > now && (
                <Badge tone="warn">Auto-reconnect in {Math.ceil((conn.outageUntil - now) / 1000)} s</Badge>
              )}
            </div>
          </section>
        </StaggerItem>

        {/* Three connection mode selector cards */}
        <StaggerItem as="section" aria-labelledby="conn-modes-heading">
          <h2 id="conn-modes-heading" className="section-title mb-3">
            Select connection mode
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {CONNECTION_MODES.map((m) => {
              const active = mode === m.id
              const Icon = m.icon
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelectMode(m.id)}
                  aria-pressed={active}
                  className={`card card-hover flex flex-col items-start justify-between p-5 text-left transition-all active:scale-[0.99] ${
                    active ? 'border-brand-500 ring-2 ring-brand-500 dark:border-brand-400 dark:ring-brand-400' : ''
                  }`}
                >
                  <div className="w-full">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`grid h-11 w-11 place-items-center rounded-2xl ${
                          active
                            ? 'bg-brand-600 text-white dark:bg-brand-500 dark:text-slate-950'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      {active && <Badge tone="brand">Active mode</Badge>}
                    </div>
                    <h3 className="mt-4 text-lg font-bold">{m.label}</h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{m.description}</p>
                  </div>

                  <div className="mt-4 w-full border-t border-slate-100 pt-3 font-mono text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    {m.id === 'cloud' && <span className="truncate block">Base: {settings.apiBaseUrl}</span>}
                    {m.id === 'local' && <span>Direct IP: http://{settings.esp32Ip}</span>}
                    {m.id === 'offline' && <span>SD buffer + {HARDWARE.gsmModule} SMS</span>}
                  </div>
                </button>
              )
            })}
          </div>
        </StaggerItem>

        {/* Local Hotspot direct IP config + Live link diagnostics */}
        <StaggerItem className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <section className="card min-w-0 p-5 lg:col-span-2" aria-labelledby="local-ip-heading">
            <div className="flex items-start gap-2.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                <Router className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 id="local-ip-heading" className="section-title">
                  Local ESP32 Hotspot IP
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Used when your phone joins the <code className="font-mono">HydroSync-ESP32</code> Wi-Fi AP
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveIp} className="mt-4 space-y-3" noValidate>
              <div>
                <label htmlFor="esp32-ip-input" className="label">
                  ESP32 IPv4 address (default 192.168.4.1)
                </label>
                <div className="flex gap-2">
                  <input
                    id="esp32-ip-input"
                    type="text"
                    value={ipDraft}
                    onChange={(e) => {
                      setIpDraft(e.target.value)
                      setIpError('')
                    }}
                    className={`input font-mono ${ipError ? 'input-error' : ''}`}
                    placeholder="192.168.4.1"
                  />
                  <button type="submit" className="btn-primary shrink-0">
                    Apply IP
                  </button>
                </div>
                {ipError ? (
                  <p className="mt-1 text-xs font-semibold text-rose-600 dark:text-rose-400">{ipError}</p>
                ) : (
                  <p className="hint">
                    Also editable in <Link to="/settings" className="font-semibold underline">Settings</Link>.
                  </p>
                )}
              </div>
            </form>

            <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3.5 text-sm dark:bg-slate-950/60">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Wi-Fi RSSI</p>
                <p className="mt-0.5 font-bold">
                  <AnimatedNumber value={conn?.rssi ?? -56} suffix=" dBm" />
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Pending SD sync</p>
                <p className="mt-0.5 font-bold">
                  <AnimatedNumber value={pendingRecords} suffix=" records" />
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Last cloud sync</p>
                <p className="mt-0.5 text-xs font-semibold">
                  {conn ? `${shortTime(conn.lastCloudSync)} (${relativeTime(conn.lastCloudSync, now)})` : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Forecast cache</p>
                <p className="mt-0.5 text-xs font-semibold">
                  {conn ? `${shortTime(conn.weatherFetchedAt)} (${relativeTime(conn.weatherFetchedAt, now)})` : '—'}
                </p>
              </div>
            </div>
          </section>

          {/* Resolved API endpoints & one-line switch preview */}
          <section className="card min-w-0 p-5 lg:col-span-3" aria-labelledby="endpoints-heading">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex min-w-0 items-start gap-2.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <Code2 className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2 id="endpoints-heading" className="section-title">
                    Resolved endpoints for active mode ({mode})
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    One-line switch in <code className="font-mono">src/services/apiClient.js</code>: <code className="font-mono">export const USE_MOCK = {String(USE_MOCK)}</code>
                  </p>
                </div>
              </div>
              <Badge tone={USE_MOCK ? 'info' : 'ok'}>{USE_MOCK ? 'Mock simulator active' : 'Live HTTP/WS'}</Badge>
            </div>

            {/* Mobile stacked endpoint cards */}
            <ul className="mt-4 space-y-2 sm:hidden">
              {[
                { call: 'getLiveTelemetry()', method: 'GET', url: endpoint('telemetry', {}, mode) },
                { call: 'subscribe(cb)', method: 'WS / Poll', url: realtimeUrl() },
                { call: 'sendValveCommand(id, state)', method: 'POST', url: endpoint('valve', { valve: 'irrigation' }, mode) },
                { call: 'getHistory(range)', method: 'GET', url: endpoint('history', {}, mode) },
                { call: 'getWeather()', method: 'GET', url: endpoint('weather', {}, mode) },
                { call: 'syncDeviceConfig(cfg)', method: 'PUT', url: endpoint('config', {}, mode) },
              ].map((row) => (
                <li
                  key={row.call}
                  className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-2.5 font-mono text-xs dark:border-slate-800 dark:bg-slate-950/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{row.call}</span>
                    <span className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {row.method}
                    </span>
                  </div>
                  <p className="mt-1 break-all text-brand-700 dark:text-brand-300">{row.url}</p>
                </li>
              ))}
            </ul>

            {/* Tablet & desktop table */}
            <div className="mt-4 hidden overflow-x-auto sm:block">
              <table className="table-base">
                <thead>
                  <tr>
                    <th scope="col">Service call</th>
                    <th scope="col">Method</th>
                    <th scope="col">Resolved URL ({mode === 'cloud' ? 'Laravel API' : 'ESP32 SoftAP'})</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-xs">
                  <tr>
                    <td>getLiveTelemetry()</td>
                    <td>GET</td>
                    <td className="break-all text-brand-700 dark:text-brand-300">{endpoint('telemetry', {}, mode)}</td>
                  </tr>
                  <tr>
                    <td>subscribe(cb)</td>
                    <td>WS / Poll</td>
                    <td className="break-all text-brand-700 dark:text-brand-300">{realtimeUrl()}</td>
                  </tr>
                  <tr>
                    <td>sendValveCommand(id, state)</td>
                    <td>POST</td>
                    <td className="break-all text-brand-700 dark:text-brand-300">{endpoint('valve', { valve: 'irrigation' }, mode)}</td>
                  </tr>
                  <tr>
                    <td>getHistory(range)</td>
                    <td>GET</td>
                    <td className="break-all text-brand-700 dark:text-brand-300">{endpoint('history', {}, mode)}</td>
                  </tr>
                  <tr>
                    <td>getWeather()</td>
                    <td>GET</td>
                    <td className="break-all text-brand-700 dark:text-brand-300">{endpoint('weather', {}, mode)}</td>
                  </tr>
                  <tr>
                    <td>syncDeviceConfig(cfg)</td>
                    <td>PUT</td>
                    <td className="break-all text-brand-700 dark:text-brand-300">{endpoint('config', {}, mode)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mt-3 break-all text-xs text-slate-500 dark:text-slate-400">
              Active base URL: <code className="font-mono font-semibold">{baseUrl(mode)}</code>
            </p>
          </section>
        </StaggerItem>
      </Stagger>
    </div>
  )
}
