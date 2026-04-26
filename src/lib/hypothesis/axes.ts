import { getMoleculeCidByName } from '../api/pubchem'
import type { FilterAxis, MoleculeMatch } from './types'

const DGIDB_GRAPHQL_URL = 'https://dgidb.org/api/graphql'
const CHEMBL_INDICATION_URL = 'https://www.ebi.ac.uk/chembl/api/data/drug_indication.json'
const CHEMBL_MOLECULE_URL = 'https://www.ebi.ac.uk/chembl/api/data/molecule.json'
const RXCLASS_MEMBERS_URL = 'https://rxnav.nlm.nih.gov/REST/rxclass/classMembers.json'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/** Cap each filter's result set so a loose filter doesn't blow up the intersection. */
const PER_FILTER_CAP = 200

/** Reasonably-bounded concurrent CID lookups so we don't drown PubChem. */
const CID_LOOKUP_CONCURRENCY = 8

export interface AxisDescriptor {
  id: FilterAxis
  label: string
  /** Hint for the value input UI: free text, phase number, ATC code prefix, etc. */
  valueKind: 'gene' | 'disease' | 'phase' | 'atc'
  placeholder: string
  description: string
  find: (value: string) => Promise<MoleculeMatch[]>
}

/**
 * Resolve a list of drug names to PubChem CIDs in parallel batches. Drugs that
 * fail to resolve are dropped (we accept lossy CID resolution per the plan).
 */
async function resolveDrugCids(
  drugs: { name: string; reason: string }[],
): Promise<MoleculeMatch[]> {
  const out: MoleculeMatch[] = []
  for (let i = 0; i < drugs.length; i += CID_LOOKUP_CONCURRENCY) {
    const batch = drugs.slice(i, i + CID_LOOKUP_CONCURRENCY)
    const resolved = await Promise.all(
      batch.map(async d => {
        const cid = await getMoleculeCidByName(d.name)
        if (!cid) return null
        return { cid, name: d.name, reason: d.reason }
      }),
    )
    for (const r of resolved) {
      if (r) out.push(r)
    }
  }
  return out
}

/** Filter axis: find molecules that target a given gene symbol via DGIdb. */
async function findByGeneTarget(geneSymbol: string): Promise<MoleculeMatch[]> {
  const symbol = geneSymbol.trim().toUpperCase()
  if (!symbol) return []
  try {
    const query = `query($names: [String!]) {
      genes(names: $names) {
        nodes {
          name
          interactions {
            drug { name conceptId }
            interactionTypes { type }
          }
        }
      }
    }`
    const res = await fetch(DGIDB_GRAPHQL_URL, {
      ...fetchOptions,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { names: [symbol] } }),
    })
    if (!res.ok) return []
    const data = await res.json()
    if (data.errors) return []

    const nodes = data.data?.genes?.nodes ?? []
    const drugMap = new Map<string, string>()
    for (const node of nodes) {
      for (const ix of node.interactions ?? []) {
        const drugName = ix.drug?.name
        if (!drugName) continue
        const types = (ix.interactionTypes ?? [])
          .map((t: { type: string }) => t.type)
          .filter(Boolean)
        const typeHint = types.length ? ` (${types.join(', ')})` : ''
        if (!drugMap.has(drugName)) {
          drugMap.set(drugName, `Targets ${symbol}${typeHint}`)
        }
      }
    }

    const drugs = Array.from(drugMap.entries())
      .slice(0, PER_FILTER_CAP)
      .map(([name, reason]) => ({ name, reason }))
    return resolveDrugCids(drugs)
  } catch {
    return []
  }
}

/** Filter axis: find molecules indicated for a given disease via ChEMBL. */
async function findByIndication(diseaseName: string): Promise<MoleculeMatch[]> {
  const term = diseaseName.trim()
  if (!term) return []
  try {
    // Try MeSH heading first (fast exact match), then fallback to EFO term.
    const meshUrl =
      `${CHEMBL_INDICATION_URL}?mesh_heading__icontains=${encodeURIComponent(term)}&limit=${PER_FILTER_CAP}`
    let res = await fetch(meshUrl, fetchOptions)
    let data: { drug_indications?: Record<string, unknown>[] } = {}
    if (res.ok) data = await res.json()
    let indications = data.drug_indications ?? []

    if (indications.length === 0) {
      const efoUrl =
        `${CHEMBL_INDICATION_URL}?efo_term__icontains=${encodeURIComponent(term)}&limit=${PER_FILTER_CAP}`
      res = await fetch(efoUrl, fetchOptions)
      if (res.ok) {
        data = await res.json()
        indications = data.drug_indications ?? []
      }
    }

    // Aggregate by molecule_chembl_id, keep the highest phase as the reason.
    const byChemblId = new Map<string, { phase: number; label: string }>()
    for (const ind of indications) {
      const chemblId = String((ind as { molecule_chembl_id?: string }).molecule_chembl_id ?? '')
      if (!chemblId) continue
      const phase = Number((ind as { max_phase_for_ind?: number }).max_phase_for_ind) || 0
      const label = String(
        (ind as { mesh_heading?: string; efo_term?: string }).mesh_heading
          ?? (ind as { efo_term?: string }).efo_term
          ?? term,
      )
      const existing = byChemblId.get(chemblId)
      if (!existing || phase > existing.phase) {
        byChemblId.set(chemblId, { phase, label })
      }
    }

    if (byChemblId.size === 0) return []

    // Resolve ChEMBL IDs to drug names via the molecule endpoint (one batch).
    const chemblIds = Array.from(byChemblId.keys()).slice(0, PER_FILTER_CAP)
    const moleculeUrl =
      `${CHEMBL_MOLECULE_URL}?molecule_chembl_id__in=${chemblIds.join(',')}&limit=${chemblIds.length}`
    const mres = await fetch(moleculeUrl, fetchOptions)
    if (!mres.ok) return []
    const mdata = await mres.json()
    const molecules = (mdata.molecules ?? []) as Record<string, unknown>[]

    const drugs: { name: string; reason: string }[] = []
    for (const mol of molecules) {
      const chemblId = String(mol.molecule_chembl_id ?? '')
      const name = String(mol.pref_name ?? '').trim()
      if (!name) continue
      const meta = byChemblId.get(chemblId)
      if (!meta) continue
      const phaseTag = meta.phase > 0 ? `, max phase ${meta.phase}` : ''
      drugs.push({ name, reason: `Indicated for ${meta.label}${phaseTag}` })
    }

    return resolveDrugCids(drugs)
  } catch {
    return []
  }
}

