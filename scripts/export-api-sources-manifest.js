/**
 * Export combined free-API source list for sharing with other apps.
 *
 * Sources of truth (do not edit the JSON by hand long-term):
 *   - src/lib/panelSources.ts  (panel id → api name, docs, endpoint)
 *   - src/lib/analytics/api-meta.ts  (tracker/meta key → org, docs, endpoint)
 *
 * Usage:  node scripts/export-api-sources-manifest.js
 * Writes: docs/api-sources-manifest.json
 *         docs/api-sources-manifest.md
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const PANEL_PATH = path.join(ROOT, 'src/lib/panelSources.ts')
const META_PATH = path.join(ROOT, 'src/lib/analytics/api-meta.ts')
const OUT_JSON = path.join(ROOT, 'docs/api-sources-manifest.json')
const OUT_MD = path.join(ROOT, 'docs/api-sources-manifest.md')

function extractObjectLiteral(src, marker) {
  const i = src.indexOf(marker)
  if (i < 0) throw new Error(`Marker not found: ${marker}`)
  const start = src.indexOf('{', i)
  if (start < 0) throw new Error(`No { after ${marker}`)
  let depth = 0
  for (let j = start; j < src.length; j++) {
    const ch = src[j]
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return src.slice(start, j + 1)
    }
  }
  throw new Error(`Unbalanced braces for ${marker}`)
}

function stripTsComments(lit) {
  return lit
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/[^\n]*$/gm, '')
}

function evalObjectLiteral(lit, label) {
  const cleaned = stripTsComments(lit)
  try {
    // Object literals are valid modern JS (quoted + unquoted keys, trailing commas).
    return new Function(`"use strict"; return (${cleaned});`)()
  } catch (e) {
    throw new Error(`Failed to eval ${label}: ${e.message}`)
  }
}

function loadCatalogs() {
  const panelSrc = fs.readFileSync(PANEL_PATH, 'utf8')
  const metaSrc = fs.readFileSync(META_PATH, 'utf8')

  const entriesLit = extractObjectLiteral(panelSrc, 'const ENTRIES')
  const metaLit = extractObjectLiteral(metaSrc, 'export const API_METADATA')

  const entries = evalObjectLiteral(entriesLit, 'ENTRIES')
  const apiMetadata = evalObjectLiteral(metaLit, 'API_METADATA')
  return { entries, apiMetadata }
}

function mergePanel(panelId, entry, apiMetadata) {
  const metaKey = entry._metaKey || null
  const meta = metaKey && apiMetadata[metaKey] ? apiMetadata[metaKey] : null
  return {
    panelId,
    apiName: entry.api || '',
    organization: meta?.organization || entry.source || '',
    source: entry.source || meta?.organization || '',
    description: entry.description || meta?.description || '',
    docsUrl: entry.docs || meta?.apiDocs || '',
    endpointUrl: entry.endpoint || meta?.apiEndpoint || '',
    metaKey,
    kind: 'panel',
  }
}

function metaOnlyEntry(metaKey, meta) {
  return {
    panelId: null,
    apiName: metaKey,
    organization: meta.organization || '',
    source: meta.organization || '',
    description: meta.description || '',
    docsUrl: meta.apiDocs || '',
    endpointUrl: meta.apiEndpoint || '',
    metaKey,
    kind: 'meta-only',
  }
}

function buildManifest(entries, apiMetadata) {
  const usedMeta = new Set()
  const panels = []

  for (const [panelId, entry] of Object.entries(entries)) {
    if (entry._metaKey) usedMeta.add(entry._metaKey)
    panels.push(mergePanel(panelId, entry, apiMetadata))
  }

  panels.sort((a, b) => a.panelId.localeCompare(b.panelId))

  const metaOnly = []
  for (const [metaKey, meta] of Object.entries(apiMetadata)) {
    if (usedMeta.has(metaKey)) continue
    metaOnly.push(metaOnlyEntry(metaKey, meta))
  }
  metaOnly.sort((a, b) => a.metaKey.localeCompare(b.metaKey))

  // Deduped flat list by endpoint+api for external consumers
  const byEndpoint = new Map()
  for (const row of [...panels, ...metaOnly]) {
    const key = `${row.endpointUrl}||${row.apiName}`
    if (!byEndpoint.has(key)) {
      byEndpoint.set(key, {
        apiName: row.apiName,
        organization: row.organization,
        description: row.description,
        docsUrl: row.docsUrl,
        endpointUrl: row.endpointUrl,
        panelIds: row.panelId ? [row.panelId] : [],
        metaKeys: row.metaKey ? [row.metaKey] : [],
      })
    } else {
      const cur = byEndpoint.get(key)
      if (row.panelId && !cur.panelIds.includes(row.panelId)) cur.panelIds.push(row.panelId)
      if (row.metaKey && !cur.metaKeys.includes(row.metaKey)) cur.metaKeys.push(row.metaKey)
    }
  }

  const sources = [...byEndpoint.values()].sort((a, b) =>
    a.apiName.localeCompare(b.apiName),
  )

  return {
    schemaVersion: 1,
    title: 'BioIntel free public API sources',
    productLaw:
      'Free public APIs only. Evidence-first; not regulatory decision support. Endpoints may require optional free keys (e.g. openFDA rate limit, College Scorecard DEMO_KEY).',
    generatedAt: new Date().toISOString(),
    sourceOfTruth: [
      'src/lib/panelSources.ts',
      'src/lib/analytics/api-meta.ts',
    ],
    regenerate: 'node scripts/export-api-sources-manifest.js',
    counts: {
      panels: panels.length,
      metaOnly: metaOnly.length,
      uniqueSources: sources.length,
      apiMetadataKeys: Object.keys(apiMetadata).length,
    },
    /** Flat unique sources — best for sharing with other apps */
    sources,
    /** One row per profile panel id */
    panels,
    /** API_METADATA keys not linked from any panel */
    metaOnly,
  }
}

