import { elapsedWaitHint, formatElapsed } from '@/lib/elapsedTime'

describe('formatElapsed', () => {
  test('formats sub-minute as tenths of a second', () => {
    expect(formatElapsed(0)).toBe('0.0s')
    expect(formatElapsed(1200)).toBe('1.2s')
    expect(formatElapsed(59_900)).toBe('59.9s')
  })

  test('formats minutes as m:ss', () => {
    expect(formatElapsed(60_000)).toBe('1:00')
    expect(formatElapsed(65_000)).toBe('1:05')
    expect(formatElapsed(125_000)).toBe('2:05')
  })
})

describe('elapsedWaitHint', () => {
  test('evolves with wait duration', () => {
    expect(elapsedWaitHint(500)).toMatch(/Starting/i)
    expect(elapsedWaitHint(5_000)).toMatch(/usually/i)
    expect(elapsedWaitHint(12_000)).toMatch(/slower/i)
    expect(elapsedWaitHint(20_000)).toMatch(/longer/i)
    expect(elapsedWaitHint(45_000)).toMatch(/refresh|timing/i)
  })
})
