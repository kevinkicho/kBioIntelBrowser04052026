#!/usr/bin/env node
/**
 * Split research/catalog.ts into domain modules; catalog.ts becomes thin re-export.
 */
'use strict'

const fs = require('fs')
const path = require('path')

const DIR = path.join(__dirname, '..', 'src/lib/methods/research')
const SRC = path.join(DIR, 'catalog.ts')
const lines = fs.readFileSync(SRC, 'utf8').split(/\r?\n/)

// 1-based inclusive line ranges from structure scan
const take = (a, b) => lines.slice(a - 1, b).join('\n')

// types: 17-81 (ToolAudience … researchGoalLabel)
// tools helpers + COPILOT + SURFACE + RESEARCH_TOOLS: 83-377
// playbooks + lookup helpers: 379-621 (through formatPlaybookPlain)
// suggest: 623-887
// tips: 888-1028
// export: 1029-end

fs.writeFileSync(
  path.join(DIR, 'types.ts'),
  `/** Research tool / playbook type surface. */
${take(17, 81)}
`,
)

fs.writeFileSync(
  path.join(DIR, 'tools.ts'),
  `/** Research tool entries (UI / CLI / copilot allowlist mapping). */
import {
  COPILOT_MAX_TOOL_STEPS,
  COPILOT_TOOLS,
  type CopilotToolName,
} from '@/lib/ai/copilot/tools/catalog'
import type { ResearchGoal, ResearchToolEntry } from './types'

${take(83, 377)}
`,
)

// researchToolsByGoal etc reference RESEARCH_TOOLS and RESEARCH_PLAYBOOKS
// lines 582-621 use both tools and playbooks — put lookups with playbooks after tools import

fs.writeFileSync(
  path.join(DIR, 'playbooks.ts'),
  `/** Scientific research playbooks. */
import { COPILOT_TOOLS, type CopilotToolName } from '@/lib/ai/copilot/tools/catalog'
import type { ResearchPlaybook, ResearchToolEntry, ToolChannel, ResearchGoal } from './types'
import { RESEARCH_TOOLS } from './tools'

${take(379, 621)}
`,
)

fs.writeFileSync(
  path.join(DIR, 'suggest.ts'),
  `/** Goal → next actions for humans + agents. */
import type { ResearchGoal, ResearchToolEntry } from './types'
import { researchGoalLabel } from './types'
import { researchToolsByGoal } from './playbooks'
import { researchPlaybookById } from './playbooks'

${take(623, 887)}
`,
)

// researchPlaybookById is in 588-590 range inside playbooks slice - good
// researchToolsByGoal is in 582 - in playbooks file - but it uses RESEARCH_TOOLS from tools - good

fs.writeFileSync(
  path.join(DIR, 'tips.ts'),
  `/** UI playbook tip cards for Discover / board empty states. */
import type { ResearchGoal } from './types'

${take(888, 1028)}
`,
)

fs.writeFileSync(
  path.join(DIR, 'exportCatalog.ts'),
  `/** CLI JSON export payload (npm run export:research-catalog). */
import { COPILOT_TOOLS } from '@/lib/ai/copilot/tools/catalog'
import type { ResearchGoal, ToolAudience } from './types'
import { RESEARCH_PLAYBOOKS } from './playbooks'
import { SURFACE_RESEARCH_TOOLS, researchToolsByGoal } from './tools'
import { GOAL_PLAYBOOK_MAP, RESEARCH_GOALS, agentStepToCli, suggestResearchForGoal, type SuggestVars } from './suggest'

// re-export researchToolsByGoal from tools if not - wait playbooks has researchToolsByGoal
// Fix: export researchToolsByGoal from tools instead

${take(1029, lines.length)}
`,
)

// Fix tools.ts to export researchToolsByGoal helpers - currently those are in playbooks slice
// playbooks slice includes researchToolsByGoal which needs RESEARCH_TOOLS - ok

// suggest uses researchToolsByGoal from playbooks - ok
// exportCatalog uses researchToolsByGoal from tools - WRONG, fix import

// Overwrite exportCatalog imports properly after verifying playbooks exports

const exportBody = take(1029, lines.length)
fs.writeFileSync(
  path.join(DIR, 'exportCatalog.ts'),
  `/** CLI JSON export payload (npm run export:research-catalog). */
import { COPILOT_TOOLS } from '@/lib/ai/copilot/tools/catalog'
import type { ResearchGoal, ToolAudience } from './types'
import { RESEARCH_PLAYBOOKS, researchToolsByGoal } from './playbooks'
import { SURFACE_RESEARCH_TOOLS } from './tools'
import {
  GOAL_PLAYBOOK_MAP,
  RESEARCH_GOALS,
  agentStepToCli,
  suggestResearchForGoal,
  type SuggestVars,
} from './suggest'

${exportBody}
`,
)

// playbooks.ts currently imports researchToolsByGoal's dependency RESEARCH_TOOLS
// but also includes formatPlaybookPlain and researchPlaybookById and copilotToolNames
// copilotToolNames uses COPILOT_TOOLS - import present

// Fix playbooks: remove unused ResearchToolEntry if RESEARCH_TOOLS filter needs it

// tools.ts: the take includes function copilotToolGoal which needs CopilotToolName - imported

// suggest.ts: take starts with GOAL_PLAYBOOK_MAP - needs ResearchGoal - has import
// uses researchPlaybookById, researchToolsByGoal, researchGoalLabel - imported
// uses SuggestVars interfaces which are IN the take - good

// Write catalog.ts as barrel
fs.writeFileSync(
  path.join(DIR, 'catalog.ts'),
  `/**
 * Research tool catalog public surface (split modules below).
 * Prefer @/lib/methods/researchToolCatalog or this package.
 */
export * from './types'
export * from './tools'
export * from './playbooks'
export * from './suggest'
export * from './tips'
export * from './exportCatalog'
`,
)

// index.ts already re-exports catalog
console.log('split research catalog modules')
