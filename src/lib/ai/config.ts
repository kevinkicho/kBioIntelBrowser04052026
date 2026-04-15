export type AIStatus = 'unknown' | 'checking' | 'available' | 'unavailable' | 'downloading' | 'error'

export interface AIConfig {
  enabled: boolean
  status: AIStatus
  model: string
  ollamaUrl: string
  availableModels: string[]
  error?: string
}

export const AI_DEFAULTS: AIConfig = {
  enabled: false,
  status: 'unknown',
  model: '',
  ollamaUrl: '',
  availableModels: [],
}

export const AI_STORAGE_KEY = 'biointel-ai-config'

export function loadAIConfig(): Partial<AIConfig> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(AI_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return {}
}

export function saveAIConfig(config: Partial<AIConfig>): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(AI_STORAGE_KEY, JSON.stringify(config))
  } catch {}
}

export function clearAIConfig(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(AI_STORAGE_KEY)
  } catch {}
}

export function normalizeOllamaUrl(url: string): string {
  let normalized = url.trim().replace(/\/+$/, '')
  if (normalized && !normalized.startsWith('http')) {
    normalized = `http://${normalized}`
  }
  return normalized
}

export function pickFirstModel(availableModels: string[]): string | null {
  if (availableModels.length > 0) return availableModels[0]
  return null
}