#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')

const pagePath = path.join(__dirname, '..', 'src/app/analytics/page.tsx')
const outPath = path.join(__dirname, '..', 'src/components/analytics/analyticsPageUi.tsx')
const s = fs.readFileSync(pagePath, 'utf8')
const idx = s.indexOf('export default function AnalyticsPage')
if (idx < 0) throw new Error('AnalyticsPage not found')

// Everything before default export except 'use client' and page-only imports
const pre = s.slice(0, idx)
// Keep imports that helpers need
const helperBody = pre
  .replace(/^'use client'\s*\n/, '')
  .replace(/import \{ useState, useEffect, useCallback \} from 'react'\s*\n/, '')
  .replace(/import \{ ProductFunnelPanel \}[^\n]+\n/, '')
  .replace(/import \{ RequestMetricsPanel \}[^\n]+\n/, '')
  .replace(/import \{ productEventLabel \}[^\n]+\n/, '')

const helperFile =
  `'use client'\n\n` +
  `import type { ApiMeta } from '@/lib/analytics/api-meta'\n` +
  `import { API_METADATA } from '@/lib/analytics/api-meta'\n` +
  `import { StyledTooltip } from '@/components/ui/StyledTooltip'\n\n` +
  helperBody +
  `\n// Re-export types used by the page if defined in helpers block\n`

// The helper body still has API_METADATA and StyledTooltip imports possibly duplicated
// Strip duplicate imports from helperBody
let cleaned = helperBody
  .replace(/import \{ API_METADATA \}[^\n]+\n/g, '')
  .replace(/import type \{ ApiMeta \}[^\n]+\n/g, '')
  .replace(/import \{ StyledTooltip \}[^\n]+\n/g, '')

const finalHelper =
  `'use client'\n\n` +
  `import type { ApiMeta } from '@/lib/analytics/api-meta'\n` +
  `import { API_METADATA } from '@/lib/analytics/api-meta'\n` +
  `import { StyledTooltip } from '@/components/ui/StyledTooltip'\n\n` +
  cleaned

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, finalHelper)

// Page: import helpers used by AnalyticsPage
// Detect exports from helper file: function Name
const names = []
for (const m of cleaned.matchAll(/^(?:export )?function (\w+)/gm)) names.push(m[1])
for (const m of cleaned.matchAll(/^type (\w+)/gm)) {
  /* types stay internal unless needed */
}
// Also export types that page uses - scan page for ApiSummary etc
const pageRest = s.slice(idx)
const typeNames = []
for (const m of cleaned.matchAll(/^(?:export )?type (\w+)/gm)) typeNames.push(m[1])
for (const m of cleaned.matchAll(/^(?:export )?interface (\w+)/gm)) typeNames.push(m[1])

// Prefix exports on types/functions in helper file
let exportedHelper = finalHelper
  .replace(/^(function )/gm, 'export $1')
  .replace(/^(type )/gm, 'export $1')
  .replace(/^(interface )/gm, 'export $1')
// avoid double export
exportedHelper = exportedHelper.replace(/export export /g, 'export ')
fs.writeFileSync(outPath, exportedHelper)

const exportNames = [...new Set([...names, ...typeNames])].filter(Boolean)
const importLine = `import {\n  ${exportNames.join(',\n  ')},\n} from '@/components/analytics/analyticsPageUi'\n`

// Build new page: use client, react hooks, panels, productEventLabel, import helpers, then AnalyticsPage only
const pageHead = `'use client'\n\n` +
  `import { useState, useEffect, useCallback } from 'react'\n` +
  `import { ProductFunnelPanel } from '@/components/analytics/ProductFunnelPanel'\n` +
  `import { RequestMetricsPanel } from '@/components/analytics/RequestMetricsPanel'\n` +
  `import { productEventLabel } from '@/lib/productEvents'\n` +
  importLine +
  `\n`

fs.writeFileSync(pagePath, pageHead + pageRest)
console.log('analytics helpers extracted:', exportNames.length, 'symbols')
