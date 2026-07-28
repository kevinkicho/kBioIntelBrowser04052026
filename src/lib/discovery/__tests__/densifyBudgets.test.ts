import {
  resolveDensifyBudgets,
  resetDensifyBudgetsCacheForTests,
} from '@/lib/discovery/densifyBudgets'

describe('resolveDensifyBudgets', () => {
  afterEach(() => {
    resetDensifyBudgetsCacheForTests()
  })

  it('uses tighter cloud profile when forced', () => {
    const b = resolveDensifyBudgets({
      DENSIFY_BUDGET_PROFILE: 'cloud',
    })
    expect(b.profile).toBe('cloud')
    expect(b.densifyK).toBeLessThanOrEqual(8)
    expect(b.skipBreadthByDefault).toBe(true)
    expect(b.rankServerTimeoutMs).toBeLessThanOrEqual(50_000)
  })

  it('local profile enables breadth by default', () => {
    const b = resolveDensifyBudgets({
      DENSIFY_BUDGET_PROFILE: 'local',
      NODE_ENV: 'development',
    })
    expect(b.profile).toBe('local')
    expect(b.skipBreadthByDefault).toBe(false)
    expect(b.densifyK).toBe(10)
  })

  it('DENSIFY_ENABLE_BREADTH forces breadth on cloud', () => {
    const b = resolveDensifyBudgets({
      DENSIFY_BUDGET_PROFILE: 'cloud',
      DENSIFY_ENABLE_BREADTH: '1',
    })
    expect(b.skipBreadthByDefault).toBe(false)
  })
})
