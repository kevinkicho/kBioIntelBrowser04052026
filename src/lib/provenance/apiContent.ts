/**
 * API content provenance helpers for of-record facts (hub, Discover, exports).
 */

import { resolveProvenance, type ProvenanceInfo } from '@/lib/provenance'

export interface ApiContentProvenance {
  sourceKey: string
  sourceLabel: string
  sourceUrl?: string
  docsUrl?: string
  endpoint?: string
  organization?: string
  retrievedAt?: string | null
  /** Free-text note e.g. "session sample" */
  note?: string
}

export function buildApiContentProvenance(
  sourceKeyOrLabel: string,
  opts?: {
    sourceUrl?: string
    retrievedAt?: string | Date | null
    endpointOverride?: string
    note?: string
  },
): ApiContentProvenance {
  const info: ProvenanceInfo = resolveProvenance(sourceKeyOrLabel, {
    recordUrl: opts?.sourceUrl,
    fetchedAt: opts?.retrievedAt,
    endpointOverride: opts?.endpointOverride,
  })
  return {
    sourceKey: info.sourceKey,
    sourceLabel: info.api || sourceKeyOrLabel,
    sourceUrl: opts?.sourceUrl || info.recordUrl,
    docsUrl: info.docs || undefined,
    endpoint: info.endpoint || undefined,
    organization: info.organization || undefined,
    retrievedAt:
      opts?.retrievedAt instanceof Date
        ? opts.retrievedAt.toISOString()
        : opts?.retrievedAt ?? null,
    note: opts?.note,
  }
}

export const API_PROVENANCE_HONESTY = [
  'Facts are from free public APIs retrieved for this session',
  'Source · docs · endpoint shown when known — verify upstream before wet-lab use',
  'Empty / timeout means not retrieved, not “no association”',
  'Not clinical or regulatory decision support',
] as const
