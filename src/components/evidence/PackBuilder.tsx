'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DiseaseEntity, EvidenceClaim, MoleculeCandidate, TargetEntity } from '@/lib/domain'
import type { DiscoveryPreferencesSnapshot } from '@/lib/discovery/preferences'
import { loadDiscoveryPreferences, snapshotDiscoveryPreferences } from '@/lib/discovery/preferences'
import { downloadFile } from '@/lib/exportData'
import {
  MAX_PACK_CLAIMS,
  buildEvidencePack,
  countCitableClaims,
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
import { addPackIndexEntryAndSave, putPackInCache } from '@/lib/project'
import { emitProductEvent } from '@/lib/productEvents'
import { PackView } from './PackView'
import { PackAiPanel } from './PackAiPanel'

export interface PackBuilderProps {
  /** Profile merged-data bag or already-shaped Core panels. */
  panels?: CorePanelEvidenceInput
  /**
   * Pre-extracted multi-subject claims (board pack path).
   * When non-empty, preferred over re-extracting from merged panels
   * so subjectCandidateId attribution is preserved (design §6.5.4).
   */
  claims?: EvidenceClaim[]
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
  /** When true and panels empty, show loading hint (board auto-fetch parent-owned). */
  panelsLoading?: boolean
  /** Density / empty-panel warnings from board fetch (v2.1). */
  densityWarnings?: string[]
  /** Called after a successful download + index register */
  onExported?: (pack: EvidencePack, format: 'json' | 'md') => void
}

/**
 * Build + download versioned evidence packs (JSON / Markdown).
 * Download-primary; Share pack when collaborationMode allows (PR18).
 * Registers pack metadata to localStorage index (never full claims).
 * Optional pack AI modes validate claimIds against the pack allowlist (PR13).
 */
export function PackBuilder({
  panels: panelsProp,
  claims: claimsProp,
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
  panelsLoading = false,
  densityWarnings = [],
  onExported,
}: PackBuilderProps) {
  const [title, setTitle] = useState(
    () => defaultTitle?.trim() || (moleculeName ? `${moleculeName} evidence pack` : 'Evidence pack'),
  )
  const [lastPack, setLastPack] = useState<EvidencePack | null>(null)
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [showPreview, setShowPreview] = useState(true)
  const [shareBusy, setShareBusy] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const openedEmitted = useRef(false)
  const collabMode = useMemo(() => {
    try {
      return loadDiscoveryPreferences().collaborationMode
    } catch {
      return 'solo-export' as const
    }
  }, [])

  const panels = useMemo((): CorePanelEvidenceInput => {
    if (panelsProp) return panelsProp
    if (profileData) return corePanelsFromProfileData(profileData)
    return {}
  }, [panelsProp, profileData])

  const preClaims = useMemo(
    () => (claimsProp && claimsProp.length > 0 ? claimsProp : null),
    [claimsProp],
  )

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
    // Prefer pre-extracted multi-subject claims (board); avoid re-extract from merged panels
    if (preClaims) {
      return buildEvidencePack({
        title,
        claims: preClaims,
        candidates,
        disease,
        targets,
        preferencesSnapshot,
        rubric: defaultPackRubric(preferencesSnapshot),
        projectId: projectId ?? undefined,
        maxClaims: MAX_PACK_CLAIMS,
      })
    }
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
    preClaims,
    subjectCandidateId,
    moleculeName,
    candidates,
    disease,
    targets,
    preferencesSnapshot,
    projectId,
  ])

  useEffect(() => {
    if (openedEmitted.current) return
    if (panelsLoading) return
    if (!preClaims && !panelsProp && !profileData) return
    openedEmitted.current = true
    const citable = preClaims ? countCitableClaims(preClaims) : 0
    const claimCount = preClaims?.length ?? 0
    emitProductEvent('pack_opened', {
      projectId: projectId ?? null,
      claimCount,
      citable,
      citableCount: citable,
    })
  }, [panelsLoading, preClaims, panelsProp, profileData, projectId])

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
    // Full pack in IDB for RH rehydrate (never localStorage claims)
    void putPackInCache(pack)
  }

  const handleDownload = (format: 'json' | 'md') => {
    try {
      const pack = build()
      setLastPack(pack)
      const body = format === 'json' ? packToJson(pack) : packToMarkdown(pack)
      const mime = format === 'json' ? 'application/json' : 'text/markdown'
      downloadFile(body, packExportFilename(pack, format), mime)
      registerSideEffects(pack)
      const citable = countCitableClaims(pack.claims)
      emitProductEvent('pack_exported', {
        format,
        // Dual-key props: historical count/citable + design claimCount/citableCount (v2.1 §5.2)
        count: pack.claimCount,
        claimCount: pack.claimCount,
        citable,
        citableCount: citable,
        candidateCount: pack.candidates.length,
        projectId: pack.projectId ?? null,
      })
      flash(
        'ok',
        `Downloaded ${format.toUpperCase()} · ${pack.claimCount} claim${pack.claimCount === 1 ? '' : 's'} (${citable} citable · cap ${MAX_PACK_CLAIMS})`,
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

  const handleShare = async () => {
    setShareBusy(true)
    setShareUrl(null)
    try {
      const pack = build()
      setLastPack(pack)
      // IDB still written so RH rehydrate works even if share API fails
      registerSideEffects(pack)
      const res = await fetch('/api/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: {
            type: 'evidence-pack',
            id: pack.id,
            name: pack.title,
          },
          data: pack as unknown as Record<string, unknown>,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(
          (err as { error?: string }).error ??
            `Share failed (${res.status}). Pack remains downloadable; cached in browser for RH rehydrate.`,
        )
      }
      const data = (await res.json()) as { id: string }
      const url = `${window.location.origin}/pack/${data.id}`
      setShareUrl(url)
      try {
        await navigator.clipboard?.writeText(url)
      } catch {
        // ignore clipboard failures
      }
      emitProductEvent('pack_share', { packId: pack.id })
      flash('ok', 'Share link created (30-day TTL). Copied to clipboard when available.')
    } catch (err) {
      setShareUrl(null)
      flash(
        'err',
        err instanceof Error
          ? err.message
          : 'Share failed. Use Download JSON/MD — pack was still cached for rehydrate when possible.',
      )
    } finally {
      setShareBusy(false)
    }
  }

  const shareEnabled = collabMode === 'share-links-when-available'

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
            {panelsLoading && ' · Fetching Core panels for claim density…'}
            {!panelsLoading && preClaims && (
              <>
                {' '}
                · {preClaims.length} pre-extracted · {countCitableClaims(preClaims)} citable
                {countCitableClaims(preClaims) < 5 && preClaims.length > 0
                  ? ' · below M3 target (≥5 citable)'
                  : ''}
              </>
            )}
          </p>
        </div>
      </div>

      {densityWarnings.length > 0 && (
        <div
          className="mb-3 rounded-lg border border-amber-800/40 bg-amber-950/20 px-3 py-2 text-[11px] text-amber-200/90"
          data-testid="pack-density-warnings"
          role="status"
        >
          <div className="font-medium text-amber-100">Pack density notes</div>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-amber-200/80">
            {densityWarnings.slice(0, 8).map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

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
          data-testid="pack-download-json"
          onClick={() => handleDownload('json')}
          className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600"
        >
          Download JSON
        </button>
        <button
          type="button"
          data-testid="pack-download-md"
          onClick={() => handleDownload('md')}
          className="rounded-lg border border-emerald-800/40 bg-emerald-900/20 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-900/40"
        >
          Download Markdown
        </button>
        <button
          type="button"
          disabled={!shareEnabled || shareBusy}
          onClick={() => void handleShare()}
          title={
            shareEnabled
              ? 'Create a content-hashed snapshot link (30-day TTL). Server stores the pack payload.'
              : 'Enable “Share links when available” in Discover preferences (collaboration mode) to use server share links. Download always works.'
          }
          className={
            shareEnabled
              ? 'rounded-lg border border-cyan-800/50 bg-cyan-950/30 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-900/40 disabled:opacity-50'
              : 'cursor-not-allowed rounded-lg border border-slate-800 px-3 py-1.5 text-xs text-slate-600'
          }
        >
          {shareBusy ? 'Sharing…' : shareEnabled ? 'Share pack' : 'Share pack (enable in prefs)'}
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

      {shareUrl && (
        <p className="mt-2 break-all text-[10px] font-mono text-cyan-500/80">
          Share URL: <a href={shareUrl} className="underline hover:text-cyan-300">{shareUrl}</a>
        </p>
      )}

      {lastPack && !showPreview && (
        <p className="mt-2 text-[10px] font-mono text-slate-600">
          Last export: {lastPack.id} · {lastPack.contentHash.slice(0, 16)}…
        </p>
      )}

      {(lastPack || previewPack) && (
        <PackAiPanel pack={lastPack ?? previewPack} />
      )}
    </div>
  )
}
