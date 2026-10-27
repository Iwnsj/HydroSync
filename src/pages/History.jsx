import { useMemo, useState } from 'react'
import {
  Calendar,
  Container,
  Download,
  Droplets,
  FlaskConical,
  History as HistoryIcon,
  Zap,
} from 'lucide-react'
import TimeSeriesChart from '../components/charts/TimeSeriesChart'
import AnimatedNumber from '../components/ui/AnimatedNumber'
import ChartCard from '../components/ui/ChartCard'
import PageHeader from '../components/ui/PageHeader'
import SegmentedControl from '../components/ui/SegmentedControl'
import { Badge } from '../components/ui/Badge'
import { ListSkeleton } from '../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../components/ui/States'
import { Stagger, StaggerItem } from '../components/motion/Stagger'
import { SERIES_COLORS } from '../config/chartColors'
import { useActiveProfile } from '../hooks/useActiveProfile'
import { useAsync } from '../hooks/useAsync'
import { useUnits } from '../hooks/useUnits'
import { getEvents, getHistory } from '../services/telemetryService'
import { toast } from '../store/toastStore'
import { downloadCSV, toCSV } from '../utils/csv'
import { dateFmt, dateTimeFmt, ecToPpm, formatDuration, shortTime, toDateInput } from '../utils/format'

const PRESETS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: '28d', label: '28 days (4-wk test)' },
  { value: 'custom', label: 'Custom' },
]

const EVENT_FILTERS = [
  { value: 'all', label: 'All events' },
  { value: 'irrigation', label: 'Irrigation' },
  { value: 'fertigation', label: 'Fertigation' },
]