function escapeMdCell(s) {
  return String(s || '')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ')
}

function toMarkdown(manifest) {
  const lines = []
  lines.push('# BioIntel free public API sources')
  lines.push('')
  lines.push(
    'Combined list of API **names**, **docs URLs**, and **endpoints** used by BioIntel Discovery Workbench.',
  )
  lines.push('')
  lines.push('## Source of truth')
  lines.push('')
  lines.push('| File | Role |')
  lines.push('|------|------|')
  lines.push(
    '| `src/lib/panelSources.ts` | Panel id → display name, docs, endpoint |',
  )
  lines.push(
    '| `src/lib/analytics/api-meta.ts` | Tracker/meta key → org, docs, endpoint |',
  )
  lines.push('')
  lines.push(
    'Machine-readable twin: [`api-sources-manifest.json`](./api-sources-manifest.json).',
  )
  lines.push('')
  lines.push('Regenerate after editing the TS catalogs:')
  lines.push('')
  lines.push('```bash')
  lines.push('node scripts/export-api-sources-manifest.js')
  lines.push('```')
  lines.push('')
  lines.push(`Generated: \`${manifest.generatedAt}\``)
  lines.push('')
  lines.push(
    `Counts: **${manifest.counts.uniqueSources}** unique sources · **${manifest.counts.panels}** panels · **${manifest.counts.metaOnly}** meta-only · **${manifest.counts.apiMetadataKeys}** API_METADATA keys.`,
  )
  lines.push('')
  lines.push('## Product law')
  lines.push('')
  lines.push(manifest.productLaw)
  lines.push('')
  lines.push('## Unique sources (name + URLs)')
  lines.push('')
  lines.push('| API name | Organization | Endpoint | Docs |')
  lines.push('|----------|--------------|----------|------|')
  for (const s of manifest.sources) {
    lines.push(
      `| ${escapeMdCell(s.apiName)} | ${escapeMdCell(s.organization)} | ${escapeMdCell(s.endpointUrl)} | ${escapeMdCell(s.docsUrl)} |`,
    )
  }
  lines.push('')
  lines.push('## Panels (profile panel id → source)')
  lines.push('')
  lines.push('| Panel id | API name | Organization | Endpoint | Docs |')
  lines.push('|----------|----------|--------------|----------|------|')
  for (const p of manifest.panels) {
    lines.push(
      `| \`${p.panelId}\` | ${escapeMdCell(p.apiName)} | ${escapeMdCell(p.organization)} | ${escapeMdCell(p.endpointUrl)} | ${escapeMdCell(p.docsUrl)} |`,
    )
  }
  if (manifest.metaOnly.length) {
    lines.push('')
    lines.push('## Meta-only (no dedicated panel row)')
    lines.push('')
    lines.push('Tracker / analytics keys present in `API_METADATA` but not linked via `_metaKey` from a panel entry (or used only in fetches).')
    lines.push('')
    lines.push('| Meta key | Organization | Endpoint | Docs |')
    lines.push('|----------|--------------|----------|------|')
    for (const m of manifest.metaOnly) {
      lines.push(
        `| \`${m.metaKey}\` | ${escapeMdCell(m.organization)} | ${escapeMdCell(m.endpointUrl)} | ${escapeMdCell(m.docsUrl)} |`,
      )
    }
  }
  lines.push('')
  lines.push('## Notes for other apps')
  lines.push('')
  lines.push('- Prefer **`sources`** in the JSON for a deduped list of `apiName` + `endpointUrl` + `docsUrl`.')
  lines.push('- Prefer **`panels`** if you need BioIntel panel ids.')
  lines.push('- Some “endpoints” are portal/search URLs or local joins (`join://…`), not JSON APIs.')
  lines.push('- Optional free API keys improve rate limits for some hosts (openFDA, data.gov); product does not require paid DBs.')
  lines.push('- Client implementations live under `src/lib/api/`.')
  lines.push('')
  return lines.join('\n')
}

function main() {
  const { entries, apiMetadata } = loadCatalogs()
  const manifest = buildManifest(entries, apiMetadata)

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true })
  fs.writeFileSync(OUT_JSON, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
  fs.writeFileSync(OUT_MD, toMarkdown(manifest), 'utf8')

  console.log(
    `Wrote ${path.relative(ROOT, OUT_JSON)} (${manifest.counts.uniqueSources} unique sources, ${manifest.counts.panels} panels)`,
  )
  console.log(`Wrote ${path.relative(ROOT, OUT_MD)}`)
}

main()
