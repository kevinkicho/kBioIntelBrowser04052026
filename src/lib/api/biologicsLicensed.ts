/**
 * FDA-licensed biologics / biosimilar family via free openFDA Drugs@FDA (BLA apps).
 * Complements Orange Book (small-molecule TE) — biologics live under BLAs + Purple Book portal.
 * Not clinical decision support; not full Purple Book interchangeability dump (portal/download).
 * @see docs/design/biologics-biosimilars-sources.md
 */

import { getApiKey } from './utils'

const BASE_URL = 'https://api.fda.gov/drug/drugsfda.json'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export type BiologicRoleGuess = 'reference_or_originator' | 'likely_biosimilar' | 'unknown'

export interface BiologicLicensedProduct {
  applicationNumber: string
  sponsorName: string
  brandName: string
  nonproprietaryName: string
  strength: string
  dosageForm: string
  marketingStatus: string
  /** Heuristic from US 4-letter suffix / BLA-only context — not FDA Purple Book role field */
  roleGuess: BiologicRoleGuess
  approvalDate: string | null
  drugsAtFdaUrl: string
  purpleBookSearchUrl: string
  establishmentSearchUrl: string
}

function openFdaKeyParam(): string {
  const apiKey = getApiKey('OPENFDA_API_KEY')
  return apiKey ? `&api_key=${apiKey}` : ''
}

/** US nonproprietary biosimilar naming: stem-XXXX (4 lowercase letters). */
export function looksLikeUsBiosimilarName(name: string): boolean {
  const n = name.trim().toLowerCase()
  return /^[a-z][a-z0-9]*-[a-z]{4}$/.test(n.replace(/\s+/g, ''))
}

/** Core name before US 4-letter suffix, else full name. */
export function nonproprietaryCore(name: string): string {
  const n = name.trim()
  if (looksLikeUsBiosimilarName(n.replace(/\s+/g, ''))) {
    const compact = n.replace(/\s+/g, '')
    const i = compact.lastIndexOf('-')
    if (i > 0) return compact.slice(0, i)
  }
  return n
}

export function guessBiologicRole(
  nonproprietaryName: string,
  allNonproprietary: string[],
): BiologicRoleGuess {
  if (looksLikeUsBiosimilarName(nonproprietaryName.replace(/\s+/g, ''))) {
    return 'likely_biosimilar'
  }
  const core = nonproprietaryCore(nonproprietaryName).toLowerCase()
  const hasBiosimilarSiblings = allNonproprietary.some(
    (n) =>
      looksLikeUsBiosimilarName(n.replace(/\s+/g, '')) &&
      nonproprietaryCore(n).toLowerCase() === core,
  )
  if (hasBiosimilarSiblings) return 'reference_or_originator'
  return 'unknown'
}

export function purpleBookSearchUrl(query: string): string {
  const q = query.trim()
  if (!q) return 'https://purplebooksearch.fda.gov/'
  // Portal search is client-side; deep link lands on home with no stable query API.
  return `https://purplebooksearch.fda.gov/`
}

export function drugsAtFdaUrl(applicationNumber: string): string {
  const app = applicationNumber.trim().toUpperCase()
  if (!app) return 'https://www.accessdata.fda.gov/scripts/cder/daf/'
  return `https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm?event=overview.process&ApplNo=${encodeURIComponent(
    app.replace(/^BLA/i, ''),
  )}`
}

export function fdaEstablishmentSearchUrl(sponsorOrPlantHint: string): string {
  // Prefer DRLS / FDA.gov search — FEI portal often requires login
  const q = sponsorOrPlantHint.trim()
  return q
    ? `https://www.fda.gov/search?s=${encodeURIComponent(q)}`
    : 'https://datadashboard.fda.gov/oii/cd/inspections.htm'
}

export function purpleBookDownloadUrl(): string {
  return 'https://purplebooksearch.fda.gov/downloads'
}

function formatDateCompact(raw: string | undefined): string | null {
  if (!raw || raw.length !== 8) return raw || null
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
}

