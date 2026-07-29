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

  research kit --cid <n> [--out file.json] [--categories a,b]
                           Build of-record research kit bundle (needs app running)
  discover densify --q <query> [--targets TTR] [--limit 15] [--json]
                           Rank + densify shortlist (deterministic; needs app)

  orphanet genes --q <disease> GET Orphanet gene pins

  logs tail [--n 40]           Last N lines of today's agent JSONL
  logs grep <pattern>          Search logs/*.jsonl
  logs path                    Print today's log file path

  api get <path>               GET any API path (relative)
  api post <path> --body '{}'  POST JSON body

  gate                         npm run test:gate
  e2e [fixture|auto|live]      North-star Playwright e2e
  test [pattern]               Jest (optional path pattern)

  tools list [--json]          Research tools for humans + agents
  tools playbook [id]          List playbooks or print one (scientific loops)
  tools copilot                Allowlisted profile copilot tool names
  tools suggest --goal <g>     Next 2–3 commands for a research goal
      goals: discover|evidence|compare|pack|hypothesis|export|ops
      [--limit 3] [--q "…"] [--targets TTR] [--cid 2244] [--json]

Examples:
  npm run biointel -- health
  npm run biointel -- discover rank --q "ATTR amyloidosis" --targets TTR
  npm run biointel -- molecule category 3080836 pharmaceutical
  npm run biointel -- research kit --cid 2244 --out kit.json
  npm run biointel -- tools list
  npm run biointel -- tools playbook disease_to_shortlist
  npm run biointel -- tools suggest --goal evidence --cid 2244
  npm run biointel -- tools suggest --goal discover --q "NSCLC" --targets EGFR
  npm run biointel -- logs tail --n 20
  npm run biointel -- gate

UI catalog: /how-it-works#tools
`)
}

/**
 * research kit --cid N [--out path] [--categories molecular-chemical,...]
 * Hits GET /api/molecule/:cid/research-kit and writes/prints the bundle.
 */
