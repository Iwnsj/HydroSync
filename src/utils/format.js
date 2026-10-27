/** Number, unit and time formatting helpers. */

export const LITERS_TO_GAL = 0.264172

export function fmtNum(v, decimals = 0) {
  if (v == null || Number.isNaN(v)) return '—'
  return Number(v).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

/* ── Nutrients ─────────────────────────────────────────────────────────── */

/** EC (mS/cm) → TDS (ppm) using the selected conversion factor (0.5 or 0.7). */
export const ecToPpm = (ec, factor = 0.5) => (ec == null ? null : ec * 1000 * factor)
export const ppmToEc = (ppm, factor = 0.5) => (ppm == null ? null : ppm / (1000 * factor))

/** Convert an EC value into the user's primary nutrient display unit. */
export function toNutrientUnit(ec, { nutrientUnit, ecFactor }) {
  if (ec == null) return null
  return nutrientUnit === 'ppm' ? Math.round(ecToPpm(ec, ecFactor)) : ec
}

export function nutrientMeta({ nutrientUnit, ecFactor }) {
  return nutrientUnit === 'ppm'
    ? { label: 'TDS', unit: 'ppm', suffix: ' ppm', decimals: 0, factor: ecFactor }
    : { label: 'EC', unit: 'mS/cm', suffix: ' mS/cm', decimals: 2, factor: ecFactor }
}

/** Secondary label: the "other" unit, e.g. "≈ 930 ppm (×0.5)" or "1.86 mS/cm". */
export function nutrientSecondary(ec, { nutrientUnit, ecFactor }) {
  if (ec == null) return ''
  return nutrientUnit === 'ppm'
    ? `${ec.toFixed(2)} mS/cm EC`
    : `≈ ${fmtNum(ecToPpm(ec, ecFactor))} ppm TDS (×${ecFactor})`
}

/* ── Temperature & volume ─────────────────────────────────────────────── */

export const cToF = (c) => (c * 9) / 5 + 32
export const toTemp = (c, unit) => (c == null ? null : unit === 'F' ? cToF(c) : c)
export const toVolume = (liters, unit) => (liters == null ? null : unit === 'gal' ? liters * LITERS_TO_GAL : liters)
export const volumeSuffix = (unit) => (unit === 'gal' ? ' gal' : ' L')

/* ── Time ──────────────────────────────────────────────────────────────── */

export const timeFmt = (ts) =>
  new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

export const shortTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

export const dateTimeFmt = (ts) =>
  new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

export const dateFmt = (ts) => new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' })

export const hourFmt = (ts) => new Date(ts).toLocaleTimeString([], { hour: 'numeric' })

export function relativeTime(ts, now = Date.now()) {
  if (!ts) return '—'
  const s = Math.max(0, Math.round((now - ts) / 1000))
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.floor(h / 24)
  return `${d} d ago`
}

export function formatDuration(sec) {
  if (sec == null) return '—'
  const s = Math.round(sec)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  if (h) return `${h}h ${m}m`
  if (m) return `${m}m ${String(r).padStart(2, '0')}s`
  return `${r}s`
}

export function countdown(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function greeting(date = new Date()) {
  const h = date.getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

/** yyyy-mm-dd for <input type="date"> in local time. */
export function toDateInput(ts) {
  const d = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
