/**
 * Sources that must not be called (broken host / no viable free JSON).
 *
 * After enabling a live free path, **remove** the key from this map.
 * Panels for remaining keys stay visible as “Next work” (not hidden).
 *
 * Status (2026-07):
 * - ttd: ENABLED — BioThings TTD KP (biothings.ncats.io/ttd)
 * - nci-cadsr: ENABLED — NCI EVS REST (api-evsrest.nci.nih.gov NCIt)
 * - niaid-immport: ENABLED — ImmPort Shared Data Search API
 * - dfdb / phytohub: ENABLED via FooDB free public API substitute
 */

export const DISABLED_API_SOURCES: Record<string, string> = {
  // Empty map: all previously blocked sources now have free public paths.
  // Re-add keys here if an upstream dies again.
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
