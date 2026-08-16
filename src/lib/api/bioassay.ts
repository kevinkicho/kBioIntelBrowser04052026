import type { BioAssayResult } from '../types'
import { timedFetch } from './timedFetch'

const UA =
  process.env.NCBI_EMAIL
    ? `BioIntel/0.1 (mailto:${process.env.NCBI_EMAIL})`
    : 'BioIntel/0.1 (+https://github.com/kevinkicho/kBioIntelBrowser04052026)'

/**
 * PubChem BioAssay harvest leaf with ChEMBL fallback.
 * HTTP / HTML / timeout / network are not EMPTY.
 * 404, missing table, and zero-hit JSON remain [].
 * Same-source PubChem CID→name may still run; ChEMBL may still run.
 * If the last attempted source fails, throw.
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

async function pubchemAssaySummary(url: string): Promise<BioAssayResult[]> {
  const res = await timedFetch(url, {
    cache: 'no-store',
    headers: { Accept: 'application/json', 'User-Agent': UA },
    timeoutMs: 8000,
  })
  if (isAbsentStatus(res.status)) return []
  throwIfHttpFailed(res, 'PubChem BioAssay')
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
}

/** Free ChEMBL activities as assay-shaped rows when PubChem PUG is down or empty. */
async function chemblAsAssays(name: string): Promise<BioAssayResult[]> {
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
}

export async function getBioAssaysByName(
  name: string,
  opts?: { cid?: number },
): Promise<BioAssayResult[]> {
  const q = name?.trim()
  if (!q && !opts?.cid) return []

  let lastFailure: Error | undefined

  const tryPubchem = async (url: string): Promise<BioAssayResult[] | null> => {
    try {
      const rows = await pubchemAssaySummary(url)
      if (rows.length) return rows
      lastFailure = undefined
      return null
    } catch (e) {
      lastFailure = e instanceof Error ? e : new Error(String(e))
      return null
    }
  }

  if (opts?.cid && Number.isFinite(opts.cid)) {
    const byCid = await tryPubchem(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${opts.cid}/assaysummary/JSON`,
    )
    if (byCid?.length) return byCid
  }

  if (q) {
    const byName = await tryPubchem(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(q)}/assaysummary/JSON`,
    )
    if (byName?.length) return byName
  }

  if (q) {
    try {
      const chembl = await chemblAsAssays(q)
      if (chembl.length) return chembl
      lastFailure = undefined
    } catch (e) {
      lastFailure = e instanceof Error ? e : new Error(String(e))
    }
  }

  if (lastFailure) throw lastFailure
  return []
}