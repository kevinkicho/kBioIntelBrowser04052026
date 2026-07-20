/**
 * FDA Purple Book monthly CSV (tier B bulk) — official biosimilar / interchangeability labels.
 * Free public download; cached via Next fetch revalidate. Not clinical decision support.
 * @see https://purplebooksearch.fda.gov/downloads
 * @see docs/design/biologics-biosimilars-sources.md
 */

import { cellAt, headerIndexMap, parseCsv } from '@/lib/csv/parseCsv'

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
] as const

const fetchOptions: RequestInit = {
  next: { revalidate: 604800 }, // 7 days
  headers: { Accept: 'text/csv,*/*' },
}

export interface PurpleBookProduct {
  applicant: string
  blaNumber: string
  proprietaryName: string
  properName: string
  licenseType: string
  strength: string
  dosageForm: string
  route: string
  productPresentation: string
  marketingStatus: string
  licensure: string
  approvalDate: string
  interApprovalDate: string
  refProductProperName: string
  refProductProprietaryName: string
  center: string
  patentListProvided: string
  /** Source file month label e.g. 2026-06 */
  sourceMonth: string
  purpleBookUrl: string
  drugsAtFdaUrl: string
}

export interface PurpleBookCatalogMeta {
  sourceUrl: string
  sourceMonth: string
  productCount: number
  loadedAt: string
}

type Catalog = {
  meta: PurpleBookCatalogMeta
  products: PurpleBookProduct[]
}

let memoryCatalog: Catalog | null = null
let memoryLoad: Promise<Catalog | null> | null = null

export function purpleBookCsvUrl(
  year: number,
  month: (typeof MONTHS)[number],
  casing: 'lower' | 'title' = 'lower',
): string {
  const m = casing === 'title' ? month.charAt(0).toUpperCase() + month.slice(1) : month
  return `https://www.accessdata.fda.gov/drugsatfda_docs/PurpleBook/${year}/purplebook-search-${m}-data-download.csv`
}

/** Candidate (year, month) pairs newest-first from “now”. */
export function purpleBookCandidateMonths(
  now = new Date(),
  count = 14,
): { year: number; month: (typeof MONTHS)[number] }[] {
  const out: { year: number; month: (typeof MONTHS)[number] }[] = []
  let y = now.getUTCFullYear()
  let m = now.getUTCMonth() // 0-11
  for (let i = 0; i < count; i++) {
    out.push({ year: y, month: MONTHS[m] })
    m -= 1
    if (m < 0) {
      m = 11
      y -= 1
    }
  }
  return out
}

function normalizeBla(raw: string): string {
  const t = raw.trim()
  if (!t) return ''
  if (/^BLA/i.test(t)) return t.toUpperCase()
  if (/^\d+$/.test(t)) return `BLA${t}`
  return t
}

function drugsAtFdaFromBla(bla: string): string {
  const num = bla.replace(/^BLA/i, '')
  return `https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm?event=overview.process&ApplNo=${encodeURIComponent(num)}`
}

function findHeaderRow(rows: string[][]): number {
  for (let i = 0; i < Math.min(rows.length, 40); i++) {
    const joined = rows[i].map((c) => c.trim().toLowerCase()).join('|')
    if (
      joined.includes('bla number') &&
      joined.includes('proprietary name') &&
      joined.includes('proper name')
    ) {
      return i
    }
  }
  return -1
}

