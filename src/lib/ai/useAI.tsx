'use client'

/**
 * AI provider — Ollama Cloud only.
 * Browser → same-origin `/api/ai/*` → https://ollama.com (user API key).
 * Local 11434 / browser→loopback paths removed.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import {
  AI_DEFAULTS,
  loadAIConfig,
  saveAIConfig,
  pickFirstModel,
  type AIConfig,
  type AIStatus,
} from './config'
import {
  clearLocalOllamaApiKey,
  loadLocalOllamaApiKey,
  saveLocalOllamaApiKey,
} from './userApiKey'
import { getSignedInUid } from '@/lib/firebase/aiDataSync'
import { pushAiSettings, syncAiSettings } from '@/lib/firebase/aiSettingsSync'
import { getOllamaCloudBase } from './cloudConfig'

/** Always Ollama Cloud (product: no local host config). */
export const OLLAMA_CLOUD_URL = 'https://ollama.com'

/** Transport is always server-side proxy for Cloud. Kept for API compatibility. */
export type AITransport = 'server'

const RETRY_INTERVAL_MS = 15000
const RETRY_MAX_ATTEMPTS = 20

export interface ModelInfo {
  contextLength: number | null
  parameterSize: string | null
  family: string | null
  quantizationLevel: string | null
  format: string | null
  sizeBytes: number | null
}

interface AIContextValue extends AIConfig {
  mounted: boolean
  modelInfo: ModelInfo | null
  transport: AITransport
  ollamaApiKey: string
  hasUserApiKey: boolean
  setOllamaApiKey: (key: string) => Promise<void>
  clearOllamaApiKey: () => Promise<void>
  /** Connect to Ollama Cloud with the user's stored API key. */
  connect: () => Promise<void>
  disconnect: () => void
  selectModel: (model: string) => void
  pullModel: (model: string) => Promise<{ success: boolean; error?: string }>
  pullProgress: { status: string; progress: number } | null
  askAI: (
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  ) => AsyncGenerator<string, void, unknown>
}

const AIContext = createContext<AIContextValue | null>(null)

export function useAI(): AIContextValue {
  const ctx = useContext(AIContext)
  if (!ctx) throw new Error('useAI must be used within AIProvider')
  return ctx
}

function cloudBase(): string {
  try {
    return getOllamaCloudBase() || OLLAMA_CLOUD_URL
  } catch {
    return OLLAMA_CLOUD_URL
  }
}

/** Migrate any saved local/tunnel URL to cloud. */
function normalizeSavedUrl(url: string | undefined): string {
  if (!url?.trim()) return cloudBase()
  const u = url.trim().toLowerCase()
  if (u.includes('ollama.com')) return cloudBase()
  // Drop local/LAN/tunnel — product is cloud-only
  return cloudBase()
}

async function checkCloudHealth(ollamaApiKey?: string): Promise<{
  available: boolean
  models: string[]
  error?: string
  usingUserKey?: boolean
  effectiveUrl?: string
}> {
  try {
    const res = await fetch('/api/ai/health', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ollamaUrl: cloudBase(),
        ...(ollamaApiKey ? { ollamaApiKey } : {}),
      }),
    })
    if (!res.ok) {
      return { available: false, models: [], error: `Server returned ${res.status}` }
    }
    const data = await res.json()
    return {
      available: Boolean(data.available),
      models: data.models ?? [],
      error: data.error,
      usingUserKey: Boolean(data.usingUserKey),
      effectiveUrl:
        typeof data.ollamaUrl === 'string' && data.ollamaUrl.length > 0
          ? data.ollamaUrl
          : cloudBase(),
    }
  } catch (err) {
    return {
      available: false,
      models: [],
      error: err instanceof Error ? err.message : 'Connection failed',
    }
  }
}

const EMPTY_MODEL_INFO: ModelInfo = {
  contextLength: null,
  parameterSize: null,
  family: null,
  quantizationLevel: null,
  format: null,
  sizeBytes: null,
}

