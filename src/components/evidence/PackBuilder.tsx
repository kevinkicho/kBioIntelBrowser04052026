'use client'

import { useCallback, useMemo, useState } from 'react'
import type { DiseaseEntity, MoleculeCandidate, TargetEntity } from '@/lib/domain'
import type { DiscoveryPreferencesSnapshot } from '@/lib/discovery/preferences'
import { loadDiscoveryPreferences, snapshotDiscoveryPreferences } from '@/lib/discovery/preferences'
import { downloadFile } from '@/lib/exportData'
import {
  MAX_PACK_CLAIMS,
  buildEvidencePack,
  corePanelsFromProfileData,
  defaultPackRubric,
  packExportFilename,
  packToJson,
  packToMarkdown,
  registerPackIndex,
  toProjectPackIndexEntry,
  type CorePanelEvidenceInput,
  type EvidencePack,
} from '@/lib/evidence'
import { addPackIndexEntryAndSave } from '@/lib/project'
import { PackView } from './PackView'

export interface PackBuilderProps {
  /** Profile merged-data bag or already-shaped Core panels. */
  panels?: CorePanelEvidenceInput
  /** Raw profile data — Core panels extracted automatically. */
  profileData?: Record<string, unknown>
  candidates?: MoleculeCandidate[]
  disease?: DiseaseEntity | null
  targets?: TargetEntity[]
  moleculeName?: string
  subjectCandidateId?: string
  projectId?: string | null
  /** Prefill title */
  defaultTitle?: string
  preferencesSnapshot?: DiscoveryPreferencesSnapshot
  className?: string
  /** Called after a successful download + index register */
  onExported?: (pack: EvidencePack, format: 'json' | 'md') => void
}

/**
 * Build + download versioned evidence packs (JSON / Markdown).
 * Download-primary: Share is a disabled placeholder until PR18.
 * Registers pack metadata to localStorage index (never full claims).
 */
export function PackBuilder({
  panels: panelsProp,
  profileData,
  candidates = [],
  disease = null,
  targets = [],
  moleculeName,
  subjectCandidateId,
  projectId,
  defaultTitle,
  preferencesSnapshot: prefsProp,
  className = '',
  onExported,
}: PackBuilderProps) {
  const [title, setTitle] = useState(
    () => defaultTitle?.trim() || (moleculeName ? `${moleculeName} evidence pack` : 'Evidence pack'),
  )
  const [lastPack, setLastPack] = useState<EvidencePack | null>(null)
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [showPreview, setShowPreview] = useState(true)

  const panels = useMemo((): CorePanelEvidenceInput => {
    if (panelsProp) return panelsProp
    if (profileData) return corePanelsFromProfileData(profileData)
    return {}
  }, [panelsProp, profileData])

  const preferencesSnapshot = useMemo(() => {
    if (prefsProp) return prefsProp
    try {
      return snapshotDiscoveryPreferences(loadDiscoveryPreferences())
    } catch {
      return undefined
    }
  }, [prefsProp])

  const build = useCallback((): EvidencePack => {
    const retrievedAt = new Date().toISOString()
    return buildEvidencePack({
      title,
      panels,
      extractOptions: {
        retrievedAt,
        subjectCandidateId,
        moleculeName,
      },
      candidates,
      disease,
      targets,
      preferencesSnapshot,
      rubric: defaultPackRubric(preferencesSnapshot),
      projectId: projectId ?? undefined,
      maxClaims: MAX_PACK_CLAIMS,
    })
  }, [
    title,
    panels,
    subjectCandidateId,
    moleculeName,
    candidates,
    disease,
    targets,
    preferencesSnapshot,
    projectId,
  ])

  const flash = (type: 'ok' | 'err', text: string) => {
    setBanner({ type, text })
    window.setTimeout(() => setBanner(null), 4500)
  }

  const registerSideEffects = (pack: EvidencePack) => {
    const indexResult = registerPackIndex(pack)
    if (!indexResult.ok && indexResult.error === 'quota_exceeded') {
      flash('err', indexResult.message)
    }
    if (pack.projectId) {
      const proj = addPackIndexEntryAndSave(pack.projectId, toProjectPackIndexEntry(pack))
      if (!proj.ok && proj.error !== 'not_found') {
        // Project missing is fine (deleted); quota is not silent
        if (proj.error === 'quota_exceeded') flash('err', proj.message)
      }
    }
  }

  const handleDownload = (format: 'json' | 'md') => {
    try {
      const pack = build()
      setLastPack(pack)
      const body = format === 'json' ? packToJson(pack) : packToMarkdown(pack)
      const mime = format === 'json' ? 'application/json' : 'text/markdown'
      downloadFile(body, packExportFilename(pack, format), mime)
      registerSideEffects(pack)
      flash(
        'ok',
        `Downloaded ${format.toUpperCase()} · ${pack.claimCount} claim${pack.claimCount === 1 ? '' : 's'} (cap ${MAX_PACK_CLAIMS})`,
      )
      onExported?.(pack, format)
    } catch (err) {
      flash('err', err instanceof Error ? err.message : 'Failed to build pack')
    }
  }

  const previewPack = useMemo(() => {
    if (!showPreview) return null
    try {
      return build()
    } catch {
      return null
    }
  }, [build, showPreview])

  return (
    <div
      className={`rounded-xl border border-slate-800 bg-slate-900/30 p-4 ${className}`}
      data-testid="pack-builder"
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">Evidence pack</h3>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Download-primary export · max {MAX_PACK_CLAIMS} claims · content-hashed for cite. Full
            packs are not stored in the browser — index metadata only.
          </p>
        </div>
      </div>

      <label className="mb-3 block">
        <span className="mb-1 block text-[11px] font-medium text-slate-400">Title</span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-700 focus:outline-none"
          placeholder="Pack title"
        />
      </label>

      {previewPack && (
        <div className="mb-3">
          <PackView pack={previewPack} compact />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => handleDownload('json')}
          className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600"
        >
          Download JSON
        </button>
        <button
          type="button"
          onClick={() => handleDownload('md')}
          className="rounded-lg border border-emerald-800/40 bg-emerald-900/20 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-900/40"
        >
          Download Markdown
        </button>
        <button
          type="button"
          disabled
          title="Share pack links ship in a later release (content-hashed snapshots). Download is always available."
          className="cursor-not-allowed rounded-lg border border-slate-800 px-3 py-1.5 text-xs text-slate-600"
        >
          Share pack (soon)
        </button>
        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          className="ml-auto rounded-lg border border-slate-700 px-2 py-1.5 text-[11px] text-slate-500 hover:text-slate-300"
        >
          {showPreview ? 'Hide preview' : 'Show preview'}
        </button>
      </div>

      {banner && (
        <div
          className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
            banner.type === 'ok'
              ? 'border-emerald-800/50 bg-emerald-900/20 text-emerald-200'
              : 'border-red-800/50 bg-red-900/20 text-red-200'
          }`}
          role="status"
        >
          {banner.text}
        </div>
      )}

      {lastPack && !showPreview && (
        <p className="mt-2 text-[10px] font-mono text-slate-600">
          Last export: {lastPack.id} · {lastPack.contentHash.slice(0, 16)}…
        </p>
      )}
    </div>
  )
}
