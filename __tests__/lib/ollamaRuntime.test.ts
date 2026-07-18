/**
 * @jest-environment node
 */
import {
  clearOllamaHealthCache,
  getCachedOllamaHealth,
  healthCacheKey,
  resolvePrimaryOllamaUrlForServer,
  setCachedOllamaHealth,
} from '@/lib/ai/ollamaRuntime'
import type { OllamaHealthResponse } from '@/lib/ai/ollama'

describe('ollamaRuntime', () => {
  const prev = { ...process.env }

  afterEach(() => {
    process.env = { ...prev }
    clearOllamaHealthCache()
  })

  test('health cache round-trip', () => {
    const key = healthCacheKey('https://ollama.com', false)
    const value: OllamaHealthResponse = {
      available: true,
      models: ['m'],
      viaCloud: true,
      effectiveUrl: 'https://ollama.com',
    }
    setCachedOllamaHealth(key, value)
    expect(getCachedOllamaHealth(key)?.available).toBe(true)
    expect(getCachedOllamaHealth(healthCacheKey('http://localhost:11434', false))).toBeNull()
  })

  test('resolvePrimary skips localhost on Cloud Run when cloud key present', () => {
    process.env.K_SERVICE = 'biointel'
    process.env.OLLAMA_API_KEY = 'test-key'
    delete process.env.OLLAMA_ALLOW_LOCALHOST
    const r = resolvePrimaryOllamaUrlForServer('http://localhost:11434')
    expect(r.skippedLocal).toBe(true)
    expect(r.url).toContain('ollama.com')
  })

  test('resolvePrimary skips localhost with no key → empty url', () => {
    process.env.K_SERVICE = 'biointel'
    delete process.env.OLLAMA_API_KEY
    delete process.env.OLLAMA_ALLOW_LOCALHOST
    const r = resolvePrimaryOllamaUrlForServer('http://127.0.0.1:11434')
    expect(r.skippedLocal).toBe(true)
    expect(r.url).toBe('')
    expect(r.reason).toBe('cloud_run_no_local_no_key')
  })

  test('resolvePrimary allows localhost when OLLAMA_ALLOW_LOCALHOST=1', () => {
    process.env.K_SERVICE = 'biointel'
    process.env.OLLAMA_ALLOW_LOCALHOST = '1'
    const r = resolvePrimaryOllamaUrlForServer('http://localhost:11434')
    expect(r.skippedLocal).toBe(false)
    expect(r.url).toContain('localhost')
  })

  test('empty url with cloud key → cloud base', () => {
    process.env.K_SERVICE = 'biointel'
    process.env.OLLAMA_API_KEY = 'k'
    const r = resolvePrimaryOllamaUrlForServer('')
    expect(r.url).toContain('ollama.com')
    expect(r.skippedLocal).toBe(true)
  })
})
