import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { ShareButton } from '@/components/profile/ShareButton'

const writeTextMock = jest.fn().mockResolvedValue(undefined)

beforeAll(() => {
  Object.assign(navigator, {
    clipboard: { writeText: writeTextMock },
  })
})

// jsdom default origin is 'http://localhost' — assertions use this directly.
const ORIGIN = window.location.origin

beforeEach(() => {
  writeTextMock.mockClear()
  writeTextMock.mockResolvedValue(undefined)
  // jest-fetch-mock provides resetMocks; guard for safety
  if (typeof (global as unknown as { fetch: { resetMocks?: () => void } }).fetch.resetMocks === 'function') {
    ;(global as unknown as { fetch: { resetMocks: () => void } }).fetch.resetMocks()
  }
})

describe('ShareButton', () => {
  const baseProps = {
    entityType: 'molecule' as const,
    entityId: 2244,
    entityName: 'Aspirin',
    data: { companies: [{ brandName: 'Bayer' }] },
  }

  it('renders the Share button', () => {
    render(<ShareButton {...baseProps} />)
    expect(screen.getByRole('button', { name: /Share/i })).toBeInTheDocument()
  })

  it('opens dropdown with copy options on click', () => {
    render(<ShareButton {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /Share/i }))
    expect(screen.getByText('Copy link')).toBeInTheDocument()
    expect(screen.getByText('Copy snapshot link')).toBeInTheDocument()
    expect(screen.getByText('Copy embed snippet')).toBeInTheDocument()
  })

  it('copies the canonical URL when "Copy link" is clicked', async () => {
    render(<ShareButton {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /Share/i }))
    await act(async () => {
      fireEvent.click(screen.getByText('Copy link'))
    })
    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(`${ORIGIN}/molecule/2244`)
    })
    expect(await screen.findByText(/Link copied/i)).toBeInTheDocument()
  })

  it('POSTs to /api/snapshot and copies the snapshot URL on success', async () => {
    const fetchMock = global.fetch as unknown as jest.Mock & {
      mockResponseOnce?: (body: string) => void
    }
    if (typeof fetchMock.mockResponseOnce === 'function') {
      fetchMock.mockResponseOnce(JSON.stringify({ id: 'snap_abc123' }))
    } else {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'snap_abc123' }),
      } as Response)
    }

    render(<ShareButton {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /Share/i }))
    await act(async () => {
      fireEvent.click(screen.getByText('Copy snapshot link'))
    })

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/snapshot',
        expect.objectContaining({
          method: 'POST',
          headers: { 'content-type': 'application/json' },
        }),
      )
    })

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(
        `${ORIGIN}/molecule/2244?snapshot=snap_abc123`,
      )
    })
    expect(await screen.findByText(/Snapshot link copied/i)).toBeInTheDocument()
  })

  it('shows an error state when /api/snapshot fails', async () => {
    const fetchMock = global.fetch as unknown as jest.Mock & {
      mockResponseOnce?: (body: string, init?: { status: number }) => void
    }
    if (typeof fetchMock.mockResponseOnce === 'function') {
      fetchMock.mockResponseOnce('boom', { status: 500 })
    } else {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      } as Response)
    }

    render(<ShareButton {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /Share/i }))
    await act(async () => {
      fireEvent.click(screen.getByText('Copy snapshot link'))
    })

    // Both the button label and an alert show "Snapshot failed" — assert the alert role specifically
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toMatch(/Snapshot failed/i)
    // navigator.clipboard.writeText must NOT have been called for the snapshot URL
    expect(writeTextMock).not.toHaveBeenCalledWith(
      expect.stringContaining('snapshot='),
    )
  })

  it('copies an iframe embed snippet for molecule entities', async () => {
    render(<ShareButton {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /Share/i }))
    await act(async () => {
      fireEvent.click(screen.getByText('Copy embed snippet'))
    })
    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(
        expect.stringContaining(
          `<iframe src="${ORIGIN}/embed/molecule/2244?panels=summary,structure"`,
        ),
      )
    })
  })

  it('hides the embed snippet option for non-molecule entities', () => {
    render(
      <ShareButton entityType="gene" entityId="BRCA1" entityName="BRCA1" data={{}} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Share/i }))
    expect(screen.queryByText('Copy embed snippet')).not.toBeInTheDocument()
    expect(screen.getByText('Copy link')).toBeInTheDocument()
  })
})
