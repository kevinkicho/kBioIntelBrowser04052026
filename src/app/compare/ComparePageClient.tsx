'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MoleculeSearch } from '@/components/compare/MoleculeSearch'
import { clientFetch } from '@/lib/clientFetch'

export interface CompareSelection {
  name: string
  cid: number
}

const MAX_SLOTS = 4
const MIN_SLOTS = 2
const SLOT_LABELS = ['Molecule A', 'Molecule B', 'Molecule C', 'Molecule D'] as const
const SLOT_ACCENTS = ['indigo', 'emerald', 'amber', 'violet'] as const

/** Parse a|b|c|d or cids=1,2,3 from URL. */
export function parseCompareCidParams(sp: {
  get: (k: string) => string | null
}): number[] {
  const cidsParam = sp.get('cids')
  if (cidsParam) {
    const parts = cidsParam
      .split(/[,+\s]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isInteger(n) && n > 0)
    return Array.from(new Set(parts)).slice(0, MAX_SLOTS)
  }
  const out: number[] = []
  for (const key of ['a', 'b', 'c', 'd'] as const) {
    const raw = sp.get(key)
    if (!raw) continue
    const n = parseInt(raw, 10)
    if (Number.isInteger(n) && n > 0 && !out.includes(n)) out.push(n)
  }
  return out.slice(0, MAX_SLOTS)
}

export function buildCompareHref(cids: number[]): string {
  const unique = Array.from(new Set(cids.filter((n) => n > 0))).slice(0, MAX_SLOTS)
  if (unique.length === 0) return '/compare'
  if (unique.length <= 2) {
    const q = new URLSearchParams()
    if (unique[0]) q.set('a', String(unique[0]))
    if (unique[1]) q.set('b', String(unique[1]))
    return `/compare?${q.toString()}`
  }
  return `/compare?cids=${unique.join(',')}`
}

export function ComparePageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const urlCids = useMemo(() => parseCompareCidParams(searchParams), [searchParams])

  /** Always at least 2 slots in the UI */
  const [slots, setSlots] = useState<(CompareSelection | null)[]>(() => [
    null,
    null,
  ])
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function resolve() {
      if (urlCids.length === 0) {
        setSlots((prev) => {
          // Keep user edits if navigating without params
          if (prev.some(Boolean)) return prev
          return [null, null]
        })
        setInitialized(true)
        return
      }
      const next: (CompareSelection | null)[] = []
      for (const cid of urlCids) {
        try {
          const res = await clientFetch(`/api/search/resolve?cid=${cid}`)
          if (res.ok) {
            const data = (await res.json()) as { name?: string }
            next.push({ name: data.name ?? `CID ${cid}`, cid })
          } else {
            next.push({ name: `CID ${cid}`, cid })
          }
        } catch {
          next.push({ name: `CID ${cid}`, cid })
        }
      }
      while (next.length < MIN_SLOTS) next.push(null)
      if (!cancelled) {
        setSlots(next.slice(0, MAX_SLOTS))
        setInitialized(true)
      }
    }
    void resolve()
    return () => {
      cancelled = true
    }
  }, [urlCids.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps -- intentional key

  const selected = slots.filter((s): s is CompareSelection => s != null)
  const selectedCids = selected.map((s) => s.cid)
  const readyToCompare = selected.length >= 2
  const matchesUrl =
    readyToCompare &&
    urlCids.length === selectedCids.length &&
    selectedCids.every((c, i) => c === urlCids[i])

  const setSlot = useCallback((index: number, sel: CompareSelection | null) => {
    setSlots((prev) => {
      const next = [...prev]
      next[index] = sel
      return next
    })
  }, [])

  function handleCompare() {
    if (!readyToCompare) return
    router.push(buildCompareHref(selectedCids))
  }

  function addSlot() {
    setSlots((prev) => {
      if (prev.length >= MAX_SLOTS) return prev
      return [...prev, null]
    })
  }

  function removeSlot(index: number) {
    setSlots((prev) => {
      if (prev.length <= MIN_SLOTS) {
        // Clear instead of remove when at minimum
        const next = [...prev]
        next[index] = null
        return next
      }
      return prev.filter((_, i) => i !== index)
    })
  }

  const gridCols =
    slots.length >= 4
      ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'
      : slots.length === 3
        ? 'grid-cols-1 sm:grid-cols-3'
        : 'grid-cols-1 sm:grid-cols-2'

  return (
    <div className="mb-4" data-testid="compare-picker">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Type 2+ characters for live molecule suggestions (PubChem / free APIs). Compare{' '}
            <strong className="font-medium text-slate-400">2–{MAX_SLOTS}</strong> molecules side by
            side.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {slots.length < MAX_SLOTS && (
            <button
              type="button"
              onClick={addSlot}
              className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-[11px] font-medium text-slate-300 hover:border-indigo-600 hover:text-indigo-200"
              data-testid="compare-add-slot"
            >
              + Add molecule
            </button>
          )}
          {readyToCompare && !matchesUrl && (
            <button
              type="button"
              onClick={handleCompare}
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-[12px] font-medium text-white hover:bg-indigo-500"
              data-testid="compare-run"
            >
              Compare {selected.length}
            </button>
          )}
        </div>
      </div>

      <div className={`grid ${gridCols} gap-3`}>
        {slots.map((sel, i) => (
          <div
            key={`slot-${i}`}
            className="relative min-w-0 rounded-xl border border-slate-800/80 bg-slate-900/40 p-3"
            data-testid={`compare-slot-${i}`}
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {SLOT_LABELS[i] ?? `Molecule ${i + 1}`}
              </span>
              {(slots.length > MIN_SLOTS || sel) && (
                <button
                  type="button"
                  onClick={() => removeSlot(i)}
                  className="text-[10px] text-slate-600 hover:text-rose-300"
                  data-testid={`compare-clear-${i}`}
                >
                  {slots.length > MIN_SLOTS && !sel ? 'Remove' : 'Clear'}
                </button>
              )}
            </div>
            <MoleculeSearch
              label=""
              initialName={initialized ? (sel?.name ?? '') : ''}
              accent={SLOT_ACCENTS[i % SLOT_ACCENTS.length]}
              testId={`molecule-search-${i}`}
              onSelect={(name, cid) => {
                // Avoid duplicate CIDs in other slots
                setSlots((prev) => {
                  const next = prev.map((s, j) =>
                    j !== i && s?.cid === cid ? null : j === i ? { name, cid } : s,
                  )
                  next[i] = { name, cid }
                  return next
                })
              }}
            />
            {sel && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full border border-indigo-800/40 bg-indigo-950/40 px-2 py-0.5 text-[11px] text-indigo-200">
                  {sel.name}
                </span>
                <span className="font-mono text-[10px] text-slate-500">CID {sel.cid}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {readyToCompare && matchesUrl && (
        <p className="mt-2 text-[11px] text-slate-500">
          Showing comparison of {selected.map((s) => s.name).join(' · ')}. Change a slot above to
          re-compare.
        </p>
      )}
      {!readyToCompare && (
        <p className="mt-2 text-[11px] text-slate-600">
          Select at least two molecules, then Compare.
        </p>
      )}
    </div>
  )
}
