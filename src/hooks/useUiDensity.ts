'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  loadUiDensity,
  saveUiDensity,
  type UiDensity,
} from '@/lib/uiDensity'

/**
 * Client density preference (comfortable | dense).
 * Comfortable: short preview lines + tips. Dense: labels + (i) only.
 */
export function useUiDensity(): {
  density: UiDensity
  setDensity: (mode: UiDensity) => void
  isComfortable: boolean
  isDense: boolean
} {
  const [density, setState] = useState<UiDensity>('comfortable')

  useEffect(() => {
    setState(loadUiDensity())
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'biointel-ui-density-v1' && e.newValue) {
        setState(e.newValue === 'dense' ? 'dense' : 'comfortable')
      }
    }
    const onCustom = (e: Event) => {
      const d = (e as CustomEvent).detail
      if (d === 'dense' || d === 'comfortable') setState(d)
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('biointel-ui-density', onCustom)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('biointel-ui-density', onCustom)
    }
  }, [])

  const setDensity = useCallback((mode: UiDensity) => {
    saveUiDensity(mode)
    setState(mode)
  }, [])

  return {
    density,
    setDensity,
    isComfortable: density === 'comfortable',
    isDense: density === 'dense',
  }
}
