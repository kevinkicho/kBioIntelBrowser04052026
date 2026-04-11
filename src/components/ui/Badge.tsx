import type { MoleculeClassification } from '@/lib/types'

const BADGE_STYLES: Record<MoleculeClassification, string> = {
  therapeutic: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  enzyme: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  reagent: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  industrial: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  diagnostic: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  metabolite: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  unknown: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
}

const LABELS: Record<MoleculeClassification, string> = {
  therapeutic: 'Therapeutic',
  enzyme: 'Enzyme',
  reagent: 'Reagent',
  industrial: 'Industrial',
  diagnostic: 'Diagnostic',
  metabolite: 'Metabolite',
  unknown: 'Unknown',
}

const VARIANT_STYLES = {
  default: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  secondary: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  outline: 'bg-transparent text-slate-300 border-slate-600',
  destructive: 'bg-red-500/20 text-red-300 border-red-500/30',
} as const

type BadgeVariant = keyof typeof VARIANT_STYLES

export function ClassificationBadge({ classification }: { classification: MoleculeClassification }) {
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border ${BADGE_STYLES[classification]}`}>
      {LABELS[classification]}
    </span>
  )
}

export function Badge({ variant = 'default', children, className = '' }: {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${VARIANT_STYLES[variant]} ${className}`}>
      {children}
    </span>
  )
}

export { ClassificationBadge as MoleculeBadge }