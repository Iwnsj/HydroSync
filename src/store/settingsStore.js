import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { CUSTOM_CROP_ID, DEFAULT_CROP_ID, DEFAULT_STAGE_ID, GROWTH_STAGES, createCustomCrop } from '../data/crops'
import { DEFAULT_SETTINGS } from '../config/defaults'

/**
 * User preferences + crop selection. Persisted to localStorage
 * ("hydrosync-settings"). Nothing here comes from the device.
 */

const freshSettings = () => ({
  ...DEFAULT_SETTINGS,
  alertThresholds: { ...DEFAULT_SETTINGS.alertThresholds },
  recipients: [...DEFAULT_SETTINGS.recipients],
})

const initialState = () => ({
  selectedCropId: DEFAULT_CROP_ID,
  activeStage: DEFAULT_STAGE_ID,
  cropOverrides: {}, // { [cropId]: { [stageId]: Partial<thresholds> } }
  customCrop: createCustomCrop(),
  settings: freshSettings(),
})

export const useSettingsStore = create(
  persist(
    (set) => ({
      ...initialState(),

      selectCrop: (cropId) => set({ selectedCropId: cropId }),
      setStage: (stageId) => set({ activeStage: stageId }),

      /** Save edited thresholds for one stage (or all stages) of a crop. */
      updateStageThresholds: (cropId, stageId, patch, { allStages = false } = {}) =>
        set((state) => {
          const stageIds = allStages ? GROWTH_STAGES.map((g) => g.id) : [stageId]
          if (cropId === CUSTOM_CROP_ID) {
            const stages = { ...state.customCrop.stages }
            stageIds.forEach((id) => (stages[id] = { ...stages[id], ...patch }))
            return { customCrop: { ...state.customCrop, stages } }
          }
          const crop = { ...(state.cropOverrides[cropId] || {}) }
          stageIds.forEach((id) => (crop[id] = { ...(crop[id] || {}), ...patch }))
          return { cropOverrides: { ...state.cropOverrides, [cropId]: crop } }
        }),

      updateCustomCrop: (patch) => set((state) => ({ customCrop: { ...state.customCrop, ...patch } })),

      resetCrop: (cropId) =>
        set((state) => {
          if (cropId === CUSTOM_CROP_ID) return { customCrop: createCustomCrop(state.customCrop.name) }
          const { [cropId]: _removed, ...rest } = state.cropOverrides
          return { cropOverrides: rest }
        }),

      updateSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),

      updateAlertThresholds: (patch) =>
        set((state) => ({
          settings: { ...state.settings, alertThresholds: { ...state.settings.alertThresholds, ...patch } },
        })),

      resetAll: () => set(initialState()),
    }),
    {
      name: 'hydrosync-settings',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        selectedCropId: s.selectedCropId,
        activeStage: s.activeStage,
        cropOverrides: s.cropOverrides,
        customCrop: s.customCrop,
        settings: s.settings,
      }),
      // Deep-merge settings so newly added defaults survive old saved data.
      merge: (persisted, current) => {
        const p = persisted || {}
        return {
          ...current,
          ...p,
          settings: {
            ...current.settings,
            ...(p.settings || {}),
            alertThresholds: { ...current.settings.alertThresholds, ...(p.settings?.alertThresholds || {}) },
          },
        }
      },
    },
  ),
)
