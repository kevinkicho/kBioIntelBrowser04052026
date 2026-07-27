'use client'

import { useState } from 'react'
import {
  diffResearchKitBundles,
  type KitDiffResult,
} from '@/lib/dataHub/diffResearchKits'
import { HelperTip } from '@/components/ui/HelperTip'

async function readFileJson(file: File): Promise<unknown> {
  const text = await file.text()
  return JSON.parse(text)
}

export function ResearchKitDiffPanel({
  className = '',
  testId = 'research-kit-diff',
}: {
  className?: string
  testId?: string
}) {
  const [result, setResult] = useState<KitDiffResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onCompare = async (a: File | null, b: File | null) => {
    setError(null)
    setResult(null)
    if (!a || !b) {
      setError('Choose two research kit bundle JSON files')
      return
    }
    try {
      const ja = await readFileJson(a)
      const jb = await readFileJson(b)
      const diff = diffResearchKitBundles(ja, jb)
      if ('error' in diff) {
        setError(diff.error)
        return
      }
      setResult(diff)
    } catch {
      setError('Could not parse JSON files')
    }
  }

  return (
    <section
      className={`rounded-xl border border-slate-800 bg-slate-900/40 p-4 ${className}`}
      data-testid={testId}
    >
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <h2 className="text-sm font-semibold text-slate-100">Diff two research kits</h2>
        <HelperTip
          content="Compare two biointel-research-kit-bundle JSON exports (e.g. same molecule before/after Refresh). Shows added, removed, and changed fact values from embedded data-hub.csv."
          label="About kit diff"
        />
      </div>
      <p className="mb-3 text-[11px] text-slate-500">
        Session A vs session B — of-record fact changes only. Not clinical conclusions.
      </p>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          const a = fd.get('kitA') as File
          const b = fd.get('kitB') as File
          void onCompare(a?.size ? a : null, b?.size ? b : null)
        }}
      >
        <label className="text-[10px] text-slate-400">
          Kit A (before)
          <input
            name="kitA"
            type="file"
            accept="application/json,.json"
            className="mt-1 block max-w-[12rem] text-[10px] text-slate-300"
            data-testid={`${testId}-file-a`}
          />
        </label>
        <label className="text-[10px] text-slate-400">
          Kit B (after)
          <input
            name="kitB"
            type="file"
            accept="application/json,.json"
            className="mt-1 block max-w-[12rem] text-[10px] text-slate-300"
            data-testid={`${testId}-file-b`}
          />
        </label>
        <button
          type="submit"
          className="rounded-lg border border-indigo-700/50 bg-indigo-950/40 px-3 py-1.5 text-[11px] font-medium text-indigo-200"
          data-testid={`${testId}-run`}
        >
          Diff kits
        </button>
      </form>
      {error && (
        <p className="mt-2 text-[11px] text-red-400" data-testid={`${testId}-error`}>
          {error}
        </p>
      )}
      {result && (
        <div className="mt-3 space-y-2" data-testid={`${testId}-result`}>
          <p className="text-[11px] text-slate-300">
            {result.subjectA} → {result.subjectB}: {result.summary}
          </p>
          <DiffList title="Added" rows={result.added} tone="emerald" />
          <DiffList title="Removed" rows={result.removed} tone="rose" />
          <DiffList title="Changed" rows={result.changed} tone="amber" />
        </div>
      )}
    </section>
  )
}

function DiffList({
  title,
  rows,
  tone,
}: {
  title: string
  rows: { fact: string; before?: string; after?: string; source?: string }[]
  tone: 'emerald' | 'rose' | 'amber'
}) {
  if (rows.length === 0) return null
  const border =
    tone === 'emerald'
      ? 'border-emerald-900/40'
      : tone === 'rose'
        ? 'border-rose-900/40'
        : 'border-amber-900/40'
  return (
    <div className={`rounded-lg border ${border} bg-slate-950/40 p-2`}>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {title} ({rows.length})
      </p>
      <ul className="max-h-40 space-y-1 overflow-y-auto text-[11px] text-slate-300">
        {rows.slice(0, 40).map((r, i) => (
          <li key={i}>
            <span className="font-medium text-slate-200">{r.fact}</span>
            {r.before != null && r.after != null ? (
              <span className="text-slate-500">
                {' '}
                {r.before} → {r.after}
              </span>
            ) : (
              <span className="text-slate-500"> {r.after || r.before}</span>
            )}
            {r.source && <span className="text-slate-600"> · {r.source}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
