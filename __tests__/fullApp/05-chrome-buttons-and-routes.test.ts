/**
 * Product chrome: buttons, testids, and routes remain wired in source.
 */

import fs from 'fs'
import path from 'path'
import {
  APP_ROUTES,
  CHROME_TEST_IDS,
  PRODUCT_LAW_MARKERS,
  readRepoFile,
  fileExists,
} from '@/lib/fullAppCoverage/inventory'

const root = process.cwd()

function walkTsx(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === '.next') continue
      walkTsx(p, acc)
    } else if (/\.(tsx|ts)$/.test(ent.name)) {
      acc.push(p)
    }
  }
  return acc
}

describe('full-app chrome and routes', () => {
  const srcFiles = walkTsx(path.join(root, 'src'))
  const corpus = srcFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n')

  it.each([...CHROME_TEST_IDS])('chrome test id "%s" exists in src', (id) => {
    expect(corpus).toContain(id)
  })

  it('profile header chrome exports Cite / Share / Export buttons', () => {
    expect(fileExists('src/components/profile/CiteButton.tsx')).toBe(true)
    expect(fileExists('src/components/profile/ShareButton.tsx')).toBe(true)
    expect(fileExists('src/components/profile/ExportButton.tsx')).toBe(true)
    expect(fileExists('src/components/profile/FavoriteButton.tsx')).toBe(true)
  })

  it('data hub export buttons are present in DataHubLedger', () => {
    const hub = readRepoFile('src/components/dataHub/DataHubLedger.tsx')
    expect(hub).toContain('export-csv')
    expect(hub).toContain('export-tsv')
    expect(hub).toContain('Research kit')
    expect(hub).toContain('Monday pack')
  })

  it('Discover rank UI has score axis + source status strip', () => {
    expect(fileExists('src/app/discover/components/ScoreAxisBars.tsx')).toBe(true)
    expect(fileExists('src/app/discover/components/SourceStatusStrip.tsx')).toBe(true)
    expect(fileExists('src/app/discover/components/CandidateCard.tsx')).toBe(true)
  })

  it('all inventory routes exist', () => {
    for (const r of APP_ROUTES) {
      expect(fileExists(r.pageFile)).toBe(true)
    }
  })

  it('product law still encoded in AGENTS.md', () => {
    const agents = readRepoFile('AGENTS.md')
    expect(agents).toMatch(PRODUCT_LAW_MARKERS.freeApis)
    expect(agents).toMatch(PRODUCT_LAW_MARKERS.noLlmRank)
  })

  it('methodology + how-it-works pages exist for transparency', () => {
    expect(fileExists('src/app/methodology/page.tsx')).toBe(true)
    expect(fileExists('src/app/how-it-works/page.tsx')).toBe(true)
  })
})
