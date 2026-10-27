import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Activity, Bell, Clock, Container, Droplets, FlaskConical, Waves, Zap } from 'lucide-react'
import HeroCard from '../components/dashboard/HeroCard'
import RainPreemptionCard from '../components/dashboard/RainPreemptionCard'
import TimeSeriesChart from '../components/charts/TimeSeriesChart'
import ChartCard from '../components/ui/ChartCard'
import StatCard from '../components/ui/StatCard'
import ValveCard from '../components/ui/ValveCard'
import { AlertList } from '../components/ui/AlertItem'
import { ListSkeleton } from '../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../components/ui/States'
import { Stagger, StaggerItem } from '../components/motion/Stagger'
import { SERIES_COLORS } from '../config/chartColors'
import { HARDWARE, VALVES, ZONES } from '../config/device'
import { useActiveProfile } from '../hooks/useActiveProfile'
import { useLive } from '../hooks/useTelemetry'
import { useNow } from '../hooks/useNow'
import { useUnits } from '../hooks/useUnits'
import { useTelemetryStore } from '../store/telemetryStore'
import { relativeTime, timeFmt } from '../utils/format'
import { levelStatus, rangeStatus } from '../utils/status'

export default function Overview() {
  const { live, loading, error, retry } = useLive()
  const { crop, stage, thresholds } = useActiveProfile()
  const units = useUnits()
  const alertThresholds = units.settings.alertThresholds
  const trend = useTelemetryStore((s) => s.trendBuffer)
  const alerts = useTelemetryStore((s) => s.alerts)
  const markRead = useTelemetryStore((s) => s.markAlertRead)
  const recent = useMemo(() => alerts.slice(0, 5), [alerts])
  const now = useNow(1000)
  const st = { loading, error, onRetry: retry }

  const chartData = useMemo(() => trend.map((p) => ({ ts: p.ts, avg: p.avg, nutrient: units.toNutrient(p.ec) })), [trend, units])
  const n = units.nutrient

  return (
    <Stagger className="space-y-5 sm:space-y-6">
      <StaggerItem>
        <HeroCard crop={crop} stage={stage} thresholds={thresholds} live={live} loading={loading} />
      </StaggerItem>

      {/* KPI cards */}
      <StaggerItem as="section" aria-labelledby="kpi-heading">
        <h2 id="kpi-heading" className="sr-only">
          Live readings
        </h2>
        <Stagger nested className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {ZONES.map((zone, i) => {
            const v = live?.moisture[i]
            const fault = live && v == null
            const rs = rangeStatus(v, thresholds.moistureMin, thresholds.moistureMax)
            return (
              <StaggerItem key={zone}>
                <StatCard
                  {...st}
                  label={`Soil moisture · ${zone}`}
                  icon={Droplets}
                  value={v}
                  decimals={1}
                  suffix="%"
                  status={fault ? 'bad' : rs.status}
                  statusLabel={fault ? 'Sensor fault' : rs.label}
                  sub={`Target ${thresholds.moistureMin}–${thresholds.moistureMax}%`}
                />
              </StaggerItem>
            )
          })}
          <StaggerItem>
            {(() => {
              const rs = rangeStatus(live?.ec, thresholds.ecMin, thresholds.ecMax)
              return (
                <StatCard
                  {...st}
                  label={`Nutrients · ${n.label}`}
                  icon={Zap}
                  value={units.toNutrient(live?.ec)}
                  decimals={n.decimals}
                  suffix={n.suffix}
                  status={rs.status}
                  statusLabel={rs.label}
                  sub={units.nutrientSecondary(live?.ec)}
                />
              )
            })()}
          </StaggerItem>
          <StaggerItem>
            {(() => {
              const ls = levelStatus(live?.tankLevel, alertThresholds.lowTank)
              return (
                <StatCard
                  {...st}
                  label="Water tank"
                  icon={Container}
                  value={live?.tankLevel}
                  suffix="%"
                  status={ls.status}
                  statusLabel={live?.refilling.tank ? 'Refilling' : ls.label}
                  sub={live ? `≈ ${Math.round(units.volume((live.tankLevel / 100) * HARDWARE.tankCapacityL))}${units.volumeSuffix} of ${Math.round(units.volume(HARDWARE.tankCapacityL))}` : ''}
                />
              )
            })()}
          </StaggerItem>
          <StaggerItem>
            {(() => {
              const ls = levelStatus(live?.fertTankLevel, alertThresholds.lowFert)
              return (
                <StatCard
                  {...st}
                  label="Fertilizer Tank F"
                  icon={FlaskConical}
                  value={live?.fertTankLevel}
                  suffix="%"
                  status={ls.status}
                  statusLabel={live?.refilling.fert ? 'Refilling' : ls.label}
                  sub={`Alert below ${alertThresholds.lowFert}%`}
                />
              )
            })()}
          </StaggerItem>
          <StaggerItem>
            <StatCard
              {...st}
              label="Water used today"
              icon={Waves}
              value={units.volume(live?.waterUsedTodayL)}
              decimals={units.volumeDecimals}
              suffix={units.volumeSuffix}
              sub="Drip line, all zones"
            />
          </StaggerItem>
          <StaggerItem>
            <StatCard
              {...st}
              label="Last update"
              icon={Clock}
              valueNode={<span className="tabular text-2xl sm:text-[1.7rem]">{live ? timeFmt(live.ts) : '—'}</span>}
              status={live && now - live.ts < 6000 ? 'ok' : 'warn'}
              statusLabel={live ? relativeTime(live.ts, now) : '—'}
              sub="Updates every 2 s"
            />
          </StaggerItem>
        </Stagger>
      </StaggerItem>

      {/* Valves + rain */}
      <StaggerItem className="grid gap-4 lg:grid-cols-3">
        <section className="grid gap-4 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-1 xl:grid-cols-2" aria-label="Valve status">
          {loading || error
            ? VALVES.map((v) => (
                <div key={v.id} className="card p-4">
                  {error ? <ErrorState compact title="Valve status unavailable" onRetry={retry} /> : <ListSkeleton rows={1} />}
                </div>
              ))
            : VALVES.map((v) => (
                <ValveCard
                  key={v.id}
                  valve={v}
                  isOn={live.valves[v.id]}
                  manualRun={live.manualRun}
                  note={
                    v.id === 'fertilizer' && live.fertigation
                      ? `Fertigation cycle → ${live.fertigation.targetEc.toFixed(2)} mS/cm (${live.fertigation.trigger})`
                      : live.mode === 'auto'
                        ? 'Controlled by automatic rules'
                        : 'Manual mode, control from the Control page'
                  }
                />
              ))}
          <Link to="/control" className="btn-secondary sm:col-span-2 lg:col-span-1 xl:col-span-2">
            Open device control
          </Link>
        </section>
        <RainPreemptionCard live={live} threshold={thresholds.rainThreshold} loading={loading} error={error} onRetry={retry} />
      </StaggerItem>

      {/* Mini chart + alerts */}
      <StaggerItem className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="Soil moisture & nutrients"
          subtitle={`Last 30 minutes · shaded band = ${crop.name} target`}
          icon={Activity}
          loading={loading}
          error={error}
          onRetry={retry}
          empty={!loading && !error && chartData.length < 2}
          emptyTitle="Collecting data…"
          height={250}
        >
          <TimeSeriesChart
            data={chartData}
            target={{ min: thresholds.moistureMin, max: thresholds.moistureMax }}
            yDomain={[0, 100]}
            rightDomain={n.unit === 'ppm' ? [0, 'auto'] : [0, 4]}
            series={[
              { key: 'avg', name: 'Avg moisture', color: SERIES_COLORS.avg, unit: '%', decimals: 1 },
              { key: 'nutrient', name: `${n.label} (${n.unit})`, color: SERIES_COLORS.nutrient, yAxisId: 'right', unit: ` ${n.unit}`, decimals: n.decimals },
            ]}
          />
        </ChartCard>

        <section className="card flex flex-col p-4 sm:p-5" aria-labelledby="recent-alerts">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="recent-alerts" className="section-title flex items-center gap-2">
              <Bell className="h-5 w-5 text-slate-500" aria-hidden="true" /> Recent alerts
            </h2>
            <Link to="/alerts" className="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300">
              View all
            </Link>
          </div>
          {loading ? (
            <ListSkeleton rows={4} />
          ) : error ? (
            <ErrorState compact message={error} onRetry={retry} />
          ) : recent.length === 0 ? (
            <EmptyState compact icon={Bell} title="All clear" description="No alerts yet. HydroSync will notify you here and by SMS." />
          ) : (
            <AlertList alerts={recent} onMarkRead={markRead} />
          )}
        </section>
      </StaggerItem>
    </Stagger>
  )
}
