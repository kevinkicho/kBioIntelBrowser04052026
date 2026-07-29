import type { ComputedProperties } from '../types'

const BASE_URL = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid'
const PROPERTIES =
  'XLogP,TPSA,HBondDonorCount,HBondAcceptorCount,Complexity,ExactMass,Charge,RotatableBondCount'

const UA =
  process.env.NCBI_EMAIL
    ? `BioIntel/0.1 (mailto:${process.env.NCBI_EMAIL})`
    : 'BioIntel/0.1 (+https://github.com/kevinkicho/kBioIntelBrowser04052026)'

async function pubchemFetch(url: string, attempts = 4): Promise<Response> {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        cache: 'no-store',
        headers: { Accept: 'application/json', 'User-Agent': UA },
      })
      if (res.ok || ![429, 500, 502, 503, 504].includes(res.status) || i === attempts - 1) {
        return res
      }
      await new Promise((r) => setTimeout(r, 400 * 2 ** i))
    } catch (err) {
      if (i === attempts - 1) throw err
      await new Promise((r) => setTimeout(r, 400 * 2 ** i))
    }
  }
  throw new Error('PubChem properties fetch failed')
}

async function fromChemblByName(name: string): Promise<ComputedProperties | null> {
  try {
    const searchRes = await fetch(
      `https://www.ebi.ac.uk/chembl/api/data/molecule/search.json?q=${encodeURIComponent(name)}&limit=1`,
      { next: { revalidate: 86400 } },
    )
    if (!searchRes.ok) return null
    const searchData = await searchRes.json()
    const chemblId = searchData.molecules?.[0]?.molecule_chembl_id
    if (!chemblId) return null
    const molRes = await fetch(
      `https://www.ebi.ac.uk/chembl/api/data/molecule/${chemblId}.json`,
      { next: { revalidate: 86400 } },
    )
    if (!molRes.ok) return null
    const mol = await molRes.json()
    const p = mol.molecule_properties
    if (!p) return null
    return {
      xLogP: p.alogp != null ? Number(p.alogp) : null,
      tpsa: p.psa != null ? Number(p.psa) : null,
      hBondDonorCount: Number(p.hbd) || 0,
      hBondAcceptorCount: Number(p.hba) || 0,
      complexity: Number(p.aromatic_rings) || 0,
      exactMass: Number(p.full_mwt || p.mw_freebase) || 0,
      charge: 0,
      rotatableBondCount: Number(p.rtb) || 0,
    }
  } catch {
    return null
  }
}

async function fromMyChemCid(cid: number): Promise<ComputedProperties | null> {
  try {
    const res = await fetch(
      `https://mychem.info/v1/chem/${cid}?fields=chembl.molecule_properties,pubchem`,
      { next: { revalidate: 86400 } },
    )
    if (!res.ok) return null
    const data = await res.json()
    const p = data.chembl?.molecule_properties
    if (p) {
      return {
        xLogP: p.alogp != null ? Number(p.alogp) : null,
        tpsa: p.psa != null ? Number(p.psa) : null,
        hBondDonorCount: Number(p.hbd) || 0,
        hBondAcceptorCount: Number(p.hba) || 0,
        complexity: Number(p.aromatic_rings) || 0,
        exactMass: Number(p.full_mwt || p.mw_freebase) || 0,
        charge: 0,
        rotatableBondCount: Number(p.rtb) || 0,
      }
    }
    return null
  } catch {
    return null
  }
}

export async function getComputedPropertiesByCid(
  cid: number,
  opts?: { name?: string },
): Promise<ComputedProperties | null> {
  try {
    const url = `${BASE_URL}/${cid}/property/${PROPERTIES}/JSON`
    const res = await pubchemFetch(url)
    if (res.ok) {
      const data = await res.json()
      const props = data.PropertyTable?.Properties?.[0]
      if (props) {
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
      }
    }
  } catch {
    /* fall through */
  }

  // PubChem is often 503 under load — free MyChem + ChEMBL fallbacks
  const my = await fromMyChemCid(cid)
  if (my) return my

  if (opts?.name?.trim()) {
    const chembl = await fromChemblByName(opts.name.trim())
    if (chembl) return chembl
  }

  // Last resort: resolve name from PubChem title if available via MyChem id only
  try {
    const res = await fetch(`https://mychem.info/v1/query?q=_id:${cid} OR pubchem.cid:${cid}&fields=name,chembl.molecule_properties&size=1`, {
      next: { revalidate: 86400 },
    })
    if (res.ok) {
      const data = await res.json()
      const hit = data.hits?.[0]
      const p = hit?.chembl?.molecule_properties
      if (p) {
        return {
          xLogP: p.alogp != null ? Number(p.alogp) : null,
          tpsa: p.psa != null ? Number(p.psa) : null,
          hBondDonorCount: Number(p.hbd) || 0,
          hBondAcceptorCount: Number(p.hba) || 0,
          complexity: Number(p.aromatic_rings) || 0,
          exactMass: Number(p.full_mwt || p.mw_freebase) || 0,
          charge: 0,
          rotatableBondCount: Number(p.rtb) || 0,
        }
      }
    }
  } catch {
    /* ignore */
  }

  return null
}
