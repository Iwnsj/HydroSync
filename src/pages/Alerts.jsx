import { useMemo, useState } from 'react'
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  MessageSquare,
  Phone,
  Plus,
  Sliders,
  Trash2,
  XCircle,
} from 'lucide-react'
import AnimatedNumber from '../components/ui/AnimatedNumber'
import PageHeader from '../components/ui/PageHeader'
import SegmentedControl from '../components/ui/SegmentedControl'
import Toggle from '../components/ui/Toggle'
import { AlertList } from '../components/ui/AlertItem'
import { StatusPill } from '../components/ui/Badge'
import { ListSkeleton } from '../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../components/ui/States'
import { Stagger, StaggerItem } from '../components/motion/Stagger'
import { HARDWARE } from '../config/device'
import { useActiveProfile } from '../hooks/useActiveProfile'
import { useLive } from '../hooks/useTelemetry'
import { useSettingsStore } from '../store/settingsStore'
import { useTelemetryStore } from '../store/telemetryStore'
import { toast } from '../store/toastStore'
import { dateTimeFmt } from '../utils/format'

const SEVERITY_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'critical', label: 'Critical' },
  { value: 'warning', label: 'Warning' },
  { value: 'info', label: 'Info' },
]

const PHONE_RE = /^[+\d][\d\s()-]{6,18}$/

