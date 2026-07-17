'use client'

import { createContext, useContext } from 'react'
import type { CategoryId } from '@/lib/categoryConfig'
import type { CategoryApiTrace } from '@/lib/panelApiTrace'

export interface ProfilePanelContextValue {
  cid: number
  moleculeName: string
  /** Refresh parent category (panels share one multi-source category fetch). */
  refreshCategory: (categoryId: CategoryId) => void
  /** Category currently loading (for spinner). */
  loadingCategories: Set<CategoryId> | CategoryId[]
  /** API traces keyed by category id */
  categoryTraces: Partial<Record<CategoryId, CategoryApiTrace>>
  getCategoryForPanel: (panelId: string) => CategoryId | null
}

const ProfilePanelContext = createContext<ProfilePanelContextValue | null>(null)

export function ProfilePanelProvider({
  value,
  children,
}: {
  value: ProfilePanelContextValue
  children: React.ReactNode
}) {
  return (
    <ProfilePanelContext.Provider value={value}>{children}</ProfilePanelContext.Provider>
  )
}

export function useProfilePanelContext(): ProfilePanelContextValue | null {
  return useContext(ProfilePanelContext)
}

export function isCategoryLoading(
  loading: Set<CategoryId> | CategoryId[] | undefined,
  catId: CategoryId,
): boolean {
  if (!loading) return false
  if (loading instanceof Set) return loading.has(catId)
  return loading.includes(catId)
}
