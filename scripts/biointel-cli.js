#!/usr/bin/env node
/**
 * BioIntel CLI v0 — agent / operator surface for the Discovery Workbench.
 *
 * Supports free-API workflows without a browser, plus repo quality gates
 * and local activity log review. Does NOT implement multi-tenant auth,
 * paid DBs, or LLM ranking.
 *
 * Usage:
 *   node scripts/biointel-cli.js <command> [options]
 *   npm run biointel -- <command> [options]
 *   npx biointel <command>   # if package bin is linked
 *
 * Env:
 *   BIOINTEL_BASE   default http://localhost:33424
 *   PORT            used if BIOINTEL_BASE unset (default 33424)
 *
 * @see docs/design/agentic-workflow-cli.md
 * @see AGENTS.md
 */

'use strict'

const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const ROOT = path.join(__dirname, '..')
const VERSION = '0.1.0'

function baseUrl() {
  if (process.env.BIOINTEL_BASE) return process.env.BIOINTEL_BASE.replace(/\/$/, '')
  const port = process.env.PORT || 33424
  return `http://localhost:${port}`
}

function die(msg, code = 1) {
  console.error(`biointel: ${msg}`)
  process.exit(code)
}

function printJson(data) {
  console.log(JSON.stringify(data, null, 2))
}

/** Parse argv into { flags: Record, positionals: string[] } */
function parseArgs(argv) {
  const flags = {}
  const positionals = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--') continue
    if (a.startsWith('--')) {
      const eq = a.indexOf('=')
      if (eq !== -1) {
        flags[a.slice(2, eq)] = a.slice(eq + 1)
      } else {
        const key = a.slice(2)
        const next = argv[i + 1]
        if (next && !next.startsWith('-')) {
          flags[key] = next
          i++
        } else {
          flags[key] = true
        }
      }
    } else if (a.startsWith('-') && a.length === 2) {
      const key = a.slice(1)
      const next = argv[i + 1]
      if (next && !next.startsWith('-')) {
        flags[key] = next
        i++
      } else {
        flags[key] = true
      }
    } else {
      positionals.push(a)
    }
  }
  return { flags, positionals }
}

async function httpJson(method, urlPath, body, opts = {}) {
  const url = urlPath.startsWith('http') ? urlPath : `${baseUrl()}${urlPath}`
  const headers = { Accept: 'application/json', ...(opts.headers || {}) }
  const init = { method, headers }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(body)
  }
  let res
  try {
    res = await fetch(url, init)
  } catch (err) {
    die(
      `request failed: ${err.message}\n` +
        `  Is the app running? Try: npm run dev\n` +
        `  Base URL: ${baseUrl()}`,
    )
  }
  const text = await res.text()
  let data
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { raw: text.slice(0, 2000) }
  }
  if (!res.ok && !opts.allowError) {
    die(`HTTP ${res.status} ${method} ${url}\n${JSON.stringify(data, null, 2)}`)
  }
  return { status: res.status, ok: res.ok, data }
}

// ── Commands ───────────────────────────────────────────────────────────────

function cmdHelp() {
  console.log(`BioIntel CLI v${VERSION} — agent/operator surface

Usage:
  biointel <command> [options]
  npm run biointel -- <command> [options]

Environment:
  BIOINTEL_BASE   Base URL (default http://localhost:$PORT)
  PORT            Dev port (default 33424)

Commands:
  help                         Show this help
  version                      Print CLI version
  health                       Ping app + optional /api/agent-log
  law                          Print product law (agents must not violate)

  discover rank --q <query> [--targets TTR,EGFR] [--limit 15] [--json]
  discover harvest --names "Drug A,Drug B" [--safety] [--novelty]

  molecule get <cid>           GET /api/molecule/:cid
  molecule category <cid> <id> GET category aggregate
  molecule pipeline <cid>      GET pipeline
  molecule similar <cid>       GET similar
  molecule vendors <cid>       GET vendors

  orphanet genes --q <disease> GET Orphanet gene pins

  logs tail [--n 40]           Last N lines of today's agent JSONL
  logs grep <pattern>          Search logs/*.jsonl
  logs path                    Print today's log file path

  api get <path>               GET any API path (relative)
  api post <path> --body '{}'  POST JSON body

  gate                         npm run test:gate
  e2e [fixture|auto|live]      North-star Playwright e2e
  test [pattern]               Jest (optional path pattern)

Examples:
  npm run biointel -- health
  npm run biointel -- discover rank --q "ATTR amyloidosis" --targets TTR
  npm run biointel -- molecule category 3080836 pharmaceutical
  npm run biointel -- logs tail --n 20
  npm run biointel -- gate
`)
}

