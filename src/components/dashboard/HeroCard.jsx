import { Link } from 'react-router-dom'
import { Bot, Cloud, Hand, Router, WifiOff } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Skeleton } from '../ui/Skeleton'
import { DEFAULTS_DISCLAIMER } from '../../data/crops'
import { useNow } from '../../hooks/useNow'
import { greeting, relativeTime } from '../../utils/format'
import { systemStatus } from '../../utils/status'

const CONN = {
  cloud: { label: 'Cloud', icon: Cloud },
  local: { label: 'Local hotspot', icon: Router },
  offline: { label: 'Offline fallback', icon: WifiOff },
}

/** Overview header card: crop, stage, control mode, connection mode, system status. */
export default function HeroCard({ crop, stage, thresholds, live, loading }) {
  const now = useNow(1000)
  const status = systemStatus(live?.connection)
  const conn = CONN[live?.connection.mode ?? 'cloud']

  return (
    <section className="card relative overflow-hidden p-5 sm:p-6" aria-label="System summary">
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-400/15 blur-3xl" aria-hidden="true" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="grid h-20 w-20 shrink-0 place-items-center rounded-3xl bg-gradient-to-br from-brand-50 to-emerald-100 text-5xl dark:from-brand-500/10 dark:to-emerald-500/10" aria-hidden="true">
          {crop.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-500 dark:text-slate-400">{greeting()} · Active crop</p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight sm:text-3xl">
            {crop.name} <span className="text-lg font-medium text-slate-500 dark:text-slate-400">({crop.localName})</span>
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {stage.emoji} {stage.label} stage · target moisture {thresholds.moistureMin}–{thresholds.moistureMax}% · EC {thresholds.ecMin}–{thresholds.ecMax} mS/cm
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {loading || !live ? (
              <>
                <Skeleton className="h-7 w-20 rounded-full" />
                <Skeleton className="h-7 w-24 rounded-full" />
                <Skeleton className="h-7 w-20 rounded-full" />
              </>
            ) : (
              <>
                <Badge tone={live.mode === 'auto' ? 'brand' : 'warn'} icon={live.mode === 'auto' ? Bot : Hand}>
                  {live.mode === 'auto' ? 'Automatic mode' : 'Manual mode'}
                </Badge>
                <Badge tone="neutral" icon={conn.icon}>
                  {conn.label}
                </Badge>
                <Badge tone={status.tone}>● {status.label}</Badge>
                <span className="self-center text-xs text-slate-500 dark:text-slate-400">Updated {relativeTime(live.ts, now)}</span>
              </>
            )}
          </div>
        </div>
        <Link to="/crops" className="btn-secondary self-start sm:self-center">
          Change crop
        </Link>
      </div>
      <p className="relative mt-4 text-[11px] text-slate-400 dark:text-slate-500">⚠ Crop thresholds: {DEFAULTS_DISCLAIMER}</p>
    </section>
  )
}
