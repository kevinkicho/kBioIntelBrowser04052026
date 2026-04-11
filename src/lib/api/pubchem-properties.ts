import type { ComputedProperties } from '../types'

const BASE_URL = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid'
const PROPERTIES = 'XLogP,TPSA,HBondDonorCount,HBondAcceptorCount,Complexity,ExactMass,Charge,RotatableBondCount'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function getComputedPropertiesByCid(cid: number): Promise<ComputedProperties | null> {
  try {
    const url = `${BASE_URL}/${cid}/property/${PROPERTIES}/JSON`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return null
    const data = await res.json()

    const props = data.PropertyTable?.Properties?.[0]
    if (!props) return null

    return {
      xLogP: props.XLogP != null ? Number(props.XLogP) : null,
      tpsa: props.TPSA != null ? Number(props.TPSA) : null,
      hBondDonorCount: Number(props.HBondDonorCount) || 0,
      hBondAcceptorCount: Number(props.HBondAcceptorCount) || 0,
      complexity: Number(props.Complexity) || 0,
      exactMass: Number(props.ExactMass) || 0,
      charge: Number(props.Charge) || 0,
      rotatableBondCount: Number(props.RotatableBondCount) || 0,
    }
  } catch {
    return null
  }
}
