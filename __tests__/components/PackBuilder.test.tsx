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

jest.mock('@/components/evidence/PackAiPanel', () => ({
  PackAiPanel: () => null,
}))

describe('PackBuilder landscape mode', () => {
  it('exposes landscape mode toggle when extracting from panels', () => {
    render(
      <PackBuilder
        panels={FIXTURE_CORE_PANELS}
        defaultTitle="Test pack"
        moleculeName="Aspirin"
      />,
    )
    const toggle = screen.getByTestId('pack-landscape-mode')
    expect(toggle).toBeInTheDocument()
    const checkbox = toggle.querySelector('input[type="checkbox"]') as HTMLInputElement
    expect(checkbox).toBeTruthy()
    expect(checkbox.checked).toBe(false)
    fireEvent.click(checkbox)
    expect(checkbox.checked).toBe(true)
  })
})

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

  it('deep-links source, disease, and claim-type chips', () => {
    const pack = buildEvidencePack({
      title: 'Linked pack',
      panels: FIXTURE_CORE_PANELS,
      extractOptions: FIXTURE_CTX,
      id: 'pack_links',
      createdAt: FIXTURE_CTX.retrievedAt,
      disease: {
        id: 'EFO_0001360',
        idNamespace: 'efo',
        name: 'type 2 diabetes mellitus',
        synonyms: [],
        therapeuticAreas: [],
        xrefs: [],
        identityTrust: 'medium',
      },
      candidates: [
        {
          candidateId: 'ch:CHEMBL25',
          identity: {
            name: 'Aspirin',
            pubchemCid: 2244,
            chemblId: 'CHEMBL25',
            synonyms: [],
            identityTrust: 'high',
          },
          origins: ['chembl-activity'],
          evidenceBreadthSources: ['ChEMBL'],
          links: [],
        },
      ],
    })
    render(<PackView pack={pack} />)

    const disease = screen.getByTestId('pack-disease-chip')
    expect(disease.tagName).toBe('A')
    expect(disease).toHaveAttribute(
      'href',
      expect.stringContaining('platform.opentargets.org/disease/'),
    )

    const sourceChips = screen.getAllByTestId('pack-source-chip')
    expect(sourceChips.length).toBeGreaterThan(0)
    expect(sourceChips.some((el) => el.tagName === 'A' && el.getAttribute('href'))).toBe(true)

    const typeChips = screen.getAllByTestId('pack-claim-type-chip')
    expect(typeChips.length).toBeGreaterThan(0)
    expect(typeChips.some((el) => el.tagName === 'A' && el.getAttribute('href'))).toBe(true)
  })

  it('compact mode deep-links claim-type summary chips', () => {
    const pack = buildEvidencePack({
      title: 'Compact',
      panels: FIXTURE_CORE_PANELS,
      extractOptions: FIXTURE_CTX,
      candidates: [
        {
          candidateId: 'ch:CHEMBL25',
          identity: {
            name: 'Aspirin',
            pubchemCid: 2244,
            chemblId: 'CHEMBL25',
            synonyms: [],
            identityTrust: 'high',
          },
          origins: [],
          evidenceBreadthSources: [],
          links: [],
        },
      ],
    })
    render(<PackView pack={pack} compact />)
    const chips = screen.getAllByTestId('pack-claim-type-summary-chip')
    expect(chips.length).toBeGreaterThan(0)
    expect(chips.some((el) => el.tagName === 'A')).toBe(true)
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
