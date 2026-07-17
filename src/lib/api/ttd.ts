export interface TTDTarget {
  id: string
  name: string
  synonym: string[]
  organism: string
  type: string
  function: string
  pathway: string[]
  associatedDiseases: string[]
  drugCount: number
  url: string
}

export interface TTDDrug {
  id: string
  name: string
  synonym: string[]
  type: string
  targets: string[]
  indications: string[]
  url: string
}

export interface TTDResult {
  targets: TTDTarget[]
  drugs: TTDDrug[]
}

/** No public REST API — never invent targets/drugs. */
export async function searchTTDTargets(_query: string): Promise<TTDTarget[]> {
  return []
}

/** No public REST API — never invent drugs. */
export async function searchTTDDrugs(_query: string): Promise<TTDDrug[]> {
  return []
}

export async function getTTDData(_query: string): Promise<TTDResult> {
  return { targets: [], drugs: [] }
}
