import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { CategoryTabs } from '@/components/profile/CategoryTabs'
import {
  MOLECULE_CATEGORIES,
  type CategoryId,
  type CategoryDataCount,
} from '@/lib/categoryConfig'

function makeCounts(overrides: Partial<Record<CategoryId, CategoryDataCount>> = {}): Record<CategoryId, CategoryDataCount> {
  const base: Record<string, CategoryDataCount> = {}
  for (const cat of MOLECULE_CATEGORIES) {
    base[cat.id] = { withData: 2, total: cat.panels.length }
  }
  return { ...base, ...overrides } as Record<CategoryId, CategoryDataCount>
}

describe('CategoryTabs', () => {
  it('renders All tab plus all molecule category tabs', () => {
    const counts = makeCounts()
    render(<CategoryTabs active="all" counts={counts} onChange={() => {}} />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(MOLECULE_CATEGORIES.length + 1) // All + molecule categories
  })

  it('shows correct total in All tab', () => {
    const counts = makeCounts({
      pharmaceutical: { withData: 3, total: 7 },
      'clinical-safety': { withData: 1, total: 6 },
    })
    const allTab = renderAndGetAllTab(counts)
    // withData sum: 3 + 1 + 2*6 = 16, total sum: 7 + 6 + panels of remaining 6 cats
    const totalWithData = Object.values(counts).reduce((s, c) => s + c.withData, 0)
    const totalAll = Object.values(counts).reduce((s, c) => s + c.total, 0)
    expect(allTab.textContent).toContain(`${totalWithData}/${totalAll}`)
  })

  it('shows counts for category tabs', () => {
    const counts = makeCounts({ pharmaceutical: { withData: 5, total: 7 } })
    render(<CategoryTabs active="all" counts={counts} onChange={() => {}} />)
    const tabs = screen.getAllByRole('tab')
    // pharmaceutical is the second tab (index 1)
    expect(tabs[1].textContent).toContain('5/7')
  })

  it('highlights active tab with bg-indigo-600', () => {
    const counts = makeCounts()
    render(<CategoryTabs active="pharmaceutical" counts={counts} onChange={() => {}} />)
    const tabs = screen.getAllByRole('tab')
    // All tab should not be active
    expect(tabs[0].className).not.toContain('bg-indigo-600')
    // pharmaceutical tab should be active
    expect(tabs[1].className).toContain('bg-indigo-600')
  })

  it('highlights All tab when active is "all"', () => {
    const counts = makeCounts()
    render(<CategoryTabs active="all" counts={counts} onChange={() => {}} />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs[0].className).toContain('bg-indigo-600')
  })

  it('calls onChange with category id on click', () => {
    const onChange = jest.fn()
    const counts = makeCounts()
    render(<CategoryTabs active="all" counts={counts} onChange={onChange} />)
    const tabs = screen.getAllByRole('tab')
    fireEvent.click(tabs[1]) // pharmaceutical
    expect(onChange).toHaveBeenCalledWith('pharmaceutical')
  })

  it('calls onChange with "all" when All tab is clicked', () => {
    const onChange = jest.fn()
    const counts = makeCounts()
    render(<CategoryTabs active="pharmaceutical" counts={counts} onChange={onChange} />)
    const tabs = screen.getAllByRole('tab')
    fireEvent.click(tabs[0])
    expect(onChange).toHaveBeenCalledWith('all')
  })

  it('dims empty 0/N category tabs with opacity-30 and no green ok dots', () => {
    const counts = makeCounts({
      'protein-structure': { withData: 0, total: 16 },
      pharmaceutical: { withData: 5, total: 11 },
    })
    render(
      <CategoryTabs
        active="all"
        counts={counts}
        onChange={() => {}}
        freshness={{
          'protein-structure': {
            status: 'loaded',
            fetchedAt: new Date(),
            health: 'ok',
          },
          pharmaceutical: {
            status: 'loaded',
            fetchedAt: new Date(),
            health: 'ok',
          },
        } as never}
      />,
    )
    const tabs = screen.getAllByRole('tab')
    // pharmaceutical is index 1 (after All)
    const pharma = tabs[1]
    const protein = tabs.find((t) => t.textContent?.includes('Protein'))
    expect(protein).toBeTruthy()
    expect(protein!.className).toContain('opacity-30')
    expect(protein!.getAttribute('data-empty')).toBe('true')
    expect(pharma.className).not.toContain('opacity-30')
    // No green health dots in the tree
    expect(document.querySelector('.bg-emerald-400')).toBeNull()
  })
})

function renderAndGetAllTab(counts: Record<CategoryId, CategoryDataCount>) {
  render(<CategoryTabs active="all" counts={counts} onChange={() => {}} />)
  return screen.getAllByRole('tab')[0]
}
