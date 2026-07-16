/**
 * Known-broken, stub, or non-API sources that should not be called on every molecule load.
 * Returning empty without a network round-trip avoids DNS/HTML noise and timeout budget waste.
 *
 * Re-enable a source by removing it from this map after verifying a working JSON endpoint.
 */
export const DISABLED_API_SOURCES: Record<string, string> = {
  'nci-cadsr':
    'Host cadsrapi.nci.nih.gov does not resolve; NCI caDSR API endpoint needs update',
  'niaid-immport':
    'ImmPort shared/data/search returns HTML, not a public JSON API',
  // Stubs that always returned [] (no public REST API)
  ttd: 'TTD has no public REST API — use ChEMBL/Open Targets instead',
  dfdb: 'DFDB client is a stub with no live endpoint',
  phytohub: 'PhytoHub client is a stub with no live endpoint',
}

export function isApiSourceDisabled(sourceId: string): boolean {
  return sourceId in DISABLED_API_SOURCES
}

export function getApiSourceDisabledReason(sourceId: string): string | undefined {
  return DISABLED_API_SOURCES[sourceId]
}