function cmdVersion() {
  console.log(`biointel-cli ${VERSION}`)
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
    console.log(`package ${pkg.name}@${pkg.version}`)
  } catch {
    /* ignore */
  }
}

function cmdLaw() {
  console.log(`BioIntel product law (binding for agents)

  • Free public APIs only (no paid DBs / keys as requirements)
  • Evidence-first; no regulatory decision support language
  • Solo + file export default (localStorage / IDB / download)
  • Deterministic ranking; never put LLMs in the rank path
  • AI only claim-bound on packs / research hypotheses
  • Canonical product events only (no dual-emit aliases)
  • Board packs: 5 extractor panels max; preserve subjectCandidateId

See AGENTS.md and docs/design/agentic-workflow-cli.md
`)
}

async function cmdHealth() {
  const base = baseUrl()
  console.log(`base: ${base}`)
  try {
    const home = await fetch(base, { method: 'GET' })
    console.log(`GET / → ${home.status}`)
  } catch (err) {
    die(`app not reachable: ${err.message}\n  Start with: npm run dev`)
  }
  const agent = await httpJson('GET', '/api/agent-log', undefined, { allowError: true })
  console.log(`GET /api/agent-log → ${agent.status}`, agent.data)
  console.log('ok')
}

async function cmdDiscoverRank(flags) {
  const q = flags.q || flags.query || flags.disease
  if (!q || q === true) die('discover rank requires --q <disease query>')
  const targets = flags.targets
    ? String(flags.targets)
        .split(/[,;\s]+/)
        .map((t) => t.trim())
        .filter(Boolean)
    : []
  const limit = parseInt(flags.limit || '15', 10) || 15
  const body = {
    q: String(q),
    targets,
    limit,
    rubricPreset: flags.preset || flags.rubricPreset || 'balanced',
    aeAggressiveness: flags.ae || 'soft-flag',
    runSafetyHarvest: flags.safety === true || flags.safety === 'true',
    runNoveltyHarvest: flags.novelty === true || flags.novelty === 'true',
  }
  if (flags.diseaseId) body.diseaseId = String(flags.diseaseId)

  const { data } = await httpJson('POST', '/api/discover/rank', body)
  if (flags.json) {
    printJson(data)
    return
  }
  const candidates = data?.candidates || data?.v2?.candidates || []
  console.log(`disease: ${data?.diseaseName || q}`)
  console.log(`candidates: ${candidates.length}`)
  if (data?.v2?.timingMs?.total != null) {
    console.log(`timingMs.total: ${data.v2.timingMs.total}`)
  }
  const rows = (data?.candidates || []).slice(0, limit).map((c, i) => ({
    rank: i + 1,
    name: c.name || c.displayName,
    cid: c.cid ?? c.identity?.pubchemCid ?? null,
    score: c.score ?? c.scores?.composite ?? null,
    sources: (c.sources || []).slice(0, 4).join('|'),
  }))
  console.table(rows)
  if (flags.full) printJson(data)
}

async function cmdDiscoverHarvest(flags) {
  const namesRaw = flags.names || flags.candidates
  if (!namesRaw || namesRaw === true) die('discover harvest requires --names "A,B,C"')
  const names = String(namesRaw)
    .split(/[,;]+/)
    .map((n) => n.trim())
    .filter(Boolean)
    .slice(0, 15)
  const body = {
    candidates: names.map((name) => ({ name })),
    runSafety: flags.safety !== false && flags.safety !== 'false',
    runNovelty: flags.novelty === true || flags.novelty === 'true',
  }
  const { data } = await httpJson('POST', '/api/discover/harvest', body)
  if (flags.json) printJson(data)
  else {
    console.log(`harvested: ${(data?.candidates || []).length}`)
    printJson(data)
  }
}

