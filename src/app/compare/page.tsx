import Link from 'next/link'
import { Suspense } from 'react'
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
import { CompareSection } from '@/components/compare/CompareSection'
import { PropertiesCompare } from '@/components/compare/PropertiesCompare'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { ComparisonInsights } from './ComparisonInsights'
import { DiseaseCompareHeaderWrapper } from './DiseaseCompareHeaderWrapper'
import { computeDelta, computePhaseDistribution, type PhaseDistribution, type DeltaResult } from './comparisonUtils'
import type {
  Molecule, CompanyProduct, Patent, ClinicalTrial, AdverseEvent,
  ComputedProperties, GhsHazardData, DrugLabel, OrangeBookEntry,
  DrugInteraction, DrugRecall, NdcProduct, ChemblActivity,
  ChemblMechanism, ChemblIndication, UniprotEntry, LiteratureResult,
  NihGrant, SemanticPaper, PdbStructure, ReactomePathway,
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

  const companies = settled(results[0], [] as CompanyProduct[])
  const patents = settled(results[1], [] as Patent[])
  const trials = settled(results[2], [] as ClinicalTrial[])
  const adverseEvents = settled(results[3], [] as AdverseEvent[])
  const computedProperties = settled(results[4], null as ComputedProperties | null)
  const ghsHazards = settled(results[5], null as GhsHazardData | null)
  const drugLabels = settled(results[6], [] as DrugLabel[])
  const orangeBookEntries = settled(results[7], [] as OrangeBookEntry[])
  const drugInteractions = settled(results[8], [] as DrugInteraction[])
  const drugRecalls = settled(results[9], [] as DrugRecall[])
  const ndcProducts = settled(results[10], [] as NdcProduct[])
  const chemblActivities = settled(results[11], [] as ChemblActivity[])
  const chemblMechanisms = settled(results[12], [] as ChemblMechanism[])
  const chemblIndications = settled(results[13], [] as ChemblIndication[])
  const uniprotEntries = settled(results[14], [] as UniprotEntry[])
  const literature = settled(results[15], [] as LiteratureResult[])
  const nihGrants = settled(results[16], [] as NihGrant[])
  const semanticPapers = settled(results[17], [] as SemanticPaper[])
  const pdbStructures = settled(results[18], [] as PdbStructure[])
  const reactomePathways = settled(results[19], [] as ReactomePathway[])

  return {
    molecule, companies, patents, trials, adverseEvents,
    computedProperties, ghsHazards,
    drugLabels, orangeBookEntries, drugInteractions, drugRecalls, ndcProducts,
    chemblActivities, chemblMechanisms, chemblIndications, uniprotEntries,
    literature, nihGrants, semanticPapers,
    pdbStructures, reactomePathways,
  }
}

