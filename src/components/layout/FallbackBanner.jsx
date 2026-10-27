import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Router, ShieldAlert } from 'lucide-react'
import { EASE } from '../../config/motion'
import { useLive } from '../../hooks/useTelemetry'
import { useNow } from '../../hooks/useNow'
import { fmtNum, shortTime } from '../../utils/format'

/**
 * Prominent banner when the ESP32 is running edge fallback logic
 * (no internet / API), plus a slim info banner in Local hotspot mode.
 */
export default function FallbackBanner() {
  const { live } = useLive()
  const now = useNow(1000)
  const c = live?.connection
  const fallback = c?.edgeFallback
  const local = c?.mode === 'local'
  const pending = live ? live.sd.logged - live.sd.synced : 0

  return (
    <AnimatePresence initial={false}>
      {fallback && (
        <motion.div
          key="fallback"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: EASE.out }}
          role="alert"
          className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100 sm:px-6 lg:px-8"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-bold">Edge fallback active: ESP32 is controlling irrigation on its own</p>
              <p className="mt-0.5 text-amber-800 dark:text-amber-200/90">
                {c.mode === 'offline' ? 'Offline fallback mode selected.' : 'Internet / API unavailable.'} Using crop thresholds + cached forecast (from{' '}
                {shortTime(c.weatherFetchedAt)}). {fmtNum(pending)} SD-card records waiting to sync. SMS alerts still go out via GSM.
                {c.outageUntil && c.outageUntil > now && <> Retrying in {Math.ceil((c.outageUntil - now) / 1000)} s.</>}
              </p>
            </div>
            <Link to="/connectivity" className="btn-secondary hidden min-h-[36px] shrink-0 px-3 text-xs sm:inline-flex">
              Details
            </Link>
          </div>
        </motion.div>
      )}
      {!fallback && local && (
        <motion.div
          key="local"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="status"
          className="flex items-center gap-2 border-b border-sky-200 bg-sky-50 px-4 py-2 text-sm text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100 sm:px-6 lg:px-8"
        >
          <Router className="h-4 w-4 shrink-0" aria-hidden="true" />
          Local hotspot mode: talking directly to the ESP32 at <span className="font-mono font-semibold">{c.esp32Ip}</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
