/**
 * HydroSync crop profiles
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠  DEFAULT VALUES, EDITABLE, VERIFY WITH AGRONOMIC REFERENCES.
 *
 * These are placeholder thresholds to get the system running. They are NOT
 * agronomic recommendations. Calibrate against your capacitive soil-moisture
 * sensors, your soil type and local references (e.g. DA / PhilRice / UPLB
 * extension guides) before relying on them in the field. Every value can be
 * edited from the Crop Profiles page; edits are saved in localStorage.
 *
 * Units
 *   moistureMin / moistureMax   volumetric soil moisture, % (sensor-calibrated)
 *   ecMin / ecMax               electrical conductivity, mS/cm
 *                               (ppm = EC × 1000 × factor, factor 0.5 or 0.7)
 *   irrigationMin               max irrigation run time per cycle, minutes
 *   fertigationEveryDays        fertigation frequency, every N days
 *   rainThreshold               rain probability (%) at/above which irrigation is skipped
 */

export const DEFAULTS_DISCLAIMER =
  'Default values, editable. Verify with agronomic references before field use.'

export const GROWTH_STAGES = [
  { id: 'seedling', label: 'Seedling', emoji: '🌱' },
  { id: 'vegetative', label: 'Vegetative', emoji: '🌿' },
  { id: 'flowering', label: 'Flowering / Fruiting', emoji: '🌼' },
  { id: 'harvest', label: 'Harvest', emoji: '🧺' },
]

export const DEFAULT_RAIN_THRESHOLD = 80
export const DEFAULT_CROP_ID = 'chili'
export const DEFAULT_STAGE_ID = 'vegetative'
export const CUSTOM_CROP_ID = 'custom'

const r1 = (n) => Math.round(n * 10) / 10

/**
 * Derive the four growth-stage threshold sets from a crop's base range.
 * The base range (the values listed in the spec) is used as-is for the
 * Vegetative and Flowering/Fruiting stages. Seedlings get slightly wetter
 * soil and a weaker nutrient solution; the harvest stage is slightly drier
 * with reduced feeding. All placeholders, all editable.
 */
function buildStages({ moisture: [mMin, mMax], ec: [eMin, eMax], irrigationMin, fertigationEveryDays }) {
  const stage = (moistureShift, ecScale, irr, fertDays) => ({
    moistureMin: Math.min(95, mMin + moistureShift),
    moistureMax: Math.min(98, mMax + moistureShift),
    ecMin: r1(eMin * ecScale),
    ecMax: r1(eMax * ecScale),
    irrigationMin: irr,
    fertigationEveryDays: fertDays,
    rainThreshold: DEFAULT_RAIN_THRESHOLD,
  })
  return {
    seedling: stage(5, 0.6, Math.max(5, Math.round(irrigationMin * 0.5)), fertigationEveryDays + 3),
    vegetative: stage(0, 1, irrigationMin, fertigationEveryDays),
    flowering: stage(0, 1, Math.round(irrigationMin * 1.2), Math.max(3, fertigationEveryDays - 2)),
    harvest: stage(-5, 0.8, Math.round(irrigationMin * 0.8), fertigationEveryDays + 3),
  }
}

