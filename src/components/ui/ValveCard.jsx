import { motion } from 'framer-motion'
import { Clock, Droplets, FlaskConical, Loader2 } from 'lucide-react'
import Toggle from './Toggle'
import { useNow } from '../../hooks/useNow'
import { countdown } from '../../utils/format'

/**
 * 12V solenoid valve card. Shows a pulsing indicator while ON, optional
 * toggle (manual mode) and the remaining time of a timed manual run.
 */
export default function ValveCard({ valve, isOn, interactive = false, disabled = false, pending = false, onToggle, manualRun, note, extra }) {
  const Icon = valve.id === 'fertilizer' ? FlaskConical : Droplets
  const running = manualRun && manualRun.valveId === valve.id

  return (
    <article className="card card-hover p-4" aria-label={`${valve.name}: ${isOn ? 'on' : 'off'}`}>
      <div className="flex items-center gap-3">
        <div
          className={`relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl transition-colors duration-500 ${
            isOn ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
          }`}
        >
          <Icon className="h-6 w-6" aria-hidden="true" />
          {isOn && (
            <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-soft-ping rounded-full bg-emerald-400" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold leading-tight">{valve.name}</h3>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{valve.description}</p>
        </div>
        {interactive ? (
          <Toggle checked={isOn} onChange={onToggle} disabled={disabled} pending={pending} label={`${valve.name} ${isOn ? 'on' : 'off'}`} />
        ) : (
          <motion.span
            key={String(isOn)}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`inline-flex min-w-[3.5rem] items-center justify-center gap-1 rounded-full px-3 py-1.5 text-sm font-bold ${
              isOn ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            {isOn ? 'ON' : 'OFF'}
          </motion.span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className={isOn ? 'font-medium text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}>
          {isOn ? '● Open, water flowing' : '○ Closed'}
        </span>
        {running ? <RunCountdown endsAt={manualRun.endsAt} /> : <span className="text-xs text-slate-400 dark:text-slate-500">{valve.relay}</span>}
      </div>
      {note && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{note}</p>}
      {extra}
    </article>
  )
}

function RunCountdown({ endsAt }) {
  const now = useNow(1000)
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="tabular">{countdown(endsAt - now)}</span> left
    </span>
  )
}
