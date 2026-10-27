import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import AppLayout from './components/layout/AppLayout'
import Overview from './pages/Overview'
import LiveMonitoring from './pages/LiveMonitoring'
import DeviceControl from './pages/DeviceControl'
import CropProfiles from './pages/CropProfiles'
import Weather from './pages/Weather'
import Alerts from './pages/Alerts'
import History from './pages/History'
import Performance from './pages/Performance'
import Connectivity from './pages/Connectivity'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'
import { useMotionEnabled } from './hooks/useMotionEnabled'
import { useDeviceConfigSync, useTelemetryBootstrap } from './hooks/useTelemetry'
import { useThemeEffect } from './hooks/useTheme'

export default function App() {
  useThemeEffect()
  useDeviceConfigSync() 
  useTelemetryBootstrap()
  const motionEnabled = useMotionEnabled()

  useEffect(() => {
    document.documentElement.classList.toggle('motion-off', !motionEnabled)
  }, [motionEnabled])

  return (
    <MotionConfig reducedMotion={motionEnabled ? 'never' : 'always'}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Overview />} />
          <Route path="live" element={<LiveMonitoring />} />
          <Route path="control" element={<DeviceControl />} />
          <Route path="crops" element={<CropProfiles />} />
          <Route path="weather" element={<Weather />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="history" element={<History />} />
          <Route path="performance" element={<Performance />} />
          <Route path="connectivity" element={<Connectivity />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </MotionConfig>
  )
}
