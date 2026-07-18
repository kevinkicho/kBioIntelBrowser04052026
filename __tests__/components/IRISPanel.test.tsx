import { render, screen } from '@testing-library/react'
import { IRISPanel } from '@/components/profile/IRISPanel'
import type { IRISAssessment } from '@/lib/types'

const rich: IRISAssessment = {
  id: 'DTXSID3039242',
  chemicalName: 'Benzene',
  casNumber: '71-43-2',
  assessmentStatus: 'Final',
  lastUpdated: '',
  oralRfD: 0.004,
  oralRfDUnits: 'mg/kg-day',
  oralRfDConfidence: 'Medium',
  oralRfDDisplay: '4 x 10 ^-3 mg/kg-day',
  inhalationRfC: 0.03,
  inhalationRfCUnits: 'mg/m³',
  inhalationRfCConfidence: 'Medium',
  cancerClassification: 'Carcinogenic',
  cancerWeightOfEvidence: '',
  criticalEffects: ['Immune'],
  organsAffected: ['Hematologic'],
  url: 'https://comptox.epa.gov/dashboard/chemical/details/DTXSID3039242',
  hasIrisData: true,
}

const sparse: IRISAssessment = {
  id: 'CID2244',
  chemicalName: 'Aspirin',
  casNumber: '',
  assessmentStatus: 'Development',
  lastUpdated: '',
  oralRfD: null,
  oralRfDUnits: 'mg/kg-day',
  oralRfDConfidence: 'Medium',
  inhalationRfC: null,
  inhalationRfCUnits: 'mg/m³',
  inhalationRfCConfidence: 'Medium',
  cancerClassification: 'Inadequate',
  cancerWeightOfEvidence: '',
  criticalEffects: [],
  organsAffected: [],
  url: 'https://comptox.epa.gov/dashboard/chemical/details/DTXSID5020108',
  hasIrisData: false,
}

describe('IRISPanel', () => {
  test('renders chemical name, CAS, and RfD display', () => {
    render(<IRISPanel assessments={[rich]} />)
    expect(screen.getByText('Benzene')).toBeInTheDocument()
    expect(screen.getByText('71-43-2')).toBeInTheDocument()
    expect(screen.getByText(/4 x 10 \^-3 mg\/kg-day/)).toBeInTheDocument()
    expect(screen.getByText('Carcinogenic')).toBeInTheDocument()
  })

  test('shows not available for missing CAS instead of blank', () => {
    render(<IRISPanel assessments={[sparse]} />)
    expect(screen.getByText(/not available/i)).toBeInTheDocument()
    expect(screen.getByText(/No published IRIS RfD/i)).toBeInTheDocument()
  })

  test('renders empty state', () => {
    render(<IRISPanel assessments={[]} />)
    expect(screen.getByText(/no epa iris/i)).toBeInTheDocument()
  })
})
