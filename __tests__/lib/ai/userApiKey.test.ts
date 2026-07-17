/**
 * @jest-environment jsdom
 */
import {
  clearLocalOllamaApiKey,
  loadLocalOllamaApiKey,
  maskApiKey,
  saveLocalOllamaApiKey,
  AI_API_KEY_STORAGE_KEY,
} from '@/lib/ai/userApiKey'

describe('userApiKey', () => {
  beforeEach(() => {
    localStorage.removeItem(AI_API_KEY_STORAGE_KEY)
  })

  test('save and load', () => {
    saveLocalOllamaApiKey('  my-secret  ')
    expect(loadLocalOllamaApiKey()).toBe('my-secret')
  })

  test('clear removes key', () => {
    saveLocalOllamaApiKey('x')
    clearLocalOllamaApiKey()
    expect(loadLocalOllamaApiKey()).toBe('')
  })

  test('maskApiKey hides middle', () => {
    expect(maskApiKey('abcdefghij')).toBe('••••••••ghij')
    expect(maskApiKey('ab')).toBe('••••')
    expect(maskApiKey('')).toBe('')
  })
})
