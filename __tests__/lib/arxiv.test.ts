import { searchArXiv, getArXivPaper } from '@/lib/api/arxiv'

function xmlRes(body: string, status = 200, contentType = 'application/atom+xml') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? contentType : null) },
    text: async () => body,
    json: async () => body,
  }
}

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

const ATOM = `<?xml version="1.0"?>
<feed>
<entry>
<id>http://arxiv.org/abs/1234.5678</id>
<title>Aspirin pathways</title>
<summary>A paper about aspirin.</summary>
<published>2021-01-02T00:00:00Z</published>
<updated>2021-01-03T00:00:00Z</updated>
<author><name>Smith J</name></author>
<category term="q-bio.BM" />
</entry>
</feed>`

describe('searchArXiv', () => {
  test('returns parsed papers on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(xmlRes(ATOM))
    const results = await searchArXiv('aspirin')
    expect(results).toHaveLength(1)
    expect(results[0].arxivId).toBe('1234.5678')
    expect(results[0].title).toBe('Aspirin pathways')
    expect(results[0].authors).toEqual(['Smith J'])
    expect(results[0].categories).toEqual(['q-bio.BM'])
  })

  test('true empty feed is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(xmlRes('<?xml version="1.0"?><feed></feed>'))
    expect(await searchArXiv('unknownxyz')).toEqual([])
  })

  test('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(xmlRes('', 503))
    await expect(searchArXiv('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(xmlRes('<html>nope</html>', 200, 'text/html'))
    await expect(searchArXiv('aspirin')).rejects.toThrow(/HTML/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(searchArXiv('aspirin')).rejects.toThrow(/network/)
  })
})

describe('getArXivPaper', () => {
  test('throws on HTTP 503 (not null-as-empty)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(xmlRes('', 503))
    await expect(getArXivPaper('1234.5678')).rejects.toThrow(/HTTP 503/)
  })
})