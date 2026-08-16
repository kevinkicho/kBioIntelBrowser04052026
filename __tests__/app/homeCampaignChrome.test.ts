import fs from 'fs'
import path from 'path'

const root = process.cwd()

function readSrc(rel: string): string {
  return fs.readFileSync(path.join(root, rel), 'utf8')
}

describe('home / campaign finish-rate chrome', () => {
  it('home beachhead keeps LoopCoachStrip and does not stack FinishRateStrip', () => {
    const src = readSrc('src/app/page.tsx')
    expect(src).toContain('LoopCoachStrip')
    expect(src).toContain('home-beachhead')
    expect(src).not.toContain('FinishRateStrip')
  })

  it('campaign workspace keeps LoopCoachStrip and does not stack FinishRateStrip', () => {
    const src = readSrc('src/components/campaign/CampaignWorkspaceClient.tsx')
    expect(src).toContain('LoopCoachStrip')
    expect(src).not.toContain('FinishRateStrip')
  })

  it('analytics still owns FinishRateStrip', () => {
    const src = readSrc('src/components/analytics/ProductFunnelPanel.tsx')
    expect(src).toContain('FinishRateStrip')
  })
})
