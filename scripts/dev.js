#!/usr/bin/env node
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const nextDir = path.join(__dirname, '..', '.next')
try { fs.rmSync(nextDir, { recursive: true, force: true }) } catch {}

const PORT = process.env.PORT || 52167
const next = spawn(`npx next dev -p ${PORT}`, [], {
  env: { ...process.env, CHOKIDAR_USEPOLLING: 'true', WATCHPACK_POLLING: 'true' },
  stdio: 'inherit',
  shell: true
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