import { validateOllamaUrl, normalizeOllamaUrl, OLLAMA_DEFAULT_PORT } from '@/lib/ai/config'

describe('validateOllamaUrl', () => {
  describe('valid local URLs', () => {
    it('accepts http://localhost with port', () => {
      const result = validateOllamaUrl('http://localhost:11434')
      expect(result.valid).toBe(true)
      expect(result.normalized).toContain('localhost')
    })

    it('accepts http://127.0.0.1 with port', () => {
      const result = validateOllamaUrl('http://127.0.0.1:11434')
      expect(result.valid).toBe(true)
    })

    it('accepts localhost without protocol', () => {
      const result = validateOllamaUrl('localhost:11434')
      expect(result.valid).toBe(true)
    })

    it('accepts https://localhost with port', () => {
      const result = validateOllamaUrl('https://localhost:11434')
      expect(result.valid).toBe(true)
    })

    it('auto-appends default port when omitted', () => {
      const result = validateOllamaUrl('http://localhost')
      expect(result.valid).toBe(true)
      expect(result.normalized).toBe('http://localhost:11434')
    })

    it('auto-appends default port for 127.0.0.1 without port', () => {
      const result = validateOllamaUrl('127.0.0.1')
      expect(result.valid).toBe(true)
      expect(result.normalized).toBe('http://127.0.0.1:11434')
    })
  })

  describe('LAN hosts allowed with warning', () => {
    it('allows 192.168.x.x with lan-warning', () => {
      const result = validateOllamaUrl('http://192.168.1.50:11434')
      expect(result.valid).toBe(true)
      expect(result.warning).toBe('lan-warning')
    })

    it('allows 10.x.x.x with lan-warning', () => {
      const result = validateOllamaUrl('http://10.0.0.1:11434')
      expect(result.valid).toBe(true)
      expect(result.warning).toBe('lan-warning')
    })

    it('allows 172.16.x.x with lan-warning', () => {
      const result = validateOllamaUrl('http://172.16.0.1:11434')
      expect(result.valid).toBe(true)
      expect(result.warning).toBe('lan-warning')
    })

    it('allows .local hostnames with lan-warning', () => {
      const result = validateOllamaUrl('http://myserver.local:11434')
      expect(result.valid).toBe(true)
      expect(result.warning).toBe('lan-warning')
    })

    it('allows external domain with lan-warning', () => {
      const result = validateOllamaUrl('http://my-server.example.com:11434')
      expect(result.valid).toBe(true)
      expect(result.warning).toBe('lan-warning')
    })
  })

  describe('blocks reserved/unsafe ranges', () => {
    it('blocks 169.254.x.x (link-local)', () => {
      expect(validateOllamaUrl('http://169.254.169.254:11434').valid).toBe(false)
    })

    it('blocks 100.64.x.x (CGNAT)', () => {
      expect(validateOllamaUrl('http://100.64.0.1:11434').valid).toBe(false)
    })

    it('blocks 127.0.0.1-style mapped IPv6', () => {
      expect(validateOllamaUrl('http://[::ffff:10.0.0.1]:11434').valid).toBe(false)
    })

    it('blocks 0.0.0.0', () => {
      expect(validateOllamaUrl('http://0.0.0.0:11434').valid).toBe(false)
    })

    it('blocks 0.0.0.1', () => {
      expect(validateOllamaUrl('http://0.0.0.1:11434').valid).toBe(false)
    })

    it('blocks fc00::/7 (unique local IPv6)', () => {
      expect(validateOllamaUrl('http://[fc00::1]:11434').valid).toBe(false)
    })

    it('blocks fd00::/8 (unique local IPv6)', () => {
      expect(validateOllamaUrl('http://[fd00::1]:11434').valid).toBe(false)
    })

    it('blocks fe80::/10 (link-local IPv6)', () => {
      expect(validateOllamaUrl('http://[fe80::1]:11434').valid).toBe(false)
    })

    it('blocks :: (unspecified IPv6)', () => {
      expect(validateOllamaUrl('http://[::]:11434').valid).toBe(false)
    })

    it('blocks 198.51.100.x (TEST-NET-2)', () => {
      expect(validateOllamaUrl('http://198.51.100.1:11434').valid).toBe(false)
    })

    it('blocks 203.0.113.x (TEST-NET-3)', () => {
      expect(validateOllamaUrl('http://203.0.113.1:11434').valid).toBe(false)
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

    it('rejects invalid port numbers', () => {
      expect(validateOllamaUrl('http://localhost:0').valid).toBe(false)
      expect(validateOllamaUrl('http://localhost:99999').valid).toBe(false)
    })
  })
})

describe('normalizeOllamaUrl', () => {
  it('prepends http:// if missing', () => {
    expect(normalizeOllamaUrl('localhost:11434')).toBe('http://localhost:11434')
  })

  it('auto-appends default port when omitted', () => {
    expect(normalizeOllamaUrl('localhost')).toBe('http://localhost:11434')
  })

  it('preserves explicit port', () => {
    expect(normalizeOllamaUrl('localhost:8080')).toBe('http://localhost:8080')
  })

  it('strips trailing slashes', () => {
    expect(normalizeOllamaUrl('http://localhost:11434/')).toBe('http://localhost:11434')
  })

  it('handles empty string', () => {
    expect(normalizeOllamaUrl('')).toBe('')
  })
})