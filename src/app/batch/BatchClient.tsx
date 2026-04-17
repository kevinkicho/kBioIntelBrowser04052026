'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { MoleculeSearch } from '@/components/compare/MoleculeSearch'
import { clientFetch } from '@/lib/clientFetch'
import type { BatchMoleculeResult } from '../api/batch/route'

interface MoleculeSlot {
  id: number
  name: string
  cid: number | null
}

function createSlot(id: number): MoleculeSlot {
  return { id, name: '', cid: null }
}

function makeInitialState(): { slots: MoleculeSlot[]; nextId: number } {
  return {
    slots: [createSlot(1), createSlot(2), createSlot(3)],
    nextId: 4,
  }
}

interface PropertyRow {
  label: string
  key: keyof BatchMoleculeResult | 'xLogP' | 'tpsa' | 'hBondDonorCount' | 'hBondAcceptorCount' | 'rotatableBondCount' | 'complexity'
  format?: (v: number | null) => string
  higherIsBetter?: boolean | null // true = higher is better, false = lower is better, null = neutral
}

const PROPERTY_ROWS: PropertyRow[] = [
  { label: 'Formula', key: 'formula', higherIsBetter: null },
  { label: 'Mol. Weight (g/mol)', key: 'molecularWeight', format: (v) => v != null ? v.toFixed(2) : '—', higherIsBetter: null },
  { label: 'Classification', key: 'classification', higherIsBetter: null },
  { label: 'XLogP', key: 'xLogP', format: (v) => v != null ? v.toFixed(2) : '—', higherIsBetter: null },
  { label: 'H-Bond Donors', key: 'hBondDonorCount', format: (v) => v != null ? String(v) : '—', higherIsBetter: false },
  { label: 'H-Bond Acceptors', key: 'hBondAcceptorCount', format: (v) => v != null ? String(v) : '—', higherIsBetter: false },
  { label: 'Rotatable Bonds', key: 'rotatableBondCount', format: (v) => v != null ? String(v) : '—', higherIsBetter: false },
  { label: 'TPSA (Å²)', key: 'tpsa', format: (v) => v != null ? v.toFixed(2) : '—', higherIsBetter: false },
  { label: 'Complexity', key: 'complexity', format: (v) => v != null ? String(v) : '—', higherIsBetter: false },
]

function getCellValue(mol: BatchMoleculeResult, key: PropertyRow['key']): string | number | null {
  if (key === 'formula') return mol.formula
  if (key === 'molecularWeight') return mol.molecularWeight
  if (key === 'classification') return mol.classification
  if (key === 'xLogP') return mol.properties?.xLogP ?? null
  if (key === 'tpsa') return mol.properties?.tpsa ?? null
  if (key === 'hBondDonorCount') return mol.properties?.hBondDonorCount ?? null
  if (key === 'hBondAcceptorCount') return mol.properties?.hBondAcceptorCount ?? null
  if (key === 'rotatableBondCount') return mol.properties?.rotatableBondCount ?? null
  if (key === 'complexity') return mol.properties?.complexity ?? null
  return null
}

function getHighlightClass(
  value: number | string | null,
  allValues: (number | string | null)[],
  higherIsBetter: boolean | null
): string {
  if (higherIsBetter === null || typeof value !== 'number') return ''
  const numericValues = allValues.filter((v): v is number => typeof v === 'number')
  if (numericValues.length < 2) return ''
  const max = Math.max(...numericValues)
  const min = Math.min(...numericValues)
  if (max === min) return ''

  const isBest = higherIsBetter ? value === max : value === min
  const isWorst = higherIsBetter ? value === min : value === max

  if (isBest) return 'bg-emerald-900/30 text-emerald-300'
  if (isWorst) return 'bg-red-900/20 text-red-400'
  return ''
}

