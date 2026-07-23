'use client'

import { useState, useEffect, useCallback, useMemo, useRef, Suspense, type ReactNode } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { GeneOverview as GeneOverviewType } from '@/lib/categoryFetchers/gene'
import { AICopilot } from '@/components/ai/AICopilot'
import { CATEGORIES, type CategoryId } from '@/lib/categoryConfig'
import { EmptySection, ErrorSection } from '@/components/ui/DataStatus'
import type { SectionStatus } from '@/lib/dataStatus'
import { buildDiscoverHref } from '@/lib/discovery/discoverUrl'
import { DataPoint } from '@/components/ui/DataPoint'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type {
  BgeeExpression,
  ClinVarVariant,
  GeneExpression,
  GOTerm,
  ReactomePathway,
  WikiPathway,
  dbSNPVariant,
} from '@/lib/types'
import { bgeeRecordUrl } from '@/lib/api/bgee'
import { ElapsedTimer } from '@/components/ui/ElapsedTimer'
import { clientFetch } from '@/lib/clientFetch'
import { alphaSortOptions, numberSortOptions } from '@/lib/listControls'
import { onDeepLinkClick } from '@/lib/trackDeepLink'
import { emptyDataClass, isEmptyMetric } from '@/lib/summaryEmpty'
import { DescriptionTip, HelperTip } from '@/components/ui/HelperTip'
import { StyledTooltip } from '@/components/ui/StyledTooltip'
import { CrossSourceStrip } from '@/components/crossSource/CrossSourceStrip'
import { DataHubLedgerView } from '@/components/dataHub/DataHubLedger'
import { buildGeneCrossSource } from '@/lib/crossSource'
import { buildGeneDataHub } from '@/lib/dataHub'

type CategoryLoadState = 'idle' | 'loading' | 'loaded' | 'error'

/** MyGene / overview may send alias as string | string[] */
function normalizeAliases(value: unknown): string[] {
  if (value == null) return []
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === 'string' ? v : v != null ? String(v) : ''))
      .filter(Boolean)
  }
  if (typeof value === 'string') {
    const t = value.trim()
    return t ? [t] : []
  }
  return []
}

/** Alias / synonym chip → gene search for that name */
function GeneAliasChip({
  alias,
  size = 'sm',
}: {
  alias: string
  size?: 'sm' | 'xs'
}) {
  const sizeClass =
    size === 'xs'
      ? 'text-[10px] px-1.5 py-0.5'
      : 'text-xs px-1.5 py-0.5'
  return (
    <StyledTooltip content={`Search genes for “${alias}”`}>
      <Link
        href={`/gene?q=${encodeURIComponent(alias)}`}
        className={`${sizeClass} rounded border border-slate-700/60 bg-slate-800 text-slate-400 transition-colors hover:border-indigo-600/50 hover:bg-indigo-950/50 hover:text-indigo-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500`}
      >
        {alias}
      </Link>
    </StyledTooltip>
  )
}

function buildFullStatus(catId: CategoryId, state: CategoryLoadState): Record<CategoryId, CategoryLoadState> {
  const result = {} as Record<CategoryId, CategoryLoadState>
  for (const cat of CATEGORIES) {
    result[cat.id] = cat.id === catId ? state : 'idle'
  }
  return result
}

interface GeneDetailPageClientProps {
  geneId: string
  symbol: string
  name: string
  summary: string
  chromosome: string
  typeOfGene: string
  aliases: string[]
  ensemblId: string
  uniprotId: string
}

