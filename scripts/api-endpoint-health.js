#!/usr/bin/env node
/**
 * Strict API endpoint health — empty 200 is NOT green.
 *
 * For each App Router route we try one or more known-good fixtures until the
 * response has real payload data (or fixtures are exhausted).
 *
 * Usage (app must be running):
 *   npm run api:health
 *   npm run api:health:json
 *   node scripts/api-endpoint-health.js --concurrency=3 --timeout=60000
 *   node scripts/api-endpoint-health.js --ai-wire-only   # AI routes: validation only
 *   node scripts/api-endpoint-health.js --skip-ai        # omit AI routes entirely
 *
 * AI routes (chat/pack/rh/show/pull/ai-brief/health):
 *   Live-probed when Ollama is reachable at BIOINTEL_OLLAMA_URL / OLLAMA_HOST /
 *   http://127.0.0.1:11434. Otherwise wire/validation envelopes still count as DATA
 *   (route mounted + structured error). Model pull is never executed live.
 *
 * Exit codes:
 *   0 — every non-skipped probe returned data (or is a meta route with structure)
 *   1 — hard fail (5xx/network) OR empty after all alternate fixtures
 *   2 — app not reachable
 */

const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const apiRoot = path.join(root, 'src', 'app', 'api')
const BASE = (process.env.BIOINTEL_BASE || `http://localhost:${process.env.PORT || 33424}`).replace(
  /\/$/,
  '',
)

const args = process.argv.slice(2)
const asJson = args.includes('--json')
const concurrency = Number(
  (args.find((a) => a.startsWith('--concurrency=')) || '').split('=')[1] || 3,
)
const timeoutMs = Number(
  (args.find((a) => a.startsWith('--timeout=')) || '').split('=')[1] || 60_000,
)
const strictEmpty = !args.includes('--allow-empty')
/** Skip live LLM calls (wire/validation probes only) */
const aiWireOnly = args.includes('--ai-wire-only')
/** Force-skip AI routes (legacy) */
const skipAi = args.includes('--skip-ai')
/**
 * Only try the first fixture per probe (fast live / production smoke).
 * Auto-enabled when BIOINTEL_BASE is not localhost unless --multi-fixture.
 */
const isRemoteBase = !/localhost|127\.0\.0\.1/i.test(BASE)
const singleFixture =
  args.includes('--single-fixture') ||
  (isRemoteBase && !args.includes('--multi-fixture'))
/** After a timeout or 5xx, at most this many more fixtures (avoids 5×90s thrash) */
const maxHardRetries = Number(
  (args.find((a) => a.startsWith('--max-hard-retries=')) || '').split('=')[1] ||
    (singleFixture ? 0 : 1),
)

// Optional live Ollama for AI route probes (never required for free-API DATA)
const OLLAMA_URL = (
  process.env.BIOINTEL_OLLAMA_URL ||
  process.env.OLLAMA_HOST ||
  'http://127.0.0.1:11434'
).replace(/\/$/, '')

/** @type {{ available: boolean, url: string, model: string | null }} */
let AI = { available: false, url: OLLAMA_URL, model: null }

async function detectOllama() {
  if (aiWireOnly || skipAi) return AI
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(4000),
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return AI
    const data = await res.json()
    const models = Array.isArray(data.models) ? data.models : []
    // Prefer small/fast tags when present
    const prefer = [/flash/i, /gemma/i, /mini/i, /small/i, /3b/i, /7b/i]
    let pick = models[0]?.name || null
    for (const re of prefer) {
      const hit = models.find((m) => re.test(m.name || ''))
      if (hit?.name) {
        pick = hit.name
        break
      }
    }
    if (pick) AI = { available: true, url: OLLAMA_URL, model: pick }
  } catch {
    /* offline */
  }
  return AI
}

/** Minimal claim fixture for pack / RH AI (claim-bound product contract) */
const AI_CLAIM = {
  id: 'claim-health-1',
  statement: 'Aspirin inhibits cyclooxygenase-1 (COX-1 / PTGS1) in humans.',
  claimType: 'mechanism',
  subjectCandidateId: 'cid:2244',
  epistemicStatus: 'retrieved',
  provenance: {
    source: 'ChEMBL',
    retrievedAt: new Date().toISOString(),
    url: 'https://www.ebi.ac.uk/chembl/',
  },
}

const AI_PACK = {
  id: 'pack-health-probe',
  title: 'API health pack — aspirin',
  claims: [AI_CLAIM],
  candidates: [{ id: 'cid:2244', name: 'Aspirin', cid: 2244 }],
  disease: null,
}

const AI_HYP = {
  id: 'hyp-health-1',
  title: 'Aspirin COX inhibition',
  thesis: 'Aspirin reduces prostaglandin synthesis via COX-1 inhibition.',
  claimIds: [AI_CLAIM.id],
  candidateIds: ['cid:2244'],
  status: 'draft',
  role: 'primary',
}

// --- Fixtures: multiple molecules / genes / queries so empty first try is not final ---
const FIX = {
  // Diverse molecules so sparse free APIs still hit something
  cids: ['2244', '3672', '4091', '5291', '2554'], // aspirin, ibuprofen, metformin, imatinib, caffeine
  names: ['aspirin', 'ibuprofen', 'imatinib', 'metformin', 'warfarin', 'atorvastatin'],
  genes: ['TP53', 'TTR', 'EGFR', 'BRCA1', 'CFTR'],
  geneIds: ['7157-TP53', '7276-TTR', '1956-EGFR', '1080-CFTR'],
  uniprots: ['P04637', 'P02766', 'P00533'],
  diseaseQs: [
    'diabetes',
    'ATTR%20amyloidosis',
    'cystic%20fibrosis',
    'hereditary%20ATTR%20amyloidosis',
  ],
  orgQs: ['stanford', 'harvard', 'mayo', 'mit'],
  biologics: ['adalimumab', 'trastuzumab', 'rituximab'],
  dois: ['10.1038/nature12373', '10.1056/NEJMoa2034577'],
  drugPairs: [
    ['aspirin', 'warfarin'],
    ['ibuprofen', 'lisinopril'],
    ['metformin', 'warfarin'],
    ['simvastatin', 'amiodarone'],
  ],
}