function DeltaBadge({ delta }: { delta: DeltaResult }) {
  if (delta.direction === 'neutral') {
    return <span className="text-[10px] text-slate-600 ml-1.5">equal</span>
  }
  const color = delta.direction === 'positive'
    ? 'text-emerald-400 bg-emerald-900/30 border-emerald-800/40'
    : 'text-red-400 bg-red-900/30 border-red-800/40'
  const sign = delta.direction === 'positive' ? '+' : ''
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${color} ml-1.5`}>
      {sign}{delta.diff}
    </span>
  )
}

function StatValueWithDelta({ label, value, delta }: { label: string; value: string | number; delta: DeltaResult }) {
  return (
    <div>
      <p className="text-2xl font-bold text-slate-100">
        {value}
        <DeltaBadge delta={delta} />
      </p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  )
}

function TopList({ items, emptyText }: { items: string[]; emptyText: string }) {
  if (items.length === 0) return <p className="text-xs text-slate-500">{emptyText}</p>
  return (
    <ul className="space-y-1">
      {items.slice(0, 5).map((item, i) => (
        <li key={i} className="text-sm text-slate-300">{item}</li>
      ))}
    </ul>
  )
}

function CategoryHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-2 pt-6 pb-2">
      <span>{icon}</span>
      <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-400">{title}</h2>
    </div>
  )
}

function PhaseBarChart({ distribution, totalTrials }: { distribution: PhaseDistribution; totalTrials: number }) {
  if (totalTrials === 0) return <p className="text-xs text-slate-500">No trials</p>

  const phases = [
    { label: 'P1', count: distribution.phase1, color: 'bg-blue-500' },
    { label: 'P2', count: distribution.phase2, color: 'bg-indigo-500' },
    { label: 'P3', count: distribution.phase3, color: 'bg-violet-500' },
    { label: 'P4', count: distribution.phase4, color: 'bg-emerald-500' },
  ]

  const barHeight = 'h-4'

  return (
    <div className="space-y-1.5 mt-2">
      {phases.map(phase => (
        <div key={phase.label} className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 w-5 text-right">{phase.label}</span>
          <div className="flex-1 bg-slate-800 rounded-sm overflow-hidden">
            <div
              className={`${barHeight} ${phase.color} rounded-sm transition-all`}
              style={{ width: totalTrials > 0 ? `${(phase.count / totalTrials) * 100}%` : '0%' }}
            />
          </div>
          <span className="text-[10px] text-slate-400 w-5 text-right">{phase.count}</span>
        </div>
      ))}
    </div>
  )
}

function uniqueTargets(activities: ChemblActivity[]): number {
  return new Set(activities.map(a => a.targetName).filter(Boolean)).size
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: { a?: string; b?: string; disease?: string; scoreA?: string; scoreB?: string; confidenceA?: string; confidenceB?: string; nameA?: string; nameB?: string }
}) {
  const cidARaw = searchParams.a ? parseInt(searchParams.a, 10) : NaN
  const cidBRaw = searchParams.b ? parseInt(searchParams.b, 10) : NaN
  const cidAValid = !isNaN(cidARaw) && cidARaw > 0 && Number.isInteger(cidARaw)
  const cidBValid = !isNaN(cidBRaw) && cidBRaw > 0 && Number.isInteger(cidBRaw)
  const hasValidCids = cidAValid && cidBValid

  let dataA: MoleculeData | null = null
  let dataB: MoleculeData | null = null

  if (hasValidCids) {
    const [settledA, settledB] = await Promise.allSettled([
      fetchMoleculeData(cidARaw),
      fetchMoleculeData(cidBRaw),
    ])
    dataA = settledA.status === 'fulfilled' ? settledA.value : null
    dataB = settledB.status === 'fulfilled' ? settledB.value : null
  }

  return (
    <div className="min-h-screen bg-[#0f1117]">
      <header className="border-b border-slate-800 px-6 py-4">
        <Link href="/" className="text-slate-400 hover:text-slate-200 text-sm">← BioIntel Explorer</Link>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-3xl font-bold text-slate-100 mb-6">Compare Molecules</h1>

        <ComparePageClient />

        {!cidAValid && searchParams.a && (
          <p className="text-red-400 text-center py-4">Invalid CID for molecule A. Please provide a positive integer.</p>
        )}
        {!cidBValid && searchParams.b && (
          <p className="text-red-400 text-center py-4">Invalid CID for molecule B. Please provide a positive integer.</p>
        )}

        {hasValidCids && !dataA && !dataB && (
          <p className="text-red-400 text-center py-8">Neither molecule could be found. Please check the CIDs and try again.</p>
        )}
        {hasValidCids && dataA && !dataB && (
          <p className="text-amber-400 text-center py-4">Molecule A ({dataA.molecule.name}) was found, but molecule B (CID {cidBRaw}) could not be loaded. Please try a different CID for molecule B.</p>
        )}
        {hasValidCids && !dataA && dataB && (
          <p className="text-amber-400 text-center py-4">Molecule B ({dataB.molecule.name}) was found, but molecule A (CID {cidARaw}) could not be loaded. Please try a different CID for molecule A.</p>
        )}

        {dataA && dataB && (
          <div>
            {searchParams.disease && (
              <Suspense fallback={<div className="h-4" />}>
                <DiseaseCompareHeaderWrapper
                  dataA={dataA as unknown as Record<string, unknown>}
                  dataB={dataB as unknown as Record<string, unknown>}
                  cidA={cidARaw}
                  cidB={cidBRaw}
                />
              </Suspense>
            )}

            <ComparisonInsights
              dataA={dataA}
              dataB={dataB}
              nameA={dataA.molecule.name}
              nameB={dataB.molecule.name}
            />

            {/* Molecule Identity */}
            <CompareSection title="Molecule">
              <div><ProfileHeader molecule={dataA.molecule} /></div>
              <div><ProfileHeader molecule={dataB.molecule} /></div>
            </CompareSection>

            {/* Molecular & Chemical */}
            <CategoryHeader icon="🧪" title="Molecular & Chemical" />

            <CompareSection title="Computed Properties" fullWidth>
              <PropertiesCompare
                a={dataA.computedProperties}
                b={dataB.computedProperties}
                mwA={dataA.molecule.molecularWeight}
                mwB={dataB.molecule.molecularWeight}
              />
            </CompareSection>

            <CompareSection title="GHS Hazards">
              <StatValueWithDelta label="hazard pictograms" value={dataA.ghsHazards?.pictogramUrls?.length ?? 0} delta={computeDelta(dataA.ghsHazards?.pictogramUrls?.length ?? 0, dataB.ghsHazards?.pictogramUrls?.length ?? 0, false)} />
              <StatValueWithDelta label="hazard pictograms" value={dataB.ghsHazards?.pictogramUrls?.length ?? 0} delta={computeDelta(dataB.ghsHazards?.pictogramUrls?.length ?? 0, dataA.ghsHazards?.pictogramUrls?.length ?? 0, false)} />
            </CompareSection>

            {/* Pharmaceutical */}
            <CategoryHeader icon="💊" title="Pharmaceutical" />

            <CompareSection title="Manufacturers">
              <StatValueWithDelta label="manufacturers" value={dataA.companies.length} delta={computeDelta(dataA.companies.length, dataB.companies.length, true)} />
              <StatValueWithDelta label="manufacturers" value={dataB.companies.length} delta={computeDelta(dataB.companies.length, dataA.companies.length, true)} />
            </CompareSection>

            <CompareSection title="Top Manufacturers">
              <TopList items={Array.from(new Set(dataA.companies.map(c => c.company)))} emptyText="None found" />
              <TopList items={Array.from(new Set(dataB.companies.map(c => c.company)))} emptyText="None found" />
            </CompareSection>

            <CompareSection title="NDC Products">
              <StatValueWithDelta label="NDC codes" value={dataA.ndcProducts.length} delta={computeDelta(dataA.ndcProducts.length, dataB.ndcProducts.length, true)} />
              <StatValueWithDelta label="NDC codes" value={dataB.ndcProducts.length} delta={computeDelta(dataB.ndcProducts.length, dataA.ndcProducts.length, true)} />
            </CompareSection>

            <CompareSection title="Orange Book Entries">
              <StatValueWithDelta label="entries" value={dataA.orangeBookEntries.length} delta={computeDelta(dataA.orangeBookEntries.length, dataB.orangeBookEntries.length, true)} />
              <StatValueWithDelta label="entries" value={dataB.orangeBookEntries.length} delta={computeDelta(dataB.orangeBookEntries.length, dataA.orangeBookEntries.length, true)} />
            </CompareSection>

            <CompareSection title="Drug Labels">
              <StatValueWithDelta label="labels" value={dataA.drugLabels.length} delta={computeDelta(dataA.drugLabels.length, dataB.drugLabels.length, true)} />
              <StatValueWithDelta label="labels" value={dataB.drugLabels.length} delta={computeDelta(dataB.drugLabels.length, dataA.drugLabels.length, true)} />
            </CompareSection>

            <CompareSection title="Drug Interactions">
              <StatValueWithDelta label="interactions" value={dataA.drugInteractions.length} delta={computeDelta(dataA.drugInteractions.length, dataB.drugInteractions.length, false)} />
              <StatValueWithDelta label="interactions" value={dataB.drugInteractions.length} delta={computeDelta(dataB.drugInteractions.length, dataA.drugInteractions.length, false)} />
            </CompareSection>

            {/* Clinical & Safety */}
            <CategoryHeader icon="🏥" title="Clinical & Safety" />

            <CompareSection title="Clinical Trials">
              <div>
                <StatValueWithDelta label="trials" value={dataA.trials.length} delta={computeDelta(dataA.trials.length, dataB.trials.length, true)} />
                <PhaseBarChart distribution={computePhaseDistribution(dataA.trials)} totalTrials={dataA.trials.length} />
              </div>
              <div>
                <StatValueWithDelta label="trials" value={dataB.trials.length} delta={computeDelta(dataB.trials.length, dataA.trials.length, true)} />
                <PhaseBarChart distribution={computePhaseDistribution(dataB.trials)} totalTrials={dataB.trials.length} />
              </div>
            </CompareSection>

            <CompareSection title="Indications (ChEMBL)">
              <StatValueWithDelta label="indications" value={dataA.chemblIndications.length} delta={computeDelta(dataA.chemblIndications.length, dataB.chemblIndications.length, true)} />
              <StatValueWithDelta label="indications" value={dataB.chemblIndications.length} delta={computeDelta(dataB.chemblIndications.length, dataA.chemblIndications.length, true)} />
            </CompareSection>

            <CompareSection title="Adverse Events (Top 5)">
              <TopList items={dataA.adverseEvents.slice(0, 5).map(e => `${e.reactionName} (${e.count})`)} emptyText="None reported" />
              <TopList items={dataB.adverseEvents.slice(0, 5).map(e => `${e.reactionName} (${e.count})`)} emptyText="None reported" />
            </CompareSection>

            <CompareSection title="Drug Recalls">
              <StatValueWithDelta label="recalls" value={dataA.drugRecalls.length} delta={computeDelta(dataA.drugRecalls.length, dataB.drugRecalls.length, false)} />
              <StatValueWithDelta label="recalls" value={dataB.drugRecalls.length} delta={computeDelta(dataB.drugRecalls.length, dataA.drugRecalls.length, false)} />
            </CompareSection>

            {/* Bioactivity & Targets */}
            <CategoryHeader icon="🎯" title="Bioactivity & Targets" />

            <CompareSection title="ChEMBL Bioactivity">
              <div>
                <StatValueWithDelta label="activities" value={dataA.chemblActivities.length} delta={computeDelta(dataA.chemblActivities.length, dataB.chemblActivities.length, true)} />
                <p className="text-xs text-slate-400 mt-1">{uniqueTargets(dataA.chemblActivities)} unique targets</p>
              </div>
              <div>
                <StatValueWithDelta label="activities" value={dataB.chemblActivities.length} delta={computeDelta(dataB.chemblActivities.length, dataA.chemblActivities.length, true)} />
                <p className="text-xs text-slate-400 mt-1">{uniqueTargets(dataB.chemblActivities)} unique targets</p>
              </div>
            </CompareSection>

            <CompareSection title="Mechanisms of Action">
              <TopList items={dataA.chemblMechanisms.map(m => `${m.actionType}: ${m.mechanismOfAction}`)} emptyText="None found" />
              <TopList items={dataB.chemblMechanisms.map(m => `${m.actionType}: ${m.mechanismOfAction}`)} emptyText="None found" />
            </CompareSection>

            <CompareSection title="Protein Targets (UniProt)">
              <TopList items={dataA.uniprotEntries.map(u => `${u.geneName} — ${u.proteinName}`)} emptyText="None found" />
              <TopList items={dataB.uniprotEntries.map(u => `${u.geneName} — ${u.proteinName}`)} emptyText="None found" />
            </CompareSection>

            {/* Protein & Structure */}
            <CategoryHeader icon="🧬" title="Protein & Structure" />

            <CompareSection title="PDB Structures">
              <StatValueWithDelta label="crystal structures" value={dataA.pdbStructures.length} delta={computeDelta(dataA.pdbStructures.length, dataB.pdbStructures.length, true)} />
              <StatValueWithDelta label="crystal structures" value={dataB.pdbStructures.length} delta={computeDelta(dataB.pdbStructures.length, dataA.pdbStructures.length, true)} />
            </CompareSection>

            {/* Interactions & Pathways */}
            <CategoryHeader icon="🔗" title="Interactions & Pathways" />

            <CompareSection title="Reactome Pathways">
              <StatValueWithDelta label="pathways" value={dataA.reactomePathways.length} delta={computeDelta(dataA.reactomePathways.length, dataB.reactomePathways.length, true)} />
              <StatValueWithDelta label="pathways" value={dataB.reactomePathways.length} delta={computeDelta(dataB.reactomePathways.length, dataA.reactomePathways.length, true)} />
            </CompareSection>

            {/* Research & Literature */}
            <CategoryHeader icon="📚" title="Research & Literature" />

            <CompareSection title="Publications">
              <StatValueWithDelta label="papers" value={Math.max(dataA.literature.length, dataA.semanticPapers.length)} delta={computeDelta(Math.max(dataA.literature.length, dataA.semanticPapers.length), Math.max(dataB.literature.length, dataB.semanticPapers.length), true)} />
              <StatValueWithDelta label="papers" value={Math.max(dataB.literature.length, dataB.semanticPapers.length)} delta={computeDelta(Math.max(dataB.literature.length, dataB.semanticPapers.length), Math.max(dataA.literature.length, dataA.semanticPapers.length), true)} />
            </CompareSection>

            <CompareSection title="Patents">
              <StatValueWithDelta label="patents" value={dataA.patents.length} delta={computeDelta(dataA.patents.length, dataB.patents.length, true)} />
              <StatValueWithDelta label="patents" value={dataB.patents.length} delta={computeDelta(dataB.patents.length, dataA.patents.length, true)} />
            </CompareSection>

            <CompareSection title="Top Patent Assignees">
              <TopList items={Array.from(new Set(dataA.patents.map(p => p.assignee)))} emptyText="None found" />
              <TopList items={Array.from(new Set(dataB.patents.map(p => p.assignee)))} emptyText="None found" />
            </CompareSection>

            <CompareSection title="NIH Grants">
              <StatValueWithDelta label="active grants" value={dataA.nihGrants.length} delta={computeDelta(dataA.nihGrants.length, dataB.nihGrants.length, true)} />
              <StatValueWithDelta label="active grants" value={dataB.nihGrants.length} delta={computeDelta(dataB.nihGrants.length, dataA.nihGrants.length, true)} />
            </CompareSection>
          </div>
        )}

        {!hasValidCids && !searchParams.a && !searchParams.b && (
          <p className="text-slate-500 text-center py-12">
            Search for two molecules above to compare them side by side.
          </p>
        )}
      </main>
    </div>
  )
}