function GeneOverview({
  overview,
  fetchedAt,
}: {
  overview: GeneOverviewType | null
  fetchedAt?: Date | null
}) {
  if (!overview) return null
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
      <div className="flex items-start gap-4 mb-4">
        <div className="flex-1">
          <DataPoint sourceKey="mygene" fetchedAt={fetchedAt} label="Gene symbol (MyGene)" recordUrl={overview.url}>
            <h2 className="text-2xl font-bold text-indigo-300">{overview.symbol}</h2>
            <p className="text-sm text-slate-400 mt-0.5">{overview.name}</p>
          </DataPoint>
        </div>
        <div className="flex flex-wrap gap-1.5 shrink-0">
          {overview.typeOfGene && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-900/40 text-indigo-300 border border-indigo-800/50">{overview.typeOfGene}</span>
          )}
          {overview.chromosome && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-300 border border-emerald-800/50">chr {overview.chromosome}</span>
          )}
        </div>
      </div>

      {overview.summary && (
        <DataPoint sourceKey="ncbi-gene" fetchedAt={fetchedAt} label="Gene summary" recordUrl={overview.url}>
          <div className="mb-4">
            <DescriptionTip text={overview.summary} label="Gene summary" />
          </div>
        </DataPoint>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
        <DataPoint sourceKey="ncbi-gene" fetchedAt={fetchedAt} label="Entrez Gene" recordUrl={overview.url}>
          <div><span className="text-slate-500">Entrez:</span> <a href={overview.url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">{overview.geneId}</a></div>
        </DataPoint>
        {overview.ensemblId && (
          <DataPoint
            sourceKey="ensembl"
            fetchedAt={fetchedAt}
            label="Ensembl gene"
            recordUrl={`https://ensembl.org/Homo_sapiens/Gene/Summary?g=${overview.ensemblId}`}
          >
            <div><span className="text-slate-500">Ensembl:</span> <a href={`https://ensembl.org/Homo_sapiens/Gene/Summary?g=${overview.ensemblId}`} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">{overview.ensemblId}</a></div>
          </DataPoint>
        )}
        {overview.uniprotId && (
          <DataPoint
            sourceKey="uniprot"
            fetchedAt={fetchedAt}
            label="UniProt"
            recordUrl={`https://www.uniprot.org/uniprot/${overview.uniprotId}`}
          >
            <div><span className="text-slate-500">UniProt:</span> <a href={`https://www.uniprot.org/uniprot/${overview.uniprotId}`} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">{overview.uniprotId}</a></div>
          </DataPoint>
        )}
      </div>

      {(() => {
        const list = normalizeAliases(overview.aliases)
        if (list.length === 0) return null
        return (
        <div className="mt-3 flex flex-wrap items-center gap-1">
          <span className="text-xs text-slate-500 mr-1">Aliases:</span>
          {list.map((a) => (
            <GeneAliasChip key={a} alias={a} size="xs" />
          ))}
        </div>
        )
      })()}
    </div>
  )
}

function GeneDiseasesPanel({
  data,
  status,
  geneSymbol,
  fetchedAt,
}: {
  data: Record<string, unknown> | null
  status?: SectionStatus
  geneSymbol?: string
  fetchedAt?: Date | null
}) {
  void fetchedAt
  const geneDiseases = data?.geneDiseases as Record<string, unknown> | undefined
  type DisgenetRow = {
    diseaseName: string
    score: number
    diseaseId: string
    source: string
    geneSymbol?: string
  }
  type GwasRow = {
    trait?: string
    diseaseTrait?: string
    pValue?: string | number
    pubmedId?: string
    url?: string
  }
  type ClingenRow = {
    diseaseName?: string
    name?: string
    score?: number
    url?: string
    mondoId?: string
    validityClassification?: string
  }

  const diseases = (geneDiseases?.disgenetAssociations ?? []) as DisgenetRow[]
  const gwas = (geneDiseases?.gwasAssociations ?? []) as GwasRow[]
  const clingen = (geneDiseases?.clingenGeneDiseases ?? []) as ClingenRow[]

  const disgenetSort = useMemo(
    () => [
      ...numberSortOptions<DisgenetRow>((d) => d.score ?? 0, {
        high: 'Score high→low',
        low: 'Score low→high',
        idPrefix: 'score',
      }),
      ...alphaSortOptions<DisgenetRow>((d) => d.diseaseName || ''),
    ],
    [],
  )
  const gwasSort = useMemo(
    () => [...alphaSortOptions<GwasRow>((g) => g.trait || g.diseaseTrait || '')],
    [],
  )
  const clingenSort = useMemo(
    () => [
      ...alphaSortOptions<ClingenRow>((c) => c.diseaseName || c.name || ''),
      ...numberSortOptions<ClingenRow>((c) => c.score ?? 0, {
        high: 'Score high→low',
        low: 'Score low→high',
        idPrefix: 'cscore',
      }),
    ],
    [],
  )

  if (status?.status === 'error') {
    return <ErrorSection label="disease associations" error={status.error} />
  }

  const hasDisgenet = diseases.length > 0
  const hasGwas = gwas.length > 0
  const hasClingen = clingen.length > 0

  if (!hasDisgenet && !hasGwas && !hasClingen) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 opacity-30" data-empty="true">
        <EmptySection
          label="disease associations"
          hint="DisGeNET / GWAS / ClinGen may not have associations for this gene"
        />
      </div>
    )
  }

  const gridDg =
    'grid grid-cols-[minmax(0,1.4fr)_minmax(5rem,0.55fr)_minmax(4rem,0.45fr)_minmax(4.5rem,0.5fr)_2.5rem] gap-x-2'
  const gridGwas =
    'grid grid-cols-[minmax(0,1.5fr)_minmax(5rem,0.55fr)_minmax(4.5rem,0.5fr)_2.5rem] gap-x-2'
  const gridCg =
    'grid grid-cols-[minmax(0,1.3fr)_minmax(5rem,0.6fr)_minmax(4rem,0.45fr)_2.5rem] gap-x-2'

  return (
    <div className="space-y-3" data-testid="gene-diseases-cards">
      <p className="text-[10px] text-slate-600 px-0.5">
        Disease association tables (DisGeNET, GWAS Catalog, ClinGen). Open rows for source records.
      </p>

      {hasDisgenet && (
        <ExpressionSourceCard
          title={`DisGeNET Associations (${diseases.length})`}
          subtitle="Disease · ID · source · association score · Discover deep link."
          testId="gene-disgenet-diseases"
        >
          <FilterablePaginatedList
            items={diseases}
            getSearchText={(d) =>
              [d.diseaseName, d.diseaseId, d.source, String(d.score)].filter(Boolean).join(' ')
            }
            sortOptions={disgenetSort}
            defaultSortId="score-desc"
            filterPlaceholder="Filter diseases…"
            getKey={(d, i) => `${d.diseaseId}-${i}`}
            pageSize={15}
            className="space-y-0"
            csvExport={{
              filename: `disgenet-${geneSymbol || 'gene'}.csv`,
              columns: [
                { header: 'Disease', get: (d) => d.diseaseName },
                { header: 'ID', get: (d) => d.diseaseId },
                { header: 'Source', get: (d) => d.source },
                { header: 'Score', get: (d) => d.score },
              ],
            }}
            renderItem={(d, index) => {
              const discoverHref = buildDiscoverHref({
                q: d.diseaseName,
                targets: geneSymbol ? [geneSymbol] : undefined,
              })
              const recordUrl = d.diseaseId
                ? `https://www.disgenet.org/browser/0/1/0/${encodeURIComponent(d.diseaseId)}/`
                : discoverHref
              return (
                <div>
                  {index === 0 && (
                    <div
                      className={`${gridDg} px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-700/80`}
                    >
                      <span>Disease</span>
                      <span>ID</span>
                      <span>Source</span>
                      <span className="text-right">Score</span>
                      <span className="text-right">Open</span>
                    </div>
                  )}
                  <div
                    className={`${gridDg} items-center px-2 py-1.5 border-b border-slate-700/50 last:border-0 hover:bg-slate-800/40`}
                  >
                    <div className="min-w-0 flex items-center gap-1.5">
                      <Link
                        href={`/disease?q=${encodeURIComponent(d.diseaseName)}`}
                        className="text-sm text-slate-100 hover:text-cyan-200 truncate"
                      >
                        {d.diseaseName}
                      </Link>
                      <StyledTooltip content="Rank candidates in Discover">
                        <Link
                          href={discoverHref}
                          className="shrink-0 text-[9px] px-1.5 py-0.5 rounded border border-emerald-800/50 text-emerald-400 hover:border-emerald-500"
                        >
                          Discover
                        </Link>
                      </StyledTooltip>
                    </div>
                    <span
                      className={`text-[10px] font-mono text-slate-500 truncate ${emptyDataClass(!d.diseaseId)}`}
                    >
                      {d.diseaseId || '—'}
                    </span>
                    <span className="text-[10px] text-slate-500 truncate">{d.source || '—'}</span>
                    <span className="text-[11px] font-mono tabular-nums text-right text-emerald-400/90">
                      {typeof d.score === 'number' ? d.score.toFixed(2) : '—'}
                    </span>
                    <a
                      href={recordUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-cyan-400 text-right"
                      onClick={() =>
                        onDeepLinkClick('disgenet', recordUrl, {
                          panelId: 'gene-diseases',
                          label: d.diseaseName,
                        })
                      }
                    >
                     
                    </a>
                  </div>
                </div>
              )
            }}
          />
        </ExpressionSourceCard>
      )}

      {hasGwas && (
        <ExpressionSourceCard
          title={`GWAS Catalog (${gwas.length})`}
          subtitle="Trait · p-value · PubMed · open."
          testId="gene-gwas-diseases"
        >
          <FilterablePaginatedList
            items={gwas}
            getSearchText={(g) =>
              [g.trait, g.diseaseTrait, String(g.pValue ?? ''), g.pubmedId]
                .filter(Boolean)
                .join(' ')
            }
            sortOptions={gwasSort}
            defaultSortId="name-asc"
            filterPlaceholder="Filter GWAS traits…"
            getKey={(g, i) => `${g.trait || g.diseaseTrait}-${i}`}
            pageSize={15}
            className="space-y-0"
            csvExport={{
              filename: `gwas-${geneSymbol || 'gene'}.csv`,
              columns: [
                { header: 'Trait', get: (g) => g.trait || g.diseaseTrait },
                { header: 'pValue', get: (g) => g.pValue },
                { header: 'PubMed', get: (g) => g.pubmedId },
                { header: 'URL', get: (g) => g.url },
              ],
            }}
            renderItem={(g, index) => {
              const trait = g.trait || g.diseaseTrait || '—'
              const href =
                g.url ||
                (g.pubmedId
                  ? `https://pubmed.ncbi.nlm.nih.gov/${g.pubmedId}/`
                  : 'https://www.ebi.ac.uk/gwas/')
              const p = g.pValue != null ? String(g.pValue) : '—'
              return (
                <div>
                  {index === 0 && (
                    <div
                      className={`${gridGwas} px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-700/80`}
                    >
                      <span>Trait</span>
                      <span className="text-right">p-value</span>
                      <span>PubMed</span>
                      <span className="text-right">Open</span>
                    </div>
                  )}
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      onDeepLinkClick('gwas-catalog', href, {
                        panelId: 'gene-diseases',
                        label: trait,
                      })
                    }
                    className={`${gridGwas} items-center px-2 py-1.5 border-b border-slate-700/50 last:border-0 hover:bg-slate-800/60 group`}
                  >
                    <span className="text-sm text-slate-100 group-hover:text-cyan-200 truncate">
                      {trait}
                    </span>
                    <span
                      className={`text-[11px] font-mono tabular-nums text-right text-slate-400 ${emptyDataClass(p === '—')}`}
                    >
                      {p}
                    </span>
                    <span
                      className={`text-[10px] font-mono text-slate-500 truncate ${emptyDataClass(!g.pubmedId)}`}
                    >
                      {g.pubmedId || '—'}
                    </span>
</a>
                </div>
              )
            }}
          />
        </ExpressionSourceCard>
      )}

      {hasClingen && (
        <ExpressionSourceCard
          title={`ClinGen Gene–Disease (${clingen.length})`}
          subtitle="Disease · validity/score · open."
          testId="gene-clingen-diseases"
        >
          <FilterablePaginatedList
            items={clingen}
            getSearchText={(c) =>
              [c.diseaseName, c.name, c.validityClassification, String(c.score ?? '')]
                .filter(Boolean)
                .join(' ')
            }
            sortOptions={clingenSort}
            defaultSortId="name-asc"
            filterPlaceholder="Filter ClinGen…"
            getKey={(c, i) => `${c.diseaseName || c.name}-${i}`}
            pageSize={12}
            className="space-y-0"
            renderItem={(c, index) => {
              const name = c.diseaseName || c.name || '—'
              const href =
                c.url ||
                (c.mondoId
                  ? `https://monarchinitiative.org/disease/${encodeURIComponent(c.mondoId)}`
                  : 'https://clinicalgenome.org/')
              const validity =
                c.validityClassification ||
                (c.score != null ? String(c.score) : '—')
              return (
                <div>
                  {index === 0 && (
                    <div
                      className={`${gridCg} px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-700/80`}
                    >
                      <span>Disease</span>
                      <span>Validity</span>
                      <span className="text-right">Score</span>
                      <span className="text-right">Open</span>
                    </div>
                  )}
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${gridCg} items-center px-2 py-1.5 border-b border-slate-700/50 last:border-0 hover:bg-slate-800/60 group`}
                  >
                    <span className="text-sm text-slate-100 group-hover:text-cyan-200 truncate">
                      {name}
                    </span>
                    <span
                      className={`text-[11px] text-slate-400 truncate ${emptyDataClass(validity === '—')}`}
                    >
                      {validity}
                    </span>
                    <span className="text-[11px] font-mono tabular-nums text-right text-slate-500">
                      {c.score != null ? c.score : '—'}
                    </span>
</a>
                </div>
              )
            }}
          />
        </ExpressionSourceCard>
      )}
    </div>
  )
}

function significanceBadgeClass(sig: string | undefined): string {
  const lower = (sig || '').toLowerCase()
  if (lower.includes('pathogenic') && !lower.includes('likely')) {
    return 'bg-red-900/40 text-red-300 border-red-700/30'
  }
  if (lower.includes('likely pathogenic')) {
    return 'bg-rose-900/40 text-rose-300 border-rose-700/30'
  }
  if (lower.includes('benign')) {
    return 'bg-slate-700/60 text-slate-300 border-slate-600/40'
  }
  if (lower.includes('drug') || lower.includes('risk')) {
    return 'bg-amber-900/40 text-amber-300 border-amber-700/30'
  }
  if (!sig || sig === '—' || sig === 'N/A') {
    return 'bg-slate-800/60 text-slate-500 border-slate-700/40'
  }
  return 'bg-yellow-900/40 text-yellow-300 border-yellow-700/30'
}

function formatLocus(chromosome?: string | number | null, position?: string | number | null): string {
  const chr = chromosome != null && String(chromosome).trim() ? String(chromosome).trim() : ''
  const pos =
    position != null && Number(position) > 0
      ? Number(position).toLocaleString()
      : position != null && String(position).trim() && String(position) !== '0'
        ? String(position)
        : ''
  if (chr && pos) return `chr${chr.replace(/^chr/i, '')}:${pos}`
  if (chr) return `chr${chr.replace(/^chr/i, '')}`
  if (pos) return pos
  return '—'
}

function dbsnpRecordUrl(v: dbSNPVariant): string {
  if (v.url?.includes('ncbi.nlm.nih.gov/snp')) return v.url
  const rs = (v.rsId || v.refSNPId || '').toString().replace(/^rs/i, '')
  if (!rs) return 'https://www.ncbi.nlm.nih.gov/snp/'
  return `https://www.ncbi.nlm.nih.gov/snp/rs${rs}`
}

function GeneVariantsPanel({
  data,
  fetchedAt,
}: {
  data: Record<string, unknown> | null
  fetchedAt?: Date | null
}) {
  const geneVariants = data?.geneVariants as Record<string, unknown> | undefined
  const clinvarVariants = (geneVariants?.clinvarVariants ?? []) as ClinVarVariant[]
  const dbsnpVariants = (geneVariants?.dbsnpVariants ?? []) as dbSNPVariant[]
  const clingenDosage = geneVariants?.clingenDosage as
    | {
        geneSymbol?: string
        haploinsufficiency?: string
        triplosensitivity?: string
        url?: string
      }
    | null
    | undefined

  const hasClinvar = clinvarVariants.length > 0
  const hasDbsnp = dbsnpVariants.length > 0
  const hasClingen =
    Boolean(clingenDosage) &&
    Boolean(
      clingenDosage?.haploinsufficiency ||
        clingenDosage?.triplosensitivity ||
        clingenDosage?.url ||
        clingenDosage?.geneSymbol,
    )

  const clinvarSort = useMemo(
    () => [
      ...alphaSortOptions<ClinVarVariant>((v) => v.title || v.variantId || ''),
      ...alphaSortOptions<ClinVarVariant>((v) => v.clinicalSignificance || '').map((o) => ({
        ...o,
        id: `sig-${o.id}`,
        label: o.id.includes('asc') ? 'Significance A–Z' : 'Significance Z–A',
      })),
      ...alphaSortOptions<ClinVarVariant>((v) => v.conditionName || v.condition || '').map((o) => ({
        ...o,
        id: `cond-${o.id}`,
        label: o.id.includes('asc') ? 'Condition A–Z' : 'Condition Z–A',
      })),
    ],
    [],
  )

  const dbsnpSort = useMemo(
    () => [
      ...alphaSortOptions<dbSNPVariant>((v) => v.rsId || v.refSNPId || ''),
      ...numberSortOptions<dbSNPVariant>((v) => v.position || 0, {
        high: 'Position high→low',
        low: 'Position low→high',
        idPrefix: 'pos',
      }),
      ...alphaSortOptions<dbSNPVariant>((v) => v.clinicalSignificance || '').map((o) => ({
        ...o,
        id: `csig-${o.id}`,
        label: o.id.includes('asc') ? 'Clinical A–Z' : 'Clinical Z–A',
      })),
      ...numberSortOptions<dbSNPVariant>((v) => v.frequency || 0, {
        high: 'Freq high→low',
        low: 'Freq low→high',
        idPrefix: 'freq',
      }),
    ],
    [],
  )

  if (!hasClinvar && !hasDbsnp && !hasClingen) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 opacity-20" data-empty="true">
        <div className="text-slate-500 text-sm py-2">No variant data found.</div>
      </div>
    )
  }

  const gridClinvar =
    'grid grid-cols-[minmax(0,1.4fr)_minmax(5.5rem,0.7fr)_minmax(0,1fr)_minmax(4.5rem,0.55fr)_minmax(5rem,0.65fr)_2.5rem] gap-x-2'
  const gridDbsnp =
    'grid grid-cols-[minmax(5.5rem,0.7fr)_minmax(6rem,0.75fr)_minmax(4rem,0.55fr)_minmax(0,0.9fr)_minmax(3.5rem,0.45fr)_2.5rem] gap-x-2'

  return (
    <div className="space-y-3" data-testid="gene-variants-cards">
      <p className="text-[10px] text-slate-600 px-0.5">
        Variant tables from ClinVar, dbSNP, and ClinGen dosage. Open a row for the source record.
      </p>

      {hasClinvar && (
        <ExpressionSourceCard
          title={`ClinVar Variants (${clinvarVariants.length})`}
          subtitle="Clinical significance, conditions, and review status from ClinVar."
          testId="gene-clinvar-variants"
        >
          <FilterablePaginatedList
            items={clinvarVariants}
            getSearchText={(v) =>
              [
                v.title,
                v.variantId,
                v.clinicalSignificance,
                v.geneSymbol,
                v.gene,
                v.conditionName,
                v.condition,
                v.reviewStatus,
                v.variantType,
                v.chromosome,
              ]
                .filter(Boolean)
                .join(' ')
            }
            sortOptions={clinvarSort}
            defaultSortId="name-asc"
            filterPlaceholder="Filter ClinVar (title, significance, condition…)"
            getKey={(v, i) => `${v.variantId || v.title}-${i}`}
            pageSize={10}
            className="space-y-0"
            renderItem={(v, index) => {
              const href =
                v.url ||
                (v.variantId
                  ? `https://www.ncbi.nlm.nih.gov/clinvar/variation/${v.variantId}/`
                  : 'https://www.ncbi.nlm.nih.gov/clinvar/')
              const title = v.title || v.variantId || 'Variant'
              const sig = v.clinicalSignificance || '—'
              const condition = v.conditionName || v.condition || '—'
              const locus = formatLocus(v.chromosome, v.position)
              const review = v.reviewStatus || '—'
              return (
                <div>
                  {index === 0 && (
                    <div
                      className={`${gridClinvar} px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-700/80`}
                      role="row"
                    >
                      <span>Variant</span>
                      <span>Significance</span>
                      <span>Condition</span>
                      <span>Locus</span>
                      <span>Review</span>
                      <span className="text-right">Open</span>
                    </div>
                  )}
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${title} in ClinVar`}
                    onClick={() =>
                      onDeepLinkClick('clinvar', href, {
                        panelId: 'gene-variants',
                        label: String(v.variantId || title),
                      })
                    }
                    className={`${gridClinvar} items-center px-2 py-2 border-b border-slate-700/50 last:border-0 hover:bg-slate-800/60 transition-colors group`}
                  >
                    <div className="min-w-0">
                      <div className="text-sm text-slate-100 group-hover:text-cyan-200 truncate">
                        {title}
                      </div>
                      <div className="text-[10px] font-mono text-slate-600 truncate">
                        {[v.variantId, v.variantType, v.geneSymbol || v.gene]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </div>
                    </div>
                    <StyledTooltip content={sig === '—' ? undefined : sig}>
                      <span
                        className={`justify-self-start text-[10px] border px-1.5 py-0.5 rounded truncate max-w-full ${significanceBadgeClass(sig)} ${emptyDataClass(isEmptyMetric(sig === '—' ? null : sig))}`}
                      >
                        {sig}
                      </span>
                    </StyledTooltip>
                    <StyledTooltip content={condition === '—' ? undefined : condition}>
                      <span
                        className={`text-xs text-slate-300 truncate ${emptyDataClass(isEmptyMetric(condition === '—' ? null : condition))}`}
                      >
                        {condition}
                      </span>
                    </StyledTooltip>
                    <span
                      className={`text-[11px] font-mono text-slate-400 truncate ${emptyDataClass(locus === '—')}`}
                    >
                      {locus}
                    </span>
                    <StyledTooltip content={review === '—' ? undefined : review}>
                      <span
                        className={`text-[10px] text-slate-500 truncate ${emptyDataClass(isEmptyMetric(review === '—' ? null : review))}`}
                      >
                        {review}
                      </span>
                    </StyledTooltip>
</a>
                </div>
              )
            }}
          />
        </ExpressionSourceCard>
      )}

      {hasDbsnp && (
        <ExpressionSourceCard
          title={`dbSNP Variants (${dbsnpVariants.length})`}
          subtitle="Reference SNPs with locus, alleles, clinical flags, and allele frequency."
          testId="gene-dbsnp-variants"
        >
          <FilterablePaginatedList
            items={dbsnpVariants}
            getSearchText={(v) =>
              [
                v.rsId,
                v.refSNPId,
                v.chromosome,
                String(v.position),
                v.alleles,
                v.clinicalSignificance,
                v.clinicalAllele,
                ...(Array.isArray(v.genes) ? v.genes : []),
              ]
                .filter(Boolean)
                .join(' ')
            }
            sortOptions={dbsnpSort}
            defaultSortId="name-asc"
            filterPlaceholder="Filter dbSNP (rsID, alleles, clinical…)"
            getKey={(v, i) => `${v.rsId || v.refSNPId}-${i}`}
            pageSize={10}
            className="space-y-0"
            renderItem={(v, index) => {
              const rsRaw = v.rsId || (v.refSNPId ? `rs${v.refSNPId}` : '')
              const rs = rsRaw
                ? String(rsRaw).startsWith('rs')
                  ? String(rsRaw)
                  : `rs${rsRaw}`
                : '—'
              const href = dbsnpRecordUrl(v)
              const locus = formatLocus(v.chromosome, v.position)
              const alleles = v.alleles?.trim() || '—'
              const clinical = v.clinicalSignificance?.trim() || (v.clinical ? 'Clinical' : '—')
              const freq =
                typeof v.frequency === 'number' && v.frequency > 0
                  ? v.frequency < 0.01
                    ? v.frequency.toExponential(2)
                    : v.frequency.toFixed(4)
                  : '—'
              return (
                <div>
                  {index === 0 && (
                    <div
                      className={`${gridDbsnp} px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-700/80`}
                      role="row"
                    >
                      <span>rsID</span>
                      <span>Locus</span>
                      <span>Alleles</span>
                      <span>Clinical</span>
                      <span className="text-right">Freq</span>
                      <span className="text-right">Open</span>
                    </div>
                  )}
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${rs} in dbSNP`}
                    onClick={() =>
                      onDeepLinkClick('dbsnp', href, {
                        panelId: 'gene-variants',
                        label: rs,
                      })
                    }
                    className={`${gridDbsnp} items-center px-2 py-2 border-b border-slate-700/50 last:border-0 hover:bg-slate-800/60 transition-colors group`}
                  >
                    <span className="text-sm font-mono text-indigo-300 group-hover:text-indigo-200 truncate">
                      {rs}
                    </span>
                    <span
                      className={`text-[11px] font-mono text-slate-300 truncate ${emptyDataClass(locus === '—')}`}
                    >
                      {locus}
                    </span>
                    <StyledTooltip content={alleles === '—' ? undefined : alleles}>
                      <span
                        className={`text-xs font-mono text-teal-300/90 truncate ${emptyDataClass(alleles === '—')}`}
                      >
                        {alleles}
                      </span>
                    </StyledTooltip>
                    <StyledTooltip
                      content={[clinical, v.clinicalAllele, v.reviewed ? 'reviewed' : '']
                        .filter(Boolean)
                        .join(' · ')}
                    >
                      <span
                        className={`justify-self-start text-[10px] border px-1.5 py-0.5 rounded truncate max-w-full ${significanceBadgeClass(clinical)} ${emptyDataClass(clinical === '—')}`}
                      >
                        {clinical}
                      </span>
                    </StyledTooltip>
                    <span
                      className={`text-[11px] font-mono tabular-nums text-right text-slate-400 ${emptyDataClass(freq === '—')}`}
                    >
                      {freq}
                    </span>
</a>
                </div>
              )
            }}
          />
        </ExpressionSourceCard>
      )}

      {hasClingen && clingenDosage && (
        <ExpressionSourceCard
          title="ClinGen Dosage Sensitivity"
          subtitle="Haploinsufficiency / triplosensitivity scores from ClinGen."
          testId="gene-clingen-dosage"
        >
          <div
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_2.5rem] gap-x-2"
            data-testid="gene-clingen-dosage-table"
          >
            <div className="grid grid-cols-subgrid col-span-4 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-700/80">
              <span>Gene</span>
              <span>Haploinsufficiency</span>
              <span>Triplosensitivity</span>
              <span className="text-right">Open</span>
            </div>
            {clingenDosage.url ? (
              <a
                href={clingenDosage.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  onDeepLinkClick('clingen', clingenDosage.url!, {
                    panelId: 'gene-variants',
                    label: clingenDosage.geneSymbol || 'ClinGen',
                  })
                }
                className="grid grid-cols-subgrid col-span-4 items-center px-2 py-2 hover:bg-slate-800/60 transition-colors group"
              >
                <span className="text-sm font-medium text-slate-100 group-hover:text-cyan-200">
                  {clingenDosage.geneSymbol || '—'}
                </span>
                <span
                  className={`text-xs text-slate-300 ${emptyDataClass(!clingenDosage.haploinsufficiency)}`}
                >
                  {clingenDosage.haploinsufficiency || '—'}
                </span>
                <span
                  className={`text-xs text-slate-300 ${emptyDataClass(!clingenDosage.triplosensitivity)}`}
                >
                  {clingenDosage.triplosensitivity || '—'}
                </span>
</a>
            ) : (
              <div className="grid grid-cols-subgrid col-span-4 items-center px-2 py-2">
                <span className="text-sm font-medium text-slate-100">
                  {clingenDosage.geneSymbol || '—'}
                </span>
                <span className="text-xs text-slate-300">
                  {clingenDosage.haploinsufficiency || '—'}
                </span>
                <span className="text-xs text-slate-300">
                  {clingenDosage.triplosensitivity || '—'}
                </span>
                <span className="text-xs text-slate-600 text-right">—</span>
              </div>
            )}
          </div>
          {fetchedAt && (
            <p className="mt-2 text-[10px] text-slate-600 px-2">
              Retrieved {fetchedAt.toLocaleString()}
            </p>
          )}
        </ExpressionSourceCard>
      )}
    </div>
  )
}

/** Shared shell for each expression source so they render as separate main cards. */
function ExpressionSourceCard({
  title,
  subtitle,
  testId,
  children,
  empty,
}: {
  title: string
  subtitle?: string
  testId?: string
  children: ReactNode
  empty?: boolean
}) {
  return (
    <div
      data-testid={testId}
      className={`bg-slate-800/50 border border-slate-700 rounded-xl p-5 ${empty ? 'opacity-20' : ''}`}
    >
      <h3 className="text-sm font-semibold text-slate-100 mb-0.5">{title}</h3>
      {subtitle && <p className="text-[10px] text-slate-600 mb-3 leading-relaxed">{subtitle}</p>}
      {children}
    </div>
  )
}

function formatAnatId(id: string | undefined): string {
  if (!id) return ''
  return id
    .replace(/^UBERON_/, 'UBERON:')
    .replace(/^CL_/, 'CL:')
    .replace(/^HsapDv_/, 'HsapDv:')
}

function bgeePresenceLabel(level: string | undefined): { text: string; className: string } {
  const l = (level || '').trim()
  if (!l || l.toLowerCase() === 'present') {
    return {
      text: 'expressed',
      className: 'bg-emerald-900/40 text-emerald-300 border-emerald-800/40',
    }
  }
  const low = l.toLowerCase()
  if (low.includes('absent')) {
    return {
      text: l,
      className: 'bg-rose-900/30 text-rose-300 border-rose-800/40',
    }
  }
  return {
    text: l,
    className: 'bg-slate-800/60 text-slate-300 border-slate-700/50',
  }
}

type GtexTissueRow = { tissueName?: string; tpm?: number; geneSymbol?: string }

function GeneExpressionPanel({
  data,
  fetchedAt,
}: {
  data: Record<string, unknown> | null
  fetchedAt?: Date | null
}) {
  void fetchedAt
  const gtexExps = ((data?.geneExpressionData as Record<string, unknown>)?.gtexExpressions ??
    []) as GtexTissueRow[]
  const bgeeExps = ((data?.geneExpressionData as Record<string, unknown>)?.bgeeExpressions ??
    []) as BgeeExpression[]
  const atlasData = ((data?.geneExpressionData as Record<string, unknown>)?.expressionAtlasData ??
    []) as GeneExpression[]

  const hasGtex = gtexExps.length > 0
  const hasBgee = bgeeExps.length > 0
  const hasAtlas = atlasData.length > 0

  const gtexSort = useMemo(
    () => [
      ...numberSortOptions<GtexTissueRow>((e) => e.tpm ?? 0, {
        high: 'TPM high→low',
        low: 'TPM low→high',
        idPrefix: 'tpm',
      }),
      ...alphaSortOptions<GtexTissueRow>((e) => e.tissueName || ''),
    ],
    [],
  )

  const bgeeSort = useMemo(
    () => [
      ...alphaSortOptions<BgeeExpression>((e) => e.anatomicalEntityName || ''),
      ...alphaSortOptions<BgeeExpression>((e) => e.developmentalStageName || '').map((o) => ({
        ...o,
        id: `stage-${o.id}`,
        label: o.id.includes('asc') ? 'Stage A–Z' : 'Stage Z–A',
      })),
      ...numberSortOptions<BgeeExpression>((e) => e.expressionScore ?? 0, {
        high: 'Score high→low',
        low: 'Score low→high',
        idPrefix: 'score',
      }),
    ],
    [],
  )

  const atlasSort = useMemo(
    () => [
      ...alphaSortOptions<GeneExpression>((e) => e.experimentDescription || e.experimentType || ''),
      ...alphaSortOptions<GeneExpression>((e) => e.experimentType || '').map((o) => ({
        ...o,
        id: `type-${o.id}`,
        label: o.id.includes('asc') ? 'Type A–Z' : 'Type Z–A',
      })),
      ...alphaSortOptions<GeneExpression>((e) => e.tissueName || e.condition || '').map((o) => ({
        ...o,
        id: `tissue-${o.id}`,
        label: o.id.includes('asc') ? 'Tissue A–Z' : 'Tissue Z–A',
      })),
      ...numberSortOptions<GeneExpression>((e) => e.expressionLevel ?? 0, {
        high: 'Level high→low',
        low: 'Level low→high',
        idPrefix: 'level',
      }),
    ],
    [],
  )

  if (!hasGtex && !hasBgee && !hasAtlas) {
    return (
      <div
        className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 opacity-20"
        data-empty="true"
      >
        <div className="text-slate-500 text-sm py-2">No expression data found.</div>
      </div>
    )
  }

  const gridGtex = 'grid grid-cols-[minmax(0,1fr)_5rem_2.5rem] gap-x-2'
  const gridBgee =
    'grid grid-cols-[minmax(0,1.1fr)_minmax(5.5rem,0.7fr)_minmax(0,0.9fr)_minmax(4.5rem,0.55fr)_minmax(3.5rem,0.4fr)_2.5rem] gap-x-2'
  const gridAtlas =
    'grid grid-cols-[minmax(0,1.4fr)_minmax(4.5rem,0.55fr)_minmax(0,0.9fr)_minmax(4rem,0.5fr)_minmax(4rem,0.45fr)_2.5rem] gap-x-2'

  return (
    <div className="space-y-3" data-testid="gene-expression-cards">
      <p className="text-[10px] text-slate-600 px-0.5">
        Expression tables from GTEx, Bgee, and Expression Atlas. Open a row for the source record.
      </p>

      {hasGtex && (
        <ExpressionSourceCard
          title={`GTEx Top Tissues (${gtexExps.length})`}
          subtitle="Tissue-level TPM from GTEx Portal."
          testId="gene-gtex-expression"
        >
          <FilterablePaginatedList
            items={gtexExps}
            getSearchText={(e) => [e.tissueName, e.geneSymbol, String(e.tpm ?? '')].filter(Boolean).join(' ')}
            sortOptions={gtexSort}
            defaultSortId="tpm-desc"
            filterPlaceholder="Filter GTEx tissues…"
            getKey={(e, i) => `${e.tissueName}-${i}`}
            pageSize={15}
            className="space-y-0"
            renderItem={(e, index) => {
              const gene = e.geneSymbol?.trim()
              const href = gene
                ? `https://gtexportal.org/home/gene/${encodeURIComponent(gene)}`
                : 'https://gtexportal.org/home/'
              const tissue = e.tissueName || '—'
              const tpm =
                typeof e.tpm === 'number' && Number.isFinite(e.tpm) ? e.tpm.toFixed(1) : '—'
              return (
                <div>
                  {index === 0 && (
                    <div
                      className={`${gridGtex} px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-700/80`}
                    >
                      <span>Tissue</span>
                      <span className="text-right">TPM</span>
                      <span className="text-right">Open</span>
                    </div>
                  )}
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${tissue} on GTEx`}
                    onClick={() =>
                      onDeepLinkClick('gtex', href, {
                        panelId: 'gene-expression',
                        label: tissue,
                      })
                    }
                    className={`${gridGtex} items-center px-2 py-1.5 border-b border-slate-700/50 last:border-0 hover:bg-slate-800/60 transition-colors group`}
                  >
                    <StyledTooltip content={tissue === '—' ? undefined : tissue}>
                      <span className="text-sm text-slate-200 group-hover:text-cyan-200 truncate">
                        {tissue}
                      </span>
                    </StyledTooltip>
                    <span
                      className={`text-xs font-mono tabular-nums text-right text-indigo-300 ${emptyDataClass(tpm === '—')}`}
                    >
                      {tpm}
                    </span>
</a>
                </div>
              )
            }}
          />
        </ExpressionSourceCard>
      )}

      {hasBgee && (
        <ExpressionSourceCard
          title={`Bgee Expression (${bgeeExps.length})`}
          subtitle="Anatomy, ontology id, developmental stage, presence, and score."
          testId="gene-bgee-expression"
        >
          <FilterablePaginatedList
            items={bgeeExps}
            getSearchText={(e) =>
              [
                e.anatomicalEntityName,
                e.anatomicalEntityId,
                e.developmentalStageName,
                e.developmentalStageId,
                e.expressionLevel,
                e.geneSymbol,
                e.species,
              ]
                .filter(Boolean)
                .join(' ')
            }
            sortOptions={bgeeSort}
            defaultSortId="name-asc"
            filterPlaceholder="Filter Bgee (tissue, stage, UBERON…)"
            getKey={(e, i) =>
              `${e.anatomicalEntityId}-${e.developmentalStageId}-${i}`
            }
            pageSize={20}
            className="space-y-0"
            renderItem={(e, index) => {
              const href = bgeeRecordUrl(e)
              const anat = e.anatomicalEntityName || '—'
              const anatId = formatAnatId(e.anatomicalEntityId) || '—'
              const stage = e.developmentalStageName?.trim() || '—'
              const presence = bgeePresenceLabel(e.expressionLevel)
              const score =
                typeof e.expressionScore === 'number' && e.expressionScore > 0
                  ? e.expressionScore.toFixed(2)
                  : '—'
              return (
                <div>
                  {index === 0 && (
                    <div
                      className={`${gridBgee} px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-700/80`}
                    >
                      <span>Anatomy</span>
                      <span>Ontology</span>
                      <span>Stage</span>
                      <span>Presence</span>
                      <span className="text-right">Score</span>
                      <span className="text-right">Open</span>
                    </div>
                  )}
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${anat} in Bgee`}
                    onClick={() =>
                      onDeepLinkClick('bgee', href, {
                        panelId: 'gene-expression',
                        label: anat,
                      })
                    }
                    className={`${gridBgee} items-center px-2 py-1.5 border-b border-slate-700/50 last:border-0 hover:bg-slate-800/60 transition-colors group`}
                  >
                    <StyledTooltip content={anat === '—' ? undefined : anat}>
                      <span className="text-sm text-slate-100 group-hover:text-cyan-200 truncate">
                        {anat}
                      </span>
                    </StyledTooltip>
                    <StyledTooltip content={anatId === '—' ? undefined : anatId}>
                      <span
                        className={`text-[10px] font-mono text-slate-500 truncate ${emptyDataClass(anatId === '—')}`}
                      >
                        {anatId}
                      </span>
                    </StyledTooltip>
                    <StyledTooltip content={stage === '—' ? undefined : stage}>
                      <span
                        className={`text-[11px] text-slate-400 truncate ${emptyDataClass(stage === '—')}`}
                      >
                        {stage}
                      </span>
                    </StyledTooltip>
                    <span
                      className={`justify-self-start text-[9px] px-1.5 py-0.5 rounded border truncate max-w-full ${presence.className}`}
                    >
                      {presence.text}
                    </span>
                    <span
                      className={`text-[11px] font-mono tabular-nums text-right text-emerald-400/90 ${emptyDataClass(score === '—')}`}
                    >
                      {score}
                    </span>
</a>
                </div>
              )
            }}
          />
        </ExpressionSourceCard>
      )}

      {hasAtlas && (
        <ExpressionSourceCard
          title={`Expression Atlas (${atlasData.length})`}
          subtitle="Experiment, type, tissue/condition, expression level, and species."
          testId="gene-expression-atlas"
        >
          <FilterablePaginatedList
            items={atlasData}
            getSearchText={(e) =>
              [
                e.experimentDescription,
                e.experimentType,
                e.tissueName,
                e.condition,
                e.species,
                e.geneSymbol,
                String(e.expressionLevel ?? ''),
              ]
                .filter(Boolean)
                .join(' ')
            }
            sortOptions={atlasSort}
            defaultSortId="name-asc"
            filterPlaceholder="Filter Atlas (experiment, tissue, type…)"
            getKey={(e, i) => `${e.experimentDescription || e.url}-${i}`}
            pageSize={15}
            className="space-y-0"
            renderItem={(e, index) => {
              const href = e.url || 'https://www.ebi.ac.uk/gxa/'
              const experiment = e.experimentDescription || e.experimentType || '—'
              const type = e.experimentType || '—'
              const tissueOrCond = e.tissueName || e.condition || '—'
              const level =
                typeof e.expressionLevel === 'number' && Number.isFinite(e.expressionLevel)
                  ? `${e.expressionLevel}${e.unit ? ` ${e.unit}` : ''}`
                  : '—'
              const species = e.species || '—'
              return (
                <div>
                  {index === 0 && (
                    <div
                      className={`${gridAtlas} px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-700/80`}
                    >
                      <span>Experiment</span>
                      <span>Type</span>
                      <span>Tissue / condition</span>
                      <span className="text-right">Level</span>
                      <span>Species</span>
                      <span className="text-right">Open</span>
                    </div>
                  )}
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open experiment in Expression Atlas"
                    onClick={() =>
                      onDeepLinkClick('expression-atlas', href, {
                        panelId: 'gene-expression',
                        label: experiment.slice(0, 80),
                      })
                    }
                    className={`${gridAtlas} items-center px-2 py-1.5 border-b border-slate-700/50 last:border-0 hover:bg-slate-800/60 transition-colors group`}
                  >
                    <StyledTooltip content={experiment === '—' ? undefined : experiment}>
                      <span className="text-sm text-slate-100 group-hover:text-cyan-200 truncate">
                        {experiment}
                      </span>
                    </StyledTooltip>
                    <StyledTooltip content={type === '—' ? undefined : type}>
                      <span
                        className={`text-[10px] text-slate-400 truncate ${emptyDataClass(type === '—')}`}
                      >
                        {type}
                      </span>
                    </StyledTooltip>
                    <StyledTooltip content={tissueOrCond === '—' ? undefined : tissueOrCond}>
                      <span
                        className={`text-[11px] text-slate-300 truncate ${emptyDataClass(tissueOrCond === '—')}`}
                      >
                        {tissueOrCond}
                      </span>
                    </StyledTooltip>
                    <span
                      className={`text-[11px] font-mono tabular-nums text-right text-indigo-300/90 ${emptyDataClass(level === '—')}`}
                    >
                      {level}
                    </span>
                    <span
                      className={`text-[10px] text-slate-500 truncate ${emptyDataClass(species === '—')}`}
                    >
                      {species}
                    </span>
</a>
                </div>
              )
            }}
          />
        </ExpressionSourceCard>
      )}
    </div>
  )
}

