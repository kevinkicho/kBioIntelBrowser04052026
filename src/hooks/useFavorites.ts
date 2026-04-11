'use client'

import { useState, useCallback, useEffect } from 'react'

export interface FavoriteMolecule {
  cid: number
  name: string
  addedAt: string
}

const STORAGE_KEY = 'biointel-favorites'
const MAX_FAVORITES = 50

function readStorage(): FavoriteMolecule[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function writeStorage(items: FavoriteMolecule[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteMolecule[]>([])

  useEffect(() => {
    setFavorites(readStorage())
  }, [])

  const toggle = useCallback((cid: number, name: string) => {
    setFavorites(prev => {
      const exists = prev.some(f => f.cid === cid)
      let next: FavoriteMolecule[]
      if (exists) {
        next = prev.filter(f => f.cid !== cid)
      } else {
        const entry: FavoriteMolecule = { cid, name, addedAt: new Date().toISOString() }
        next = [entry, ...prev]
        // Sort newest first so slice(0, MAX) always drops the oldest
        next.sort((a, b) => b.addedAt.localeCompare(a.addedAt))
        if (next.length > MAX_FAVORITES) {
          next = next.slice(0, MAX_FAVORITES)
        }
      }
      writeStorage(next)
      return next
    })
  }, [])

  const isFavorite = useCallback((cid: number) => {
    return favorites.some(f => f.cid === cid)
  }, [favorites])

  return { favorites, toggle, isFavorite }
}