export default function Alerts() {
  const { loading, error, retry } = useLive()
  const { crop, thresholds } = useActiveProfile()
  const alerts = useTelemetryStore((s) => s.alerts)
  const smsLog = useTelemetryStore((s) => s.smsLog)
  const markRead = useTelemetryStore((s) => s.markAlertRead)
  const markAllRead = useTelemetryStore((s) => s.markAllAlertsRead)

  const settings = useSettingsStore((s) => s.settings)
  const updateSettings = useSettingsStore((s) => s.updateSettings)
  const updateAlertThresholds = useSettingsStore((s) => s.updateAlertThresholds)

  const [filter, setFilter] = useState('all')
  const [newPhone, setNewPhone] = useState('')
  const [phoneError, setPhoneError] = useState('')

  const unreadCount = useMemo(() => alerts.reduce((n, a) => n + (a.read ? 0 : 1), 0), [alerts])
  const filteredAlerts = useMemo(
    () => (filter === 'all' ? alerts : alerts.filter((a) => a.severity === filter)),
    [alerts, filter],
  )

  function handleAddRecipient(e) {
    e.preventDefault()
    const trimmed = newPhone.trim()
    if (!PHONE_RE.test(trimmed)) {
      setPhoneError('Enter a valid phone number, e.g. +63 917 123 4567.')
      return
    }
    if (settings.recipients.includes(trimmed)) {
      setPhoneError('This phone number is already in the recipient list.')
      return
    }
    updateSettings({ recipients: [...settings.recipients, trimmed] })
    setNewPhone('')
    setPhoneError('')
    toast({ title: 'SMS recipient added', description: trimmed, tone: 'success' })
  }

  function handleRemoveRecipient(num) {
    updateSettings({ recipients: settings.recipients.filter((r) => r !== num) })
    toast({ title: 'Recipient removed', description: num, tone: 'info' })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts & SMS Log"
        icon={Bell}
        description="Real-time alert feed across tank levels, soil moisture, TDS/EC, sensor faults, connectivity and rain preemption — plus SIM800L GSM SMS dispatch logs."
        actions={
          unreadCount > 0 && (
            <button type="button" onClick={markAllRead} className="btn-secondary">
              <CheckCheck className="h-4 w-4" aria-hidden="true" />
              Mark all read (<AnimatedNumber value={unreadCount} />)
            </button>
          )
        }
      />

      {error && (
        <div className="card">
          <ErrorState title="Alerts unavailable" message={error} onRetry={retry} />
        </div>
      )}

      <Stagger className="space-y-6">
        <StaggerItem className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          {/* Alert feed */}
          <section className="card flex min-w-0 flex-col p-5 lg:col-span-3" aria-labelledby="alert-feed-heading">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 id="alert-feed-heading" className="section-title">
                  Alert feed ({filteredAlerts.length})
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Critical alerts pulse on arrival; warning &amp; critical events trigger GSM SMS when enabled.
                </p>
              </div>
              <SegmentedControl
                size="sm"
                label="Filter alerts by severity"
                value={filter}
                onChange={setFilter}
                options={SEVERITY_FILTERS}
              />
            </div>

            {loading ? (
              <ListSkeleton rows={5} />
            ) : filteredAlerts.length === 0 ? (
              <EmptyState
                compact
                icon={Bell}
                title="No alerts match this filter"
                description="Everything is operating within target thresholds."
              />
            ) : (
              <div className="max-h-[540px] overflow-y-auto pr-1">
                <AlertList alerts={filteredAlerts} onMarkRead={markRead} />
              </div>
            )}
          </section>

          {/* Alert thresholds & GSM recipient settings */}
          <section className="card flex min-w-0 flex-col justify-between p-5 lg:col-span-2" aria-labelledby="alert-settings-heading">
            <div className="space-y-5">
              <div>
                <h2 id="alert-settings-heading" className="section-title flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-brand-600 dark:text-brand-400" aria-hidden="true" />
                  Alert thresholds &amp; GSM SMS
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Saved in localStorage and synced to the ESP32 ({HARDWARE.gsmModule}).
                </p>
              </div>

              {/* Tank threshold sliders */}
              <div className="space-y-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <label htmlFor="low-tank-range" className="font-medium">
                      Low water tank alert
                    </label>
                    <span className="tabular font-bold text-sky-700 dark:text-sky-300">
                      Below {settings.alertThresholds.lowTank}%
                    </span>
                  </div>
                  <input
                    id="low-tank-range"
                    type="range"
                    min={5}
                    max={50}
                    step={5}
                    value={settings.alertThresholds.lowTank}
                    onChange={(e) => updateAlertThresholds({ lowTank: Number(e.target.value) })}
                    className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-sky-600 dark:bg-slate-800"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm">
                    <label htmlFor="low-fert-range" className="font-medium">
                      Low Fertilizer Tank F alert
                    </label>
                    <span className="tabular font-bold text-fuchsia-700 dark:text-fuchsia-300">
                      Below {settings.alertThresholds.lowFert}%
                    </span>
                  </div>
                  <input
                    id="low-fert-range"
                    type="range"
                    min={5}
                    max={50}
                    step={5}
                    value={settings.alertThresholds.lowFert}
                    onChange={(e) => updateAlertThresholds({ lowFert: Number(e.target.value) })}
                    className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-fuchsia-600 dark:bg-slate-800"
                  />
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Soil moisture ({thresholds.moistureMin}–{thresholds.moistureMax}%) and EC ({thresholds.ecMin}–{thresholds.ecMax} mS/cm) alert triggers follow the active <strong>{crop.name}</strong> profile.
                </p>
              </div>

              {/* SMS toggle + recipient list */}
              <div className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">GSM SMS dispatch ({HARDWARE.gsmModule})</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Sends SMS even when internet is down
                    </p>
                  </div>
                  <Toggle
                    checked={settings.smsEnabled}
                    onChange={(v) => updateSettings({ smsEnabled: v })}
                    label="Enable GSM SMS alerts"
                  />
                </div>

                <ul className="space-y-2 pt-2">
                  {settings.recipients.map((num) => (
                    <li
                      key={num}
                      className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-950/60"
                    >
                      <span className="inline-flex items-center gap-2 font-mono text-xs font-semibold">
                        <Phone className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" aria-hidden="true" />
                        {num}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRecipient(num)}
                        className="btn-icon h-8 w-8 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                        aria-label={`Remove ${num}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                  {settings.recipients.length === 0 && (
                    <li className="text-xs text-amber-600 dark:text-amber-400">
                      No recipient numbers configured. Add at least one phone number below.
                    </li>
                  )}
                </ul>

                <form onSubmit={handleAddRecipient} className="pt-1" noValidate>
                  <label htmlFor="add-phone" className="label">
                    Add recipient phone number
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="add-phone"
                      type="tel"
                      placeholder="+63 917 123 4567"
                      value={newPhone}
                      onChange={(e) => {
                        setNewPhone(e.target.value)
                        setPhoneError('')
                      }}
                      className={`input ${phoneError ? 'input-error' : ''}`}
                    />
                    <button type="submit" className="btn-primary shrink-0">
                      <Plus className="h-4 w-4" aria-hidden="true" /> Add
                    </button>
                  </div>
                  {phoneError && <p className="mt-1 text-xs font-semibold text-rose-600 dark:text-rose-400">{phoneError}</p>}
                </form>
              </div>
            </div>
          </section>
        </StaggerItem>

        {/* GSM SMS Log table */}
        <StaggerItem as="section" className="card p-5" aria-labelledby="sms-log-heading">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 id="sms-log-heading" className="section-title flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-slate-500" aria-hidden="true" /> GSM SMS log ({smsLog.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Outbound messages transmitted by the ESP32&apos;s {HARDWARE.gsmModule} module
              </p>
            </div>
          </div>

          {loading ? (
            <ListSkeleton rows={4} />
          ) : smsLog.length === 0 ? (
            <EmptyState compact icon={MessageSquare} title="No SMS messages sent yet" description="Warning and critical alerts will dispatch SMS messages to your recipient numbers." />
          ) : (
            <>
              {/* Mobile stacked SMS log */}
              <ul className="space-y-2.5 sm:hidden">
                {smsLog.slice(0, 25).map((s) => {
                  const sent = s.status === 'Sent'
                  return (
                    <li
                      key={s.id}
                      className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-100">{s.to}</span>
                        <StatusPill status={sent ? 'ok' : 'bad'} icon={sent ? CheckCircle2 : XCircle} label={s.status} />
                      </div>
                      <p className="mt-1.5 text-sm text-slate-700 dark:text-slate-200">{s.message}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-slate-500 dark:text-slate-400">
                        <span>{dateTimeFmt(s.ts)}</span>
                        <span>· {s.module}</span>
                      </div>
                    </li>
                  )
                })}
              </ul>

              {/* Tablet & desktop table */}
              <div className="hidden overflow-x-auto sm:block">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th scope="col">Timestamp</th>
                      <th scope="col">Recipient</th>
                      <th scope="col">Message</th>
                      <th scope="col">Module</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {smsLog.slice(0, 25).map((s) => {
                      const sent = s.status === 'Sent'
                      return (
                        <tr key={s.id}>
                          <td className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">{dateTimeFmt(s.ts)}</td>
                          <td className="whitespace-nowrap font-mono text-xs font-semibold">{s.to}</td>
                          <td className="max-w-lg text-sm text-slate-700 dark:text-slate-200">{s.message}</td>
                          <td className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">{s.module}</td>
                          <td className="whitespace-nowrap">
                            <StatusPill status={sent ? 'ok' : 'bad'} icon={sent ? CheckCircle2 : XCircle} label={s.status} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </StaggerItem>
      </Stagger>
    </div>
  )
}
