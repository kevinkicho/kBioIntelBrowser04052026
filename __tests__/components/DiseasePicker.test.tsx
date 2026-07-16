import { render, screen, fireEvent } from '@testing-library/react'
import { DiseasePicker } from '@/app/discover/components/DiseasePicker'
import type { DiseaseEntity } from '@/lib/domain/entities'

const candidates: DiseaseEntity[] = [
  {
    id: 'EFO_0000249',
    idNamespace: 'ot',
    name: 'Alzheimer disease',
    synonyms: [],
    description: 'Neurodegenerative disease of the brain',
    therapeuticAreas: ['nervous system disease'],
    xrefs: [{ system: 'Open Targets', id: 'EFO_0000249' }],
    identityTrust: 'medium',
  },
  {
    id: 'EFO_0006792',
    idNamespace: 'ot',
    name: 'late-onset Alzheimer disease',
    synonyms: [],
    therapeuticAreas: [],
    xrefs: [{ system: 'Open Targets', id: 'EFO_0006792' }],
    identityTrust: 'medium',
  },
]

describe('DiseasePicker', () => {
  it('renders multi-hit prompt and all candidates', () => {
    render(
      <DiseasePicker
        query="alzheimer"
        candidates={candidates}
        onSelect={jest.fn()}
      />,
    )

    expect(screen.getByTestId('disease-picker')).toBeInTheDocument()
    expect(screen.getByText(/Multiple diseases match/i)).toBeInTheDocument()
    expect(screen.getByText('Alzheimer disease')).toBeInTheDocument()
    expect(screen.getByText('late-onset Alzheimer disease')).toBeInTheDocument()
    expect(screen.getByText('EFO_0000249')).toBeInTheDocument()
    expect(screen.getByText('EFO_0006792')).toBeInTheDocument()
  })

  it('calls onSelect with diseaseId and entity when option clicked', () => {
    const onSelect = jest.fn()
    render(
      <DiseasePicker
        query="alzheimer"
        candidates={candidates}
        onSelect={onSelect}
      />,
    )

    fireEvent.click(screen.getByTestId('disease-option-EFO_0006792'))
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith('EFO_0006792', candidates[1])
  })

  it('calls onCancel when Cancel is clicked', () => {
    const onCancel = jest.fn()
    render(
      <DiseasePicker
        query="alzheimer"
        candidates={candidates}
        onSelect={jest.fn()}
        onCancel={onCancel}
      />,
    )

    fireEvent.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('disables options while loading', () => {
    render(
      <DiseasePicker
        query="alzheimer"
        candidates={candidates}
        onSelect={jest.fn()}
        isLoading
      />,
    )

    expect(screen.getByTestId('disease-option-EFO_0000249')).toBeDisabled()
  })
})
