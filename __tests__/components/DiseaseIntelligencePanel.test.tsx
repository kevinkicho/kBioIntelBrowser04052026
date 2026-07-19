import { render, screen } from '@testing-library/react'
import { DiseaseIntelligencePanel } from '@/components/disease/DiseaseIntelligencePanel'
import type { DiseaseDetailContext } from '@/lib/ai/diseasePrompts'

let mockAiState: {
  mounted: boolean
  enabled: boolean
  status: string
  ollamaUrl: string
  model: string
  availableModels: string[]
  modelInfo: null
  connect: jest.Mock
  disconnect: jest.Mock
  selectModel: jest.Mock
  pullModel: jest.Mock
  pullProgress: null
  askAI: jest.Mock
  cancelAskAI: jest.Mock
  isChatStreaming: boolean
}

jest.mock('@/lib/ai/useAI', () => ({
  useAI: () => mockAiState,
}))

const baseContext: DiseaseDetailContext = {
  diseaseName: 'Alzheimer\'s Disease',
  description: 'A neurodegenerative disease',
  therapeuticAreas: ['neurology'],
  genes: [
    { geneSymbol: 'APOE', geneId: '1', source: 'DisGeNET', score: 0.95 },
  ],
  drugInterventions: [
    { name: 'Aducanumab', trialCount: 5 },
  ],
  molecules: [
    { name: 'Donepezil', cid: 3152, sources: ['Open Targets'] },
  ],
  trialSummary: { total: 42, recruiting: 8, phases: { 'Phase 3': 10 } },
}

const emptyDataContext: DiseaseDetailContext = {
  diseaseName: 'Unknown Disease',
  therapeuticAreas: [],
  genes: [],
  drugInterventions: [],
  molecules: [],
  trialSummary: { total: 0, recruiting: 0, phases: {} },
}

function makeAiUnavailable() {
  mockAiState = {
    mounted: true,
    enabled: false,
    status: 'unknown',
    ollamaUrl: '',
    model: '',
    availableModels: [],
    modelInfo: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
    selectModel: jest.fn(),
    pullModel: jest.fn(),
    pullProgress: null,
    askAI: jest.fn(),
    cancelAskAI: jest.fn(),
    isChatStreaming: false,
  }
}

function makeAiAvailable() {
  mockAiState = {
    mounted: true,
    enabled: true,
    status: 'available',
    ollamaUrl: 'http://localhost:11434',
    model: 'llama3',
    availableModels: ['llama3'],
    modelInfo: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
    selectModel: jest.fn(),
    pullModel: jest.fn(),
    pullProgress: null,
    askAI: jest.fn(),
    cancelAskAI: jest.fn(),
    isChatStreaming: false,
  }
}

describe('DiseaseIntelligencePanel', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    makeAiUnavailable()
  })

  it('renders Disease Intelligence heading', () => {
    render(<DiseaseIntelligencePanel context={baseContext} />)
    expect(screen.getByText('Disease Intelligence')).toBeInTheDocument()
  })

  it('renders subtitle', () => {
    render(<DiseaseIntelligencePanel context={baseContext} />)
    expect(screen.getByText(/Evidence-bound synthesis/)).toBeInTheDocument()
  })

  it('shows Connect Ollama message when AI is unavailable', () => {
    makeAiUnavailable()
    render(<DiseaseIntelligencePanel context={baseContext} />)
    expect(screen.getAllByText(/Connect Ollama/).length).toBeGreaterThan(0)
  })

  it('shows no-data message when AI is available but context is empty', () => {
    makeAiAvailable()
    render(<DiseaseIntelligencePanel context={emptyDataContext} />)
    expect(screen.getByText(/No gene, drug, or molecule data/)).toBeInTheDocument()
  })

  it('renders intelligence mode tabs when AI is available with data', () => {
    makeAiAvailable()
    render(<DiseaseIntelligencePanel context={baseContext} />)
    expect(screen.getByTestId('disease-intel-tabs')).toBeInTheDocument()
    expect(screen.getByTestId('disease-intel-tab-summary')).toBeInTheDocument()
    expect(screen.getByTestId('disease-intel-tab-repurposing')).toBeInTheDocument()
    expect(screen.getByTestId('disease-intel-tab-gap')).toBeInTheDocument()
    expect(screen.getByTestId('disease-intel-tab-connections')).toBeInTheDocument()
    expect(screen.getByTestId('disease-intel-tab-custom')).toBeInTheDocument()
    expect(screen.getByText('Quick Summary')).toBeInTheDocument()
  })

  it('shows empty-state Generate CTA without auto-streaming', () => {
    makeAiAvailable()
    render(<DiseaseIntelligencePanel context={baseContext} />)
    expect(screen.getByTestId('disease-intel-empty')).toBeInTheDocument()
    expect(screen.getByTestId('disease-intel-generate-empty')).toBeInTheDocument()
    expect(mockAiState.askAI).not.toHaveBeenCalled()
  })

  it('handles empty data gracefully', () => {
    makeAiUnavailable()
    const { container } = render(<DiseaseIntelligencePanel context={emptyDataContext} />)
    expect(container).toBeTruthy()
    expect(screen.getByText('Disease Intelligence')).toBeInTheDocument()
  })

  it('links to Discover with diseaseId and top gene targets', () => {
    makeAiUnavailable()
    render(
      <DiseaseIntelligencePanel
        context={{ ...baseContext, diseaseId: 'EFO_0000249' }}
      />,
    )
    const cta = screen.getByTestId('disease-intelligence-discover-cta')
    expect(cta).toHaveAttribute(
      'href',
      '/discover?q=Alzheimer%27s+Disease&diseaseId=EFO_0000249&targets=APOE',
    )
    expect(cta).toHaveTextContent(/Rank candidates in Discover/)
  })
})