import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Cpu,
  HardDrive,
  ShieldCheck,
  Target,
  Timer,
  Waves,
  XCircle,
} from 'lucide-react'
import { ChartTooltip, axisTick, useChartTheme } from '../components/charts/chartTheme'
import AnimatedNumber from '../components/ui/AnimatedNumber'
import ChartCard from '../components/ui/ChartCard'
import PageHeader from '../components/ui/PageHeader'
import ProgressBar from '../components/ui/ProgressBar'
import StatCard from '../components/ui/StatCard'
import { StatusPill } from '../components/ui/Badge'
import { ListSkeleton } from '../components/ui/Skeleton'
import { Stagger, StaggerItem } from '../components/motion/Stagger'
import { SERIES_COLORS } from '../config/chartColors'
import { SENSORS } from '../config/device'
import { useAsync } from '../hooks/useAsync'
import { useChartAnimation } from '../hooks/useChartAnimation'
import { useNow } from '../hooks/useNow'
import { useLive } from '../hooks/useTelemetry'
import { useUnits } from '../hooks/useUnits'
import { getPerformance } from '../services/telemetryService'
import { fmtNum, relativeTime, timeFmt } from '../utils/format'

export default function Performance() {
  const { live, loading: liveLoading, error: liveError, retry: retryLive } = useLive()
  const { data: perf, loading: perfLoading, error: perfError, reload } = useAsync(() => getPerformance(), [], {
    intervalMs: 10000,
  })
  const units = useUnits()
  const now = useNow(1000)
  const theme = useChartTheme()
  const anim = useChartAnimation()

  const loading = liveLoading || perfLoading
  const error = liveError || perfError

  const sd = live?.sd
  const syncPct = sd && sd.logged > 0 ? Math.min(100, (sd.synced / sd.logged) * 100) : 100
  const unsynced = sd ? sd.logged - sd.synced : 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Performance · Thesis Metrics"
        icon={BarChart3}
        description="Dependent variables evaluated across the 4-week (28-day) field test: water conservation rate, fertigation dosing accuracy, control response latency and offline edge uptime."
      />

      <Stagger className="space-y-6">
        {/* Dependent variable KPI cards */}
        <StaggerItem as="section" aria-label="Thesis dependent variables">
          <Stagger nested className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StaggerItem>
              <StatCard
                loading={loading}
                error={error}
                onRetry={reload}
                label="Water conservation rate"
                icon={Waves}
                value={perf?.waterConservationRate}
                decimals={1}
                suffix="%"
                status="ok"
                statusLabel="vs. fixed timer"
                sub={
                  perf
                    ? `Saved ${fmtNum(units.volume(perf.totals.savedL), 0)}${units.volumeSuffix} over 28 d`
                    : ''
                }
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                loading={loading}
                error={error}
                onRetry={reload}
                label="Fertigation accuracy"
                icon={Target}
                value={perf?.fertigationAccuracy}
                decimals={1}
                suffix="%"
                status={perf && perf.fertigationAccuracy >= 95 ? 'ok' : 'warn'}
                statusLabel="EC setpoint match"
                sub="1 − |EC_final − EC_target| / EC_target"
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                loading={loading}
                error={error}
                onRetry={reload}
                label="Control response latency"
                icon={Timer}
                value={perf?.avgLatencyMs}
                decimals={0}
                suffix=" ms"
                status={perf && perf.avgLatencyMs < 500 ? 'ok' : 'warn'}
                statusLabel="Mean ACK time"
                sub="Edge auto ~15 ms · Cloud ~250 ms"
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                loading={loading}
                error={error}
                onRetry={reload}
                label="Offline edge uptime"
                icon={ShieldCheck}
                value={perf?.offlineUptime}
                decimals={2}
                suffix="%"
                status="ok"
                statusLabel="Autonomous continuity"
                sub={perf ? `Across ${perf.totals.offlineHours} h without internet` : ''}
              />
            </StaggerItem>
          </Stagger>
        </StaggerItem>

        {/* Charts for dependent variables */}
        <StaggerItem className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Water conservation: baseline vs actual */}
          <ChartCard
            className="lg:col-span-2"
            title="28-day water usage · Fixed schedule baseline vs. HydroSync actual (L/day)"
            subtitle="Rain preemption + soil-moisture feedback reduce irrigation volume compared with a 2×20 min/day timer"
            icon={Waves}
            loading={loading}
            error={error}
            onRetry={reload}
            empty={!perf?.daily?.length}
            height={280}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perf?.daily ?? []} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={axisTick(theme)} stroke={theme.grid} />
                <YAxis tickFormatter={(v) => `${v}L`} tick={axisTick(theme)} stroke={theme.grid} width={48} />
                <Tooltip
                  content={
                    <ChartTooltip
                      meta={{
                        baselineL: { unit: ' L', decimals: 0 },
                        actualL: { unit: ' L', decimals: 0 },
                      }}
                    />
                  }
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
                <Bar dataKey="baselineL" name="Fixed timer baseline" fill={SERIES_COLORS.baseline} radius={[4, 4, 0, 0]} {...anim} />
                <Bar dataKey="actualL" name="HydroSync actual" fill={SERIES_COLORS.actual} radius={[4, 4, 0, 0]} {...anim} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Fertigation accuracy per cycle */}
          <ChartCard
            title="Fertigation dosing accuracy per cycle (%)"
            subtitle="Target ≥ 95% accuracy against crop EC setpoint"
            icon={Target}
            loading={loading}
            error={error}
            onRetry={reload}
            empty={!perf?.accuracySeries?.length}
            height={240}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={perf?.accuracySeries ?? []} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="cycle" tick={axisTick(theme)} stroke={theme.grid} />
                <YAxis domain={[85, 100]} tickFormatter={(v) => `${v}%`} tick={axisTick(theme)} stroke={theme.grid} width={44} />
                <ReferenceLine y={95} stroke="#10b981" strokeDasharray="4 4" label={{ value: '95% target', position: 'insideBottomRight', fill: '#10b981', fontSize: 11 }} />
                <Tooltip content={<ChartTooltip meta={{ accuracy: { unit: '%', decimals: 1 } }} />} />
                <Line type="monotone" dataKey="accuracy" name="Dosing accuracy" stroke={SERIES_COLORS.accuracy} strokeWidth={2.5} dot={{ r: 3 }} {...anim} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Command response latency */}
          <ChartCard
            title="Command & rule response latency (ms)"
            subtitle="Round-trip ACK time across Edge, Local hotspot and Cloud paths"
            icon={Timer}
            loading={loading}
            error={error}
            onRetry={reload}
            empty={!perf?.latencySeries?.length}
            height={240}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={perf?.latencySeries ?? []} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="i" tickFormatter={(v) => `#${v}`} tick={axisTick(theme)} stroke={theme.grid} />
                <YAxis tickFormatter={(v) => `${v}ms`} tick={axisTick(theme)} stroke={theme.grid} width={48} />
                <Tooltip content={<ChartTooltip labelFormatter={(i) => `Command #${i}`} meta={{ ms: { unit: ' ms', decimals: 0 } }} />} />
                <Line type="monotone" dataKey="ms" name="Latency" stroke={SERIES_COLORS.latency} strokeWidth={2.25} dot={{ r: 2.5 }} {...anim} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </StaggerItem>

        {/* Sensor health panel + SD card logging status */}
        <StaggerItem className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          {/* Sensor health */}
          <section className="card min-w-0 p-5 lg:col-span-3" aria-labelledby="sensor-health-heading">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 id="sensor-health-heading" className="section-title flex items-center gap-2">
                  <Activity className="h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400" aria-hidden="true" />
                  Sensor health panel
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Live GPIO pin mapping, latest reading, timestamp and fault diagnostics
                </p>
              </div>
            </div>

            {liveLoading || !live ? (
              <ListSkeleton rows={5} />
            ) : (
              <>
                {/* Mobile sensor health cards */}
                <ul className="space-y-2.5 sm:hidden">
                  {SENSORS.map((meta) => {
                    const reading = live.sensors.find((s) => s.id === meta.id)
                    const ok = reading?.status === 'ok'
                    return (
                      <li
                        key={meta.id}
                        className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{meta.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{meta.model}</p>
                          </div>
                          <StatusPill
                            status={ok ? 'ok' : 'bad'}
                            icon={ok ? CheckCircle2 : XCircle}
                            label={ok ? 'Healthy' : 'Fault'}
                          />
                        </div>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="tabular font-bold text-slate-800 dark:text-slate-100">
                            {reading?.value != null ? `${reading.value} ${reading.unit}` : '—'}
                          </span>
                          <span className="font-mono text-slate-500 dark:text-slate-400">{meta.pin}</span>
                          <span className="text-slate-400">
                            {reading ? `${timeFmt(reading.lastReadingTs)} (${relativeTime(reading.lastReadingTs, now)})` : '—'}
                          </span>
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
                        <th scope="col">Sensor</th>
                        <th scope="col">ESP32 Pin</th>
                        <th scope="col">Latest reading</th>
                        <th scope="col">Last reading time</th>
                        <th scope="col">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SENSORS.map((meta) => {
                        const reading = live.sensors.find((s) => s.id === meta.id)
                        const ok = reading?.status === 'ok'
                        return (
                          <tr key={meta.id}>
                            <td>
                              <p className="font-semibold">{meta.name}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{meta.model}</p>
                            </td>
                            <td className="whitespace-nowrap font-mono text-xs text-slate-600 dark:text-slate-300">{meta.pin}</td>
                            <td className="whitespace-nowrap tabular font-bold">
                              {reading?.value != null ? `${reading.value} ${reading.unit}` : '—'}
                            </td>
                            <td className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                              {reading ? `${timeFmt(reading.lastReadingTs)} (${relativeTime(reading.lastReadingTs, now)})` : '—'}
                            </td>
                            <td className="whitespace-nowrap">
                              <StatusPill
                                status={ok ? 'ok' : 'bad'}
                                icon={ok ? CheckCircle2 : XCircle}
                                label={ok ? 'Healthy' : 'Fault'}
                              />
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

          {/* SD card logging status & data integrity */}
          <section className="card flex min-w-0 flex-col justify-between p-5 lg:col-span-2" aria-labelledby="sd-heading">
            <div>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                    <HardDrive className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h2 id="sd-heading" className="section-title">
                      SD card logging &amp; data integrity
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      SPI microSD module · buffers telemetry during internet outages
                    </p>
                  </div>
                </div>
                <StatusPill status={sd?.mounted ? 'ok' : 'bad'} label={sd?.mounted ? 'Mounted' : 'Missing'} />
              </div>

              {liveLoading || !sd ? (
                <div className="mt-4">
                  <ListSkeleton rows={3} />
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-950/60">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Records logged (SD)</p>
                      <p className="mt-1 text-2xl font-bold">
                        <AnimatedNumber value={sd.logged} />
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Records synced (Cloud)</p>
                      <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                        <AnimatedNumber value={sd.synced} />
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-600 dark:text-slate-300">
                        Cloud sync integrity
                      </span>
                      <span className="font-bold tabular">
                        <AnimatedNumber value={syncPct} decimals={2} suffix="%" />
                      </span>
                    </div>
                    <ProgressBar
                      value={syncPct}
                      max={100}
                      tone={unsynced === 0 ? 'ok' : 'warn'}
                      label="Records synced vs records logged"
                      height="h-3.5"
                    />
                    <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                      {unsynced === 0
                        ? '100% of SD card records are synced with the cloud database.'
                        : `${fmtNum(unsynced)} records buffered on SD card; will batch-upload once Cloud is reachable.`}
                    </p>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-600 dark:text-slate-300">
                        Storage used ({sd.capacityGb} GB FAT32)
                      </span>
                      <span className="font-bold tabular">{sd.usedPct}%</span>
                    </div>
                    <ProgressBar value={sd.usedPct} max={100} tone="brand" label="SD card storage used" height="h-2.5" />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
              <Cpu className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" aria-hidden="true" />
              Every 2 s tick is appended to <code className="font-mono">/logs/telemetry.csv</code> on the ESP32 before cloud transmission.
            </div>
          </section>
        </StaggerItem>
      </Stagger>
    </div>
  )
}
