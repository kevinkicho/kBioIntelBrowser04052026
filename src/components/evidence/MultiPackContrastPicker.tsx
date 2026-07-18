'use client'

import { useCallback, useMemo, useState } from 'react'
import type { EvidenceClaim, Project, ProjectPackIndexEntry, ResearchHypothesis } from '@/lib/domain'
import type { EvidencePack } from '@/lib/evidence/pack'
import {
  contrastEvidencePacks,
  contrastPackIndexEntries,
  type PackContrastResult,
} from '@/lib/project/packContrast'
import { getPackFromCache } from '@/lib/project/packCache'
import {
  createRivalHypothesis,
  saveResearchHypothesis,
  seedResearchHypothesisFromPack,
} from '@/lib/project'

export interface MultiPackContrastPickerProps {
  project: Project
  /** Optional RH to attach rival seeds / thesis notes */
  hyp?: ResearchHypothesis | null
  claims?: EvidenceClaim[]
  className?: string
  onContrast?: (result: PackContrastResult) => void
  onRivalCreated?: (hypId: string) => void
  onAppendNarrative?: (markdown: string) => void
}

async function loadPackClaims(
  entry: ProjectPackIndexEntry,
): Promise<{ pack: EvidencePack | null; claims: EvidenceClaim[] }> {
  const pack = await getPackFromCache(entry.id)
  if (pack?.claims?.length) {
    return { pack, claims: pack.claims }
  }
  return { pack: null, claims: [] }
}

/**
 * Pick primary + contrast evidence packs and show a deterministic claim/source/candidate diff.
 */
