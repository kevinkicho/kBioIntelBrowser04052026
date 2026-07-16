#!/usr/bin/env node
/** Run opt-in live API contract smoke tests (requires network). */
process.env.LIVE_API = '1'
const { spawnSync } = require('child_process')
const result = spawnSync(
  'npx',
  ['jest', '--testPathPatterns=live/api-contract', '--runInBand'],
  { stdio: 'inherit', env: process.env, shell: true },
)
process.exit(result.status ?? 1)
