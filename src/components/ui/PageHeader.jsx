/** Page title + description + actions row. */
export default function PageHeader({ title, description, icon: Icon, actions, children }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight sm:text-3xl">
          {Icon && (
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
          )}
          {title}
        </h1>
        {description && <p className="mt-1.5 max-w-2xl text-slate-600 dark:text-slate-400">{description}</p>}
        {children}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
