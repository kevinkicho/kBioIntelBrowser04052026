import { timedFetch } from './timedFetch'

export interface SimilarMolecule {
  cid: number
  name: string
  formula: string
  molecularWeight: number
  imageUrl: string
}

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * PubChem 2D fingerprint neighbors. HTTP / HTML / timeout are not EMPTY.
 * True zero-neighbor IdentifierList remains [].
 */
export async function getSimilarMolecules(cid: number): Promise<SimilarMolecule[]> {
  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/fastsimilarity_2d/cid/${cid}/cids/JSON?Threshold=90&MaxRecords=6`
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  const contentType = (res.headers.get('content-type') || '').toLowerCase()
  if (contentType.includes('text/html')) {
    throw new Error('HTML response from PubChem similar')
  }
  const data = await res.json()
  const cids: number[] = (data.IdentifierList?.CID ?? []).filter((id: number) => id !== cid).slice(0, 5)
  if (cids.length === 0) return []

  const propsUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cids.join(',')}/property/Title,MolecularFormula,MolecularWeight/JSON`
  const propsRes = await timedFetch(propsUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (!propsRes.ok) {
    const err = new Error(`HTTP ${propsRes.status}`) as Error & { status?: number }
    err.status = propsRes.status
    throw err
  }
  const propsType = (propsRes.headers.get('content-type') || '').toLowerCase()
  if (propsType.includes('text/html')) {
    throw new Error('HTML response from PubChem similar properties')
  }
  const propsData = await propsRes.json()

  return (propsData.PropertyTable?.Properties ?? []).map((p: { CID: number; Title?: string; MolecularFormula?: string; MolecularWeight?: number }) => ({
    cid: p.CID,
    name: p.Title ?? `CID ${p.CID}`,
    formula: p.MolecularFormula ?? '',
    molecularWeight: Number(p.MolecularWeight) || 0,
    imageUrl: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${p.CID}/PNG?image_size=small`,
  }))
}
