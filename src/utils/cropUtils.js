import { CROPS, CUSTOM_CROP_ID, GROWTH_STAGES } from '../data/crops'

/** Merge a crop's default stages with the user's saved edits. */
export function resolveCrop(cropId, overrides = {}, customCrop) {
  if (cropId === CUSTOM_CROP_ID && customCrop) return customCrop
  const base = CROPS.find((c) => c.id === cropId) ?? CROPS[0]
  const ov = overrides[base.id]
  if (!ov) return base
  const stages = Object.fromEntries(
    Object.entries(base.stages).map(([stageId, values]) => [stageId, { ...values, ...(ov[stageId] || {}) }]),
  )
  return { ...base, stages, edited: true }
}

export function listCrops(overrides, customCrop) {
  return [...CROPS.map((c) => resolveCrop(c.id, overrides, customCrop)), customCrop]
}

export function stageMeta(stageId) {
  return GROWTH_STAGES.find((s) => s.id === stageId) ?? GROWTH_STAGES[1]
}
