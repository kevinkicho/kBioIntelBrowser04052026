/**
 * Deploy local .env values to Firebase App Hosting (Secret Manager + grants).
 * Follows firebase-app-hosting-basics skill:
 *   npx -y firebase-tools@latest apphosting:secrets:set / grantaccess
 *
 * Usage (repo root):
 *   node scripts/deploy-apphosting-env.js
 *   node scripts/deploy-apphosting-env.js --rollout
 *
 * Env:
 *   APPHOSTING_BACKEND  default biointel
 *   FIREBASE_PROJECT    default from .firebaserc / active project
 */

const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

const ROOT = path.resolve(__dirname, '..')
const BACKEND = process.env.APPHOSTING_BACKEND || 'biointel'
const DO_ROLLOUT = process.argv.includes('--rollout')

/** Secrets that must never be plain values in apphosting.yaml */
const SECRET_KEYS = new Set([
  'OLLAMA_API_KEY',
  'FIREBASE_ADMIN_CREDENTIALS_JSON',
  'NEXT_PUBLIC_FIREBASE_API_KEY', // GitHub secret scanning flags AIza… in yaml
])

/** Non-secret env to keep as plain `value` in apphosting.yaml (also re-written). */
const PLAIN_KEYS = [
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_DATABASE_URL',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
  'NCBI_EMAIL',
  'OLLAMA_CLOUD_BASE_URL',
]

function parseDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return {}
  const out = {}
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i <= 0) continue
    const k = t.slice(0, i).trim()
    let v = t.slice(i + 1).trim()
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    out[k] = v
  }
  return out
}

function firebase(args, opts = {}) {
  const r = spawnSync(
    'npx',
    ['-y', 'firebase-tools@latest', ...args],
    {
      cwd: ROOT,
      encoding: 'utf8',
      shell: true,
      input: opts.input,
      stdio: opts.input != null ? ['pipe', 'pipe', 'pipe'] : 'inherit',
    },
  )
  if (opts.capture) {
    return {
      status: r.status,
      stdout: r.stdout || '',
      stderr: r.stderr || '',
    }
  }
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout || `firebase exit ${r.status}`)
  }
  return r.status === 0
}

function setSecret(name, value) {
  const tmp = path.join(os.tmpdir(), `biointel-secret-${name}-${Date.now()}.txt`)
  fs.writeFileSync(tmp, value, 'utf8')
  try {
    console.log(`\n→ Setting secret ${name} (len=${value.length})…`)
    // Answer "n" if CLI asks to edit apphosting.yaml (we manage yaml ourselves)
    const ok = firebase(
      ['apphosting:secrets:set', name, '--data-file', tmp, '--force'],
      { input: 'n\n' },
    )
    if (!ok) {
      // retry without pipe for force path
      const r = spawnSync(
        'npx',
        [
          '-y',
          'firebase-tools@latest',
          'apphosting:secrets:set',
          name,
          '--data-file',
          tmp,
          '--force',
        ],
        { cwd: ROOT, shell: true, stdio: 'inherit', input: 'n\n' },
      )
      if (r.status !== 0) throw new Error(`Failed to set secret ${name}`)
    }
    console.log(`→ Granting ${name} to backend ${BACKEND}…`)
    firebase(['apphosting:secrets:grantaccess', name, '-b', BACKEND])
  } finally {
    try {
      fs.unlinkSync(tmp)
    } catch {
      /* ignore */
    }
  }
}