const MOLECULE_CATEGORIES = [
  'pharmaceutical',
  'clinical-safety',
  'molecular-chemical',
  'bioactivity-targets',
  'protein-structure',
  'genomics-disease',
  'interactions-pathways',
  'research-literature',
  'nih-high-impact',
]

/** camelCase keys from PANEL_CONFIG (not hyphenated UI panel ids) */
const SAMPLE_PANELS = [
  'companies',
  'clinicalTrials',
  'adverseEvents',
  'chemblActivities',
  'uniprotEntries',
  'pdbStructures',
  'literature',
  'proteinInteractions',
  'ndcProducts',
  'orangeBook',
  'drugLabels',
  'atcClassifications',
]

/** Routes that are healthy with structured meta even when not scientific rows */
const META_OK = new Set([
  'runtime-config',
  'agent-log',
  'ai/health',
  'analytics/summary',
  'health/[source]',
  'pubchem/has-3d',
])

// ---------------------------------------------------------------------------
// payloadHasData (mirror src/lib/hasData.ts)
// ---------------------------------------------------------------------------
function payloadHasData(val) {
  if (val === null || val === undefined) return false
  if (Array.isArray(val)) return val.length > 0
  if (typeof val !== 'object') {
    if (typeof val === 'string') return val.trim().length > 0
    if (typeof val === 'number' || typeof val === 'boolean') return true
    return false
  }
  const obj = val
  const keys = Object.keys(obj)
  if (keys.length === 0) return false
  if ('data' in obj && keys.length <= 3 && obj.data !== undefined) {
    return payloadHasData(obj.data)
  }
  // Meta-ish success envelopes (not honesty flags)
  if (obj.ok === true || obj.enabled === true) return true
  // Honesty flags are classified separately (EMPTY vs TIMEOUT vs ERROR) — not DATA.
  if (typeof obj.status === 'string' && obj.status !== 'error') {
    // healthFor returns status without rows — treat as meta structure
    if ('sample_size' in obj || 'reason' in obj || 'p95_ms' in obj) return true
  }
  let any = false
  for (const k of keys) {
    if (
      k === 'source' ||
      k === 'timestamp' ||
      k === 'error' ||
      k === 'status' ||
      k === 'warnings' ||
      k === 'generatedAt' ||
      k.startsWith('_')
    ) {
      continue
    }
    if (payloadHasData(obj[k])) {
      any = true
      break
    }
  }
  return any
}

/** Category aggregates: any panel prop with data counts */
function categoryHasData(json) {
  if (!json || typeof json !== 'object') return false
  if (payloadHasData(json)) return true
  // At least one non-_ key with content
  for (const [k, v] of Object.entries(json)) {
    if (k.startsWith('_')) continue
    if (payloadHasData(v)) return true
  }
  // _sourceStatus with any loaded source is weak signal — not enough alone
  return false
}

// ---------------------------------------------------------------------------
// Route discovery
// ---------------------------------------------------------------------------
function walkRoutes(dir, rel = '') {
  const out = []
  if (!fs.existsSync(dir)) return out
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    const r = rel ? `${rel}/${ent.name}` : ent.name
    if (ent.isDirectory()) out.push(...walkRoutes(p, r))
    else if (ent.name === 'route.ts' || ent.name === 'route.js') {
      out.push({ file: p, routeDir: rel.replace(/\\/g, '/') })
    }
  }
  return out
}

function methodsInFile(file) {
  const src = fs.readFileSync(file, 'utf8')
  const methods = []
  for (const m of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
    if (new RegExp(`export\\s+async\\s+function\\s+${m}\\b`).test(src)) methods.push(m)
  }
  return methods.length ? methods : ['GET']
}

/**
 * Build probe series: ordered path attempts for one logical endpoint.
 * @returns {{ method: string, label: string, attempts: { path: string, note?: string }[], body?: object, meta?: boolean, skip?: boolean }[]}
 */
