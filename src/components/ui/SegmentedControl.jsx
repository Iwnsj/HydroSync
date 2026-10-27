import { useRef } from 'react'
import { motion } from 'framer-motion'
import { MOTION } from '../../config/motion'

/**
 * Radio-group style segmented control with a smooth highlight.
 * Arrow keys move between options (WAI-ARIA radio group pattern).
 */
export default function SegmentedControl({ options, value, onChange, label, size = 'md', className = '', disabled = false }) {
  const refs = useRef([])
  const enabledOpts = options.filter((o) => !o.disabled)

  const onKeyDown = (e) => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return
    e.preventDefault()
    const idx = enabledOpts.findIndex((o) => o.value === value)
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1
    const next = enabledOpts[(idx + dir + enabledOpts.length) % enabledOpts.length]
    onChange(next.value)
    refs.current[options.indexOf(next)]?.focus()
  }

  const pad = size === 'sm' ? 'min-h-[36px] px-2.5 text-xs' : 'min-h-[42px] px-3.5 text-sm'

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={`inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 scrollbar-none dark:bg-slate-800/80 ${className}`}
    >
      {options.map((o, i) => {
        const active = o.value === value
        const Icon = o.icon
        return (
          <button
            key={o.value}
            ref={(el) => (refs.current[i] = el)}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            disabled={disabled || o.disabled}
            onClick={() => onChange(o.value)}
            className={`relative shrink-0 whitespace-nowrap rounded-lg font-semibold transition-[color,transform] duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 ${pad} ${
              active ? 'text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {active && (
              <motion.span
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={MOTION.toggle}
                className="absolute inset-0 rounded-lg bg-white shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-700 dark:ring-white/10"
              />
            )}
            <span className="relative z-10 flex items-center justify-center gap-1.5">
              {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
              {o.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
