import { useEffect, useState } from 'react'
import {
  Check,
  Globe,
  KeyRound,
  Palette,
  RotateCcw,
  Save,
  Server,
  Settings as SettingsIcon,
  Sparkles,
  Wrench,
} from 'lucide-react'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import PageHeader from '../components/ui/PageHeader'
import SegmentedControl from '../components/ui/SegmentedControl'
import Toggle from '../components/ui/Toggle'
import { Stagger, StaggerItem } from '../components/motion/Stagger'
import { isMock, setSimulatedFailure } from '../services/telemetryService'
import { useSettingsStore } from '../store/settingsStore'
import { useTelemetryStore } from '../store/telemetryStore'
import { toast } from '../store/toastStore'

const IPV4_RE = /^(\d{1,3}\.){3}\d{1,3}$/

export default function Settings() {
  const settings = useSettingsStore((s) => s.settings)
  const updateSettings = useSettingsStore((s) => s.updateSettings)
  const resetAll = useSettingsStore((s) => s.resetAll)

  const [networkDraft, setNetworkDraft] = useState({
    esp32Ip: settings.esp32Ip,
    apiBaseUrl: settings.apiBaseUrl,
    owmApiKey: settings.owmApiKey,
  })
  const [ipError, setIpError] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const [failSim, setFailSim] = useState(false)

  useEffect(() => {
    setNetworkDraft({
      esp32Ip: settings.esp32Ip,
      apiBaseUrl: settings.apiBaseUrl,
      owmApiKey: settings.owmApiKey,
    })
  }, [settings.esp32Ip, settings.apiBaseUrl, settings.owmApiKey])

  function handleSaveNetwork(e) {
    e.preventDefault()
    const cleanIp = networkDraft.esp32Ip.trim()
    if (!IPV4_RE.test(cleanIp)) {
      setIpError('Enter a valid IPv4 address, e.g. 192.168.4.1')
      return
    }
    setIpError('')
    updateSettings({
      esp32Ip: cleanIp,
      apiBaseUrl: networkDraft.apiBaseUrl.trim() || 'https://api.hydrosync.example/api/v1',
      owmApiKey: networkDraft.owmApiKey.trim(),
    })
    toast({ title: 'Endpoint & API settings saved', tone: 'success' })
  }

  function handleToggleFailSim(next) {
    setFailSim(next)
    setSimulatedFailure(next)
    useTelemetryStore.getState().start()
    toast({
      title: next ? 'Simulated API error state enabled' : 'Simulated API error cleared',
      description: next ? 'Data components now show their error states for testing.' : 'Live telemetry restored.',
      tone: next ? 'warning' : 'success',
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        icon={SettingsIcon}
        description="Configure ESP32 IP and Laravel API endpoints, measurement units, EC/ppm conversion factor, theme, motion and regional preferences."
        actions={
          <button type="button" onClick={() => setConfirmReset(true)} className="btn-secondary">
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset all to defaults
          </button>
        }
      />

      <Stagger className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Device & Backend Endpoints */}
        <StaggerItem className="min-w-0">
          <form onSubmit={handleSaveNetwork} className="card flex h-full flex-col justify-between p-5" noValidate>
            <div className="space-y-4">
              <div className="flex items-start gap-2.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                  <Server className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2 className="section-title">Device &amp; API endpoints</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Used by <code className="font-mono">services/apiClient.js</code> when switching from mock to production
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="set-esp32-ip" className="label">
                  ESP32 Local Hotspot IP address
                </label>
                <input
                  id="set-esp32-ip"
                  type="text"
                  value={networkDraft.esp32Ip}
                  onChange={(e) => {
                    setNetworkDraft({ ...networkDraft, esp32Ip: e.target.value })
                    setIpError('')
                  }}
                  className={`input font-mono ${ipError ? 'input-error' : ''}`}
                  placeholder="192.168.4.1"
                />
                {ipError ? (
                  <p className="mt-1 text-xs font-semibold text-rose-600 dark:text-rose-400">{ipError}</p>
                ) : (
                  <p className="hint">Default SoftAP gateway on the ESP32 firmware is 192.168.4.1.</p>
                )}
              </div>

              <div>
                <label htmlFor="set-api-url" className="label">
                  Laravel API base URL (placeholder)
                </label>
                <input
                  id="set-api-url"
                  type="url"
                  value={networkDraft.apiBaseUrl}
                  onChange={(e) => setNetworkDraft({ ...networkDraft, apiBaseUrl: e.target.value })}
                  className="input font-mono text-sm"
                  placeholder="https://api.hydrosync.example/api/v1"
                />
                <p className="hint">Cloud mode REST prefix (e.g. https://your-domain.com/api/v1).</p>
              </div>

              <div>
                <label htmlFor="set-owm-key" className="label flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  OpenWeatherMap API key (placeholder)
                </label>
                <input
                  id="set-owm-key"
                  type="password"
                  autoComplete="off"
                  value={networkDraft.owmApiKey}
                  onChange={(e) => setNetworkDraft({ ...networkDraft, owmApiKey: e.target.value })}
                  className="input font-mono text-sm"
                  placeholder="owm_live_xxxxxxxxxxxxxxxx"
                />
                <p className="hint">
                  Stored locally as a placeholder; in production the Laravel backend or ESP32 holds this key.
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
              <button type="submit" className="btn-primary">
                <Save className="h-4 w-4" aria-hidden="true" /> Save endpoints
              </button>
            </div>
          </form>
        </StaggerItem>

        {/* Units & Nutrient Conversion */}
        <StaggerItem className="min-w-0">
          <section className="card flex h-full flex-col justify-between p-5" aria-labelledby="units-heading">
            <div className="space-y-4">
              <div className="flex items-start gap-2.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                  <Globe className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2 id="units-heading" className="section-title">
                    Units &amp; TDS conversion
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Changes apply immediately across all KPI cards, gauges, charts and CSV exports
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
                <div>
                  <p className="text-sm font-semibold">Primary nutrient display</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Show EC (mS/cm) or TDS (ppm) first</p>
                </div>
                <SegmentedControl
                  size="sm"
                  label="Primary nutrient unit"
                  value={settings.nutrientUnit}
                  onChange={(v) => updateSettings({ nutrientUnit: v })}
                  options={[
                    { value: 'ec', label: 'EC (mS/cm)' },
                    { value: 'ppm', label: 'TDS (ppm)' },
                  ]}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
                <div>
                  <p className="text-sm font-semibold">EC → ppm conversion factor</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Analog TDS probe scale: ppm = EC × 1000 × factor
                  </p>
                </div>
                <SegmentedControl
                  size="sm"
                  label="EC to ppm conversion factor"
                  value={settings.ecFactor}
                  onChange={(v) => updateSettings({ ecFactor: Number(v) })}
                  options={[
                    { value: 0.5, label: '0.5 (500 scale)' },
                    { value: 0.7, label: '0.7 (700 scale)' },
                  ]}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
                <div>
                  <p className="text-sm font-semibold">Temperature unit</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Weather forecast &amp; evapotranspiration display</p>
                </div>
                <SegmentedControl
                  size="sm"
                  label="Temperature unit"
                  value={settings.tempUnit}
                  onChange={(v) => updateSettings({ tempUnit: v })}
                  options={[
                    { value: 'C', label: 'Celsius (°C)' },
                    { value: 'F', label: 'Fahrenheit (°F)' },
                  ]}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
                <div>
                  <p className="text-sm font-semibold">Water volume unit</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Tank capacity, daily usage &amp; water saved</p>
                </div>
                <SegmentedControl
                  size="sm"
                  label="Water volume unit"
                  value={settings.volumeUnit}
                  onChange={(v) => updateSettings({ volumeUnit: v })}
                  options={[
                    { value: 'L', label: 'Liters (L)' },
                    { value: 'gal', label: 'Gallons (gal)' },
                  ]}
                />
              </div>
            </div>
          </section>
        </StaggerItem>

        {/* Appearance, Motion & Language */}
        <StaggerItem className="min-w-0">
          <section className="card space-y-4 p-5" aria-labelledby="appearance-heading">
            <div className="flex items-start gap-2.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
                <Palette className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 id="appearance-heading" className="section-title">
                  Appearance, animations &amp; language
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Outdoor-friendly contrast, motion controls and language placeholder
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
              <div>
                <p className="text-sm font-semibold">Color theme</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">High-contrast light mode for bright sunlight</p>
              </div>
              <SegmentedControl
                size="sm"
                label="Color theme"
                value={settings.theme}
                onChange={(v) => updateSettings({ theme: v })}
                options={[
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                  { value: 'system', label: 'System' },
                ]}
              />
            </div>

            <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
              <div className="flex items-start gap-2.5">
                <Sparkles className="mt-0.5 h-4 w-4 text-brand-600 dark:text-brand-400" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold">Animations &amp; count-up numbers</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Page transitions, staggered cards and count-up telemetry. Automatically respects OS <code className="font-mono">prefers-reduced-motion</code>.
                  </p>
                </div>
              </div>
              <Toggle
                checked={settings.animations}
                onChange={(v) => updateSettings({ animations: v })}
                label="Enable dashboard animations"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
              <div>
                <p className="text-sm font-semibold">Language (placeholder)</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Local crop names (e.g. Siling labuyo, Talong, Sitaw) are shown alongside English
                </p>
              </div>
              <SegmentedControl
                size="sm"
                label="Language"
                value={settings.language}
                onChange={(v) => {
                  updateSettings({ language: v })
                  toast({
                    title: v === 'fil' ? 'Wika: Filipino (placeholder)' : 'Language: English',
                    description: 'Full UI localization dictionary can be plugged in later.',
                    tone: 'info',
                  })
                }}
                options={[
                  { value: 'en', label: 'English' },
                  { value: 'fil', label: 'Filipino (Tagalog)' },
                ]}
              />
            </div>
          </section>
        </StaggerItem>

        {/* Simulator / QA Diagnostics */}
        <StaggerItem className="min-w-0">
          <section className="card flex h-full flex-col justify-between p-5" aria-labelledby="qa-heading">
            <div className="space-y-4">
              <div className="flex items-start gap-2.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <Wrench className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2 id="qa-heading" className="section-title">
                    Simulator &amp; UI diagnostics
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Test error states and inspect localStorage persistence while running in mock mode
                  </p>
                </div>
              </div>

              {isMock && (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
                  <div>
                    <p className="text-sm font-semibold">Simulate API failure (HTTP 503)</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Forces <code className="font-mono">telemetryService</code> calls to fail so you can verify error states and retry buttons
                    </p>
                  </div>
                  <Toggle
                    checked={failSim}
                    onChange={handleToggleFailSim}
                    label="Simulate API failure"
                  />
                </div>
              )}

              <div className="rounded-2xl bg-slate-50 p-4 text-xs text-slate-600 dark:bg-slate-950/60 dark:text-slate-400">
                <p className="font-semibold text-slate-800 dark:text-slate-200">Persisted state (<code className="font-mono">localStorage[&quot;hydrosync-settings&quot;]</code>)</p>
                <p className="mt-1">
                  Selected crop, active growth stage, per-crop threshold edits, custom crop profile, alert thresholds, SMS recipients, units, theme and animation preferences are saved in your browser.
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <Check className="h-3.5 w-3.5" aria-hidden="true" /> Auto-saved to localStorage
              </span>
              <button type="button" onClick={() => setConfirmReset(true)} className="font-semibold text-rose-600 hover:underline dark:text-rose-400">
                Reset everything…
              </button>
            </div>
          </section>
        </StaggerItem>
      </Stagger>

      <ConfirmDialog
        open={confirmReset}
        title="Reset all settings and crop edits?"
        description="This will restore the default Chili crop profile, clear all custom crop threshold edits, and reset endpoints, units and alert recipients back to defaults."
        confirmLabel="Reset everything"
        tone="danger"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          resetAll()
          setConfirmReset(false)
          toast({ title: 'All settings restored to defaults', tone: 'info' })
        }}
      />
    </div>
  )
}