/* Base ranges. The first four come from the project spec; the rest are reasonable placeholders. */
const CROP_BASES = [
  {
    id: 'chili',
    name: 'Chili',
    localName: 'Siling labuyo',
    emoji: '🌶️',
    isThesisCrop: true,
    moisture: [50, 70],
    ec: [1.5, 2.5],
    irrigationMin: 15,
    fertigationEveryDays: 7,
    notes: 'Thesis test crop. Avoid waterlogging; consistent moisture during flowering reduces flower drop.',
  },
  {
    id: 'eggplant',
    name: 'Eggplant',
    localName: 'Talong',
    emoji: '🍆',
    moisture: [60, 80],
    ec: [1.8, 2.5],
    irrigationMin: 20,
    fertigationEveryDays: 7,
    notes: 'Heavy feeder during fruiting.',
  },
  {
    id: 'potato',
    name: 'Potato',
    localName: 'Patatas',
    emoji: '🥔',
    moisture: [65, 80],
    ec: [1.5, 2.0],
    irrigationMin: 20,
    fertigationEveryDays: 10,
    notes: 'Moisture-sensitive during tuber initiation.',
  },
  {
    id: 'okra',
    name: 'Okra',
    localName: 'Okra',
    emoji: '🌿',
    moisture: [50, 70],
    ec: [1.5, 2.5],
    irrigationMin: 15,
    fertigationEveryDays: 7,
    notes: 'Fairly drought tolerant once established.',
  },
  {
    id: 'tomato',
    name: 'Tomato',
    localName: 'Kamatis',
    emoji: '🍅',
    moisture: [60, 80],
    ec: [2.0, 3.5],
    irrigationMin: 20,
    fertigationEveryDays: 7,
    notes: 'Irregular watering can cause blossom-end rot and fruit cracking.',
  },
  {
    id: 'bell-pepper',
    name: 'Bell Pepper',
    localName: 'Bell pepper',
    emoji: '🫑',
    moisture: [60, 75],
    ec: [1.8, 2.8],
    irrigationMin: 15,
    fertigationEveryDays: 7,
    notes: 'Sensitive to both drought and waterlogging.',
  },
  {
    id: 'ampalaya',
    name: 'Ampalaya',
    localName: 'Bitter gourd',
    emoji: '🍈',
    moisture: [60, 80],
    ec: [1.5, 2.4],
    irrigationMin: 20,
    fertigationEveryDays: 7,
    notes: 'Vigorous vine; demand rises sharply at fruiting.',
  },
  {
    id: 'sitaw',
    name: 'String Beans',
    localName: 'Sitaw',
    emoji: '🫛',
    moisture: [55, 75],
    ec: [1.5, 2.5],
    irrigationMin: 15,
    fertigationEveryDays: 10,
    notes: 'Legume, so lower nitrogen demand. Keep moist at flowering and pod set.',
  },
  {
    id: 'cucumber',
    name: 'Cucumber',
    localName: 'Pipino',
    emoji: '🥒',
    moisture: [65, 85],
    ec: [1.7, 2.5],
    irrigationMin: 20,
    fertigationEveryDays: 7,
    notes: 'High water demand; shallow roots.',
  },
  {
    id: 'lettuce',
    name: 'Lettuce',
    localName: 'Litsugas',
    emoji: '🥬',
    moisture: [70, 85],
    ec: [0.8, 1.2],
    irrigationMin: 10,
    fertigationEveryDays: 7,
    notes: 'Low EC crop; high salinity causes tip burn.',
  },
]

export const CROPS = CROP_BASES.map(({ moisture, ec, irrigationMin, fertigationEveryDays, ...meta }) => ({
  ...meta,
  stages: buildStages({ moisture, ec, irrigationMin, fertigationEveryDays }),
}))

/** Factory for the user-defined "Custom crop". */
export function createCustomCrop(name = 'My crop') {
  return {
    id: CUSTOM_CROP_ID,
    name,
    localName: 'Custom profile',
    emoji: '🌱',
    isCustom: true,
    notes: 'User-defined thresholds.',
    stages: buildStages({ moisture: [55, 75], ec: [1.5, 2.5], irrigationMin: 15, fertigationEveryDays: 7 }),
  }
}

/** Field limits used by the threshold editor's validation. */
export const THRESHOLD_LIMITS = {
  moisture: { min: 0, max: 100, step: 1 },
  ec: { min: 0, max: 6, step: 0.1 },
  irrigationMin: { min: 1, max: 120, step: 1 },
  fertigationEveryDays: { min: 1, max: 60, step: 1 },
  rainThreshold: { min: 10, max: 100, step: 5 },
}
