// PR3b: getDrugsForDisease uses real known drugs (drugAndClinicalCandidates GraphQL).
import {
  searchDiseases as searchOpenTargetsDiseases,
  getTargetsForDisease,
  getDrugsForDisease,
} from '@/lib/api/opentargets'
import { searchOrphanetDiseases, getOrphanetGenes } from '@/lib/api/orphanet'
import { getGenesByDisease } from '@/lib/api/disgenet'
import { getMoleculeCidByName } from '@/lib/api/pubchem'

/** How a related molecule was selected for a disease (evidence-first, no LLM). */
export type MoleculeRelationKind =
  | 'known_drug'
  | 'gene_associated'
  | 'disease_linked'

export interface DiseaseMolecule {
  name: string
  cid: number | null
  /** Human-readable why this molecule appears in Related Molecules */
  reason?: string
  /** Machine-stable relation category for UI badges / prompts */
  relationKind?: MoleculeRelationKind
  /** Disease DB source labels (e.g. Open Targets) after dedupe */
  sources?: string[]
}

export interface DiseaseResult {
  id: string
  name: string
  description?: string
  therapeuticAreas?: string[]
  source: string
  molecules?: DiseaseMolecule[]
}

export interface GeneAssociation {
  geneSymbol: string
  geneId: string
  source: string
  score: number
  entrezId?: string
}

export interface DedupedDiseaseMolecule {
  name: string
  cid: number | null
  sources: string[]
  reason: string
  relationKind: MoleculeRelationKind
  /** Distinct reasons when multiple sources contributed */
  reasons: string[]
}

/** Fallback reason when only a source label is known. */
export function reasonForDiseaseMoleculeSource(
  source: string,
  kind: MoleculeRelationKind = 'disease_linked',
): string {
  const s = (source || '').toLowerCase()
  if (kind === 'known_drug' || s.includes('open target')) {
    return 'Listed as a known drug or clinical candidate for this disease (Open Targets).'
  }
  if (s.includes('orphanet')) {
    return 'Linked via an Orphanet disease-associated gene (UniProt protein name → PubChem).'
  }
  if (s.includes('disgenet')) {
    return 'Linked via a DisGeNET disease–gene association (UniProt protein name → PubChem).'
  }
  return `Associated with this disease via ${source || 'public disease databases'}.`
}

export function rankDiseaseResults(results: DiseaseResult[], query: string): DiseaseResult[] {
  const lower = query.toLowerCase()
  return [...results].sort((a, b) => {
    const aExact = a.name.toLowerCase() === lower ? 2 : a.name.toLowerCase().startsWith(lower) ? 1 : 0
    const bExact = b.name.toLowerCase() === lower ? 2 : b.name.toLowerCase().startsWith(lower) ? 1 : 0
    return bExact - aExact
  })
}

function parseLimit(limitParam: string | null): number {
  return Math.min(Math.max(parseInt(limitParam ?? '10', 10) || 10, 1), 25)
}

export { parseLimit }

export async function fetchDisGeNetDiseases(query: string): Promise<{ id: string; name: string }[]> {
  const associations = await getGenesByDisease(query)
  const seen = new Set<string>()
  const diseases: { id: string; name: string }[] = []
  for (const assoc of associations) {
    const key = assoc.diseaseName?.toLowerCase()
    if (key && !seen.has(key)) {
      seen.add(key)
      diseases.push({ id: assoc.diseaseId, name: assoc.diseaseName })
    }
  }
  return diseases
}

export async function resolveMoleculesFromNames(
  names: string[],
  opts?: {
    reason?: string
    relationKind?: MoleculeRelationKind
  },
): Promise<DiseaseMolecule[]> {
  const reason =
    opts?.reason ??
    'Resolved by drug/compound name from the disease association source → PubChem CID.'
  const relationKind = opts?.relationKind ?? 'disease_linked'
  const results = await Promise.allSettled(
    names.slice(0, 10).map(async (name) => {
      try {
        const cid = await getMoleculeCidByName(name)
        return { name, cid, reason, relationKind } satisfies DiseaseMolecule
      } catch {
        return { name, cid: null, reason, relationKind } satisfies DiseaseMolecule
      }
    }),
  )
  const out: DiseaseMolecule[] = []
  for (const r of results) {
    if (r.status === 'fulfilled') {
      out.push(r.value)
    }
  }
  return out
}

