import { printReport } from '@/lib/printReport'

jest.mock('@/lib/exportData', () => ({
  buildExportSections: () => [
    {
      category: 'Pharmaceutical',
      panels: [{ title: 'Companies', data: [{ name: 'Aspirin Co', value: '100' }] }],
    },
    {
      category: 'Empty Category',
      panels: [],
    },
  ],
}))

describe('printReport', () => {
  let mockPrint: jest.Mock
  let mockWindow: { location: { href: string }; onload: (() => void) | null; print: jest.Mock }
  let capturedBlob: Blob | null

  beforeEach(() => {
    mockPrint = jest.fn()
    mockWindow = { location: { href: '' }, onload: null, print: mockPrint }
    capturedBlob = null

    // Provide window global in node environment
    ;(global as Record<string, unknown>).window = {
      open: jest.fn(() => mockWindow),
    }

    // Mock Blob
    ;(global as Record<string, unknown>).Blob = class MockBlob {
      private parts: string[]
      public type: string
      constructor(parts: string[], options?: { type?: string }) {
        this.parts = parts
        this.type = options?.type ?? ''
        capturedBlob = this as unknown as Blob
      }
      getContent() { return this.parts.join('') }
    }

    // Mock URL
    ;(global as Record<string, unknown>).URL = {
      createObjectURL: jest.fn(() => 'blob:mock-url'),
      revokeObjectURL: jest.fn(),
    } as unknown as typeof URL
  })

  afterEach(() => {
    delete (global as Record<string, unknown>).window
    delete (global as Record<string, unknown>).Blob
    delete (global as Record<string, unknown>).URL
  })

  it('opens a new window targeting a blob URL', () => {
    printReport({ companies: [] }, 'Aspirin')

    expect((global as Record<string, unknown>).window).toBeDefined()
    expect(mockWindow.location.href).toBe('blob:mock-url')
    expect(((global as Record<string, unknown>).URL as { createObjectURL: jest.Mock }).createObjectURL).toHaveBeenCalled()
  })

  it('registers an onload handler that prints and revokes the blob URL', () => {
    printReport({ companies: [] }, 'Aspirin')

    expect(typeof mockWindow.onload).toBe('function')
    mockWindow.onload!()
    expect(mockPrint).toHaveBeenCalled()
    expect(((global as Record<string, unknown>).URL as { revokeObjectURL: jest.Mock }).revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('builds a blob containing the molecule name and report title', () => {
    printReport({ companies: [] }, 'Aspirin')

    expect(capturedBlob).not.toBeNull()
    const content = (capturedBlob as unknown as { getContent: () => string }).getContent()
    expect(content).toContain('Aspirin')
    expect(content).toContain('BioIntel Explorer Report')
    expect(content).toContain('Pharmaceutical')
    expect(content).toContain('Companies')
  })

  it('handles blocked popup gracefully', () => {
    ;(global as Record<string, unknown>).window = {
      open: jest.fn(() => null),
    }
    expect(() => printReport({}, 'Test')).not.toThrow()
  })
})