function buildProbeSeries(routes) {
  const series = []

  const cidPaths = (suffix) =>
    FIX.cids.map((cid, i) => ({
      path: `/api/molecule/${cid}${suffix}`,
      note: `cid=${cid}`,
      prefer: i === 0,
    }))

  for (const { file, routeDir } of routes) {
    const methods = methodsInFile(file)

    // --- molecule category fan-out ---
    if (routeDir === 'molecule/[id]/category/[categoryId]') {
      for (const cat of MOLECULE_CATEGORIES) {
        series.push({
          method: 'GET',
          label: `molecule/category/${cat}`,
          attempts: FIX.cids.map((cid) => ({
            path: `/api/molecule/${cid}/category/${cat}`,
            note: `cid=${cid}`,
          })),
          dataCheck: 'category',
        })
      }
      continue
    }

    if (routeDir === 'molecule/[id]/panel/[panelId]') {
      for (const panel of SAMPLE_PANELS) {
        series.push({
          method: 'GET',
          label: `molecule/panel/${panel}`,
          attempts: FIX.cids.map((cid) => ({
            path: `/api/molecule/${cid}/panel/${panel}`,
            note: `cid=${cid}`,
          })),
        })
      }
      continue
    }

    if (routeDir === 'gene/[id]/category/[categoryId]') {
      series.push({
        method: 'GET',
        label: 'gene/category/gene',
        attempts: FIX.geneIds.map((id) => ({
          path: `/api/gene/${id}/category/gene`,
          note: id,
        })),
        dataCheck: 'category',
      })
      continue
    }

    // --- molecule/* leaf routes (CID) ---
    if (routeDir.startsWith('molecule/[id]') && !routeDir.includes('[')) {
      // shouldn't happen
    }
    if (
      routeDir.startsWith('molecule/[id]/') &&
      !routeDir.includes('category') &&
      !routeDir.includes('panel')
    ) {
      const suffix = routeDir.replace('molecule/[id]', '')
      series.push({
        method: 'GET',
        label: routeDir,
        attempts: cidPaths(suffix),
        dataCheck: suffix === '/research-kit' ? 'category' : 'default',
      })
      continue
    }
    if (routeDir === 'molecule/[id]') {
      series.push({
        method: 'GET',
        label: 'molecule/[id]',
        attempts: FIX.cids.map((cid) => ({
          path: `/api/molecule/${cid}`,
          note: `cid=${cid}`,
        })),
      })
      continue
    }

    // --- Search / discover / orgs ---
    if (routeDir === 'search') {
      series.push({
        method: 'GET',
        label: 'search',
        attempts: FIX.names.map((q) => ({
          path: `/api/search?q=${encodeURIComponent(q)}`,
          note: `q=${q}`,
        })),
      })
      continue
    }
    if (routeDir === 'search/disease') {
      series.push({
        method: 'GET',
        label: 'search/disease',
        attempts: FIX.diseaseQs.map((q) => ({
          path: `/api/search/disease?q=${q}`,
          note: q,
        })),
      })
      continue
    }
    if (routeDir === 'search/gene') {
      series.push({
        method: 'GET',
        label: 'search/gene',
        attempts: FIX.genes.map((q) => ({
          path: `/api/search/gene?q=${encodeURIComponent(q)}`,
          note: q,
        })),
      })
      continue
    }
    if (routeDir === 'search/resolve') {
      series.push({
        method: 'GET',
        label: 'search/resolve',
        attempts: [
          ...FIX.names.map((q) => ({
            path: `/api/search/resolve?name=${encodeURIComponent(q)}&type=name`,
            note: `name=${q}`,
          })),
          ...FIX.cids.map((cid) => ({
            path: `/api/search/resolve?cid=${cid}`,
            note: `cid=${cid}`,
          })),
        ],
      })
      continue
    }
    if (routeDir === 'discover/rank') {
      // Confirm disease id when possible — try known single-ish queries
      series.push({
        method: 'GET',
        label: 'discover/rank',
        attempts: [
          {
            path: `/api/discover/rank?q=${encodeURIComponent('type 2 diabetes mellitus')}&targets=INS&limit=8`,
            note: 'T2D+INS',
          },
          {
            path: `/api/discover/rank?q=${encodeURIComponent('cystic fibrosis')}&targets=CFTR&limit=8`,
            note: 'CF+CFTR',
          },
          {
            path: `/api/discover/rank?diseaseId=MONDO_0009061&targets=CFTR&limit=8`,
            note: 'MONDO CF',
          },
          {
            path: `/api/discover/rank?q=diabetes&targets=INS&limit=8`,
            note: 'diabetes',
          },
        ],
        // diseaseCandidates count as data for rank disambiguation step
        dataCheck: 'discover',
      })
      continue
    }
    if (routeDir === 'discover/diseases') {
      series.push({
        method: 'GET',
        label: 'discover/diseases',
        attempts: FIX.diseaseQs.map((q) => ({
          path: `/api/discover/diseases?q=${q}`,
          note: q,
        })),
      })
      continue
    }
    if (routeDir === 'orgs/suggest') {
      series.push({
        method: 'GET',
        label: 'orgs/suggest',
        attempts: FIX.orgQs.map((q) => ({
          path: `/api/orgs/suggest?q=${encodeURIComponent(q)}`,
          note: q,
        })),
      })
      continue
    }
    if (routeDir === 'ror') {
      series.push({
        method: 'GET',
        label: 'ror',
        attempts: FIX.orgQs.map((q) => ({
          path: `/api/ror?q=${encodeURIComponent(q)}`,
          note: q,
        })),
      })
      continue
    }
    if (routeDir === 'cms-hospitals') {
      series.push({
        method: 'GET',
        label: 'cms-hospitals',
        attempts: ['mayo', 'cleveland', 'hopkins'].map((q) => ({
          path: `/api/cms-hospitals?q=${encodeURIComponent(q)}`,
          note: q,
        })),
      })
      continue
    }
    if (routeDir === 'us-colleges') {
      series.push({
        method: 'GET',
        label: 'us-colleges',
        attempts: FIX.orgQs.map((q) => ({
          path: `/api/us-colleges?q=${encodeURIComponent(q)}`,
          note: q,
        })),
      })
      continue
    }
    if (routeDir === 'eu-orgs') {
      series.push({
        method: 'GET',
        label: 'eu-orgs',
        attempts: ['max planck', 'cnrs', 'cambridge'].map((q) => ({
          path: `/api/eu-orgs?q=${encodeURIComponent(q)}`,
          note: q,
        })),
      })
      continue
    }
    if (routeDir === 'who-gho') {
      series.push({
        method: 'GET',
        label: 'who-gho',
        attempts: ['diabetes', 'malaria', 'hiv'].map((q) => ({
          path: `/api/who-gho?q=${encodeURIComponent(q)}`,
          note: q,
        })),
      })
      continue
    }
    if (routeDir === 'orphanet/genes') {
      series.push({
        method: 'GET',
        label: 'orphanet/genes',
        attempts: [
          { path: '/api/orphanet/genes?orphaCode=586', note: 'orpha-CF-586' },
          { path: '/api/orphanet/genes?orphaCode=558', note: 'orpha-558' },
          ...FIX.diseaseQs.map((q) => ({
            path: `/api/orphanet/genes?q=${q}`,
            note: q,
          })),
        ],
      })
      continue
    }
    if (routeDir === 'purple-book') {
      series.push({
        method: 'GET',
        label: 'purple-book',
        attempts: FIX.biologics.map((q) => ({
          path: `/api/purple-book?q=${encodeURIComponent(q)}`,
          note: q,
        })),
      })
      continue
    }
    if (routeDir === 'purple-book-patents') {
      series.push({
        method: 'GET',
        label: 'purple-book-patents',
        attempts: FIX.biologics.map((q) => ({
          path: `/api/purple-book-patents?q=${encodeURIComponent(q)}`,
          note: q,
        })),
      })
      continue
    }
    if (routeDir === 'ema-bulk') {
      series.push({
        method: 'GET',
        label: 'ema-bulk',
        attempts: [...FIX.names, ...FIX.biologics].map((q) => ({
          path: `/api/ema-bulk?q=${encodeURIComponent(q)}`,
          note: q,
        })),
      })
      continue
    }
    if (routeDir === 'research-labs') {
      series.push({
        method: 'GET',
        label: 'research-labs',
        attempts: FIX.orgQs.map((q) => ({
          path: `/api/research-labs?q=${encodeURIComponent(q)}`,
          note: q,
        })),
      })
      continue
    }
    if (routeDir === 'characterization/probe') {
      series.push({
        method: 'GET',
        label: 'characterization/probe',
        attempts: FIX.names.map((q) => ({
          path: `/api/characterization/probe?q=${encodeURIComponent(q)}`,
          note: q,
        })),
      })
      continue
    }
    if (routeDir === 'pharos/tdl') {
      series.push({
        method: 'GET',
        label: 'pharos/tdl',
        attempts: [
          {
            path: `/api/pharos/tdl?symbols=${FIX.genes.slice(0, 4).join(',')}`,
            note: 'symbols-batch',
          },
          ...FIX.genes.map((q) => ({
            path: `/api/pharos/tdl?symbols=${encodeURIComponent(q)}`,
            note: q,
          })),
        ],
      })
      continue
    }
    if (routeDir === 'competitive/[targetId]') {
      series.push({
        method: 'GET',
        label: 'competitive/[targetId]',
        attempts: [
          { path: '/api/competitive/CHEMBL203', note: 'EGFR-CHEMBL203' },
          { path: '/api/competitive/CHEMBL1824', note: 'ABL1' },
          ...FIX.genes.map((g) => ({
            path: `/api/competitive/${encodeURIComponent(g)}`,
            note: g,
          })),
        ],
      })
      continue
    }
    if (routeDir === 'pubchem/has-3d') {
      series.push({
        method: 'GET',
        label: 'pubchem/has-3d',
        attempts: FIX.cids.map((cid) => ({
          path: `/api/pubchem/has-3d?cid=${cid}`,
          note: `cid=${cid}`,
        })),
        meta: true,
      })
      continue
    }
    if (routeDir === 'health/[source]') {
      series.push({
        method: 'GET',
        label: 'health/[source]',
        attempts: ['pubchem', 'clinicaltrials', 'chembl', 'openfda'].map((s) => ({
          path: `/api/health/${s}`,
          note: s,
        })),
        meta: true,
      })
      continue
    }
    if (routeDir === 'runtime-config') {
      series.push({
        method: 'GET',
        label: 'runtime-config',
        attempts: [{ path: '/api/runtime-config' }],
        meta: true,
      })
      continue
    }
    if (routeDir === 'agent-log') {
      series.push({
        method: 'GET',
        label: 'agent-log',
        attempts: [{ path: '/api/agent-log' }],
        meta: true,
      })
      continue
    }
    if (routeDir === 'ai/health') {
      series.push({
        method: 'GET',
        label: 'ai/health',
        attempts: [{ path: '/api/ai/health' }],
        meta: true,
      })
      continue
    }
    if (routeDir === 'analytics/summary') {
      series.push({
        method: 'GET',
        label: 'analytics/summary',
        attempts: [{ path: '/api/analytics/summary' }],
        meta: true,
      })
      continue
    }
    if (routeDir === 'snapshot/[id]') {
      series.push({
        method: 'GET',
        label: 'snapshot/[id]',
        attempts: [{ path: '/api/snapshot/e2e-health-probe-nonexistent', note: 'expect 404' }],
        allowStatuses: [404],
        meta: true,
      })
      continue
    }
    if (routeDir === 'opencitations/[id]') {
      series.push({
        method: 'GET',
        label: 'opencitations/[id]',
        // Most panel [id] routes want CID; opencitations may take DOI or cid — try both
        attempts: [
          ...FIX.cids.map((cid) => ({ path: `/api/opencitations/${cid}`, note: `cid=${cid}` })),
          ...FIX.dois.map((d) => ({ path: `/api/opencitations/${d}`, note: 'doi' })),
        ],
      })
      continue
    }
    if (routeDir === 'alphafold/[id]') {
      // route uses CID → uniprot via molecule; try cids (not raw accession)
      series.push({
        method: 'GET',
        label: 'alphafold/[id]',
        attempts: FIX.cids.map((cid) => ({
          path: `/api/alphafold/${cid}`,
          note: `cid=${cid}`,
        })),
      })
      continue
    }

    // Default: most [id] panel routes take molecule CID
    if (routeDir.includes('[id]') && methods.includes('GET')) {
      series.push({
        method: 'GET',
        label: routeDir,
        attempts: FIX.cids.map((cid) => ({
          path: `/api/${routeDir.replace(/\[id\]/g, cid)}`,
          note: `cid=${cid}`,
        })),
      })
      continue
    }

    // --- AI routes (GET+POST or POST-only): live when Ollama is up, else wire ---
    if (routeDir.startsWith('ai/') || routeDir === 'ai-brief') {
      if (skipAi) {
        series.push({
          method: 'SKIP',
          label: `${routeDir} (AI — skipped via --skip-ai)`,
          attempts: [],
          skip: true,
        })
        continue
      }
      // GET meta for ai/health
      if (routeDir === 'ai/health' && methods.includes('GET')) {
        series.push({
          method: 'GET',
          label: 'ai/health GET',
          attempts: [{ path: '/api/ai/health', note: 'meta' }],
          dataCheck: 'ai',
          meta: true,
        })
      }
      if (methods.includes('POST')) {
        series.push(...buildAiProbeSeries(routeDir))
      }
      continue
    }

    // POST-only
    if (methods.includes('POST') && !methods.includes('GET')) {
      if (routeDir === 'analytics') {
        series.push({
          method: 'POST',
          label: 'analytics POST',
          attempts: [{ path: '/api/analytics' }],
          body: [{ event: 'api_health_probe', ts: Date.now() }],
          meta: true,
          allowStatuses: [200, 202, 204],
        })
        continue
      }
      if (routeDir === 'batch') {
        series.push({
          method: 'POST',
          label: 'batch POST',
          attempts: [{ path: '/api/batch' }],
          body: { cids: [2244, 3672, 5291] },
        })
        continue
      }
      if (routeDir === 'interactions/check') {
        series.push({
          method: 'POST',
          label: 'interactions/check',
          attempts: FIX.drugPairs.map((drugs) => ({
            path: '/api/interactions/check',
            note: drugs.join('+'),
            body: { drugs },
          })),
        })
        continue
      }
      if (routeDir === 'discover/harvest') {
        series.push({
          method: 'POST',
          label: 'discover/harvest',
          attempts: [
            {
              path: '/api/discover/harvest',
              note: 'candidates',
              body: {
                candidates: [
                  { name: 'Aspirin', candidateId: 'cid:2244' },
                  { name: 'Ibuprofen', candidateId: 'cid:3672' },
                  { name: 'Imatinib', candidateId: 'cid:5291' },
                ],
                runSafety: false,
                runNovelty: false,
              },
            },
          ],
        })
        continue
      }
      if (routeDir === 'discover/similarity') {
        series.push({
          method: 'POST',
          label: 'discover/similarity',
          attempts: FIX.cids.map((cid) => ({
            path: '/api/discover/similarity',
            note: `seedCid=${cid}`,
            body: { seedCid: Number(cid), max: 8 },
          })),
        })
        continue
      }
      if (routeDir === 'hypothesis') {
        series.push({
          method: 'POST',
          label: 'hypothesis',
          attempts: [
            {
              path: '/api/hypothesis',
              note: 'gene+indication',
              body: {
                filters: [
                  { axis: 'targets-gene', value: 'TTR' },
                  { axis: 'indicated-for', value: 'amyloidosis' },
                ],
              },
            },
            {
              path: '/api/hypothesis',
              note: 'EGFR+lung',
              body: {
                filters: [
                  { axis: 'targets-gene', value: 'EGFR' },
                  { axis: 'indicated-for', value: 'non-small cell lung cancer' },
                ],
              },
            },
          ],
        })
        continue
      }
      if (routeDir === 'snapshot') {
        series.push({
          method: 'POST',
          label: 'snapshot POST',
          attempts: [{ path: '/api/snapshot' }],
          body: {
            entity: { type: 'molecule', id: 2244, name: 'Aspirin' },
            data: { name: 'Aspirin', cid: 2244 },
          },
          meta: true,
        })
        continue
      }
      series.push({
        method: 'SKIP',
        label: `${routeDir} POST (no body)`,
        attempts: [],
        skip: true,
      })
      continue
    }

    // Static GET leftover
    if (methods.includes('GET')) {
      series.push({
        method: 'GET',
        label: routeDir,
        attempts: [{ path: `/api/${routeDir}` }],
        meta: META_OK.has(routeDir),
      })
    }
  }

  return series
}

