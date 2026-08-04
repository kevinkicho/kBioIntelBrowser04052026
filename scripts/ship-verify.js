#!/usr/bin/env node
/**
 * Agent ship verifier — use after commit/push so we never claim "green" without proof.
 *
 *   npm run ship:verify              # precommit + git cleanliness hints
 *   npm run ship:verify -- --ci      # also wait for GitHub Pre-commit gate on HEAD
 *   npm run ship:verify -- --e2e     # north-star fixture e2e (required loop proof; E2E_WEBSERVER=1)
 *   npm run ship:verify -- --e2e-full # full-app Playwright surface (slower; optional)
 *   npm run ship:verify -- --ci --e2e
 *
 * Exit non-zero on any failure. Print exact next steps.
 */

const { spawnSync } = require('child_process')
const path = require('path')

const root = path.join(__dirname, '..')
const args = new Set(process.argv.slice(2))
const wantCi = args.has('--ci')
/** North-star fixture loop (deterministic) — preferred e2e gate for loop PRs. */
const wantE2e = args.has('--e2e') || args.has('--e2e-fixture')
/** Full-app route/chrome surface (may hit live free APIs for some pages). */
const wantE2eFull = args.has('--e2e-full')
const wantBuild = args.has('--build')

function run(label, command, cmdArgs, opts = {}) {
  console.log(`\n▸ ${label}\n  $ ${command} ${cmdArgs.join(' ')}\n`)
  const win = process.platform === 'win32'
  const quoted = win
    ? cmdArgs.map((a) => (typeof a === 'string' && /[|&<>^]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a))
    : cmdArgs
  const r = spawnSync(command, quoted, {
    cwd: root,
    stdio: 'inherit',
    shell: win,
    env: { ...process.env, ...opts.env },
  })
  if (r.status !== 0) {
    console.error(`\n✗ ship-verify failed: ${label} (exit ${r.status})\n`)
    process.exit(r.status || 1)
  }
  console.log(`\n✓ ${label}\n`)
}

function runCapture(command, cmdArgs) {
  const win = process.platform === 'win32'
  const r = spawnSync(command, cmdArgs, {
    cwd: root,
    encoding: 'utf8',
    shell: win,
  })
  return {
    status: r.status ?? 1,
    stdout: (r.stdout || '').trim(),
    stderr: (r.stderr || '').trim(),
  }
}

console.log('BioIntel agent ship-verify')
console.log('==========================')
console.log(`  platform: ${process.platform}  node: ${process.version}`)
console.log(
  `  flags: ${[wantCi && '--ci', wantE2e && '--e2e', wantE2eFull && '--e2e-full', wantBuild && '--build'].filter(Boolean).join(' ') || '(local gate only)'}`,
)

// 1) Local gate = what husky + GitHub precommit.yml run
run('Pre-commit gate (tsc · lint · fullApp · of-record)', 'npm', ['run', 'test:precommit'])

if (wantBuild) {
  run('Production build (next build)', 'npx', ['next', 'build'])
}

// 2) Loop proof — north-star fixture (same suite as e2e-fixture.yml CI)
if (wantE2e) {
  run(
    'E2E north-star fixture (rank → pack → RH; Playwright + webServer)',
    'npm',
    ['run', 'test:e2e:fixture'],
    { env: { E2E_FIXTURE: '1', E2E_WEBSERVER: '1', CI: process.env.CI || '1' } },
  )
}

if (wantE2eFull) {
  run(
    'E2E full-app surface (Playwright + auto webServer)',
    'npm',
    ['run', 'test:e2e:full-app'],
    { env: { E2E_WEBSERVER: '1', CI: process.env.CI || '1' } },
  )
}

// 2) Git hygiene
const status = runCapture('git', ['status', '--porcelain'])
if (status.stdout) {
  console.log('\n⚠ Working tree not clean (uncommitted / untracked files):')
  console.log(status.stdout)
  console.log('  Commit or stash before claiming ship-complete.\n')
}

const branch = runCapture('git', ['rev-parse', '--abbrev-ref', 'HEAD'])
const head = runCapture('git', ['rev-parse', 'HEAD'])
const upstream = runCapture('git', ['rev-parse', '--abbrev-ref', '@{u}'])
console.log(`  branch: ${branch.stdout || '?'}`)
console.log(`  HEAD:   ${(head.stdout || '').slice(0, 12)}`)

if (upstream.status === 0) {
  const aheadBehind = runCapture('git', ['rev-list', '--left-right', '--count', '@{u}...HEAD'])
  // format: behind\tahead
  const parts = (aheadBehind.stdout || '0\t0').split(/\s+/)
  const behind = Number(parts[0] || 0)
  const ahead = Number(parts[1] || 0)
  console.log(`  vs upstream: ahead=${ahead} behind=${behind}`)
  if (ahead > 0) {
    console.log('  → Local commits not pushed. Run: git push origin HEAD')
  }
  if (behind > 0) {
    console.log('  → Upstream is ahead. Pull/rebase before push.')
  }
} else {
  console.log('  (no upstream tracking branch)')
}

// 3) Optional: prove GitHub Pre-commit gate for current HEAD
if (wantCi) {
  const gh = runCapture('gh', ['--version'])
  if (gh.status !== 0) {
    console.error('\n✗ --ci requires GitHub CLI (`gh`) authenticated\n')
    process.exit(1)
  }
  const sha = head.stdout
  if (!sha) {
    console.error('\n✗ Could not resolve HEAD\n')
    process.exit(1)
  }

  console.log(`\n▸ Waiting for GitHub Pre-commit gate on ${sha.slice(0, 12)}…\n`)
  // Find latest precommit workflow run for this SHA
  const list = runCapture('gh', [
    'run',
    'list',
    '--workflow',
    'precommit.yml',
    '--commit',
    sha,
    '--limit',
    '3',
    '--json',
    'databaseId,status,conclusion,url,displayTitle',
  ])
  if (list.status !== 0) {
    console.error(list.stderr || list.stdout)
    console.error('\n✗ gh run list failed — is the commit pushed?\n')
    process.exit(1)
  }

  let runs = []
  try {
    runs = JSON.parse(list.stdout || '[]')
  } catch {
    console.error('\n✗ Could not parse gh run list JSON\n')
    process.exit(1)
  }

  if (runs.length === 0) {
    console.error(
      '\n✗ No Pre-commit gate run for this SHA yet.\n' +
        '  Push first: git push origin HEAD\n' +
        '  Then re-run: npm run ship:verify -- --ci\n',
    )
    process.exit(1)
  }

  const runId = String(runs[0].databaseId)
  console.log(`  watching run ${runId}: ${runs[0].url || ''}`)
  const watch = spawnSync('gh', ['run', 'watch', runId, '--exit-status'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (watch.status !== 0) {
    console.error(`\n✗ GitHub Pre-commit gate FAILED for ${sha.slice(0, 12)}`)
    console.error('  Do NOT claim ship green. Fix, commit, push, re-verify.\n')
    process.exit(watch.status || 1)
  }
  console.log(`\n✓ GitHub Pre-commit gate green for ${sha.slice(0, 12)}\n`)
}

console.log('==========================')
console.log('✓ ship-verify passed')
console.log('  Claim "CI green" only after --ci succeeded (or you watched gh yourself).')
console.log('  Claim "loop e2e green" only after --e2e (fixture) or e2e-fixture.yml for this SHA.')
console.log('  App Hosting: auto on main push — confirm rollout in Firebase console if needed.')
console.log('  Nightly full-app: gh workflow run "E2E full-app (nightly)" --ref main')
console.log('==========================\n')