export function parsePurpleBookCsv(text: string, sourceMonth: string, sourceUrl: string): Catalog {
  const rows = parseCsv(text)
  const hi = findHeaderRow(rows)
  if (hi < 0) {
    return {
      meta: {
        sourceUrl,
        sourceMonth,
        productCount: 0,
        loadedAt: new Date().toISOString(),
      },
      products: [],
    }
  }
  const map = headerIndexMap(rows[hi])
  const products: PurpleBookProduct[] = []
  for (let r = hi + 1; r < rows.length; r++) {
    const row = rows[r]
    const blaRaw = cellAt(row, map, 'bla number')
    const prop = cellAt(row, map, 'proprietary name')
    const proper = cellAt(row, map, 'proper name')
    if (!blaRaw && !prop && !proper) continue
    // Skip pure section titles
    if (!blaRaw && prop.length > 40) continue
    const blaNumber = normalizeBla(blaRaw)
    if (!blaNumber && !proper) continue
    products.push({
      applicant: cellAt(row, map, 'applicant'),
      blaNumber,
      proprietaryName: prop === 'N/A' ? '' : prop,
      properName: proper,
      licenseType: cellAt(row, map, 'license type'),
      strength: cellAt(row, map, 'strength'),
      dosageForm: cellAt(row, map, 'dosage form'),
      route: cellAt(row, map, 'route of administration'),
      productPresentation: cellAt(row, map, 'product presentation'),
      marketingStatus: cellAt(row, map, 'marketing status'),
      licensure: cellAt(row, map, 'licensure'),
      approvalDate: cellAt(row, map, 'approval date'),
      interApprovalDate: cellAt(row, map, 'inter. approval date'),
      refProductProperName: cellAt(row, map, 'ref. product proper name'),
      refProductProprietaryName: cellAt(row, map, 'ref. product proprietary name'),
      center: cellAt(row, map, 'center'),
      patentListProvided: cellAt(row, map, 'patent list provided'),
      sourceMonth,
      purpleBookUrl: 'https://purplebooksearch.fda.gov/',
      drugsAtFdaUrl: blaNumber ? drugsAtFdaFromBla(blaNumber) : 'https://www.accessdata.fda.gov/scripts/cder/daf/',
    })
  }
  return {
    meta: {
      sourceUrl,
      sourceMonth,
      productCount: products.length,
      loadedAt: new Date().toISOString(),
    },
    products,
  }
}

async function fetchCatalog(): Promise<Catalog | null> {
  for (const { year, month } of purpleBookCandidateMonths()) {
    // FDA 2026 URLs mix lowercase and Title-case month folders/names
    for (const casing of ['lower', 'title'] as const) {
      const url = purpleBookCsvUrl(year, month, casing)
      try {
        const res = await fetch(url, fetchOptions)
        if (!res.ok) continue
        const text = await res.text()
        if (!text || text.length < 200) continue
        if (!/bla number/i.test(text.slice(0, 4000))) continue
        const sourceMonth = `${year}-${String(MONTHS.indexOf(month) + 1).padStart(2, '0')}`
        const catalog = parsePurpleBookCsv(text, sourceMonth, url)
        if (catalog.products.length === 0) continue
        return catalog
      } catch {
        continue
      }
    }
  }
  return null
}

/** Load (and memory-cache) latest Purple Book monthly CSV catalog. */
export async function getPurpleBookCatalog(): Promise<Catalog | null> {
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

/** Test helper — clear process memory cache. */
export function clearPurpleBookMemoryCache(): void {
  memoryCatalog = null
  memoryLoad = null
}

function matchesQuery(p: PurpleBookProduct, q: string): boolean {
  const n = q.toLowerCase()
  const fields = [
    p.proprietaryName,
    p.properName,
    p.blaNumber,
    p.refProductProperName,
    p.refProductProprietaryName,
    p.applicant,
  ]
  return fields.some((f) => f.toLowerCase().includes(n))
}

/**
 * Search Purple Book products by proprietary / proper / BLA / reference name.
 * Dedupes by BLA + proper + strength + presentation for UI lists.
 */
export async function searchPurpleBookByName(
  name: string,
  limit = 40,
): Promise<{ meta: PurpleBookCatalogMeta | null; products: PurpleBookProduct[] }> {
  const q = name.trim()
  if (!q || q.length < 2) return { meta: null, products: [] }
  const catalog = await getPurpleBookCatalog()
  if (!catalog) return { meta: null, products: [] }

  const hits = catalog.products.filter((p) => matchesQuery(p, q))
  // Prefer exact proper/proprietary matches first
  const ql = q.toLowerCase()
  hits.sort((a, b) => {
    const ae =
      a.properName.toLowerCase() === ql || a.proprietaryName.toLowerCase() === ql ? 0 : 1
    const be =
      b.properName.toLowerCase() === ql || b.proprietaryName.toLowerCase() === ql ? 0 : 1
    if (ae !== be) return ae - be
    return (a.proprietaryName || a.properName).localeCompare(b.proprietaryName || b.properName)
  })

  const seen = new Set<string>()
  const products: PurpleBookProduct[] = []
  for (const p of hits) {
    const key = `${p.blaNumber}|${p.properName}|${p.strength}|${p.productPresentation}`
    if (seen.has(key)) continue
    seen.add(key)
    products.push(p)
    if (products.length >= limit) break
  }
  return { meta: catalog.meta, products }
}

export function isPurpleBookBiosimilarLicense(licenseType: string): boolean {
  return /351\s*\(\s*k\s*\)/i.test(licenseType) || /biosimilar/i.test(licenseType)
}

export function isPurpleBookInterchangeableLicense(licenseType: string): boolean {
  return /interchangeable/i.test(licenseType)
}
