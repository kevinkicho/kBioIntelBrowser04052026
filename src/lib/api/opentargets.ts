import type { DiseaseAssociation } from '../types'
import { getChemblIdByName } from './chembl'

function escapeGraphQLString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r')
}

const API_URL = 'https://api.platform.opentargets.org/api/v4/graphql'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * Search for disease associations by molecule name using OpenTargets Platform
 * Falls back gracefully if the API is unavailable
 */
export async function getDiseaseAssociationsByName(name: string): Promise<DiseaseAssociation[]> {
  try {
    // Try to get ChEMBL ID for more precise search
    const chemblId = await getChemblIdByName(name)
    
    if (chemblId) {
      // Try drug-specific query first
      const drugResults = await queryDrugDiseases(chemblId)
      if (drugResults.length > 0) return drugResults
    }
    
    // Fallback to disease search
    return await searchDiseases(name)
  } catch (error) {
    console.error('OpenTargets query error:', error)
    return []
  }
}

async function queryDrugDiseases(chemblId: string): Promise<DiseaseAssociation[]> {
  const query = `
    query {
      drug(chemblId: "${escapeGraphQLString(chemblId)}") {
        name
        linkedDiseases {
          count
          rows {
            disease {
              id
              name
              therapeuticAreas {
                id
                name
              }
            }
          }
        }
      }
    }
  `

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
    ...fetchOptions,
  })

  if (!res.ok) return []
  
  const data = await res.json()
  
  if (data.errors) {
    console.error('OpenTargets GraphQL errors:', data.errors)
    return []
  }

  const rows = data.data?.drug?.linkedDiseases?.rows ?? []
  return rows.map((row: {
    disease: {
      id: string
      name: string
      therapeuticAreas?: { id: string; name: string }[]
    }
  }) => ({
    diseaseId: row.disease.id ?? '',
    diseaseName: row.disease.name ?? '',
    therapeuticAreas: (row.disease.therapeuticAreas ?? []).map(ta => ta.name),
  }))
}

export async function searchDiseases(queryString: string): Promise<DiseaseAssociation[]> {
  const query = `
    query {
      search(
        queryString: "${escapeGraphQLString(queryString)}"
        entityNames: ["disease"]
        page: { index: 0, size: 10 }
      ) {
        total
        results {
          ... on Disease {
            id
            name
            description
            therapeuticAreas {
              id
              name
            }
          }
        }
      }
    }
  `

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
    ...fetchOptions,
  })

  if (!res.ok) return []
  
  const data = await res.json()
  
  if (data.errors) {
    console.error('OpenTargets GraphQL errors:', data.errors)
    return []
  }

  const results = data.data?.search?.results ?? []
  return results.map((result: {
    id: string
    name: string
    description?: string
    therapeuticAreas?: { id: string; name: string }[]
  }) => ({
    diseaseId: result.id ?? '',
    diseaseName: result.name ?? '',
    description: result.description ?? undefined,
    therapeuticAreas: (result.therapeuticAreas ?? []).map(ta => ta.name),
  }))
}

export async function getDrugsForDisease(diseaseId: string): Promise<string[]> {
  try {
    const query = `
      query {
        disease(efoId: "${escapeGraphQLString(diseaseId)}") {
          id
          name
          linkedTargets {
            count
            rows {
              id
              target { id name }
            }
          }
        }
      }
    `
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      ...fetchOptions,
    })
    if (!res.ok) return []
    const data = await res.json()
    if (data.errors) return []
    const targets: { target: { name: string } }[] = data.data?.disease?.linkedTargets?.rows ?? []
    return targets.map((t: { target: { name: string } }) => t.target.name).filter(Boolean).slice(0, 10)
  } catch {
    return []
  }
}
