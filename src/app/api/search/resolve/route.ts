import { NextRequest, NextResponse } from 'next/server'
import { getMoleculeCidByName, resolveIdentifier } from '@/lib/api/pubchem'
import type { SearchType } from '@/lib/apiIdentifiers'

const GENE_SYMBOL_PATTERN = /^[A-Z][A-Z0-9-]*$/
const PUBCHEM_PUG = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug'
const PC_FETCH_OPTS: RequestInit = { next: { revalidate: 86400 } }

async function resolveGeneToCid(name: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://rest.genenames.org/search/symbol/${encodeURIComponent(name)}`,
      { headers: { Accept: 'application/json' }, next: { revalidate: 86400 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    const docs = data?.response?.docs
    if (!Array.isArray(docs) || docs.length === 0) return null
    const gene = docs[0]
    const proteinName = gene?.protein_names?.[0] || gene?.name || name
    const cid = await getMoleculeCidByName(proteinName)
    if (cid) return cid
    if (gene?.prev_sym?.length > 0) {
      for (const prev of gene.prev_sym) {
        const altCid = await getMoleculeCidByName(prev)
        if (altCid) return altCid
      }
    }
    return null
  } catch {
    return null
  }
}

async function resolveProteinToCid(name: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://rest.uniprot.org/uniprotkb/search?query=${encodeURIComponent(name)}&fields=accession,protein_name&size=1&format=json`,
      { next: { revalidate: 86400 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    const result = data?.results?.[0]
    if (!result) return null
    const proteinName = result.proteinDescription?.recommendedName?.fullName?.value
      || name
    return getMoleculeCidByName(proteinName)
  } catch {
    return null
  }
}

async function getExtendedIdentifiers(cid: number) {
  try {
    const [propsRes, synRes] = await Promise.all([
      fetch(`${PUBCHEM_PUG}/compound/cid/${cid}/property/IsomericSMILES,InChIKey,MolecularFormula,IUPACName/JSON`, PC_FETCH_OPTS),
      fetch(`${PUBCHEM_PUG}/compound/cid/${cid}/synonyms/JSON`, PC_FETCH_OPTS),
    ])
    if (!propsRes.ok) return null
    const propsData = await propsRes.json()
    const props = propsData.PropertyTable?.Properties?.[0]
    if (!props) return null

    const synonyms: string[] = synRes.ok
      ? ((await synRes.json()).InformationList?.Information?.[0]?.Synonym ?? [])
      : []

    const casNumber = synonyms.find(s => /^\d{2,7}-\d{2,7}-\d$/.test(s)) ?? ''

    return {
      cid,
      name: props.IUPACName ?? String(cid),
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
  const type = (request.nextUrl.searchParams.get('type') ?? 'name') as SearchType
  const extended = request.nextUrl.searchParams.get('extended') === 'true'

  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  let cid: number | null = null

  if (type === 'name') {
    cid = await getMoleculeCidByName(name)

    if (!cid) {
      if (GENE_SYMBOL_PATTERN.test(name)) {
        cid = await resolveGeneToCid(name)
      }
      if (!cid) {
        cid = await resolveProteinToCid(name)
      }
    }
  } else {
    cid = await resolveIdentifier(name, type)
  }

  if (!cid) return NextResponse.json({ cid: null })

  if (extended) {
    const identifiers = await getExtendedIdentifiers(cid)
    return NextResponse.json(identifiers ?? { cid })
  }

  return NextResponse.json({ cid })
}