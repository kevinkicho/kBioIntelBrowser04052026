import type { MonarchDisease } from '../types'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function getMonarchDiseasesByName(name: string): Promise<MonarchDisease[]> {
  try {
    const res = await fetch(
      `https://api.monarchinitiative.org/v3/api/search?q=${encodeURIComponent(name)}&limit=10&category=biolink:Disease`,
      fetchOptions,
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.items ?? []).slice(0, 10).map((item: {
      id?: string
      name?: string
      description?: string
      category?: string
      has_phenotype_count?: number
    }) => ({
      id: String(item.id ?? ''),
      name: String(item.name ?? ''),
      description: String(item.description ?? ''),
      category: String(item.category ?? ''),
      phenotypeCount: Number(item.has_phenotype_count) || 0,
      url: `https://monarchinitiative.org/${item.id}`,
    }))
  } catch {
    return []
  }
}