async function cmdResearch(sub, flags) {
  if (sub !== 'kit') {
    die('research subcommands: kit\n  research kit --cid <n> [--out file.json]')
  }
  const cid = flags.cid || flags.c
  if (!cid || cid === true) die('research kit requires --cid <pubchemCid>')
  const qs = new URLSearchParams()
  if (flags.categories && flags.categories !== true) {
    qs.set('categories', String(flags.categories))
  }
  const path =
    `/api/molecule/${encodeURIComponent(String(cid))}/research-kit` +
    (qs.toString() ? `?${qs}` : '')
  console.error(`biointel: fetching research kit for CID ${cid}…`)
  const { data } = await httpJson('GET', path)
  if (!data || data.kind !== 'biointel-research-kit-bundle') {
    die('unexpected response (expected biointel-research-kit-bundle)')
  }
  const out = flags.out || flags.o
  if (out && out !== true) {
    const outPath = path.isAbsolute(String(out))
      ? String(out)
      : path.resolve(process.cwd(), String(out))
    fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8')
    console.log(`wrote ${outPath}`)
    if (data.meta) {
      console.log(
        `facts≈${data.meta.factCount} sources≈${data.meta.sourceCount} loaded=${(data.meta.categoriesLoaded || []).join(',')}`,
      )
    }
    return
  }
  printJson(data)
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

/** Load dual-use research playbooks / tool index (JSON; mirrors TS catalog). */
function loadResearchToolsData() {
  const p = path.join(ROOT, 'src', 'lib', 'methods', 'researchPlaybooks.json')
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch (err) {
    die(`cannot read researchPlaybooks.json: ${err.message}`)
  }
}

/**
 * Session context for tools suggest: flags > env > agent logs > defaults.
 * Env: BIOINTEL_Q, BIOINTEL_TARGETS, BIOINTEL_CID, BIOINTEL_PROJECT
 */
function resolveSuggestSession(flags) {
  let q = flags.q && flags.q !== true ? String(flags.q) : process.env.BIOINTEL_Q || null
  let targets =
    flags.targets && flags.targets !== true
      ? String(flags.targets)
      : process.env.BIOINTEL_TARGETS || null
  let cid =
    flags.cid && flags.cid !== true ? String(flags.cid) : process.env.BIOINTEL_CID || null
  let projectId =
    (flags.projectId || flags.project) &&
    (flags.projectId || flags.project) !== true
      ? String(flags.projectId || flags.project)
      : process.env.BIOINTEL_PROJECT || null

  // Optional: scrape today's agent log for last discover rank query
  if ((!q || flags.fromLogs) && flags.fromLogs !== false) {
    try {
      const day = new Date().toISOString().slice(0, 10)
      const logPath = path.join(ROOT, 'logs', `agent-activity-${day}.jsonl`)
      if (fs.existsSync(logPath)) {
        const lines = fs.readFileSync(logPath, 'utf8').trim().split(/\n/).slice(-80)
        for (let i = lines.length - 1; i >= 0; i--) {
          const line = lines[i]
          if (!line.includes('discover_rank') && !line.includes('discover.rank')) continue
          try {
            const row = JSON.parse(line)
            const props = row.props || row.payload || row
            if (!q && (props.q || props.query || props.disease)) {
              q = String(props.q || props.query || props.disease)
            }
            if (!targets && props.targets) {
              targets = Array.isArray(props.targets)
                ? props.targets.join(',')
                : String(props.targets)
            }
            if (q) break
          } catch {
            /* next line */
          }
        }
      }
    } catch {
      /* ignore log parse */
    }
  }

  return {
    q: q || 'ATTR amyloidosis',
    targets: targets || 'TTR',
    cid: cid || '2244',
    projectId: projectId || '<projectId>',
    source: {
      q: flags.q ? 'flag' : process.env.BIOINTEL_Q ? 'env' : q !== 'ATTR amyloidosis' ? 'logs' : 'default',
      projectId: projectId && projectId !== '<projectId>' ? 'flag|env' : 'none',
    },
  }
}

/**
 * Interpolate {{q}} {{targets}} {{cid}} from export:research-catalog templates.
 * Catalog is generated from TS suggestResearchForGoal — do not reimplement suggest here.
 */
function suggestInterpolate(template, session) {
  return String(template)
    .replace(/\{\{q\}\}/g, session.q)
    .replace(/\{\{targets\}\}/g, session.targets)
    .replace(/\{\{cid\}\}/g, session.cid)
    .replace(/\{\{projectId\}\}/g, session.projectId)
}

/**
 * tools list | playbook | copilot | suggest
 * Surfaces research tools so agents pick the right loop without thrash.
 * suggestCommands come from TS via npm run export:research-catalog.
 */
function cmdTools(sub, positionals, flags) {
  const data = loadResearchToolsData()
  const action = sub || 'list'

  if (action === 'suggest') {
    const goalRaw = flags.goal || flags.g || positionals[0]
    if (!goalRaw || goalRaw === true) {
      die(
        'tools suggest requires --goal <discover|evidence|compare|pack|hypothesis|export|ops>\n' +
          'Example: biointel tools suggest --goal evidence --cid 2244\n' +
          'Regenerate catalog: npm run export:research-catalog',
      )
    }
    const goal = String(goalRaw).toLowerCase()
    const goalMap = data.goalMap || {}
    const mapping = goalMap[goal]
    if (!mapping) {
      die(
        `unknown goal: ${goal}\nKnown: ${Object.keys(goalMap).join(', ') || 'discover,evidence,compare,pack,hypothesis,export,ops'}`,
      )
    }
    const limit = Math.min(Math.max(parseInt(flags.limit || '3', 10) || 3, 1), 8)
    const playbooks = data.playbooks || []
    const pb = playbooks.find((p) => p.id === mapping.playbookId)
    if (!pb) die(`playbook missing for goal ${goal}: ${mapping.playbookId}`)

    const templates = (data.suggestCommands && data.suggestCommands[goal]) || []
    if (!templates.length) {
      die(
        `no suggestCommands for goal=${goal}. Run: npm run export:research-catalog`,
      )
    }
    const session = resolveSuggestSession(flags)
    const actions = templates.slice(0, limit).map((t, i) => {
      const bare = suggestInterpolate(t, session)
      const title =
        bare
          .replace(/^npm run biointel --\s*/i, '')
          .split(/\s+/)
          .slice(0, 3)
          .join(' ') || `Step ${i + 1}`
      return {
        rank: i + 1,
        title,
        cli: bare.startsWith('npm ') ? bare : `npm run biointel -- ${bare}`,
      }
    })

    // Session-aware extras for pack/board goals
    if ((goal === 'pack' || goal === 'hypothesis') && session.projectId !== '<projectId>') {
      actions.push({
        rank: actions.length + 1,
        title: 'project context',
        cli: `# projectId=${session.projectId} — open /projects/${session.projectId} or use copilot compare_board`,
      })
    }

    const payload = {
      goal,
      blurb: mapping.blurb || pb.goal,
      playbookId: pb.id,
      playbookTitle: pb.title,
      href: `/how-it-works#${pb.id}`,
      session,
      actions,
      lawReminders: pb.lawReminders || [],
    }

    if (flags.json) {
      printJson(payload)
      return
    }

    console.log(`# tools suggest — goal=${goal}`)
    console.log(`Playbook: ${pb.title} (${pb.id})`)
    console.log(`${payload.blurb}`)
    console.log(
      `Session: q=${session.q} targets=${session.targets} cid=${session.cid}` +
        (session.projectId !== '<projectId>' ? ` project=${session.projectId}` : ''),
    )
    console.log(`UI: ${payload.href}`)
    console.log('\nNext actions:')
    for (const a of payload.actions) {
      console.log(`  ${a.rank}. ${a.title}`)
      if (a.cli) console.log(`     ${a.cli}`)
    }
    if (payload.lawReminders.length) {
      console.log('\nLaw:')
      for (const s of payload.lawReminders) console.log(`  • ${s}`)
    }
    console.log('\nDetail: biointel tools playbook ' + pb.id)
    console.log(
      'Session flags: --q --targets --cid --project | env BIOINTEL_Q BIOINTEL_TARGETS BIOINTEL_CID BIOINTEL_PROJECT | --fromLogs',
    )
    console.log('Catalog: npm run export:research-catalog  # after TS catalog edits')
    return
  }

  if (action === 'copilot') {
    const names = data.copilotTools || []
    if (flags.json) {
      printJson({ copilotTools: names, maxSteps: 5 })
      return
    }
    console.log(`Allowlisted profile copilot tools (${names.length}, max 5 steps/ask):\n`)
    for (const n of names) console.log(`  • ${n}`)
    console.log('\nUI: molecule profile → AI Copilot → Ask (evidence-bound only)')
    console.log('Catalog: /how-it-works#tools')
    return
  }

  if (action === 'playbook' || action === 'playbooks') {
    const id = positionals[0] || flags.id
    const playbooks = data.playbooks || []
    if (!id || id === true) {
      if (flags.json) {
        printJson(playbooks.map((p) => ({ id: p.id, title: p.title, audience: p.audience })))
        return
      }
      console.log('Research playbooks (scientific / engineering loops):\n')
      for (const p of playbooks) {
        console.log(`  ${p.id}`)
        console.log(`    ${p.title} [${p.audience}]`)
        console.log(`    ${p.goal}`)
        console.log('')
      }
      console.log('Detail: biointel tools playbook <id>')
      console.log('UI: /how-it-works#playbooks')
      return
    }
    const pb = playbooks.find((p) => p.id === id)
    if (!pb) {
      die(
        `unknown playbook: ${id}\nKnown: ${(playbooks.map((p) => p.id) || []).join(', ')}`,
      )
    }
    if (flags.json) {
      printJson(pb)
      return
    }
    console.log(`# ${pb.title}`)
    console.log(`id: ${pb.id}`)
    console.log(`audience: ${pb.audience}`)
    console.log(`goal: ${pb.goal}`)
    console.log('\nSteps:')
    ;(pb.steps || []).forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.title}`)
      if (s.human) console.log(`     Human: ${s.human}`)
      if (s.agent) console.log(`     Agent: ${s.agent}`)
    })
    if (pb.successSignals && pb.successSignals.length) {
      console.log('\nSuccess:')
      for (const s of pb.successSignals) console.log(`  • ${s}`)
    }
    if (pb.lawReminders && pb.lawReminders.length) {
      console.log('\nLaw:')
      for (const s of pb.lawReminders) console.log(`  • ${s}`)
    }
    return
  }

  if (action === 'list' || action === 'ls') {
    if (flags.json) {
      printJson({
        version: data.version,
        cliTools: data.cliTools,
        copilotTools: data.copilotTools,
        playbooks: (data.playbooks || []).map((p) => p.id),
      })
      return
    }
    console.log(`BioIntel research tools (v${data.version || 1})`)
    console.log('Accelerate scientific work: free public APIs, deterministic rank, claim-bound AI.\n')
    console.log('CLI / agent commands:')
    for (const t of data.cliTools || []) {
      console.log(`  biointel ${t.cmd}`)
      console.log(`    [${t.goal}] ${t.summary}`)
    }
    console.log(`\nCopilot tools (${(data.copilotTools || []).length}):`)
    console.log(`  ${(data.copilotTools || []).join(', ')}`)
    console.log('\nPlaybooks:')
    for (const p of data.playbooks || []) {
      console.log(`  ${p.id} — ${p.title}`)
    }
    console.log('\n  biointel tools playbook <id>   # step detail')
    console.log('  biointel tools copilot          # allowlist only')
    console.log('  UI: /how-it-works#tools')
    return
  }

  die('tools subcommands: list | playbook [id] | copilot | suggest --goal <g>')
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
  // Server rank path densifies top-K by default; keep harvest flags true
  const densify =
    flags.densify !== false &&
    flags.densify !== 'false' &&
    flags.safety !== false &&
    flags.safety !== 'false'
  const body = {
    q: String(q),
    targets,
    limit,
    rubricPreset: flags.preset || flags.rubricPreset || 'balanced',
    aeAggressiveness: flags.ae || 'soft-flag',
    runSafetyHarvest: densify,
    runNoveltyHarvest:
      densify || flags.novelty === true || flags.novelty === 'true',
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
        if (sub !== 'rank' && sub !== 'harvest' && sub !== 'densify') {
          die('discover subcommands: rank | densify | harvest')
        }
        const { flags: f } = parseArgs(rest.slice(1))
        if (sub === 'rank' || sub === 'densify') {
          // densify is alias for rank with harvest flags (server always densifies top-K)
          await cmdDiscoverRank({ ...f, densify: true, safety: true })
        } else await cmdDiscoverHarvest(f)
        break
      }
      case 'molecule': {
        const sub = rest[0]
        if (!sub) die('molecule subcommands: get | category | pipeline | similar | vendors')
        const after = parseArgs(rest.slice(1))
        await cmdMolecule(sub, after.positionals, after.flags)
        break
      }
      case 'research': {
        const sub = rest[0]
        if (!sub) die('research subcommands: kit')
        const after = parseArgs(rest.slice(1))
        await cmdResearch(sub, after.flags)
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
      case 'tools': {
        const sub = rest[0] && !rest[0].startsWith('-') ? rest[0] : 'list'
        const after = parseArgs(rest[0] === sub ? rest.slice(1) : rest)
        cmdTools(sub, after.positionals, after.flags)
        break
      }
      default:
        die(`unknown command: ${cmd}\nRun: biointel help`)
    }
  } catch (err) {
    die(err instanceof Error ? err.message : String(err))
  }
}

main()
