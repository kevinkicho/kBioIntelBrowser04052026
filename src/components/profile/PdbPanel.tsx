'use client'

import { memo, useEffect, useMemo, useState } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import { StructureViewer } from '@/components/charts/StructureViewer'
import type { PdbStructure } from '@/lib/types'
import {
  alphaSortOptions,
  dateSortOptions,
  numberSortOptions,
} from '@/lib/listControls'
import {
  doiUrl,
  isXrayMethod,
  pdbMethodDeepLink,
  pdbMethodShortLabel,
  pdbStructureDeepLink,
  pubmedUrl,
} from '@/lib/pdbLinks'
import {
  buildCharacterizationChips,
  characterizationChipTitle,
  type CharacterizationChip,
  type CharacterizationProbeOverrides,
} from '@/lib/pdbCharacterization'
import { onDeepLinkClick } from '@/lib/trackDeepLink'
import { clientFetch } from '@/lib/clientFetch'

const methodColors: Record<string, string> = {
  'X-ray': 'bg-sky-900/40 text-sky-300 border-sky-700/30',
  'X-RAY DIFFRACTION': 'bg-sky-900/40 text-sky-300 border-sky-700/30',
  'Cryo-EM': 'bg-emerald-900/40 text-emerald-300 border-emerald-700/30',
  'ELECTRON MICROSCOPY': 'bg-emerald-900/40 text-emerald-300 border-emerald-700/30',
  NMR: 'bg-amber-900/40 text-amber-300 border-amber-700/30',
  'SOLUTION NMR': 'bg-amber-900/40 text-amber-300 border-amber-700/30',
}

function methodChipClass(method: string): string {
  const short = pdbMethodShortLabel(method)
  return (
    methodColors[method] ||
    methodColors[short] ||
    'bg-slate-700/40 text-slate-300 border-slate-600/30'
  )
}

function charChipClass(chip: CharacterizationChip): string {
  if (chip.availability === 'available') {
    return 'border-cyan-800/50 bg-cyan-950/40 text-cyan-300 hover:text-cyan-200 opacity-100'
  }
  if (chip.availability === 'explore') {
    return 'border-indigo-900/40 bg-indigo-950/30 text-indigo-300/90 hover:text-indigo-200 opacity-80'
  }
  // Empty placeholder — dim, still clickable for literature shopping
  return 'border-slate-700/60 bg-slate-900/40 text-slate-500 hover:text-slate-400 opacity-30'
}

