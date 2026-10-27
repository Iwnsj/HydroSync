import { useMemo } from 'react'
import { useSettingsStore } from '../store/settingsStore'
import {
  ecToPpm,
  nutrientMeta,
  nutrientSecondary,
  toNutrientUnit,
  toTemp,
  toVolume,
  volumeSuffix,
} from '../utils/format'

/** Unit helpers bound to the user's display settings. */
export function useUnits() {
  const settings = useSettingsStore((s) => s.settings)
  return useMemo(() => {
    const meta = nutrientMeta(settings)
    return {
      settings,
      nutrient: meta, // { label, unit, suffix, decimals, factor }
      toNutrient: (ec) => toNutrientUnit(ec, settings),
      nutrientSecondary: (ec) => nutrientSecondary(ec, settings),
      ppm: (ec) => ecToPpm(ec, settings.ecFactor),
      temp: (c) => toTemp(c, settings.tempUnit),
      tempSuffix: settings.tempUnit === 'F' ? '°F' : '°C',
      volume: (l) => toVolume(l, settings.volumeUnit),
      volumeSuffix: volumeSuffix(settings.volumeUnit),
      volumeDecimals: settings.volumeUnit === 'gal' ? 1 : 0,
    }
  }, [settings])
}
