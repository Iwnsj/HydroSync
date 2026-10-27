import { useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { syncDeviceConfig } from '../services/telemetryService'
import { useSettingsStore } from '../store/settingsStore'
import { useTelemetryStore } from '../store/telemetryStore'
import { useActiveProfile } from './useActiveProfile'

/** Start the live telemetry subscription once for the whole app. */
export function useTelemetryBootstrap() {
  useEffect(() => {
    useTelemetryStore.getState().start()
    return () => useTelemetryStore.getState().stop()
  }, [])
}

/**
 * Push the active crop thresholds + alert/connection settings to the device
 * whenever they change (Laravel: PUT /devices/{id}/config, ESP32: PUT /api/config).
 */
export function useDeviceConfigSync() {
  const { crop, thresholds } = useActiveProfile()
  const s = useSettingsStore(
    useShallow((st) => ({
      alertThresholds: st.settings.alertThresholds,
      recipients: st.settings.recipients,
      smsEnabled: st.settings.smsEnabled,
      connectionMode: st.settings.connectionMode,
      esp32Ip: st.settings.esp32Ip,
      apiBaseUrl: st.settings.apiBaseUrl,
    })),
  )

  useEffect(() => {
    syncDeviceConfig({ thresholds, cropName: crop.name, ...s })
  }, [thresholds, crop.name, s])
}

/** Convenience: live snapshot + load state. */
export function useLive() {
  return useTelemetryStore(
    useShallow((st) => ({
      live: st.live,
      loading: st.status === 'loading' || st.status === 'idle',
      error: st.status === 'error' ? st.error : null,
      retry: st.start,
    })),
  )
}
