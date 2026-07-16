import { NextRequest, NextResponse } from 'next/server'
import {
  getMoleculeCidByName,
  getMoleculeCandidatesByName,
  resolveIdentifier,
  type MoleculeCandidate,
} from '@/lib/api/pubchem'
import type { SearchType } from '@/lib/apiIdentifiers'

const VALID_SEARCH_TYPES = new Set(['name', 'cid', 'cas', 'smiles', 'inchikey', 'inchi', 'formula', 'disease'])

const GENE_SYMBOL_PATTERN = /^[A-Z][A-Z0-9-]{1,14}$/
const PUBCHEM_PUG = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug'
const PC_FETCH_OPTS: RequestInit = { next: { revalidate: 86400 } }

/**
 * Gene queries should NOT resolve to a random small-molecule CID.
 * Redirect the client to the gene explorer instead.
 */
function looksLikeGeneSymbol(name: string): boolean {
  return GENE_SYMBOL_PATTERN.test(name) && name.length >= 2 && name.length <= 15
}

async function getExtendedIdentifiers(cid: number) {
  try {
    const [propsRes, synRes] = await Promise.all([
      fetch(`${PUBCHEM_PUG}/compound/cid/${cid}/property/IsomericSMILES,InChIKey,MolecularFormula,IUPACName,Title/JSON`, PC_FETCH_OPTS),
      fetch(`${PUBCHEM_PUG}/compound/cid/${cid}/synonyms/JSON`, PC_FETCH_OPTS),
    ])
    if (!propsRes.ok) return null
    const propsData = await propsRes.json()
    const props = propsData.PropertyTable?.Properties?.[0]
    if (!props) return null

    const synonyms: string[] = synRes.ok
      ? ((await synRes.json()).InformationList?.Information?.[0]?.Synonym ?? [])
      : []

    const casNumber = synonyms.find(s => /^\d{2,7}-\d{2}-\d$/.test(s)) ?? ''

    return {
      cid,
      name: props.Title ?? props.IUPACName ?? String(cid),
      smiles: props.IsomericSMILES ?? '',
      inchiKey: props.InChIKey ?? '',
      formula: props.MolecularFormula ?? '',
      cas: casNumber,
      synonyms: synonyms.slice(0, 20),
    }
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get('name')
  const cidParam = request.nextUrl.searchParams.get('cid')
  const typeParam = request.nextUrl.searchParams.get('type') ?? 'name'
  const extended = request.nextUrl.searchParams.get('extended') === 'true'
  const disambiguate = request.nextUrl.searchParams.get('disambiguate') !== 'false'

  if (cidParam) {
    const cid = parseInt(cidParam, 10)
    if (isNaN(cid) || cid <= 0) return NextResponse.json({ error: 'Invalid CID' }, { status: 400 })
    try {
      const res = await fetch(`${PUBCHEM_PUG}/compound/cid/${cid}/property/Title/JSON`, PC_FETCH_OPTS)
      if (!res.ok) return NextResponse.json({ cid, name: null })
      const data = await res.json()
      const title = data.PropertyTable?.Properties?.[0]?.Title ?? null
      return NextResponse.json({ cid, name: title })
    } catch {
      return NextResponse.json({ cid, name: null })
    }
  }

  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  if (!VALID_SEARCH_TYPES.has(typeParam)) {
    return NextResponse.json({ error: `Invalid search type: ${typeParam}. Valid types: name, cid, cas, smiles, inchikey, inchi, formula, disease` }, { status: 400 })
  }

  if (typeParam === 'disease') {
    return NextResponse.json({ disease: true, name })
  }

  // Gene symbols: do not invent a molecule CID — send to gene path
  if (typeParam === 'name' && looksLikeGeneSymbol(name) && !name.includes(' ')) {
    // Only redirect if PubChem has no exact compound name hit first
    const compoundCid = await getMoleculeCidByName(name)
    if (!compoundCid) {
      return NextResponse.json({
        cid: null,
        gene: true,
        geneSymbol: name,
        message: 'Looks like a gene symbol — use Gene search for genomic data',
      })
    }
  }

  try {
    if (typeParam === 'name' && disambiguate) {
      const candidates: MoleculeCandidate[] = await getMoleculeCandidatesByName(name, 8)
      if (candidates.length === 0) {
        return NextResponse.json({ cid: null })
      }
      if (candidates.length === 1) {
        const cid = candidates[0].cid
        if (extended) {
          const identifiers = await getExtendedIdentifiers(cid)
          return NextResponse.json(identifiers ?? { cid, candidates })
        }
        return NextResponse.json({ cid, candidates })
      }
      // Multiple candidates — client must let the user choose
      return NextResponse.json({
        cid: candidates[0].cid,
        needsDisambiguation: true,
        candidates,
      })
    }

    let cid: number | null = null
    if (typeParam === 'name') {
      cid = await getMoleculeCidByName(name)
    } else {
      cid = await resolveIdentifier(name, typeParam as SearchType)
    }

    if (!cid) return NextResponse.json({ cid: null })

    if (extended) {
      const identifiers = await getExtendedIdentifiers(cid)
      return NextResponse.json(identifiers ?? { cid })
    }

    return NextResponse.json({ cid })
  } catch (error) {
    console.error('[api/search/resolve] Error:', error)
    return NextResponse.json({ error: 'Resolve failed', message: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
