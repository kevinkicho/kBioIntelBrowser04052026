import { printReport, printSummaryReport } from '@/lib/printReport'

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

jest.mock('@/lib/aiSummarizer', () => ({
  buildStructuredBrief: () => ({
    headline: 'Test headline',
    sections: [
      { title: 'Key Findings', sentiment: 'positive', emoji: '✅', bullets: ['Drug works well', '<script>alert(1)</script>'] },
    ],
  }),
}))

describe('printReport', () => {
  let mockPrint: jest.Mock
  let mockClose: jest.Mock
  let mockWrite: jest.Mock
  let writtenHtml: string

  beforeEach(() => {
    mockPrint = jest.fn()
    mockClose = jest.fn()
    mockWrite = jest.fn((html: string) => { writtenHtml = html })
    writtenHtml = ''

    const mockDoc = { open: jest.fn(), write: mockWrite, close: mockClose }

    jest.spyOn(window, 'open').mockReturnValue({
      document: mockDoc,
      print: mockPrint,
    } as unknown as Window)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('opens a new window and writes HTML via document.write', () => {
    printReport({ companies: [] }, 'Aspirin')
    expect(window.open).toHaveBeenCalled()
    expect(mockWrite).toHaveBeenCalled()
    expect(mockClose).toHaveBeenCalled()
  })

  it('writes HTML containing the molecule name and report title', () => {
    printReport({ companies: [] }, 'Aspirin')
    expect(writtenHtml).toContain('Aspirin')
    expect(writtenHtml).toContain('BioIntel Explorer')
    expect(writtenHtml).toContain('Pharmaceutical')
    expect(writtenHtml).toContain('Companies')
  })

  it('escapes HTML in table cells', () => {
    printReport({ companies: [] }, 'Aspirin')
    expect(writtenHtml).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('calls print() directly after document.close()', () => {
    printReport({ companies: [] }, 'Aspirin')
    expect(mockPrint).toHaveBeenCalled()
  })

  it('returns true when popup opens successfully', () => {
    const result = printReport({ companies: [] }, 'Aspirin')
    expect(result).toBe(true)
  })

  it('escapes HTML in molecule name', () => {
    printReport({ companies: [] }, 'Test<em>Drug</em>')
    expect(writtenHtml).toContain('Test&lt;em&gt;Drug&lt;/em&gt;')
    expect(writtenHtml).not.toContain('<em>Drug</em>')
  })

  it('handles blocked popup gracefully', () => {
    jest.spyOn(window, 'open').mockReturnValue(null)
    const result = printReport({}, 'Test')
    expect(result).toBe(false)
  })
})

describe('printSummaryReport', () => {
  let writtenHtml: string

  beforeEach(() => {
    writtenHtml = ''
    const mockDoc = {
      open: jest.fn(),
      write: jest.fn((html: string) => { writtenHtml = html }),
      close: jest.fn(),
    }

    jest.spyOn(window, 'open').mockReturnValue({
      document: mockDoc,
      print: jest.fn(),
    } as unknown as Window)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('writes HTML containing the molecule name and executive summary title', () => {
    printSummaryReport({ companies: [] }, 'Aspirin')
    expect(writtenHtml).toContain('Aspirin')
    expect(writtenHtml).toContain('Executive Summary')
  })

  it('escapes HTML in bullet text', () => {
    printSummaryReport({ companies: [] }, 'Aspirin')
    expect(writtenHtml).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('returns false when popup is blocked', () => {
    jest.spyOn(window, 'open').mockReturnValue(null)
    const result = printSummaryReport({}, 'Test')
    expect(result).toBe(false)
  })
})
