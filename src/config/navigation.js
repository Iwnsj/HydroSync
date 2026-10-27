import {
  Activity,
  BarChart3,
  Bell,
  CloudRain,
  Gauge,
  History,
  LayoutDashboard,
  Settings,
  Sprout,
  Wifi,
} from 'lucide-react'

/**
 * Navigation map. `primary` items appear in the mobile bottom nav;
 * the rest live in the "More" sheet. The sidebar shows everything, grouped.
 */
export const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, group: 'Monitor', primary: true, end: true },
  { to: '/live', label: 'Live', longLabel: 'Live Monitoring', icon: Activity, group: 'Monitor', primary: true },
  { to: '/weather', label: 'Weather', longLabel: 'Weather & Rain', icon: CloudRain, group: 'Monitor' },
  { to: '/alerts', label: 'Alerts', longLabel: 'Alerts & SMS', icon: Bell, group: 'Monitor' },
  { to: '/control', label: 'Control', longLabel: 'Device Control', icon: Gauge, group: 'Control', primary: true },
  { to: '/crops', label: 'Crops', longLabel: 'Crop Profiles', icon: Sprout, group: 'Control', primary: true },
  { to: '/history', label: 'History', longLabel: 'History & Reports', icon: History, group: 'Insights' },
  { to: '/performance', label: 'Performance', longLabel: 'System Performance', icon: BarChart3, group: 'Insights' },
  { to: '/connectivity', label: 'Connectivity', longLabel: 'Connectivity', icon: Wifi, group: 'System' },
  { to: '/settings', label: 'Settings', icon: Settings, group: 'System' },
]

export const NAV_GROUPS = ['Monitor', 'Control', 'Insights', 'System']
