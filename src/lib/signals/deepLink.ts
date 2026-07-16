/**
 * Molecule panel deep-link builders for count-signal badges (PR14 DoD).
 * Format: /molecule/{cid}?project=…&disease=…#{panelId}
 */

export interface DeepLinkOptions {
  projectId?: string | null
  disease?: string | null
}

/** DOM id used as the hash target on the molecule profile. */
export function panelAnchorId(panelId: string): string {
  return panelId
}

/**
 * Build a path that opens a molecule profile scrolled to a panel.
 * Query params are optional; hash is always the panel id.
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
