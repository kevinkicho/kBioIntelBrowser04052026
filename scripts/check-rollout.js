#!/usr/bin/env node
/**
 * Verify App Hosting backend status for BioIntel (post-main-push).
 *
 *   node scripts/check-rollout.js
 *   npm run ship:rollout
 *
 * Does not force a rollout — only reports reconciling / URI / updateTime.
 */

const { spawnSync } = require('child_process')

const PROJECT = process.env.FIREBASE_PROJECT || 'kbiointelbrowser04052026'
const BACKEND = process.env.BIOINTEL_BACKEND || 'biointel'
const PROD_URL =
  process.env.BIOINTEL_BASE ||
  'https://biointel--kbiointelbrowser04052026.us-east4.hosted.app'

function run(cmd, args) {
  const r = spawnSync(cmd, args, {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  })
  return {
    status: r.status ?? 1,
    stdout: (r.stdout || '').trim(),
    stderr: (r.stderr || '').trim(),
  }
}

console.log('BioIntel App Hosting rollout check')
console.log('==================================')
console.log(`  project: ${PROJECT}`)
console.log(`  backend: ${BACKEND}`)
console.log(`  probe:   ${PROD_URL}`)

const list = run('npx', [
  '-y',
  'firebase-tools@latest',
  'apphosting:backends:get',
  BACKEND,
  '--project',
  PROJECT,
  '--json',
])

if (list.status !== 0) {
  console.error(list.stderr || list.stdout || 'firebase backends:get failed')
  console.error('\n✗ Could not query App Hosting (auth / CLI?).\n')
  process.exit(1)
}

let body
try {
  body = JSON.parse(list.stdout)
} catch {
  console.error('✗ Could not parse firebase JSON')
  process.exit(1)
}

const result = body.result || body
const reconciling = Boolean(result.reconciling)
const updateTime = result.updateTime || result.update_time || '?'
const uri = result.uri || result.servingUrl || PROD_URL.replace(/^https:\/\//, '')

console.log(`  reconciling: ${reconciling}`)
console.log(`  updateTime:  ${updateTime}`)
console.log(`  uri:         ${uri}`)

// HTTP probe campaign (lightweight)
let httpOk = false
try {
  const r = spawnSync(
    process.execPath,
    [
      '-e',
      `fetch(${JSON.stringify(PROD_URL + '/campaign')}).then(r=>{console.log(r.status);process.exit(r.ok?0:1)}).catch(()=>process.exit(2))`,
    ],
    { encoding: 'utf8', timeout: 30000 },
  )
  httpOk = r.status === 0
  console.log(`  GET /campaign: ${(r.stdout || '').trim() || r.status}`)
} catch {
  console.log('  GET /campaign: probe skipped')
}

if (reconciling) {
  console.log('\n⚠ Backend still reconciling — wait before claiming rollout complete.\n')
  process.exit(2)
}
if (!httpOk) {
  console.log('\n⚠ HTTP probe did not return 2xx — check App Hosting build logs.\n')
  process.exit(3)
}
console.log('\n✓ Backend not reconciling and /campaign responded OK\n')
process.exit(0)
