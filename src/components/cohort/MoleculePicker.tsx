'use client'

import { useState } from 'react'
import { MoleculeSearch } from '@/components/compare/MoleculeSearch'
import type { Molecule } from '@/lib/cohort/types'

interface MoleculePickerProps {
  molecules: Molecule[]
  maxMolecules: number
  minMolecules: number
  onAdd: (molecule: Molecule) => void
  onRemove: (cid: number) => void
  onClear: () => void
}

/**
 * Multi-select picker that wraps the existing single-molecule MoleculeSearch.
 * Shows the current cohort as removable chips above the search input.
 */
export function MoleculePicker({
  molecules,
  maxMolecules,
  minMolecules,
  onAdd,
  onRemove,
  onClear,
}: MoleculePickerProps) {
  // Use a key to remount MoleculeSearch after each add — this clears the input
  // so the user can immediately type the next molecule without re-clicking.
  const [searchKey, setSearchKey] = useState(0)
  const atLimit = molecules.length >= maxMolecules

  function handleSelect(name: string, cid: number) {
    if (atLimit) return
    if (molecules.some(m => m.cid === cid)) {
      // Already in the cohort; just reset the input so the user can pick again.
      setSearchKey(k => k + 1)
      return
    }
    onAdd({ name, cid })
    setSearchKey(k => k + 1)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-400">
          Cohort
          <span className={`ml-2 ${molecules.length >= minMolecules ? 'text-emerald-400' : 'text-amber-400'}`}>
            {molecules.length} / {maxMolecules}
          </span>
          {molecules.length < minMolecules && (
            <span className="ml-2 text-slate-500">
              add at least {minMolecules - molecules.length} more
            </span>
          )}
        </div>
        {molecules.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-slate-500 hover:text-red-400 transition-colors"
          >
            clear all
          </button>
        )}
      </div>

      {molecules.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {molecules.map(m => (
            <span
              key={m.cid}
              className="inline-flex items-center gap-1.5 text-xs text-indigo-200 bg-indigo-900/30 border border-indigo-800/40 px-2.5 py-1 rounded-full"
            >
              <span className="font-medium">{m.name}</span>
              <span className="text-indigo-400/70">CID {m.cid}</span>
              <button
                type="button"
                onClick={() => onRemove(m.cid)}
                className="ml-1 text-indigo-400/60 hover:text-red-300 transition-colors"
                aria-label={`Remove ${m.name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className={atLimit ? 'opacity-50 pointer-events-none' : ''}>
        <MoleculeSearch
          key={searchKey}
          label={atLimit ? `Reached limit of ${maxMolecules} molecules` : `Add molecule (${maxMolecules - molecules.length} remaining)`}
          initialName=""
          onSelect={handleSelect}
        />
      </div>
    </div>
  )
}