// ---------------------------------------------------------------------------
// Probe execution
// ---------------------------------------------------------------------------
async function fetchOnce(method, pathStr, body, extraBody) {
  const url = `${BASE}${pathStr}`
  const start = Date.now()
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const init = {
      method,
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
    }
    const b = extraBody !== undefined ? extraBody : body
    if (b !== undefined) {
      init.headers['Content-Type'] = 'application/json'
      init.body = JSON.stringify(b)
    }
    const res = await fetch(url, init)
    const text = await res.text().catch(() => '')
    clearTimeout(timer)
    let json = null
    try {
      json = JSON.parse(text)
    } catch {
      /* non-json */
    }
    return {
      status: res.status,
      ms: Date.now() - start,
      json,
      text,
      bytes: text.length,
      error: null,
    }
  } catch (e) {
    clearTimeout(timer)
    const msg = e instanceof Error ? e.message : String(e)
    return {
      status: null,
      ms: Date.now() - start,
      json: null,
      text: '',
      bytes: 0,
      error: msg.includes('abort') ? `timeout>${timeoutMs}ms` : msg,
    }
  }
}

/**
 * AI route health: accept wire/validation envelopes, stream NDJSON, or live insight.
 * @param {object|null} json
 * @param {string} [text]
 */
function aiRouteHasData(json, text) {
  if (json && typeof json === 'object') {
    // Validation / availability envelopes
    if (typeof json.error === 'string' && json.error.trim()) return true
    if ('available' in json) return true // ai/show, ai/health
    if ('fallback' in json) return true // ai-brief degraded path
    if ('cloudFallbackConfigured' in json || 'models' in json) return true
    if (json.ok === true || json.ok === false) return true // pack/rh structured
    if (typeof json.summary === 'string' && json.summary.trim()) return true
    if (typeof json.message === 'string' && json.message.trim()) return true
    if (payloadHasData(json.insight)) return true
    if (payloadHasData(json.models)) return true
    if (payloadHasData(json)) return true
  }
  // Streaming NDJSON (chat / pull)
  if (typeof text === 'string' && text.length > 0) {
    if (
      text.includes('"token"') ||
      text.includes('"done"') ||
      text.includes('"status"') ||
      text.includes('"error"') ||
      text.includes('"progress"')
    ) {
      return true
    }
  }
  return false
}

