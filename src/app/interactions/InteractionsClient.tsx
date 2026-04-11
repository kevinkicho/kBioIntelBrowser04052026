'use client'

import { useState, useEffect, useRef } from 'react'
import { clientFetch } from '@/lib/clientFetch'
import type { InteractionResult, InteractionCheckResponse } from '@/lib/api/rxnorm-interactions'

interface DrugEntry {
  id: number
  value: string
}

interface SuggestionMap {
  [id: number]: string[]
}

interface OpenMap {
  [id: number]: boolean
}

function getSeverityClasses(severity: string): string {
  const s = severity.toLowerCase()
  if (s === 'high') return 'bg-red-900/50 text-red-300 border border-red-800/50'
  if (s === 'n/a' || s === '') return 'bg-slate-700/50 text-slate-400 border border-slate-600/50'
  return 'bg-amber-900/50 text-amber-300 border border-amber-800/50'
}

let nextId = 3

export function InteractionsClient() {
  const [drugs, setDrugs] = useState<DrugEntry[]>([
    { id: 1, value: '' },
    { id: 2, value: '' },
  ])
  const [suggestions, setSuggestions] = useState<SuggestionMap>({})
  const [openDropdown, setOpenDropdown] = useState<OpenMap>({})
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<InteractionCheckResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const debounceRefs = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  const filledDrugs = drugs.filter((d) => d.value.trim().length > 0)
  const canCheck = filledDrugs.length >= 2

  function handleValueChange(id: number, value: string) {
    setDrugs((prev) => prev.map((d) => (d.id === id ? { ...d, value } : d)))

    clearTimeout(debounceRefs.current[id])
    if (value.length < 2) {
      setSuggestions((prev) => ({ ...prev, [id]: [] }))
      setOpenDropdown((prev) => ({ ...prev, [id]: false }))
      return
    }

    debounceRefs.current[id] = setTimeout(async () => {
      try {
        const res = await clientFetch(`/api/search?q=${encodeURIComponent(value)}`)
        if (res.ok) {
          const data = (await res.json()) as { suggestions?: string[] }
          setSuggestions((prev) => ({ ...prev, [id]: data.suggestions ?? [] }))
          setOpenDropdown((prev) => ({ ...prev, [id]: true }))
        }
      } catch {
        // ignore autocomplete errors
      }
    }, 300)
  }

  function handleSelect(id: number, name: string) {
    setDrugs((prev) => prev.map((d) => (d.id === id ? { ...d, value: name } : d)))
    setOpenDropdown((prev) => ({ ...prev, [id]: false }))
  }

  function addDrug() {
    if (drugs.length >= 8) return
    const id = nextId++
    setDrugs((prev) => [...prev, { id, value: '' }])
  }

  function removeDrug(id: number) {
    if (drugs.length <= 2) return
    setDrugs((prev) => prev.filter((d) => d.id !== id))
    setSuggestions((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  async function checkInteractions() {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await clientFetch('/api/interactions/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drugs: filledDrugs.map((d) => d.value.trim()) }),
      })

      if (!res.ok) {
        const errData = (await res.json()) as { error?: string }
        setError(errData.error ?? 'Failed to check interactions')
        return
      }

      const data = (await res.json()) as InteractionCheckResponse
      setResult(data)
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick() {
      setOpenDropdown({})
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  return (
    <main className="min-h-screen bg-[#0f1117] px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <a href="/" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
            ← Home
          </a>
          <h1 className="text-3xl font-bold text-slate-100 mt-4 mb-2">
            Drug Interaction Checker
          </h1>
          <p className="text-slate-400">
            Enter 2–8 drug names to check for known interactions via RxNorm.
          </p>
        </div>

        {/* Drug inputs */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
          <div className="space-y-3">
            {drugs.map((drug, idx) => (
              <div key={drug.id} className="flex gap-2 items-start">
                <div className="flex-1 relative">
                  <label className="block text-xs text-slate-400 mb-1">
                    Drug {idx + 1}
                  </label>
                  <input
                    type="text"
                    value={drug.value}
                    onChange={(e) => handleValueChange(drug.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="e.g. warfarin"
                    data-testid={`drug-input-${idx}`}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
                  />
                  {openDropdown[drug.id] && (suggestions[drug.id]?.length ?? 0) > 0 && (
                    <ul className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg overflow-hidden z-50 shadow-xl">
                      {suggestions[drug.id].map((s) => (
                        <li key={s}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSelect(drug.id, s)
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 transition-colors"
                          >
                            {s}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="pt-6">
                  <button
                    onClick={() => removeDrug(drug.id)}
                    disabled={drugs.length <= 2}
                    data-testid={`remove-drug-${idx}`}
                    className="text-slate-500 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-2 py-2 text-sm"
                    aria-label={`Remove drug ${idx + 1}`}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={addDrug}
              disabled={drugs.length >= 8}
              data-testid="add-drug-button"
              className="text-sm text-indigo-400 hover:text-indigo-300 bg-indigo-900/20 border border-indigo-800/40 px-3 py-1.5 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              + Add Drug
            </button>
          </div>
        </div>

        <button
          onClick={checkInteractions}
          disabled={!canCheck || loading}
          data-testid="check-button"
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors mb-8"
        >
          {loading ? 'Checking interactions…' : 'Check Interactions'}
        </button>

        {/* Error state */}
        {error && (
          <div className="bg-red-900/30 border border-red-800/50 rounded-xl p-4 mb-6 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div data-testid="results-section">
            {/* Warnings */}
            {result.warnings.length > 0 && (
              <div className="mb-4 space-y-2">
                {result.warnings.map((w, i) => (
                  <div
                    key={i}
                    className="bg-amber-900/20 border border-amber-800/40 rounded-lg px-4 py-2 text-amber-300 text-sm"
                  >
                    ⚠ {w}
                  </div>
                ))}
              </div>
            )}

            {/* No interactions */}
            {result.interactions.length === 0 && result.warnings.length < filledDrugs.length && (
              <div className="bg-green-900/20 border border-green-800/40 rounded-xl p-6 text-center">
                <p className="text-green-300 font-medium">No known interactions found between these drugs</p>
                <p className="text-slate-400 text-sm mt-1">
                  Always consult a healthcare professional before combining medications.
                </p>
              </div>
            )}

            {/* Interaction cards */}
            {result.interactions.length > 0 && (
              <div className="space-y-3">
                <p className="text-slate-400 text-sm">
                  {result.interactions.length} interaction{result.interactions.length !== 1 ? 's' : ''} found
                </p>
                {result.interactions.map((interaction: InteractionResult, i: number) => (
                  <div
                    key={i}
                    className="bg-slate-800/50 border border-slate-700 rounded-xl p-5"
                    data-testid="interaction-card"
                  >
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide ${getSeverityClasses(interaction.severity)}`}
                      >
                        {interaction.severity}
                      </span>
                      <span className="text-slate-100 font-medium">
                        {interaction.drugA} ↔ {interaction.drugB}
                      </span>
                    </div>
                    {interaction.description && (
                      <p className="text-slate-300 text-sm leading-relaxed mb-2">
                        {interaction.description}
                      </p>
                    )}
                    {interaction.source && (
                      <p className="text-slate-500 text-xs">Source: {interaction.source}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
