import { AlertCircle, Inbox, RefreshCw } from 'lucide-react'

export function EmptyState({ icon: Icon = Inbox, title = 'Nothing here yet', description, action, compact = false }) {
  return (
    <div className={`flex h-full flex-col items-center justify-center text-center ${compact ? 'py-6' : 'py-10'}`}>
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="mt-3 font-semibold text-slate-700 dark:text-slate-200">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({ title = 'Could not load data', message, onRetry, compact = false }) {
  return (
    <div role="alert" className={`flex h-full flex-col items-center justify-center text-center ${compact ? 'py-6' : 'py-10'}`}>
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-500 dark:bg-rose-500/10 dark:text-rose-400">
        <AlertCircle className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="mt-3 font-semibold text-slate-800 dark:text-slate-100">{title}</p>
      {message && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{message}</p>}
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary mt-4">
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again
        </button>
      )}
    </div>
  )
}