async function fetchModelInfo(
  modelName: string,
  ollamaApiKey?: string,
): Promise<ModelInfo> {
  try {
    const res = await fetch('/api/ai/show', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ollamaUrl: cloudBase(),
        name: modelName,
        ...(ollamaApiKey ? { ollamaApiKey } : {}),
      }),
    })
    if (!res.ok) return EMPTY_MODEL_INFO
    const data = await res.json()
    if (!data.available && data.error) return EMPTY_MODEL_INFO
    const info = data.model_info ?? data.details ?? {}
    const ctxLen =
      (info as { context_length?: number; num_ctx?: number }).context_length ??
      (info as { num_ctx?: number }).num_ctx ??
      null
    return {
      contextLength: typeof ctxLen === 'number' ? ctxLen : null,
      parameterSize:
        (data.details as { parameter_size?: string } | undefined)?.parameter_size ??
        (info as { parameter_size?: string }).parameter_size ??
        null,
      family:
        (data.details as { family?: string } | undefined)?.family ??
        (info as { family?: string }).family ??
        null,
      quantizationLevel:
        (data.details as { quantization_level?: string } | undefined)?.quantization_level ??
        (info as { quantization_level?: string }).quantization_level ??
        null,
      format:
        (data.details as { format?: string } | undefined)?.format ??
        (info as { format?: string }).format ??
        null,
      sizeBytes: data.size ?? (info as { size?: number }).size ?? null,
    }
  } catch {
    return EMPTY_MODEL_INFO
  }
}

