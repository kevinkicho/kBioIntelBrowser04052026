#!/usr/bin/env node
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

// Default to 3000 (Next.js convention). Override with PORT env var.
// 52167 used to be the default but landed inside Windows' Hyper-V/WinNAT
// excluded port range on some machines, surfacing as EACCES.
const PORT = process.env.PORT || 3000

// Pass --clean to wipe the .next/ cache before starting. Wiping every run
// forces a full first-compile (slow on a 100+-panel app); keeping the
// cache makes restarts dramatically faster. Only nuke when explicitly asked.
if (process.argv.includes('--clean')) {
  const nextDir = path.join(__dirname, '..', '.next')
  try { fs.rmSync(nextDir, { recursive: true, force: true }); console.log('Cleared .next/ cache') } catch {}
}

// Native filesystem watching works on Windows / macOS / Linux. Polling is only
// needed inside WSL/Docker bind-mounts and adds significant CPU overhead +
// slows hot-reload. Opt in via WATCH_POLLING=1 if you actually need it.
const env = { ...process.env }
if (process.env.WATCH_POLLING === '1') {
  env.CHOKIDAR_USEPOLLING = 'true'
  env.WATCHPACK_POLLING = 'true'
}

const next = spawn(`npx next dev -p ${PORT}`, [], {
  env,
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
