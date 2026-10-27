import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, HelpCircle } from 'lucide-react'
import { EASE, MOTION } from '../../config/motion'

/**
 * Accessible confirmation dialog (role="alertdialog"): focus moves in on
 * open, Tab is trapped, Esc cancels, focus returns to the trigger on close.
 * Rendered in a portal so transformed (animating) parents don't affect it.
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary', // 'primary' | 'danger'
  busy = false,
  onConfirm,
  onCancel,
  children,
}) {
  const panelRef = useRef(null)
  const confirmRef = useRef(null)
  const titleId = useId()
  const descId = useId()
  const cancelRef = useRef(onCancel)
  cancelRef.current = onCancel

  useEffect(() => {
    if (!open) return undefined
    const previouslyFocused = document.activeElement
    const t = setTimeout(() => confirmRef.current?.focus(), 40)
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        cancelRef.current?.()
      }
      if (e.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll('button:not([disabled]), input, select, textarea, [href], [tabindex]:not([tabindex="-1"])')
        if (!focusables.length) return
        const firstEl = focusables[0]
        const lastEl = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault()
          lastEl.focus()
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault()
          firstEl.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previouslyFocused?.focus?.()
    }
  }, [open])

  const Icon = tone === 'danger' ? AlertTriangle : HelpCircle

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: MOTION.dialog.duration }}
        >
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />
          <motion.div
            ref={panelRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            className="card relative w-full max-w-md p-5 shadow-2xl sm:p-6"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.22, ease: EASE.out }}
          >
            <div className="flex gap-4">
              <span
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${
                  tone === 'danger' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' : 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 id={titleId} className="text-lg font-semibold">
                  {title}
                </h2>
                {description && (
                  <p id={descId} className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {description}
                  </p>
                )}
                {children}
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className="btn-secondary" onClick={onCancel}>
                {cancelLabel}
              </button>
              <button
                ref={confirmRef}
                type="button"
                className={tone === 'danger' ? 'btn-danger' : 'btn-primary'}
                onClick={onConfirm}
                disabled={busy}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