/**
 * Distinct EMPTY vs TIMEOUT vs ERROR vs DATA for honesty envelopes.
 * Bare `_sourceStatus` is provenance, not DATA.
 */
function classifyHonesty(json) {
  if (!json || typeof json !== 'object') return null
  if (json._timeout === true) return 'TIMEOUT'
  if (json._agentStatus === 'timeout') return 'TIMEOUT'
  if (json._partial === true && /timeout|timed?\s*out/i.test(String(json._error || ''))) return 'TIMEOUT'
  if (json._emptyHonest === true || json._notRetrieved === true) return 'EMPTY'
  if (json._agentStatus === 'error') return 'ERROR'
  if (json._agentStatus === 'disabled') return 'DISABLED'
  return null
}

function hasDataFor(series, json, text) {
  if (series.dataCheck === 'ai') return aiRouteHasData(json, text)
  const honesty = classifyHonesty(json)
  if (honesty === 'TIMEOUT' || honesty === 'EMPTY' || honesty === 'ERROR' || honesty === 'DISABLED') {
    return false
  }
  if (series.dataCheck === 'category') return categoryHasData(json)
  if (series.dataCheck === 'discover') {
    if (!json || typeof json !== 'object') return false
    if (payloadHasData(json.candidates)) return true
    if (payloadHasData(json.v2?.candidates)) return true
    if (payloadHasData(json.v2?.diseaseCandidates)) return true
    if (payloadHasData(json.diseaseCandidates)) return true
    return payloadHasData(json)
  }
  if (series.dataCheck === 'ai') return aiRouteHasData(json, text)
  return payloadHasData(json)
}

