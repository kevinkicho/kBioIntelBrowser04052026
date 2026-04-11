'use client'

import { useState, useEffect } from 'react'

export function ScrollToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 500)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-6 right-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg transition-colors z-50"
      aria-label="scroll to top"
    >
      ↑
    </button>
  )
}
