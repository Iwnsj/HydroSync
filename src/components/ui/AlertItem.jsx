import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { EASE, MOTION } from '../../config/motion'
import { useNow } from '../../hooks/useNow'
import { relativeTime, timeFmt } from '../../utils/format'
import { SEVERITY, TONE } from '../../utils/status'

/** Single alert row: severity icon + label, title, message, time, mark-read. */
export function AlertItem({ alert, onMarkRead, now = Date.now() }) {
  const sev = SEVERITY[alert.severity] ?? SEVERITY.info
  const tone = TONE[sev.tone]
  const Icon = sev.icon
  const isFresh = now - alert.ts < 6000
  return (
    <div
      className={`flex gap-3 rounded-xl border p-3 transition-colors ${tone.border} ${alert.read ? 'bg-white dark:bg-slate-900' : tone.bg} ${
        alert.severity === 'critical' && isFresh ? 'animate-attention' : ''
      }`}
    >
      <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${tone.bg} ${tone.text}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="font-semibold leading-tight">{alert.title}</p>
          <span className={`text-[11px] font-bold uppercase tracking-wide ${tone.text}`}>{sev.label}</span>
          {!alert.read && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 dark:text-brand-300">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden="true" />
              New
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{alert.message}</p>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          <time dateTime={new Date(alert.ts).toISOString()} title={timeFmt(alert.ts)}>
            {relativeTime(alert.ts, now)}
          </time>
        </p>
      </div>
      {onMarkRead && !alert.read && (
        <button
          type="button"
          onClick={() => onMarkRead(alert.id)}
          className="btn-icon -mr-1 -mt-1 h-10 w-10 shrink-0"
          aria-label={`Mark "${alert.title}" as read`}
        >
          <Check className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

/** Animated list: new alerts slide in from the top; existing ones shift smoothly. */
export function AlertList({ alerts, onMarkRead }) {
  const now = useNow(5000)
  return (
    <ul className="space-y-2" aria-live="polite">
      <AnimatePresence initial={false}>
        {alerts.map((a) => (
          <motion.li
            key={a.id}
            initial={{ opacity: 0, y: MOTION.list.offsetY }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: MOTION.list.offsetX }}
            transition={{ duration: MOTION.list.duration, ease: EASE.out }}
          >
            <AlertItem alert={a} onMarkRead={onMarkRead} now={now} />
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  )
}

export default AlertItem
