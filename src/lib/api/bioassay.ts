import type { BioAssayResult } from '../types'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function getBioAssaysByName(name: string): Promise<BioAssayResult[]> {
  try {
    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(name)}/assaysummary/JSON`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    const table = data?.Table
    if (!table) return []

    const columns: string[] = table.Columns?.Column ?? []
    const rows: { Cell: unknown[] }[] = table.Row ?? []

    const aidIdx = columns.indexOf('AID')
    const nameIdx = columns.indexOf('Assay Name')
    const outcomeIdx = columns.indexOf('Activity Outcome')
    const targetIdx = columns.indexOf('Target Accession')
    const valueIdx = columns.indexOf('Activity Value [uM]')
    const activityNameIdx = columns.indexOf('Activity Name')

    return rows.slice(0, 10).map(row => {
      const cells = row.Cell ?? []
      const aid = Number(cells[aidIdx]) || 0
      const assayName = String(cells[nameIdx] ?? '')
      const activityName = activityNameIdx >= 0 ? String(cells[activityNameIdx] ?? '') : ''
      return {
        assayId: String(aid),
        assayName: assayName || activityName || `AID ${aid}`,
        description: activityName || '',
        type: 'BioAssay',
        outcome: String(cells[outcomeIdx] ?? ''),
        activeCompounds: 0,
        testedCompounds: 0,
        activityValue: Number(cells[valueIdx]) || 0,
        targetName: String(cells[targetIdx] ?? ''),
        url: `https://pubchem.ncbi.nlm.nih.gov/bioassay/${aid}`,
      }
    })
  } catch {
    return []
  }
}
