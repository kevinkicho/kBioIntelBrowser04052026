import { renderHook, act } from '@testing-library/react'
import { useFavorites } from '@/hooks/useFavorites'

const STORAGE_KEY = 'biointel-favorites'

beforeEach(() => {
  localStorage.clear()
})

describe('useFavorites', () => {
  it('starts with empty favorites', () => {
    const { result } = renderHook(() => useFavorites())
    expect(result.current.favorites).toEqual([])
  })

  it('toggles a favorite on', () => {
    const { result } = renderHook(() => useFavorites())

    act(() => {
      result.current.toggle(2244, 'Aspirin')
    })

    expect(result.current.favorites).toHaveLength(1)
    expect(result.current.favorites[0].cid).toBe(2244)
    expect(result.current.favorites[0].name).toBe('Aspirin')
    expect(result.current.isFavorite(2244)).toBe(true)
  })

  it('toggles a favorite off (second toggle removes it)', () => {
    const { result } = renderHook(() => useFavorites())

    act(() => {
      result.current.toggle(2244, 'Aspirin')
    })
    act(() => {
      result.current.toggle(2244, 'Aspirin')
    })

    expect(result.current.favorites).toHaveLength(0)
    expect(result.current.isFavorite(2244)).toBe(false)
  })

  it('persists to localStorage under key biointel-favorites', () => {
    const { result } = renderHook(() => useFavorites())

    act(() => {
      result.current.toggle(2244, 'Aspirin')
    })

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    expect(stored).toHaveLength(1)
    expect(stored[0].cid).toBe(2244)
    expect(stored[0].name).toBe('Aspirin')
  })

  it('reads from localStorage on mount', () => {
    const existing = [{ cid: 5988, name: 'Caffeine', addedAt: new Date().toISOString() }]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))

    const { result } = renderHook(() => useFavorites())

    expect(result.current.favorites).toHaveLength(1)
    expect(result.current.favorites[0].cid).toBe(5988)
    expect(result.current.favorites[0].name).toBe('Caffeine')
  })

  it('limits to 50 favorites (oldest removed when exceeded)', () => {
    // Pre-fill localStorage with 50 favorites
    const existing = Array.from({ length: 50 }, (_, i) => ({
      cid: i + 1,
      name: `Molecule ${i + 1}`,
      addedAt: new Date(Date.now() - (50 - i) * 1000).toISOString(),
    }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))

    const { result } = renderHook(() => useFavorites())

    act(() => {
      result.current.toggle(9999, 'New Molecule')
    })

    expect(result.current.favorites).toHaveLength(50)
    // Newest entry should be first
    expect(result.current.favorites[0].cid).toBe(9999)
    // The oldest (cid=1, last in array after prepend) should have been dropped
    expect(result.current.favorites.some(f => f.cid === 1)).toBe(false)
  })
})
