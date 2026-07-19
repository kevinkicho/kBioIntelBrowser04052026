'use client'

import { useEffect, useMemo } from 'react'
import Link from 'next/link'
import type { DedupedDiseaseMolecule } from '@/lib/diseaseSearch'
import { DataPoint } from '@/components/ui/DataPoint'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import { alphaSortOptions, numberSortOptions } from '@/lib/listControls'
import { emitProductEvent } from '@/lib/productEvents'

interface Props {
  molecules: DedupedDiseaseMolecule[]
  diseaseName: string
  fetchedAt?: string | null
}

function kindLabel(kind: DedupedDiseaseMolecule['relationKind']): string {
  if (kind === 'known_drug') return 'Known drug / candidate'
  if (kind === 'gene_associated') return 'Gene-linked'
  return 'Disease-linked'
}

function kindClass(kind: DedupedDiseaseMolecule['relationKind']): string {
  if (kind === 'known_drug') {
    return 'bg-emerald-900/30 text-emerald-300 border-emerald-800/40'
  }
  if (kind === 'gene_associated') {
    return 'bg-cyan-900/30 text-cyan-300 border-cyan-800/40'
  }
  return 'bg-slate-700/50 text-slate-400 border-slate-600/40'
}

function sourceKeyOf(m: DedupedDiseaseMolecule): string {
  const s = (m.sources?.[0] || '').toLowerCase()
  if (s.includes('open')) return 'opentargets'
  if (s.includes('orphan')) return 'orphanet'
  if (s.includes('disgenet')) return 'disgenet'
  if (s.includes('chembl')) return 'chembl'
  return 'pubchem'
}

/**
 * Table listview for disease Related Molecules with reason, filter, sort.
 * Known drugs sort first by default; gene-linked rows explain the weak path.
 */
export function DiseaseRelatedMoleculesTable({
  molecules,
  diseaseName,
  fetchedAt,
}: Props) {
  const sortOptions = useMemo(
    () => [
      ...numberSortOptions<DedupedDiseaseMolecule>(
        (m) => (m.relationKind === 'known_drug' ? 2 : m.relationKind === 'gene_associated' ? 1 : 0),
        {
          high: 'Known drugs first',
          low: 'Gene-linked first',
          idPrefix: 'kind',
        },
      ),
      ...alphaSortOptions<DedupedDiseaseMolecule>((m) => m.name),
      ...numberSortOptions<DedupedDiseaseMolecule>((m) => (m.cid != null ? 1 : 0), {
        high: 'Has PubChem CID',
        low: 'No CID first',
        idPrefix: 'cid',
      }),
    ],
    [],
  )

  useEffect(() => {
    if (molecules.length === 0) return
    emitProductEvent('ui_surface_action', {
      surface: 'related_molecules',
      action: 'viewed',
      count: molecules.length,
      disease: diseaseName,
    })
  }, [molecules.length, diseaseName])

  if (molecules.length === 0) return null

  const geneLinked = molecules.filter((m) => m.relationKind === 'gene_associated').length
  const knownDrugs = molecules.filter((m) => m.relationKind === 'known_drug').length

  return (
    <section className="mb-8" data-testid="related-molecules-table">
      <h2 className="text-xl font-semibold text-slate-100 mb-1">Related Molecules</h2>
      <p className="text-sm text-slate-400 mb-2">
        {molecules.length} candidate{molecules.length !== 1 ? 's' : ''}
        {knownDrugs > 0 ? ` · ${knownDrugs} known drug/candidate` : ''}
        {geneLinked > 0 ? ` · ${geneLinked} gene-linked` : ''} — each row explains why it was
        selected (deterministic source rules, not AI ranking)
      </p>
      {geneLinked > 0 && (
        <p
          className="text-[11px] text-amber-200/80 bg-amber-950/30 border border-amber-900/40 rounded-lg px-3 py-2 mb-3 leading-relaxed"
          data-testid="related-molecules-honesty"
        >
          <strong className="font-medium">Gene-linked rows are not necessarily drugs.</strong> They
          come from disease–gene associations (Orphanet/DisGeNET) → UniProt protein name → PubChem
          name match. Prefer “Known drug / candidate” rows for therapeutic landscape.
        </p>
      )}

      <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-3 overflow-x-auto">
        <FilterablePaginatedList
          items={molecules}
          getSearchText={(m) =>
            [m.name, m.reason, m.relationKind, ...(m.sources || []), m.cid != null ? String(m.cid) : '']
              .filter(Boolean)
              .join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="kind-desc"
          filterPlaceholder="Search name, reason, source…"
          getKey={(m) => (m.cid != null ? `cid:${m.cid}` : `name:${m.name}`)}
          pageSize={12}
          className="space-y-0 min-w-[40rem]"
          csvExport={{
            filename: `related-molecules-${diseaseName.replace(/\s+/g, '-').slice(0, 40)}.csv`,
            columns: [
              { header: 'Name', get: (m) => m.name },
              { header: 'CID', get: (m) => m.cid },
              { header: 'RelationKind', get: (m) => m.relationKind },
              { header: 'Reason', get: (m) => m.reason },
              { header: 'Sources', get: (m) => m.sources.join('; ') },
            ],
          }}
          renderItem={(m, index) => {
            const recordUrl = m.cid
              ? `https://pubchem.ncbi.nlm.nih.gov/compound/${m.cid}`
              : undefined
            return (
              <DataPoint
                sourceKey={sourceKeyOf(m)}
                label={m.name}
                fetchedAt={fetchedAt}
                recordUrl={recordUrl}
                className="border-b border-slate-800/80 last:border-0"
              >
                <div
                  className="grid grid-cols-[minmax(0,1.1fr)_minmax(5.5rem,0.55fr)_minmax(0,1.6fr)] gap-x-2 items-start px-2 py-2"
                  data-testid={`related-mol-row-${m.cid ?? m.name}`}
                >
                  {index === 0 && (
                    <>
                      <span className="col-span-3 grid grid-cols-subgrid text-[9px] font-semibold uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-700/60 mb-1">
                        <span>Molecule</span>
                        <span>Kind</span>
                        <span>Why related</span>
                      </span>
                    </>
                  )}
                  <div className="min-w-0">
                    {m.cid ? (
                      <Link
                        href={`/molecule/${m.cid}`}
                        className="text-sm font-medium text-emerald-300 hover:text-emerald-200 truncate block"
                      >
                        {m.name}
                      </Link>
                    ) : (
                      <span className="text-sm text-slate-400 truncate block">{m.name}</span>
                    )}
                    <span className="text-[10px] text-slate-600 font-mono">
                      {m.cid != null ? `CID ${m.cid}` : 'No CID'}
                    </span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {m.sources.map((s) => (
                        <span
                          key={s}
                          className="text-[9px] px-1 py-0.5 rounded bg-slate-800 text-slate-500"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span
                      className={`inline-block text-[9px] px-1.5 py-0.5 rounded border ${kindClass(m.relationKind)}`}
                    >
                      {kindLabel(m.relationKind)}
                    </span>
                  </div>
                  <p
                    className="text-[11px] text-slate-400 leading-snug line-clamp-3"
                    title={m.reasons?.length > 1 ? m.reasons.join(' · ') : m.reason}
                  >
                    {m.reason}
                  </p>
                </div>
              </DataPoint>
            )
          }}
        />
      </div>
    </section>
  )
}
