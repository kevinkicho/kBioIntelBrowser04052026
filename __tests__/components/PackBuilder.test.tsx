/**
 * PackBuilder UI — download JSON/MD + disabled Share.
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { PackBuilder } from '@/components/evidence/PackBuilder'
import { PackView } from '@/components/evidence/PackView'
import { FIXTURE_CORE_PANELS, FIXTURE_CTX } from '@/lib/evidence/fixtures/corePanels'
import { buildEvidencePack } from '@/lib/evidence'

jest.mock('@/lib/exportData', () => ({
  ...jest.requireActual('@/lib/exportData'),
  downloadFile: jest.fn(),
}))

jest.mock('@/lib/evidence/packIndex', () => ({
  ...jest.requireActual('@/lib/evidence/packIndex'),
  registerPackIndex: jest.fn(() => ({
    ok: true,
    value: {
      id: 'x',
      title: 't',
      createdAt: '',
      contentHash: '',
      claimCount: 0,
      candidateCount: 0,
    },
  })),
}))

describe('PackView', () => {
  it('renders pack title and claim count', () => {
    const pack = buildEvidencePack({
      title: 'View me',
      panels: FIXTURE_CORE_PANELS,
      extractOptions: FIXTURE_CTX,
      id: 'pack_view',
      createdAt: FIXTURE_CTX.retrievedAt,
    })
    render(<PackView pack={pack} />)
    expect(screen.getByTestId('pack-view')).toBeInTheDocument()
    expect(screen.getByText('View me')).toBeInTheDocument()
    expect(screen.getByText(/9\/200 claims/)).toBeInTheDocument()
  })
})

describe('PackBuilder', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders download actions and disabled share', () => {
    render(
      <PackBuilder
        panels={FIXTURE_CORE_PANELS}
        moleculeName="Aspirin"
        subjectCandidateId="ch:CHEMBL25"
      />,
    )
    expect(screen.getByTestId('pack-builder')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Download JSON/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Download Markdown/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Share pack/i })).toBeDisabled()
  })

  it('downloads JSON pack with claims from Core panels', () => {
    const { downloadFile } = require('@/lib/exportData')
    render(
      <PackBuilder
        panels={FIXTURE_CORE_PANELS}
        moleculeName="Aspirin"
        subjectCandidateId="ch:CHEMBL25"
        defaultTitle="Aspirin pack"
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Download JSON/i }))
    expect(downloadFile).toHaveBeenCalled()
    const [body, filename, mime] = (downloadFile as jest.Mock).mock.calls[0]
    expect(mime).toBe('application/json')
    expect(filename).toMatch(/\.json$/)
    const parsed = JSON.parse(body)
    expect(parsed.title).toBe('Aspirin pack')
    expect(parsed.claimCount).toBe(9)
    expect(parsed.claims.length).toBeLessThanOrEqual(200)
  })

  it('downloads Markdown pack', () => {
    const { downloadFile } = require('@/lib/exportData')
    render(
      <PackBuilder panels={FIXTURE_CORE_PANELS} defaultTitle="MD pack" />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Download Markdown/i }))
    const [body, filename, mime] = (downloadFile as jest.Mock).mock.calls[0]
    expect(mime).toBe('text/markdown')
    expect(filename).toMatch(/\.md$/)
    expect(body).toContain('# MD pack')
    expect(body).toContain('## Claims')
  })
})
