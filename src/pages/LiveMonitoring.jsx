import { useMemo, useState } from 'react'
import { Activity, Container, Droplets, FlaskConical, Pause, Play, Zap } from 'lucide-react'
import TimeSeriesChart from '../components/charts/TimeSeriesChart'
import ChartCard from '../components/ui/ChartCard'
import Gauge from '../components/ui/Gauge'
import PageHeader from '../components/ui/PageHeader'
import { LiveDot } from '../components/ui/Badge'
import { ErrorState } from '../components/ui/States'
import { Stagger, StaggerItem } from '../components/motion/Stagger'
import { SERIES_COLORS } from '../config/chartColors'
import { ZONES } from '../config/device'
import { useActiveProfile } from '../hooks/useActiveProfile'
import { useLive } from '../hooks/useTelemetry'
import { useUnits } from '../hooks/useUnits'
import { useTelemetryStore } from '../store/telemetryStore'
import { timeFmt } from '../utils/format'
import { levelStatus, rangeStatus } from '../utils/status'

export default function LiveMonitoring() {
  const { live, loading, error, retry } = useLive()
  const { crop, stage, thresholds } = useActiveProfile()
  const units = useUnits()
  const buffer = useTelemetryStore((s) => s.liveBuffer)
  const [frozen, setFrozen] = useState(null) // snapshot of the buffer while paused
  const paused = frozen != null
  const data = frozen ?? buffer
  const n = units.nutrient
  const { lowTank, lowFert } = units.settings.alertThresholds

  const chartData = useMemo(() => data.map((p) => ({ ...p, nutrient: units.toNutrient(p.ec) })), [data, units])
  const last = data[data.length - 1]
  const faultIdx = live ? live.moisture.findIndex((m) => m == null) : -1

  const nutrientScaleMax = n.unit === 'ppm' ? Math.round(4 * 1000 * n.factor) : 4
  const toN = (ec) => units.toNutrient(ec)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Monitoring"
        icon={Activity}
        description={`Real-time readings vs. ${crop.name} (${stage.label}) targets. Green = in range, amber = near a limit, red = out of range.`}
        actions={
          <>
            <span className="inline-flex items-center rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
              <LiveDot active={!paused && !error} tone={paused ? 'warn' : 'ok'} label={paused ? `Paused at ${last ? timeFmt(last.ts) : '—'}` : 'Live · 2 s'} />
            </span>
            <button
              type="button"
              className={paused ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setFrozen(paused ? null : buffer)}
              aria-pressed={paused}
              disabled={loading || !!error}
            >
              {paused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
              {paused ? 'Resume feed' : 'Pause feed'}
            </button>
          </>
        }
      />

      {error && (
        <div className="card">
          <ErrorState title="Live feed unavailable" message={error} onRetry={retry} />
        </div>
      )}

      <Stagger className="space-y-6">
        <StaggerItem as="section" aria-label="Gauges">
          <Stagger nested className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
            {ZONES.map((zone, i) => {
              const v = last?.[`m${i + 1}`]
              const rs = rangeStatus(v, thresholds.moistureMin, thresholds.moistureMax)
              return (
                <StaggerItem key={zone}>
                  <Gauge
                    loading={loading}
                    error={error}
                    label={`Moisture · ${zone}`}
                    value={v}
                    decimals={1}
                    suffix="%"
                    targetMin={thresholds.moistureMin}
                    targetMax={thresholds.moistureMax}
                    status={rs.status}
                    statusLabel={rs.label}
                    fault={!paused && faultIdx === i}
                  />
                </StaggerItem>
              )
            })}
            <StaggerItem>
              {(() => {
                const rs = rangeStatus(last?.ec, thresholds.ecMin, thresholds.ecMax)
                return (
                  <Gauge
                    loading={loading}
                    error={error}
                    label={`Nutrients · ${n.label}`}
                    value={toN(last?.ec)}
                    decimals={n.decimals}
                    suffix={n.unit === 'ppm' ? ' ppm' : ''}
                    scaleMax={nutrientScaleMax}
                    targetMin={toN(thresholds.ecMin)}
                    targetMax={toN(thresholds.ecMax)}
                    status={rs.status}
                    statusLabel={rs.label}
                    sub={n.unit === 'ppm' ? `×${n.factor} factor` : 'mS/cm'}
                  />
                )
              })()}
            </StaggerItem>
            <StaggerItem>
              {(() => {
                const ls = levelStatus(last?.tank, lowTank)
                return (
                  <Gauge loading={loading} error={error} label="Water tank" value={last?.tank} suffix="%" targetMin={lowTank} targetMax={100} status={ls.status} statusLabel={ls.label} sub={`Alert below ${lowTank}%`} />
                )
              })()}
            </StaggerItem>
            <StaggerItem>
              {(() => {
                const ls = levelStatus(last?.fert, lowFert)
                return (
                  <Gauge loading={loading} error={error} label="Tank F" value={last?.fert} suffix="%" targetMin={lowFert} targetMax={100} status={ls.status} statusLabel={ls.label} sub={`Alert below ${lowFert}%`} />
                )
              })()}
            </StaggerItem>
          </Stagger>
        </StaggerItem>

        <StaggerItem className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard
            title="Soil moisture per sensor"
            subtitle="Last 5 minutes · shaded band = crop target"
            icon={Droplets}
            loading={loading}
            error={error}
            onRetry={retry}
            empty={chartData.length < 2}
            emptyTitle="Collecting data…"
            height={300}
            className="lg:col-span-2"
          >
            <TimeSeriesChart
              data={chartData}
              xFormat={timeFmt}
              yDomain={[0, 100]}
              target={{ min: thresholds.moistureMin, max: thresholds.moistureMax, label: 'Target' }}
              series={[
                { key: 'm1', name: 'Zone 1', color: SERIES_COLORS.zone1, unit: '%', decimals: 1 },
                { key: 'm2', name: 'Zone 2', color: SERIES_COLORS.zone2, unit: '%', decimals: 1 },
                { key: 'm3', name: 'Zone 3', color: SERIES_COLORS.zone3, unit: '%', decimals: 1 },
              ]}
            />
          </ChartCard>

          <ChartCard title={`${n.label} (${n.unit})`} subtitle={units.nutrientSecondary(last?.ec)} icon={Zap} loading={loading} error={error} onRetry={retry} empty={chartData.length < 2} height={240}>
            <TimeSeriesChart
              data={chartData}
              xFormat={timeFmt}
              legend={false}
              target={{ min: toN(thresholds.ecMin), max: toN(thresholds.ecMax) }}
              series={[{ key: 'nutrient', name: n.label, color: SERIES_COLORS.nutrient, unit: ` ${n.unit}`, decimals: n.decimals }]}
            />
          </ChartCard>

          <ChartCard title="Tank levels" subtitle="Main water tank and fertilizer Tank F" icon={Container} loading={loading} error={error} onRetry={retry} empty={chartData.length < 2} height={240}>
            <TimeSeriesChart
              data={chartData}
              xFormat={timeFmt}
              yDomain={[0, 100]}
              refLines={[
                { y: lowTank, label: `Tank alert ${lowTank}%`, color: SERIES_COLORS.tank },
                { y: lowFert, label: `Tank F alert ${lowFert}%`, color: SERIES_COLORS.fert },
              ]}
              series={[
                { key: 'tank', name: 'Water tank', color: SERIES_COLORS.tank, area: true, unit: '%', decimals: 1 },
                { key: 'fert', name: 'Tank F', color: SERIES_COLORS.fert, area: true, unit: '%', decimals: 1 },
              ]}
            />
          </ChartCard>
        </StaggerItem>

        <StaggerItem>
          <p className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <FlaskConical className="h-4 w-4" aria-hidden="true" />
            Targets follow the selected crop profile and growth stage. Change them on the Crop Profiles page.
          </p>
        </StaggerItem>
      </Stagger>
    </div>
  )
}
