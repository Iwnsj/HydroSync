import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import Header from './Header'
import FallbackBanner from './FallbackBanner'
import Toaster from '../ui/Toaster'
import { useMotionEnabled } from '../../hooks/useMotionEnabled'

/**
 * App shell. First load: nav + header fade in, then the content area eases
 * up; each page then staggers its own cards. Route changes: quick fade/slide.
 */
export default function AppLayout() {
  const location = useLocation()
  const enabled = useMotionEnabled()

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  return (
    <div className="min-h-dvh lg:pl-64">
      <a
        href="#main"
        className="sr-only z-[80] rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      <div className={enabled ? 'animate-nav-in' : ''}>
        <Sidebar />
      </div>

      <div className="flex min-h-dvh flex-col">
        <div className={`sticky top-0 z-30 ${enabled ? 'animate-nav-in' : ''}`}>
          <Header />
          <FallbackBanner />
        </div>

        <main
          id="main"
          tabIndex={-1}
          className={`mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-5 outline-none sm:px-6 lg:px-8 lg:pb-12 lg:pt-7 ${
            enabled ? 'animate-main-in' : ''
          }`}
        >
          <div key={location.pathname} className={enabled ? 'animate-page-in' : ''}>
            <Outlet />
          </div>
        </main>
      </div>

      <div className={enabled ? 'animate-nav-in' : ''}>
        <BottomNav />
      </div>
      <Toaster />
    </div>
  )
}
