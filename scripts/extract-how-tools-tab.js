#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')

const pagePath = path.join(__dirname, '..', 'src/app/how-it-works/page.tsx')
const outPath = path.join(__dirname, '..', 'src/components/how-it-works/HowToolsTab.tsx')
const lines = fs.readFileSync(pagePath, 'utf8').split(/\r?\n/)

// Inner tools tab markup: lines 649-889 (1-based) = the root <div>…</div>
const inner = lines.slice(648, 889).join('\n')

const component = `'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  RESEARCH_PLAYBOOKS,
  RESEARCH_TOOLS,
  researchGoalLabel,
  type ResearchGoal,
  type ToolChannel,
} from '@/lib/methods/researchToolCatalog'
import { HelperTip } from '@/components/ui/HelperTip'

const CHANNEL_LABELS: Record<ToolChannel, string> = {
  ui: 'UI',
  cli: 'CLI',
  copilot: 'Copilot',
  api: 'API',
  export: 'Export',
}

const GOAL_FILTER_ORDER: Array<ResearchGoal | 'all'> = [
  'all',
  'discover',
  'evidence',
  'compare',
  'pack',
  'hypothesis',
  'export',
  'ops',
]

export function HowToolsTab({
  initialPlaybookId = null,
}: {
  initialPlaybookId?: string | null
}) {
  const [openTool, setOpenTool] = useState<string | null>(null)
  const [openPlaybook, setOpenPlaybook] = useState<string | null>(initialPlaybookId)
  const [toolGoalFilter, setToolGoalFilter] = useState<ResearchGoal | 'all'>('all')
  const [toolChannelFilter, setToolChannelFilter] = useState<ToolChannel | 'all'>('all')

  const researchToolsFiltered = useMemo(() => {
    return RESEARCH_TOOLS.filter((t) => {
      if (toolGoalFilter !== 'all' && t.goal !== toolGoalFilter) return false
      if (toolChannelFilter !== 'all' && t.channel !== toolChannelFilter) return false
      return true
    })
  }, [toolGoalFilter, toolChannelFilter])

  return (
${inner}
  )
}
`

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, component)

// Replace tools tab block in page with <HowToolsTab />
const page = fs.readFileSync(pagePath, 'utf8')
const start = page.indexOf("        {tab === 'tools' && (")
const endMarker = "        {tab === 'funnel' && ("
const end = page.indexOf(endMarker)
if (start < 0 || end < 0) {
  console.error('markers not found', start, end)
  process.exit(1)
}
const next = (
  page.slice(0, start) +
  `        {tab === 'tools' && (
          <HowToolsTab
            initialPlaybookId={
              typeof window !== 'undefined' &&
              RESEARCH_PLAYBOOKS.some((p) => p.id === window.location.hash.slice(1))
                ? window.location.hash.slice(1)
                : null
            }
          />
        )}

` +
  page.slice(end)
)

// Add import
let withImport = next
if (!withImport.includes('HowToolsTab')) {
  withImport = withImport.replace(
    "import { StyledTooltip } from '@/components/ui/StyledTooltip'",
    "import { StyledTooltip } from '@/components/ui/StyledTooltip'\nimport { HowToolsTab } from '@/components/how-it-works/HowToolsTab'",
  )
}

// Remove unused tool state/filters that only tools tab used — optional cleanup later
fs.writeFileSync(pagePath, withImport)
console.log('extracted HowToolsTab; page tools tab replaced')
