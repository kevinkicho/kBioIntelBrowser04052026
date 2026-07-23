import Link from 'next/link'
import { Suspense } from 'react'
import { HelperTip } from '@/components/ui/HelperTip'
import { getMoleculeById } from '@/lib/api/pubchem'
import { getDrugsByIngredient } from '@/lib/api/openfda'
import { getPatentsByMoleculeName } from '@/lib/api/patents'
import { getClinicalTrialsByName } from '@/lib/api/clinicaltrials'
import { getAdverseEventsByName } from '@/lib/api/adverseevents'
import { getComputedPropertiesByCid } from '@/lib/api/pubchem-properties'
import { getGhsHazardsByCid } from '@/lib/api/pubchem-hazards'
import { getDrugLabelsByName } from '@/lib/api/dailymed'
import { getOrangeBookByName } from '@/lib/api/orangebook'
import { getDrugInteractionsByName } from '@/lib/api/rxnorm'
import { getDrugRecallsByName } from '@/lib/api/recalls'
import { getNdcProductsByName } from '@/lib/api/fda-ndc'
import { getChemblActivitiesByName } from '@/lib/api/chembl'
import { getChemblMechanismsByName } from '@/lib/api/chembl-mechanisms'
import { getChemblIndicationsByName } from '@/lib/api/chembl-indications'
import { getUniprotEntriesByName } from '@/lib/api/uniprot'
import { getLiteratureByName } from '@/lib/api/europepmc'
import { getNihGrantsByName } from '@/lib/api/nihreporter'
import { getSemanticPapersByName } from '@/lib/api/semantic-scholar'
import { getPdbStructuresByName } from '@/lib/api/pdb'
import { getReactomePathwaysByName } from '@/lib/api/reactome'
import { ComparePageClient } from './ComparePageClient'
import { CompareDataHubMatrix } from '@/components/dataHub/CompareDataHubMatrix'
import {
  buildCompareHubMatrix,
  buildLedgerForCompare,
  compareBagsFromMoleculeData,
  type CompareHubColumn,
} from '@/lib/dataHub'
import { CompareSection } from '@/components/compare/CompareSection'
import { PropertiesCompare } from '@/components/compare/PropertiesCompare'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { ComparisonInsights } from './ComparisonInsights'
import { DiseaseCompareHeaderWrapper } from './DiseaseCompareHeaderWrapper'
import {
  computeDelta,
  computePhaseDistribution,
  type PhaseDistribution,
  type DeltaResult,
} from './comparisonUtils'
import type {
  Molecule,
  CompanyProduct,
  Patent,
  ClinicalTrial,
  AdverseEvent,
  ComputedProperties,
  GhsHazardData,
  DrugLabel,
  OrangeBookEntry,
  DrugInteraction,
  DrugRecall,
  NdcProduct,
  ChemblActivity,
  ChemblMechanism,
  ChemblIndication,
  UniprotEntry,
  LiteratureResult,
  NihGrant,
  SemanticPaper,
  PdbStructure,
  ReactomePathway,
} from '@/lib/types'

export interface MoleculeData {
  molecule: Molecule
  companies: CompanyProduct[]
  patents: Patent[]
  trials: ClinicalTrial[]
  adverseEvents: AdverseEvent[]
  computedProperties: ComputedProperties | null
  ghsHazards: GhsHazardData | null
  drugLabels: DrugLabel[]
  orangeBookEntries: OrangeBookEntry[]
  drugInteractions: DrugInteraction[]
  drugRecalls: DrugRecall[]
  ndcProducts: NdcProduct[]
  chemblActivities: ChemblActivity[]
  chemblMechanisms: ChemblMechanism[]
  chemblIndications: ChemblIndication[]
  uniprotEntries: UniprotEntry[]
  literature: LiteratureResult[]
  nihGrants: NihGrant[]
  semanticPapers: SemanticPaper[]
  pdbStructures: PdbStructure[]
  reactomePathways: ReactomePathway[]
}

function settled<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === 'fulfilled' ? result.value : fallback
}