function TargetedDrugsPanel({
  data,
  fetchedAt,
}: {
  data: Record<string, unknown> | null
  fetchedAt?: Date | null
}) {
  const drugs =
    (data?.geneDrugs as Array<{
      drugName?: string
      interactionType?: string
      sources?: string[]
      score?: number
    }>) ?? []

  if (drugs.length === 0) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
        <div className="text-slate-500 text-sm py-2">No targeted drug data found.</div>
      </div>
    )
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5" data-testid="gene-targeted-drugs">
      <h3 className="text-sm font-semibold text-slate-100 mb-0.5">
        Drugs targeting this gene ({drugs.length})
      </h3>
      <p className="text-[10px] text-slate-600 mb-3">
        DGIdb interactions. Use the API button for source, timestamp, and endpoint. Open goes to
        DGIdb drug search.
      </p>
      <div
        className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1fr)_3rem_2.5rem] gap-x-2 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-700/80"
        role="row"
      >
        <span>Drug</span>
        <span>Type</span>
        <span>Sources</span>
        <span className="text-right">Score</span>
        <span className="text-right">Open</span>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {drugs.map((d, i) => {
          const name = d.drugName ? String(d.drugName) : ''
          const dgidbUrl = name
            ? `https://www.dgidb.org/results?searchType=drug&searchTerms=${encodeURIComponent(name)}`
            : 'https://www.dgidb.org/results'
          const isCid = name && /^\d+$/.test(name)
          const localHref = name
            ? isCid
              ? `/molecule/${name}`
              : `/molecule/name/${encodeURIComponent(name)}`
            : null
          return (
            <DataPoint
              key={`${d.drugName}-${i}`}
              sourceKey="dgidb"
              fetchedAt={fetchedAt}
              label={d.drugName || 'DGIdb interaction'}
              recordUrl={dgidbUrl}
            >
              <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1fr)_3rem_2.5rem] gap-x-2 items-center px-2 py-1.5 border-b border-slate-800/80 text-sm">
                <div className="min-w-0 truncate">
                  {localHref ? (
                    <Link href={localHref} className="text-indigo-400 hover:underline truncate">
                      {isCid ? `CID ${name}` : name}
                    </Link>
                  ) : (
                    <span className="text-slate-500">Unknown</span>
                  )}
                </div>
                <span className="text-xs text-violet-300/90 truncate">
                  {d.interactionType || '—'}
                </span>
                <span className="text-[11px] text-slate-500 truncate">
                  {Array.isArray(d.sources) && d.sources.length > 0
                    ? d.sources.slice(0, 2).join(', ')
                    : '—'}
                </span>
                <span className="text-[11px] text-slate-500 text-right tabular-nums">
                  {typeof d.score === 'number' && d.score > 0 ? d.score.toFixed(1) : '—'}
                </span>
                <StyledTooltip content="View in DGIdb">
                  <a
                    href={dgidbUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 text-right"
                    aria-label="View in DGIdb"
                  >
                   
                  </a>
                </StyledTooltip>
              </div>
            </DataPoint>
          )
        })}
      </div>
    </div>
  )
}

