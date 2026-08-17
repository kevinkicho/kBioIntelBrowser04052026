import type { ComputedProperties } from '../types'
import { timedFetch } from './timedFetch'

const BASE_URL = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid'
const PROPERTIES =
  'XLogP,TPSA,HBondDonorCount,HBondAcceptorCount,Complexity,ExactMass,Charge,RotatableBondCount'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * PubChem properties harvest leaf. HTTP / HTML / timeout / network are not EMPTY
 * after MyChem + ChEMBL fallbacks also fail. 404 and a live record with no
 * computed properties stay empty.
 */
function isAbsentStatus(status: number): boolean {
  return status === 404
}

function throwIfHttpFailed(res: Response, source: string): void {
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  const contentType = (res.headers?.get?.('content-type') || '').toLowerCase()
  if (contentType.includes('text/html')) {
    throw new Error(`HTML response from ${source}`)
  }
}

function fromChemblMoleculeProperties(
  p: Record<string, unknown> | null | undefined,
): ComputedProperties | null {
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
}

type Attempt<T> = { ok: true; data: T | null } | { ok: false; error: Error }

async function attempt<T>(fn: () => Promise<T | null>): Promise<Attempt<T>> {
  try {
    return { ok: true, data: await fn() }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e : new Error(String(e)) }
  }
}

async function fromPubchemCid(cid: number): Promise<ComputedProperties | null> {
  const url = `${BASE_URL}/${cid}/property/${PROPERTIES}/JSON`
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(res.status)) return null
  throwIfHttpFailed(res, 'PubChem properties')
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
}

async function fromMyChemCid(cid: number): Promise<ComputedProperties | null> {
  const res = await timedFetch(
    `https://mychem.info/v1/chem/${cid}?fields=chembl.molecule_properties,pubchem`,
    { next: { revalidate: 86400 }, timeoutMs: 8000 },
  )
  if (isAbsentStatus(res.status)) return null
  throwIfHttpFailed(res, 'MyChem properties')
  const data = await res.json()
  return fromChemblMoleculeProperties(data.chembl?.molecule_properties)
}

async function fromChemblByName(name: string): Promise<ComputedProperties | null> {
  const searchRes = await timedFetch(
    `https://www.ebi.ac.uk/chembl/api/data/molecule/search.json?q=${encodeURIComponent(name)}&limit=1`,
    { next: { revalidate: 86400 }, timeoutMs: 8000 },
  )
  if (isAbsentStatus(searchRes.status)) return null
  throwIfHttpFailed(searchRes, 'ChEMBL properties search')
  const searchData = await searchRes.json()
  const chemblId = searchData.molecules?.[0]?.molecule_chembl_id
  if (!chemblId) return null
  const molRes = await timedFetch(
    `https://www.ebi.ac.uk/chembl/api/data/molecule/${chemblId}.json`,
    { next: { revalidate: 86400 }, timeoutMs: 8000 },
  )
  if (isAbsentStatus(molRes.status)) return null
  throwIfHttpFailed(molRes, 'ChEMBL properties')
  const mol = await molRes.json()
  return fromChemblMoleculeProperties(mol.molecule_properties)
}

async function fromMyChemQuery(cid: number): Promise<ComputedProperties | null> {
  const res = await timedFetch(
    `https://mychem.info/v1/query?q=_id:${cid} OR pubchem.cid:${cid}&fields=name,chembl.molecule_properties&size=1`,
    { next: { revalidate: 86400 }, timeoutMs: 8000 },
  )
  if (isAbsentStatus(res.status)) return null
  throwIfHttpFailed(res, 'MyChem properties query')
  const data = await res.json()
  return fromChemblMoleculeProperties(data.hits?.[0]?.chembl?.molecule_properties)
}

export async function getComputedPropertiesByCid(
  cid: number,
  opts?: { name?: string },
): Promise<ComputedProperties | null> {
  const attempts: Attempt<ComputedProperties>[] = []

  const push = async (fn: () => Promise<ComputedProperties | null>) => {
    const result = await attempt(fn)
    attempts.push(result)
    if (result.ok && result.data) return result.data
    return null
  }

  const pubchem = await push(() => fromPubchemCid(cid))
  if (pubchem) return pubchem

  const mychem = await push(() => fromMyChemCid(cid))
  if (mychem) return mychem

  if (opts?.name?.trim()) {
    const chembl = await push(() => fromChemblByName(opts.name!.trim()))
    if (chembl) return chembl
  }

  const query = await push(() => fromMyChemQuery(cid))
  if (query) return query

  if (attempts.some((a) => a.ok)) return null
  const last = [...attempts].reverse().find((a) => !a.ok)
  throw last && !last.ok ? last.error : new Error('PubChem properties fetch failed')
}