async function fetchMoleculeData(cid: number): Promise<MoleculeData | null> {
  const molecule = await getMoleculeById(cid)
  if (!molecule) return null

  const results = await Promise.allSettled([
    getDrugsByIngredient(molecule.name),
    getPatentsByMoleculeName(molecule.name),
    getClinicalTrialsByName(molecule.name),
    getAdverseEventsByName(molecule.name),
    getComputedPropertiesByCid(cid),
    getGhsHazardsByCid(cid),
    getDrugLabelsByName(molecule.name),
    getOrangeBookByName(molecule.name),
    getDrugInteractionsByName(molecule.name),
    getDrugRecallsByName(molecule.name),
    getNdcProductsByName(molecule.name),
    getChemblActivitiesByName(molecule.name),
    getChemblMechanismsByName(molecule.name),
    getChemblIndicationsByName(molecule.name),
    getUniprotEntriesByName(molecule.name),
    getLiteratureByName(molecule.name),
    getNihGrantsByName(molecule.name),
    getSemanticPapersByName(molecule.name),
    getPdbStructuresByName(molecule.name),
    getReactomePathwaysByName(molecule.name),
  ])

  return {
    molecule,
    companies: settled(results[0], [] as CompanyProduct[]),
    patents: settled(results[1], [] as Patent[]),
    trials: settled(results[2], [] as ClinicalTrial[]),
    adverseEvents: settled(results[3], [] as AdverseEvent[]),
    computedProperties: settled(results[4], null as ComputedProperties | null),
    ghsHazards: settled(results[5], null as GhsHazardData | null),
    drugLabels: settled(results[6], [] as DrugLabel[]),
    orangeBookEntries: settled(results[7], [] as OrangeBookEntry[]),
    drugInteractions: settled(results[8], [] as DrugInteraction[]),
    drugRecalls: settled(results[9], [] as DrugRecall[]),
    ndcProducts: settled(results[10], [] as NdcProduct[]),
    chemblActivities: settled(results[11], [] as ChemblActivity[]),
    chemblMechanisms: settled(results[12], [] as ChemblMechanism[]),
    chemblIndications: settled(results[13], [] as ChemblIndication[]),
    uniprotEntries: settled(results[14], [] as UniprotEntry[]),
    literature: settled(results[15], [] as LiteratureResult[]),
    nihGrants: settled(results[16], [] as NihGrant[]),
    semanticPapers: settled(results[17], [] as SemanticPaper[]),
    pdbStructures: settled(results[18], [] as PdbStructure[]),
    reactomePathways: settled(results[19], [] as ReactomePathway[]),
  }
}

function DeltaBadge({ delta }: { delta: DeltaResult }) {
  if (delta.direction === 'neutral') {
    return <span className="ml-1.5 text-[10px] text-slate-600">equal</span>
  }
  const color =
    delta.direction === 'positive'
      ? 'text-emerald-400 bg-emerald-900/30 border-emerald-800/40'
      : 'text-red-400 bg-red-900/30 border-red-800/40'
  const sign = delta.direction === 'positive' ? '+' : ''
  return (
    <span className={`ml-1.5 rounded-full border px-1.5 py-0.5 text-[10px] ${color}`}>
      {sign}
      {delta.diff}
    </span>
  )
}

function StatCell({
  label,
  value,
  delta,
  showDelta,
}: {
  label: string
  value: string | number
  delta?: DeltaResult
  showDelta?: boolean
}) {
  return (
    <div className="min-w-0">
      <p className="text-xl font-bold tabular-nums text-slate-100 sm:text-2xl">
        {value}
        {showDelta && delta ? <DeltaBadge delta={delta} /> : null}
      </p>
      <p className="text-[11px] text-slate-500">{label}</p>
    </div>
  )
}

function TopList({ items, emptyText }: { items: string[]; emptyText: string }) {
  if (items.length === 0) return <p className="text-xs text-slate-500">{emptyText}</p>
  return (
    <ul className="space-y-1">
      {items.slice(0, 5).map((item) => (
        <li key={item} className="text-sm leading-snug text-slate-300">
          {item}
        </li>
      ))}
    </ul>
  )
}

function CategoryHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-2 pb-1 pt-4">
      <span aria-hidden>{icon}</span>
      <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400">{title}</h2>
    </div>
  )
}

