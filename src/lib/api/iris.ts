import type { IRISAssessment } from '../types'
import { LIMITS } from '../api-limits'

const COMPTOX_SEARCH_URL = 'https://comptox.epa.gov/dashboard-api/ccdapp1/search/chemical/equal'
const COMPTOX_START_URL = 'https://comptox.epa.gov/dashboard-api/ccdapp1/search/chemical/start-with'
const PUBCHEM_PUG = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug'
const PUBCHEM_VIEW = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

interface CompToxSearchResult {
  dtxsid: string
  searchWord: string
  searchMatch: string
}

interface PubChemIrisFields {
  oralRfD: number | null
  oralRfDUnits: string
  oralRfDDisplay: string
  inhalationRfC: number | null
  inhalationRfCUnits: string
  inhalationRfCDisplay: string
  criticalEffects: string[]
  organsAffected: string[]
  cancerSites: string[]
  cancerWeightOfEvidence: string
  substanceName: string
  hasIrisSection: boolean
  irisUrl: string | null
}

/** Parse values like "4 x 10 ^-3 mg/kg-day" or "0.004 mg/kg-day". */
export function parseToxValue(raw: string): { value: number | null; units: string; display: string } {
  const text = (raw || '').replace(/\s+/g, ' ').trim()
  if (!text) return { value: null, units: '', display: '' }

  const sci = text.match(
    /(\d+(?:\.\d+)?)\s*[x×]\s*10\s*\^?\s*(-?\d+)\s*([a-zA-Zµμ\/\^\-\d\.]+)?/i,
  )
  if (sci) {
    const value = parseFloat(sci[1]) * Math.pow(10, parseInt(sci[2], 10))
    const units = (sci[3] || '').trim()
    return {
      value: Number.isFinite(value) ? value : null,
      units,
      display: text,
    }
  }

  const plain = text.match(/^([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s*(.*)$/)
  if (plain) {
    const value = parseFloat(plain[1])
    return {
      value: Number.isFinite(value) ? value : null,
      units: (plain[2] || '').trim(),
      display: text,
    }
  }

  return { value: null, units: '', display: text }
}

export function mapCancerClassification(
  text: string,
): IRISAssessment['cancerClassification'] | null {
  const t = text.toLowerCase()
  if (!t.trim()) return null
  if (
    t.includes('carcinogenic to humans') ||
    t.includes('known human carcinogen') ||
    t.includes('confirmed human carcinogen') ||
    /\ba1\b/.test(t) ||
    t.includes('known to be a human carcinogen')
  ) {
    return 'Carcinogenic'
  }
  if (
    t.includes('likely to be carcinogenic') ||
    t.includes('probable human carcinogen') ||
    t.includes('probably carcinogenic') ||
    /\ba2\b/.test(t)
  ) {
    return 'Likely Carcinogenic'
  }
  if (
    t.includes('suggestive evidence') ||
    t.includes('possible human carcinogen') ||
    /\bb2\b/.test(t) ||
    /\bc\b/.test(t)
  ) {
    return 'Suggestive'
  }
  if (
    t.includes('not likely') ||
    t.includes('not classifiable') ||
    t.includes('group e') ||
    t.includes('evidence of non-carcinogenicity')
  ) {
    return 'Not Likely'
  }
  if (t.includes('inadequate') || t.includes('data are inadequate') || t.includes('group d')) {
    return 'Inadequate'
  }
  return null
}

async function searchCompTox(query: string): Promise<CompToxSearchResult[]> {
  try {
    const res = await fetch(`${COMPTOX_SEARCH_URL}/${encodeURIComponent(query)}`, fetchOptions)
    let data: CompToxSearchResult[] = res.ok ? await res.json() : []
    if (!Array.isArray(data) || data.length === 0) {
      const fallbackRes = await fetch(
        `${COMPTOX_START_URL}/${encodeURIComponent(query)}`,
        fetchOptions,
      )
      if (!fallbackRes.ok) return []
      data = await fallbackRes.json()
    }
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

async function resolvePubChemCid(query: string): Promise<number | null> {
  try {
    const res = await fetch(
      `${PUBCHEM_PUG}/compound/name/${encodeURIComponent(query)}/cids/JSON`,
      fetchOptions,
    )
    if (!res.ok) return null
    const data = await res.json()
    const cid = data?.IdentifierList?.CID?.[0]
    return typeof cid === 'number' ? cid : cid != null ? Number(cid) : null
  } catch {
    return null
  }
}

async function getPubChemCas(cid: number): Promise<string> {
  try {
    const res = await fetch(`${PUBCHEM_PUG}/compound/cid/${cid}/synonyms/JSON`, fetchOptions)
    if (!res.ok) return ''
    const data = await res.json()
    const synonyms: string[] = data?.InformationList?.Information?.[0]?.Synonym ?? []
    const cas = synonyms.find((s) => /^\d{2,7}-\d{2}-\d$/.test(s))
    return cas || ''
  } catch {
    return ''
  }
}

type PvSection = {
  TOCHeading?: string
  Information?: Array<{
    Name?: string
    Value?: {
      StringWithMarkup?: Array<{ String?: string }>
      Number?: number[]
      ExternalDataURL?: string[]
    }
  }>
  Section?: PvSection[]
}

function walkSections(sections: PvSection[] | undefined, visit: (s: PvSection) => void) {
  if (!sections) return
  for (const s of sections) {
    visit(s)
    if (s.Section?.length) walkSections(s.Section, visit)
  }
}

function infoStrings(info: PvSection['Information']): string[] {
  if (!info) return []
  const out: string[] = []
  for (const item of info) {
    for (const sw of item.Value?.StringWithMarkup ?? []) {
      if (sw.String?.trim()) out.push(sw.String.trim())
    }
    if (item.Value?.Number?.length) {
      out.push(item.Value.Number.join(', '))
    }
  }
  return out
}

function namedValues(section: PvSection): Array<{ name: string; value: string }> {
  const out: Array<{ name: string; value: string }> = []
  for (const item of section.Information ?? []) {
    const name = (item.Name || '').trim()
    const vals = infoStrings([item])
    if (name && vals.length) out.push({ name, value: vals.join('; ') })
    else if (!name && vals.length) out.push({ name: '', value: vals.join('; ') })
  }
  return out
}

async function getPubChemIris(cid: number): Promise<PubChemIrisFields> {
  const empty: PubChemIrisFields = {
    oralRfD: null,
    oralRfDUnits: 'mg/kg-day',
    oralRfDDisplay: '',
    inhalationRfC: null,
    inhalationRfCUnits: 'mg/m³',
    inhalationRfCDisplay: '',
    criticalEffects: [],
    organsAffected: [],
    cancerSites: [],
    cancerWeightOfEvidence: '',
    substanceName: '',
    hasIrisSection: false,
    irisUrl: null,
  }

  try {
    const res = await fetch(
      `${PUBCHEM_VIEW}/${cid}/JSON?heading=${encodeURIComponent('EPA IRIS Information')}`,
      fetchOptions,
    )
    if (!res.ok) return empty
    const data = await res.json()
    const root: PvSection[] = data?.Record?.Section ?? []

    let irisRoot: PvSection | null = null
    walkSections(root, (s) => {
      if (s.TOCHeading === 'EPA IRIS Information') irisRoot = s
    })
    if (!irisRoot) return empty

    empty.hasIrisSection = true
    const pairs: Array<{ name: string; value: string }> = []
    walkSections([irisRoot], (s) => {
      pairs.push(...namedValues(s))
      // External IRIS links sometimes appear without Name
      for (const item of s.Information ?? []) {
        for (const url of item.Value?.ExternalDataURL ?? []) {
          if (/iris|epa\.gov/i.test(url) && !empty.irisUrl) empty.irisUrl = url
        }
      }
    })

    for (const { name, value } of pairs) {
      const n = name.toLowerCase()
      if (n === 'substance' || n.includes('substance name')) {
        empty.substanceName = value
      } else if (n.includes('reference dose') && n.includes('chronic') && !n.includes('subchronic')) {
        const parsed = parseToxValue(value)
        empty.oralRfD = parsed.value
        empty.oralRfDUnits = parsed.units || 'mg/kg-day'
        empty.oralRfDDisplay = parsed.display || value
      } else if (
        n.includes('reference concentration') &&
        n.includes('chronic') &&
        !n.includes('subchronic') &&
        !n.includes('acute')
      ) {
        const parsed = parseToxValue(value)
        empty.inhalationRfC = parsed.value
        empty.inhalationRfCUnits = parsed.units || 'mg/m³'
        empty.inhalationRfCDisplay = parsed.display || value
      } else if (n.includes('critical effect')) {
        empty.criticalEffects.push(
          ...value
            .split(/[;,]/)
            .map((x) => x.trim())
            .filter(Boolean),
        )
      } else if (n.includes('cancer site')) {
        empty.cancerSites.push(
          ...value
            .split(/[;,]/)
            .map((x) => x.trim())
            .filter(Boolean),
        )
      } else if (n.includes('organ') || n.includes('system')) {
        empty.organsAffected.push(
          ...value
            .split(/[;,]/)
            .map((x) => x.trim())
            .filter(Boolean),
        )
      } else if (n.includes('weight') && n.includes('evidence')) {
        empty.cancerWeightOfEvidence = value
      }
    }

    // De-dupe
    empty.criticalEffects = Array.from(new Set(empty.criticalEffects)).slice(0, 12)
    empty.organsAffected = Array.from(
      new Set([...empty.organsAffected, ...empty.cancerSites]),
    ).slice(0, 12)

    return empty
  } catch {
    return empty
  }
}

async function getCancerEvidence(cid: number): Promise<string> {
  try {
    const res = await fetch(
      `${PUBCHEM_VIEW}/${cid}/JSON?heading=${encodeURIComponent('Evidence for Carcinogenicity')}`,
      fetchOptions,
    )
    if (!res.ok) return ''
    const data = await res.json()
    const snippets: string[] = []
    walkSections(data?.Record?.Section ?? [], (s) => {
      for (const v of namedValues(s)) {
        if (v.value) snippets.push(v.value)
      }
      for (const raw of infoStrings(s.Information)) {
        if (raw.length > 20) snippets.push(raw)
      }
    })
    return snippets.slice(0, 6).join(' ')
  } catch {
    return ''
  }
}

function buildAssessment(input: {
  id: string
  chemicalName: string
  casNumber: string
  iris: PubChemIrisFields
  cancerText: string
  dtxsid?: string
}): IRISAssessment {
  const cancer =
    mapCancerClassification(input.iris.cancerWeightOfEvidence) ||
    mapCancerClassification(input.cancerText) ||
    (input.iris.hasIrisSection ? 'Inadequate' : null)

  const url =
    input.iris.irisUrl ||
    (input.dtxsid
      ? `https://comptox.epa.gov/dashboard/chemical/details/${input.dtxsid}`
      : `https://cfpub.epa.gov/ncea/iris/search/index.cfm?keyword=${encodeURIComponent(input.chemicalName)}`)

  return {
    id: input.id,
    chemicalName: input.iris.substanceName || input.chemicalName,
    casNumber: input.casNumber,
    assessmentStatus: input.iris.hasIrisSection ? 'Final' : 'Development',
    lastUpdated: '',
    oralRfD: input.iris.oralRfD,
    oralRfDUnits: input.iris.oralRfDUnits || 'mg/kg-day',
    oralRfDConfidence: 'Medium',
    oralRfDDisplay: input.iris.oralRfDDisplay || undefined,
    inhalationRfC: input.iris.inhalationRfC,
    inhalationRfCUnits: input.iris.inhalationRfCUnits || 'mg/m³',
    inhalationRfCConfidence: 'Medium',
    inhalationRfCDisplay: input.iris.inhalationRfCDisplay || undefined,
    cancerClassification: cancer ?? 'Inadequate',
    cancerWeightOfEvidence: input.iris.cancerWeightOfEvidence || '',
    criticalEffects: input.iris.criticalEffects,
    organsAffected: input.iris.organsAffected,
    url,
    hasIrisData: input.iris.hasIrisSection,
  }
}

export async function searchIRIS(
  query: string,
  limit: number = LIMITS.IRIS.initial,
): Promise<IRISAssessment[]> {
  try {
    const q = (query || '').trim()
    if (!q) return []

    const [comptoxHits, cid] = await Promise.all([searchCompTox(q), resolvePubChemCid(q)])

    // Prefer PubChem-backed IRIS (real RfD/CAS) as primary record
    if (cid != null && Number.isFinite(cid)) {
      const [casNumber, iris, cancerText] = await Promise.all([
        getPubChemCas(cid),
        getPubChemIris(cid),
        getCancerEvidence(cid),
      ])
      const dtxsid = comptoxHits[0]?.dtxsid
      const chemicalName = iris.substanceName || comptoxHits[0]?.searchWord || q

      // Only emit a row when we have identity (CAS/name) — always for resolved CID
      const primary = buildAssessment({
        id: dtxsid || `CID${cid}`,
        chemicalName,
        casNumber,
        iris,
        cancerText,
        dtxsid,
      })

      const assessments: IRISAssessment[] = [primary]

      // Additional CompTox name matches (identity only) — skip primary dtxsid
      for (const hit of comptoxHits.slice(0, limit)) {
        if (hit.dtxsid && hit.dtxsid === dtxsid) continue
        if (assessments.length >= limit) break
        if (!hit.searchWord) continue
        assessments.push(
          buildAssessment({
            id: hit.dtxsid,
            chemicalName: hit.searchWord,
            casNumber: hit.dtxsid === dtxsid ? casNumber : '',
            iris: {
              oralRfD: null,
              oralRfDUnits: 'mg/kg-day',
              oralRfDDisplay: '',
              inhalationRfC: null,
              inhalationRfCUnits: 'mg/m³',
              inhalationRfCDisplay: '',
              criticalEffects: [],
              organsAffected: [],
              cancerSites: [],
              cancerWeightOfEvidence: '',
              substanceName: hit.searchWord,
              hasIrisSection: false,
              irisUrl: null,
            },
            cancerText: '',
            dtxsid: hit.dtxsid,
          }),
        )
      }

      return assessments.filter((a) => a.chemicalName).slice(0, limit)
    }

    // CompTox-only fallback (CAS often unavailable — CompTox detail API is deprecated)
    const assessments: IRISAssessment[] = []
    for (const hit of comptoxHits.slice(0, limit)) {
      if (!hit.dtxsid && !hit.searchWord) continue
      assessments.push(
        buildAssessment({
          id: hit.dtxsid || hit.searchWord,
          chemicalName: hit.searchWord || q,
          casNumber: '',
          iris: {
            oralRfD: null,
            oralRfDUnits: 'mg/kg-day',
            oralRfDDisplay: '',
            inhalationRfC: null,
            inhalationRfCUnits: 'mg/m³',
            inhalationRfCDisplay: '',
            criticalEffects: [],
            organsAffected: [],
            cancerSites: [],
            cancerWeightOfEvidence: '',
            substanceName: hit.searchWord || q,
            hasIrisSection: false,
            irisUrl: null,
          },
          cancerText: '',
          dtxsid: hit.dtxsid,
        }),
      )
    }
    return assessments.filter((a) => a.chemicalName)
  } catch (error) {
    console.error('IRIS search error:', error)
    return []
  }
}

export async function getIRISAssessment(id: string): Promise<IRISAssessment | null> {
  const results = await searchIRIS(id, 1)
  return results[0] ?? null
}

export async function getIRISByCAS(casNumber: string): Promise<IRISAssessment | null> {
  const results = await searchIRIS(casNumber, 1)
  if (!results.length) return null
  // Prefer the record that matched the CAS
  const match = results.find((r) => r.casNumber === casNumber) || results[0]
  return { ...match, casNumber: match.casNumber || casNumber }
}
