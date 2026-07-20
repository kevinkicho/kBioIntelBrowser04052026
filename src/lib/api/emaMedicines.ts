/**
 * EMA-facing medicine records (free public sources only).
 * Open Targets GraphQL (no key) for structured drug metadata + official EMA search deep links.
 * Not a scrape of EMA HTML; not clinical decision support.
 * @see docs/design/public-apis-international.md
 */

import { getChemblIdByName } from './chembl'

export interface EmaMedicineRecord {
  name: string
  chemblId: string | null
  tradeNames: string[]
  drugType: string
  yearOfFirstApproval: number | null
  maximumClinicalTrialPhase: number | null
  hasBeenWithdrawn: boolean
  /** Official EMA website search for this name */
  emaSearchUrl: string
  /** Open Targets drug page when chemblId known */
  openTargetsUrl: string | null
  /** Best-effort EPAR product-information PDF pattern (may 404) */
  eparProductInfoUrl: string | null
}

const OT_URL = 'https://api.platform.opentargets.org/api/v4/graphql'
const fetchOptions: RequestInit = {
  cache: 'no-store',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
}

function escapeGraphQLString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r')
}

function emaSearchUrl(name: string): string {
  return `https://www.ema.europa.eu/en/search?search_api_fulltext=${encodeURIComponent(name)}`
}

/** Historical EPAR product-info slug pattern used by EMA for many products */
function eparProductInfoGuess(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `https://www.ema.europa.eu/en/documents/product-information/${slug}-epar-product-information_en.pdf`
}

async function otGraphql(query: string, variables?: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(OT_URL, {
    method: 'POST',
    ...fetchOptions,
    body: JSON.stringify(variables ? { query, variables } : { query }),
  })
  if (!res.ok) return null
  const data = await res.json()
  if (data.errors) return null
  return data.data
}

/**
 * Resolve EMA-relevant medicine card(s) for a molecule name.
 * Primary: Open Targets drug entity; always includes EMA search deep link.
 */
export async function getEmaMedicinesByName(name: string): Promise<EmaMedicineRecord[]> {
  const q = name.trim()
  if (!q || q.length < 2) return []

  try {
    const chemblId = await getChemblIdByName(q)
    if (chemblId) {
      const data = (await otGraphql(`
        query {
          drug(chemblId: "${escapeGraphQLString(chemblId)}") {
            id
            name
            tradeNames
            drugType
            yearOfFirstApproval
            maximumClinicalTrialPhase
            hasBeenWithdrawn
          }
        }
      `)) as {
        drug?: {
          id?: string
          name?: string
          tradeNames?: string[]
          drugType?: string
          yearOfFirstApproval?: number | null
          maximumClinicalTrialPhase?: number | null
          hasBeenWithdrawn?: boolean
        } | null
      } | null

      const d = data?.drug
      if (d?.name) {
        const display = d.name
        return [
          {
            name: display,
            chemblId: d.id ?? chemblId,
            tradeNames: Array.isArray(d.tradeNames) ? d.tradeNames.slice(0, 12) : [],
            drugType: String(d.drugType ?? ''),
            yearOfFirstApproval:
              typeof d.yearOfFirstApproval === 'number' ? d.yearOfFirstApproval : null,
            maximumClinicalTrialPhase:
              typeof d.maximumClinicalTrialPhase === 'number'
                ? d.maximumClinicalTrialPhase
                : null,
            hasBeenWithdrawn: Boolean(d.hasBeenWithdrawn),
            emaSearchUrl: emaSearchUrl(display),
            openTargetsUrl: `https://platform.opentargets.org/drug/${encodeURIComponent(d.id ?? chemblId)}`,
            eparProductInfoUrl: eparProductInfoGuess(
              (d.tradeNames && d.tradeNames[0]) || display,
            ),
          },
        ]
      }
    }

    // Search fallback (no chembl)
    const searchData = (await otGraphql(
      `
      query DrugSearch($q: String!) {
        search(queryString: $q, entityNames: ["drug"], page: { index: 0, size: 5 }) {
          hits {
            id
            name
            entity
          }
        }
      }
    `,
      { q },
    )) as {
      search?: { hits?: Array<{ id?: string; name?: string; entity?: string }> }
    } | null

    const hits = (searchData?.search?.hits ?? []).filter(
      (h) => h.entity === 'drug' || !h.entity,
    )
    if (hits.length === 0) {
      // Still return a deep-link-only stub so the panel is useful
      return [
        {
          name: q,
          chemblId: null,
          tradeNames: [],
          drugType: '',
          yearOfFirstApproval: null,
          maximumClinicalTrialPhase: null,
          hasBeenWithdrawn: false,
          emaSearchUrl: emaSearchUrl(q),
          openTargetsUrl: null,
          eparProductInfoUrl: null,
        },
      ]
    }

    const out: EmaMedicineRecord[] = []
    for (const hit of hits.slice(0, 5)) {
      const id = hit.id || ''
      const nm = hit.name || q
      if (!id) continue
      const detail = (await otGraphql(`
        query {
          drug(chemblId: "${escapeGraphQLString(id)}") {
            id
            name
            tradeNames
            drugType
            yearOfFirstApproval
            maximumClinicalTrialPhase
            hasBeenWithdrawn
          }
        }
      `)) as { drug?: EmaMedicineRecord & { id?: string; tradeNames?: string[] } } | null
      const d = detail?.drug
      out.push({
        name: d?.name || nm,
        chemblId: d?.id || id,
        tradeNames: Array.isArray(d?.tradeNames) ? d!.tradeNames!.slice(0, 12) : [],
        drugType: String((d as { drugType?: string })?.drugType ?? ''),
        yearOfFirstApproval:
          typeof (d as { yearOfFirstApproval?: number })?.yearOfFirstApproval === 'number'
            ? (d as { yearOfFirstApproval: number }).yearOfFirstApproval
            : null,
        maximumClinicalTrialPhase:
          typeof (d as { maximumClinicalTrialPhase?: number })?.maximumClinicalTrialPhase ===
          'number'
            ? (d as { maximumClinicalTrialPhase: number }).maximumClinicalTrialPhase
            : null,
        hasBeenWithdrawn: Boolean((d as { hasBeenWithdrawn?: boolean })?.hasBeenWithdrawn),
        emaSearchUrl: emaSearchUrl(d?.name || nm),
        openTargetsUrl: `https://platform.opentargets.org/drug/${encodeURIComponent(id)}`,
        eparProductInfoUrl: eparProductInfoGuess(
          (d?.tradeNames && d.tradeNames[0]) || d?.name || nm,
        ),
      })
    }
    return out.length > 0
      ? out
      : [
          {
            name: q,
            chemblId: null,
            tradeNames: [],
            drugType: '',
            yearOfFirstApproval: null,
            maximumClinicalTrialPhase: null,
            hasBeenWithdrawn: false,
            emaSearchUrl: emaSearchUrl(q),
            openTargetsUrl: null,
            eparProductInfoUrl: null,
          },
        ]
  } catch {
    return [
      {
        name: q,
        chemblId: null,
        tradeNames: [],
        drugType: '',
        yearOfFirstApproval: null,
        maximumClinicalTrialPhase: null,
        hasBeenWithdrawn: false,
        emaSearchUrl: emaSearchUrl(q),
        openTargetsUrl: null,
        eparProductInfoUrl: null,
      },
    ]
  }
}
