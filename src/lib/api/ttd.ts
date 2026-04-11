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

export async function searchTTDTargets(query: string): Promise<TTDTarget[]> {
  try {
    // TTD doesn't have a public REST API
    // For production: Use TTD FTP data dumps or contact for API access
    console.log('TTD target search attempted for:', query)
    return []
  } catch (error) {
    console.error('TTD target search error:', error)
    return []
  }
}

export async function searchTTDDrugs(query: string): Promise<TTDDrug[]> {
  try {
    // TTD doesn't have a public REST API
    console.log('TTD drug search attempted for:', query)
    return []
  } catch (error) {
    console.error('TTD drug search error:', error)
    return []
  }
}

export async function getTTDData(query: string): Promise<TTDResult> {
  try {
    const [targets, drugs] = await Promise.all([
      searchTTDTargets(query),
      searchTTDDrugs(query),
    ])
    return { targets, drugs }
  } catch (error) {
    console.error('TTD data fetch error:', error)
    return { targets: [], drugs: [] }
  }
}
