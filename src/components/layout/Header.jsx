import { Link } from 'react-router-dom'
import { Bell, Bot, Cloud, Hand, Moon, Router, Sun, WifiOff } from 'lucide-react'
import Logo from './Logo'
import { Badge } from '../ui/Badge'
import { useActiveProfile } from '../../hooks/useActiveProfile'
import { useIsDark } from '../../hooks/useTheme'
import { useLive } from '../../hooks/useTelemetry'
import { useSettingsStore } from '../../store/settingsStore'
import { useTelemetryStore } from '../../store/telemetryStore'
import { systemStatus } from '../../utils/status'

const STATUS_ICON = { online: Cloud, local: Router, offline: WifiOff, unknown: Cloud }

/** Sticky top bar: active crop, control-mode badge, system status, alerts, theme. */
export default function Header() {
  const { crop, stage } = useActiveProfile()
  const { live } = useLive()
  const dark = useIsDark()
  const updateSettings = useSettingsStore((s) => s.updateSettings)
  const unread = useTelemetryStore((s) => s.alerts.reduce((n, a) => n + (a.read ? 0 : 1), 0))
  const status = systemStatus(live?.connection)
  const StatusIcon = STATUS_ICON[status.id]

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-950/80">
      <div className="flex items-center gap-2 px-4 py-2.5 sm:gap-3 sm:px-6 lg:px-8">
        <Link to="/" className="lg:hidden" aria-label="HydroSync home">
          <Logo compact />
        </Link>

        <Link
          to="/crops"
          className="flex min-h-[44px] min-w-0 items-center gap-2 rounded-xl px-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label={`Active crop: ${crop.name}, ${stage.label} stage. Change crop`}
        >
          <span className="text-2xl leading-none" aria-hidden="true">
            {crop.emoji}
          </span>
          <span className="hidden min-w-0 leading-tight sm:block">
            <span className="block truncate text-sm font-semibold">{crop.name}</span>
            <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{stage.label}</span>
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {live && (
            <Badge tone={live.mode === 'auto' ? 'brand' : 'warn'} icon={live.mode === 'auto' ? Bot : Hand} className="hidden sm:inline-flex">
              {live.mode === 'auto' ? 'Auto' : 'Manual'}
            </Badge>
          )}
          <Link to="/connectivity" aria-label={`System status: ${status.label}`}>
            <Badge tone={status.tone} icon={StatusIcon}>
              {status.label}
            </Badge>
          </Link>
          <Link to="/alerts" className="btn-icon relative" aria-label={`Alerts${unread ? `, ${unread} unread` : ''}`}>
            <Bell className="h-5 w-5" aria-hidden="true" />
            {unread > 0 && (
              <span className="absolute right-1.5 top-1.5 min-w-[18px] rounded-full bg-rose-500 px-1 text-center text-[10px] font-bold leading-[18px] text-white" aria-hidden="true">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Link>
          <button
            type="button"
            className="btn-icon"
            onClick={() => updateSettings({ theme: dark ? 'light' : 'dark' })}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </div>
    </header>
  )
}
