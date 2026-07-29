import type { BioAssayResult } from '../types'

const UA =
  process.env.NCBI_EMAIL
    ? `BioIntel/0.1 (mailto:${process.env.NCBI_EMAIL})`
    : 'BioIntel/0.1 (+https://github.com/kevinkicho/kBioIntelBrowser04052026)'

async function pubchemAssaySummary(url: string): Promise<BioAssayResult[]> {
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { Accept: 'application/json', 'User-Agent': UA },
    })
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

    return rows.slice(0, 15).map((row) => {
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

/** Free ChEMBL activities as assay-shaped rows when PubChem PUG is 503. */
async function chemblAsAssays(name: string): Promise<BioAssayResult[]> {
  try {
    const { getChemblActivitiesByName } = await import('./chembl')
    const acts = await getChemblActivitiesByName(name, 15)
    return acts.map((a) => ({
      assayId: a.activityId || a.chemblId || '',
      assayName: a.assayType || a.standardType || a.activityType || 'ChEMBL activity',
      description: `${a.standardType || a.activityType || ''} ${a.standardValue ?? a.activityValue ?? ''} ${a.standardUnits || a.activityUnits || ''}`.trim(),
      type: a.standardType || 'ChEMBL',
      outcome: a.activityType || a.standardType || '',
      activeCompounds: 0,
      testedCompounds: 0,
      activityValue: Number(a.standardValue ?? a.activityValue) || 0,
      targetName: a.targetName || '',
      url: a.url || `https://www.ebi.ac.uk/chembl/`,
    }))
  } catch {
    return []
  }
}

export async function getBioAssaysByName(
  name: string,
  opts?: { cid?: number },
): Promise<BioAssayResult[]> {
  try {
    const q = name?.trim()
    if (!q && !opts?.cid) return []

    // Prefer CID path (more stable than name when PubChem is flaky)
    if (opts?.cid && Number.isFinite(opts.cid)) {
      const byCid = await pubchemAssaySummary(
        `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${opts.cid}/assaysummary/JSON`,
      )
      if (byCid.length) return byCid
    }

    if (q) {
      const byName = await pubchemAssaySummary(
        `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(q)}/assaysummary/JSON`,
      )
      if (byName.length) return byName
    }

    if (q) return await chemblAsAssays(q)
    return []
  } catch {
    return []
  }
}
