import { render, screen } from '@testing-library/react'
import { PatentsPanel } from '@/components/profile/PatentsPanel'
import type { Patent } from '@/lib/types'

const mockPatents: Patent[] = [
  {
    id: 'PAT001',
    patentNumber: 'US8114833',
    title: 'GLP-1 receptor agonists',
    filingDate: '2012-02-14',
    publicationDate: '2013-02-14',
    expirationDate: '2032-02-14',
    status: 'Active',
    assignee: 'Novo Nordisk',
    abstract: 'A compound useful for treating diabetes.',
  },
]

describe('PatentsPanel', () => {
  test('renders patent number', () => {
    render(<PatentsPanel patents={mockPatents} />)
    expect(screen.getByText('US8114833')).toBeInTheDocument()
  })

  test('renders patent title', () => {
    render(<PatentsPanel patents={mockPatents} />)
    expect(screen.getByText('GLP-1 receptor agonists')).toBeInTheDocument()
  })

  test('renders assignee', () => {
    render(<PatentsPanel patents={mockPatents} />)
    expect(screen.getByText('Novo Nordisk')).toBeInTheDocument()
  })

  test('renders empty state when no patents', () => {
    render(<PatentsPanel patents={[]} />)
    expect(screen.getByText(/no patents found/i)).toBeInTheDocument()
  })
})
