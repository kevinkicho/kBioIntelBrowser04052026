import type { CategoryId } from '@/lib/categoryConfig'
import { MOLECULE_CATEGORY_IDS } from '@/lib/categoryConfig'
import type { CopilotToolContext } from './types'

export function isCategoryId(id: string): id is CategoryId {
  return (MOLECULE_CATEGORY_IDS as string[]).includes(id)
}

/** Denser panel samples for agent tools — prefer registry ids over empty shells. */
export function sampleArray(val: unknown, n = 12): unknown[] {
  if (!Array.isArray(val)) return []
  return val.slice(0, n).map((row) => {
    if (!row || typeof row !== 'object') return row
    const o = row as Record<string, unknown>
    const pick: Record<string, unknown> = {}
    let i = 0
    const keys = Object.keys(o).filter((k) => !k.startsWith('_'))
    const preferred = keys.filter((k) =>
      /id|name|title|nct|pmid|doi|target|phase|status|value|pchembl|reaction|count|serious/i.test(
        k,
      ),
    )
    const rest = keys.filter((k) => !preferred.includes(k))
    for (const k of [...preferred, ...rest]) {
      const v = o[k]
      if (typeof v === 'object' && v !== null && !Array.isArray(v)) continue
      if (Array.isArray(v)) {
        pick[k] = v.slice(0, 4).map((x) => (typeof x === 'string' ? x.slice(0, 80) : x))
      } else {
        pick[k] = typeof v === 'string' ? v.slice(0, 160) : v
      }
      if (++i >= 14) break
    }
    return pick
  })
}

export function resolveProjectId(args: Record<string, unknown>, ctx: CopilotToolContext): string {
  const fromArgs = String(args.projectId || args.project || '').trim()
  return fromArgs || ctx.defaultProjectId || ''
}
