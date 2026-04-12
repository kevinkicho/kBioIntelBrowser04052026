import { NextRequest, NextResponse } from 'next/server'
import { getMoleculeCidByName } from '@/lib/api/pubchem'

const GENE_SYMBOL_PATTERN = /^[A-Z][A-Z0-9-]*$/

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

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get('name')
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  let cid = await getMoleculeCidByName(name)

  if (!cid) {
    if (GENE_SYMBOL_PATTERN.test(name)) {
      cid = await resolveGeneToCid(name)
    }
    if (!cid) {
      cid = await resolveProteinToCid(name)
    }
  }

  return NextResponse.json({ cid })
}
