import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Check,
  CloudRain,
  Clock,
  Droplets,
  RotateCcw,
  Save,
  Sprout,
  Zap,
} from 'lucide-react'
import AnimatedNumber from '../components/ui/AnimatedNumber'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import CropCard from '../components/ui/CropCard'
import PageHeader from '../components/ui/PageHeader'
import SegmentedControl from '../components/ui/SegmentedControl'
import { Badge } from '../components/ui/Badge'
import { Stagger, StaggerItem } from '../components/motion/Stagger'
import {
  CUSTOM_CROP_ID,
  DEFAULTS_DISCLAIMER,
  GROWTH_STAGES,
  THRESHOLD_LIMITS,
} from '../data/crops'
import { useActiveProfile } from '../hooks/useActiveProfile'
import { useSettingsStore } from '../store/settingsStore'
import { toast } from '../store/toastStore'
import { listCrops } from '../utils/cropUtils'
import { ecToPpm } from '../utils/format'

const CUSTOM_EMOJIS = ['🌱', '🌾', '🥬', '🍓', '🌽', '🧅', '🧄', '🥕', '🍉', '🫘']

export default function CropProfiles() {
  const { crop, stageId, stage, thresholds } = useActiveProfile()
  const overrides = useSettingsStore((s) => s.cropOverrides)
  const customCrop = useSettingsStore((s) => s.customCrop)
  const settings = useSettingsStore((s) => s.settings)
  const selectCrop = useSettingsStore((s) => s.selectCrop)
  const setStage = useSettingsStore((s) => s.setStage)
  const updateStageThresholds = useSettingsStore((s) => s.updateStageThresholds)
  const updateCustomCrop = useSettingsStore((s) => s.updateCustomCrop)
  const resetCrop = useSettingsStore((s) => s.resetCrop)
  const updateSettings = useSettingsStore((s) => s.updateSettings)

  const crops = listCrops(overrides, customCrop)

  const [draft, setDraft] = useState(thresholds)
  const [applyAllStages, setApplyAllStages] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    setDraft(thresholds)
  }, [crop.id, stageId, thresholds])

  const moistureInvalid = Number(draft.moistureMin) >= Number(draft.moistureMax)
  const ecInvalid = Number(draft.ecMin) >= Number(draft.ecMax)
  const hasErrors = moistureInvalid || ecInvalid

  const isDirty =
    Number(draft.moistureMin) !== thresholds.moistureMin ||
    Number(draft.moistureMax) !== thresholds.moistureMax ||
    Number(draft.ecMin) !== thresholds.ecMin ||
    Number(draft.ecMax) !== thresholds.ecMax ||
    Number(draft.irrigationMin) !== thresholds.irrigationMin ||
    Number(draft.fertigationEveryDays) !== thresholds.fertigationEveryDays ||
    Number(draft.rainThreshold) !== thresholds.rainThreshold

  function handleSelectCrop(id) {
    selectCrop(id)
    const picked = crops.find((c) => c.id === id)
    if (picked) {
      toast({
        title: `Switched crop to ${picked.name}`,
        description: 'Dashboard gauges, auto-mode rules and alerts updated.',
        tone: 'info',
      })
    }
  }

  function handleSave(e) {
    e.preventDefault()
    if (hasErrors) return
    const clean = {
      moistureMin: Number(draft.moistureMin),
      moistureMax: Number(draft.moistureMax),
      ecMin: Math.round(Number(draft.ecMin) * 100) / 100,
      ecMax: Math.round(Number(draft.ecMax) * 100) / 100,
      irrigationMin: Math.max(1, Math.round(Number(draft.irrigationMin))),
      fertigationEveryDays: Math.max(1, Math.round(Number(draft.fertigationEveryDays))),
      rainThreshold: Math.round(Number(draft.rainThreshold)),
    }
    updateStageThresholds(crop.id, stageId, clean, { allStages: applyAllStages })
    toast({
      title: 'Thresholds saved',
      description: applyAllStages
        ? `Updated all 4 growth stages for ${crop.name}.`
        : `Updated ${crop.name} (${stage.label}).`,
      tone: 'success',
    })
  }

  const factor = settings.ecFactor

  return (
    <div className="space-y-6">
      <PageHeader
        title="Crop Profiles"
        icon={Sprout}
        description="Choose what is planted and tune per-stage soil moisture, EC/TDS, irrigation duration, fertigation frequency and rain preemption thresholds."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              size="sm"
              label="Primary nutrient unit"
              value={settings.nutrientUnit}
              onChange={(v) => updateSettings({ nutrientUnit: v })}
              options={[
                { value: 'ec', label: 'EC (mS/cm)' },
                { value: 'ppm', label: 'TDS (ppm)' },
              ]}
            />
            <SegmentedControl
              size="sm"
              label="EC to ppm conversion factor"
              value={settings.ecFactor}
              onChange={(v) => updateSettings({ ecFactor: Number(v) })}
              options={[
                { value: 0.5, label: '×0.5 (500 scale)' },
                { value: 0.7, label: '×0.7 (700 scale)' },
              ]}
            />
          </div>
        }
      />

      {/* Agronomic disclaimer banner */}
      <div
        role="note"
        className="flex items-start gap-3 rounded-2xl border border-amber-300/80 bg-amber-50/90 p-4 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
      >
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        <div>
          <p className="font-bold">Default values, editable — verify with agronomic references</p>
          <p className="mt-0.5 text-xs text-amber-900/90 dark:text-amber-200/80">
            {DEFAULTS_DISCLAIMER} Selecting a crop or stage immediately updates all dashboard gauges, automatic ESP32 control rules, and alert triggers.
          </p>
        </div>
      </div>

      <Stagger className="space-y-6">
        {/* Crop selector grid */}
        <StaggerItem as="section" aria-labelledby="crop-grid-heading">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 id="crop-grid-heading" className="section-title">
              1. Select planted crop ({crops.length} profiles)
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Active: <strong>{crop.emoji} {crop.name}</strong> · {stage.label}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {crops.map((c) => (
              <CropCard key={c.id} crop={c} selected={c.id === crop.id} onSelect={handleSelectCrop} stageId={stageId} />
            ))}
          </div>
        </StaggerItem>

        {/* Growth stage selector + active summary */}
        <StaggerItem className="grid gap-4 lg:grid-cols-3">
          <section className="card p-5 lg:col-span-1" aria-labelledby="stage-heading">
            <h2 id="stage-heading" className="section-title">
              2. Growth stage
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Water and nutrient demand shifts as {crop.name} matures. Pick the current field stage:
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {GROWTH_STAGES.map((g) => {
                const active = g.id === stageId
                const st = crop.stages[g.id]
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setStage(g.id)}
                    aria-pressed={active}
                    className={`flex flex-col items-start rounded-2xl border p-3 text-left transition-all active:scale-[0.98] ${
                      active
                        ? 'border-brand-500 bg-brand-50/70 ring-2 ring-brand-500 dark:border-brand-400 dark:bg-brand-500/10'
                        : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="text-2xl" aria-hidden="true">
                      {g.emoji}
                    </span>
                    <span className="mt-1.5 text-sm font-semibold">{g.label}</span>
                    <span className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      {st.moistureMin}–{st.moistureMax}% · {st.ecMin}–{st.ecMax} mS/cm
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Custom crop identity editor */}
            {crop.id === CUSTOM_CROP_ID && (
              <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
                <h3 className="text-sm font-semibold">Custom crop identity</h3>
                <div className="mt-3 space-y-3">
                  <div>
                    <label htmlFor="custom-crop-name" className="label">
                      Crop name
                    </label>
                    <input
                      id="custom-crop-name"
                      type="text"
                      className="input"
                      maxLength={32}
                      value={customCrop.name}
                      onChange={(e) => updateCustomCrop({ name: e.target.value || 'My crop' })}
                    />
                  </div>
                  <div>
                    <span className="label">Icon</span>
                    <div className="flex flex-wrap gap-1.5">
                      {CUSTOM_EMOJIS.map((em) => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => updateCustomCrop({ emoji: em })}
                          aria-label={`Choose icon ${em}`}
                          aria-pressed={customCrop.emoji === em}
                          className={`grid h-10 w-10 place-items-center rounded-xl border text-xl ${
                            customCrop.emoji === em
                              ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500 dark:bg-brand-500/20'
                              : 'border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Live converted summary */}
            <div className="mt-5 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Active targets ({stage.label})
                </span>
                {crop.edited && <Badge tone="warn">Edited</Badge>}
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">Soil moisture</dt>
                  <dd className="font-bold">
                    <AnimatedNumber value={thresholds.moistureMin} />–<AnimatedNumber value={thresholds.moistureMax} suffix="%" />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">EC target</dt>
                  <dd className="font-bold">
                    <AnimatedNumber value={thresholds.ecMin} decimals={1} />–<AnimatedNumber value={thresholds.ecMax} decimals={1} suffix=" mS/cm" />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">TDS (×{factor})</dt>
                  <dd className="font-bold text-brand-700 dark:text-brand-300">
                    <AnimatedNumber value={ecToPpm(thresholds.ecMin, factor)} />–
                    <AnimatedNumber value={ecToPpm(thresholds.ecMax, factor)} suffix=" ppm" />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">Rain preemption</dt>
                  <dd className="font-bold">
                    ≥ <AnimatedNumber value={thresholds.rainThreshold} suffix="%" />
                  </dd>
                </div>
              </dl>
              {crop.notes && <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{crop.notes}</p>}
            </div>
          </section>

          {/* Threshold editor form */}
          <form onSubmit={handleSave} className="card flex flex-col justify-between p-5 lg:col-span-2" noValidate>
            <div>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="section-title">
                    3. Edit thresholds · {crop.emoji} {crop.name} ({stage.label})
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Default values, editable, verify with agronomic references. Saved in your browser&apos;s localStorage.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="btn-secondary min-h-[38px] px-3 text-xs"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Reset {crop.name} defaults
                </button>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {/* Soil moisture min / max */}
                <fieldset className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <legend className="flex items-center gap-1.5 px-1 text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                    <Droplets className="h-4 w-4" aria-hidden="true" /> Soil moisture (%)
                  </legend>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="m-min" className="label">
                        Minimum (%)
                      </label>
                      <input
                        id="m-min"
                        type="number"
                        className={`input tabular ${moistureInvalid ? 'input-error' : ''}`}
                        min={THRESHOLD_LIMITS.moisture.min}
                        max={THRESHOLD_LIMITS.moisture.max}
                        step={THRESHOLD_LIMITS.moisture.step}
                        value={draft.moistureMin}
                        onChange={(e) => setDraft({ ...draft, moistureMin: e.target.value })}
                      />
                    </div>
                    <div>
                      <label htmlFor="m-max" className="label">
                        Maximum (%)
                      </label>
                      <input
                        id="m-max"
                        type="number"
                        className={`input tabular ${moistureInvalid ? 'input-error' : ''}`}
                        min={THRESHOLD_LIMITS.moisture.min}
                        max={THRESHOLD_LIMITS.moisture.max}
                        step={THRESHOLD_LIMITS.moisture.step}
                        value={draft.moistureMax}
                        onChange={(e) => setDraft({ ...draft, moistureMax: e.target.value })}
                      />
                    </div>
                  </div>
                  {moistureInvalid ? (
                    <p className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-400">
                      Minimum moisture must be less than maximum moisture.
                    </p>
                  ) : (
                    <p className="hint">
                      Opens valve below {draft.moistureMin}%; closes at { Math.round(Number(draft.moistureMin) + (Number(draft.moistureMax) - Number(draft.moistureMin)) * 0.75) }%.
                    </p>
                  )}
                </fieldset>

                {/* EC / TDS target */}
                <fieldset className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <legend className="flex items-center gap-1.5 px-1 text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                    <Zap className="h-4 w-4" aria-hidden="true" /> EC / TDS target
                  </legend>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="ec-min" className="label">
                        Min EC (mS/cm)
                      </label>
                      <input
                        id="ec-min"
                        type="number"
                        className={`input tabular ${ecInvalid ? 'input-error' : ''}`}
                        min={THRESHOLD_LIMITS.ec.min}
                        max={THRESHOLD_LIMITS.ec.max}
                        step={THRESHOLD_LIMITS.ec.step}
                        value={draft.ecMin}
                        onChange={(e) => setDraft({ ...draft, ecMin: e.target.value })}
                      />
                      <p className="hint">≈ {Math.round(ecToPpm(Number(draft.ecMin) || 0, factor))} ppm</p>
                    </div>
                    <div>
                      <label htmlFor="ec-max" className="label">
                        Max EC (mS/cm)
                      </label>
                      <input
                        id="ec-max"
                        type="number"
                        className={`input tabular ${ecInvalid ? 'input-error' : ''}`}
                        min={THRESHOLD_LIMITS.ec.min}
                        max={THRESHOLD_LIMITS.ec.max}
                        step={THRESHOLD_LIMITS.ec.step}
                        value={draft.ecMax}
                        onChange={(e) => setDraft({ ...draft, ecMax: e.target.value })}
                      />
                      <p className="hint">≈ {Math.round(ecToPpm(Number(draft.ecMax) || 0, factor))} ppm</p>
                    </div>
                  </div>
                  {ecInvalid && (
                    <p className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-400">
                      Minimum EC must be less than maximum EC.
                    </p>
                  )}
                </fieldset>

                {/* Irrigation duration & Fertigation frequency */}
                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <label htmlFor="irr-dur" className="label flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-sky-500" aria-hidden="true" /> Max irrigation duration (minutes)
                  </label>
                  <input
                    id="irr-dur"
                    type="number"
                    className="input tabular"
                    min={THRESHOLD_LIMITS.irrigationMin.min}
                    max={THRESHOLD_LIMITS.irrigationMin.max}
                    value={draft.irrigationMin}
                    onChange={(e) => setDraft({ ...draft, irrigationMin: e.target.value })}
                  />
                  <p className="hint">Safety cutoff per watering cycle even if moisture sensors lag.</p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <label htmlFor="fert-freq" className="label flex items-center gap-1.5">
                    <Sprout className="h-4 w-4 text-fuchsia-500" aria-hidden="true" /> Fertigation frequency (every N days)
                  </label>
                  <input
                    id="fert-freq"
                    type="number"
                    className="input tabular"
                    min={THRESHOLD_LIMITS.fertigationEveryDays.min}
                    max={THRESHOLD_LIMITS.fertigationEveryDays.max}
                    value={draft.fertigationEveryDays}
                    onChange={(e) => setDraft({ ...draft, fertigationEveryDays: e.target.value })}
                  />
                  <p className="hint">Recommended interval between Tank F nutrient doses for this stage.</p>
                </div>

                {/* Rain preemption threshold */}
                <div className="rounded-2xl border border-slate-200 p-4 sm:col-span-2 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label htmlFor="rain-th" className="label mb-0 flex items-center gap-1.5">
                      <CloudRain className="h-4 w-4 text-sky-500" aria-hidden="true" /> Rain-preemption threshold (%)
                    </label>
                    <span className="tabular text-sm font-bold text-sky-700 dark:text-sky-300">{draft.rainThreshold}%</span>
                  </div>
                  <input
                    id="rain-th"
                    type="range"
                    min={THRESHOLD_LIMITS.rainThreshold.min}
                    max={THRESHOLD_LIMITS.rainThreshold.max}
                    step={THRESHOLD_LIMITS.rainThreshold.step}
                    value={draft.rainThreshold}
                    onChange={(e) => setDraft({ ...draft, rainThreshold: Number(e.target.value) })}
                    className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-sky-600 dark:bg-slate-800"
                  />
                  <p className="hint">
                    Default 80%. When OpenWeatherMap forecast rain probability ≥ {draft.rainThreshold}%, scheduled irrigation is skipped.
                  </p>
                </div>
              </div>

              {/* All-stages overview table */}
              <div className="mt-5">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  All growth stages for {crop.name}
                </h3>
                <div className="mt-2 overflow-x-auto">
                  <table className="table-base">
                    <thead>
                      <tr>
                        <th scope="col">Stage</th>
                        <th scope="col">Soil moisture</th>
                        <th scope="col">EC (mS/cm)</th>
                        <th scope="col">TDS (×{factor})</th>
                        <th scope="col">Max duration</th>
                        <th scope="col">Fertigation</th>
                        <th scope="col">Rain skip</th>
                      </tr>
                    </thead>
                    <tbody>
                      {GROWTH_STAGES.map((g) => {
                        const s = crop.stages[g.id]
                        const active = g.id === stageId
                        return (
                          <tr
                            key={g.id}
                            onClick={() => setStage(g.id)}
                            className={`cursor-pointer ${
                              active ? 'bg-brand-50/70 font-semibold dark:bg-brand-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            <td className="whitespace-nowrap">
                              {g.emoji} {g.label} {active && <span className="ml-1 text-xs text-brand-600 dark:text-brand-400">(active)</span>}
                            </td>
                            <td className="tabular">{s.moistureMin}–{s.moistureMax}%</td>
                            <td className="tabular">{s.ecMin.toFixed(1)}–{s.ecMax.toFixed(1)}</td>
                            <td className="tabular">{Math.round(ecToPpm(s.ecMin, factor))}–{Math.round(ecToPpm(s.ecMax, factor))} ppm</td>
                            <td className="tabular">{s.irrigationMin} min</td>
                            <td className="tabular">Every {s.fertigationEveryDays} d</td>
                            <td className="tabular">≥ {s.rainThreshold}%</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={applyAllStages}
                  onChange={(e) => setApplyAllStages(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                Apply these values to all 4 growth stages of {crop.name}
              </label>
              <div className="flex items-center gap-2">
                {!isDirty && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" /> Up to date
                  </span>
                )}
                <button type="submit" disabled={hasErrors || (!isDirty && !applyAllStages)} className="btn-primary">
                  <Save className="h-4 w-4" aria-hidden="true" /> Save thresholds
                </button>
              </div>
            </div>
          </form>
        </StaggerItem>
      </Stagger>

      <ConfirmDialog
        open={confirmReset}
        title={`Reset ${crop.name} to default thresholds?`}
        description="Your custom edits for all stages of this crop will be discarded and restored to the default placeholder values."
        confirmLabel="Reset crop"
        tone="danger"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          resetCrop(crop.id)
          setConfirmReset(false)
          toast({ title: `${crop.name} reset to defaults`, tone: 'info' })
        }}
      />
    </div>
  )
}
