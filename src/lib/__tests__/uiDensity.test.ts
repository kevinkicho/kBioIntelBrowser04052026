/**
 * @jest-environment node
 */

import { parseUiDensity, shortPreview } from '../uiDensity'

describe('uiDensity', () => {
  it('parses modes', () => {
    expect(parseUiDensity('comfortable')).toBe('comfortable')
    expect(parseUiDensity('dense')).toBe('dense')
    expect(parseUiDensity('nope')).toBe('comfortable')
    expect(parseUiDensity(null)).toBe('comfortable')
  })

  it('shortPreview truncates', () => {
    expect(shortPreview('short')).toBe('short')
    expect(shortPreview('a'.repeat(200), 50).endsWith('…')).toBe(true)
    expect(shortPreview('')).toBe('')
  })
})
