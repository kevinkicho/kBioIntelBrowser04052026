/**
 * cloudConfig reads process.env at call time for the key helpers.
 * Base URL is evaluated at module load — we only assert key/header helpers here.
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
  const original = process.env.OLLAMA_API_KEY

  afterEach(() => {
    if (original === undefined) delete process.env.OLLAMA_API_KEY
    else process.env.OLLAMA_API_KEY = original
  })

  test('detects ollama.com hosts', () => {
    expect(isOllamaCloudUrl('https://ollama.com')).toBe(true)
    expect(isOllamaCloudUrl('https://www.ollama.com/api')).toBe(true)
    expect(isOllamaCloudUrl('http://localhost:11434')).toBe(false)
    expect(isOllamaCloudUrl('http://192.168.1.5:11434')).toBe(false)
  })

  test('hasOllamaCloudFallback reflects key presence', () => {
    delete process.env.OLLAMA_API_KEY
    expect(hasOllamaCloudFallback()).toBe(false)
    process.env.OLLAMA_API_KEY = 'test-key'
    expect(hasOllamaCloudFallback()).toBe(true)
    expect(getOllamaApiKey()).toBe('test-key')
  })

  test('user API key wins over server env', () => {
    process.env.OLLAMA_API_KEY = 'server-key'
    expect(resolveOllamaApiKey('user-key')).toBe('user-key')
    expect(resolveOllamaApiKey('')).toBe('server-key')
    expect(resolveOllamaApiKey(null)).toBe('server-key')
    expect(getCloudAuthHeaders('https://ollama.com', 'user-key')).toEqual({
      Authorization: 'Bearer user-key',
    })
  })

  test('auth headers only for cloud URLs', () => {
    process.env.OLLAMA_API_KEY = 'secret-key'
    expect(getCloudAuthHeaders('http://localhost:11434')).toEqual({})
    expect(getCloudAuthHeaders('https://ollama.com')).toEqual({
      Authorization: 'Bearer secret-key',
    })
    expect(ollamaRequestHeaders('https://ollama.com', { 'Content-Type': 'application/json' })).toEqual({
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
