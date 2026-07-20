/**
 * FDA Purple Book BPPT patent list (Biological Product Patent Transparency).
 * Public patent-list page (ministerial FDA publication). Cached; not legal advice.
 * @see https://purplebooksearch.fda.gov/patent-list
 * @see docs/design/biologics-biosimilars-sources.md
 */

const PATENT_LIST_URL = 'https://purplebooksearch.fda.gov/patent-list'
const fetchOptions: RequestInit = {
  next: { revalidate: 604800 }, // 7 days
  headers: {
    Accept: 'text/html,application/xhtml+xml',
    'User-Agent': 'BioIntelExplorer/1.0 (research; free public data)',
  },
}

export interface PurpleBookPatent {
  blaNumber: string
  applicant: string
  proprietaryName: string
  properName: string
  patentNumber: string
  patentExpirationDate: string
  /** USPTO public patent page */
  usptoUrl: string
  /** Google Patents free view */
  googlePatentsUrl: string
  purpleBookProductUrl: string
}

export interface PurpleBookPatentMeta {
  sourceUrl: string
  patentCount: number
  loadedAt: string
}

type Catalog = { meta: PurpleBookPatentMeta; patents: PurpleBookPatent[] }

let memoryCatalog: Catalog | null = null
let memoryLoad: Promise<Catalog | null> | null = null

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeBla(raw: string): string {
  const t = raw.trim()
  if (!t) return ''
  if (/^BLA/i.test(t)) return t.toUpperCase()
  if (/^\d+$/.test(t)) return `BLA${t}`
  return t
}

function normalizePatentNumber(raw: string): string {
  // "11,083,792" or "D934,069" → digits / design prefix
  const t = raw.replace(/,/g, '').trim()
  return t
}

export function usptoPatentUrl(patentNumber: string): string {
  const n = normalizePatentNumber(patentNumber)
  if (!n) return 'https://ppubs.uspto.gov/pubwebapp/'
  return `https://patents.google.com/patent/US${n.replace(/^US/i, '')}/en`
}

export function googlePatentsUrl(patentNumber: string): string {
  return usptoPatentUrl(patentNumber)
}

/**
 * Parse tbody rows from the official patent-list HTML table.
 * Exported for unit tests with fixtures.
 */
export function parsePurpleBookPatentHtml(html: string): PurpleBookPatent[] {
  const tbodyMatch = html.match(/id=["']patentListTable["'][\s\S]*?<tbody>([\s\S]*?)<\/tbody>/i)
  const body = tbodyMatch?.[1] || html
  const rowRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi
  const patents: PurpleBookPatent[] = []
  let rm: RegExpExecArray | null
  while ((rm = rowRe.exec(body))) {
    const rowHtml = rm[1]
    if (/<th\b/i.test(rowHtml)) continue
    const cells: string[] = []
    const tdRe = /<td\b[^>]*>([\s\S]*?)<\/td>/gi
    let tm: RegExpExecArray | null
    while ((tm = tdRe.exec(rowHtml))) {
      cells.push(stripTags(tm[1]))
    }
    if (cells.length < 6) continue
    const blaRaw = cells[0]
    const patentRaw = cells[4]
    if (!/^\d{5,}$/.test(blaRaw.replace(/\D/g, '')) && !/^BLA/i.test(blaRaw)) continue
    const patentNumber = normalizePatentNumber(patentRaw)
    if (!patentNumber || patentNumber.length < 5) continue
    const blaNumber = normalizeBla(blaRaw.replace(/\D/g, '') || blaRaw)
    const proprietaryName = cells[2]
    patents.push({
      blaNumber,
      applicant: cells[1],
      proprietaryName,
      properName: cells[3],
      patentNumber,
      patentExpirationDate: cells[5],
      usptoUrl: usptoPatentUrl(patentNumber),
      googlePatentsUrl: googlePatentsUrl(patentNumber),
      purpleBookProductUrl: `https://purplebooksearch.fda.gov/index.cfm?event=productdetails&blaNo=${encodeURIComponent(
        blaNumber.replace(/^BLA/i, ''),
      )}`,
    })
  }
  return patents
}

async function fetchCatalog(): Promise<Catalog | null> {
  try {
    const res = await fetch(PATENT_LIST_URL, fetchOptions)
    if (!res.ok) return null
    const html = await res.text()
    if (!html || html.length < 500) return null
    const patents = parsePurpleBookPatentHtml(html)
    if (patents.length === 0) return null
    return {
      meta: {
        sourceUrl: PATENT_LIST_URL,
        patentCount: patents.length,
        loadedAt: new Date().toISOString(),
      },
      patents,
    }
  } catch {
    return null
  }
}

export async function getPurpleBookPatentCatalog(): Promise<Catalog | null> {
  if (memoryCatalog) return memoryCatalog
  if (!memoryLoad) {
    memoryLoad = fetchCatalog()
      .then((c) => {
        memoryCatalog = c
        return c
      })
      .finally(() => {
        memoryLoad = null
      })
  }
  return memoryLoad
}

export function clearPurpleBookPatentMemoryCache(): void {
  memoryCatalog = null
  memoryLoad = null
}

/**
 * Search BPPT patents by proper name, brand, BLA, applicant, or patent number.
 */
export async function searchPurpleBookPatentsByName(
  name: string,
  limit = 50,
): Promise<{ meta: PurpleBookPatentMeta | null; patents: PurpleBookPatent[] }> {
  const q = name.trim()
  if (!q || q.length < 2) return { meta: null, patents: [] }
  const catalog = await getPurpleBookPatentCatalog()
  if (!catalog) return { meta: null, patents: [] }

  const n = q.toLowerCase().replace(/^bla/i, '')
  const nFull = q.toLowerCase()
  const hits = catalog.patents.filter((p) => {
    return (
      p.properName.toLowerCase().includes(nFull) ||
      p.proprietaryName.toLowerCase().includes(nFull) ||
      p.applicant.toLowerCase().includes(nFull) ||
      p.blaNumber.toLowerCase().includes(n) ||
      p.blaNumber.replace(/^bla/i, '').includes(n) ||
      p.patentNumber.toLowerCase().includes(nFull.replace(/,/g, ''))
    )
  })
  hits.sort((a, b) => {
    const ae =
      a.properName.toLowerCase() === nFull || a.proprietaryName.toLowerCase() === nFull ? 0 : 1
    const be =
      b.properName.toLowerCase() === nFull || b.proprietaryName.toLowerCase() === nFull ? 0 : 1
    if (ae !== be) return ae - be
    return a.patentExpirationDate.localeCompare(b.patentExpirationDate)
  })
  return { meta: catalog.meta, patents: hits.slice(0, limit) }
}
