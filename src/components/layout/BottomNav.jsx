import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { MoreHorizontal, X } from 'lucide-react'
import { MOTION } from '../../config/motion'
import { NAV_ITEMS } from '../../config/navigation'
import { useTelemetryStore } from '../../store/telemetryStore'

const PRIMARY = NAV_ITEMS.filter((i) => i.primary)
const SECONDARY = NAV_ITEMS.filter((i) => !i.primary)

/** Mobile bottom navigation (below lg) with a "More" bottom sheet. */
export default function BottomNav() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const unread = useTelemetryStore((s) => s.alerts.reduce((n, a) => n + (a.read ? 0 : 1), 0))
  const moreActive = SECONDARY.some((i) => location.pathname.startsWith(i.to))

  useEffect(() => setOpen(false), [location.pathname])
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg dark:border-slate-800 dark:bg-slate-900/90 lg:hidden"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {PRIMARY.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} end={item.end} className="relative flex min-h-[64px] flex-col items-center justify-center gap-1 text-[11px] font-semibold">
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        initial={{ scale: 0.85, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={MOTION.toggle}
                        className="absolute top-1.5 h-8 w-14 rounded-full bg-brand-100 dark:bg-brand-500/20"
                      />
                    )}
                    <item.icon
                      className={`relative h-5 w-5 ${isActive ? 'text-brand-700 dark:text-brand-300' : 'text-slate-500 dark:text-slate-400'}`}
                      aria-hidden="true"
                    />
                    <span className={`relative ${isActive ? 'text-brand-800 dark:text-brand-200' : 'text-slate-500 dark:text-slate-400'}`}>{item.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={open}
              className="relative flex min-h-[64px] w-full flex-col items-center justify-center gap-1 text-[11px] font-semibold"
            >
              {moreActive && (
                <motion.span
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={MOTION.toggle}
                  className="absolute top-1.5 h-8 w-14 rounded-full bg-brand-100 dark:bg-brand-500/20"
                />
              )}
              <span className="relative">
                <MoreHorizontal className={`h-5 w-5 ${moreActive ? 'text-brand-700 dark:text-brand-300' : 'text-slate-500 dark:text-slate-400'}`} aria-hidden="true" />
                {unread > 0 && <span className="absolute -right-1.5 -top-1 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" aria-hidden="true" />}
              </span>
              <span className={`relative ${moreActive ? 'text-brand-800 dark:text-brand-200' : 'text-slate-500 dark:text-slate-400'}`}>More</span>
            </button>
          </li>
        </ul>
      </nav>

      {createPortal(
        <AnimatePresence>
          {open && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <motion.div
                className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpen(false)}
                aria-hidden="true"
              />
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-label="More pages"
                className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-slate-200 bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl dark:border-slate-800 dark:bg-slate-900"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={MOTION.sheet}
              >
                <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-700" aria-hidden="true" />
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-base font-semibold">More</h2>
                  <button type="button" onClick={() => setOpen(false)} className="btn-icon" aria-label="Close menu">
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
                <ul className="grid grid-cols-3 gap-2">
                  {SECONDARY.map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        className={({ isActive }) =>
                          `relative flex min-h-[84px] flex-col items-center justify-center gap-2 rounded-2xl border p-2 text-center text-xs font-semibold transition-[transform,background-color] active:scale-95 ${
                            isActive
                              ? 'border-brand-300 bg-brand-50 text-brand-800 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-200'
                              : 'border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-200'
                          }`
                        }
                      >
                        <item.icon className="h-6 w-6" aria-hidden="true" />
                        {item.longLabel ?? item.label}
                        {item.to === '/alerts' && unread > 0 && (
                          <span className="absolute right-2 top-2 rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">{unread}</span>
                        )}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}