export function MultiPackContrastPicker({
  project,
  hyp = null,
  className = '',
  onContrast,
  onRivalCreated,
  onAppendNarrative,
}: MultiPackContrastPickerProps) {
  const entries = useMemo(() => project.packIndex ?? [], [project.packIndex])
  const defaultPrimary = hyp?.packId && entries.some((e) => e.id === hyp.packId)
    ? hyp.packId
    : entries[0]?.id ?? ''
  const defaultContrast =
    entries.find((e) => e.id !== defaultPrimary)?.id ?? entries[1]?.id ?? ''

  const [primaryId, setPrimaryId] = useState(defaultPrimary)
  const [contrastId, setContrastId] = useState(defaultContrast)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<PackContrastResult | null>(null)
  const [loadedNote, setLoadedNote] = useState<string | null>(null)

  const primaryEntry = useMemo(
    () => entries.find((e) => e.id === primaryId) ?? null,
    [entries, primaryId],
  )
  const contrastEntry = useMemo(
    () => entries.find((e) => e.id === contrastId) ?? null,
    [entries, contrastId],
  )

  const runContrast = useCallback(async () => {
    if (!primaryEntry || !contrastEntry) {
      setError('Select two pack index entries (download packs first).')
      return
    }
    if (primaryEntry.id === contrastEntry.id) {
      setError('Primary and contrast packs must differ.')
      return
    }
    setBusy(true)
    setError(null)
    setLoadedNote(null)
    try {
      const [p, c] = await Promise.all([
        loadPackClaims(primaryEntry),
        loadPackClaims(contrastEntry),
      ])
      let res: PackContrastResult
      if (p.pack && c.pack) {
        res = contrastEvidencePacks(p.pack, c.pack)
        setLoadedNote('Full pack payloads from IndexedDB cache.')
      } else {
        res = contrastPackIndexEntries(primaryEntry, contrastEntry, p.claims, c.claims)
        setLoadedNote(
          p.pack || c.pack
            ? 'Partial: one pack from cache, other from index metadata/claims.'
            : 'Index-only contrast (re-download packs for full candidate names & claims).',
        )
      }
      setResult(res)
      onContrast?.(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Contrast failed')
    } finally {
      setBusy(false)
    }
  }, [primaryEntry, contrastEntry, onContrast])

  const seedRival = useCallback(() => {
    if (!result || !hyp) {
      setError('Open/save a research hypothesis first to seed a rival.')
      return
    }
    const rival = createRivalHypothesis(hyp, {
      title: `Rival: ${result.contrast.title}`.slice(0, 200),
      thesis: result.rivalSeedThesis,
      role: 'rival',
      claimIds: result.contrast.claimIds.length
        ? result.contrast.claimIds
        : hyp.claimIds,
    })
    const saved = saveResearchHypothesis(rival)
    if (!saved.ok) {
      setError(saved.message)
      return
    }
    onRivalCreated?.(saved.value.id)
  }, [result, hyp, onRivalCreated])

  const seedFromContrastPack = useCallback(() => {
    if (!contrastEntry) return
    const seeded = seedResearchHypothesisFromPack({
      projectId: project.id,
      packId: contrastEntry.id,
      packTitle: contrastEntry.title,
      claimIds: contrastEntry.claimIds ?? result?.contrast.claimIds ?? [],
      candidateIds: project.candidates.map((c) => c.candidateId),
      diseaseId: project.disease?.id,
      targetIds: project.targetIds,
      thesis: result?.rivalSeedThesis,
      role: hyp ? 'rival' : 'primary',
    })
    // If we have a primary hyp, link rival
    if (hyp) {
      const rival = createRivalHypothesis(hyp, {
        title: seeded.title,
        thesis: seeded.thesis,
        role: 'rival',
        claimIds: seeded.claimIds,
      })
      const saved = saveResearchHypothesis(rival)
      if (!saved.ok) {
        setError(saved.message)
        return
      }
      onRivalCreated?.(saved.value.id)
      return
    }
    const saved = saveResearchHypothesis(seeded)
    if (!saved.ok) {
      setError(saved.message)
      return
    }
    onRivalCreated?.(saved.value.id)
  }, [contrastEntry, project, result, hyp, onRivalCreated])

  if (entries.length < 2) {
    return (
      <div
        className={`rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-xs text-slate-500 ${className}`}
        data-testid="multi-pack-contrast"
      >
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Multi-pack contrast
        </h3>
        <p className="mt-1">
          Need ≥2 evidence packs on this project. Download a pack for the primary shortlist and
          another for a hold/kill contrast candidate, then compare claim types and sources.
        </p>
      </div>
    )
  }

  return (
    <div
      className={`rounded-xl border border-indigo-900/30 bg-slate-950/40 p-3 ${className}`}
      data-testid="multi-pack-contrast"
    >
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-indigo-300/90">
        Multi-pack contrast
      </h3>
      <p className="mt-1 text-[10px] text-slate-500 leading-relaxed">
        Why promote pack A over pack B? Deterministic claim-type / source / candidate diff — no LLM
        ranking. Optional: seed a rival research hypothesis from the contrast pack.
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="block text-[10px] text-slate-400">
          Primary pack
          <select
            value={primaryId}
            onChange={(e) => setPrimaryId(e.target.value)}
            className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200"
            data-testid="contrast-primary-select"
          >
            {entries.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title} ({e.claimCount ?? e.claimIds?.length ?? 0} claims)
              </option>
            ))}
          </select>
        </label>
        <label className="block text-[10px] text-slate-400">
          Contrast pack
          <select
            value={contrastId}
            onChange={(e) => setContrastId(e.target.value)}
            className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200"
            data-testid="contrast-secondary-select"
          >
            {entries.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title} ({e.claimCount ?? e.claimIds?.length ?? 0} claims)
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void runContrast()}
          disabled={busy}
          className="rounded-lg bg-indigo-700 px-3 py-1.5 text-[10px] text-white hover:bg-indigo-600 disabled:opacity-50"
          data-testid="contrast-run"
        >
          {busy ? 'Comparing…' : 'Run contrast'}
        </button>
        {result && onAppendNarrative && (
          <button
            type="button"
            onClick={() => onAppendNarrative(result.narrative)}
            className="rounded border border-slate-700 px-2 py-1 text-[10px] text-slate-300 hover:border-indigo-600"
            data-testid="contrast-append-thesis"
          >
            Append to thesis
          </button>
        )}
        {result && hyp && (
          <button
            type="button"
            onClick={seedRival}
            className="rounded border border-amber-800/50 px-2 py-1 text-[10px] text-amber-200 hover:bg-amber-950/40"
            data-testid="contrast-seed-rival"
          >
            Seed rival RH
          </button>
        )}
        {result && (
          <button
            type="button"
            onClick={seedFromContrastPack}
            className="rounded border border-cyan-800/40 px-2 py-1 text-[10px] text-cyan-200 hover:bg-cyan-950/30"
            data-testid="contrast-seed-pack"
          >
            Seed RH from contrast pack
          </button>
        )}
      </div>

      {error && (
        <p className="mt-2 text-[11px] text-red-400" role="alert">
          {error}
        </p>
      )}
      {loadedNote && (
        <p className="mt-1 text-[10px] text-slate-600" data-testid="contrast-load-note">
          {loadedNote}
        </p>
      )}

      {result && (
        <div className="mt-3 space-y-2" data-testid="contrast-result">
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] text-left text-slate-400">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500">
                  <th className="py-1 pr-2 font-medium">Facet</th>
                  <th className="py-1 pr-2 font-medium text-emerald-400/80">Primary</th>
                  <th className="py-1 font-medium text-amber-400/80">Contrast</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-800/60">
                  <td className="py-1 pr-2">Title</td>
                  <td className="py-1 pr-2 text-slate-200">{result.primary.title}</td>
                  <td className="py-1 text-slate-200">{result.contrast.title}</td>
                </tr>
                <tr className="border-b border-slate-800/60">
                  <td className="py-1 pr-2">Claims</td>
                  <td className="py-1 pr-2 tabular-nums">{result.primary.claimCount}</td>
                  <td className="py-1 tabular-nums">{result.contrast.claimCount}</td>
                </tr>
                <tr className="border-b border-slate-800/60">
                  <td className="py-1 pr-2">Types</td>
                  <td className="py-1 pr-2">
                    {Object.entries(result.primary.claimTypes)
                      .map(([k, n]) => `${k}:${n}`)
                      .join(', ') || '—'}
                  </td>
                  <td className="py-1">
                    {Object.entries(result.contrast.claimTypes)
                      .map(([k, n]) => `${k}:${n}`)
                      .join(', ') || '—'}
                  </td>
                </tr>
                <tr className="border-b border-slate-800/60">
                  <td className="py-1 pr-2">Sources</td>
                  <td className="py-1 pr-2">{result.primary.sources.join(', ') || '—'}</td>
                  <td className="py-1">{result.contrast.sources.join(', ') || '—'}</td>
                </tr>
                <tr>
                  <td className="py-1 pr-2">Candidates</td>
                  <td className="py-1 pr-2">
                    {result.primary.candidateNames.join(', ') || '—'}
                  </td>
                  <td className="py-1">
                    {result.contrast.candidateNames.join(', ') || '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-1 text-[9px]">
            {result.onlyPrimaryTypes.map((t) => (
              <span
                key={`p-${t}`}
                className="rounded border border-emerald-800/40 bg-emerald-950/30 px-1.5 py-0.5 text-emerald-300"
              >
                only primary: {t}
              </span>
            ))}
            {result.onlyContrastTypes.map((t) => (
              <span
                key={`c-${t}`}
                className="rounded border border-amber-800/40 bg-amber-950/30 px-1.5 py-0.5 text-amber-300"
              >
                only contrast: {t}
              </span>
            ))}
            {result.sharedTypes.map((t) => (
              <span
                key={`s-${t}`}
                className="rounded border border-slate-700 px-1.5 py-0.5 text-slate-500"
              >
                shared: {t}
              </span>
            ))}
          </div>
          <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded border border-slate-800 bg-slate-950/60 p-2 font-sans text-[10px] text-slate-400">
            {result.narrative}
          </pre>
        </div>
      )}
    </div>
  )
}
