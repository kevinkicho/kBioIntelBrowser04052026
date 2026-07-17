/**
 * @jest-environment jsdom
 */
import {
  isLocalOrLanOllamaUrl,
  isLoopbackHostname,
  shouldUseBrowserOllama,
} from '@/lib/ai/localTransport'

describe('localTransport', () => {
  test('detects loopback hosts', () => {
    expect(isLoopbackHostname('localhost')).toBe(true)
    expect(isLoopbackHostname('127.0.0.1')).toBe(true)
    expect(isLoopbackHostname('::1')).toBe(true)
    expect(isLoopbackHostname('ollama.com')).toBe(false)
  })

  test('local or LAN ollama URLs', () => {
    expect(isLocalOrLanOllamaUrl('http://127.0.0.1:11434')).toBe(true)
    expect(isLocalOrLanOllamaUrl('localhost:11434')).toBe(true)
    expect(isLocalOrLanOllamaUrl('http://192.168.1.10:11434')).toBe(true)
    expect(isLocalOrLanOllamaUrl('https://ollama.com')).toBe(false)
  })

  test('browser transport preferred for local URLs', () => {
    expect(shouldUseBrowserOllama('http://127.0.0.1:11434')).toBe(true)
    expect(shouldUseBrowserOllama('https://ollama.com')).toBe(false)
  })
})
