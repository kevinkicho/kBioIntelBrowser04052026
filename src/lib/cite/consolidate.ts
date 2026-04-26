import { CATEGORIES } from '@/lib/categoryConfig'
import { getPanelSource } from '@/lib/panelSources'

export interface CitationSource {
  /** Citation key, slug-safe — used as the BibTeX/RIS id */
  key: string
  /** Display name of the database/API (e.g., "PubChem", "ChEMBL") */
  database: string
  /** The publishing organization (e.g., "NCBI (NIH)", "EMBL-EBI") */
  organization: string
  /** Human-readable description */
  description: string
  /** Documentation URL */
  docs: string
  /** Live API endpoint */
  endpoint: string
  /** Panel ids that contributed data from this source */
  contributingPanels: string[]
}

/**
 * Strip qualifiers in parens and trailing version numbers so variants like
 * "OpenFDA (FAERS)" and "ChEMBL Mechanisms" collapse onto their parent
 * database for citation purposes.
 */
function stemApiName(api: string): string {
  return api
    .replace(/\s*\([^)]*\)\s*/g, '')
    .replace(/\s+(Mechanisms|Indications|NDC|Extended|extended)$/i, '')
    .replace(/\s+v\d+$/i, '')
    .trim()
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

/**
 * Walk the panel registry, find every panel whose data is non-empty in
 * `data`, look up its source, and consolidate by stemmed API name so each
 * underlying database produces exactly one citation entry.
 */
export function consolidateCitations(data: Record<string, unknown>): CitationSource[] {
  const seen = new Map<string, CitationSource>()

  for (const cat of CATEGORIES) {
    for (const panel of cat.panels) {
      if (!hasData(data[panel.propKey])) continue
      const info = getPanelSource(panel.id)
      if (!info) continue

      const databaseName = stemApiName(info.api)
      const key = slugify(databaseName)

      const existing = seen.get(key)
      if (existing) {
        existing.contributingPanels.push(panel.id)
        continue
      }
      seen.set(key, {
        key,
        database: databaseName,
        organization: info.source,
        description: info.description,
        docs: info.docs,
        endpoint: info.endpoint,
        contributingPanels: [panel.id],
      })
    }
  }

  return Array.from(seen.values()).sort((a, b) => a.database.localeCompare(b.database))
}

function hasData(v: unknown): boolean {
  if (v === null || v === undefined) return false
  if (Array.isArray(v)) return v.length > 0
  if (typeof v === 'object') return Object.keys(v as object).length > 0
  if (typeof v === 'string') return v.length > 0
  return true
}