export default function History() {
  const { crop, thresholds } = useActiveProfile()
  const units = useUnits()
  const n = units.nutrient

  const [preset, setPreset] = useState('7d')
  const [fromDate, setFromDate] = useState(() => toDateInput(Date.now() - 7 * 86400000))
  const [toDate, setToDate] = useState(() => toDateInput(Date.now()))
  const [eventFilter, setEventFilter] = useState('all')

  const range = useMemo(
    () => (preset === 'custom' ? { preset: 'custom', from: fromDate, to: toDate } : { preset }),
    [preset, fromDate, toDate],
  )

  const { data, loading, error, reload } = useAsync(
    async () => {
      const [series, events] = await Promise.all([getHistory(range), getEvents(range)])
      return { series, events }
    },
    [range.preset, range.from, range.to],
  )

  const chartData = useMemo(
    () => (data?.series ?? []).map((p) => ({ ...p, nutrient: units.toNutrient(p.ec) })),
    [data, units],
  )

  const filteredEvents = useMemo(() => {
    const list = data?.events ?? []
    return eventFilter === 'all' ? list : list.filter((e) => e.type === eventFilter)
  }, [data, eventFilter])

  const summary = useMemo(() => {
    const events = data?.events ?? []
    const irr = events.filter((e) => e.type === 'irrigation')
    const fert = events.filter((e) => e.type === 'fertigation')
    const totalIrrL = irr.reduce((s, e) => s + (e.volumeL || 0), 0)
    const totalFertL = fert.reduce((s, e) => s + (e.volumeL || 0), 0)
    return { irrCount: irr.length, fertCount: fert.length, totalIrrL, totalFertL }
  }, [data])

  const xFormat = preset === 'today' ? shortTime : dateFmt

  function handleExportEventsCsv() {
    if (!filteredEvents.length) return
    const csv = toCSV(filteredEvents, [
      { key: 'start', label: 'Start Time', format: (v) => new Date(v).toISOString() },
      { key: 'type', label: 'Event Type' },
      { key: 'durationSec', label: 'Duration (sec)' },
      { key: 'volumeL', label: 'Volume (L)' },
      { key: 'trigger', label: 'Trigger Reason' },
      { key: 'targetEc', label: 'Target EC (mS/cm)' },
      { key: 'finalEc', label: 'Final EC (mS/cm)' },
      { key: 'accuracy', label: 'Accuracy (%)' },
    ])
    downloadCSV(`hydrosync-events-${preset}.csv`, csv)
    toast({ title: 'Exported events CSV', description: `${filteredEvents.length} rows downloaded.`, tone: 'success' })
  }

  function handleExportSensorsCsv() {
    if (!chartData.length) return
    const csv = toCSV(chartData, [
      { key: 'ts', label: 'Timestamp', format: (v) => new Date(v).toISOString() },
      { key: 'm1', label: 'Soil Moisture Zone 1 (%)' },
      { key: 'm2', label: 'Soil Moisture Zone 2 (%)' },
      { key: 'm3', label: 'Soil Moisture Zone 3 (%)' },
      { key: 'avg', label: 'Soil Moisture Avg (%)' },
      { key: 'ec', label: 'EC (mS/cm)' },
      { key: 'ec', label: `TDS ppm (x${n.factor})`, format: (v) => Math.round(ecToPpm(v, n.factor)) },
      { key: 'tank', label: 'Water Tank Level (%)' },
      { key: 'fert', label: 'Fertilizer Tank F Level (%)' },
    ])
    downloadCSV(`hydrosync-telemetry-${preset}.csv`, csv)
    toast({ title: 'Exported sensor telemetry CSV', description: `${chartData.length} samples downloaded.`, tone: 'success' })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="History & Reports"
        icon={HistoryIcon}
        description="Inspect multi-day sensor curves, review irrigation and fertigation cycles across the 4-week field test, and export CSV datasets."
        actions={
          <>
            <SegmentedControl
              label="Date range preset"
              value={preset}
              onChange={setPreset}
              options={PRESETS}
            />
            <button
              type="button"
              onClick={handleExportSensorsCsv}
              disabled={loading || !chartData.length}
              className="btn-secondary"
            >
              <Download className="h-4 w-4" aria-hidden="true" /> Sensor CSV
            </button>
            <button
              type="button"
              onClick={handleExportEventsCsv}
              disabled={loading || !filteredEvents.length}
              className="btn-primary"
            >
              <Download className="h-4 w-4" aria-hidden="true" /> Export Events CSV
            </button>
          </>
        }
      />

      {preset === 'custom' && (
        <div className="card flex flex-wrap items-end gap-3 p-4">
          <Calendar className="mb-2.5 h-5 w-5 text-brand-600 dark:text-brand-400" aria-hidden="true" />
          <div>
            <label htmlFor="hist-from" className="label">
              From date
            </label>
            <input
              id="hist-from"
              type="date"
              value={fromDate}
              max={toDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="hist-to" className="label">
              To date
            </label>
            <input
              id="hist-to"
              type="date"
              value={toDate}
              min={fromDate}
              max={toDateInput(Date.now())}
              onChange={(e) => setToDate(e.target.value)}
              className="input"
            />
          </div>
        </div>
      )}

      <Stagger className="space-y-6">
        {/* Summary strip */}
        <StaggerItem className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="card p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">Irrigation cycles</p>
            <p className="mt-1 text-2xl font-bold">
              <AnimatedNumber value={summary.irrCount} />
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">Total water applied</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              <AnimatedNumber value={units.volume(summary.totalIrrL)} decimals={units.volumeDecimals} suffix={units.volumeSuffix} />
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">Fertigation cycles</p>
            <p className="mt-1 text-2xl font-bold">
              <AnimatedNumber value={summary.fertCount} />
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">Fertilizer stock dosed</p>
            <p className="mt-1 text-2xl font-bold text-fuchsia-700 dark:text-fuchsia-300">
              <AnimatedNumber value={units.volume(summary.totalFertL)} decimals={2} suffix={units.volumeSuffix} />
            </p>
          </div>
        </StaggerItem>

        {/* Historical charts for every sensor */}
        <StaggerItem className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            className="lg:col-span-2"
            title="Historical soil moisture (Zones 1–3)"
            subtitle={`Shaded band = ${crop.name} target (${thresholds.moistureMin}–${thresholds.moistureMax}%)`}
            icon={Droplets}
            loading={loading}
            error={error}
            onRetry={reload}
            empty={!chartData.length}
            height={280}
          >
            <TimeSeriesChart
              data={chartData}
              xFormat={xFormat}
              tooltipLabel={dateTimeFmt}
              yDomain={[0, 100]}
              target={{ min: thresholds.moistureMin, max: thresholds.moistureMax }}
              series={[
                { key: 'm1', name: 'Zone 1', color: SERIES_COLORS.zone1, unit: '%', decimals: 1 },
                { key: 'm2', name: 'Zone 2', color: SERIES_COLORS.zone2, unit: '%', decimals: 1 },
                { key: 'm3', name: 'Zone 3', color: SERIES_COLORS.zone3, unit: '%', decimals: 1 },
              ]}
            />
          </ChartCard>

          <ChartCard
            title={`Historical ${n.label} (${n.unit})`}
            subtitle={`Target ${units.toNutrient(thresholds.ecMin)}–${units.toNutrient(thresholds.ecMax)} ${n.unit}`}
            icon={Zap}
            loading={loading}
            error={error}
            onRetry={reload}
            empty={!chartData.length}
            height={250}
          >
            <TimeSeriesChart
              data={chartData}
              xFormat={xFormat}
              tooltipLabel={dateTimeFmt}
              target={{ min: units.toNutrient(thresholds.ecMin), max: units.toNutrient(thresholds.ecMax) }}
              series={[
                { key: 'nutrient', name: `${n.label} (${n.unit})`, color: SERIES_COLORS.nutrient, area: true, unit: ` ${n.unit}`, decimals: n.decimals },
              ]}
            />
          </ChartCard>

          <ChartCard
            title="Water tank & Tank F levels (%)"
            subtitle="Ultrasonic level history across refill cycles"
            icon={Container}
            loading={loading}
            error={error}
            onRetry={reload}
            empty={!chartData.length}
            height={250}
          >
            <TimeSeriesChart
              data={chartData}
              xFormat={xFormat}
              tooltipLabel={dateTimeFmt}
              yDomain={[0, 100]}
              series={[
                { key: 'tank', name: 'Water tank', color: SERIES_COLORS.tank, unit: '%', decimals: 1 },
                { key: 'fert', name: 'Fertilizer Tank F', color: SERIES_COLORS.fert, unit: '%', decimals: 1 },
              ]}
            />
          </ChartCard>
        </StaggerItem>

        {/* Irrigation & fertigation event table */}
        <StaggerItem as="section" className="card p-5" aria-labelledby="events-table-heading">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 id="events-table-heading" className="section-title">
                Irrigation &amp; fertigation events ({filteredEvents.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Start time, duration, volume and trigger reason (Auto / Manual / Schedule)
              </p>
            </div>
            <SegmentedControl
              size="sm"
              label="Filter event type"
              value={eventFilter}
              onChange={setEventFilter}
              options={EVENT_FILTERS}
            />
          </div>

          {loading ? (
            <ListSkeleton rows={6} />
          ) : error ? (
            <ErrorState compact message={error} onRetry={reload} />
          ) : filteredEvents.length === 0 ? (
            <EmptyState compact icon={HistoryIcon} title="No events in this date range" description="Try widening the selected date range." />
          ) : (
            <div className="max-h-[480px] overflow-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th scope="col">Start time</th>
                    <th scope="col">Type</th>
                    <th scope="col">Duration</th>
                    <th scope="col">Volume ({units.volumeSuffix.trim()})</th>
                    <th scope="col">Trigger reason</th>
                    <th scope="col">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.slice(0, 80).map((e) => {
                    const isFert = e.type === 'fertigation'
                    const triggerTone = e.trigger === 'Auto' ? 'brand' : e.trigger === 'Manual' ? 'warn' : 'info'
                    return (
                      <tr key={e.id}>
                        <td className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">{dateTimeFmt(e.start)}</td>
                        <td className="whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 font-semibold">
                            {isFert ? (
                              <FlaskConical className="h-4 w-4 text-fuchsia-500" aria-hidden="true" />
                            ) : (
                              <Droplets className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                            )}
                            {isFert ? 'Fertigation' : 'Irrigation'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap tabular">{formatDuration(e.durationSec)}</td>
                        <td className="whitespace-nowrap tabular font-semibold">
                          {units.volume(e.volumeL).toFixed(isFert ? 2 : units.volumeDecimals)}
                          {units.volumeSuffix}
                        </td>
                        <td className="whitespace-nowrap">
                          <Badge tone={triggerTone}>{e.trigger}</Badge>
                        </td>
                        <td className="text-xs text-slate-500 dark:text-slate-400">
                          {isFert && e.finalEc != null
                            ? `Final EC ${e.finalEc.toFixed(2)} mS/cm (target ${e.targetEc?.toFixed(2) ?? '—'}, accuracy ${e.accuracy ?? '—'}%)`
                            : 'Main drip line · Zones 1–3'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </StaggerItem>
      </Stagger>
    </div>
  )
}
