import { NextRequest, NextResponse } from 'next/server'
import { getMoleculeById } from '@/lib/api/pubchem'
import { getUniprotEntriesByName } from '@/lib/api/uniprot'
import { getAlphaFoldPredictions } from '@/lib/api/alphafold'
import { resolveDrugTargets } from '@/lib/api/drugTargetResolve'

async function accessionsForGene(gene: string): Promise<string[]> {
  // Fielded UniProt query is more reliable than free-text for gene symbols
  const queries = [
    `gene_exact:${gene} AND organism_id:9606`,
    `gene:${gene} AND organism_id:9606`,
    gene,
  ]
  for (const q of queries) {
    try {
      const entries = await getUniprotEntriesByName(q)
      const accs = entries.map((e) => e.accession).filter(Boolean)
      if (accs.length) return accs
    } catch {
      /* next */
    }
  }
  return []
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cid = parseInt(params.id, 10)
  if (isNaN(cid)) {
    return NextResponse.json({ error: 'Invalid molecule ID' }, { status: 400 })
  }

  const molecule = await getMoleculeById(cid)
  if (!molecule) {
    return NextResponse.json({ alphaFoldPredictions: [] })
  }

  // Prefer ChEMBL target UniProt accessions over free-text name search
  const resolved = await resolveDrugTargets(molecule.name, 5)
  let accessions = [...resolved.uniprotAccessions]

  if (accessions.length === 0) {
    for (const gene of resolved.geneSymbols.slice(0, 4)) {
      const accs = await accessionsForGene(gene)
      accessions.push(...accs)
      if (accessions.length >= 5) break
    }
  }

  if (accessions.length === 0) {
    const uniprotEntries = await getUniprotEntriesByName(molecule.name)
    accessions = uniprotEntries.map((e) => e.accession).filter(Boolean)
  }

  accessions = Array.from(new Set(accessions.map((a) => a.toUpperCase()))).slice(0, 5)

  let alphaFoldPredictions = await getAlphaFoldPredictions(accessions)

  // If predictions empty but we have genes, try one more UniProt round-trip
  if (alphaFoldPredictions.length === 0 && resolved.geneSymbols.length > 0) {
    const retry: string[] = []
    for (const gene of resolved.geneSymbols.slice(0, 3)) {
      retry.push(...(await accessionsForGene(gene)))
    }
    const uniq = Array.from(new Set(retry.map((a) => a.toUpperCase()))).slice(0, 5)
    if (uniq.length) {
      alphaFoldPredictions = await getAlphaFoldPredictions(uniq)
    }
  }

  return NextResponse.json({ alphaFoldPredictions })
}