function SkeletonTable({ colCount }: { colCount: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead>
          <tr>
            <th className="w-44 min-w-[11rem]" />
            {Array.from({ length: colCount }).map((_, i) => (
              <th key={i} className="px-4 py-3 text-center min-w-[10rem]">
                <div className="h-4 bg-slate-700 rounded animate-pulse w-24 mx-auto" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 10 }).map((_, r) => (
            <tr key={r} className="border-t border-slate-700">
              <td className="py-3 pr-4">
                <div className="h-3 bg-slate-700 rounded animate-pulse w-28" />
              </td>
              {Array.from({ length: colCount }).map((_, c) => (
                <td key={c} className="px-4 py-3 text-center">
                  <div className="h-3 bg-slate-700 rounded animate-pulse w-16 mx-auto" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function BatchClient() {
  const [slotsState, setSlotsState] = useState(makeInitialState)
  const { slots } = slotsState
  const [results, setResults] = useState<BatchMoleculeResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleSelect(slotId: number, name: string, cid: number) {
    setSlotsState(prev => ({
      ...prev,
      slots: prev.slots.map(s => (s.id === slotId ? { ...s, name, cid } : s)),
    }))
  }

  function addSlot() {
    if (slots.length >= 10) return
    setSlotsState(prev => ({
      slots: [...prev.slots, createSlot(prev.nextId)],
      nextId: prev.nextId + 1,
    }))
  }

  function removeSlot(slotId: number) {
    if (slots.length <= 2) return
    setSlotsState(prev => ({
      ...prev,
      slots: prev.slots.filter(s => s.id !== slotId),
    }))
  }

  const resolvedSlots = slots.filter(s => s.cid !== null)
  const canCompare = resolvedSlots.length >= 2

  async function handleCompare() {
    if (!canCompare) return
    setLoading(true)
    setError(null)
    setResults([])

    try {
      const cids = resolvedSlots.map(s => s.cid as number)
      const res = await clientFetch('/api/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cids }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? 'Failed to fetch data')
      }

      const data = await res.json() as { molecules: BatchMoleculeResult[] }
      setResults(data.molecules)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#0f1117] px-4 py-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-sm text-indigo-400 hover:text-indigo-300 mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Batch Molecule Lookup</h1>
          <p className="text-slate-400 mt-2">
            Add 2–10 molecules to compare their key physicochemical properties side by side.
          </p>
        </div>

        {/* Input Area */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-8">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
            Select Molecules
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {slots.map((slot, idx) => (
              <div key={slot.id} className="flex flex-col gap-1">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <MoleculeSearch
                      label={`Molecule ${idx + 1}`}
                      initialName={slot.name}
                      onSelect={(name, cid) => handleSelect(slot.id, name, cid)}
                    />
                  </div>
                  {slots.length > 2 && (
                    <button
                      onClick={() => removeSlot(slot.id)}
                      className="mb-0.5 px-2 py-2 text-xs text-slate-400 hover:text-red-400 bg-slate-700 hover:bg-slate-600 rounded-lg border border-slate-600 transition-colors"
                      aria-label={`Remove molecule ${idx + 1}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
                {slot.cid !== null && (
                  <p className="text-xs text-emerald-400 pl-1">
                    ✓ {slot.name} <span className="text-slate-500">CID {slot.cid}</span>
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {slots.length < 10 && (
              <button
                onClick={addSlot}
                className="px-4 py-2 text-sm text-slate-300 hover:text-slate-100 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg transition-colors"
              >
                + Add Molecule
              </button>
            )}
            <button
              onClick={handleCompare}
              disabled={!canCompare || loading}
              className="px-6 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {loading ? 'Loading…' : 'Compare'}
            </button>
            {!canCompare && (
              <p className="text-xs text-slate-500">Resolve at least 2 molecules to compare</p>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/20 border border-red-800/40 text-red-400 rounded-lg px-4 py-3 mb-6 text-sm">
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <SkeletonTable colCount={resolvedSlots.length} />
          </div>
        )}

        {/* Results Table */}
        {!loading && results.length > 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
              Comparison Results
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-600">
                    <th className="text-left py-3 pr-6 text-slate-400 font-medium w-44 min-w-[11rem]">
                      Property
                    </th>
                    {results.map(mol => (
                      <th key={mol.cid} className="px-4 py-3 text-center min-w-[10rem]">
                        <Link
                          href={`/molecule/${mol.cid}`}
                          className="text-indigo-300 hover:text-indigo-200 font-semibold transition-colors"
                        >
                          {mol.name}
                        </Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Structure row */}
                  <tr className="border-t border-slate-700">
                    <td className="py-4 pr-6 text-slate-400 font-medium">Structure</td>
                    {results.map(mol => (
                      <td key={mol.cid} className="px-4 py-4 text-center">
                        {mol.structureImageUrl ? (
                          <div className="inline-block rounded-lg overflow-hidden bg-white p-1">
                            <Image
                              src={mol.structureImageUrl}
                              alt={`${mol.name} structure`}
                              width={80}
                              height={80}
                              unoptimized
                              className="block"
                            />
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Property rows */}
                  {PROPERTY_ROWS.map(row => {
                    const allValues = results.map(mol => getCellValue(mol, row.key))
                    return (
                      <tr key={row.label} className="border-t border-slate-700 hover:bg-slate-700/30 transition-colors">
                        <td className="py-3 pr-6 text-slate-400 font-medium">{row.label}</td>
                        {results.map(mol => {
                          const rawValue = getCellValue(mol, row.key)
                          const displayValue = row.format && typeof rawValue === 'number'
                            ? row.format(rawValue)
                            : rawValue != null
                              ? String(rawValue)
                              : '—'
                          const highlight = typeof rawValue === 'number'
                            ? getHighlightClass(rawValue, allValues, row.higherIsBetter ?? null)
                            : ''
                          return (
                            <td
                              key={mol.cid}
                              className={`px-4 py-3 text-center rounded ${highlight || 'text-slate-200'}`}
                            >
                              {displayValue}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="mt-4 flex gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-900/50 inline-block border border-emerald-700/40" />
                Best value (Lipinski)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-red-900/30 inline-block border border-red-800/30" />
                Highest concern
              </span>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
