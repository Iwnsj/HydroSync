import { NavLink } from 'react-router-dom'
import { Cpu } from 'lucide-react'
import Logo from './Logo'
import { LiveDot } from '../ui/Badge'
import { NAV_GROUPS, NAV_ITEMS } from '../../config/navigation'
import { HARDWARE } from '../../config/device'
import { useLive } from '../../hooks/useTelemetry'
import { useTelemetryStore } from '../../store/telemetryStore'
import { formatDuration } from '../../utils/format'
import { systemStatus } from '../../utils/status'

/** Desktop sidebar (lg and up). */
export default function Sidebar() {
  const { live } = useLive()
  const unread = useTelemetryStore((s) => s.alerts.reduce((n, a) => n + (a.read ? 0 : 1), 0))
  const status = systemStatus(live?.connection)

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:flex">
      <div className="px-5 pb-4 pt-5">
        <Logo />
      </div>
      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 pb-4">
        {NAV_GROUPS.map((group) => (
          <div key={group} className="mt-4 first:mt-0">
            <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{group}</p>
            <ul className="space-y-0.5">
              {NAV_ITEMS.filter((i) => i.group === group).map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `group flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-brand-50 text-brand-800 dark:bg-brand-500/10 dark:text-brand-200'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                      }`
                    }
                  >
                    <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <span className="flex-1">{item.longLabel ?? item.label}</span>
                    {item.to === '/alerts' && unread > 0 && (
                      <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-bold text-white" aria-label={`${unread} unread`}>
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="m-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-950/50">
        <div className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
          <Cpu className="h-4 w-4" aria-hidden="true" /> {HARDWARE.mcu}
        </div>
        <div className="mt-2 flex items-center justify-between text-slate-500 dark:text-slate-400">
          <LiveDot active={status.id !== 'unknown'} tone={status.tone} label={status.label} />
          <span>{live ? `up ${formatDuration(live.uptimeSec)}` : '—'}</span>
        </div>
        <p className="mt-1 text-slate-400 dark:text-slate-500">Firmware {HARDWARE.firmware}</p>
      </div>
    </aside>
  )
}
