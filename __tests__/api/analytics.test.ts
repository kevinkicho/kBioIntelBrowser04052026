import { POST } from '@/app/api/analytics/route'
import { recordMetric } from '@/lib/analytics/db'
import { NextRequest, NextResponse } from 'next/server'

jest.mock('@/lib/analytics/db', () => ({
  recordMetric: jest.fn().mockImplementation(() => {}),
  getSummary: jest.fn().mockReturnValue([]),
  getCategorizedSummary: jest.fn().mockReturnValue([]),
  getDetailedApiMetrics: jest.fn().mockReturnValue(null),
  getDbStatus: jest.fn().mockReturnValue({}),
}))

if (typeof Response.json !== 'function') {
  Response.json = function (body: unknown, init?: ResponseInit) {
    const headers = new Headers(init?.headers)
    headers.set('Content-Type', 'application/json')
    return new Response(JSON.stringify(body), { ...init, headers })
  }
}

const mockRecordMetric = recordMetric as jest.Mock

function makeRequest(body: unknown, ip = '127.0.0.1'): NextRequest {
  return new NextRequest('http://localhost:3000/api/analytics', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-real-ip': ip,
    },
    body: JSON.stringify(body),
  })
}

describe('POST /api/analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should record a single metric', async () => {
    const req = makeRequest({
      source: 'chembl',
      endpoint: 'https://ebi.ac.uk/chembl/api/data/molecule/CID223',
      status: 200,
      duration_ms: 150,
      has_data: true,
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(json.recorded).toBe(1)
    expect(mockRecordMetric).toHaveBeenCalledTimes(1)
    expect(mockRecordMetric).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'chembl', status: 200, duration_ms: 150 }),
    )
  })

  it('should record a batch of metrics', async () => {
    const req = makeRequest([
      { source: 'chembl', endpoint: 'https://ebi.ac.uk/chembl/1', status: 200, duration_ms: 100, has_data: true },
      { source: 'pubmed', endpoint: 'https://ncbi.nlm.nih.gov/pubmed/1', status: 200, duration_ms: 200, has_data: true },
      { source: 'pdb', endpoint: 'https://rcsb.org/pdb/1', status: 404, duration_ms: 50, has_data: false, error: 'Not found' },
    ])
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(json.recorded).toBe(3)
    expect(mockRecordMetric).toHaveBeenCalledTimes(3)
    expect(mockRecordMetric).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'chembl', duration_ms: 100 }),
    )
    expect(mockRecordMetric).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'pubmed', duration_ms: 200 }),
    )
    expect(mockRecordMetric).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'pdb', status: 404, error: 'Not found' }),
    )
  })

  it('should cap batch size at 200', async () => {
    const batch = Array.from({ length: 250 }, (_, i) => ({
      source: `source-${i}`,
      endpoint: `https://example.com/${i}`,
      status: 200,
      duration_ms: 100,
    }))

    const req = makeRequest(batch)
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.recorded).toBe(200)
    expect(mockRecordMetric).toHaveBeenCalledTimes(200)
  })

  it('should skip invalid metrics in a batch and report errors', async () => {
    const req = makeRequest([
      { source: 'chembl', endpoint: 'https://ebi.ac.uk/chembl/1', status: 200, duration_ms: 100 },
      { source: '', endpoint: 'https://ebi.ac.uk/chembl/2', status: 200, duration_ms: 100 },
      { endpoint: 'https://ebi.ac.uk/chembl/3', status: 200, duration_ms: 100 },
    ])
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(json.recorded).toBe(1)
    expect(json.errors).toHaveLength(2)
    expect(mockRecordMetric).toHaveBeenCalledTimes(1)
  })

  it('should return 400 for single metric missing required fields', async () => {
    const req = makeRequest({ source: 'test' })
    const res = await POST(req)

    expect(res.status).toBe(400)
    expect(mockRecordMetric).not.toHaveBeenCalled()
  })

  it('should truncate long source and endpoint values', async () => {
    const longSource = 'x'.repeat(200)
    const longEndpoint = 'y'.repeat(600)

    const req = makeRequest({
      source: longSource,
      endpoint: longEndpoint,
      status: 200,
      duration_ms: 100,
    })
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(mockRecordMetric).toHaveBeenCalledWith(
      expect.objectContaining({
        source: longSource.slice(0, 100),
        endpoint: longEndpoint.slice(0, 500),
      }),
    )
  })

  it('should return 429 when rate limit exceeded', async () => {
    const metric = {
      source: 'test',
      endpoint: 'https://test.com',
      status: 200,
      duration_ms: 100,
    }

    for (let i = 0; i < 121; i++) {
      await POST(makeRequest(metric, 'same-ip'))
    }

    const req = makeRequest(metric, 'same-ip')
    const res = await POST(req)

    expect(res.status).toBe(429)
  })

  it('should cap duration_ms at 600000', async () => {
    const req = makeRequest({
      source: 'test',
      endpoint: 'https://test.com',
      status: 200,
      duration_ms: 999999,
    })
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(mockRecordMetric).toHaveBeenCalledWith(
      expect.objectContaining({ duration_ms: 600000 }),
    )
  })

  it('should handle empty batch array', async () => {
    const req = makeRequest([])
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(json.recorded).toBe(0)
    expect(mockRecordMetric).not.toHaveBeenCalled()
  })
})