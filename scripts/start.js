#!/usr/bin/env node
/**
 * Portable production start script.
 * Avoids bash-only `${PORT:-33424}` which breaks on Windows PowerShell/cmd.
 */
const { spawn } = require('child_process')

// Default 33424 — keep in sync with scripts/dev.js and README.
const PORT = process.env.PORT || 33424

const next = spawn(`npx next start -p ${PORT}`, [], {
  env: process.env,
  stdio: 'inherit',
  shell: true,
})

function cleanup() {
  console.log('\nShutting down...')
  next.kill()
  process.exit(0)
}

process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)

next.on('close', (code) => {
  process.exit(code || 0)
})
