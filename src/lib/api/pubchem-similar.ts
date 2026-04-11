export interface SimilarMolecule {
  cid: number
  name: string
  formula: string
  molecularWeight: number
  imageUrl: string
}

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function getSimilarMolecules(cid: number): Promise<SimilarMolecule[]> {
  try {
    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/fastsimilarity_2d/cid/${cid}/cids/JSON?Threshold=90&MaxRecords=6`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()
    const cids: number[] = (data.IdentifierList?.CID ?? []).filter((id: number) => id !== cid).slice(0, 5)
    if (cids.length === 0) return []

    const propsUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cids.join(',')}/property/Title,MolecularFormula,MolecularWeight/JSON`
    const propsRes = await fetch(propsUrl, fetchOptions)
    if (!propsRes.ok) return []
    const propsData = await propsRes.json()

    return (propsData.PropertyTable?.Properties ?? []).map((p: { CID: number; Title?: string; MolecularFormula?: string; MolecularWeight?: number }) => ({
      cid: p.CID,
      name: p.Title ?? `CID ${p.CID}`,
      formula: p.MolecularFormula ?? '',
      molecularWeight: Number(p.MolecularWeight) || 0,
      imageUrl: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${p.CID}/PNG?image_size=small`,
    }))
  } catch {
    return []
  }
}