function writeAppHostingYaml(env) {
  const apiKeySecret = 'NEXT_PUBLIC_FIREBASE_API_KEY'
  const lines = [
    '# Firebase App Hosting — backend id: biointel',
    '# Generated/updated by scripts/deploy-apphosting-env.js',
    '# https://firebase.google.com/docs/app-hosting/configure',
    '#',
    '# Client Firebase web config is public-by-design (browser).',
    '# Sensitive values use Cloud Secret Manager (secret:).',
    '',
    'runConfig:',
    '  minInstances: 0',
    '  memoryMiB: 1024',
    '',
    'env:',
  ]

  const authDomain =
    env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    'kbiointelbrowser04052026.firebaseapp.com'
  const databaseURL =
    env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
    'https://kbiointelbrowser04052026-default-rtdb.firebaseio.com'
  const projectId =
    env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'kbiointelbrowser04052026'
  const storageBucket =
    env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    'kbiointelbrowser04052026.firebasestorage.app'
  const messagingSenderId =
    env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '888935385467'
  const appId =
    env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    '1:888935385467:web:24d1b4fde75682ad5415de'
  const ncbiEmail = env.NCBI_EMAIL || 'kevinkicho@gmail.com'
  const ollamaCloud =
    env.OLLAMA_CLOUD_BASE_URL || 'https://ollama.com'

  // API key as secret (BUILD+RUNTIME for Next.js inlining)
  lines.push(
    `  - variable: ${apiKeySecret}`,
    `    secret: ${apiKeySecret}`,
    '    availability:',
    '      - BUILD',
    '      - RUNTIME',
  )

  const plains = [
    ['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', authDomain],
    ['NEXT_PUBLIC_FIREBASE_DATABASE_URL', databaseURL],
    ['NEXT_PUBLIC_FIREBASE_PROJECT_ID', projectId],
    ['NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', storageBucket],
    ['NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', messagingSenderId],
    ['NEXT_PUBLIC_FIREBASE_APP_ID', appId],
    ['NCBI_EMAIL', ncbiEmail],
    ['OLLAMA_CLOUD_BASE_URL', ollamaCloud],
  ]
  for (const [k, v] of plains) {
    lines.push(
      `  - variable: ${k}`,
      `    value: ${JSON.stringify(String(v))}`,
      '    availability:',
      '      - BUILD',
      '      - RUNTIME',
    )
  }

  lines.push(
    '  - variable: FIREBASE_ADMIN_CREDENTIALS_JSON',
    '    secret: FIREBASE_ADMIN_CREDENTIALS_JSON',
    '    availability:',
    '      - RUNTIME',
    '  - variable: OLLAMA_API_KEY',
    '    secret: OLLAMA_API_KEY',
    '    availability:',
    '      - BUILD',
    '      - RUNTIME',
    '',
  )

  const out = path.join(ROOT, 'apphosting.yaml')
  fs.writeFileSync(out, lines.join('\n'), 'utf8')
  console.log(`\n✓ Wrote ${out}`)
}

function main() {
  const env = parseDotEnv(path.join(ROOT, '.env'))
  if (!Object.keys(env).length) {
    console.error('No .env found or empty. Aborting.')
    process.exit(1)
  }

  console.log('Firebase project:', 'kbiointelbrowser04052026')
  console.log('App Hosting backend:', BACKEND)
  console.log('Keys in .env:', Object.keys(env).join(', '))

  // Admin SDK JSON file if present
  let adminJson = env.FIREBASE_ADMIN_CREDENTIALS_JSON
  if (!adminJson) {
    const hits = fs
      .readdirSync(ROOT)
      .filter((f) => /firebase-adminsdk.*\.json$/i.test(f))
    if (hits[0]) {
      adminJson = fs.readFileSync(path.join(ROOT, hits[0]), 'utf8')
      console.log('Using Admin SDK file:', hits[0])
    }
  }

  // Secrets
  if (env.NEXT_PUBLIC_FIREBASE_API_KEY) {
    setSecret('NEXT_PUBLIC_FIREBASE_API_KEY', env.NEXT_PUBLIC_FIREBASE_API_KEY)
  } else {
    console.warn('! Missing NEXT_PUBLIC_FIREBASE_API_KEY in .env')
  }

  if (env.OLLAMA_API_KEY) {
    setSecret('OLLAMA_API_KEY', env.OLLAMA_API_KEY)
  } else {
    console.warn('! Missing OLLAMA_API_KEY in .env — cloud AI fallback will fail')
  }

  if (adminJson) {
    // minify JSON for env safety
    try {
      adminJson = JSON.stringify(JSON.parse(adminJson))
    } catch {
      /* keep raw */
    }
    setSecret('FIREBASE_ADMIN_CREDENTIALS_JSON', adminJson)
  } else {
    console.warn('! No Admin SDK JSON found — server admin optional')
  }

  writeAppHostingYaml(env)

  if (DO_ROLLOUT) {
    console.log(`\n→ Creating App Hosting rollout for ${BACKEND} (main)…`)
    firebase(['apphosting:rollouts:create', BACKEND, '-b', 'main', '-f'])
  } else {
    console.log('\nDone. Commit apphosting.yaml if changed, then push main,')
    console.log('or re-run with --rollout to force a backend rollout.')
  }
}

main()
