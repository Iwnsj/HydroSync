import { useIsDark } from '../../hooks/useTheme'
import { fmtNum } from '../../utils/format'

/** Axis/grid colors that follow light/dark mode. */
export function useChartTheme() {
  const dark = useIsDark()
  return {
    grid: dark ? '#1e293b' : '#e2e8f0',
    tick: dark ? '#94a3b8' : '#64748b',
    cursor: dark ? '#475569' : '#cbd5e1',
    label: dark ? '#cbd5e1' : '#334155',
  }
}

export const axisTick = (theme) => ({ fill: theme.tick, fontSize: 11 })

/**
 * Shared tooltip. `meta` maps dataKey → { unit, decimals } for formatting.
 */
export function ChartTooltip({ active, payload, label, labelFormatter, meta = {} }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
      <p className="mb-1 font-semibold text-slate-700 dark:text-slate-200">{labelFormatter ? labelFormatter(label) : label}</p>
      <ul className="space-y-0.5">
        {payload.map((p) => {
          const m = meta[p.dataKey] || {}
          return (
            <li key={p.dataKey} className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} aria-hidden="true" />
              <span className="text-slate-500 dark:text-slate-400">{p.name}</span>
              <span className="ml-auto pl-3 font-semibold tabular text-slate-800 dark:text-slate-100">
                {p.value == null ? '—' : `${fmtNum(p.value, m.decimals ?? 1)}${m.unit ?? ''}`}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
