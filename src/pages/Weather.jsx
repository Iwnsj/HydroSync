import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CloudRain, Droplets, Sliders, Thermometer, Umbrella, Waves, Wind } from 'lucide-react'
import RainPreemptionCard from '../components/dashboard/RainPreemptionCard'
import TimeSeriesChart from '../components/charts/TimeSeriesChart'
import { ChartTooltip, axisTick, useChartTheme } from '../components/charts/chartTheme'
import AnimatedNumber from '../components/ui/AnimatedNumber'
import ChartCard from '../components/ui/ChartCard'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import { ListSkeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/States'
import { Stagger, StaggerItem } from '../components/motion/Stagger'
import { SERIES_COLORS } from '../config/chartColors'
import { THRESHOLD_LIMITS } from '../data/crops'
import { useActiveProfile } from '../hooks/useActiveProfile'
import { useChartAnimation } from '../hooks/useChartAnimation'
import { useLive } from '../hooks/useTelemetry'
import { useUnits } from '../hooks/useUnits'
import { useSettingsStore } from '../store/settingsStore'
import { useTelemetryStore } from '../store/telemetryStore'
import { dateTimeFmt, hourFmt } from '../utils/format'

export default function Weather() {
  const { live, loading, error, retry } = useLive()
  const { crop, stageId, stage, thresholds } = useActiveProfile()
  const units = useUnits()
  const weather = useTelemetryStore((s) => s.weather)
  const preemptions = useTelemetryStore((s) => s.preemptionLog)
  const updateStageThresholds = useSettingsStore((s) => s.updateStageThresholds)

  const theme = useChartTheme()
  const anim = useChartAnimation()

  const threshold = thresholds.rainThreshold
  const totalSavedL = useMemo(() => preemptions.reduce((sum, p) => sum + (p.savedL || 0), 0), [preemptions])

  const hourlyData = useMemo(() => {
    if (!weather?.hourly) return []
    return weather.hourly.map((h) => ({
      ...h,
      tempDisplay: Math.round(units.temp(h.temp) * 10) / 10,
    }))
  }, [weather, units])

  function handleThresholdChange(nextVal) {
    updateStageThresholds(crop.id, stageId, { rainThreshold: Number(nextVal) }, { allStages: true })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Weather & Rain Preemption"
        icon={CloudRain}
        description="24-hour OpenWeatherMap forecast and autonomous rain preemption log. When rain probability reaches the threshold, scheduled irrigation is skipped."
      />

      <Stagger className="space-y-6">
        {/* Weather KPI row */}
        <StaggerItem as="section" aria-label="Weather summary">
          <Stagger nested className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StaggerItem>
              <StatCard
                loading={loading}
                error={error}
                onRetry={retry}
                label="Rain probability (next 3 h)"
                icon={Umbrella}
                value={live?.rain.probability}
                suffix="%"
                status={live && live.rain.probability >= threshold ? 'info' : 'ok'}
                statusLabel={live && live.rain.probability >= threshold ? 'Preempting' : 'Below threshold'}
                sub={`Threshold ${threshold}%`}
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                loading={loading}
                error={error}
                onRetry={retry}
                label="Air temperature"
                icon={Thermometer}
                value={weather ? units.temp(weather.current.temp) : null}
                decimals={1}
                suffix={units.tempSuffix}
                sub={weather ? `Condition: ${weather.current.condition}` : ''}
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                loading={loading}
                error={error}
                onRetry={retry}
                label="Relative humidity"
                icon={Droplets}
                value={weather?.current.humidity}
                suffix="%"
                sub={weather ? `Wind ${weather.current.windKph} km/h` : ''}
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                loading={loading}
                error={error}
                onRetry={retry}
                label="Water saved by preemption"
                icon={Waves}
                value={units.volume(totalSavedL)}
                decimals={units.volumeDecimals}
                suffix={units.volumeSuffix}
                status="ok"
                statusLabel={`${preemptions.length} cycles skipped`}
                sub="Cumulative field log"
              />
            </StaggerItem>
          </Stagger>
        </StaggerItem>

        {/* 24-hour rain probability bar chart + Rain preemption control */}
        <StaggerItem className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartCard
            className="lg:col-span-2"
            title="24-hour rain probability forecast"
            subtitle={`OpenWeatherMap hourly PoP · red bars ≥ ${threshold}% trigger rain preemption`}
            icon={CloudRain}
            loading={loading || !weather}
            error={error}
            onRetry={retry}
            empty={hourlyData.length === 0}
            height={280}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="ts"
                  tickFormatter={hourFmt}
                  tick={axisTick(theme)}
                  stroke={theme.grid}
                  minTickGap={24}
                />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={axisTick(theme)} stroke={theme.grid} width={44} />
                <ReferenceLine
                  y={threshold}
                  stroke={SERIES_COLORS.rainHigh}
                  strokeDasharray="5 4"
                  label={{
                    value: `Preemption ${threshold}%`,
                    position: 'insideTopRight',
                    fill: SERIES_COLORS.rainHigh,
                    fontSize: 11,
                  }}
                />
                <Tooltip
                  content={
                    <ChartTooltip
                      labelFormatter={(ts) => dateTimeFmt(ts)}
                      meta={{ pop: { unit: '%', decimals: 0 } }}
                    />
                  }
                  cursor={{ fill: theme.grid, opacity: 0.35 }}
                />
                <Bar dataKey="pop" name="Rain probability" radius={[6, 6, 0, 0]} {...anim}>
                  {hourlyData.map((entry) => (
                    <Cell
                      key={entry.ts}
                      fill={entry.pop >= threshold ? SERIES_COLORS.rainHigh : SERIES_COLORS.rain}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="flex flex-col gap-4">
            <RainPreemptionCard
              live={live}
              threshold={threshold}
              loading={loading}
              error={error}
              onRetry={retry}
              compact
            />

            {/* Adjustable preemption threshold card */}
            <section className="card p-5" aria-labelledby="preempt-slider-heading">
              <div className="flex items-center justify-between gap-2">
                <h2 id="preempt-slider-heading" className="section-title flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-sky-500" aria-hidden="true" /> Preemption threshold
                </h2>
                <span className="text-lg font-bold text-sky-700 dark:text-sky-300">
                  <AnimatedNumber value={threshold} suffix="%" />
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Applies to {crop.emoji} {crop.name} ({stage.label}). Default is 80%.
              </p>
              <input
                type="range"
                aria-label="Rain preemption threshold percentage"
                min={THRESHOLD_LIMITS.rainThreshold.min}
                max={THRESHOLD_LIMITS.rainThreshold.max}
                step={THRESHOLD_LIMITS.rainThreshold.step}
                value={threshold}
                onChange={(e) => handleThresholdChange(e.target.value)}
                className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-sky-600 dark:bg-slate-800"
              />
              <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                <span>50% (conservative)</span>
                <button
                  type="button"
                  onClick={() => handleThresholdChange(80)}
                  className="font-semibold text-brand-700 hover:underline dark:text-brand-300"
                >
                  Reset to 80%
                </button>
                <span>95% (strict)</span>
              </div>
            </section>
          </div>
        </StaggerItem>

        {/* Temperature & Humidity forecast chart + Preemption log */}
        <StaggerItem className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <ChartCard
            className="lg:col-span-2"
            title={`Temperature (${units.tempSuffix}) & humidity (%)`}
            subtitle="Next 24 hours · drives evapotranspiration in the soil model"
            icon={Wind}
            loading={loading || !weather}
            error={error}
            onRetry={retry}
            empty={hourlyData.length === 0}
            height={260}
          >
            <TimeSeriesChart
              data={hourlyData}
              xFormat={hourFmt}
              tooltipLabel={dateTimeFmt}
              rightDomain={[0, 100]}
              series={[
                { key: 'tempDisplay', name: `Temp (${units.tempSuffix})`, color: SERIES_COLORS.temp, unit: units.tempSuffix, decimals: 1 },
                { key: 'humidity', name: 'Humidity (%)', color: SERIES_COLORS.humidity, yAxisId: 'right', unit: '%', decimals: 0 },
              ]}
            />
          </ChartCard>

          <section className="card flex min-w-0 flex-col p-5 lg:col-span-3" aria-labelledby="preempt-log-heading">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 id="preempt-log-heading" className="section-title">
                  Rain preemption log
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Every time irrigation was skipped or stopped early because forecast rain exceeded the threshold
                </p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                Total saved: <AnimatedNumber value={units.volume(totalSavedL)} decimals={units.volumeDecimals} suffix={units.volumeSuffix} />
              </span>
            </div>

            {loading ? (
              <ListSkeleton rows={4} />
            ) : preemptions.length === 0 ? (
              <EmptyState
                compact
                icon={CloudRain}
                title="No rain preemptions logged yet"
                description="When soil needs water while rain probability ≥ threshold, HydroSync logs the skipped cycle here."
              />
            ) : (
              <>
                {/* Mobile stacked preemption cards */}
                <ul className="space-y-2.5 sm:hidden">
                  {preemptions.map((p) => (
                    <li
                      key={p.id}
                      className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{p.crop}</span>
                        <span className="tabular text-xs font-bold text-emerald-700 dark:text-emerald-300">
                          Saved ~{Math.round(units.volume(p.savedL))}
                          {units.volumeSuffix}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                        <span className="tabular">
                          Rain <strong className="text-sky-700 dark:text-sky-300">{p.rainProbability}%</strong> (≥ {p.threshold}%)
                        </span>
                        <span className="tabular">· Moisture {p.moistureAvg != null ? `${p.moistureAvg}%` : '—'}</span>
                        <span className="text-slate-400">· {dateTimeFmt(p.ts)}</span>
                      </div>
                      {p.note && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{p.note}</p>}
                    </li>
                  ))}
                </ul>

                {/* Tablet & desktop table */}
                <div className="hidden overflow-x-auto sm:block">
                  <table className="table-base">
                    <thead>
                      <tr>
                        <th scope="col">Timestamp</th>
                        <th scope="col">Crop</th>
                        <th scope="col">Forecast vs. Threshold</th>
                        <th scope="col">Soil moisture</th>
                        <th scope="col">Est. water saved</th>
                        <th scope="col">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preemptions.map((p) => (
                        <tr key={p.id}>
                          <td className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">{dateTimeFmt(p.ts)}</td>
                          <td className="font-medium">{p.crop}</td>
                          <td className="tabular">
                            <span className="font-bold text-sky-700 dark:text-sky-300">{p.rainProbability}%</span>{' '}
                            <span className="text-xs text-slate-400">≥ {p.threshold}%</span>
                          </td>
                          <td className="tabular">{p.moistureAvg != null ? `${p.moistureAvg}%` : '—'}</td>
                          <td className="tabular font-semibold text-emerald-700 dark:text-emerald-300">
                            ~{Math.round(units.volume(p.savedL))}
                            {units.volumeSuffix}
                          </td>
                          <td className="text-xs text-slate-500 dark:text-slate-400">{p.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </StaggerItem>
      </Stagger>
    </div>
  )
}