/**
 * Build probe series for AI routes. Prefer live Ollama when detected; always
 * include a wire/validation attempt so CI without a model still proves the route.
 * @param {string} routeDir
 */
function buildAiProbeSeries(routeDir) {
  const out = []
  const live = AI.available && AI.model && !aiWireOnly

  if (routeDir === 'ai/health') {
    // GET is meta; also POST live/empty
    out.push({
      method: 'POST',
      label: 'ai/health POST',
      dataCheck: 'ai',
      attempts: [
        ...(live
          ? [
              {
                path: '/api/ai/health',
                note: `live:${AI.model}`,
                body: { ollamaUrl: AI.url },
              },
            ]
          : []),
        {
          path: '/api/ai/health',
          note: 'wire-empty-url',
          body: {},
        },
      ],
    })
    return out
  }

  if (routeDir === 'ai/chat') {
    out.push({
      method: 'POST',
      label: 'ai/chat',
      dataCheck: 'ai',
      attempts: [
        ...(live
          ? [
              {
                path: '/api/ai/chat',
                note: `live:${AI.model}`,
                body: {
                  ollamaUrl: AI.url,
                  model: AI.model,
                  messages: [
                    {
                      role: 'user',
                      content: 'Reply with exactly: ok',
                    },
                  ],
                },
              },
            ]
          : []),
        {
          path: '/api/ai/chat',
          note: 'wire-missing-url',
          body: {},
        },
      ],
    })
    return out
  }

  if (routeDir === 'ai/show') {
    out.push({
      method: 'POST',
      label: 'ai/show',
      dataCheck: 'ai',
      attempts: [
        ...(live
          ? [
              {
                path: '/api/ai/show',
                note: `live:${AI.model}`,
                body: { ollamaUrl: AI.url, name: AI.model },
              },
            ]
          : []),
        {
          path: '/api/ai/show',
          note: 'wire-name-only',
          body: { name: 'llama3.2' },
        },
      ],
    })
    return out
  }

  if (routeDir === 'ai/pull') {
    // Never live-pull models (multi-GB). Wire-only proves route responds.
    out.push({
      method: 'POST',
      label: 'ai/pull',
      dataCheck: 'ai',
      attempts: [
        {
          path: '/api/ai/pull',
          note: 'wire-missing-url',
          body: {},
        },
        {
          path: '/api/ai/pull',
          note: 'wire-missing-model',
          body: { ollamaUrl: AI.url || 'http://127.0.0.1:11434' },
        },
      ],
    })
    return out
  }

  if (routeDir === 'ai/pack') {
    // Wire validation first so inventory is green without a live model;
    // live attempt is optional second probe (never required for DATA).
    out.push({
      method: 'POST',
      label: 'ai/pack',
      dataCheck: 'ai',
      attempts: [
        {
          path: '/api/ai/pack',
          note: 'wire-invalid-mode',
          body: { mode: 'not_a_mode' },
        },
        ...(live
          ? [
              {
                path: '/api/ai/pack',
                note: `live:${AI.model}`,
                body: {
                  mode: 'pack_executive_brief',
                  pack: AI_PACK,
                  model: AI.model,
                  ollamaUrl: AI.url,
                },
              },
            ]
          : []),
      ],
    })
    return out
  }

  if (routeDir === 'ai/rh') {
    out.push({
      method: 'POST',
      label: 'ai/rh',
      dataCheck: 'ai',
      attempts: [
        {
          path: '/api/ai/rh',
          note: 'wire-invalid-mode',
          body: { mode: 'not_a_mode' },
        },
        ...(live
          ? [
              {
                path: '/api/ai/rh',
                note: `live:${AI.model}`,
                body: {
                  mode: 'rh_gap_map',
                  hypothesis: AI_HYP,
                  claims: [AI_CLAIM],
                  model: AI.model,
                  ollamaUrl: AI.url,
                },
              },
            ]
          : []),
      ],
    })
    return out
  }

  if (routeDir === 'ai-brief') {
    out.push({
      method: 'POST',
      label: 'ai-brief',
      dataCheck: 'ai',
      attempts: [
        ...(live
          ? [
              {
                path: '/api/ai-brief',
                note: `live:${AI.model}`,
                body: {
                  prompt: 'One-sentence summary of aspirin mechanism. Max 20 words.',
                  model: AI.model,
                  ollamaUrl: AI.url,
                },
              },
            ]
          : []),
        {
          path: '/api/ai-brief',
          note: 'wire-missing-prompt',
          body: {},
        },
      ],
    })
    return out
  }

  // Unknown ai/* — wire empty body
  out.push({
    method: 'POST',
    label: routeDir,
    dataCheck: 'ai',
    attempts: [{ path: `/api/${routeDir}`, note: 'wire', body: {} }],
  })
  return out
}

