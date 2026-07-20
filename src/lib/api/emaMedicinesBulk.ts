/**
 * EMA official medicines Excel dump (tier B) — filter by name + biosimilar flag.
 * Free public download; cached via Next fetch revalidate. Not clinical decision support.
 * @see https://www.ema.europa.eu/en/medicines/download-medicine-data
 */

import { parseXlsxFirstSheet } from '@/lib/xlsx/parseSimpleSheet'

const EMA_MEDICINES_XLSX =
  'https://www.ema.europa.eu/en/documents/report/medicines-output-medicines-report_en.xlsx'

const fetchOptions: RequestInit = {
  next: { revalidate: 86400 }, // 24h — EMA updates overnight
  headers: {
    Accept:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/octet-stream,*/*',
  },
}

export interface EmaBulkMedicine {
  name: string
  emaProductNumber: string
  medicineStatus: string
  inn: string
  activeSubstance: string
  therapeuticArea: string
  atcCode: string
  biosimilar: boolean
  orphanMedicine: boolean
  generic: boolean
  advancedTherapy: boolean
  conditionalApproval: boolean
  applicantHolder: string
  marketingAuthorisationDate: string
  emaUrl: string
}

export interface EmaBulkMeta {
  sourceUrl: string
  productCount: number
  loadedAt: string
}

type Catalog = { meta: EmaBulkMeta; products: EmaBulkMedicine[] }

let memoryCatalog: Catalog | null = null
let memoryLoad: Promise<Catalog | null> | null = null

function normHeader(h: string): string {
  return h.replace(/\s+/g, ' ').trim().toLowerCase()
}

function truthyFlag(v: string): boolean {
  const t = v.trim().toLowerCase()
  return t === 'yes' || t === 'y' || t === 'true' || t === '1' || t === 'x' || t === 'yes.'
}

function findHeaderRow(rows: string[][]): number {
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const cells = rows[i].map(normHeader)
    if (
      cells.some((c) => c.includes('name of medicine')) &&
      cells.some((c) => c.includes('biosimilar') || c.includes('inn'))
    ) {
      return i
    }
  }
  return -1
}

export function parseEmaMedicinesSheet(rows: string[][], sourceUrl = EMA_MEDICINES_XLSX): Catalog {
  const hi = findHeaderRow(rows)
  if (hi < 0) {
    return {
      meta: { sourceUrl, productCount: 0, loadedAt: new Date().toISOString() },
      products: [],
    }
  }
  const headers = rows[hi].map(normHeader)
  const idx = (pred: (h: string) => boolean): number => headers.findIndex(pred)
  const iName = idx((h) => h.includes('name of medicine'))
  const iEma = idx((h) => h.includes('ema product number'))
  const iStatus = idx((h) => h === 'medicine status' || h.includes('medicine status'))
  const iInn = idx((h) => h.includes('international non-proprietary') || h === 'inn / common name')
  const iActive = idx((h) => h.includes('active substance'))
  const iArea = idx((h) => h.includes('therapeutic area'))
  const iAtc = idx((h) => h.includes('atc code (human)') || h === 'atc code')
  const iBio = idx((h) => h === 'biosimilar')
  const iOrphan = idx((h) => h.includes('orphan medicine'))
  const iGeneric = idx((h) => h === 'generic')
  const iAtmp = idx((h) => h.includes('advanced therapy'))
  const iCond = idx((h) => h.includes('conditional approval'))
  const iHolder = idx((h) => h.includes('marketing authorisation developer') || h.includes('applicant'))
  const iMaDate = idx((h) => h.includes('marketing authorisation date'))

  const get = (row: string[], i: number) => (i >= 0 && row[i] != null ? String(row[i]).trim() : '')

  const products: EmaBulkMedicine[] = []
  for (let r = hi + 1; r < rows.length; r++) {
    const row = rows[r]
    const name = get(row, iName)
    if (!name) continue
    const emaProductNumber = get(row, iEma)
    products.push({
      name,
      emaProductNumber,
      medicineStatus: get(row, iStatus),
      inn: get(row, iInn),
      activeSubstance: get(row, iActive),
      therapeuticArea: get(row, iArea),
      atcCode: get(row, iAtc),
      biosimilar: truthyFlag(get(row, iBio)),
      orphanMedicine: truthyFlag(get(row, iOrphan)),
      generic: truthyFlag(get(row, iGeneric)),
      advancedTherapy: truthyFlag(get(row, iAtmp)),
      conditionalApproval: truthyFlag(get(row, iCond)),
      applicantHolder: get(row, iHolder),
      marketingAuthorisationDate: get(row, iMaDate),
      emaUrl: `https://www.ema.europa.eu/en/search?search_api_fulltext=${encodeURIComponent(name)}`,
    })
  }
  return {
    meta: {
      sourceUrl,
      productCount: products.length,
      loadedAt: new Date().toISOString(),
    },
    products,
  }
}

async function fetchCatalog(): Promise<Catalog | null> {
  try {
    const res = await fetch(EMA_MEDICINES_XLSX, fetchOptions)
    if (!res.ok) return null
    const ab = await res.arrayBuffer()
    const buf = Buffer.from(ab)
    if (buf.length < 1000) return null
    const rows = parseXlsxFirstSheet(buf)
    if (rows.length < 2) return null
    const catalog = parseEmaMedicinesSheet(rows)
    if (catalog.products.length === 0) return null
    return catalog
  } catch {
    return null
  }
}

export async function getEmaMedicinesBulkCatalog(): Promise<Catalog | null> {
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

export function clearEmaBulkMemoryCache(): void {
  memoryCatalog = null
  memoryLoad = null
}

/**
 * Search EMA bulk table by medicine name / INN / active substance.
 * Optional biosimilarOnly filter.
 */
export async function searchEmaBulkByName(
  name: string,
  opts?: { limit?: number; biosimilarOnly?: boolean },
): Promise<{ meta: EmaBulkMeta | null; products: EmaBulkMedicine[] }> {
  const q = name.trim()
  if (!q || q.length < 2) return { meta: null, products: [] }
  const catalog = await getEmaMedicinesBulkCatalog()
  if (!catalog) return { meta: null, products: [] }

  const n = q.toLowerCase()
  let hits = catalog.products.filter((p) => {
    if (opts?.biosimilarOnly && !p.biosimilar) return false
    return (
      p.name.toLowerCase().includes(n) ||
      p.inn.toLowerCase().includes(n) ||
      p.activeSubstance.toLowerCase().includes(n) ||
      p.emaProductNumber.toLowerCase().includes(n)
    )
  })
  hits.sort((a, b) => {
    const ae = a.name.toLowerCase() === n || a.inn.toLowerCase() === n ? 0 : 1
    const be = b.name.toLowerCase() === n || b.inn.toLowerCase() === n ? 0 : 1
    if (ae !== be) return ae - be
    if (a.biosimilar !== b.biosimilar) return a.biosimilar ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  const limit = opts?.limit ?? 25
  return { meta: catalog.meta, products: hits.slice(0, limit) }
}