type GoPathwayRow = {
  id: string
  name: string
  aspect?: string
  definition?: string
  url: string
}

type StringInteractionRow = {
  partnerName?: string
  partnerId?: string
  score?: number
  interactionType?: string
  url?: string
}

type UniProtPathwayRow = {
  accession?: string
  proteinName?: string
  geneNames?: string[]
  organism?: string
  url?: string
}

type PharmGkbGeneRow = {
  geneSymbol?: string
  geneId?: string
  name?: string
  url?: string
}

function normalizeGoRows(raw: unknown[]): GoPathwayRow[] {
  const out: GoPathwayRow[] = []
  for (const t of raw) {
    if (typeof t === 'string') {
      const s = t.trim()
      if (!s) continue
      const looksLikeId = /^GO:\d+/i.test(s)
      const id = looksLikeId ? s.toUpperCase() : ''
      out.push({
        id,
        name: looksLikeId ? s : s,
        url: id
          ? `https://www.ebi.ac.uk/QuickGO/term/${encodeURIComponent(id)}`
          : 'https://www.ebi.ac.uk/QuickGO/',
      })
      continue
    }
    if (!t || typeof t !== 'object') continue
    const rec = t as GOTerm & { name?: string; url?: string }
    const id = String(rec.id || '').trim()
    const name = String(rec.label || rec.name || '').trim() || id || 'GO term'
    const url =
      rec.url ||
      (id ? `https://www.ebi.ac.uk/QuickGO/term/${encodeURIComponent(id)}` : 'https://www.ebi.ac.uk/QuickGO/')
    out.push({
      id,
      name,
      aspect: rec.aspect ? String(rec.aspect).replace(/_/g, ' ') : undefined,
      definition: rec.definition ? String(rec.definition) : undefined,
      url,
    })
  }
  return out
}

