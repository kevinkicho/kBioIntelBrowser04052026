/**
 * Known-broken, stub, or non-API sources that should not be called on every molecule load.
 * Returning empty without a network round-trip avoids DNS/HTML noise and timeout budget waste.
 *
 * Panels for these sources stay **visible but disabled** with a “Next work target” tooltip
 * (do not hide them). Re-enable by removing from this map after verifying a live JSON endpoint.
 */
export const DISABLED_API_SOURCES: Record<string, string> = {
  'nci-cadsr':
    'Next work target: NCI caDSR host does not resolve — need updated public JSON endpoint',
  'niaid-immport':
    'Next work target: ImmPort search returns HTML, not a documented public JSON API',
  ttd: 'Next work target: Therapeutic Target Database has no free public REST API (FTP dumps only)',
  dfdb: 'Next work target: Dietary Flavonoid Database has no public REST API',
  phytohub: 'Next work target: PhytoHub has no public REST API',
}

/** panelId often matches source id; map when they diverge. */
const PANEL_TO_SOURCE: Record<string, string> = {
  ttd: 'ttd',
  'nci-cadsr': 'nci-cadsr',
  'niaid-immport': 'niaid-immport',
  dfdb: 'dfdb',
  phytohub: 'phytohub',
}

export function sourceIdForPanel(panelId: string): string {
  return PANEL_TO_SOURCE[panelId] ?? panelId
}

export function isPanelSourceDisabled(panelId: string): boolean {
  return isApiSourceDisabled(sourceIdForPanel(panelId))
}

export function getPanelDisabledReason(panelId: string): string | undefined {
  return getApiSourceDisabledReason(sourceIdForPanel(panelId))
}

export function isApiSourceDisabled(sourceId: string): boolean {
  return sourceId in DISABLED_API_SOURCES
}

export function getApiSourceDisabledReason(sourceId: string): string | undefined {
  return DISABLED_API_SOURCES[sourceId]
}
