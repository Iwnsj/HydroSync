import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bot,
  CheckCircle2,
  Clock,
  CloudRain,
  Droplets,
  FlaskConical,
  Gauge,
  Hand,
  Lock,
  Play,
  Square,
  Terminal,
  XCircle,
} from 'lucide-react'
import AnimatedNumber from '../components/ui/AnimatedNumber'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import PageHeader from '../components/ui/PageHeader'
import ProgressBar from '../components/ui/ProgressBar'
import SegmentedControl from '../components/ui/SegmentedControl'
import ValveCard from '../components/ui/ValveCard'
import { Badge, StatusPill } from '../components/ui/Badge'
import { CardSkeleton, ListSkeleton } from '../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../components/ui/States'
import { Stagger, StaggerItem } from '../components/motion/Stagger'
import { VALVES } from '../config/device'
import { useActiveProfile } from '../hooks/useActiveProfile'
import { useNow } from '../hooks/useNow'
import { useLive } from '../hooks/useTelemetry'
import { useUnits } from '../hooks/useUnits'
import { sendValveCommand, setControlMode, startFertigation, stopFertigation } from '../services/telemetryService'
import { useTelemetryStore } from '../store/telemetryStore'
import { toast } from '../store/toastStore'
import { fertigationTarget, irrigationCloseAt, isRainPreempted } from '../utils/controlLogic'
import { clamp, countdown, ecToPpm, fmtNum, timeFmt } from '../utils/format'

