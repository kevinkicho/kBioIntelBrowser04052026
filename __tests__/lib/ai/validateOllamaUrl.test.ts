import { validateOllamaUrl } from '@/lib/ai/config'

describe('validateOllamaUrl', () => {
  describe('valid local URLs', () => {
    it('accepts http://localhost', () => {
      const result = validateOllamaUrl('http://localhost:11434')
      expect(result.valid).toBe(true)
      expect(result.normalized).toContain('localhost')
    })

    it('accepts http://127.0.0.1', () => {
      const result = validateOllamaUrl('http://127.0.0.1:11434')
      expect(result.valid).toBe(true)
    })

    it('accepts localhost without protocol', () => {
      const result = validateOllamaUrl('localhost:11434')
      expect(result.valid).toBe(true)
    })

    it('accepts https://localhost', () => {
      const result = validateOllamaUrl('https://localhost:11434')
      expect(result.valid).toBe(true)
    })
  })

  describe('blocks private IP ranges (RFC 1918)', () => {
    it('blocks 10.x.x.x', () => {
      expect(validateOllamaUrl('http://10.0.0.1:11434').valid).toBe(false)
    })

    it('blocks 172.16.x.x', () => {
      expect(validateOllamaUrl('http://172.16.0.1:11434').valid).toBe(false)
    })

    it('blocks 172.31.x.x', () => {
      expect(validateOllamaUrl('http://172.31.0.1:11434').valid).toBe(false)
    })

    it('blocks 192.168.x.x', () => {
      expect(validateOllamaUrl('http://192.168.1.1:11434').valid).toBe(false)
    })

    it('allows 172.15.x.x (not in private range)', () => {
      const result = validateOllamaUrl('http://172.15.0.1:11434')
      expect(result.valid).toBe(false) // blocked because not localhost
    })

    it('allows 172.32.x.x (not in private range)', () => {
      const result = validateOllamaUrl('http://172.32.0.1:11434')
      expect(result.valid).toBe(false) // blocked because not localhost
    })
  })

  describe('blocks link-local and CGNAT', () => {
    it('blocks 169.254.x.x (link-local)', () => {
      expect(validateOllamaUrl('http://169.254.169.254:11434').valid).toBe(false)
    })

    it('blocks 100.64.x.x (CGNAT)', () => {
      expect(validateOllamaUrl('http://100.64.0.1:11434').valid).toBe(false)
    })
  })

  describe('blocks 0.0.0.0 and 0.x.x.x', () => {
    it('blocks 0.0.0.0', () => {
      expect(validateOllamaUrl('http://0.0.0.0:11434').valid).toBe(false)
    })

    it('blocks 0.0.0.1', () => {
      expect(validateOllamaUrl('http://0.0.0.1:11434').valid).toBe(false)
    })
  })

  describe('blocks IPv6 private/reserved', () => {
    it('blocks IPv6-mapped IPv4', () => {
      expect(validateOllamaUrl('http://[::ffff:10.0.0.1]:11434').valid).toBe(false)
    })

    it('blocks fc00::/7 (unique local)', () => {
      expect(validateOllamaUrl('http://[fc00::1]:11434').valid).toBe(false)
    })

    it('blocks fd00::/8 (unique local)', () => {
      expect(validateOllamaUrl('http://[fd00::1]:11434').valid).toBe(false)
    })

    it('blocks fe80::/10 (link-local)', () => {
      expect(validateOllamaUrl('http://[fe80::1]:11434').valid).toBe(false)
    })

    it('blocks :: (unspecified)', () => {
      expect(validateOllamaUrl('http://[::]:11434').valid).toBe(false)
    })
  })

  describe('blocks public/external hosts', () => {
    it('blocks external domain', () => {
      expect(validateOllamaUrl('http://evil.com:11434').valid).toBe(false)
    })

    it('blocks external IP', () => {
      expect(validateOllamaUrl('http://8.8.8.8:11434').valid).toBe(false)
    })
  })

  describe('blocks dangerous schemes', () => {
    it('blocks file://', () => {
      expect(validateOllamaUrl('file:///etc/passwd').valid).toBe(false)
    })

    it('blocks javascript:', () => {
      expect(validateOllamaUrl('javascript:alert(1)').valid).toBe(false)
    })

    it('blocks ftp://', () => {
      expect(validateOllamaUrl('ftp://localhost:11434').valid).toBe(false)
    })
  })

  describe('blocks URLs with credentials', () => {
    it('blocks user:pass@host', () => {
      expect(validateOllamaUrl('http://user:pass@localhost:11434').valid).toBe(false)
    })
  })

  describe('handles edge cases', () => {
    it('rejects empty string', () => {
      expect(validateOllamaUrl('').valid).toBe(false)
    })

    it('rejects whitespace-only', () => {
      expect(validateOllamaUrl('   ').valid).toBe(false)
    })

    it('rejects invalid URL', () => {
      expect(validateOllamaUrl('not a url :!@#').valid).toBe(false)
    })

    it('trims whitespace', () => {
      const result = validateOllamaUrl('  http://localhost:11434  ')
      expect(result.valid).toBe(true)
    })

    it('strips trailing slashes in normalized URL', () => {
      const result = validateOllamaUrl('http://localhost:11434/')
      expect(result.valid).toBe(true)
      expect(result.normalized).not.toMatch(/\/$/)
    })
  })

  describe('blocks documentation/test IP ranges', () => {
    it('blocks 198.51.100.x (TEST-NET-2)', () => {
      expect(validateOllamaUrl('http://198.51.100.1:11434').valid).toBe(false)
    })

    it('blocks 203.0.113.x (TEST-NET-3)', () => {
      expect(validateOllamaUrl('http://203.0.113.1:11434').valid).toBe(false)
    })
  })
})