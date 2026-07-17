/**
 * Resolve free-public API provenance for a datapoint (source, endpoint, docs, URL).
 * Used by clickable DataPoint tooltips so users can verify upstreams themselves.
 */

import { getPanelSource, type PanelSourceInfo } from '@/lib/panelSources'
import { API_METADATA } from '@/lib/analytics/api-meta'

export interface ProvenanceInfo {
  /** Stable key (panel id or tracker source) */
  sourceKey: string
  /** Organization / publisher */
  organization: string
  /** API product name */
  api: string
  description: string
  /** Upstream API base / fetch endpoint */
  endpoint: string
  /** Human docs */
  docs: string
  /** Optional deep link for this specific row */
  recordUrl?: string
  /** When BioIntel last fetched this category/panel */
  fetchedAt?: Date | string | null
}

/** Aliases for gene/tracker keys → panelSources / API_METADATA keys */
const SOURCE_ALIASES: Record<string, string> = {
  gtex: 'gtex',
  bgee: 'bgee',
  'expression-atlas': 'expression-atlas',
  expressionatlas: 'expression-atlas',
  disgenet: 'disgenet',
  clinvar: 'clinvar',
  dbsnp: 'dbsnp',
  dgidb: 'dgidb',
  reactome: 'reactome',
  wikipathways: 'wikipathways',
  'gene-ontology': 'go',
  go: 'go',
  quickgo: 'go',
  'ncbi-gene': 'gene-info',
  mygene: 'mygene',
  ensembl: 'ensembl',
  uniprot: 'uniprot',
  pubchem: 'properties',
  openfda: 'companies',
  clinicaltrials: 'clinical-trials',
  patents: 'patents',
  synthesis: 'synthesis',
  'gene-info': 'gene-info',
  ttd: 'ttd',
  'nci-cadsr': 'nci-cadsr',
  'niaid-immport': 'niaid-immport',
  foodb: 'foodb',
}

function resolveKey(sourceKey: string): string {
  const k = sourceKey.trim().toLowerCase()
  return SOURCE_ALIASES[k] || k
}

/**
 * Build provenance from panelSources + API_METADATA.
 * Never invents endpoints — missing fields stay empty string.
 */
export function resolveProvenance(
  sourceKey: string,
  opts?: {
    recordUrl?: string
    fetchedAt?: Date | string | null
    endpointOverride?: string
  },
): ProvenanceInfo {
  const key = resolveKey(sourceKey)
  const panel: PanelSourceInfo | null = getPanelSource(key)
  const metaFromApi = API_METADATA[key]

  return {
    sourceKey: key,
    organization: panel?.source || metaFromApi?.organization || key,
    api: panel?.api || key,
    description: panel?.description || metaFromApi?.description || '',
    endpoint: opts?.endpointOverride || panel?.endpoint || metaFromApi?.apiEndpoint || '',
    docs: panel?.docs || metaFromApi?.apiDocs || '',
    recordUrl: opts?.recordUrl,
    fetchedAt: opts?.fetchedAt ?? null,
  }
}

export function formatProvenanceTimestamp(fetchedAt?: Date | string | null): string {
  if (!fetchedAt) return 'Not recorded for this view'
  try {
    const d = typeof fetchedAt === 'string' ? new Date(fetchedAt) : fetchedAt
    if (Number.isNaN(d.getTime())) return String(fetchedAt)
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return String(fetchedAt)
  }
}
