import { Link } from 'react-router-dom'
import { CloudRain, CloudSun, ShieldCheck } from 'lucide-react'
import AnimatedNumber from '../ui/AnimatedNumber'
import ProgressBar from '../ui/ProgressBar'
import { Skeleton } from '../ui/Skeleton'
import { ErrorState } from '../ui/States'
import { isRainPreempted } from '../../utils/controlLogic'
import { shortTime } from '../../utils/format'

/**
 * Rain preemption status: forecast probability vs. threshold and the
 * resulting decision ("allowed" / "skipped: rain expected").
 */
export default function RainPreemptionCard({ live, threshold, loading, error, onRetry, compact = false }) {
  if (loading) {
    return (
      <div className="card p-5" role="status" aria-label="Loading rain forecast">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-4 h-10 w-24" />
        <Skeleton className="mt-4 h-3 w-full" />
        <Skeleton className="mt-4 h-12 w-full" />
      </div>
    )
  }
  if (error || !live) {
    return (
      <div className="card p-5">
        <ErrorState compact title="Forecast unavailable" message={error} onRetry={onRetry} />
      </div>
    )
  }

  const p = live.rain.probability
  const skipped = isRainPreempted(p, threshold)
  const stale = live.connection.edgeFallback

  return (
    <article className="card card-hover flex h-full flex-col p-5" aria-label="Rain preemption">
      <div className="flex items-center justify-between gap-2">
        <h2 className="section-title flex items-center gap-2">
          <CloudRain className="h-5 w-5 text-sky-500" aria-hidden="true" /> Rain preemption
        </h2>
        {!compact && (
          <Link to="/weather" className="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300">
            Forecast
          </Link>
        )}
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Rain probability (next 3 h)</p>
          <p className="mt-1 text-4xl font-bold tracking-tight">
            <AnimatedNumber value={p} suffix="%" />
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Threshold</p>
          <p className="mt-1 text-xl font-semibold">
            <AnimatedNumber value={threshold} suffix="%" />
          </p>
        </div>
      </div>

      <div className="mt-4">
        <ProgressBar value={p} tone={skipped ? 'info' : 'ok'} marker={threshold} markerLabel={`Threshold ${threshold}%`} label="Rain probability" height="h-3.5" />
        <div className="mt-1 flex justify-between text-[11px] text-slate-400">
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>

      <div
        className={`mt-4 flex items-start gap-3 rounded-xl border p-3 transition-colors duration-500 ${
          skipped
            ? 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100'
            : 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100'
        }`}
        role="status"
      >
        {skipped ? <CloudRain className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" /> : <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />}
        <div>
          <p className="font-bold">{skipped ? 'Irrigation skipped: rain expected' : 'Irrigation allowed'}</p>
          <p className="text-xs opacity-80">
            {skipped ? `${p}% ≥ ${threshold}% threshold, so HydroSync lets the rain water the field.` : `${p}% is below the ${threshold}% threshold.`}
          </p>
        </div>
      </div>

      <p className="mt-auto flex items-center gap-1.5 pt-3 text-xs text-slate-400 dark:text-slate-500">
        <CloudSun className="h-3.5 w-3.5" aria-hidden="true" />
        {stale ? `Cached forecast from ${shortTime(live.connection.weatherFetchedAt)} (offline)` : `OpenWeatherMap · updated ${shortTime(live.connection.weatherFetchedAt)}`}
      </p>
    </article>
  )
}
