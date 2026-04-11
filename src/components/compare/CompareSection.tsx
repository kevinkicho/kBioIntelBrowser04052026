interface CompareSectionProps {
  title: string
  fullWidth?: boolean
  children: React.ReactNode
}

export function CompareSection({ title, fullWidth, children }: CompareSectionProps) {
  return (
    <div className="border-b border-slate-700 py-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">{title}</h3>
      {fullWidth ? (
        <div>{children}</div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {children}
        </div>
      )}
    </div>
  )
}
