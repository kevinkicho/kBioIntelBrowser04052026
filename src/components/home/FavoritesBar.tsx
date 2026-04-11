'use client'

import { useState, useEffect } from 'react'
import { useFavorites } from '@/hooks/useFavorites'

export function FavoritesBar() {
  const { favorites } = useFavorites()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || favorites.length === 0) return null

  return (
    <div className="w-full max-w-2xl mt-6">
      <p className="text-xs text-slate-600 uppercase tracking-wider mb-2">Favorites</p>
      <div className="flex flex-wrap gap-2">
        {favorites.map(f => (
          <a
            key={f.cid}
            href={`/molecule/${f.cid}`}
            className="text-sm text-red-400 hover:text-red-300 bg-red-900/20 border border-red-800/40 px-3 py-1 rounded-full transition-colors flex items-center gap-1"
          >
            <span className="text-xs">♥</span> {f.name}
          </a>
        ))}
      </div>
    </div>
  )
}