function PhaseBarChart({
  distribution,
  totalTrials,
}: {
  distribution: PhaseDistribution
  totalTrials: number
}) {
  if (totalTrials === 0) return <p className="text-xs text-slate-500">No trials</p>
  const phases = [
    { label: 'P1', count: distribution.phase1, color: 'bg-blue-500' },
    { label: 'P2', count: distribution.phase2, color: 'bg-indigo-500' },
    { label: 'P3', count: distribution.phase3, color: 'bg-violet-500' },
    { label: 'P4', count: distribution.phase4, color: 'bg-emerald-500' },
  ]
  return (
    <div className="mt-2 space-y-1.5">
      {phases.map((phase) => (
        <div key={phase.label} className="flex items-center gap-2">
          <span className="w-5 text-right text-[10px] text-slate-500">{phase.label}</span>
          <div className="h-3 flex-1 overflow-hidden rounded-sm bg-slate-800">
            <div
              className={`h-3 rounded-sm ${phase.color}`}
              style={{
                width: totalTrials > 0 ? `${(phase.count / totalTrials) * 100}%` : '0%',
              }}
            />
          </div>
          <span className="w-5 text-right text-[10px] tabular-nums text-slate-400">
            {phase.count}
          </span>
        </div>
      ))}
    </div>
  )
}

function uniqueTargets(activities: ChemblActivity[]): number {
  return new Set(activities.map((a) => a.targetName).filter(Boolean)).size
}

