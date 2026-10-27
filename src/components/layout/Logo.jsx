/** HydroSync droplet logo + wordmark. */
export default function Logo({ compact = false }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg viewBox="0 0 64 64" className="h-9 w-9 shrink-0" aria-hidden="true">
        <defs>
          <linearGradient id="hs-logo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1de4bf" />
            <stop offset="1" stopColor="#058070" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="16" fill="#0d534b" />
        <path d="M32 10c8 10 16 19 16 28a16 16 0 0 1-32 0c0-9 8-18 16-28z" fill="url(#hs-logo)" />
        <path d="M25 40c2 4 5 6 9 6" stroke="#effefa" strokeWidth="3" strokeLinecap="round" fill="none" />
      </svg>
      {!compact && (
        <span className="leading-tight">
          <span className="block text-lg font-extrabold tracking-tight">
            Hydro<span className="text-brand-600 dark:text-brand-400">Sync</span>
          </span>
          <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">Drip irrigation · Fertigation</span>
        </span>
      )}
    </span>
  )
}
