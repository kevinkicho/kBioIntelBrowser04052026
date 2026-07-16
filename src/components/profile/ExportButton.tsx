'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { buildExportSections, exportToCsv, exportToJson, downloadFile } from '@/lib/exportData'
import { printReport, printSummaryReport } from '@/lib/printReport'
import { computeCandidateId } from '@/lib/domain'
import type { MoleculeCandidate } from '@/lib/domain'
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
} from '@/lib/evidence'
import {
  loadDiscoveryPreferences,
  snapshotDiscoveryPreferences,
} from '@/lib/discovery/preferences'
import { addPackIndexEntryAndSave } from '@/lib/project'

interface ExportButtonProps {
  data: Record<string, unknown>
  moleculeName: string
  cid?: number
  inchiKey?: string
  /** When set (e.g. ?project=), pack breadcrumb is written to project.packIndex */
  projectId?: string | null
}

function buildProfileCandidate(
  moleculeName: string,
  cid?: number,
  inchiKey?: string,
): MoleculeCandidate {
  const identity = {
    name: moleculeName,
    synonyms: [] as string[],
    pubchemCid: cid ?? null,
    inchiKey: inchiKey || undefined,
    identityTrust: (inchiKey ? 'high' : cid != null ? 'medium' : 'low') as 'high' | 'medium' | 'low',
  }
  return {
    candidateId: computeCandidateId({
      name: moleculeName,
      pubchemCid: cid ?? null,
      inchiKey: inchiKey || undefined,
    }),
    identity,
    origins: ['manual'],
    evidenceBreadthSources: [],
    links: [],
  }
}

export function ExportButton({
  data,
  moleculeName,
  cid,
  inchiKey,
  projectId,
}: ExportButtonProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const sections = buildExportSections(data)
  const slug = moleculeName.toLowerCase().replace(/\s+/g, '-')

  const candidate = useMemo(
    () => buildProfileCandidate(moleculeName, cid, inchiKey),
    [moleculeName, cid, inchiKey],
  )

  function handleCsv() {
    downloadFile(exportToCsv(sections), `${slug}-profile.csv`, 'text/csv')
    setOpen(false)
  }

  function handleJson() {
    downloadFile(exportToJson(sections), `${slug}-profile.json`, 'application/json')
    setOpen(false)
  }

  function handleEvidencePack(format: 'json' | 'md') {
    const preferencesSnapshot = snapshotDiscoveryPreferences(loadDiscoveryPreferences())
    const pack = buildEvidencePack({
      title: `${moleculeName} evidence pack`,
      panels: corePanelsFromProfileData(data),
      extractOptions: {
        retrievedAt: new Date().toISOString(),
        subjectCandidateId: candidate.candidateId,
        moleculeName,
      },
      candidates: [candidate],
      preferencesSnapshot,
      rubric: defaultPackRubric(preferencesSnapshot),
      projectId: projectId ?? undefined,
      maxClaims: MAX_PACK_CLAIMS,
    })
    const body = format === 'json' ? packToJson(pack) : packToMarkdown(pack)
    const mime = format === 'json' ? 'application/json' : 'text/markdown'
    downloadFile(body, packExportFilename(pack, format), mime)
    registerPackIndex(pack)
    if (projectId) {
      addPackIndexEntryAndSave(projectId, toProjectPackIndexEntry(pack))
    }
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-1.5 text-sm text-slate-300 hover:text-slate-100 transition-colors"
      >
        Export ▼
      </button>
      {open && (
        <div className="absolute right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 min-w-[240px]">
          <button onClick={handleCsv} className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded-t-lg">
            📄 Export as CSV
          </button>
          <button onClick={handleJson} className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700">
            📋 Export as JSON
          </button>
          <div className="border-t border-slate-700" />
          <button
            onClick={() => handleEvidencePack('json')}
            className="w-full text-left px-4 py-2 text-sm text-emerald-300 hover:bg-slate-700"
          >
            📦 Download evidence pack (JSON)
          </button>
          <button
            onClick={() => handleEvidencePack('md')}
            className="w-full text-left px-4 py-2 text-sm text-emerald-300 hover:bg-slate-700"
          >
            📦 Download evidence pack (MD)
          </button>
          <button
            type="button"
            disabled
            title="Share pack links ship later (content-hashed snapshots). Download is always available."
            className="w-full cursor-not-allowed text-left px-4 py-2 text-sm text-slate-600"
          >
            🔗 Share pack (soon)
          </button>
          <div className="border-t border-slate-700" />
          <button
            onClick={() => { if (!printReport(data, moleculeName, cid)) { alert('Please allow popups to print the report.') } setOpen(false) }}
            className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
          >
            🖨️ Print Full Report
          </button>
          <button
            onClick={() => { if (!printSummaryReport(data, moleculeName, cid)) { alert('Please allow popups to print the summary.') } setOpen(false) }}
            className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded-b-lg"
          >
            🖨️ Print Executive Summary
          </button>
        </div>
      )}
    </div>
  )
}
