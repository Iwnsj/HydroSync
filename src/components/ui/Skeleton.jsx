/** Shimmering placeholder blocks. */
export function Skeleton({ className = '' }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-slate-200/70 dark:bg-slate-800 ${className}`} aria-hidden="true">
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/10" />
    </div>
  )
}

export function CardSkeleton({ className = '', lines = 2, tall = false }) {
  return (
    <div className={`card p-4 ${className}`} role="status" aria-label="Loading">
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-9 rounded-xl" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className={`mt-4 ${tall ? 'h-24' : 'h-8'} w-2/3`} />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className="mt-2 h-3 w-1/2" />
      ))}
    </div>
  )
}

export function ListSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-2" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  )
}
