import { useEffect, useState } from 'react'
import { useSettingsStore } from '../store/settingsStore'

const query = '(prefers-color-scheme: dark)'

export function useIsDark() {
  const theme = useSettingsStore((s) => s.settings.theme)
  const [systemDark, setSystemDark] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = (e) => setSystemDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return theme === 'dark' || (theme === 'system' && systemDark)
}

/** Applies the `dark` class on <html> whenever the effective theme changes. */
export function useThemeEffect() {
  const dark = useIsDark()
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#020617' : '#058070')
  }, [dark])
  return dark
}
