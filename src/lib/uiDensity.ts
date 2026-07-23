/**
 * Global UI density: comfortable shows short previews; dense keeps titles + (i) tips only.
 * Solo local default (localStorage). Not a product event path.
 */

export type UiDensity = 'comfortable' | 'dense'

export const UI_DENSITY_STORAGE_KEY = 'biointel-ui-density-v1'

export const UI_DENSITY_LABELS: Record<UiDensity, string> = {
  comfortable: 'Comfortable',
  dense: 'Dense',
}

export function parseUiDensity(raw: unknown): UiDensity {
  if (raw === 'comfortable' || raw === 'dense') return raw
  return 'comfortable'
}

export function loadUiDensity(): UiDensity {
  if (typeof window === 'undefined') return 'comfortable'
  try {
    return parseUiDensity(window.localStorage.getItem(UI_DENSITY_STORAGE_KEY))
  } catch {
    return 'comfortable'
  }
}

export function saveUiDensity(mode: UiDensity): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(UI_DENSITY_STORAGE_KEY, mode)
    window.dispatchEvent(new CustomEvent('biointel-ui-density', { detail: mode }))
  } catch {
    // quota / private mode
  }
}

/** One-line preview for comfortable mode (full text stays in tooltip). */
export function shortPreview(text: string | null | undefined, max = 120): string {
  const t = (text || '').replace(/\s+/g, ' ').trim()
  if (!t) return ''
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}