/** Parse compare CIDs from searchParams (a/b/c/d or cids=). */
function parsePageCids(searchParams: Record<string, string | string[] | undefined>): number[] {
  const get = (k: string) => {
    const v = searchParams[k]
    return Array.isArray(v) ? v[0] : v
  }
  const cidsRaw = get('cids')
  if (cidsRaw) {
    return Array.from(
      new Set(
        cidsRaw
          .split(/[,+\s]+/)
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => Number.isInteger(n) && n > 0),
      ),
    ).slice(0, 4)
  }
  const out: number[] = []
  for (const key of ['a', 'b', 'c', 'd']) {
    const raw = get(key)
    if (!raw) continue
    const n = parseInt(raw, 10)
    if (Number.isInteger(n) && n > 0 && !out.includes(n)) out.push(n)
  }
  return out.slice(0, 4)
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const cids = parsePageCids(searchParams)
  const disease =
    typeof searchParams.disease === 'string'
      ? searchParams.disease
      : Array.isArray(searchParams.disease)
        ? searchParams.disease[0]
        : undefined

  const settledList =
    cids.length >= 1
      ? await Promise.allSettled(cids.map((cid) => fetchMoleculeData(cid)))
      : []

  const datasets: { cid: number; data: MoleculeData }[] = []
  const failed: number[] = []
  settledList.forEach((s, i) => {
    const cid = cids[i]!
    if (s.status === 'fulfilled' && s.value) {
      datasets.push({ cid, data: s.value })
    } else {
      failed.push(cid)
    }
  })

  const n = datasets.length
  const pairwise = n === 2
  const d0 = datasets[0]?.data
  const d1 = datasets[1]?.data

  const compareHubMatrix =
    n >= 2
      ? buildCompareHubMatrix(
          datasets.map(({ cid, data }): CompareHubColumn => {
            const mol = data.molecule
            const ledger = buildLedgerForCompare(
              {
                cid,
                name: mol.name,
                formula: mol.formula,
                molecularWeight: mol.molecularWeight,
                inchiKey: mol.inchiKey,
                iupacName: mol.iupacName,
                synonyms: mol.synonyms,
              },
              compareBagsFromMoleculeData({
                trials: data.trials,
                adverseEvents: data.adverseEvents,
                orangeBookEntries: data.orangeBookEntries,
                ndcProducts: data.ndcProducts,
                drugLabels: data.drugLabels,
                chemblActivities: data.chemblActivities,
                chemblMechanisms: data.chemblMechanisms,
                chemblIndications: data.chemblIndications,
                literature: data.literature,
                nihGrants: data.nihGrants,
                semanticPapers: data.semanticPapers,
                patents: data.patents,
                pdbStructures: data.pdbStructures,
                uniprotEntries: data.uniprotEntries,
                drugRecalls: data.drugRecalls,
              }),
            )
            return {
              subjectId: String(cid),
              subjectLabel: mol.name || `CID ${cid}`,
              ledger,
            }
          }),
        )
      : null

  return (
    <div className="page-canvas" data-testid="compare-page">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-slate-100 sm:text-2xl">Compare molecules</h1>
          <HelperTip
            content="Side-by-side free-public-API evidence (trials, safety, targets, literature). Not clinical predictions."
            label="About molecule compare"
            testId="compare-page-help"
          />
        </div>
        <Link
          href="/discover"
          className="shrink-0 text-[11px] text-indigo-400 hover:underline"
        >
          Discover shortlist →
        </Link>
      </div>

      <Suspense fallback={<div className="mb-4 h-24 animate-pulse rounded-xl bg-slate-900/50" />}>
        <ComparePageClient />
      </Suspense>

      {failed.length > 0 && (
        <p className="mb-3 text-sm text-amber-400/90">
          Could not load CID{failed.length > 1 ? 's' : ''}: {failed.join(', ')}.
        </p>
      )}

      {cids.length > 0 && n === 0 && (
        <p className="py-8 text-center text-red-400">
          No molecules could be loaded. Check CIDs and try again.
        </p>
      )}

      {cids.length === 0 && (
        <p className="py-10 text-center text-sm text-slate-500">
          Add at least two molecules above to compare them across free public evidence sources.
        </p>
      )}

      {n >= 2 && compareHubMatrix && (
        <div className="mb-6 min-w-0">
          <CompareDataHubMatrix matrix={compareHubMatrix} className="mb-2" />
          <p className="text-[10px] text-slate-600">
            See also{' '}
            <Link href="/methodology" className="text-indigo-400 hover:underline">
              how we present data
            </Link>{' '}
            for of-record vs assistive layers.
          </p>
        </div>
      )}

      {n >= 2 && (
        <div className="min-w-0">
          {disease && pairwise && d0 && d1 && (
            <Suspense fallback={<div className="h-4" />}>
              <DiseaseCompareHeaderWrapper
                dataA={d0 as unknown as Record<string, unknown>}
                dataB={d1 as unknown as Record<string, unknown>}
                cidA={datasets[0]!.cid}
                cidB={datasets[1]!.cid}
              />
            </Suspense>
          )}

          {pairwise && d0 && d1 && (
            <ComparisonInsights
              dataA={d0}
              dataB={d1}
              nameA={d0.molecule.name}
              nameB={d1.molecule.name}
            />
          )}

          {n > 2 && (
            <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-[11px] text-slate-500">
              Comparing {n} molecules — metric columns use absolute counts (pairwise deltas shown
              only for 2-way compares).
            </div>
          )}

          <CompareSection title="Molecule" columns={n}>
            {datasets.map(({ data, cid }) => (
              <div key={cid} className="min-w-0 overflow-hidden">
                <ProfileHeader molecule={data.molecule} />
              </div>
            ))}
          </CompareSection>

          <CategoryHeader icon="🧪" title="Molecular & Chemical" />

          <CompareSection title="Computed Properties" fullWidth>
            <PropertiesCompare
              columns={datasets.map(({ data }) => ({
                label: data.molecule.name,
                props: data.computedProperties,
                mw: data.molecule.molecularWeight,
              }))}
            />
          </CompareSection>

          <CompareSection title="GHS Hazards" columns={n}>
            {datasets.map(({ data, cid }, i) => {
              const v = data.ghsHazards?.pictogramUrls?.length ?? 0
              const other = pairwise && i === 0 ? d1 : pairwise && i === 1 ? d0 : null
              const ov = other?.ghsHazards?.pictogramUrls?.length ?? 0
              return (
                <StatCell
                  key={cid}
                  label="hazard pictograms"
                  value={v}
                  showDelta={pairwise}
                  delta={
                    pairwise ? computeDelta(v, ov, false) : undefined
                  }
                />
              )
            })}
          </CompareSection>

          <CategoryHeader icon="💊" title="Pharmaceutical" />

          {(
            [
              ['Manufacturers', (d: MoleculeData) => d.companies.length, true],
              ['NDC Products', (d: MoleculeData) => d.ndcProducts.length, true],
              ['Orange Book', (d: MoleculeData) => d.orangeBookEntries.length, true],
              ['Drug Labels', (d: MoleculeData) => d.drugLabels.length, true],
              ['Drug Interactions', (d: MoleculeData) => d.drugInteractions.length, false],
            ] as const
          ).map(([title, pick, higherBetter]) => (
            <CompareSection key={title} title={title} columns={n}>
              {datasets.map(({ data, cid }, i) => {
                const v = pick(data)
                const other = pairwise && i === 0 ? d1 : pairwise && i === 1 ? d0 : null
                const ov = other ? pick(other) : 0
                return (
                  <StatCell
                    key={cid}
                    label={title.toLowerCase()}
                    value={v}
                    showDelta={pairwise}
                    delta={pairwise ? computeDelta(v, ov, higherBetter) : undefined}
                  />
                )
              })}
            </CompareSection>
          ))}

          <CompareSection title="Top Manufacturers" columns={n}>
            {datasets.map(({ data, cid }) => (
              <TopList
                key={cid}
                items={Array.from(new Set(data.companies.map((c) => c.company)))}
                emptyText="None found"
              />
            ))}
          </CompareSection>

          <CategoryHeader icon="🏥" title="Clinical & Safety" />

          <CompareSection title="Clinical Trials" columns={n}>
            {datasets.map(({ data, cid }, i) => {
              const v = data.trials.length
              const other = pairwise && i === 0 ? d1 : pairwise && i === 1 ? d0 : null
              const ov = other?.trials.length ?? 0
              return (
                <div key={cid}>
                  <StatCell
                    label="trials"
                    value={v}
                    showDelta={pairwise}
                    delta={pairwise ? computeDelta(v, ov, true) : undefined}
                  />
                  <PhaseBarChart
                    distribution={computePhaseDistribution(data.trials)}
                    totalTrials={data.trials.length}
                  />
                </div>
              )
            })}
          </CompareSection>

          <CompareSection title="Indications (ChEMBL)" columns={n}>
            {datasets.map(({ data, cid }, i) => {
              const v = data.chemblIndications.length
              const other = pairwise && i === 0 ? d1 : pairwise && i === 1 ? d0 : null
              const ov = other?.chemblIndications.length ?? 0
              return (
                <StatCell
                  key={cid}
                  label="indications"
                  value={v}
                  showDelta={pairwise}
                  delta={pairwise ? computeDelta(v, ov, true) : undefined}
                />
              )
            })}
          </CompareSection>

          <CompareSection title="Adverse Events (Top 5)" columns={n}>
            {datasets.map(({ data, cid }) => (
              <TopList
                key={cid}
                items={data.adverseEvents
                  .slice(0, 5)
                  .map((e) => `${e.reactionName} (${e.count})`)}
                emptyText="None reported"
              />
            ))}
          </CompareSection>

          <CompareSection title="Drug Recalls" columns={n}>
            {datasets.map(({ data, cid }, i) => {
              const v = data.drugRecalls.length
              const other = pairwise && i === 0 ? d1 : pairwise && i === 1 ? d0 : null
              const ov = other?.drugRecalls.length ?? 0
              return (
                <StatCell
                  key={cid}
                  label="recalls"
                  value={v}
                  showDelta={pairwise}
                  delta={pairwise ? computeDelta(v, ov, false) : undefined}
                />
              )
            })}
          </CompareSection>

          <CategoryHeader icon="🎯" title="Bioactivity & Targets" />

          <CompareSection title="ChEMBL Bioactivity" columns={n}>
            {datasets.map(({ data, cid }, i) => {
              const v = data.chemblActivities.length
              const other = pairwise && i === 0 ? d1 : pairwise && i === 1 ? d0 : null
              const ov = other?.chemblActivities.length ?? 0
              return (
                <div key={cid}>
                  <StatCell
                    label="activities"
                    value={v}
                    showDelta={pairwise}
                    delta={pairwise ? computeDelta(v, ov, true) : undefined}
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    {uniqueTargets(data.chemblActivities)} unique targets
                  </p>
                </div>
              )
            })}
          </CompareSection>

          <CompareSection title="Mechanisms of Action" columns={n}>
            {datasets.map(({ data, cid }) => (
              <TopList
                key={cid}
                items={data.chemblMechanisms.map(
                  (m) => `${m.actionType}: ${m.mechanismOfAction}`,
                )}
                emptyText="None found"
              />
            ))}
          </CompareSection>

          <CompareSection title="Protein Targets (UniProt)" columns={n}>
            {datasets.map(({ data, cid }) => (
              <TopList
                key={cid}
                items={data.uniprotEntries.map((u) => `${u.geneName} — ${u.proteinName}`)}
                emptyText="None found"
              />
            ))}
          </CompareSection>

          <CategoryHeader icon="🧬" title="Protein & Structure" />

          <CompareSection title="PDB Structures" columns={n}>
            {datasets.map(({ data, cid }, i) => {
              const v = data.pdbStructures.length
              const other = pairwise && i === 0 ? d1 : pairwise && i === 1 ? d0 : null
              const ov = other?.pdbStructures.length ?? 0
              return (
                <StatCell
                  key={cid}
                  label="crystal structures"
                  value={v}
                  showDelta={pairwise}
                  delta={pairwise ? computeDelta(v, ov, true) : undefined}
                />
              )
            })}
          </CompareSection>

          <CategoryHeader icon="🔗" title="Interactions & Pathways" />

          <CompareSection title="Reactome Pathways" columns={n}>
            {datasets.map(({ data, cid }, i) => {
              const v = data.reactomePathways.length
              const other = pairwise && i === 0 ? d1 : pairwise && i === 1 ? d0 : null
              const ov = other?.reactomePathways.length ?? 0
              return (
                <StatCell
                  key={cid}
                  label="pathways"
                  value={v}
                  showDelta={pairwise}
                  delta={pairwise ? computeDelta(v, ov, true) : undefined}
                />
              )
            })}
          </CompareSection>

          <CategoryHeader icon="📚" title="Research & Literature" />

          <CompareSection title="Publications" columns={n}>
            {datasets.map(({ data, cid }, i) => {
              const v = Math.max(data.literature.length, data.semanticPapers.length)
              const other = pairwise && i === 0 ? d1 : pairwise && i === 1 ? d0 : null
              const ov = other
                ? Math.max(other.literature.length, other.semanticPapers.length)
                : 0
              return (
                <StatCell
                  key={cid}
                  label="papers"
                  value={v}
                  showDelta={pairwise}
                  delta={pairwise ? computeDelta(v, ov, true) : undefined}
                />
              )
            })}
          </CompareSection>

          <CompareSection title="Patents" columns={n}>
            {datasets.map(({ data, cid }, i) => {
              const v = data.patents.length
              const other = pairwise && i === 0 ? d1 : pairwise && i === 1 ? d0 : null
              const ov = other?.patents.length ?? 0
              return (
                <StatCell
                  key={cid}
                  label="patents"
                  value={v}
                  showDelta={pairwise}
                  delta={pairwise ? computeDelta(v, ov, true) : undefined}
                />
              )
            })}
          </CompareSection>

          <CompareSection title="Top Patent Assignees" columns={n}>
            {datasets.map(({ data, cid }) => (
              <TopList
                key={cid}
                items={Array.from(new Set(data.patents.map((p) => p.assignee)))}
                emptyText="None found"
              />
            ))}
          </CompareSection>

          <CompareSection title="NIH Grants" columns={n}>
            {datasets.map(({ data, cid }, i) => {
              const v = data.nihGrants.length
              const other = pairwise && i === 0 ? d1 : pairwise && i === 1 ? d0 : null
              const ov = other?.nihGrants.length ?? 0
              return (
                <StatCell
                  key={cid}
                  label="active grants"
                  value={v}
                  showDelta={pairwise}
                  delta={pairwise ? computeDelta(v, ov, true) : undefined}
                />
              )
            })}
          </CompareSection>
        </div>
      )}

      {n === 1 && (
        <p className="py-6 text-center text-sm text-slate-500">
          Loaded {datasets[0]!.data.molecule.name}. Select one more molecule to compare.
        </p>
      )}
    </div>
  )
}