export async function resolveMoleculesFromGenes(
  geneSymbols: string[],
  opts?: {
    /** Disease DB label used in the reason string */
    sourceLabel?: string
  },
): Promise<DiseaseMolecule[]> {
  const sourceLabel = opts?.sourceLabel ?? 'disease gene association'
  const unique = Array.from(new Set(geneSymbols.filter(Boolean)))
  const results = await Promise.allSettled(
    unique.slice(0, 10).map(async (symbol) => {
      const reason = `Disease-associated gene ${symbol} (${sourceLabel}) → UniProt protein name → PubChem name match. Not necessarily an approved drug.`
      try {
        const proteinRes = await fetch(
          `https://rest.uniprot.org/uniprotkb/search?query=${encodeURIComponent(symbol)}&fields=accession,protein_name&size=1&format=json`,
          { next: { revalidate: 86400 } },
        )
        if (!proteinRes.ok) {
          return {
            name: symbol,
            cid: null,
            reason,
            relationKind: 'gene_associated' as const,
          } satisfies DiseaseMolecule
        }
        const data = await proteinRes.json()
        const proteinName: string =
          data?.results?.[0]?.proteinDescription?.recommendedName?.fullName?.value ?? symbol
        const cid = await getMoleculeCidByName(proteinName)
        const namedReason =
          proteinName !== symbol
            ? `Disease-associated gene ${symbol} (${sourceLabel}) → UniProt “${proteinName}” → PubChem name match. Not necessarily an approved drug.`
            : reason
        return {
          name: proteinName,
          cid,
          reason: namedReason,
          relationKind: 'gene_associated' as const,
        } satisfies DiseaseMolecule
      } catch {
        return {
          name: symbol,
          cid: null,
          reason,
          relationKind: 'gene_associated' as const,
        } satisfies DiseaseMolecule
      }
    }),
  )
  const out: DiseaseMolecule[] = []
  for (const r of results) {
    if (r.status === 'fulfilled') {
      out.push(r.value)
    }
  }
  return out
}

export async function searchDiseases(query: string, limit: number): Promise<DiseaseResult[]> {
  const [otResults, orphanetResults, disgenetResults] = await Promise.allSettled([
    searchOpenTargetsDiseases(query),
    searchOrphanetDiseases(query),
    fetchDisGeNetDiseases(query),
  ])

  if (otResults.status === 'rejected') console.error('[api/search/disease] Open Targets failed:', otResults.reason)
  if (orphanetResults.status === 'rejected') console.error('[api/search/disease] Orphanet failed:', orphanetResults.reason)
  if (disgenetResults.status === 'rejected') console.error('[api/search/disease] DisGeNET failed:', disgenetResults.reason)

  const candidates: DiseaseResult[] = []
  const seen = new Set<string>()

  const otDiseases = otResults.status === 'fulfilled' ? otResults.value : []
  for (const d of otDiseases.slice(0, limit)) {
    const name = d.diseaseName ?? ''
    if (!name) continue
    const key = name.toLowerCase() || d.diseaseId
    if (!seen.has(key)) {
      seen.add(key)
      candidates.push({
        id: d.diseaseId,
        name,
        description: d.description,
        therapeuticAreas: d.therapeuticAreas,
        source: 'Open Targets',
      })
    }
  }

  const orphanetDiseases = orphanetResults.status === 'fulfilled' ? orphanetResults.value : []
  for (const d of orphanetDiseases.slice(0, limit)) {
    const key = d.diseaseName?.toLowerCase()
    if (key && !seen.has(key)) {
      seen.add(key)
      candidates.push({
        id: d.orphaCode,
        name: d.diseaseName,
        description: d.definition,
        source: 'Orphanet',
      })
    }
  }

  if (disgenetResults.status === 'fulfilled' && disgenetResults.value.length > 0) {
    for (const d of disgenetResults.value) {
      const key = d.name?.toLowerCase()
      if (key && !seen.has(key)) {
        seen.add(key)
        candidates.push({
          id: d.id,
          name: d.name,
          source: 'DisGeNET',
        })
        if (candidates.length >= limit * 2) break
      }
    }
  }

  const ranked = rankDiseaseResults(candidates, query)

  const topResults = ranked.slice(0, limit)

  const withMolecules = await Promise.all(
    topResults.map(async (r) => {
      try {
        // PR3b: attach real OT known drugs / clinical candidates (not targets).
        if (r.source === 'Open Targets' && r.id) {
          const drugNames = (await getDrugsForDisease(r.id)) ?? []
          if (drugNames.length > 0) {
            const molecules = await resolveMoleculesFromNames(drugNames.slice(0, 10), {
              reason:
                'Open Targets known drug or clinical candidate for this disease (drugAndClinicalCandidates), resolved to PubChem by name.',
              relationKind: 'known_drug',
            })
            if (molecules.length > 0) return { ...r, molecules }
          }
          return r
        }

        if (r.source === 'Orphanet' && r.id) {
          const geneSymbols = await getOrphanetGenes(r.id)
          if (geneSymbols.length > 0) {
            const molecules = await resolveMoleculesFromGenes(geneSymbols, {
              sourceLabel: 'Orphanet',
            })
            if (molecules.length > 0) return { ...r, molecules }
          }
          return r
        }

        if (r.source === 'DisGeNET') {
          const geneAssociations = await getGenesByDisease(r.name)
          const geneSymbols = geneAssociations.map((a) => a.geneSymbol).filter(Boolean)
          const molecules = await resolveMoleculesFromGenes(geneSymbols, {
            sourceLabel: 'DisGeNET',
          })
          return { ...r, molecules }
        }

        return r
      } catch {
        return r
      }
    }),
  )

  return withMolecules
}

