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
    expect(screen.getByText(/AI-synthesized insights/)).toBeInTheDocument()
  })

  it('shows Connect Ollama message when AI is unavailable', () => {
    makeAiUnavailable()
    render(<DiseaseIntelligencePanel context={baseContext} />)
    expect(screen.getByText(/Connect Ollama/)).toBeInTheDocument()
  })

  it('shows no-data message when AI is available but context is empty', () => {
    makeAiAvailable()
    render(<DiseaseIntelligencePanel context={emptyDataContext} />)
    expect(screen.getByText(/No gene, drug, or molecule data/)).toBeInTheDocument()
  })

  it('renders 3 expandable analysis cards when AI is available with data', () => {
    makeAiAvailable()
    render(<DiseaseIntelligencePanel context={baseContext} />)
    expect(screen.getByText('Drug Repurposing Opportunities')).toBeInTheDocument()
    expect(screen.getByText('Therapeutic Gap Analysis')).toBeInTheDocument()
    expect(screen.getByText('Disease-Drug Connection Map')).toBeInTheDocument()
  })

  it('handles empty data gracefully', () => {
    makeAiUnavailable()
    const { container } = render(<DiseaseIntelligencePanel context={emptyDataContext} />)
    expect(container).toBeTruthy()
    expect(screen.getByText('Disease Intelligence')).toBeInTheDocument()
  })
})