function aspectBadgeClass(aspect: string | undefined): string {
  const a = (aspect || '').toLowerCase()
  if (a.includes('biological')) return 'bg-sky-900/40 text-sky-300 border-sky-800/40'
  if (a.includes('molecular')) return 'bg-violet-900/40 text-violet-300 border-violet-800/40'
  if (a.includes('cellular')) return 'bg-amber-900/40 text-amber-300 border-amber-800/40'
  return 'bg-slate-800/60 text-slate-400 border-slate-700/40'
}

function GenePathwaysPanel({
  data,
  fetchedAt,
}: {
  data: Record<string, unknown> | null
  fetchedAt?: Date | null
}) {
  void fetchedAt
  const bundle = (data?.genePathways ?? {}) as Record<string, unknown>
  const reactome = (bundle.reactomePathways ?? []) as ReactomePathway[]
  const wikipathways = (bundle.wikiPathways ?? []) as WikiPathway[]
  const goTerms = normalizeGoRows(Array.isArray(bundle.goTerms) ? bundle.goTerms : [])
  const stringInteractions = (bundle.stringInteractions ?? []) as StringInteractionRow[]
  const uniprotProteins = (bundle.uniprotProteins ?? []) as UniProtPathwayRow[]
  const pharmgkbGenes = (bundle.pharmgkbGenes ?? []) as PharmGkbGeneRow[]

  const hasReactome = reactome.length > 0
  const hasWiki = wikipathways.length > 0
  const hasGo = goTerms.length > 0
  const hasString = stringInteractions.length > 0
  const hasUniprot = uniprotProteins.length > 0
  const hasPharmgkb = pharmgkbGenes.length > 0

  const reactomeSort = useMemo(
    () => [
      ...alphaSortOptions<ReactomePathway>((p) => p.name || ''),
      ...alphaSortOptions<ReactomePathway>((p) => p.stId || '').map((o) => ({
        ...o,
        id: `stid-${o.id}`,
        label: o.id.includes('asc') ? 'ID A–Z' : 'ID Z–A',
      })),
      ...alphaSortOptions<ReactomePathway>((p) => p.species || '').map((o) => ({
        ...o,
        id: `sp-${o.id}`,
        label: o.id.includes('asc') ? 'Species A–Z' : 'Species Z–A',
      })),
    ],
    [],
  )

  const wikiSort = useMemo(
    () => [
      ...alphaSortOptions<WikiPathway>((p) => p.name || ''),
      ...alphaSortOptions<WikiPathway>((p) => p.id || '').map((o) => ({
        ...o,
        id: `id-${o.id}`,
        label: o.id.includes('asc') ? 'ID A–Z' : 'ID Z–A',
      })),
      ...alphaSortOptions<WikiPathway>((p) => p.species || '').map((o) => ({
        ...o,
        id: `wsp-${o.id}`,
        label: o.id.includes('asc') ? 'Species A–Z' : 'Species Z–A',
      })),
    ],
    [],
  )

  const goSort = useMemo(
    () => [
      ...alphaSortOptions<GoPathwayRow>((t) => t.name || ''),
      ...alphaSortOptions<GoPathwayRow>((t) => t.id || '').map((o) => ({
        ...o,
        id: `goid-${o.id}`,
        label: o.id.includes('asc') ? 'ID A–Z' : 'ID Z–A',
      })),
      ...alphaSortOptions<GoPathwayRow>((t) => t.aspect || '').map((o) => ({
        ...o,
        id: `asp-${o.id}`,
        label: o.id.includes('asc') ? 'Aspect A–Z' : 'Aspect Z–A',
      })),
    ],
    [],
  )

  const stringSort = useMemo(
    () => [
      ...numberSortOptions<StringInteractionRow>((r) => r.score ?? 0, {
        high: 'Score high→low',
        low: 'Score low→high',
        idPrefix: 'score',
      }),
      ...alphaSortOptions<StringInteractionRow>((r) => r.partnerName || r.partnerId || ''),
    ],
    [],
  )

  if (!hasReactome && !hasWiki && !hasGo && !hasString && !hasUniprot && !hasPharmgkb) {
    return (
      <div
        className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 opacity-20"
        data-empty="true"
      >
        <div className="text-slate-500 text-sm py-2">No pathway data found.</div>
      </div>
    )
  }

  const gridReactome =
    'grid grid-cols-[minmax(0,1.4fr)_minmax(5.5rem,0.65fr)_minmax(4.5rem,0.55fr)_minmax(0,0.9fr)_2.5rem] gap-x-2'
  const gridWiki =
    'grid grid-cols-[minmax(0,1.4fr)_minmax(5rem,0.6fr)_minmax(4.5rem,0.55fr)_minmax(0,0.9fr)_2.5rem] gap-x-2'
  const gridGo =
    'grid grid-cols-[minmax(5.5rem,0.65fr)_minmax(0,1.2fr)_minmax(5.5rem,0.7fr)_minmax(0,1fr)_2.5rem] gap-x-2'
  const gridString =
    'grid grid-cols-[minmax(0,1.2fr)_minmax(5rem,0.6fr)_minmax(4rem,0.5fr)_4rem_2.5rem] gap-x-2'
  const gridUniprot =
    'grid grid-cols-[minmax(5.5rem,0.65fr)_minmax(0,1.3fr)_minmax(0,0.9fr)_minmax(4.5rem,0.55fr)_2.5rem] gap-x-2'

  return (
    <div className="space-y-3" data-testid="gene-pathways-cards">
      <p className="text-[10px] text-slate-600 px-0.5">
        Pathway tables from Reactome, WikiPathways, Gene Ontology, STRING, UniProt, and PharmGKB.
        Open a row for the source record.
      </p>

      {hasReactome && (
        <ExpressionSourceCard
          title={`Reactome Pathways (${reactome.length})`}
          subtitle="Curated pathway reactions — ID, species, and summary when available."
          testId="gene-reactome-pathways"
        >
          <FilterablePaginatedList
            items={reactome}
            getSearchText={(p) =>
              [p.name, p.stId, p.species, p.summation].filter(Boolean).join(' ')
            }
            sortOptions={reactomeSort}
            defaultSortId="name-asc"
            filterPlaceholder="Filter Reactome (name, stId, species…)"
            getKey={(p, i) => `${p.stId || p.name}-${i}`}
            pageSize={15}
            className="space-y-0"
            renderItem={(p, index) => {
              const href =
                p.url ||
                (p.stId
                  ? `https://reactome.org/content/detail/${p.stId}`
                  : 'https://reactome.org/')
              const name = p.name || '—'
              const stId = p.stId || '—'
              const species = p.species || '—'
              const summary = p.summation?.trim() || '—'
              return (
                <div>
                  {index === 0 && (
                    <div
                      className={`${gridReactome} px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-700/80`}
                    >
                      <span>Pathway</span>
                      <span>ID</span>
                      <span>Species</span>
                      <span>Summary</span>
                      <span className="text-right">Open</span>
                    </div>
                  )}
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${name} in Reactome`}
                    onClick={() =>
                      onDeepLinkClick('reactome', href, {
                        panelId: 'gene-pathways',
                        label: stId !== '—' ? stId : name,
                      })
                    }
                    className={`${gridReactome} items-center px-2 py-1.5 border-b border-slate-700/50 last:border-0 hover:bg-slate-800/60 transition-colors group`}
                  >
                    <StyledTooltip content={name === '—' ? undefined : name}>
                      <span className="text-sm text-slate-100 group-hover:text-cyan-200 truncate">
                        {name}
                      </span>
                    </StyledTooltip>
                    <span
                      className={`text-[10px] font-mono text-indigo-300/90 truncate ${emptyDataClass(stId === '—')}`}
                    >
                      {stId}
                    </span>
                    <span
                      className={`text-[11px] text-slate-400 truncate ${emptyDataClass(species === '—')}`}
                    >
                      {species}
                    </span>
                    <StyledTooltip content={summary === '—' ? undefined : summary}>
                      <span
                        className={`text-[11px] text-slate-500 truncate ${emptyDataClass(summary === '—')}`}
                      >
                        {summary}
                      </span>
                    </StyledTooltip>
</a>
                </div>
              )
            }}
          />
        </ExpressionSourceCard>
      )}

      {hasWiki && (
        <ExpressionSourceCard
          title={`WikiPathways (${wikipathways.length})`}
          subtitle="Community pathways — ID, species, and description."
          testId="gene-wikipathways"
        >
          <FilterablePaginatedList
            items={wikipathways}
            getSearchText={(p) =>
              [p.name, p.id, p.species, p.description, ...(p.genes ?? [])]
                .filter(Boolean)
                .join(' ')
            }
            sortOptions={wikiSort}
            defaultSortId="name-asc"
            filterPlaceholder="Filter WikiPathways (name, id, species…)"
            getKey={(p, i) => `${p.id || p.name}-${i}`}
            pageSize={15}
            className="space-y-0"
            renderItem={(p, index) => {
              const href =
                p.url ||
                (p.id
                  ? `https://www.wikipathways.org/pathways/${p.id}`
                  : 'https://www.wikipathways.org/')
              const name = p.name || '—'
              const id = p.id || '—'
              const species = p.species || '—'
              const desc = p.description?.trim() || '—'
              return (
                <div>
                  {index === 0 && (
                    <div
                      className={`${gridWiki} px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-700/80`}
                    >
                      <span>Pathway</span>
                      <span>ID</span>
                      <span>Species</span>
                      <span>Description</span>
                      <span className="text-right">Open</span>
                    </div>
                  )}
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${name} on WikiPathways`}
                    onClick={() =>
                      onDeepLinkClick('wikipathways', href, {
                        panelId: 'gene-pathways',
                        label: id !== '—' ? id : name,
                      })
                    }
                    className={`${gridWiki} items-center px-2 py-1.5 border-b border-slate-700/50 last:border-0 hover:bg-slate-800/60 transition-colors group`}
                  >
                    <StyledTooltip content={name === '—' ? undefined : name}>
                      <span className="text-sm text-slate-100 group-hover:text-cyan-200 truncate">
                        {name}
                      </span>
                    </StyledTooltip>
                    <span
                      className={`text-[10px] font-mono text-teal-300/90 truncate ${emptyDataClass(id === '—')}`}
                    >
                      {id}
                    </span>
                    <span
                      className={`text-[11px] text-slate-400 truncate ${emptyDataClass(species === '—')}`}
                    >
                      {species}
                    </span>
                    <StyledTooltip content={desc === '—' ? undefined : desc}>
                      <span
                        className={`text-[11px] text-slate-500 truncate ${emptyDataClass(desc === '—')}`}
                      >
                        {desc}
                      </span>
                    </StyledTooltip>
</a>
                </div>
              )
            }}
          />
        </ExpressionSourceCard>
      )}

      {hasGo && (
        <ExpressionSourceCard
          title={`Gene Ontology Terms (${goTerms.length})`}
          subtitle="GO id, term name, aspect (BP/MF/CC), and definition."
          testId="gene-go-pathways"
        >
          <FilterablePaginatedList
            items={goTerms}
            getSearchText={(t) =>
              [t.id, t.name, t.aspect, t.definition].filter(Boolean).join(' ')
            }
            sortOptions={goSort}
            defaultSortId="name-asc"
            filterPlaceholder="Filter GO (id, name, aspect…)"
            getKey={(t, i) => `${t.id || t.name}-${i}`}
            pageSize={20}
            className="space-y-0"
            renderItem={(t, index) => {
              const id = t.id || '—'
              const name = t.name || '—'
              const aspect = t.aspect || '—'
              const def = t.definition?.trim() || '—'
              return (
                <div>
                  {index === 0 && (
                    <div
                      className={`${gridGo} px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-700/80`}
                    >
                      <span>GO ID</span>
                      <span>Term</span>
                      <span>Aspect</span>
                      <span>Definition</span>
                      <span className="text-right">Open</span>
                    </div>
                  )}
                  <a
                    href={t.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${id !== '—' ? id : name} in QuickGO`}
                    onClick={() =>
                      onDeepLinkClick('gene-ontology', t.url, {
                        panelId: 'gene-pathways',
                        label: id !== '—' ? id : name,
                      })
                    }
                    className={`${gridGo} items-center px-2 py-1.5 border-b border-slate-700/50 last:border-0 hover:bg-slate-800/60 transition-colors group`}
                  >
                    <span
                      className={`text-[11px] font-mono text-indigo-300/90 truncate ${emptyDataClass(id === '—')}`}
                    >
                      {id}
                    </span>
                    <StyledTooltip content={name === '—' ? undefined : name}>
                      <span className="text-sm text-slate-100 group-hover:text-cyan-200 truncate">
                        {name}
                      </span>
                    </StyledTooltip>
                    <span
                      className={`justify-self-start text-[9px] px-1.5 py-0.5 rounded border truncate max-w-full capitalize ${aspectBadgeClass(aspect)} ${emptyDataClass(aspect === '—')}`}
                    >
                      {aspect}
                    </span>
                    <StyledTooltip content={def === '—' ? undefined : def}>
                      <span
                        className={`text-[11px] text-slate-500 truncate ${emptyDataClass(def === '—')}`}
                      >
                        {def}
                      </span>
                    </StyledTooltip>
</a>
                </div>
              )
            }}
          />
        </ExpressionSourceCard>
      )}

      {hasString && (
        <ExpressionSourceCard
          title={`STRING Interactions (${stringInteractions.length})`}
          subtitle="Protein–protein interaction partners and confidence scores."
          testId="gene-string-pathways"
        >
          <FilterablePaginatedList
            items={stringInteractions}
            getSearchText={(r) =>
              [r.partnerName, r.partnerId, r.interactionType, String(r.score ?? '')]
                .filter(Boolean)
                .join(' ')
            }
            sortOptions={stringSort}
            defaultSortId="score-desc"
            filterPlaceholder="Filter STRING partners…"
            getKey={(r, i) => `${r.partnerId || r.partnerName}-${i}`}
            pageSize={15}
            className="space-y-0"
            renderItem={(r, index) => {
              const partner = r.partnerName || r.partnerId || '—'
              const type = r.interactionType || '—'
              const score =
                typeof r.score === 'number' && Number.isFinite(r.score)
                  ? r.score.toFixed(3)
                  : '—'
              const href =
                r.url ||
                (r.partnerId
                  ? `https://string-db.org/network/${encodeURIComponent(r.partnerId)}`
                  : 'https://string-db.org/')
              return (
                <div>
                  {index === 0 && (
                    <div
                      className={`${gridString} px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-700/80`}
                    >
                      <span>Partner</span>
                      <span>ID</span>
                      <span>Type</span>
                      <span className="text-right">Score</span>
                      <span className="text-right">Open</span>
                    </div>
                  )}
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      onDeepLinkClick('string-db', href, {
                        panelId: 'gene-pathways',
                        label: partner,
                      })
                    }
                    className={`${gridString} items-center px-2 py-1.5 border-b border-slate-700/50 last:border-0 hover:bg-slate-800/60 transition-colors group`}
                  >
                    <span className="text-sm text-slate-100 group-hover:text-cyan-200 truncate">
                      {partner}
                    </span>
                    <span
                      className={`text-[10px] font-mono text-slate-500 truncate ${emptyDataClass(!r.partnerId)}`}
                    >
                      {r.partnerId || '—'}
                    </span>
                    <span
                      className={`text-[11px] text-slate-400 truncate ${emptyDataClass(type === '—')}`}
                    >
                      {type}
                    </span>
                    <span
                      className={`text-[11px] font-mono tabular-nums text-right text-emerald-400/90 ${emptyDataClass(score === '—')}`}
                    >
                      {score}
                    </span>
</a>
                </div>
              )
            }}
          />
        </ExpressionSourceCard>
      )}

      {hasUniprot && (
        <ExpressionSourceCard
          title={`UniProt Proteins (${uniprotProteins.length})`}
          subtitle="Accession, protein name, gene names, and organism."
          testId="gene-uniprot-pathways"
        >
          <FilterablePaginatedList
            items={uniprotProteins}
            getSearchText={(p) =>
              [
                p.accession,
                p.proteinName,
                p.organism,
                ...(Array.isArray(p.geneNames) ? p.geneNames : []),
              ]
                .filter(Boolean)
                .join(' ')
            }
            sortOptions={alphaSortOptions<UniProtPathwayRow>(
              (p) => p.proteinName || p.accession || '',
            )}
            defaultSortId="name-asc"
            filterPlaceholder="Filter UniProt…"
            getKey={(p, i) => `${p.accession || p.proteinName}-${i}`}
            pageSize={12}
            className="space-y-0"
            renderItem={(p, index) => {
              const acc = p.accession || '—'
              const name = p.proteinName || '—'
              const genes =
                Array.isArray(p.geneNames) && p.geneNames.length > 0
                  ? p.geneNames.slice(0, 3).join(', ')
                  : '—'
              const org = p.organism || '—'
              const href =
                p.url ||
                (p.accession
                  ? `https://www.uniprot.org/uniprotkb/${p.accession}`
                  : 'https://www.uniprot.org/')
              return (
                <div>
                  {index === 0 && (
                    <div
                      className={`${gridUniprot} px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-700/80`}
                    >
                      <span>Accession</span>
                      <span>Protein</span>
                      <span>Genes</span>
                      <span>Organism</span>
                      <span className="text-right">Open</span>
                    </div>
                  )}
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      onDeepLinkClick('uniprot', href, {
                        panelId: 'gene-pathways',
                        label: acc !== '—' ? acc : name,
                      })
                    }
                    className={`${gridUniprot} items-center px-2 py-1.5 border-b border-slate-700/50 last:border-0 hover:bg-slate-800/60 transition-colors group`}
                  >
                    <span
                      className={`text-[11px] font-mono text-cyan-300/90 truncate ${emptyDataClass(acc === '—')}`}
                    >
                      {acc}
                    </span>
                    <StyledTooltip content={name === '—' ? undefined : name}>
                      <span className="text-sm text-slate-100 group-hover:text-cyan-200 truncate">
                        {name}
                      </span>
                    </StyledTooltip>
                    <span
                      className={`text-[11px] text-slate-400 truncate ${emptyDataClass(genes === '—')}`}
                    >
                      {genes}
                    </span>
                    <span
                      className={`text-[11px] text-slate-500 truncate ${emptyDataClass(org === '—')}`}
                    >
                      {org}
                    </span>
</a>
                </div>
              )
            }}
          />
        </ExpressionSourceCard>
      )}

      {hasPharmgkb && (
        <ExpressionSourceCard
          title={`PharmGKB Genes (${pharmgkbGenes.length})`}
          subtitle="Pharmacogenomic gene records linked to this symbol."
          testId="gene-pharmgkb-pathways"
        >
          <div
            className="grid grid-cols-[minmax(5rem,0.6fr)_minmax(0,1.2fr)_minmax(5rem,0.6fr)_2.5rem] gap-x-2"
          >
            <div className="grid grid-cols-subgrid col-span-4 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-700/80">
              <span>Symbol</span>
              <span>Name</span>
              <span>ID</span>
              <span className="text-right">Open</span>
            </div>
            {pharmgkbGenes.slice(0, 20).map((g, i) => {
              const sym = g.geneSymbol || '—'
              const name = g.name || '—'
              const id = g.geneId || '—'
              const href =
                g.url ||
                (g.geneId
                  ? `https://www.pharmgkb.org/gene/${g.geneId}`
                  : g.geneSymbol
                    ? `https://www.pharmgkb.org/search?query=${encodeURIComponent(g.geneSymbol)}`
                    : 'https://www.pharmgkb.org/')
              return (
                <a
                  key={`${g.geneId || g.geneSymbol}-${i}`}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    onDeepLinkClick('pharmgkb', href, {
                      panelId: 'gene-pathways',
                      label: sym !== '—' ? sym : id,
                    })
                  }
                  className="grid grid-cols-subgrid col-span-4 items-center px-2 py-1.5 border-b border-slate-700/50 last:border-0 hover:bg-slate-800/60 transition-colors group"
                >
                  <span className="text-sm font-medium text-indigo-300 truncate">{sym}</span>
                  <span
                    className={`text-xs text-slate-300 truncate ${emptyDataClass(name === '—')}`}
                  >
                    {name}
                  </span>
                  <span
                    className={`text-[10px] font-mono text-slate-500 truncate ${emptyDataClass(id === '—')}`}
                  >
                    {id}
                  </span>
</a>
              )
            })}
          </div>
        </ExpressionSourceCard>
      )}
    </div>
  )
}

