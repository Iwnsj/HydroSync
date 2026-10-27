import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { EASE } from '../../config/motion'
import { useToastStore } from '../../store/toastStore'

const STYLES = {
  success: { icon: CheckCircle2, cls: 'text-emerald-600 dark:text-emerald-400' },
  error: { icon: XCircle, cls: 'text-rose-600 dark:text-rose-400' },
  warning: { icon: AlertTriangle, cls: 'text-amber-600 dark:text-amber-400' },
  info: { icon: Info, cls: 'text-sky-600 dark:text-sky-400' },
}

/** Toast stack; sits above the mobile bottom nav. */
export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  return createPortal(
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:left-auto lg:right-6 lg:items-end"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const s = STYLES[t.tone] ?? STYLES.info
          const Icon = s.icon
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.25, ease: EASE.out }}
              role={t.tone === 'error' ? 'alert' : 'status'}
              className="card pointer-events-auto flex w-full max-w-sm items-start gap-3 p-3.5 shadow-lift"
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${s.cls}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{t.title}</p>
                {t.description && <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">{t.description}</p>}
              </div>
              <button type="button" onClick={() => dismiss(t.id)} className="-m-1 rounded-lg p-1 text-slate-400 hover:text-slate-600" aria-label="Dismiss notification">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>,
    document.body,
  )
}
