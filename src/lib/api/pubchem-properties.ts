import type { ComputedProperties } from '../types'

const BASE_URL = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid'
const PROPERTIES = 'XLogP,TPSA,HBondDonorCount,HBondAcceptorCount,Complexity,ExactMass,Charge,RotatableBondCount'

const UA =
  process.env.NCBI_EMAIL
    ? `BioIntel/0.1 (mailto:${process.env.NCBI_EMAIL})`
    : 'BioIntel/0.1 (+https://github.com/kevinkicho/kBioIntelBrowser04052026)'

async function pubchemFetch(url: string, attempts = 3): Promise<Response> {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        cache: 'no-store',
        headers: { Accept: 'application/json', 'User-Agent': UA },
      })
      if (res.ok || ![429, 500, 502, 503, 504].includes(res.status) || i === attempts - 1) {
        return res
      }
      await new Promise((r) => setTimeout(r, 300 * 2 ** i))
    } catch (err) {
      if (i === attempts - 1) throw err
      await new Promise((r) => setTimeout(r, 300 * 2 ** i))
    }
  }
  throw new Error('PubChem properties fetch failed')
}

export async function getComputedPropertiesByCid(cid: number): Promise<ComputedProperties | null> {
  try {
    const url = `${BASE_URL}/${cid}/property/${PROPERTIES}/JSON`
    const res = await pubchemFetch(url)
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