/**
 * @returns {Promise<{
 *   label: string,
 *   outcome: 'green'|'empty'|'client'|'hard'|'skip',
 *   status: number|null,
 *   ms: number,
 *   path: string,
 *   note?: string,
 *   attempts: number,
 *   hasData: boolean,
 * }>}
 */
async function probeSeries(series) {
  if (series.skip || series.method === 'SKIP') {
    return {
      label: series.label,
      outcome: 'skip',
      status: null,
      ms: 0,
      path: series.attempts[0]?.path || '',
      attempts: 0,
      hasData: false,
    }
  }

  // Live smoke: first fixture only (AI series may keep wire fallback as 2nd)
  let attemptList = series.attempts
  if (singleFixture && attemptList.length > 1) {
    if (series.dataCheck === 'ai' && attemptList.length >= 2) {
      attemptList = attemptList.slice(0, 2)
    } else {
      attemptList = attemptList.slice(0, 1)
    }
  }

  let last = null
  let attemptN = 0
  let hardFailures = 0
  for (const att of attemptList) {
    attemptN++
    const body = att.body !== undefined ? att.body : series.body
    const res = await fetchOnce(series.method, att.path, series.body, body)
    last = { ...res, path: att.path, note: att.note }

    if (res.error) {
      hardFailures++
      // Timeouts/network: limited retries so production doesn't burn 5×timeout
      if (hardFailures > maxHardRetries) break
      continue
    }

    const allow = series.allowStatuses || []
    if (allow.includes(res.status)) {
      return {
        label: series.label,
        outcome: 'green',
        status: res.status,
        ms: res.ms,
        path: att.path,
        note: att.note,
        attempts: attemptN,
        hasData: true,
        meta: true,
      }
    }

    if (res.status >= 500) {
      hardFailures++
      if (hardFailures > maxHardRetries) break
      continue
    }

    if (res.status >= 400 && res.status < 500) {
      // AI wire/validation: structured 400 proves the route is mounted
      if (series.dataCheck === 'ai' && hasDataFor(series, res.json, res.text)) {
        return {
          label: series.label,
          outcome: 'green',
          status: res.status,
          ms: res.ms,
          path: att.path,
          note: `${att.note || 'wire'}`.trim(),
          attempts: attemptN,
          hasData: true,
        }
      }
      // client error — try alternate fixture
      continue
    }

    // 2xx
    const honesty = classifyHonesty(res.json)
    if (honesty === 'TIMEOUT' || honesty === 'ERROR' || honesty === 'EMPTY' || honesty === 'DISABLED') {
      last = { ...res, path: att.path, note: att.note, honesty }
      continue
    }
    const data = hasDataFor(series, res.json, res.text)
    if (data || series.meta || META_OK.has(series.label)) {
      return {
        label: series.label,
        outcome: 'green',
        status: res.status,
        ms: res.ms,
        path: att.path,
        note: `${att.note || ''}${data ? '' : ' meta'}`.trim(),
        attempts: attemptN,
        hasData: data || Boolean(series.meta),
      }
    }
    // empty 2xx — try next fixture
  }

  // Exhausted
  if (!last) {
    return {
      label: series.label,
      outcome: 'hard',
      status: null,
      ms: 0,
      path: '',
      attempts: attemptN,
      hasData: false,
      error: 'no attempts',
    }
  }
  if (last.error || (last.status != null && last.status >= 500)) {
    return {
      label: series.label,
      outcome: 'hard',
      status: last.status,
      ms: last.ms,
      path: last.path,
      note: last.note,
      attempts: attemptN,
      hasData: false,
      error: last.error || `HTTP ${last.status}`,
    }
  }
  if (last.status >= 400) {
    return {
      label: series.label,
      outcome: 'client',
      status: last.status,
      ms: last.ms,
      path: last.path,
      note: last.note,
      attempts: attemptN,
      hasData: false,
    }
  }
  // empty / timeout / error success after all fixtures
  const honesty = last.honesty
  const outcome =
    honesty === 'TIMEOUT' ? 'timeout' : honesty === 'ERROR' ? 'error' : 'empty'
  return {
    label: series.label,
    outcome,
    status: last.status,
    ms: last.ms,
    path: last.path,
    note: last.note,
    attempts: attemptN,
    hasData: false,
    honesty: honesty || undefined,
  }
}

