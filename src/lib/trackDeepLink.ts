/**
 * Best-effort analytics when users open external source deep links.
 * Uses canonical product event only — no dual-emit aliases.
 */

import { emitProductEvent } from './productEvents'

export type DeepLinkSource =
  | 'chembl'
  | 'dgidb'
  | 'unichem'
  | 'atc'
  | 'mychem'
  | 'pubchem'
  | 'clinicaltrials'
  | 'opentargets'
  | 'string'
  | 'stitch'
  | 'patents'
  | 'faers'
  | 'hmdb'
  | 'chebi'
  | 'drugcentral'
  | 'ndc'
  | 'pdb'
  | 'dailymed'
  | 'openalex'
  | 'nci'
  | 'bindingdb'
  | 'other'

/**
 * Call on deep-link click (before navigation). Never throws; never blocks UX.
 */
export function trackSourceDeepLink(
  source: DeepLinkSource | string,
  props?: {
    href?: string
    panelId?: string
    label?: string
  },
): void {
  try {
    emitProductEvent('source_deep_link_opened', {
      source,
      href: props?.href?.slice(0, 300),
      panelId: props?.panelId,
      label: props?.label?.slice(0, 120),
    })
  } catch {
    // ignore
  }
}

/** Wrap an external href open for use in onClick handlers. */
export function onDeepLinkClick(
  source: DeepLinkSource | string,
  href: string | null | undefined,
  extra?: { panelId?: string; label?: string },
): void {
  if (!href) return
  trackSourceDeepLink(source, { href, ...extra })
}
