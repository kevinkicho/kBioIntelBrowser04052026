/**
 * Solo-local research shelves: named lists of entities with last export time.
 * Not multi-tenant cloud.
 */

export const RESEARCH_SHELVES_KEY = 'biointel-research-shelves-v1'
export const RESEARCH_SHELVES_EVENT = 'biointel-research-shelves'
export const MAX_SHELVES = 20
export const MAX_ITEMS_PER_SHELF = 40

export type ResearchShelfEntityType = 'molecule' | 'gene' | 'disease' | 'org'

export interface ResearchShelfItem {
  entityType: ResearchShelfEntityType
  id: string
  label: string
  addedAt: string
  lastKitExportedAt?: string
  href?: string
}

export interface ResearchShelf {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  items: ResearchShelfItem[]
}

function uid(): string {
  return `shelf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function loadResearchShelves(): ResearchShelf[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(RESEARCH_SHELVES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((s) => s && typeof s.id === 'string' && Array.isArray(s.items))
  } catch {
    return []
  }
}

export function saveResearchShelves(shelves: ResearchShelf[]): void {
  if (typeof window === 'undefined') return
  try {
    const capped = shelves.slice(0, MAX_SHELVES).map((s) => ({
      ...s,
      items: s.items.slice(0, MAX_ITEMS_PER_SHELF),
    }))
    window.localStorage.setItem(RESEARCH_SHELVES_KEY, JSON.stringify(capped))
    window.dispatchEvent(new CustomEvent(RESEARCH_SHELVES_EVENT, { detail: capped }))
  } catch {
    /* quota */
  }
}

export function createResearchShelf(name: string): ResearchShelf {
  const now = new Date().toISOString()
  const shelf: ResearchShelf = {
    id: uid(),
    name: name.trim() || 'Research shelf',
    createdAt: now,
    updatedAt: now,
    items: [],
  }
  const all = loadResearchShelves()
  all.unshift(shelf)
  saveResearchShelves(all)
  return shelf
}

export function deleteResearchShelf(id: string): void {
  saveResearchShelves(loadResearchShelves().filter((s) => s.id !== id))
}

export function addToResearchShelf(
  shelfId: string,
  item: Omit<ResearchShelfItem, 'addedAt'> & { addedAt?: string },
): ResearchShelf | null {
  const all = loadResearchShelves()
  const idx = all.findIndex((s) => s.id === shelfId)
  if (idx < 0) return null
  const shelf = all[idx]!
  const nextItem: ResearchShelfItem = {
    ...item,
    addedAt: item.addedAt || new Date().toISOString(),
  }
  const without = shelf.items.filter(
    (i) => !(i.entityType === nextItem.entityType && i.id === nextItem.id),
  )
  without.unshift(nextItem)
  const updated: ResearchShelf = {
    ...shelf,
    updatedAt: new Date().toISOString(),
    items: without.slice(0, MAX_ITEMS_PER_SHELF),
  }
  all[idx] = updated
  saveResearchShelves(all)
  return updated
}

export function markShelfKitExported(
  shelfId: string,
  entityType: ResearchShelfEntityType,
  entityId: string,
): void {
  const all = loadResearchShelves()
  const idx = all.findIndex((s) => s.id === shelfId)
  if (idx < 0) return
  const shelf = all[idx]!
  const items = shelf.items.map((i) =>
    i.entityType === entityType && i.id === entityId
      ? { ...i, lastKitExportedAt: new Date().toISOString() }
      : i,
  )
  all[idx] = { ...shelf, items, updatedAt: new Date().toISOString() }
  saveResearchShelves(all)
}