async function cmdMolecule(sub, positionals, flags) {
  const cid = positionals[0]
  if (!cid) die('molecule commands require <cid>')
  if (sub === 'get') {
    const { data } = await httpJson('GET', `/api/molecule/${cid}`)
    printJson(data)
    return
  }
  if (sub === 'category') {
    const cat = positionals[1] || flags.category
    if (!cat) die('molecule category requires <categoryId>')
    const qs = flags.refresh ? '?refresh=1' : ''
    const { data } = await httpJson('GET', `/api/molecule/${cid}/category/${cat}${qs}`)
    if (flags.json || flags.full) printJson(data)
    else {
      const keys = Object.keys(data || {}).filter((k) => !k.startsWith('_'))
      console.log(`cid=${cid} category=${cat} keys=${keys.length}`)
      console.log(keys.slice(0, 40).join(', '))
      if (data?._sourceStatus) {
        console.log('sourceStatus:', Object.keys(data._sourceStatus).join(', '))
      }
    }
    return
  }
  if (sub === 'pipeline') {
    const { data } = await httpJson('GET', `/api/molecule/${cid}/pipeline`)
    printJson(data)
    return
  }
  if (sub === 'similar') {
    const { data } = await httpJson('GET', `/api/molecule/${cid}/similar`)
    printJson(data)
    return
  }
  if (sub === 'vendors') {
    const { data } = await httpJson('GET', `/api/molecule/${cid}/vendors`)
    printJson(data)
    return
  }
  die(`unknown molecule subcommand: ${sub}`)
}

async function cmdOrphanet(flags) {
  const q = flags.q || flags.query
  const orpha = flags.orphaCode || flags.orpha
  if (!q && !orpha) die('orphanet genes requires --q <disease> or --orphaCode <code>')
  const params = new URLSearchParams()
  if (q) params.set('q', String(q))
  if (orpha) params.set('orphaCode', String(orpha))
  const { data } = await httpJson('GET', `/api/orphanet/genes?${params}`)
  printJson(data)
}

function todayLogFile() {
  const d = new Date().toISOString().slice(0, 10)
  return path.join(ROOT, 'logs', `agent-activity-${d}.jsonl`)
}

function cmdLogs(sub, positionals, flags) {
  if (sub === 'path') {
    console.log(todayLogFile())
    return
  }
  if (sub === 'tail') {
    const n = parseInt(flags.n || flags.lines || '40', 10) || 40
    const file = flags.file ? path.resolve(String(flags.file)) : todayLogFile()
    if (!fs.existsSync(file)) {
      console.log(`No log yet: ${file}`)
      console.log('(Start npm run dev, use the app, product events will append here.)')
      return
    }
    const lines = fs.readFileSync(file, 'utf8').trim().split(/\n/).filter(Boolean)
    console.log(lines.slice(-n).join('\n'))
    return
  }
  if (sub === 'grep') {
    const pattern = positionals[0] || flags.pattern
    if (!pattern) die('logs grep requires <pattern>')
    const re = new RegExp(pattern, flags.i ? 'i' : undefined)
    const dir = path.join(ROOT, 'logs')
    if (!fs.existsSync(dir)) die('logs/ directory missing')
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.jsonl'))
      .sort()
    let hits = 0
    for (const f of files) {
      const full = path.join(dir, f)
      const lines = fs.readFileSync(full, 'utf8').split(/\n/)
      for (const line of lines) {
        if (re.test(line)) {
          console.log(`${f}: ${line}`)
          hits++
        }
      }
    }
    if (hits === 0) console.log('(no matches)')
    return
  }
  die(`unknown logs subcommand: ${sub}`)
}