/** Dense research tables for gene page (drugs · diseases · variants · pathways samples). */
function GeneResearchFocus({
  geneSymbol,
  categoryData,
  drugCount,
  diseaseCount,
  clinvarCount,
  pathwayCount,
}: {
  geneSymbol: string
  categoryData: Record<string, unknown> | null
  drugCount: number
  diseaseCount: number
  clinvarCount: number
  pathwayCount: number
}) {
  const drugs = Array.isArray(categoryData?.geneDrugs)
    ? (categoryData!.geneDrugs as Array<Record<string, unknown>>).slice(0, 12)
    : []
  const diseases = (
    (categoryData?.geneDiseases as { disgenetAssociations?: Array<Record<string, unknown>> })
      ?.disgenetAssociations ?? []
  ).slice(0, 12)
  const variants = (
    (categoryData?.geneVariants as { clinvarVariants?: Array<Record<string, unknown>> })
      ?.clinvarVariants ?? []
  ).slice(0, 12)
  const pathways = (
    (categoryData?.genePathways as { reactomePathways?: Array<Record<string, unknown>> })
      ?.reactomePathways ?? []
  ).slice(0, 12)

  const cell = (v: unknown) => {
    if (v == null || v === '') return '—'
    return String(v).slice(0, 100)
  }

  const Table = ({
    title,
    source,
    cols,
    rows,
    testId,
  }: {
    title: string
    source: string
    cols: string[]
    rows: string[][]
    testId: string
  }) => (
    <section
      className="mb-4 rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden"
      data-testid={testId}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 px-3 py-2">
        <div>
          <h3 className="text-xs font-semibold text-slate-100">{title}</h3>
          <p className="text-[9px] text-slate-500">{source}</p>
        </div>
        <span className="text-[9px] tabular-nums text-slate-500">{rows.length} rows</span>
      </div>
      {rows.length === 0 ? (
        <p className="px-3 py-3 text-[11px] text-slate-500">No rows loaded yet for this source.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left">
            <thead>
              <tr className="text-[9px] uppercase tracking-wide text-slate-600">
                {cols.map((c) => (
                  <th key={c} className="px-3 py-1.5 font-semibold">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-slate-800/50">
                  {r.map((c, j) => (
                    <td
                      key={j}
                      className={`px-3 py-1.5 text-[11px] ${
                        j === 0 ? 'text-slate-100 font-medium' : 'text-slate-400'
                      }`}
                    >
                      <span className="line-clamp-2">{c}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )

  return (
    <div data-testid="gene-research-focus" className="space-y-2">
      <header className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2.5 mb-3">
        <h2 className="text-sm font-semibold text-slate-100">
          Research view · {geneSymbol}
        </h2>
        <p className="text-[10px] text-slate-500">
          Dense of-record samples from free gene sources ·{' '}
          {drugCount + diseaseCount + clinvarCount + pathwayCount} rows across domains
        </p>
      </header>
      <Table
        title="Targeted drugs"
        source="DGIdb"
        cols={['Drug', 'Interaction', 'Score', 'Source']}
        rows={drugs.map((d) => [
          cell(d.drugName || d.name),
          cell(d.interactionType || d.interaction),
          cell(d.score),
          cell(d.source || 'DGIdb'),
        ])}
        testId="gene-research-drugs"
      />
      <Table
        title="Disease associations"
        source="DisGeNET"
        cols={['Disease', 'Score', 'PMIDs', 'Source']}
        rows={diseases.map((d) => [
          cell(d.diseaseName),
          cell(d.score),
          cell(d.pmids || d.pmidCount),
          cell(d.source || 'DisGeNET'),
        ])}
        testId="gene-research-diseases"
      />
      <Table
        title="ClinVar variants"
        source="ClinVar"
        cols={['Title', 'Significance', 'Condition']}
        rows={variants.map((v) => [
          cell(v.title || v.variantId),
          cell(v.clinicalSignificance),
          cell(v.conditionName || v.condition),
        ])}
        testId="gene-research-variants"
      />
      <Table
        title="Reactome pathways"
        source="Reactome"
        cols={['Pathway', 'ID', 'Species']}
        rows={pathways.map((p) => [
          cell(p.name || p.displayName),
          cell(p.id || p.stId),
          cell(p.species),
        ])}
        testId="gene-research-pathways"
      />
    </div>
  )
}

const GENE_PANELS = [
  { id: 'gene-overview', label: 'Overview' },
  { id: 'gene-research', label: 'Research' },
  { id: 'gene_drugs', label: 'Targeted Drugs' },
  { id: 'gene-diseases', label: 'Diseases' },
  { id: 'gene-variants', label: 'Variants' },
  { id: 'gene-expression', label: 'Expression' },
  { id: 'gene-pathways', label: 'Pathways' },
] as const

export function GeneDetailPageClient(props: GeneDetailPageClientProps) {
  return (
    <Suspense fallback={<div className="animate-pulse h-96 bg-slate-800/50 rounded-xl" />}>
      {/* Remount on gene change so loaded/loading gates do not skip the new entity. */}
      <GeneDetailPageClientInner key={`${props.geneId}-${props.symbol}`} {...props} />
    </Suspense>
  )
}

function GeneDetailPageClientInner({
  geneId,
  symbol,
  name,
  chromosome,
  typeOfGene,
  ensemblId,
  uniprotId,
}: GeneDetailPageClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialTab = searchParams.get('tab') || 'gene-overview'

  const [activePanel, setActivePanel] = useState<string>(initialTab)
  const [categoryData, setCategoryData] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null)
  const loadGenRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)
  const loadingRef = useRef(false)

  const categoryDataMap: Partial<Record<CategoryId, Record<string, unknown>>> = loaded ? { gene: categoryData } : {}
  const categoryStatusMap = buildFullStatus(
    'gene',
    loaded ? 'loaded' : loading ? 'loading' : error ? 'error' : 'idle',
  )
  const fetchedAtMap: Partial<Record<CategoryId, Date>> = fetchedAt ? { gene: fetchedAt } : {}

  const geneIdParam = `${geneId}-${symbol}`

  /**
   * Load gene multi-source category. Soft-refresh (`force`) keeps existing panels mounted.
   */
  const loadGeneCategory = useCallback(async (opts?: { force?: boolean }) => {
    const force = Boolean(opts?.force)
    if (loadingRef.current && !force) return
    if (loaded && !force) return

    try {
      abortRef.current?.abort()
    } catch {
      /* ignore */
    }
    const ac = new AbortController()
    abortRef.current = ac
    const gen = ++loadGenRef.current

    loadingRef.current = true
    setLoading(true)
    setError(null)
    try {
      const url = force
        ? `/api/gene/${geneIdParam}/category/gene?refresh=1&_t=${Date.now()}`
        : `/api/gene/${geneIdParam}/category/gene`
      const res = await clientFetch(url, { signal: ac.signal }, { retries: 1, retryDelayMs: 400 })
      if (!res.ok) {
        throw new Error(`Failed to load gene data: ${res.status}`)
      }
      const data = await res.json()
      if (loadGenRef.current !== gen) return
      setCategoryData(data)
      setFetchedAt(new Date())
      setLoaded(true)
    } catch (err) {
      if (loadGenRef.current !== gen) return
      if (
        (err instanceof DOMException && err.name === 'AbortError') ||
        (err instanceof Error && err.name === 'AbortError')
      ) {
        return
      }
      setError(err instanceof Error ? err.message : 'Failed to load gene data')
      // Soft-refresh failure: keep previous data
      if (!loaded) setLoaded(false)
    } finally {
      if (loadGenRef.current === gen) {
        loadingRef.current = false
        setLoading(false)
        if (abortRef.current === ac) abortRef.current = null
      }
    }
  }, [geneIdParam, loaded])

  useEffect(() => {
    void loadGeneCategory()
    return () => {
      try {
        abortRef.current?.abort()
      } catch {
        /* ignore */
      }
    }
    // Initial load only; force refresh is user-driven
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geneIdParam])

  useEffect(() => {
    const params = new URLSearchParams()
    if (activePanel !== 'gene-overview') params.set('tab', activePanel)
    const search = params.toString()
    router.replace(search ? `?${search}` : '?', { scroll: false })
  }, [activePanel, router])

  const overview = categoryData?.geneOverview as GeneOverviewType | null ?? null
  const sectionStatus = (categoryData?._sectionStatus ?? {}) as Record<string, SectionStatus>

  const displaySymbol = overview?.symbol || symbol
  const displayName = overview?.name || name
  const displayChromosome = overview?.chromosome || chromosome
  const displayType = overview?.typeOfGene || typeOfGene
  const displayMapLocation = overview?.mapLocation || ''
  const displayEnsemblId = overview?.ensemblId || ensemblId
  const displayUniprotId = overview?.uniprotId || uniprotId
  const displayUrl = overview?.url || `https://www.ncbi.nlm.nih.gov/gene/${geneId}`

  // Panel counts for at-a-glance strip (real loaded category data only)
  const drugCount = Array.isArray(categoryData?.geneDrugs)
    ? (categoryData.geneDrugs as unknown[]).length
    : 0
  const diseaseCount = (
    (categoryData?.geneDiseases as { disgenetAssociations?: unknown[] } | undefined)
      ?.disgenetAssociations ?? []
  ).length
  const clinvarCount = (
    (categoryData?.geneVariants as { clinvarVariants?: unknown[] } | undefined)?.clinvarVariants ??
    []
  ).length
  const dbsnpCount = (
    (categoryData?.geneVariants as { dbsnpVariants?: unknown[] } | undefined)?.dbsnpVariants ?? []
  ).length
  const variantCount = clinvarCount + dbsnpCount
  const exprBundle = categoryData?.geneExpressionData as
    | {
        gtexExpressions?: unknown[]
        bgeeExpressions?: unknown[]
        expressionAtlasData?: unknown[]
      }
    | undefined
  const gtexCount = exprBundle?.gtexExpressions?.length ?? 0
  const bgeeCount = exprBundle?.bgeeExpressions?.length ?? 0
  const atlasCount = exprBundle?.expressionAtlasData?.length ?? 0
  /** Align glance strip with all expression panels (was GTEx-only — caused 0 vs 30/20). */
  const expressionCount = gtexCount + bgeeCount + atlasCount
  const pathwayBundle = categoryData?.genePathways as
    | {
        reactomePathways?: unknown[]
        wikiPathways?: unknown[]
        goTerms?: unknown[]
        stringInteractions?: unknown[]
        uniprotProteins?: unknown[]
        pharmgkbGenes?: unknown[]
      }
    | undefined
  const pathwayCount =
    (pathwayBundle?.reactomePathways?.length ?? 0) +
    (pathwayBundle?.wikiPathways?.length ?? 0) +
    (pathwayBundle?.goTerms?.length ?? 0) +
    (pathwayBundle?.stringInteractions?.length ?? 0) +
    (pathwayBundle?.uniprotProteins?.length ?? 0) +
    (pathwayBundle?.pharmgkbGenes?.length ?? 0)

  const geneDiseases = categoryData?.geneDiseases as
    | {
        disgenetAssociations?: unknown[]
        gwasAssociations?: unknown[]
        clingenCurations?: unknown[]
        openTargetsAssociations?: unknown[]
      }
    | undefined
  const geneVariants = categoryData?.geneVariants as
    | {
        clinvarVariants?: unknown[]
        dbsnpVariants?: unknown[]
        clingenDosage?: unknown[]
      }
    | undefined

  const geneCrossBundle = useMemo(
    () =>
      buildGeneCrossSource({
        symbol: displaySymbol,
        gtexCount: loaded ? gtexCount : 0,
        bgeeCount: loaded ? bgeeCount : 0,
        expressionAtlasCount: loaded ? atlasCount : 0,
        reactomeCount: loaded ? pathwayBundle?.reactomePathways?.length ?? 0 : 0,
        wikiPathwaysCount: loaded ? pathwayBundle?.wikiPathways?.length ?? 0 : 0,
        goCount: loaded ? pathwayBundle?.goTerms?.length ?? 0 : 0,
        clinvarCount: loaded ? clinvarCount : 0,
        dbsnpCount: loaded ? dbsnpCount : 0,
        clingenCount: loaded
          ? (geneVariants?.clingenDosage?.length ?? 0) +
            (geneDiseases?.clingenCurations?.length ?? 0)
          : 0,
        disgenetCount: loaded ? diseaseCount : 0,
        gwasCount: loaded ? geneDiseases?.gwasAssociations?.length ?? 0 : 0,
        dgidbDrugCount: loaded ? drugCount : 0,
        openTargetsCount: loaded ? geneDiseases?.openTargetsAssociations?.length ?? 0 : 0,
      }),
    [
      displaySymbol,
      loaded,
      gtexCount,
      bgeeCount,
      atlasCount,
      pathwayBundle,
      clinvarCount,
      dbsnpCount,
      geneVariants,
      geneDiseases,
      diseaseCount,
      drugCount,
    ],
  )

  const geneDataHub = useMemo(() => {
    const disgenet = (geneDiseases?.disgenetAssociations ?? []) as Array<{
      diseaseName?: string
    }>
    const clinvar = (geneVariants?.clinvarVariants ?? []) as Array<{
      title?: string
      clinicalSignificance?: string
    }>
    const drugs = (Array.isArray(categoryData?.geneDrugs)
      ? categoryData!.geneDrugs
      : []) as Array<{ drugName?: string; name?: string }>
    const pathways = (pathwayBundle?.reactomePathways ?? []) as Array<{ name?: string }>
    const gtex = (exprBundle?.gtexExpressions ?? []) as Array<{ tissue?: string; tissueSite?: string }>
    return buildGeneDataHub({
      symbol: displaySymbol,
      geneId: String(geneId),
      name: displayName,
      description: overview?.summary || null,
      ncbiGeneId: String(geneId),
      ensemblId: displayEnsemblId || null,
      uniprotAccession: displayUniprotId || null,
      gtexCount: loaded ? gtexCount : 0,
      bgeeCount: loaded ? bgeeCount : 0,
      expressionAtlasCount: loaded ? atlasCount : 0,
      topTissue: gtex[0]?.tissue || gtex[0]?.tissueSite || null,
      reactomeCount: loaded ? pathwayBundle?.reactomePathways?.length ?? 0 : 0,
      wikiPathwaysCount: loaded ? pathwayBundle?.wikiPathways?.length ?? 0 : 0,
      goCount: loaded ? pathwayBundle?.goTerms?.length ?? 0 : 0,
      topPathway: pathways[0]?.name || null,
      clinvarCount: loaded ? clinvarCount : 0,
      dbsnpCount: loaded ? dbsnpCount : 0,
      clingenCount: loaded
        ? (geneVariants?.clingenDosage?.length ?? 0) +
          (geneDiseases?.clingenCurations?.length ?? 0)
        : 0,
      topClinvar: clinvar[0]
        ? [clinvar[0].title, clinvar[0].clinicalSignificance].filter(Boolean).join(' · ')
        : null,
      disgenetCount: loaded ? diseaseCount : 0,
      gwasCount: loaded ? geneDiseases?.gwasAssociations?.length ?? 0 : 0,
      openTargetsCount: loaded ? geneDiseases?.openTargetsAssociations?.length ?? 0 : 0,
      topDisease: disgenet[0]?.diseaseName || null,
      dgidbDrugCount: loaded ? drugCount : 0,
      topDrug: drugs[0]?.drugName || drugs[0]?.name || null,
    })
  }, [
    displaySymbol,
    displayName,
    geneId,
    overview,
    displayEnsemblId,
    displayUniprotId,
    loaded,
    gtexCount,
    bgeeCount,
    atlasCount,
    pathwayBundle,
    clinvarCount,
    dbsnpCount,
    geneVariants,
    geneDiseases,
    diseaseCount,
    drugCount,
    categoryData,
    exprBundle,
  ])

  const glanceTiles: {
    id: (typeof GENE_PANELS)[number]['id']
    label: string
    count: number | null
    hint: string
  }[] = [
    {
      id: 'gene_drugs',
      label: 'Targeted drugs',
      count: loaded ? drugCount : null,
      hint: 'DGIdb interactions',
    },
    {
      id: 'gene-diseases',
      label: 'Diseases',
      count: loaded ? diseaseCount : null,
      hint: 'DisGeNET · GWAS · ClinGen',
    },
    {
      id: 'gene-variants',
      label: 'Variants',
      count: loaded ? variantCount : null,
      hint: 'ClinVar · dbSNP · ClinGen dosage',
    },
    {
      id: 'gene-expression',
      label: 'Expression',
      count: loaded ? expressionCount : null,
      hint:
        loaded && expressionCount > 0
          ? `GTEx ${gtexCount} · Bgee ${bgeeCount} · Atlas ${atlasCount}`
          : 'GTEx + Bgee + Expression Atlas',
    },
    {
      id: 'gene-pathways',
      label: 'Pathways',
      count: loaded ? pathwayCount : null,
      hint: 'Reactome · WikiPathways · GO · UniProt · STRING · PharmGKB',
    },
  ]

  const sourcesUsed = Array.isArray(categoryData?._sourcesUsed)
    ? (categoryData._sourcesUsed as string[])
    : []

  /** Count for a gene sub-tab (null while still loading). Overview has no list count. */
  const countForPanel = (panelId: string): number | null => {
    if (!loaded) return null
    switch (panelId) {
      case 'gene-research':
        return drugCount + diseaseCount + variantCount + pathwayCount
      case 'gene_drugs':
        return drugCount
      case 'gene-diseases':
        return diseaseCount
      case 'gene-variants':
        return variantCount
      case 'gene-expression':
        return expressionCount
      case 'gene-pathways':
        return pathwayCount
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col">
      <main className="flex-1 px-4 sm:px-6 py-4 max-w-6xl mx-auto w-full">
        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
          <Link href="/" className="text-slate-500 hover:text-slate-300">Home</Link>
          <span className="text-slate-700">/</span>
          <Link href="/gene" className="text-slate-500 hover:text-slate-300">Gene</Link>
          <span className="text-slate-700">/</span>
          <span className="text-indigo-300/80">{displaySymbol}</span>
        </div>

        {/* Compact identity — full summary/aliases live only in Overview tab */}
        <div className="mb-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <h1 className="text-3xl font-bold text-slate-100">{displaySymbol}</h1>
              <p className="text-base text-slate-400">{displayName}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <StyledTooltip content={`Pin ${displaySymbol} as a discover target`}>
                <Link
                  href={buildDiscoverHref({ targets: displaySymbol })}
                  className="text-xs px-3 py-1.5 rounded-lg border border-emerald-700/50 bg-emerald-900/40 text-emerald-300 hover:border-emerald-500 hover:bg-emerald-900/60 hover:text-emerald-200 transition-colors"
                  data-testid="gene-page-discover-cta"
                >
                  Discover with target →
                </Link>
              </StyledTooltip>
              <StyledTooltip content="Re-query gene sources without leaving this page">
                <button
                  type="button"
                  onClick={() => void loadGeneCategory({ force: true })}
                  disabled={loading}
                  className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:border-amber-500/60 hover:text-amber-200 transition-colors disabled:opacity-50"
                  data-testid="gene-soft-refresh"
                  aria-label="Re-query gene sources without leaving this page"
                >
                  {loading && loaded ? 'Refreshing…' : 'Refresh data'}
                </button>
              </StyledTooltip>
              <a
                href={displayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:border-indigo-500 transition-colors"
              >
                NCBI Gene
              </a>
            </div>
          </div>

          {loading && (
            <div className="mb-3 rounded-xl border border-indigo-800/40 bg-slate-900/70 px-4 py-3">
              <p className="text-xs text-slate-300 mb-1">
                {loaded ? 'Refreshing gene evidence from free public APIs…' : 'Loading gene evidence from free public APIs…'}
              </p>
              <ElapsedTimer active={loading} showHint testId="gene-elapsed" />
            </div>
          )}

          <div className="flex flex-wrap gap-1.5 mt-2">
            {displayType && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-900/40 text-indigo-300 border border-indigo-800/50">{displayType}</span>
            )}
            {displayChromosome && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-300 border border-emerald-800/50">chr {displayChromosome}</span>
            )}
            {displayMapLocation && displayMapLocation !== displayChromosome && (
              <StyledTooltip content="Map location">
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  {displayMapLocation}
                </span>
              </StyledTooltip>
            )}
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
              Entrez {geneId}
            </span>
            {displayEnsemblId && (
              <a href={`https://ensembl.org/Homo_sapiens/Gene/Summary?g=${displayEnsemblId}`} target="_blank" rel="noopener noreferrer" className="text-[10px] px-2 py-0.5 rounded bg-violet-900/40 text-violet-300 border border-violet-800/50 hover:underline">Ensembl: {displayEnsemblId}</a>
            )}
            {displayUniprotId && (
              <a href={`https://www.uniprot.org/uniprot/${displayUniprotId}`} target="_blank" rel="noopener noreferrer" className="text-[10px] px-2 py-0.5 rounded bg-cyan-900/40 text-cyan-300 border border-cyan-800/50 hover:underline">UniProt: {displayUniprotId}</a>
            )}
          </div>
        </div>

        {/* At-a-glance: jump into evidence panels (replaces duplicate overview body) */}
        <div
          className="mb-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2"
          data-testid="gene-at-a-glance"
        >
          {glanceTiles.map((tile) => {
            const empty = loaded && tile.count === 0
            return (
              <StyledTooltip key={tile.id} content={tile.hint} className="w-full">
                <button
                  type="button"
                  onClick={() => setActivePanel(tile.id)}
                  disabled={!loaded && tile.count === null}
                  className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
                    activePanel === tile.id
                      ? 'border-indigo-600/50 bg-indigo-950/40'
                      : 'border-slate-800 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-800/60'
                  } ${empty ? 'opacity-30' : ''} disabled:opacity-60`}
                  data-empty={empty ? 'true' : 'false'}
                  data-testid={`gene-glance-${tile.id}`}
                >
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">{tile.label}</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-100">
                    {loading && tile.count === null ? (
                      <span className="inline-block h-5 w-8 animate-pulse rounded bg-slate-700" />
                    ) : (
                      tile.count ?? '—'
                    )}
                  </p>
                  <p className="mt-0.5 text-[9px] text-slate-600 truncate">{tile.hint}</p>
                </button>
              </StyledTooltip>
            )
          })}
        </div>

        {loaded && (
          <>
            <DataHubLedgerView
              ledger={geneDataHub}
              className="mb-4"
              testId="gene-data-hub"
              density="full"
            />
            <CrossSourceStrip
              bundle={geneCrossBundle}
              className="mb-4"
              testId="gene-cross-source"
              title="Source coverage (counts)"
              density="full"
            />
          </>
        )}

        <div
          className="flex gap-1 mb-4 overflow-x-auto no-scrollbar border-b border-slate-800/60 pb-px"
          data-testid="gene-tab-bar"
        >
          {GENE_PANELS.map((p) => {
            const count = countForPanel(p.id)
            const empty = loaded && p.id !== 'gene-overview' && count === 0
            return (
              <button
                key={p.id}
                type="button"
                className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors ${
                  activePanel === p.id
                    ? 'bg-slate-800/80 text-indigo-300 border-b-2 border-indigo-500'
                    : empty
                      ? 'text-slate-600 hover:text-slate-400 hover:bg-slate-800/30'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
                } ${empty ? 'opacity-30' : ''}`}
                onClick={() => setActivePanel(p.id)}
                data-testid={`gene-tab-${p.id}`}
                data-empty={empty ? 'true' : 'false'}
                data-has-data={empty ? 'false' : 'true'}
              >
                {p.label}
                {p.id !== 'gene-overview' && loaded && count != null && (
                  <span
                    className={`ml-1 text-[10px] font-normal tabular-nums ${
                      empty ? 'text-slate-600' : 'text-indigo-300/70'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {loading && !loaded && (
          <div
            className="mb-4 rounded-xl border border-indigo-800/40 bg-slate-900/60 p-4"
            data-testid="gene-loading-progress"
          >
            <div className="flex flex-wrap items-center gap-2 text-sm text-indigo-200">
              <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              <span>Fetching gene data…</span>
              <HelperTip
                content="Free public APIs: MyGene · NCBI Gene · Ensembl · DisGeNET · ClinVar · dbSNP · DGIdb · GWAS Catalog · ClinGen · GTEx · Bgee · Expression Atlas · GO · Reactome · WikiPathways · UniProt · STRING · PharmGKB"
                label="Gene data sources"
                testId="gene-loading-sources-help"
              />
            </div>
            <ul className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[10px] text-slate-400">
              {GENE_PANELS.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-1.5 rounded border border-slate-800 bg-slate-950/40 px-2 py-1"
                >
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  {p.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 text-red-300 mb-4">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => void loadGeneCategory({ force: true })}
              className="mt-2 text-xs underline text-red-200 hover:text-white"
            >
              Retry
            </button>
          </div>
        )}

        {loaded && sourcesUsed.length > 0 && (
          <p className="mb-3 text-[10px] text-slate-600" data-testid="gene-sources-used">
            Sources wired for this query: {sourcesUsed.join(' · ')}
          </p>
        )}

        {loaded && (
          <div>
            {activePanel === 'gene-overview' && (
              <GeneOverview overview={overview} fetchedAt={fetchedAt} />
            )}
            {activePanel === 'gene-research' && (
              <GeneResearchFocus
                geneSymbol={displaySymbol}
                categoryData={categoryData as Record<string, unknown> | null}
                drugCount={drugCount}
                diseaseCount={diseaseCount}
                clinvarCount={clinvarCount}
                pathwayCount={pathwayCount}
              />
            )}
            {activePanel === 'gene_drugs' && (
              <TargetedDrugsPanel data={categoryData} fetchedAt={fetchedAt} />
            )}
            {activePanel === 'gene-diseases' && (
              <GeneDiseasesPanel
                data={categoryData}
                status={sectionStatus.diseases}
                geneSymbol={displaySymbol}
                fetchedAt={fetchedAt}
              />
            )}
            {activePanel === 'gene-variants' && (
              <GeneVariantsPanel data={categoryData} fetchedAt={fetchedAt} />
            )}
            {activePanel === 'gene-expression' && (
              <GeneExpressionPanel data={categoryData} fetchedAt={fetchedAt} />
            )}
            {activePanel === 'gene-pathways' && (
              <GenePathwaysPanel data={categoryData} fetchedAt={fetchedAt} />
            )}
          </div>
        )}
        <AICopilot
          categoryData={categoryDataMap}
          categoryStatus={categoryStatusMap}
          fetchedAt={fetchedAtMap}
          identity={{ name: symbol, cid: 0, geneSymbol: symbol }}
        />
      </main>
    </div>
  )
}