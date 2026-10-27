import { useMemo } from 'react'
import { useSettingsStore } from '../store/settingsStore'
import { resolveCrop, stageMeta } from '../utils/cropUtils'

/**
 * The selected crop + growth stage and the thresholds that apply right now.
 * Every page reads targets from here, so switching crops updates the whole app.
 */
export function useActiveProfile() {
  const cropId = useSettingsStore((s) => s.selectedCropId)
  const stageId = useSettingsStore((s) => s.activeStage)
  const overrides = useSettingsStore((s) => s.cropOverrides)
  const customCrop = useSettingsStore((s) => s.customCrop)

  return useMemo(() => {
    const crop = resolveCrop(cropId, overrides, customCrop)
    const thresholds = crop.stages[stageId] ?? crop.stages.vegetative
    return { crop, stageId, stage: stageMeta(stageId), thresholds }
  }, [cropId, stageId, overrides, customCrop])
}
