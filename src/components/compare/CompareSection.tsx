interface CompareSectionProps {
  title: string
  fullWidth?: boolean
  /** Number of molecule columns (2–4). Default 2. */
  columns?: number
  children: React.ReactNode
}

export function CompareSection({
  title,
  fullWidth,
  columns = 2,
  children,
}: CompareSectionProps) {
  const cols = Math.min(4, Math.max(1, columns))
  const gridClass =
    cols >= 4
      ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3'
      : cols === 3
        ? 'grid grid-cols-1 sm:grid-cols-3 gap-3'
        : cols === 1
          ? 'grid grid-cols-1 gap-3'
          : 'grid grid-cols-1 sm:grid-cols-2 gap-3'

  return (
    <div className="border-b border-slate-800/80 py-3">
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </h3>
      {fullWidth ? <div>{children}</div> : <div className={gridClass}>{children}</div>}
    </div>
  )
}
