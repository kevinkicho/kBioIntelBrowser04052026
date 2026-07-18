import React from 'react'
import { render, screen } from '@testing-library/react'
import { CategoryTabBar } from '@/components/profile/CategoryTabBar'
import { MOLECULE_CATEGORIES, type CategoryId, type CategoryDataCount } from '@/lib/categoryConfig'
import type { FreshnessMap } from '@/lib/dataFreshness'

function makeCounts(
  overrides: Partial<Record<CategoryId, CategoryDataCount>> = {},
): Record<CategoryId, CategoryDataCount> {
  const base = {} as Record<CategoryId, CategoryDataCount>
  for (const cat of MOLECULE_CATEGORIES) {
    base[cat.id] = { withData: 2, total: cat.panels.length }
  }
  return { ...base, ...overrides }
}

describe('CategoryTabBar', () => {
  it('applies opacity-30 to empty 0/N tabs and omits green ok dots', () => {
    const counts = makeCounts({
      'protein-structure': { withData: 0, total: 16 },
      pharmaceutical: { withData: 1, total: 11 },
    })
    const freshness = {
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
    } as FreshnessMap

    render(
      <CategoryTabBar active="all" counts={counts} onChange={() => {}} freshness={freshness} />,
    )

    const protein = screen.getByTestId('category-tab-protein-structure')
    const pharma = screen.getByTestId('category-tab-pharmaceutical')

    expect(protein).toHaveAttribute('data-empty', 'true')
    expect(protein.className).toContain('opacity-30')
    expect(pharma).toHaveAttribute('data-has-data', 'true')
    expect(pharma.className).not.toContain('opacity-30')
    expect(screen.queryByTestId('tab-health-ok')).toBeNull()
    expect(document.querySelector('.bg-emerald-400')).toBeNull()
  })

  it('still shows loading and error dots when needed', () => {
    const counts = makeCounts()
    const freshness = {
      pharmaceutical: {
        status: 'loading',
        fetchedAt: null,
        health: 'loading',
      },
      'clinical-safety': {
        status: 'error',
        fetchedAt: null,
        health: 'error',
      },
    } as FreshnessMap

    render(
      <CategoryTabBar active="all" counts={counts} onChange={() => {}} freshness={freshness} />,
    )

    expect(screen.getByTestId('tab-health-loading')).toBeInTheDocument()
    expect(screen.getByTestId('tab-health-error')).toBeInTheDocument()
  })
})
