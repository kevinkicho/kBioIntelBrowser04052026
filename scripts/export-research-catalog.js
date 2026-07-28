#!/usr/bin/env node
/**
 * Export research tools catalog for zero-dep biointel CLI.
 *
 * Source of truth: src/lib/methods/research/* (TypeScript).
 * Writes: src/lib/methods/researchPlaybooks.json
 *
 * Usage:
 *   npm run export:research-catalog
 *   node scripts/export-research-catalog.js
 *
 * Implementation: runs a small Jest test that serializes buildResearchCatalogExport().
 * Do not hand-edit researchPlaybooks.json long-term — regenerate after catalog changes.
 */

'use strict'

const { spawnSync } = require('child_process')
const path = require('path')

const ROOT = path.join(__dirname, '..')

const r = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  [
    'jest',
    '__tests__/lib/exportResearchCatalog.test.ts',
    '--testNamePattern=writes researchPlaybooks.json',
    '--no-coverage',
    '--forceExit',
  ],
  {
    cwd: ROOT,
    env: { ...process.env, UPDATE_RESEARCH_CATALOG: '1' },
    encoding: 'utf8',
    shell: true,
  },
)

if (r.stdout) process.stdout.write(r.stdout)
if (r.stderr) process.stderr.write(r.stderr)
if (r.status !== 0) {
  console.error('export-research-catalog: jest failed')
  process.exit(r.status || 1)
}
console.log('export-research-catalog: wrote src/lib/methods/researchPlaybooks.json')
