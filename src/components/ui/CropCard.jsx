import { motion } from 'framer-motion'
import { CheckCircle2, Pencil, Plus } from 'lucide-react'
import { MOTION } from '../../config/motion'

/** Selectable crop card (aria-pressed toggle button). */
export default function CropCard({ crop, selected, onSelect, stageId = 'vegetative' }) {
  const t = crop.stages[stageId] ?? crop.stages.vegetative
  return (
    <button
      type="button"
      onClick={() => onSelect(crop.id)}
      aria-pressed={selected}
      aria-label={`${crop.name} (${crop.localName})${selected ? ', selected' : ''}`}
      className={`card card-hover group relative flex h-full w-full flex-col items-start gap-1 p-4 text-left transition-[transform,box-shadow,border-color] active:scale-[0.98] ${
        selected ? 'border-brand-500 ring-2 ring-brand-500 dark:border-brand-400 dark:ring-brand-400' : ''
      }`}
    >
      {selected && (
        <motion.span
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={MOTION.toggle}
          className="absolute right-3 top-3 text-brand-600 dark:text-brand-400"
        >
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
        </motion.span>
      )}
      <span className="text-4xl leading-none transition-transform duration-300 group-hover:scale-110" aria-hidden="true">
        {crop.emoji}
      </span>
      <span className="mt-2 font-semibold leading-tight">{crop.name}</span>
      <span className="text-xs text-slate-500 dark:text-slate-400">{crop.localName}</span>
      <span className="mt-2 text-xs text-slate-600 dark:text-slate-300">
        💧 {t.moistureMin}–{t.moistureMax}% · ⚡ {t.ecMin}–{t.ecMax} mS/cm
      </span>
      <span className="mt-2 flex flex-wrap gap-1">
        {crop.isThesisCrop && (
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
            Thesis test crop
          </span>
        )}
        {crop.edited && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
            <Pencil className="h-3 w-3" aria-hidden="true" /> Edited
          </span>
        )}
        {crop.isCustom && (
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
            <Plus className="h-3 w-3" aria-hidden="true" /> Custom
          </span>
        )}
      </span>
    </button>
  )
}
