/**
 * Deploy Firebase Admin SDK credentials to App Hosting Secret Manager.
 *
 * Note: The Admin SDK itself cannot configure App Hosting env vars.
 * This script uses the local service-account JSON + Firebase CLI / Secret Manager
 * so the App Hosting runtime can initialize firebase-admin.
 *
 * Usage (repo root):
 *   node scripts/deploy-apphosting-admin-secret.js
 *   node scripts/deploy-apphosting-admin-secret.js path/to/adminsdk.json
 *
 * Env:
 *   FIREBASE_ADMIN_KEY_PATH — path to service account JSON (optional)
 *   APPHOSTING_BACKEND — default biointel
 */

const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const BACKEND = process.env.APPHOSTING_BACKEND || 'biointel'
const SECRET_NAME = 'FIREBASE_ADMIN_CREDENTIALS_JSON'

function findAdminJson(cliPath) {
  if (cliPath && fs.existsSync(cliPath)) return path.resolve(cliPath)
  if (process.env.FIREBASE_ADMIN_KEY_PATH && fs.existsSync(process.env.FIREBASE_ADMIN_KEY_PATH)) {
    return path.resolve(process.env.FIREBASE_ADMIN_KEY_PATH)
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const p = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS)
    if (fs.existsSync(p)) return p
  }
  const hits = fs
    .readdirSync(ROOT)
    .filter((f) => /firebase-adminsdk.*\.json$/i.test(f))
  if (hits.length === 1) return path.join(ROOT, hits[0])
  if (hits.length > 1) {
    console.error('Multiple Admin SDK JSON files found; pass an explicit path:')
    hits.forEach((h) => console.error('  -', h))
    process.exit(1)
  }
  console.error(
    'No Admin SDK JSON found. Pass a path or set FIREBASE_ADMIN_KEY_PATH / GOOGLE_APPLICATION_CREDENTIALS.',
  )
  process.exit(1)
}

function main() {
  const keyPath = findAdminJson(process.argv[2])
  const raw = fs.readFileSync(keyPath, 'utf8')
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    console.error('Admin key file is not valid JSON:', keyPath)
    process.exit(1)
  }
  if (parsed.type !== 'service_account' || !parsed.private_key) {
    console.error('File does not look like a Firebase/GCP service account JSON.')
    process.exit(1)
  }

  console.log(`Using Admin SDK key: ${path.basename(keyPath)}`)
  console.log(`Secret: ${SECRET_NAME} → backend ${BACKEND}`)

  // Minify JSON for secret payload (single line env-friendly)
  const tmp = path.join(ROOT, '.tmp-admin-secret.json')
  fs.writeFileSync(tmp, JSON.stringify(parsed), 'utf8')

  try {
    const set = spawnSync(
      'firebase',
      ['apphosting:secrets:set', SECRET_NAME, '--data-file', tmp, '--force'],
      { cwd: ROOT, stdio: ['pipe', 'inherit', 'inherit'], shell: true, input: 'n\n' },
    )
    if (set.status !== 0) {
      console.error('firebase apphosting:secrets:set failed')
      process.exit(set.status || 1)
    }

    const grant = spawnSync(
      'firebase',
      ['apphosting:secrets:grantaccess', SECRET_NAME, '-b', BACKEND],
      { cwd: ROOT, stdio: 'inherit', shell: true },
    )
    if (grant.status !== 0) {
      console.error('grantaccess failed — check backend name and IAM')
      process.exit(grant.status || 1)
    }

    console.log('')
    console.log('Done. Ensure apphosting.yaml contains:')
    console.log('  - variable: FIREBASE_ADMIN_CREDENTIALS_JSON')
    console.log('    secret: FIREBASE_ADMIN_CREDENTIALS_JSON')
    console.log('    availability: [RUNTIME]')
    console.log('')
    console.log('Public NEXT_PUBLIC_FIREBASE_* vars stay as plain values in apphosting.yaml')
    console.log('(client-safe). Re-rollout App Hosting to pick up secret changes.')
  } finally {
    try {
      fs.unlinkSync(tmp)
    } catch {
      /* ignore */
    }
  }
}

main()