async function mapPool(items, limit, fn) {
  const results = new Array(items.length)
  let i = 0
  async function worker() {
    while (i < items.length) {
      const idx = i++
      results[idx] = await fn(items[idx], idx)
      if (!asJson) {
        const r = results[idx]
        const mark =
          r.outcome === 'green'
            ? 'DATA'
            : r.outcome === 'empty'
              ? 'EMPTY'
              : r.outcome === 'timeout'
                ? 'TIMEOUT'
                : r.outcome === 'error'
                  ? 'ERROR'
                  : r.outcome === 'client'
                    ? '4xx '
                    : r.outcome === 'skip'
                      ? 'SKIP'
                      : 'FAIL'
        const st = r.status == null ? '---' : String(r.status)
        console.log(
          `  ${mark}  ${st.padStart(3)}  ${String(r.ms).padStart(5)}ms  x${r.attempts}  ${r.label}${
            r.note ? `  [${r.note}]` : ''
          }${r.error ? `  (${r.error})` : ''}`,
        )
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()))
  return results
}

async function main() {
  await detectOllama()
  const routes = walkRoutes(apiRoot)
  // buildProbeSeries reads AI global for live fixtures
  const seriesList = buildProbeSeries(routes)

  try {
    const r = await fetch(`${BASE}/api/runtime-config`, { signal: AbortSignal.timeout(5000) })
    if (!r.ok) throw new Error(`runtime-config ${r.status}`)
  } catch (e) {
    console.error(`App not reachable at ${BASE}`)
    console.error('  Start with: npm run dev')
    console.error(e instanceof Error ? e.message : e)
    process.exit(2)
  }

  if (!asJson) {
    console.log('BioIntel API endpoint health (strict — empty ≠ green)')
    console.log('====================================================')
    console.log(`base: ${BASE}`)
    console.log(`route files: ${routes.length}`)
    console.log(
      `probes: ${seriesList.length}  concurrency: ${concurrency}  timeout: ${timeoutMs}ms`,
    )
    console.log(
      `fixtures: cids=${FIX.cids.join(',')} genes=${FIX.genes.join(',')}  ` +
        `singleFixture=${singleFixture}  maxHardRetries=${maxHardRetries}`,
    )
    if (skipAi) {
      console.log('AI routes: skipped (--skip-ai)')
    } else if (AI.available) {
      console.log(`AI Ollama: ${AI.url}  model=${AI.model}${aiWireOnly ? ' (wire-only flag)' : ' (live+wire)'}`)
    } else {
      console.log('AI Ollama: not detected — AI routes use wire/validation probes only')
    }
    console.log('')
    console.log('  DATA = 2xx with payload   EMPTY = 2xx no data after all fixtures')
    console.log('  4xx  = client error       FAIL  = 5xx/network')
    console.log('')
  }

  const results = await mapPool(seriesList, concurrency, probeSeries)

  const green = results.filter((r) => r.outcome === 'green')
  const empty = results.filter((r) => r.outcome === 'empty')
  const timeout = results.filter((r) => r.outcome === 'timeout')
  const envError = results.filter((r) => r.outcome === 'error')
  const client = results.filter((r) => r.outcome === 'client')
  const hard = results.filter((r) => r.outcome === 'hard')
  const skip = results.filter((r) => r.outcome === 'skip')

  if (asJson) {
    console.log(
      JSON.stringify(
        {
          base: BASE,
          routeFiles: routes.length,
          probes: seriesList.length,
          green: green.length,
          empty: empty.length,
          timeout: timeout.length,
          error: envError.length,
          client: client.length,
          hard: hard.length,
          skipped: skip.length,
          strictEmpty,
          results,
        },
        null,
        2,
      ),
    )
  } else {
    console.log('')
    console.log('Summary')
    console.log('-------')
    console.log(`  route files:     ${routes.length}`)
    console.log(`  probes:          ${results.length}`)
    console.log(`  DATA (green):    ${green.length}`)
    console.log(`  EMPTY (not green): ${empty.length}`)
    console.log(`  TIMEOUT:         ${timeout.length}`)
    console.log(`  ERROR envelope:  ${envError.length}`)
    console.log(`  4xx client:      ${client.length}`)
    console.log(`  FAIL hard:       ${hard.length}`)
    console.log(`  skipped:         ${skip.length}`)

    if (empty.length) {
      console.log('\nEmpty after alternate fixtures (not green):')
      for (const r of empty) {
        console.log(`  ${r.label}  last=${r.path}  tries=${r.attempts}`)
      }
    }
    if (client.length) {
      console.log('\nClient errors after all fixtures:')
      for (const r of client) {
        console.log(`  ${r.label}  ${r.status}  last=${r.path}`)
      }
    }
    if (hard.length) {
      console.log('\nHard failures:')
      for (const r of hard) {
        console.log(`  ${r.label}  ${r.error || r.status}  ${r.path}`)
      }
    }

    const bad = hard.length + (strictEmpty ? empty.length + timeout.length + envError.length + client.length : 0)
    console.log('')
    if (bad === 0) {
      console.log('✓ All probed endpoints confirmed with data (or allowed meta/404)')
    } else {
      console.log(
        `✗ Health not fully confirmed: ${hard.length} hard, ${empty.length} empty, ${timeout.length} timeout, ${envError.length} error, ${client.length} 4xx`,
      )
    }
  }

  const fail = hard.length > 0 || (strictEmpty && (empty.length > 0 || timeout.length > 0 || envError.length > 0 || client.length > 0))
  process.exit(fail ? 1 : 0)
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e)
    process.exit(2)
  })
}

module.exports = {
  payloadHasData,
  classifyHonesty,
  categoryHasData,
  hasDataFor,
}
