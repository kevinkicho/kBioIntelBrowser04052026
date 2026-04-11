import Link from 'next/link'
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
import type {
  Molecule, CompanyProduct, Patent, ClinicalTrial, AdverseEvent,
  ComputedProperties, GhsHazardData, DrugLabel, OrangeBookEntry,
  DrugInteraction, DrugRecall, NdcProduct, ChemblActivity,
  ChemblMechanism, ChemblIndication, UniprotEntry, LiteratureResult,
  NihGrant, SemanticPaper, PdbStructure, ReactomePathway,
} from '@/lib/types'

interface MoleculeData {
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

async function fetchMoleculeData(cid: number): Promise<MoleculeData | null> {
  const molecule = await getMoleculeById(cid)
  if (!molecule) return null

  const [
    companies, patents, trials, adverseEvents,
    computedProperties, ghsHazards,
    drugLabels, orangeBookEntries, drugInteractions, drugRecalls, ndcProducts,
    chemblActivities, chemblMechanisms, chemblIndications, uniprotEntries,
    literature, nihGrants, semanticPapers,
    pdbStructures, reactomePathways,
  ] = await Promise.all([
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
    molecule, companies, patents, trials, adverseEvents,
    computedProperties, ghsHazards,
    drugLabels, orangeBookEntries, drugInteractions, drugRecalls, ndcProducts,
    chemblActivities, chemblMechanisms, chemblIndications, uniprotEntries,
    literature, nihGrants, semanticPapers,
    pdbStructures, reactomePathways,
  }
}

function StatValue({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-2xl font-bold text-slate-100">{value}</p>
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

function phaseBreakdown(trials: ClinicalTrial[]): string {
  const counts: Record<string, number> = {}
  for (const t of trials) {
    const phase = (t.phase || '').toLowerCase()
    if (phase.includes('phase 1')) counts['P1'] = (counts['P1'] || 0) + 1
    if (phase.includes('phase 2')) counts['P2'] = (counts['P2'] || 0) + 1
    if (phase.includes('phase 3')) counts['P3'] = (counts['P3'] || 0) + 1
    if (phase.includes('phase 4')) counts['P4'] = (counts['P4'] || 0) + 1
  }
  return Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(' · ') || '—'
}

function uniqueTargets(activities: ChemblActivity[]): number {
  return new Set(activities.map(a => a.targetName).filter(Boolean)).size
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: { a?: string; b?: string }
}) {
  const cidA = searchParams.a ? parseInt(searchParams.a, 10) : NaN
  const cidB = searchParams.b ? parseInt(searchParams.b, 10) : NaN

  const hasComparison = !isNaN(cidA) && !isNaN(cidB)

  let dataA: MoleculeData | null = null
  let dataB: MoleculeData | null = null

  if (hasComparison) {
    ;[dataA, dataB] = await Promise.all([
      fetchMoleculeData(cidA),
      fetchMoleculeData(cidB),
    ])
  }

  return (
    <div className="min-h-screen bg-[#0f1117]">
      <header className="border-b border-slate-800 px-6 py-4">
        <Link href="/" className="text-slate-400 hover:text-slate-200 text-sm">← BioIntel Explorer</Link>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-3xl font-bold text-slate-100 mb-6">Compare Molecules</h1>

        <ComparePageClient />

        {hasComparison && dataA && dataB && (
          <div>
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
              <StatValue label="hazard pictograms" value={dataA.ghsHazards?.pictogramUrls?.length ?? 0} />
              <StatValue label="hazard pictograms" value={dataB.ghsHazards?.pictogramUrls?.length ?? 0} />
            </CompareSection>

            {/* Pharmaceutical */}
            <CategoryHeader icon="💊" title="Pharmaceutical" />

            <CompareSection title="Manufacturers">
              <StatValue label="manufacturers" value={dataA.companies.length} />
              <StatValue label="manufacturers" value={dataB.companies.length} />
            </CompareSection>

            <CompareSection title="Top Manufacturers">
              <TopList items={Array.from(new Set(dataA.companies.map(c => c.company)))} emptyText="None found" />
              <TopList items={Array.from(new Set(dataB.companies.map(c => c.company)))} emptyText="None found" />
            </CompareSection>

            <CompareSection title="NDC Products">
              <StatValue label="NDC codes" value={dataA.ndcProducts.length} />
              <StatValue label="NDC codes" value={dataB.ndcProducts.length} />
            </CompareSection>

            <CompareSection title="Orange Book Entries">
              <StatValue label="entries" value={dataA.orangeBookEntries.length} />
              <StatValue label="entries" value={dataB.orangeBookEntries.length} />
            </CompareSection>

            <CompareSection title="Drug Labels">
              <StatValue label="labels" value={dataA.drugLabels.length} />
              <StatValue label="labels" value={dataB.drugLabels.length} />
            </CompareSection>

            <CompareSection title="Drug Interactions">
              <StatValue label="interactions" value={dataA.drugInteractions.length} />
              <StatValue label="interactions" value={dataB.drugInteractions.length} />
            </CompareSection>

            {/* Clinical & Safety */}
            <CategoryHeader icon="🏥" title="Clinical & Safety" />

            <CompareSection title="Clinical Trials">
              <div>
                <StatValue label="trials" value={dataA.trials.length} />
                <p className="text-xs text-slate-400 mt-1">{phaseBreakdown(dataA.trials)}</p>
              </div>
              <div>
                <StatValue label="trials" value={dataB.trials.length} />
                <p className="text-xs text-slate-400 mt-1">{phaseBreakdown(dataB.trials)}</p>
              </div>
            </CompareSection>

            <CompareSection title="Indications (ChEMBL)">
              <StatValue label="indications" value={dataA.chemblIndications.length} />
              <StatValue label="indications" value={dataB.chemblIndications.length} />
            </CompareSection>

            <CompareSection title="Adverse Events (Top 5)">
              <TopList items={dataA.adverseEvents.slice(0, 5).map(e => `${e.reactionName} (${e.count})`)} emptyText="None reported" />
              <TopList items={dataB.adverseEvents.slice(0, 5).map(e => `${e.reactionName} (${e.count})`)} emptyText="None reported" />
            </CompareSection>

            <CompareSection title="Drug Recalls">
              <StatValue label="recalls" value={dataA.drugRecalls.length} />
              <StatValue label="recalls" value={dataB.drugRecalls.length} />
            </CompareSection>

            {/* Bioactivity & Targets */}
            <CategoryHeader icon="🎯" title="Bioactivity & Targets" />

            <CompareSection title="ChEMBL Bioactivity">
              <div>
                <StatValue label="activities" value={dataA.chemblActivities.length} />
                <p className="text-xs text-slate-400 mt-1">{uniqueTargets(dataA.chemblActivities)} unique targets</p>
              </div>
              <div>
                <StatValue label="activities" value={dataB.chemblActivities.length} />
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
              <StatValue label="crystal structures" value={dataA.pdbStructures.length} />
              <StatValue label="crystal structures" value={dataB.pdbStructures.length} />
            </CompareSection>

            {/* Interactions & Pathways */}
            <CategoryHeader icon="🔗" title="Interactions & Pathways" />

            <CompareSection title="Reactome Pathways">
              <StatValue label="pathways" value={dataA.reactomePathways.length} />
              <StatValue label="pathways" value={dataB.reactomePathways.length} />
            </CompareSection>

            {/* Research & Literature */}
            <CategoryHeader icon="📚" title="Research & Literature" />

            <CompareSection title="Publications">
              <StatValue label="papers" value={Math.max(dataA.literature.length, dataA.semanticPapers.length)} />
              <StatValue label="papers" value={Math.max(dataB.literature.length, dataB.semanticPapers.length)} />
            </CompareSection>

            <CompareSection title="Patents">
              <StatValue label="patents" value={dataA.patents.length} />
              <StatValue label="patents" value={dataB.patents.length} />
            </CompareSection>

            <CompareSection title="Top Patent Assignees">
              <TopList items={Array.from(new Set(dataA.patents.map(p => p.assignee)))} emptyText="None found" />
              <TopList items={Array.from(new Set(dataB.patents.map(p => p.assignee)))} emptyText="None found" />
            </CompareSection>

            <CompareSection title="NIH Grants">
              <StatValue label="active grants" value={dataA.nihGrants.length} />
              <StatValue label="active grants" value={dataB.nihGrants.length} />
            </CompareSection>
          </div>
        )}

        {!hasComparison && (
          <p className="text-slate-500 text-center py-12">
            Search for two molecules above to compare them side by side.
          </p>
        )}
      </main>
    </div>
  )
}
