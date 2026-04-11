'use client'

import { useState, useEffect } from 'react'
import { useFavorites } from '@/hooks/useFavorites'

interface Props {
  cid: number
  name: string
}

export function FavoriteButton({ cid, name }: Props) {
  const { toggle, isFavorite } = useFavorites()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Always render unfavorited on server/first render to match SSR output
  const favorited = mounted ? isFavorite(cid) : false

  return (
    <button
      onClick={() => toggle(cid, name)}
      aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
      className={`text-2xl transition-colors ${favorited ? 'text-red-400 hover:text-red-300' : 'text-slate-500 hover:text-red-400'}`}
    >
      {favorited ? '♥' : '♡'}
    </button>
  )
}

