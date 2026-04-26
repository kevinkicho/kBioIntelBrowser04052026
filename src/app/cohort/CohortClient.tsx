'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import Link from 'next/link'
import { MoleculePicker } from '@/components/cohort/MoleculePicker'
import { MatrixView } from '@/components/cohort/MatrixView'
import { fetchCategoryData, type CategoryLoadState } from '@/lib/fetchCategory'
import { COHORT_ATTRIBUTES, requiredCategories } from '@/lib/cohort/attributes'
import { buildMatrix } from '@/lib/cohort/buildMatrix'
import { exportCohortToCsv, exportCohortToJson } from '@/lib/cohort/csv'
import {
  listSavedCohorts,
  saveCohort,
  deleteCohort,
} from '@/lib/cohort/savedCohorts'
import type { Molecule, SavedCohort } from '@/lib/cohort/types'
import type { CategoryId } from '@/lib/categoryConfig'
import { downloadFile } from '@/lib/exportData'

const MIN_MOLECULES = 2
const MAX_MOLECULES = 10
const MOBILE_BREAKPOINT = 768
const FETCH_CONCURRENCY = 4

type StatusByCid = Record<number, Partial<Record<CategoryId, CategoryLoadState>>>
type DataByCid = Record<number, Record<string, unknown> | undefined>

const REQUIRED_CATEGORIES = requiredCategories(COHORT_ATTRIBUTES)

