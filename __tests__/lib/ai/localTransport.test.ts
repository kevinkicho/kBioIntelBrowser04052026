/**
 * @jest-environment jsdom
 */
import {
  isBrowserTunnelOllamaUrl,
  isLocalOrLanOllamaUrl,
  isLoopbackHostname,
  mustUseServerOllamaProxy,
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

  test('cloud never uses browser transport', () => {
    expect(shouldUseBrowserOllama('https://ollama.com')).toBe(false)
    expect(mustUseServerOllamaProxy('https://ollama.com')).toBe(true)
  })

  test('HTTPS tunnel uses browser transport', () => {
    expect(isBrowserTunnelOllamaUrl('https://abc.trycloudflare.com')).toBe(true)
    expect(shouldUseBrowserOllama('https://abc.trycloudflare.com')).toBe(true)
  })

  test('loopback browser transport follows page protocol (jsdom is typically http)', () => {
    // jsdom default location is http://localhost — browser local allowed
    const isHttpPage = window.location.protocol === 'http:'
    if (isHttpPage) {
      expect(shouldUseBrowserOllama('http://127.0.0.1:11434')).toBe(true)
      expect(mustUseServerOllamaProxy('http://127.0.0.1:11434')).toBe(false)
    } else {
      expect(shouldUseBrowserOllama('http://127.0.0.1:11434')).toBe(false)
      expect(mustUseServerOllamaProxy('http://127.0.0.1:11434')).toBe(true)
    }
  })
})
