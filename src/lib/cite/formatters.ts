import type { CitationSource } from './consolidate'

export interface CitationContext {
  /** Entity name (e.g., molecule name, gene symbol, disease label) */
  entityName: string
  /** Entity type for the note field */
  entityType: 'molecule' | 'gene' | 'disease'
  /** Identifier (e.g., CID, gene id, disease id) */
  entityId: string | number
  /** ISO timestamp of when the user accessed the data */
  accessedAt: string
}

function bibtexEscape(s: string): string {
  return s.replace(/[{}\\]/g, '\\$&').replace(/&/g, '\\&')
}

function isoDate(iso: string): string {
  return iso.slice(0, 10)
}

export function formatBibtex(sources: CitationSource[], ctx: CitationContext): string {
  const accessed = isoDate(ctx.accessedAt)
  const year = ctx.accessedAt.slice(0, 4)
  return sources
    .map(s => {
      const note = `Data on ${ctx.entityType} "${ctx.entityName}" (${ctx.entityId}) accessed via BioIntel Explorer on ${accessed}`
      return [
        `@misc{${s.key},`,
        `  title = {${bibtexEscape(s.database)}},`,
        `  author = {{${bibtexEscape(s.organization)}}},`,
        `  url = {${s.docs}},`,
        `  year = {${year}},`,
        `  urldate = {${accessed}},`,
        `  note = {${bibtexEscape(note)}}`,
        `}`,
      ].join('\n')
    })
    .join('\n\n')
}

export function formatRis(sources: CitationSource[], ctx: CitationContext): string {
  const accessed = isoDate(ctx.accessedAt)
  const year = ctx.accessedAt.slice(0, 4)
  return sources
    .map(s => {
      const note = `Data on ${ctx.entityType} "${ctx.entityName}" (${ctx.entityId}) accessed via BioIntel Explorer on ${accessed}`
      return [
        'TY  - DBASE',
        `TI  - ${s.database}`,
        `AU  - ${s.organization}`,
        `UR  - ${s.docs}`,
        `PY  - ${year}`,
        `Y2  - ${accessed}`,
        `N1  - ${note}`,
        'ER  - ',
      ].join('\n')
    })
    .join('\n\n')
}
