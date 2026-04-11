import type { BindingAffinity } from '../types'

const BASE_URL = 'https://bindingdb.org/rwd/bind/chemsearch/marvin/MolsFromName.json'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

type AffinityKey = 'Ki' | 'Kd' | 'IC50' | 'EC50'
const AFFINITY_KEYS: AffinityKey[] = ['Ki', 'Kd', 'IC50', 'EC50']

interface BdbMolecule {
  monomerID?: string
  target_name?: string
  Ki?: string
  Kd?: string
  IC50?: string
  EC50?: string
  reference?: string
  doi?: string
}

export async function getBindingAffinitiesByName(name: string): Promise<BindingAffinity[]> {
  try {
    const url = `${BASE_URL}?name=${encodeURIComponent(name)}&max_results=10`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    const molecules: BdbMolecule[] = data.molecules ?? []
    const results: BindingAffinity[] = []

    for (const mol of molecules) {
      if (results.length >= 10) break
      let affinityType = ''
      let affinityRaw = ''

      for (const key of AFFINITY_KEYS) {
        const val = mol[key]
        if (val && val.trim() !== '') {
          affinityType = key
          affinityRaw = val.trim()
          break
        }
      }

      if (!affinityType) continue

      results.push({
        ligandId: mol.monomerID ?? '',
        ligandName: '',
        targetName: mol.target_name ?? '',
        affinityType,
        affinityValue: Number(affinityRaw) || 0,
        affinityUnit: 'nM',
        affinityUnits: 'nM',
        source: mol.reference ?? '',
        doi: mol.doi ?? '',
      })
    }

    return results
  } catch {
    return []
  }
}