export function CohortClient() {
  const [molecules, setMolecules] = useState<Molecule[]>([])
  const [statusByCid, setStatusByCid] = useState<StatusByCid>({})
  const [dataByCid, setDataByCid] = useState<DataByCid>({})
  const [sortBy, setSortBy] = useState<'variance' | 'category'>('category')
  const [saved, setSaved] = useState<SavedCohort[]>([])
  const [saveName, setSaveName] = useState('')
  const [saveOpen, setSaveOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const queueRef = useRef<{ cid: number; categoryId: CategoryId }[]>([])
  const inFlightRef = useRef<number>(0)

  // Mobile-guard: re-check on resize. The matrix is intentionally not made responsive.
  useEffect(() => {
    function check() {
      setIsMobile(typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    setSaved(listSavedCohorts())
  }, [])

  /**
   * Fetch a single (cid, categoryId) pair, updating the status / data maps.
   * Safe to call repeatedly — the worker loop guards against re-issuing.
   */
  const fetchOne = useCallback(async (cid: number, categoryId: CategoryId) => {
    setStatusByCid(prev => ({
      ...prev,
      [cid]: { ...prev[cid], [categoryId]: 'loading' },
    }))
    try {
      const data = await fetchCategoryData(cid, categoryId)
      setDataByCid(prev => ({
        ...prev,
        [cid]: { ...(prev[cid] ?? {}), ...data },
      }))
      setStatusByCid(prev => ({
        ...prev,
        [cid]: { ...prev[cid], [categoryId]: 'loaded' },
      }))
    } catch {
      setStatusByCid(prev => ({
        ...prev,
        [cid]: { ...prev[cid], [categoryId]: 'error' },
      }))
    }
  }, [])

  /**
   * Worker-pool drain: pulls (cid, category) pairs from queueRef and fetches
   * up to FETCH_CONCURRENCY at a time. Re-entrant — extra calls are no-ops if
   * we're already at the limit; they wake up the loop after each completion.
   */
  const drainQueue = useCallback(async () => {
    while (inFlightRef.current < FETCH_CONCURRENCY && queueRef.current.length > 0) {
      const next = queueRef.current.shift()
      if (!next) break
      inFlightRef.current += 1
      // Don't await here — fire and update inFlight on completion
      fetchOne(next.cid, next.categoryId).finally(() => {
        inFlightRef.current -= 1
        // Re-drain after each completion
        drainQueue()
      })
    }
  }, [fetchOne])

  /** Enqueue all REQUIRED_CATEGORIES for a newly-added molecule. */
  const enqueueMolecule = useCallback((cid: number) => {
    for (const categoryId of REQUIRED_CATEGORIES) {
      queueRef.current.push({ cid, categoryId })
    }
    drainQueue()
  }, [drainQueue])

  const handleAdd = useCallback((m: Molecule) => {
    setMolecules(prev => {
      if (prev.some(x => x.cid === m.cid)) return prev
      if (prev.length >= MAX_MOLECULES) return prev
      enqueueMolecule(m.cid)
      return [...prev, m]
    })
  }, [enqueueMolecule])

  const handleRemove = useCallback((cid: number) => {
    setMolecules(prev => prev.filter(m => m.cid !== cid))
    setDataByCid(prev => {
      const next = { ...prev }
      delete next[cid]
      return next
    })
    setStatusByCid(prev => {
      const next = { ...prev }
      delete next[cid]
      return next
    })
    queueRef.current = queueRef.current.filter(item => item.cid !== cid)
  }, [])

  const handleClear = useCallback(() => {
    setMolecules([])
    setDataByCid({})
    setStatusByCid({})
    queueRef.current = []
  }, [])

  const handleLoadSaved = useCallback((sc: SavedCohort) => {
    handleClear()
    for (const m of sc.molecules.slice(0, MAX_MOLECULES)) {
      // Use a microtask to let state settle between adds
      setTimeout(() => handleAdd(m), 0)
    }
  }, [handleAdd, handleClear])

  const handleDeleteSaved = useCallback((id: string) => {
    deleteCohort(id)
    setSaved(listSavedCohorts())
  }, [])

  const handleSaveSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (molecules.length < MIN_MOLECULES) return
    saveCohort(saveName, molecules)
    setSaved(listSavedCohorts())
    setSaveName('')
    setSaveOpen(false)
  }, [saveName, molecules])

  const matrixRows = useMemo(
    () => buildMatrix(molecules, COHORT_ATTRIBUTES, dataByCid),
    [molecules, dataByCid],
  )

  const handleExportCsv = useCallback(() => {
    if (molecules.length === 0) return
    const csv = exportCohortToCsv(molecules, matrixRows)
    const stamp = new Date().toISOString().slice(0, 10)
    downloadFile(csv, `cohort-${stamp}.csv`, 'text/csv')
  }, [molecules, matrixRows])

  const handleExportJson = useCallback(() => {
    if (molecules.length === 0) return
    const json = exportCohortToJson(molecules, matrixRows)
    const stamp = new Date().toISOString().slice(0, 10)
    downloadFile(json, `cohort-${stamp}.json`, 'application/json')
  }, [molecules, matrixRows])

  const totalRequests = molecules.length * REQUIRED_CATEGORIES.length
  const completedRequests = molecules.reduce((sum, m) => {
    const status = statusByCid[m.cid] ?? {}
    return sum + REQUIRED_CATEGORIES.filter(c => status[c] === 'loaded' || status[c] === 'error').length
  }, 0)
  const allLoaded = totalRequests > 0 && completedRequests === totalRequests

  if (isMobile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-3">
          <p className="text-3xl">📐</p>
          <h2 className="text-lg font-semibold text-slate-200">Use a wider screen</h2>
          <p className="text-sm text-slate-400">
            Cohort comparison is best viewed on a screen at least 1024 px wide. Open this page on a tablet or desktop browser.
          </p>
          <Link href="/" className="inline-block text-sm text-indigo-400 hover:text-indigo-300">
            ← Back to home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Cohort Comparison</h1>
          <p className="text-sm text-slate-400 mt-1">
            Build a cohort of {MIN_MOLECULES}–{MAX_MOLECULES} molecules and compare them as a heatmap matrix.
          </p>
        </div>
        <Link href="/" className="text-sm text-slate-400 hover:text-slate-200">
          ← Home
        </Link>
      </header>

      <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-5">
        <MoleculePicker
          molecules={molecules}
          maxMolecules={MAX_MOLECULES}
          minMolecules={MIN_MOLECULES}
          onAdd={handleAdd}
          onRemove={handleRemove}
          onClear={handleClear}
        />
      </div>

      {molecules.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <p>Add at least {MIN_MOLECULES} molecules to start building your cohort.</p>
          {saved.length > 0 && (
            <p className="text-xs mt-2">Or load a saved cohort below.</p>
          )}
        </div>
      )}

      {molecules.length > 0 && (
        <>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">Sort rows:</span>
              <div className="flex bg-slate-800 border border-slate-700 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setSortBy('category')}
                  className={`text-xs px-3 py-1 rounded ${sortBy === 'category' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-slate-100'}`}
                >
                  By category
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy('variance')}
                  className={`text-xs px-3 py-1 rounded ${sortBy === 'variance' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-slate-100'}`}
                >
                  By variance
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">
                {completedRequests} / {totalRequests} loaded
                {!allLoaded && totalRequests > 0 && (
                  <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse align-middle" />
                )}
              </span>
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={molecules.length === 0}
                className="text-xs px-3 py-1.5 rounded bg-slate-800 border border-slate-700 text-slate-300 hover:text-slate-100 disabled:opacity-50"
              >
                Export CSV
              </button>
              <button
                type="button"
                onClick={handleExportJson}
                disabled={molecules.length === 0}
                className="text-xs px-3 py-1.5 rounded bg-slate-800 border border-slate-700 text-slate-300 hover:text-slate-100 disabled:opacity-50"
              >
                Export JSON
              </button>
              <button
                type="button"
                onClick={() => setSaveOpen(o => !o)}
                disabled={molecules.length < MIN_MOLECULES}
                className="text-xs px-3 py-1.5 rounded bg-emerald-700/40 border border-emerald-700/60 text-emerald-200 hover:bg-emerald-700/60 disabled:opacity-50"
              >
                Save cohort
              </button>
            </div>
          </div>

          {saveOpen && (
            <form onSubmit={handleSaveSubmit} className="flex gap-2">
              <input
                type="text"
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                placeholder="Cohort name (e.g. NSAIDs lead series)"
                className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                autoFocus
              />
              <button
                type="submit"
                className="text-sm px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setSaveOpen(false)}
                className="text-sm px-3 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
            </form>
          )}

          <MatrixView
            molecules={molecules}
            rows={matrixRows}
            statusByCid={statusByCid}
            sortBy={sortBy}
            onRemoveMolecule={handleRemove}
          />

          <div className="text-[10px] text-slate-500 flex items-center gap-3 flex-wrap">
            <span>Heatmap legend:</span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: 'rgba(255, 140, 80, 0.5)' }} />
              low
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: 'rgba(178, 185, 100, 0.4)' }} />
              mid
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: 'rgba(102, 230, 120, 0.5)' }} />
              high
            </span>
            <span className="ml-2">Inverted for unfavorable rows (e.g. adverse events). Cells with no data show "—".</span>
          </div>
        </>
      )}

      {saved.length > 0 && (
        <section className="bg-slate-800/40 border border-slate-700 rounded-xl p-5">
          <h2 className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-3">Saved cohorts</h2>
          <ul className="space-y-2">
            {saved.map(sc => (
              <li
                key={sc.id}
                className="flex items-center justify-between bg-slate-900/40 border border-slate-700/60 rounded-lg px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm text-slate-200 truncate">{sc.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {sc.molecules.length} molecules · {new Date(sc.savedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleLoadSaved(sc)}
                    className="text-xs px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 hover:text-slate-100"
                  >
                    Load
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSaved(sc.id)}
                    className="text-xs px-2.5 py-1 rounded text-slate-500 hover:text-red-400"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