export function AIProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AIConfig>({
    ...AI_DEFAULTS,
    ollamaUrl: cloudBase(),
  })
  const [mounted, setMounted] = useState(false)
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null)
  const [ollamaApiKey, setOllamaApiKeyState] = useState('')
  const [pullProgress, setPullProgress] = useState<{
    status: string
    progress: number
  } | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const retryCountRef = useRef(0)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const healthInProgressRef = useRef(false)
  const apiKeyRef = useRef('')

  useEffect(() => {
    const saved = loadAIConfig()
    if (saved && Object.keys(saved).length > 0) {
      const ollamaUrl = normalizeSavedUrl(saved.ollamaUrl)
      console.log('[ai] Restoring saved config:', {
        model: saved.model,
        ollamaUrl,
        enabled: saved.enabled,
      })
      setConfig((prev) => ({
        ...prev,
        ...saved,
        ollamaUrl,
      }))
    }
    const key = loadLocalOllamaApiKey()
    setOllamaApiKeyState(key)
    apiKeyRef.current = key
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const uid = getSignedInUid()
    if (!uid) return
    void syncAiSettings(uid).then(() => {
      const key = loadLocalOllamaApiKey()
      setOllamaApiKeyState(key)
      apiKeyRef.current = key
    })
  }, [mounted])

  const reconnect = useCallback(async () => {
    if (healthInProgressRef.current) return
    if (!apiKeyRef.current?.trim()) {
      setConfig((prev) => ({
        ...prev,
        ollamaUrl: cloudBase(),
        status: 'unavailable' as AIStatus,
        error: 'Add your Ollama Cloud API key in AI settings to connect.',
        statusNote: undefined,
      }))
      return
    }
    healthInProgressRef.current = true
    console.log('[ai] Checking Ollama Cloud connection')
    setConfig((prev) => ({ ...prev, status: 'checking' as AIStatus, ollamaUrl: cloudBase() }))

    try {
      const result = await checkCloudHealth(apiKeyRef.current)
      if (result.available) {
        const model = config.model || pickFirstModel(result.models) || ''
        const effectiveUrl = result.effectiveUrl || cloudBase()
        console.log(
          `[ai] Connected to Ollama Cloud | models: [${result.models.join(', ')}] | using: ${model || 'none'}`,
        )
        setConfig((prev) => ({
          ...prev,
          ollamaUrl: effectiveUrl,
          status: model ? ('available' as AIStatus) : ('unavailable' as AIStatus),
          availableModels: result.models,
          model: model || prev.model,
          error: model
            ? undefined
            : 'No models available on Ollama Cloud for this key. Pull or pick a cloud model.',
          statusNote: model ? 'Using Ollama Cloud with your API key' : undefined,
        }))
        if (model) {
          const info = await fetchModelInfo(model, apiKeyRef.current)
          setModelInfo(info)
        }
      } else {
        console.warn('[ai] Ollama Cloud unavailable:', result.error)
        setConfig((prev) => ({
          ...prev,
          ollamaUrl: cloudBase(),
          status: 'unavailable' as AIStatus,
          availableModels: [],
          error:
            result.error ||
            'Cannot connect to Ollama Cloud. Check your API key and try again.',
          statusNote: undefined,
        }))
        setModelInfo(null)
      }
    } catch (err) {
      console.error('[ai] Health check error:', err)
      setConfig((prev) => ({
        ...prev,
        status: 'error' as AIStatus,
        error: err instanceof Error ? err.message : 'Failed to check Ollama Cloud',
        statusNote: undefined,
      }))
      setModelInfo(null)
    } finally {
      healthInProgressRef.current = false
    }
  }, [config.model])

  useEffect(() => {
    if (!mounted) return

    if (config.status === 'unavailable' || config.status === 'error') {
      if (retryCountRef.current < RETRY_MAX_ATTEMPTS) {
        const delay = RETRY_INTERVAL_MS + Math.min(retryCountRef.current * 2000, 30000)
        console.log(
          `[ai] Will retry in ${delay / 1000}s (attempt ${retryCountRef.current + 1}/${RETRY_MAX_ATTEMPTS})`,
        )
        retryTimerRef.current = setTimeout(() => {
          retryCountRef.current++
          void reconnect()
        }, delay)
      }
    }

    if (config.status === 'available') {
      retryCountRef.current = 0
    }

    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current)
        retryTimerRef.current = null
      }
    }
  }, [mounted, config.status]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!config.enabled && config.status === 'available') {
      setConfig((prev) => ({ ...prev, enabled: true }))
    }
  }, [config.status]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mounted) return
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { status: _status, ...toSave } = config
    saveAIConfig({ ...toSave, ollamaUrl: cloudBase() })
  }, [mounted, config])

  const setOllamaApiKey = useCallback(async (key: string) => {
    const t = key.trim()
    saveLocalOllamaApiKey(t)
    setOllamaApiKeyState(t)
    apiKeyRef.current = t
    const uid = getSignedInUid()
    if (uid) {
      try {
        await pushAiSettings(uid, t)
      } catch (err) {
        console.warn(
          '[ai] Failed to sync API key to Firestore',
          err instanceof Error ? err.message : err,
        )
      }
    }
  }, [])

  const clearOllamaApiKeyFn = useCallback(async () => {
    clearLocalOllamaApiKey()
    setOllamaApiKeyState('')
    apiKeyRef.current = ''
    const uid = getSignedInUid()
    if (uid) {
      try {
        await pushAiSettings(uid, '')
      } catch {
        /* ignore */
      }
    }
  }, [])

  const connect = useCallback(async () => {
    if (!apiKeyRef.current?.trim()) {
      setConfig((prev) => ({
        ...prev,
        ollamaUrl: cloudBase(),
        status: 'unavailable' as AIStatus,
        error:
          'Add your Ollama Cloud API key first (AI settings). Keys are per-user — not stored in server .env.',
        statusNote: undefined,
      }))
      return
    }
    retryCountRef.current = 0
    setConfig((prev) => ({
      ...prev,
      ollamaUrl: cloudBase(),
      status: 'checking' as AIStatus,
      error: undefined,
      statusNote: undefined,
    }))

    const result = await checkCloudHealth(apiKeyRef.current)
    if (result.available) {
      const model = pickFirstModel(result.models) || ''
      const effectiveUrl = result.effectiveUrl || cloudBase()
      console.log(
        `[ai] Connected to Ollama Cloud | models: [${result.models.join(', ')}] | using: ${model || 'none'}`,
      )
      setConfig((prev) => ({
        ...prev,
        ollamaUrl: effectiveUrl,
        status: model ? ('available' as AIStatus) : ('unavailable' as AIStatus),
        availableModels: result.models,
        model: model || prev.model,
        enabled: model ? true : prev.enabled,
        error: model
          ? undefined
          : 'No models available on Ollama Cloud for this key.',
        statusNote: model ? 'Using Ollama Cloud with your API key' : undefined,
      }))
      if (model) {
        const info = await fetchModelInfo(model, apiKeyRef.current)
        setModelInfo(info)
      }
    } else {
      setConfig((prev) => ({
        ...prev,
        ollamaUrl: cloudBase(),
        status: 'unavailable' as AIStatus,
        availableModels: [],
        error:
          result.error ||
          'Cannot connect to Ollama Cloud. Check your API key at ollama.com/settings/keys.',
        statusNote: undefined,
      }))
      setModelInfo(null)
    }
  }, [])

  const disconnect = useCallback(() => {
    console.log('[ai] Disconnecting')
    abortRef.current?.abort()
    retryCountRef.current = 0
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }
    setConfig((prev) => ({
      ...prev,
      enabled: false,
      status: 'unknown' as AIStatus,
      availableModels: [],
      error: undefined,
      statusNote: undefined,
      ollamaUrl: cloudBase(),
    }))
    setModelInfo(null)
  }, [])

  const selectModel = useCallback(
    (model: string) => {
      console.log('[ai] Selecting model:', model)
      setConfig((prev) => ({ ...prev, model }))
      void fetchModelInfo(model, apiKeyRef.current || undefined).then(setModelInfo)
    },
    [],
  )

  const pullModelFn = useCallback(
    async (model: string): Promise<{ success: boolean; error?: string }> => {
      console.log('[ai] Starting model pull:', model)
      setConfig((prev) => ({ ...prev, status: 'downloading' as AIStatus }))
      setPullProgress({ status: 'starting', progress: 0 })

      try {
        const res = await fetch('/api/ai/pull', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            ollamaUrl: cloudBase(),
            ...(apiKeyRef.current ? { ollamaApiKey: apiKeyRef.current } : {}),
          }),
        })

        if (!res.ok || !res.body) {
          const text = await res.text().catch(() => 'Pull failed')
          setConfig((prev) => ({
            ...prev,
            status: 'error' as AIStatus,
            error: `Pull failed: ${res.status}`,
          }))
          setPullProgress(null)
          return { success: false, error: text }
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.trim()) continue
            try {
              const parsed = JSON.parse(line)
              if (parsed.status === 'success') {
                setPullProgress(null)
                await reconnect()
                return { success: true }
              }
              if (parsed.status === 'error') {
                setConfig((prev) => ({
                  ...prev,
                  status: 'error' as AIStatus,
                  error: parsed.error,
                }))
                setPullProgress(null)
                return { success: false, error: parsed.error }
              }
              if (parsed.status) {
                setPullProgress({
                  status: parsed.status,
                  progress: parsed.progress ?? -1,
                })
              }
            } catch {
              /* skip */
            }
          }
        }

        setPullProgress(null)
        await reconnect()
        return { success: true }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        setConfig((prev) => ({
          ...prev,
          status: 'error' as AIStatus,
          error: message,
        }))
        setPullProgress(null)
        return { success: false, error: message }
      }
    },
    [reconnect],
  )

  const askAI = useCallback(
    async function* (
      messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
    ): AsyncGenerator<string, void, unknown> {
      const modelToUse = config.model || pickFirstModel(config.availableModels)
      if (!modelToUse) {
        yield '[Error: No model selected. Connect to Ollama Cloud and select a model.]'
        return
      }
      console.log(
        `[ai-chat] Sending chat | model: ${modelToUse} | messages: ${messages.length} | transport: server (cloud)`,
      )

      const controller = new AbortController()
      abortRef.current = controller

      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: modelToUse,
            messages,
            ollamaUrl: cloudBase(),
            ...(apiKeyRef.current ? { ollamaApiKey: apiKeyRef.current } : {}),
          }),
          signal: controller.signal,
        })

        if (!res.ok || !res.body) {
          const text = await res.text().catch(() => 'Chat request failed')
          console.error('[ai] Chat HTTP error:', res.status, text)
          yield `[Error: ${res.status}]`
          return
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.trim()) continue
            try {
              const parsed = JSON.parse(line)
              if (parsed.token) yield parsed.token
              if (parsed.error) {
                yield `[Error: ${parsed.error}]`
                return
              }
              if (parsed.done) return
            } catch {
              /* skip */
            }
          }
        }
      } catch (err) {
        if (controller.signal.aborted) return
        yield `[Error: ${err instanceof Error ? err.message : String(err)}]`
      }
    },
    [config.model, config.availableModels],
  )

  const value: AIContextValue = {
    ...config,
    ollamaUrl: config.ollamaUrl || cloudBase(),
    mounted,
    modelInfo,
    transport: 'server',
    ollamaApiKey,
    hasUserApiKey: Boolean(ollamaApiKey.trim()),
    setOllamaApiKey,
    clearOllamaApiKey: clearOllamaApiKeyFn,
    connect,
    disconnect,
    selectModel,
    pullModel: pullModelFn,
    pullProgress,
    askAI,
  }

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>
}