const RUN_DURATIONS = [
  { value: 0, label: 'Until stopped' },
  { value: 5, label: '5 min' },
  { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
]

export default function DeviceControl() {
  const { live, loading, error, retry } = useLive()
  const { crop, stage, thresholds } = useActiveProfile()
  const units = useUnits()
  const commands = useTelemetryStore((s) => s.commandLog)
  const now = useNow(1000)

  const [runMinutes, setRunMinutes] = useState(10)
  const [targetEc, setTargetEc] = useState(() => fertigationTarget(thresholds))
  const [pendingKey, setPendingKey] = useState(null)
  const [confirmState, setConfirmState] = useState(null) // { title, description, tone, action }

  const isAuto = live?.mode === 'auto'
  const fallback = live?.connection.edgeFallback
  const closeAt = irrigationCloseAt(thresholds)
  const defaultFertTarget = fertigationTarget(thresholds)
  const effectiveTargetEc = clamp(Number(targetEc) || defaultFertTarget, thresholds.ecMin, thresholds.ecMax)

  async function runAction(key, fn, successTitle) {
    setPendingKey(key)
    try {
      const res = await fn()
      toast({
        title: successTitle,
        description: res?.detail ? `${res.detail} (${res.latencyMs} ms)` : undefined,
        tone: 'success',
      })
    } catch (err) {
      toast({ title: 'Command failed', description: err.message, tone: 'error' })
    } finally {
      setPendingKey(null)
      setConfirmState(null)
    }
  }

  function handleModeSwitch(nextMode) {
    if (!live || nextMode === live.mode) return
    if (nextMode === 'manual') {
      setConfirmState({
        title: 'Switch to Manual control?',
        description:
          'Automatic moisture and fertigation rules will pause while Manual mode is active. Remember to switch back to Automatic when done.',
        confirmLabel: 'Enable Manual mode',
        tone: 'primary',
        key: 'mode',
        fn: () => setControlMode('manual'),
        successTitle: 'Manual mode enabled',
      })
    } else {
      runAction('mode', () => setControlMode('auto'), 'Automatic mode enabled')
    }
  }

  function requestValveToggle(valve, nextOn, durationMin = runMinutes) {
    const durText = nextOn && durationMin > 0 ? ` for ${durationMin} minutes` : ''
    setConfirmState({
      title: `${nextOn ? 'Open' : 'Close'} ${valve.name}?`,
      description: nextOn
        ? `This will energize the 12V solenoid (${valve.relay}) and open ${valve.name}${durText}.`
        : `This will de-energize ${valve.relay} and close ${valve.name} immediately.`,
      confirmLabel: nextOn ? `Open valve${durText}` : 'Close valve',
      tone: nextOn ? 'primary' : 'danger',
      key: valve.id,
      fn: () => sendValveCommand(valve.id, nextOn, { durationMin: nextOn && durationMin > 0 ? durationMin : null }),
      successTitle: `${valve.name} ${nextOn ? 'opened' : 'closed'}`,
    })
  }

  const fert = live?.fertigation
  const fertProgress = fert
    ? clamp(((live.ec - fert.startEc) / Math.max(0.05, fert.targetEc - fert.startEc)) * 100, 0, 100)
    : clamp(((live?.ec ?? 0) / effectiveTargetEc) * 100, 0, 100)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Device Control"
        icon={Gauge}
        description="Switch between autonomous ESP32 rule control and manual 12V solenoid actuation, run timed irrigation cycles, or dose fertigation."
        actions={
          live && (
            <SegmentedControl
              label="Control mode"
              value={live.mode}
              onChange={handleModeSwitch}
              disabled={pendingKey === 'mode' || fallback}
              options={[
                { value: 'auto', label: 'Automatic', icon: Bot },
                { value: 'manual', label: 'Manual', icon: Hand },
              ]}
            />
          )
        }
      />

      {error && (
        <div className="card">
          <ErrorState title="Device control unavailable" message={error} onRetry={retry} />
        </div>
      )}

      <Stagger className="space-y-6">
        {/* Active rule logic / manual banner */}
        <StaggerItem>
          {loading ? (
            <CardSkeleton lines={3} />
          ) : live ? (
            <section
              className={`card p-5 ${
                isAuto
                  ? 'border-brand-200/80 bg-gradient-to-br from-brand-50/70 via-white to-emerald-50/40 dark:border-brand-500/30 dark:from-brand-950/30 dark:via-slate-900 dark:to-slate-900'
                  : 'border-amber-200/80 bg-amber-50/40 dark:border-amber-500/30 dark:bg-amber-950/15'
              }`}
              aria-label="Active control mode details"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${
                      isAuto
                        ? 'bg-brand-600 text-white dark:bg-brand-500 dark:text-slate-950'
                        : 'bg-amber-500 text-white'
                    }`}
                  >
                    {isAuto ? <Bot className="h-5 w-5" aria-hidden="true" /> : <Hand className="h-5 w-5" aria-hidden="true" />}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="section-title">
                        {isAuto ? 'Automatic mode active · ESP32 edge rules' : 'Manual mode active · Direct operator control'}
                      </h2>
                      <Badge tone={isAuto ? 'brand' : 'warn'}>
                        {crop.emoji} {crop.name} ({stage.label})
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {isAuto
                        ? 'Manual valve toggles are locked so operator taps cannot conflict with autonomous rules.'
                        : 'Automatic rules are paused. Every valve action asks for confirmation and is logged below.'}
                    </p>
                  </div>
                </div>
                <Link to="/crops" className="btn-secondary min-h-[38px] px-3 text-xs">
                  Edit crop thresholds
                </Link>
              </div>

              {/* Active rule cards */}
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <RuleStep
                  icon={Droplets}
                  title="1. Open irrigation"
                  rule={`Avg soil moisture < ${thresholds.moistureMin}% → OPEN Irrigation Valve`}
                  liveText={`Current avg: ${live.moistureAvg ?? '—'}%`}
                  active={live.moistureAvg != null && live.moistureAvg < thresholds.moistureMin}
                />
                <RuleStep
                  icon={CheckCircle2}
                  title="2. Target recovery"
                  rule={`Avg moisture ≥ ${closeAt}% or ${thresholds.irrigationMin} min max → CLOSE valve`}
                  liveText={`Band: ${thresholds.moistureMin}–${thresholds.moistureMax}%`}
                  active={live.valves.irrigation}
                />
                <RuleStep
                  icon={CloudRain}
                  title="3. Rain preemption"
                  rule={`Forecast rain ≥ ${thresholds.rainThreshold}% → SKIP / STOP irrigation`}
                  liveText={`Current forecast: ${live.rain.probability}%`}
                  active={isRainPreempted(live.rain.probability, thresholds.rainThreshold)}
                />
                <RuleStep
                  icon={FlaskConical}
                  title="4. Auto fertigation"
                  rule={`EC < ${thresholds.ecMin} mS/cm → dose Tank F to ${defaultFertTarget.toFixed(2)} mS/cm`}
                  liveText={`Current EC: ${live.ec.toFixed(2)} mS/cm (${Math.round(ecToPpm(live.ec, units.nutrient.factor))} ppm)`}
                  active={Boolean(live.fertigation)}
                />
              </div>
            </section>
          ) : null}
        </StaggerItem>

        {/* Valve cards + manual run timer */}
        <StaggerItem className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {loading
            ? VALVES.map((v) => <CardSkeleton key={v.id} lines={3} />)
            : live &&
              VALVES.map((v) => {
                const isOn = live.valves[v.id]
                const running = live.manualRun && live.manualRun.valveId === v.id
                return (
                  <ValveCard
                    key={v.id}
                    valve={v}
                    isOn={isOn}
                    interactive
                    disabled={isAuto || fallback}
                    pending={pendingKey === v.id}
                    manualRun={live.manualRun}
                    onToggle={(nextOn) => requestValveToggle(v, nextOn, runMinutes)}
                    note={
                      isAuto
                        ? 'Locked in Automatic mode. Switch to Manual mode above to toggle.'
                        : fallback
                          ? 'Unavailable while Cloud is offline. Switch to Local hotspot mode to control directly.'
                          : running
                            ? `Timed manual run (${live.manualRun.durationMin} min) in progress.`
                            : 'Tap the toggle or pick a timer preset below.'
                    }
                    extra={
                      <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                            {isAuto ? <Lock className="h-3.5 w-3.5" aria-hidden="true" /> : <Clock className="h-3.5 w-3.5" aria-hidden="true" />}
                            Manual run timer
                          </span>
                          {running && (
                            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                              Auto-off in {countdown(live.manualRun.endsAt - now)}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {RUN_DURATIONS.map((d) => (
                            <button
                              key={d.value}
                              type="button"
                              disabled={isAuto || fallback}
                              onClick={() => setRunMinutes(d.value)}
                              aria-pressed={runMinutes === d.value}
                              className={`min-h-[38px] rounded-xl px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                                runMinutes === d.value
                                  ? 'bg-brand-600 text-white dark:bg-brand-500 dark:text-slate-950'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200'
                              }`}
                            >
                              {d.label}
                            </button>
                          ))}
                          {!isOn && (
                            <button
                              type="button"
                              disabled={isAuto || fallback || pendingKey === v.id}
                              onClick={() => requestValveToggle(v, true, runMinutes)}
                              className="btn-primary ml-auto min-h-[38px] px-3 text-xs"
                            >
                              <Play className="h-3.5 w-3.5" aria-hidden="true" />
                              Run {runMinutes > 0 ? `${runMinutes}m` : 'now'}
                            </button>
                          )}
                        </div>
                      </div>
                    }
                  />
                )
              })}
        </StaggerItem>

        {/* Fertigation cycle controller + Command log */}
        <StaggerItem className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          {/* Fertigation control */}
          <section className="card flex min-w-0 flex-col justify-between p-5 lg:col-span-2" aria-labelledby="fert-heading">
            <div>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-300">
                    <FlaskConical className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h2 id="fert-heading" className="section-title">
                      Fertigation controller
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Tank F venturi/solenoid dosing · {crop.name} target {thresholds.ecMin}–{thresholds.ecMax} mS/cm
                    </p>
                  </div>
                </div>
                <StatusPill status={fert ? 'brand' : 'neutral'} label={fert ? `Dosing (${fert.trigger})` : 'Idle'} />
              </div>

              {loading || !live ? (
                <div className="mt-4">
                  <ListSkeleton rows={2} />
                </div>
              ) : (
                <>
                  <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-950/60">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Current EC / TDS</p>
                      <p className="mt-1 text-xl font-bold sm:text-2xl">
                        <AnimatedNumber value={live.ec} decimals={2} suffix=" mS/cm" />
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        ≈ <AnimatedNumber value={ecToPpm(live.ec, units.nutrient.factor)} decimals={0} suffix=" ppm" /> (×{units.nutrient.factor})
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Target EC / TDS</p>
                      <p className="mt-1 text-xl font-bold text-brand-700 sm:text-2xl dark:text-brand-300">
                        <AnimatedNumber value={fert ? fert.targetEc : effectiveTargetEc} decimals={2} suffix=" mS/cm" />
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        ≈{' '}
                        <AnimatedNumber
                          value={ecToPpm(fert ? fert.targetEc : effectiveTargetEc, units.nutrient.factor)}
                          decimals={0}
                          suffix=" ppm"
                        />
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-600 dark:text-slate-300">
                        {fert ? 'Fertigation progress toward target' : 'Current nutrient level vs. target'}
                      </span>
                      <span className="font-bold tabular text-slate-800 dark:text-slate-100">{fmtNum(fertProgress, 0)}%</span>
                    </div>
                    <ProgressBar
                      value={fertProgress}
                      max={100}
                      tone={fert ? 'brand' : 'ok'}
                      label="Fertigation TDS progress"
                      height="h-3.5"
                    />
                  </div>

                  <div className="mt-4">
                    <label htmlFor="target-ec-range" className="label flex items-center justify-between">
                      <span>Target EC setpoint</span>
                      <span className="tabular font-semibold">
                        {effectiveTargetEc.toFixed(2)} mS/cm ({Math.round(ecToPpm(effectiveTargetEc, units.nutrient.factor))} ppm)
                      </span>
                    </label>
                    <input
                      id="target-ec-range"
                      type="range"
                      min={thresholds.ecMin}
                      max={thresholds.ecMax}
                      step={0.05}
                      disabled={Boolean(fert)}
                      value={effectiveTargetEc}
                      onChange={(e) => setTargetEc(Number(e.target.value))}
                      className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-brand-600 dark:bg-slate-800"
                    />
                    <div className="mt-1 flex justify-between text-[11px] text-slate-400">
                      <span>Min {thresholds.ecMin} mS/cm</span>
                      <span>Mid {defaultFertTarget} mS/cm</span>
                      <span>Max {thresholds.ecMax} mS/cm</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {fert ? (
                <button
                  type="button"
                  disabled={pendingKey === 'fert-stop' || fallback}
                  onClick={() => runAction('fert-stop', () => stopFertigation(), 'Fertigation cycle stopped')}
                  className="btn-danger w-full"
                >
                  <Square className="h-4 w-4" aria-hidden="true" /> Stop fertigation cycle
                </button>
              ) : (
                <button
                  type="button"
                  disabled={pendingKey === 'fert-start' || fallback || !live || live.ec >= effectiveTargetEc}
                  onClick={() =>
                    setConfirmState({
                      title: 'Start fertigation cycle?',
                      description: `HydroSync will open the Fertilizer Valve (Tank F) until solution EC reaches ${effectiveTargetEc.toFixed(2)} mS/cm (≈ ${Math.round(ecToPpm(effectiveTargetEc, units.nutrient.factor))} ppm).`,
                      confirmLabel: 'Start dosing',
                      tone: 'primary',
                      key: 'fert-start',
                      fn: () => startFertigation(effectiveTargetEc),
                      successTitle: 'Fertigation cycle started',
                    })
                  }
                  className="btn-primary w-full"
                >
                  <Play className="h-4 w-4" aria-hidden="true" /> Start manual fertigation cycle
                </button>
              )}
              {live && !fert && live.ec >= effectiveTargetEc && (
                <p className="w-full text-center text-xs text-slate-500 dark:text-slate-400">
                  Solution EC ({live.ec.toFixed(2)} mS/cm) is already at or above the selected target.
                </p>
              )}
            </div>
          </section>

          {/* Command log */}
          <section className="card flex min-w-0 flex-col p-5 lg:col-span-3" aria-labelledby="cmd-log-heading">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 id="cmd-log-heading" className="section-title flex items-center gap-2">
                <Terminal className="h-5 w-5 text-slate-500" aria-hidden="true" /> Command log
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Showing last {Math.min(commands.length, 15)} commands (Auto &amp; Dashboard)
              </span>
            </div>

            {loading ? (
              <ListSkeleton rows={5} />
            ) : commands.length === 0 ? (
              <EmptyState compact icon={Terminal} title="No commands recorded" description="Valve and mode commands will appear here." />
            ) : (
              <>
                {/* Mobile stacked command cards */}
                <ul className="space-y-2.5 sm:hidden">
                  {commands.slice(0, 15).map((c) => {
                    const ok = c.result === 'Success'
                    return (
                      <li
                        key={c.id}
                        className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 flex-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {c.command}
                          </p>
                          <StatusPill status={ok ? 'ok' : 'bad'} icon={ok ? CheckCircle2 : XCircle} label={c.result} />
                        </div>
                        {c.detail && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{c.detail}</p>}
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-mono">{timeFmt(c.ts)}</span>
                          <span>· {c.source}</span>
                          {c.latencyMs != null && <span className="tabular">· {c.latencyMs} ms</span>}
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
                        <th scope="col">Time</th>
                        <th scope="col">Command</th>
                        <th scope="col">Source</th>
                        <th scope="col">Latency</th>
                        <th scope="col">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commands.slice(0, 15).map((c) => {
                        const ok = c.result === 'Success'
                        return (
                          <tr key={c.id}>
                            <td className="whitespace-nowrap font-mono text-xs text-slate-500 dark:text-slate-400">{timeFmt(c.ts)}</td>
                            <td>
                              <p className="font-semibold text-slate-800 dark:text-slate-100">{c.command}</p>
                              {c.detail && <p className="text-xs text-slate-500 dark:text-slate-400">{c.detail}</p>}
                            </td>
                            <td className="whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">{c.source}</td>
                            <td className="whitespace-nowrap tabular text-xs text-slate-500 dark:text-slate-400">
                              {c.latencyMs != null ? `${c.latencyMs} ms` : '—'}
                            </td>
                            <td className="whitespace-nowrap">
                              <StatusPill status={ok ? 'ok' : 'bad'} icon={ok ? CheckCircle2 : XCircle} label={c.result} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </StaggerItem>
      </Stagger>

      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.title}
        description={confirmState?.description}
        confirmLabel={confirmState?.confirmLabel}
        tone={confirmState?.tone}
        busy={Boolean(pendingKey)}
        onCancel={() => setConfirmState(null)}
        onConfirm={() => confirmState && runAction(confirmState.key, confirmState.fn, confirmState.successTitle)}
      />
    </div>
  )
}

function RuleStep({ icon: Icon, title, rule, liveText, active }) {
  return (
    <div
      className={`rounded-2xl border p-3.5 transition-colors ${
        active
          ? 'border-brand-300 bg-white shadow-sm dark:border-brand-500/40 dark:bg-slate-900'
          : 'border-slate-200/80 bg-white/70 dark:border-slate-800 dark:bg-slate-900/60'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          <Icon className="h-4 w-4 text-brand-600 dark:text-brand-400" aria-hidden="true" />
          {title}
        </span>
        {active && <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-800 dark:bg-brand-500/20 dark:text-brand-200">Triggered</span>}
      </div>
      <p className="mt-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100">{rule}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{liveText}</p>
    </div>
  )
}