/** Biophysical / structural technique chips (CIF/SS live; CD/MS probed free APIs). */
function CharacterizationChipRow({
  structure,
}: {
  structure: PdbStructure
}) {
  const [probe, setProbe] = useState<CharacterizationProbeOverrides | null>(null)
  const [probing, setProbing] = useState(true)

  useEffect(() => {
    let cancelled = false
    setProbing(true)
    setProbe(null)
    const pdbId = structure.pdbId || ''
    const q = structure.title || pdbId
    if (!pdbId && !q) {
      setProbing(false)
      return
    }
    const params = new URLSearchParams()
    if (pdbId) params.set('pdbId', pdbId)
    if (q) params.set('q', q.slice(0, 80))
    void (async () => {
      try {
        const res = await clientFetch(
          `/api/characterization/probe?${params.toString()}`,
          undefined,
          { retries: 0, timeoutMs: 12_000 },
        )
        if (!res.ok || cancelled) return
        const data = (await res.json()) as {
          ms?: { hit?: boolean; href?: string; accession?: string }
          cd?: { hit?: boolean; href?: string }
        }
        if (cancelled) return
        setProbe({
          ms: data.ms
            ? {
                hit: Boolean(data.ms.hit),
                href: data.ms.href,
                accession: data.ms.accession,
              }
            : undefined,
          cd: data.cd
            ? { hit: Boolean(data.cd.hit), href: data.cd.href }
            : undefined,
        })
      } catch {
        /* keep static chips */
      } finally {
        if (!cancelled) setProbing(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [structure.pdbId, structure.title])

  const chips = useMemo(
    () =>
      buildCharacterizationChips({
        pdbId: structure.pdbId,
        title: structure.title,
        probe,
      }),
    [structure.pdbId, structure.title, probe],
  )

  return (
    <div
      className="flex flex-wrap items-center gap-1 mt-1.5"
      data-testid={`pdb-char-chips-${structure.pdbId}`}
      data-probing={probing ? 'true' : 'false'}
    >
      <span className="text-[8px] uppercase tracking-wider text-slate-600 mr-0.5 shrink-0">
        Char:
      </span>
      {chips.map((chip) => (
        <a
          key={chip.id}
          href={chip.href}
          target="_blank"
          rel="noopener noreferrer"
          title={characterizationChipTitle(chip)}
          data-testid={`pdb-char-${chip.id}-${structure.pdbId}`}
          data-availability={chip.availability}
          onClick={(e) => {
            e.stopPropagation()
            onDeepLinkClick('pdb', chip.href, {
              panelId: 'pdb',
              label: `char:${chip.id}:${structure.pdbId}`,
            })
          }}
          className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border transition-opacity ${charChipClass(chip)}`}
        >
          {chip.abbrev}
        </a>
      ))}
      {probing && (
        <span className="text-[8px] text-slate-600 animate-pulse" title="Probing PRIDE / PCDDB…">
          …
        </span>
      )}
    </div>
  )
}

export const PdbPanel = memo(function PdbPanel({
  structures,
  panelId,
  lastFetched,
}: {
  structures: PdbStructure[]
  panelId?: string
  lastFetched?: Date
}) {
  const [activeViewer, setActiveViewer] = useState<string | null>(null)
  const list = Array.isArray(structures) ? structures : []
  const isEmpty = list.length === 0

  const sortOptions = useMemo(
    () => [
      ...numberSortOptions<PdbStructure>((s) => s.resolution || 0, {
        high: 'Highest resolution value',
        low: 'Best resolution (lowest Å)',
        idPrefix: 'res',
      }),
      ...dateSortOptions<PdbStructure>((s) => s.depositionDate || s.releaseDate, {
        newest: 'Newest deposition',
        oldest: 'Oldest deposition',
      }),
      ...alphaSortOptions<PdbStructure>((s) => s.pdbId || s.title || ''),
      ...alphaSortOptions<PdbStructure>((s) => s.method || '').map((o) => ({
        ...o,
        id: `method-${o.id}`,
        label: o.id.includes('asc') ? 'Method A–Z' : 'Method Z–A',
      })),
    ],
    [],
  )

  return (
    <Panel
      title={isEmpty ? 'PDB Structures' : `PDB Structures (${list.length})`}
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? 'No PDB structures found for this molecule.' : undefined}
    >
      {!isEmpty && (
        <>
          <p className="mb-2 text-[10px] text-slate-600 leading-relaxed">
            RCSB PDB entries (free public API). Method chips open experimental details on PDBe.
            Use <strong className="text-slate-500">View 3D</strong> for an in-page molecular view.
            Characterization chips: <span className="text-cyan-500/80">bright</span> = free data for
            this entry (CIF, SS); <span className="text-indigo-400/70">medium</span> = free
            repository search (CD via PCDDB, MS via PRIDE);{' '}
            <span className="text-slate-500 opacity-50">dim</span> = not in PDB — PubMed explore for
            SPR / ITC / DSC / UV (no free structured DB).
          </p>
          <FilterablePaginatedList
            items={list}
            getSearchText={(structure) =>
              [
                structure.pdbId,
                structure.title,
                structure.method,
                structure.depositionDate,
                structure.releaseDate,
                structure.spaceGroup,
                structure.polymerTypes,
                structure.keywords,
                structure.citationDoi,
              ]
                .filter(Boolean)
                .join(' ')
            }
            sortOptions={sortOptions}
            defaultSortId="res-asc"
            filterPlaceholder="Filter structures (PDB ID, title, method…)"
            getKey={(structure, i) => `${structure.pdbId || i}`}
            pageSize={8}
            className="space-y-0"
            renderItem={(structure, index) => {
              const href = pdbStructureDeepLink(structure)
              const methodHref = pdbMethodDeepLink(structure.pdbId, structure.method)
              const methodLabel = pdbMethodShortLabel(structure.method)
              const colors = methodChipClass(structure.method)
              const isViewerOpen = activeViewer === structure.pdbId
              const doi = doiUrl(structure.citationDoi)
              const pmid = pubmedUrl(structure.citationPmid)
              const xray = isXrayMethod(structure.method)

              return (
                <div data-testid={`pdb-row-${structure.pdbId || index}`}>
                  {index === 0 && (
                    <div
                      className="grid grid-cols-[4.5rem_minmax(0,1.4fr)_minmax(4.5rem,0.55fr)_minmax(3.5rem,0.4fr)_minmax(5rem,0.55fr)_5.5rem] gap-x-2 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-700/80"
                      role="row"
                    >
                      <span>PDB</span>
                      <span>Title</span>
                      <span>Method</span>
                      <span className="text-right">Res.</span>
                      <span>Deposited</span>
                      <span className="text-right">3D</span>
                    </div>
                  )}
                  <div className="grid grid-cols-[4.5rem_minmax(0,1.4fr)_minmax(4.5rem,0.55fr)_minmax(3.5rem,0.4fr)_minmax(5rem,0.55fr)_5.5rem] gap-x-2 items-start px-2 py-2 border-b border-slate-700/50 last:border-0 hover:bg-slate-800/40 transition-colors">
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Open ${structure.pdbId} on RCSB PDB`}
                      onClick={() =>
                        onDeepLinkClick('pdb', href, {
                          panelId: 'pdb',
                          label: structure.pdbId,
                        })
                      }
                      className="text-xs font-mono font-semibold text-blue-400 hover:text-blue-300"
                    >
                      {structure.pdbId}
                    </a>
                    <div className="min-w-0">
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() =>
                          onDeepLinkClick('pdb', href, {
                            panelId: 'pdb',
                            label: structure.pdbId,
                          })
                        }
                        className="text-sm text-slate-100 hover:text-cyan-200 line-clamp-2 leading-snug"
                        title={structure.title}
                      >
                        {structure.title || '—'}
                      </a>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {structure.spaceGroup && (
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded border border-slate-700 bg-slate-900/60 text-slate-400 font-mono"
                            title="Crystallographic space group"
                          >
                            {structure.spaceGroup}
                          </span>
                        )}
                        {structure.polymerTypes && (
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded border border-slate-700 bg-slate-900/60 text-slate-500"
                            title="Polymer entity types"
                          >
                            {structure.polymerTypes}
                          </span>
                        )}
                        {structure.molecularWeightKda != null &&
                          structure.molecularWeightKda > 0 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded border border-slate-700 bg-slate-900/60 text-slate-500 tabular-nums">
                              {structure.molecularWeightKda.toFixed(1)} kDa
                            </span>
                          )}
                        {structure.keywords && (
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded border border-violet-900/40 bg-violet-950/30 text-violet-300/90 truncate max-w-[10rem]"
                            title={structure.keywords}
                          >
                            {structure.keywords}
                          </span>
                        )}
                        {doi && (
                          <a
                            href={doi}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[9px] px-1.5 py-0.5 rounded border border-indigo-800/40 bg-indigo-950/30 text-indigo-300 hover:text-indigo-200"
                            title="Primary citation DOI"
                            onClick={(e) => {
                              e.stopPropagation()
                              onDeepLinkClick('pdb', doi, {
                                panelId: 'pdb',
                                label: `doi:${structure.pdbId}`,
                              })
                            }}
                          >
                            DOI
                          </a>
                        )}
                        {pmid && (
                          <a
                            href={pmid}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[9px] px-1.5 py-0.5 rounded border border-emerald-900/40 bg-emerald-950/20 text-emerald-300/90 hover:text-emerald-200"
                            title="PubMed"
                            onClick={(e) => {
                              e.stopPropagation()
                              onDeepLinkClick('pubmed', pmid, {
                                panelId: 'pdb',
                                label: `pmid:${structure.pdbId}`,
                              })
                            }}
                          >
                            PubMed
                          </a>
                        )}
                      </div>
                      {/* CIF lives in Char: row with SS/CD/MS/SPR/ITC/DSC/UV */}
                      <CharacterizationChipRow structure={structure} />
                    </div>
                    <a
                      href={methodHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={
                        xray
                          ? `X-ray crystallography experimental details for ${structure.pdbId} (PDBe / RCSB)`
                          : `Experimental method details for ${structure.pdbId}`
                      }
                      data-testid={`pdb-method-${structure.pdbId}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeepLinkClick('pdb', methodHref, {
                          panelId: 'pdb',
                          label: `method:${structure.pdbId}`,
                        })
                      }}
                      className={`text-[10px] border px-1.5 py-0.5 rounded truncate hover:brightness-125 transition-all ${colors}`}
                    >
                      {methodLabel}
                    </a>
                    <span
                      className={`text-[11px] font-mono tabular-nums text-right ${
                        structure.resolution > 0 ? 'text-slate-300' : 'text-slate-600'
                      }`}
                      title={
                        structure.resolution > 0
                          ? `Resolution ${structure.resolution} Å`
                          : 'No resolution reported (common for NMR)'
                      }
                    >
                      {structure.resolution > 0
                        ? `${structure.resolution.toFixed(1)} Å`
                        : '—'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 tabular-nums">
                      {structure.depositionDate || structure.releaseDate || '—'}
                    </span>
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setActiveViewer(isViewerOpen ? null : structure.pdbId)
                        }
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded border transition-all ${
                          isViewerOpen
                            ? 'bg-indigo-600 text-white border-indigo-500'
                            : 'bg-indigo-900/30 text-indigo-400 border-indigo-800/40 hover:bg-indigo-800/40'
                        }`}
                      >
                        {isViewerOpen ? '✕ Close' : 'View 3D'}
                      </button>
                    </div>
                  </div>
                  {isViewerOpen && (
                    <div className="px-2 pb-3 animate-[fadeSlideIn_0.2s_ease-out]">
                      <StructureViewer pdbId={structure.pdbId} />
                    </div>
                  )}
                </div>
              )
            }}
          />
        </>
      )}
    </Panel>
  )
})
