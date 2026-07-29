#!/usr/bin/env node
/**
 * Pre-commit / pre-push capability gate for BioIntel.
 *
 * Blocks brittle regressions before they hit main:
 *  1. Typecheck (tsc --noEmit)
 *  2. Capability inventory + UI brittleness suites
 *  3. Product of-record / data hub / discovery unit tests (test:gate patterns)
 *
 * Usage:
 *   node scripts/precommit-gate.js
 *   npm run test:precommit
 *
 * Optional env:
 *   PRECOMMIT_SKIP_TSC=1   — skip typecheck (not recommended)
 *   PRECOMMIT_FULL=1       — also run broader component panel smoke patterns
 */

const { spawnSync } = require('child_process')
const path = require('path')

const root = path.join(__dirname, '..')

function run(label, command, args) {
  // On Windows, shell:true splits on bare `|` inside --testPathPatterns=a|b.
  // Quote every arg that contains shell metacharacters.
  const win = process.platform === 'win32'
  const quotedArgs = win
    ? args.map((a) => (typeof a === 'string' && /[|&<>^]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a))
    : args
  console.log(`\n▸ ${label}\n  $ ${command} ${quotedArgs.join(' ')}\n`)
  const r = spawnSync(command, quotedArgs, {
    cwd: root,
    stdio: 'inherit',
    shell: win,
    env: process.env,
  })
  if (r.status !== 0) {
    console.error(`\n✗ Gate failed: ${label} (exit ${r.status})\n`)
    process.exit(r.status || 1)
  }
  console.log(`\n✓ ${label}\n`)
}

// Capability + brittleness suites (new + high-risk surfaces)
const BRITTLE_PATTERNS = [
  'reactSafe',
  'productCapabilities',
  'ExpandableItems',
  'CrossSourceStrip',
  'DataHubLedger',
  'SourceDirectoryPanel',
  'UniProtExtendedPanel',
  'lib/uniprot',
  'extractUniProtProteinName',
].join('|')

// Historical of-record / pack / discovery gate (from package.json test:gate)
const PRODUCT_PATTERNS = [
  'productEvents',
  'packClaims',
  'rehydrateClaims',
  'boardHarvest',
  'm1Funnel',
  'scoreAxes',
  'mergeCandidate',
  'packCache',
  'discoverSessions',
  'discoverUrl',
  'preferences',
  'searchHistory',
  'profileRevisitCache',
  'pubchem',
  'localSession',
  'PackBuilder.share',
  'agentActivity',
  'api-tracker.isolation',
  'panelApiTrace',
  'relatedMolecules',
  'candidateWhy',
  'faersLinks',
  'identityShell',
  'packRelatedMoleculesDensity',
  'retrievalMonitor',
  'copilotTools',
  'agentLoop',
  'dataHub',
  'researchViewPrefs',
  'researchCapabilities',
  'compareHub',
  'buildMoleculeDataHub',
  'uiDensity',
  'presentationExtras',
  'evidenceFirst',
  'densifyPipeline',
  'rankIntegration',
  'aiProvenance',
  'hubChangeAlerts',
  'hubClaimGraph',
  'similarityExpand',
  'exportResearchCatalog',
  'researchToolCatalog',
  'crossSource',
  'summaryEmpty',
  'ErrorBoundary',
].join('|')

const FULL_COMPONENT_PATTERNS = [
  'UniprotPanel',
  'ScoreAxisBars',
  'CandidateCard',
  'PaginatedList',
  'Panel.test',
  'MoleculeSummary',
].join('|')

console.log('BioIntel pre-commit capability gate')
console.log('==================================')

if (process.env.PRECOMMIT_SKIP_TSC !== '1') {
  run('Typecheck', 'npx', ['tsc', '--noEmit'])
}

run('Brittleness + capability suites', 'npx', [
  'jest',
  `--testPathPatterns=${BRITTLE_PATTERNS}`,
  '--passWithNoTests',
  '--no-coverage',
])

run('Of-record product unit suites', 'npx', [
  'jest',
  `--testPathPatterns=${PRODUCT_PATTERNS}`,
  '--passWithNoTests',
  '--no-coverage',
])

if (process.env.PRECOMMIT_FULL === '1') {
  run('Broader component smoke', 'npx', [
    'jest',
    `--testPathPatterns=${FULL_COMPONENT_PATTERNS}`,
    '--passWithNoTests',
    '--no-coverage',
  ])
}

console.log('\n==================================')
console.log('✓ Pre-commit gate passed')
console.log('  Optional: PRECOMMIT_FULL=1 for broader component smoke')
console.log('  Optional: npm run test:e2e:fixture:auto for Playwright north-star')
console.log('==================================\n')
