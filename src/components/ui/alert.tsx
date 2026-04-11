export function Alert({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`border border-slate-700 rounded-lg p-4 bg-slate-800/50 text-slate-300 ${className}`}>
      {children}
    </div>
  )
}

export function AlertTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h5 className={`font-medium text-sm mb-1 ${className}`}>
      {children}
    </h5>
  )
}

export function AlertDescription({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`text-xs text-slate-400 ${className}`}>
      {children}
    </div>
  )
}