export function deduplicateMolecules(results: DiseaseResult[]): DedupedDiseaseMolecule[] {
  const seen = new Map<string, DedupedDiseaseMolecule>()
  for (const r of results) {
    if (!r.molecules) continue
    for (const m of r.molecules) {
      const key = m.cid != null ? `cid:${m.cid}` : `name:${m.name.toLowerCase()}`
      const reason =
        m.reason?.trim() || reasonForDiseaseMoleculeSource(r.source, m.relationKind)
      const relationKind = m.relationKind ?? 'disease_linked'
      const existing = seen.get(key)
      if (existing) {
        if (!existing.sources.includes(r.source)) {
          existing.sources.push(r.source)
        }
        if (reason && !existing.reasons.includes(reason)) {
          existing.reasons.push(reason)
        }
        // Prefer known_drug when any source contributed it
        if (relationKind === 'known_drug') {
          existing.relationKind = 'known_drug'
          existing.reason = reason
        } else if (existing.relationKind !== 'known_drug' && existing.reasons[0]) {
          existing.reason = existing.reasons[0]
        }
      } else {
        seen.set(key, {
          name: m.name,
          cid: m.cid,
          sources: [r.source],
          reason,
          relationKind,
          reasons: [reason],
        })
      }
    }
  }
  return Array.from(seen.values())
}

export function deduplicateGenes(genes: GeneAssociation[]): GeneAssociation[] {
  const seen = new Map<string, GeneAssociation>()
  for (const g of genes) {
    const key = g.geneSymbol.toUpperCase()
    const existing = seen.get(key)
    if (existing) {
      if (g.score > existing.score) {
        existing.score = g.score
      }
      if (!existing.geneId && g.geneId) {
        existing.geneId = g.geneId
      }
      if (!existing.entrezId && g.entrezId) {
        existing.entrezId = g.entrezId
      }
      if (!existing.source.includes(g.source)) {
        existing.source = `${existing.source}, ${g.source}`
      }
    } else {
      seen.set(key, { ...g })
    }
  }
  return Array.from(seen.values()).sort((a, b) => b.score - a.score)
}

export async function getDiseaseGeneAssociations(id: string, source: string, name: string): Promise<GeneAssociation[]> {
  const genes: GeneAssociation[] = []

  try {
    if (source === 'Open Targets' && id) {
      const targets = await getTargetsForDisease(id)
      for (const t of targets) {
        const symbol = t.name.split(' ')[0]
        genes.push({
          geneSymbol: symbol,
          geneId: t.id,
          source: 'Open Targets',
          score: t.overallScore,
        })
      }
    }

    if (source === 'Orphanet' && id) {
      const symbols = await getOrphanetGenes(id)
      for (const symbol of symbols) {
        genes.push({
          geneSymbol: symbol,
          geneId: '',
          source: 'Orphanet',
          score: 0,
        })
      }
    }

    if (source === 'DisGeNET' && name) {
      const associations = await getGenesByDisease(name)
      for (const a of associations) {
        genes.push({
          geneSymbol: a.geneSymbol,
          geneId: a.geneId,
          source: 'DisGeNET',
          score: a.score,
          entrezId: a.geneId,
        })
      }
    }
  } catch {}

  return deduplicateGenes(genes)
}