import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { GuidedTour } from '@/components/home/GuidedTour'
import {
  DISCOVERY_PREFS_STORAGE_KEY,
  DEFAULT_DISCOVERY_PREFERENCES,
} from '@/lib/discovery/preferences'

beforeEach(() => {
  localStorage.clear()
})

describe('GuidedTour', () => {
  it('renders disease examples when searchType is disease (default tour set mixed)', async () => {
    render(<GuidedTour searchType="disease" />)
    await waitFor(() => {
      expect(screen.getByText(/Try a disease example/i)).toBeInTheDocument()
    })
    expect(screen.getByText('ATTR amyloidosis')).toBeInTheDocument()
    expect(screen.getByText('Type 2 diabetes')).toBeInTheDocument()
  })

  it('hides when searchType is not disease', async () => {
    render(<GuidedTour searchType="name" />)
    await waitFor(() => {
      expect(screen.queryByText(/Try a disease example/i)).not.toBeInTheDocument()
    })
  })

  it('hides when previously dismissed', async () => {
    localStorage.setItem('guided-tour-dismissed', '1')
    render(<GuidedTour searchType="disease" />)
    await waitFor(() => {
      expect(screen.queryByText(/Try a disease example/i)).not.toBeInTheDocument()
    })
  })

  it('gear switches to rare-only and persists tourExampleSet', async () => {
    render(<GuidedTour searchType="disease" />)
    await waitFor(() => {
      expect(screen.getByText('ATTR amyloidosis')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText(/Example set settings/i))
    fireEvent.click(screen.getByRole('menuitemradio', { name: /Rare-only/i }))

    await waitFor(() => {
      expect(screen.getByText('Gaucher disease')).toBeInTheDocument()
      expect(screen.getByText('SMA')).toBeInTheDocument()
    })
    // common-only NSCLC should not appear in rare-only set cards as Type 2 diabetes
    expect(screen.queryByText('Type 2 diabetes')).not.toBeInTheDocument()

    const raw = localStorage.getItem(DISCOVERY_PREFS_STORAGE_KEY)
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw!)
    expect(parsed.tourExampleSet).toBe('rare-only')
  })

  it('loads tourExampleSet from existing prefs', async () => {
    localStorage.setItem(
      DISCOVERY_PREFS_STORAGE_KEY,
      JSON.stringify({
        ...DEFAULT_DISCOVERY_PREFERENCES,
        tourExampleSet: 'common-only',
        updatedAt: new Date().toISOString(),
      }),
    )
    render(<GuidedTour searchType="disease" />)
    await waitFor(() => {
      expect(screen.getByText('Hypertension')).toBeInTheDocument()
    })
    expect(screen.queryByText('ATTR amyloidosis')).not.toBeInTheDocument()
  })

  it('dismiss button hides tour', async () => {
    render(<GuidedTour searchType="disease" />)
    await waitFor(() => {
      expect(screen.getByText(/Try a disease example/i)).toBeInTheDocument()
    })
    fireEvent.click(screen.getByLabelText(/Dismiss tour/i))
    expect(screen.queryByText(/Try a disease example/i)).not.toBeInTheDocument()
    expect(localStorage.getItem('guided-tour-dismissed')).toBe('1')
  })
})
