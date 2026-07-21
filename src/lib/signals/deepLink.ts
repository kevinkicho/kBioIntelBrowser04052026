/**
 * Molecule panel deep-link builders for count-signal badges (PR14 DoD).
 * Format: /molecule/{cid}?tab={category}&project=…&disease=…&panel={panelId}#{panelId}
 * `tab` opens the correct category so the panel is mounted before scroll.
 */

import { categoryIdForPanel } from './explainSignal'

export interface DeepLinkOptions {
  projectId?: string | null
  disease?: string | null
  /** Override category tab (otherwise inferred from panelId). */
  categoryId?: string | null
}

/** DOM id used as the hash target on the molecule profile. */
export function panelAnchorId(panelId: string): string {
  return panelId
}

/**
 * Build a path that opens a molecule profile scrolled to a panel.
 * Includes category `tab` so profile loads the right fan-out before hash scroll.
 */
export function buildMoleculePanelDeepLink(
  cid: number,
  panelId: string,
  opts?: DeepLinkOptions,
): string {
  if (!Number.isFinite(cid) || cid <= 0) {
    throw new Error(`Invalid cid for deep link: ${cid}`)
  }
  if (!panelId || typeof panelId !== 'string') {
    throw new Error('panelId is required for deep link')
  }

  const params = new URLSearchParams()
  const tab =
    opts?.categoryId ||
    categoryIdForPanel(panelId) ||
    null
  if (tab) params.set('tab', tab)
  // Explicit panel for clients that read query before hash settles
  params.set('panel', panelId)
  if (opts?.projectId) params.set('project', opts.projectId)
  if (opts?.disease) params.set('disease', opts.disease)
  const qs = params.toString()
  return `/molecule/${cid}${qs ? `?${qs}` : ''}#${panelAnchorId(panelId)}`
}

/** Parse panel id from a URL hash (leading # optional). */
export function panelIdFromHash(hash: string | null | undefined): string | null {
  if (!hash) return null
  const cleaned = hash.startsWith('#') ? hash.slice(1) : hash
  const id = cleaned.split('?')[0]?.trim()
  return id || null
}
