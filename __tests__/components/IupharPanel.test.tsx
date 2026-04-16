import { render, screen } from '@testing-library/react'
import { IupharPanel } from '@/components/profile/IupharPanel'
import type { PharmacologyTarget } from '@/lib/types'

const mockTargets: PharmacologyTarget[] = [
  {
    targetId: 'T001',
    targetName: 'GLP1R',
    ligandName: 'Exendin-4',
    actionType: 'agonist',
    type: 'agonist',
    affinity: 0.52,
    affinityUnit: 'nM',
    species: 'Human',
    primaryTarget: true,
    url: 'https://www.guidetopharmacology.org/GRAC/LigandDisplayForward?ligandId=7314',
  },
  {
    targetId: 'T002',
    targetName: 'GLP2R',
    ligandName: 'Exendin-4',
    actionType: 'antagonist',
    type: 'antagonist',
    affinity: 120,
    affinityUnit: 'nM',
    species: 'Mouse',
    primaryTarget: false,
    url: 'https://www.guidetopharmacology.org/GRAC/LigandDisplayForward?ligandId=7314',
  },
  {
    targetId: 'T003',
    targetName: 'DPPIV',
    ligandName: 'Sitagliptin',
    actionType: 'inhibitor',
    type: 'inhibitor',
    affinity: 45,
    affinityUnit: 'nM',
    species: 'Human',
    primaryTarget: false,
    url: 'https://www.guidetopharmacology.org/GRAC/LigandDisplayForward?ligandId=7314',
  },
]

describe('IupharPanel', () => {
  test('renders target name', () => {
    render(<IupharPanel targets={mockTargets} />)
    const link = screen.getByRole('link', { name: /GLP1R/ })
    expect(link).toBeInTheDocument()
  })

  test('renders affinity value', () => {
    render(<IupharPanel targets={mockTargets} />)
    const affinityValues = screen.getAllByText(/0.52|120|45/)
    expect(affinityValues.length).toBeGreaterThan(0)
  })

  test('renders species', () => {
    render(<IupharPanel targets={mockTargets} />)
    expect(screen.getAllByText('Human').length).toBeGreaterThan(0)
  })

  test('renders agonist type badge with emerald color', () => {
    render(<IupharPanel targets={mockTargets} />)
    const badges = screen.getAllByText(/agonist|antagonist|inhibitor/)
    const agonistBadge = badges.find(badge => badge.textContent === 'agonist')
    expect(agonistBadge?.className).toMatch(/emerald/)
  })

  test('renders antagonist type badge with rose color', () => {
    render(<IupharPanel targets={mockTargets} />)
    const badges = screen.getAllByText(/agonist|antagonist|inhibitor/)
    const antagonistBadge = badges.find(badge => badge.textContent === 'antagonist')
    expect(antagonistBadge?.className).toMatch(/rose/)
  })

  test('renders inhibitor type badge with amber color', () => {
    render(<IupharPanel targets={mockTargets} />)
    const badges = screen.getAllByText(/agonist|antagonist|inhibitor/)
    const inhibitorBadge = badges.find(badge => badge.textContent === 'inhibitor')
    expect(inhibitorBadge?.className).toMatch(/amber/)
  })

  test('renders Primary Target badge for primary targets', () => {
    render(<IupharPanel targets={mockTargets} />)
    expect(screen.getByText('Primary Target')).toBeInTheDocument()
  })

  test('renders empty state when no targets', () => {
    render(<IupharPanel targets={[]} />)
    expect(screen.getByText(/no pharmacology targets found/i)).toBeInTheDocument()
  })

  test('renders link to IUPHAR page', () => {
    render(<IupharPanel targets={mockTargets} />)
    const links = screen.getAllByRole('link')
    expect(links.some(l => l.getAttribute('href')?.includes('guidetopharmacology.org'))).toBe(true)
  })
})