interface DrugsFdaResult {
  application_number?: string
  sponsor_name?: string
  submissions?: { submission_type?: string; submission_status_date?: string }[]
  products?: {
    brand_name?: string
    active_ingredients?: { name?: string; strength?: string }[]
    dosage_form?: string
    marketing_status?: string
  }[]
  openfda?: {
    brand_name?: string[]
    generic_name?: string[]
    manufacturer_name?: string[]
  }
}

function isBla(app: string): boolean {
  return /^BLA/i.test(app.trim())
}

/**
 * Licensed BLA products matching brand or nonproprietary name (openFDA Drugs@FDA).
 * Includes originator + US biosimilar BLAs that share the stem when query is the stem.
 */
export async function getBiologicsLicensedByName(
  name: string,
  limit = 25,
): Promise<BiologicLicensedProduct[]> {
  const q = name.trim()
  if (!q || q.length < 2) return []

  const encoded = encodeURIComponent(q)
  const core = nonproprietaryCore(q)
  const coreEnc = encodeURIComponent(core)
  const size = Math.min(limit, 50)

  // openFDA: name match first (OR fields), then BLA filter client-side.
  // Second query expands biosimilar family via active-ingredient stem wildcard.
  const queries = [
    `search=(openfda.generic_name:"${encoded}"+openfda.brand_name:"${encoded}"+products.brand_name:"${encoded}"+products.active_ingredients.name:"${encoded}")&limit=${size}`,
    `search=products.active_ingredients.name:${coreEnc}*&limit=${size}`,
  ]

  const byApp = new Map<string, BiologicLicensedProduct>()
  const allNonprop: string[] = []

  try {
    for (const qs of queries) {
      const url = `${BASE_URL}?${qs}${openFdaKeyParam()}`
      const res = await fetch(url, fetchOptions)
      if (!res.ok) continue
      const data = (await res.json()) as { results?: DrugsFdaResult[] }
      for (const r of data.results ?? []) {
        const app = (r.application_number || '').trim()
        if (!app || !isBla(app)) continue
        // Expand multi-product BLAs (strengths / presentations); fall back to one synthetic row
        const productList =
          r.products && r.products.length > 0
            ? r.products.slice(0, 6)
            : [
                {
                  brand_name: r.openfda?.brand_name?.[0],
                  active_ingredients: r.openfda?.generic_name?.[0]
                    ? [{ name: r.openfda.generic_name[0] }]
                    : undefined,
                },
              ]
        for (const product of productList) {
          const brand = product?.brand_name || r.openfda?.brand_name?.[0] || ''
          const nonprop =
            product?.active_ingredients?.[0]?.name || r.openfda?.generic_name?.[0] || ''
          if (!brand && !nonprop) continue
          allNonprop.push(nonprop)
          const orig = r.submissions?.find((s) => s.submission_type === 'ORIG')
          const approvalDate = formatDateCompact(
            orig?.submission_status_date || r.submissions?.[0]?.submission_status_date,
          )
          const sponsor = r.sponsor_name || r.openfda?.manufacturer_name?.[0] || ''
          const key = `${app.toUpperCase()}::${brand}::${nonprop}::${product?.active_ingredients?.[0]?.strength || ''}`
          const row: BiologicLicensedProduct = {
            applicationNumber: app.toUpperCase(),
            sponsorName: sponsor,
            brandName: brand,
            nonproprietaryName: nonprop,
            strength: product?.active_ingredients?.[0]?.strength || '',
            dosageForm: product?.dosage_form || '',
            marketingStatus: product?.marketing_status || '',
            roleGuess: 'unknown',
            approvalDate,
            drugsAtFdaUrl: drugsAtFdaUrl(app),
            purpleBookSearchUrl: purpleBookSearchUrl(brand || nonprop || q),
            establishmentSearchUrl: fdaEstablishmentSearchUrl(sponsor),
          }
          if (!byApp.has(key)) byApp.set(key, row)
        }
      }
      if (byApp.size >= limit) break
    }
  } catch {
    return []
  }

  const rows = Array.from(byApp.values())
  const names = allNonprop.concat(rows.map((r) => r.nonproprietaryName))
  return rows
    .map((r) => ({
      ...r,
      roleGuess: guessBiologicRole(r.nonproprietaryName, names),
    }))
    .slice(0, limit)
}