async function cmdApi(sub, positionals, flags) {
  const p = positionals[0]
  if (!p) die('api get|post requires <path>')
  const pathPart = p.startsWith('/') ? p : `/${p}`
  if (sub === 'get') {
    const { status, data } = await httpJson('GET', pathPart, undefined, { allowError: true })
    console.error(`HTTP ${status}`)
    printJson(data)
    if (status >= 400) process.exit(1)
    return
  }
  if (sub === 'post') {
    let body = {}
    if (flags.body && flags.body !== true) {
      try {
        body = JSON.parse(String(flags.body))
      } catch {
        die('--body must be valid JSON')
      }
    }
    const { status, data } = await httpJson('POST', pathPart, body, { allowError: true })
    console.error(`HTTP ${status}`)
    printJson(data)
    if (status >= 400) process.exit(1)
    return
  }
  die(`unknown api subcommand: ${sub}`)
}

function runNpm(scriptArgs) {
  const r = spawnSync('npm', ['run', ...scriptArgs], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
    env: process.env,
  })
  process.exit(r.status ?? 1)
}

function cmdGate() {
  runNpm(['test:gate'])
}

function cmdE2e(positionals) {
  const mode = positionals[0] || 'fixture'
  if (mode === 'auto' || mode === 'fixture:auto') runNpm(['test:e2e:fixture:auto'])
  else if (mode === 'live') runNpm(['test:e2e:live'])
  else if (mode === 'fixture') runNpm(['test:e2e:fixture'])
  else die(`e2e mode must be fixture | auto | live (got ${mode})`)
}

function cmdTest(positionals) {
  const pat = positionals[0]
  if (pat) {
    const r = spawnSync('npx', ['jest', pat, '--no-coverage'], {
      cwd: ROOT,
      stdio: 'inherit',
      shell: true,
    })
    process.exit(r.status ?? 1)
  }
  runNpm(['test'])
}

// ── main ───────────────────────────────────────────────────────────────────

async function main() {
  const argv = process.argv.slice(2)
  if (argv.length === 0 || argv[0] === '-h' || argv[0] === '--help') {
    cmdHelp()
    return
  }
  const cmd = argv[0]
  const rest = argv.slice(1)
  const { flags, positionals } = parseArgs(rest)

  try {
    switch (cmd) {
      case 'help':
        cmdHelp()
        break
      case 'version':
      case '-v':
      case '--version':
        cmdVersion()
        break
      case 'law':
        cmdLaw()
        break
      case 'health':
        await cmdHealth()
        break
      case 'discover': {
        const sub = rest[0]
        if (sub !== 'rank' && sub !== 'harvest') die('discover subcommands: rank | harvest')
        const { flags: f } = parseArgs(rest.slice(1))
        if (sub === 'rank') await cmdDiscoverRank(f)
        else await cmdDiscoverHarvest(f)
        break
      }
      case 'molecule': {
        const sub = rest[0]
        if (!sub) die('molecule subcommands: get | category | pipeline | similar | vendors')
        const after = parseArgs(rest.slice(1))
        await cmdMolecule(sub, after.positionals, after.flags)
        break
      }
      case 'orphanet': {
        const skip = rest[0] === 'genes' ? 1 : 0
        const { flags: f } = parseArgs(rest.slice(skip))
        await cmdOrphanet(f)
        break
      }
      case 'logs': {
        const sub = rest[0] && !rest[0].startsWith('-') ? rest[0] : 'tail'
        const after = parseArgs(rest[0] === sub ? rest.slice(1) : rest)
        cmdLogs(sub, after.positionals, after.flags)
        break
      }
      case 'api': {
        const sub = positionals[0]
        if (!sub) die('api subcommands: get | post')
        const after = parseArgs(rest.slice(1))
        await cmdApi(sub, after.positionals, after.flags)
        break
      }
      case 'gate':
        cmdGate()
        break
      case 'e2e':
        cmdE2e(positionals)
        break
      case 'test':
        cmdTest(positionals)
        break
      default:
        die(`unknown command: ${cmd}\nRun: biointel help`)
    }
  } catch (err) {
    die(err instanceof Error ? err.message : String(err))
  }
}

main()
