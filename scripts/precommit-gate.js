#!/usr/bin/env node
/**
 * Pre-commit / CI capability gate for BioIntel.
 *
 * Must match `.github/workflows/precommit.yml` so local pre-commit catches
 * every failure GitHub CI would hit (tsc + fullApp + of-record + inventory).
 *
 * Blocks brittle regressions before they hit main:
 *  1. Typecheck (tsc --noEmit)
 *  2. Capability inventory + UI brittleness suites (includes fullApp)
 *  3. Product of-record / data hub / discovery unit tests
 *  4. Catalog completeness: fullApp/01-inventory (explicit; also in CI step)
 *
 * Usage:
 *   node scripts/precommit-gate.js
 *   npm run test:precommit
 *
 * Optional env:
 *   PRECOMMIT_SKIP_TSC=1   — skip typecheck (not recommended)
 *   PRECOMMIT_FULL=1       — also run broader component panel smoke patterns
 *   PRECOMMIT_BUILD=1      — also run `next build` (slow; optional local/CI extra)
 */

const { spawnSync } = require('child_process')
const path = require('path')
const fs = require('fs')

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

/** Fail fast if Jest config would break on clean npm ci (no ts-node). */
function assertJestConfigCiSafe() {
  const tsConfig = path.join(root, 'jest.config.ts')
  const jsConfig = path.join(root, 'jest.config.js')
  const mjsConfig = path.join(root, 'jest.config.mjs')
  const cjsConfig = path.join(root, 'jest.config.cjs')
  if (fs.existsSync(tsConfig) && !fs.existsSync(jsConfig) && !fs.existsSync(mjsConfig) && !fs.existsSync(cjsConfig)) {
    console.error(
      '\n✗ Gate failed: jest.config.ts alone requires ts-node on clean CI installs.\n' +
        '  Use jest.config.js (committed) or add ts-node as a direct devDependency.\n',
    )
    process.exit(1)
  }
  // Prefer JS config; warn if both exist (Jest may prefer .ts and reintroduce CI footgun)
  if (fs.existsSync(tsConfig) && (fs.existsSync(jsConfig) || fs.existsSync(mjsConfig) || fs.existsSync(cjsConfig))) {
    console.warn(
      '⚠ Both jest.config.ts and a JS config exist — remove jest.config.ts so CI never needs ts-node.',
    )
  }
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
  'fullApp',
].join('|')

// Historical of-record / pack / discovery gate (from package.json test:gate)
// Keep apiFetchIsolation / api-tracker isolation in the gate so fetch hardening stays green.
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
  'apiFetchIsolation',
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
  'campaignStageProgress',
  'v3RemainingSlices',
  'goldenPaths',
  'applyGoldenPath',
  'mondayExperimentLibrary',
  'mondayHandoff',
  'evidenceOrchestration',
  'packHonesty',
  'notRetrievedBanner',
  'loopCoach',
  'honestyEnvelope',
  'categoryHonestyCache',
  'geneHonestyCache',
  'nihLeafHonesty',
  'similarHonestyCache',
  'categoryClientHonestyCache',
  'vendorsHonestyCache',
  'clinicaltrialsHonesty',
  'patentsHonesty',
  'gatherTrialDrugsHonesty',
  'europepmcHonesty',
  'openalexHonesty',
  'adverseeventsHonesty',
  'harvestHonesty',
  'siderHonesty',
  'recallsHonesty',
  'semanticScholarHonesty',
  'pubmedHonesty',
  'arxivHonesty',
  'crossrefHonesty',
  'uniprotHonesty',
  'chemblHonesty',
  'reactomeHonesty',
  'opentargetsHonesty',
  'stringHonesty',
  'ensemblHonesty',
  'mygeneHonesty',
  'monarchHonesty',
  'gwasHonesty',
  'nihreporterHonesty',
  'bindingdbHonesty',
  'panelEmptyShellHonesty',
  'densifyHonesty',
  'disgenetHonesty',
  'dgidbHonesty',
  'orphanetHonesty',
  'gatherHonesty',
  'lib/disgenet.test',
  'lib/orphanet.test',
  'lib/dgidb.test',
  'lib/nihreporter',
  'lib/bindingdb.test',
  'lib/pubmed',
  'lib/arxiv',
  'lib/crossref',
  'lib/chembl.test',
  'lib/reactome',
  'lib/opentargets.test',
  'lib/opentargets-knowndrugs',
  'lib/opentargets-targets',
  'lib/string-db',
  'lib/ensembl.test',
  'lib/monarch.test',
  'lib/gwas-catalog',
  'lib/mygene.test',
  'knownDrugs',
  'PipelinePanel',
  'VendorsPanel',
  'readmeHonesty',
  'homeCampaignChrome',
  'decisionBrief',
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
console.log(`  platform: ${process.platform}  node: ${process.version}`)
console.log('  (mirrors .github/workflows/precommit.yml)\n')

assertJestConfigCiSafe()

if (process.env.PRECOMMIT_SKIP_TSC !== '1') {
  run('Typecheck', 'npx', ['tsc', '--noEmit'])
}

// Same ESLint errors that fail `next build` (production / App Hosting).
// Set PRECOMMIT_SKIP_LINT=1 only for emergency local commits.
if (process.env.PRECOMMIT_SKIP_LINT !== '1') {
  run('ESLint (next lint — blocks production build)', 'npx', ['next', 'lint'])
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

// Explicit inventory step — same as CI workflow second jest step
run('Catalog completeness (fullApp/01-inventory)', 'npx', [
  'jest',
  '--testPathPatterns=fullApp/01-inventory',
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

if (process.env.PRECOMMIT_BUILD === '1') {
  run('Production build (next build)', 'npx', ['next', 'build'])
}

console.log('\n==================================')
console.log('✓ Pre-commit gate passed')
console.log('  Included: tsc · next lint · fullApp · of-record · 01-inventory · apiFetchIsolation')
console.log('  Optional: PRECOMMIT_FULL=1 for broader legacy component smoke')
console.log('  Optional: PRECOMMIT_BUILD=1 for next build (slow)')
console.log('  Optional: PRECOMMIT_SKIP_LINT=1 emergency only')
console.log('  Required for loop PRs: npm run test:e2e:fixture:auto (CI: e2e-fixture.yml)')
console.log('  Optional: npm run test:e2e:full-app:auto (routes + molecule chrome; nightly)')
console.log('  ship: npm run ship:verify:e2e  # precommit + north-star fixture')
console.log('==================================\n')
