import { STATUS_ICON, TONE } from '../../utils/status'

/** Small pill with icon + text, so status is never conveyed by color alone. */
export function StatusPill({ status = 'neutral', label, icon, className = '' }) {
  const tone = TONE[status] ?? TONE.neutral
  const Icon = icon ?? STATUS_ICON[status] ?? STATUS_ICON.neutral
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${tone.bg} ${tone.text} ${tone.ring} ${className}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  )
}

export function Badge({ tone = 'neutral', icon: Icon, children, className = '' }) {
  const t = TONE[tone] ?? TONE.neutral
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${t.bg} ${t.text} ${t.ring} ${className}`}
    >
      {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
      {children}
    </span>
  )
}

/** Live dot with a soft pulse. */
export function LiveDot({ active = true, tone = 'ok', label }) {
  const t = TONE[tone] ?? TONE.ok
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="relative flex h-2.5 w-2.5">
        {active && <span className={`absolute inline-flex h-full w-full animate-soft-ping rounded-full ${t.dot}`} />}
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${active ? t.dot : 'bg-slate-400'}`} />
      </span>
      {label && <span className="text-xs font-semibold">{label}</span>}
    </span>
  )
}