/** Filter axis: find molecules with at least one trial in a given phase. */
async function findByTrialPhase(phaseValue: string): Promise<MoleculeMatch[]> {
  const phaseNum = parseInt(phaseValue, 10)
  if (!Number.isInteger(phaseNum) || phaseNum < 1 || phaseNum > 4) return []
  try {
    const phaseLabel = `PHASE${phaseNum}`
    // ClinicalTrials.gov v2: filter by phase + drug intervention to get drug names.
    // pageSize is capped at 1000; we sample a generous slice and aggregate names.
    const url =
      `https://clinicaltrials.gov/api/v2/studies` +
      `?filter.advanced=AREA[Phase]${phaseLabel}` +
      `&fields=protocolSection.armsInterventionsModule.interventions` +
      `&pageSize=200&format=json`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()
    const studies = (data.studies ?? []) as Record<string, unknown>[]

    const counts = new Map<string, number>()
    for (const s of studies) {
      const protocol = (s.protocolSection ?? {}) as Record<string, unknown>
      const arms = (protocol.armsInterventionsModule ?? {}) as Record<string, unknown>
      const interventions = (arms.interventions ?? []) as { type?: string; name?: string }[]
      for (const iv of interventions) {
        if (!iv.name) continue
        if (iv.type !== 'DRUG' && iv.type !== 'BIOLOGICAL') continue
        // Strip dose suffixes ("Aspirin 100mg" → "Aspirin") to improve CID resolution.
        const cleanName = iv.name.split(/[\d(]/)[0].trim()
        if (!cleanName || cleanName.length < 3) continue
        const key = cleanName.toLowerCase()
        counts.set(key, (counts.get(key) ?? 0) + 1)
      }
    }

    // Take top-N by trial count, deduped, capped.
    const topDrugs = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, PER_FILTER_CAP)
      .map(([name, count]) => ({
        name,
        reason: `Has ${count} Phase ${phaseNum} trial${count === 1 ? '' : 's'}`,
      }))

    return resolveDrugCids(topDrugs)
  } catch {
    return []
  }
}

/** Filter axis: find molecules in a given ATC therapeutic class via RxClass. */
async function findByAtcClass(atcCode: string): Promise<MoleculeMatch[]> {
  const code = atcCode.trim().toUpperCase()
  if (!code) return []
  try {
    const url =
      `${RXCLASS_MEMBERS_URL}?classId=${encodeURIComponent(code)}&relaSource=ATC&ttys=IN`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    const drugMembers = data.drugMemberGroup?.drugMember ?? []
    const drugs: { name: string; reason: string }[] = []
    for (const m of drugMembers as Record<string, unknown>[]) {
      const concept = (m.minConcept ?? {}) as Record<string, unknown>
      const name = String(concept.name ?? '').trim()
      if (!name) continue
      drugs.push({ name, reason: `In ATC class ${code}` })
      if (drugs.length >= PER_FILTER_CAP) break
    }

    return resolveDrugCids(drugs)
  } catch {
    return []
  }
}

export const AXES: AxisDescriptor[] = [
  {
    id: 'targets-gene',
    label: 'Targets gene',
    valueKind: 'gene',
    placeholder: 'e.g. EGFR, BRCA1',
    description: 'Molecules whose targets include this gene (DGIdb)',
    find: findByGeneTarget,
  },
  {
    id: 'indicated-for',
    label: 'Indicated for disease',
    valueKind: 'disease',
    placeholder: 'e.g. melanoma, asthma',
    description: 'Molecules with a ChEMBL indication for this disease',
    find: findByIndication,
  },
  {
    id: 'trial-phase',
    label: 'Trial phase',
    valueKind: 'phase',
    placeholder: '1, 2, 3, or 4',
    description: 'Molecules with at least one trial in this phase (ClinicalTrials.gov)',
    find: findByTrialPhase,
  },
  {
    id: 'atc-class',
    label: 'ATC class',
    valueKind: 'atc',
    placeholder: 'e.g. L01, N02BA',
    description: 'Molecules belonging to this ATC therapeutic class (RxClass)',
    find: findByAtcClass,
  },
]

export function getAxis(id: FilterAxis): AxisDescriptor | undefined {
  return AXES.find(a => a.id === id)
}
