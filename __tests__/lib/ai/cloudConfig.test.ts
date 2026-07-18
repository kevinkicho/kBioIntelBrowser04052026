/**
 * Ollama Cloud config: per-user API keys only (no server env fallback).
 */
import {
  getOllamaApiKey,
  hasOllamaCloudFallback,
  isOllamaCloudUrl,
  getCloudAuthHeaders,
  ollamaRequestHeaders,
  resolveOllamaApiKey,
  parseRequestOllamaApiKey,
} from '@/lib/ai/cloudConfig'

describe('cloudConfig', () => {
  test('detects ollama.com hosts', () => {
    expect(isOllamaCloudUrl('https://ollama.com')).toBe(true)
    expect(isOllamaCloudUrl('https://www.ollama.com/api')).toBe(true)
    expect(isOllamaCloudUrl('http://localhost:11434')).toBe(false)
    expect(isOllamaCloudUrl('http://192.168.1.5:11434')).toBe(false)
  })

  test('hasOllamaCloudFallback is user-key only (ignores server env)', () => {
    process.env.OLLAMA_API_KEY = 'server-should-be-ignored'
    expect(hasOllamaCloudFallback()).toBe(false)
    expect(getOllamaApiKey()).toBeUndefined()
    expect(hasOllamaCloudFallback('user-key')).toBe(true)
    delete process.env.OLLAMA_API_KEY
  })

  test('resolveOllamaApiKey uses only the user-provided key', () => {
    process.env.OLLAMA_API_KEY = 'server-key'
    expect(resolveOllamaApiKey('user-key')).toBe('user-key')
    expect(resolveOllamaApiKey('')).toBeUndefined()
    expect(resolveOllamaApiKey(null)).toBeUndefined()
    expect(getCloudAuthHeaders('https://ollama.com', 'user-key')).toEqual({
      Authorization: 'Bearer user-key',
    })
    delete process.env.OLLAMA_API_KEY
  })

  test('auth headers only for cloud URLs with a user key', () => {
    expect(getCloudAuthHeaders('http://localhost:11434', 'secret-key')).toEqual({})
    expect(getCloudAuthHeaders('https://ollama.com')).toEqual({})
    expect(getCloudAuthHeaders('https://ollama.com', 'secret-key')).toEqual({
      Authorization: 'Bearer secret-key',
    })
    expect(
      ollamaRequestHeaders(
        'https://ollama.com',
        { 'Content-Type': 'application/json' },
        'secret-key',
      ),
    ).toEqual({
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: 'Bearer secret-key',
    })
  })

  test('parseRequestOllamaApiKey reads body fields', () => {
    expect(parseRequestOllamaApiKey({ ollamaApiKey: ' abc ' })).toBe('abc')
    expect(parseRequestOllamaApiKey({ apiKey: 'xyz' })).toBe('xyz')
    expect(parseRequestOllamaApiKey({ ollamaApiKey: '' })).toBeUndefined()
    expect(parseRequestOllamaApiKey(null)).toBeUndefined()
  })
})
