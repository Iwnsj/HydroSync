import { Loader2 } from 'lucide-react'

/** Accessible on/off switch with a sliding knob. */
export default function Toggle({ checked, onChange, disabled = false, pending = false, label, className = '' }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-busy={pending || undefined}
      disabled={disabled || pending}
      onClick={() => onChange?.(!checked)}
      className={`relative inline-flex h-10 w-[4.5rem] shrink-0 items-center rounded-full p-1 transition-[background-color,transform,opacity] duration-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${
        checked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
      } ${className}`}
    >
      <span className="sr-only">{checked ? 'On' : 'Off'}</span>
      <span aria-hidden="true" className={`absolute text-[10px] font-bold uppercase tracking-wide ${checked ? 'left-2.5 text-white' : 'right-2 text-slate-600 dark:text-slate-300'}`}>
        {checked ? 'On' : 'Off'}
      </span>
      <span
        className={`relative z-10 grid h-8 w-8 place-items-center rounded-full bg-white shadow-md transition-transform duration-300 ease-out ${
          checked ? 'translate-x-8' : 'translate-x-0'
        }`}
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin text-slate-500" aria-hidden="true" />}
      </span>
    </button>
  )
}
