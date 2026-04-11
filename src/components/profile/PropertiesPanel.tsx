import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import type { ComputedProperties } from '@/lib/types'

interface Props {
  properties: ComputedProperties | null
  molecularWeight: number
  panelId?: string
  lastFetched?: Date
}

interface PropertyCardProps {
  label: string
  value: string | number
  violation?: boolean
}

function PropertyCard({ label, value, violation }: PropertyCardProps) {
  return (
    <div className={`bg-slate-800/50 border rounded-lg px-3 py-2 ${violation ? 'border-amber-700/40' : 'border-slate-700'}`}>
      <p className={`text-lg font-bold ${violation ? 'text-amber-300' : 'text-slate-100'}`}>{value}</p>
      <p className={`text-xs ${violation ? 'text-amber-400' : 'text-slate-500'}`}>{label}</p>
    </div>
  )
}

export const PropertiesPanel = memo(function PropertiesPanel({ properties, molecularWeight, panelId, lastFetched }: Props) {
  if (!properties) {
    return (
      <Panel title="Computed Properties (PubChem)" panelId={panelId} lastFetched={lastFetched}>
        <p className="text-slate-500 text-sm">No computed properties available.</p>
      </Panel>
    )
  }

  return (
    <Panel title="Computed Properties (PubChem)" panelId={panelId} lastFetched={lastFetched}>
      <div className="grid grid-cols-2 gap-2">
        <PropertyCard label="LogP" value={properties.xLogP ?? 'N/A'} violation={properties.xLogP !== null && properties.xLogP > 5} />
        <PropertyCard label="Polar Surface Area (Å²)" value={properties.tpsa ?? 'N/A'} />
        <PropertyCard label="H-Bond Donors" value={properties.hBondDonorCount} violation={properties.hBondDonorCount > 5} />
        <PropertyCard label="H-Bond Acceptors" value={properties.hBondAcceptorCount} violation={properties.hBondAcceptorCount > 10} />
        <PropertyCard label="Molecular Weight" value={molecularWeight.toFixed(2)} violation={molecularWeight > 500} />
        <PropertyCard label="Complexity" value={properties.complexity} />
        <PropertyCard label="Exact Mass" value={Number(properties.exactMass).toFixed(3)} />
        <PropertyCard label="Rotatable Bonds" value={properties.rotatableBondCount} />
      </div>
    </Panel>
  )
})
