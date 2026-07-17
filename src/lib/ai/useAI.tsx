'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { AI_DEFAULTS, loadAIConfig, saveAIConfig, pickFirstModel, normalizeOllamaUrl, type AIConfig, type AIStatus } from './config'
import {
  clearLocalOllamaApiKey,
  loadLocalOllamaApiKey,
  saveLocalOllamaApiKey,
} from './userApiKey'
import {
  clientCheckHealth,
  clientGenerateChat,
  clientPullModel,
  clientShowModel,
} from './clientOllama'
import {
  isLocalOrLanOllamaUrl,
  shouldUseBrowserOllama,
} from './localTransport'
import { getSignedInUid } from '@/lib/firebase/aiDataSync'
import { pushAiSettings, syncAiSettings } from '@/lib/firebase/aiSettingsSync'

/** How we reach Ollama: browser = user's PC; server = Next proxy / cloud. */
export type AITransport = 'browser' | 'server'

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
  /** browser = user's machine Ollama; server = cloud/proxy */
  transport: AITransport
  /** User's Ollama Cloud API key (never logged). Empty if unset. */
  ollamaApiKey: string
  /** True when a non-empty user key is stored. */
  hasUserApiKey: boolean
  setOllamaApiKey: (key: string) => Promise<void>
  clearOllamaApiKey: () => Promise<void>
  connect: (url: string) => Promise<void>
  disconnect: () => void
  selectModel: (model: string) => void
  pullModel: (model: string) => Promise<{ success: boolean; error?: string }>
  pullProgress: { status: string; progress: number } | null
  askAI: (messages: { role: 'system' | 'user' | 'assistant'; content: string }[]) => AsyncGenerator<string, void, unknown>
}

const AIContext = createContext<AIContextValue | null>(null)

export function useAI(): AIContextValue {
  const ctx = useContext(AIContext)
  if (!ctx) throw new Error('useAI must be used within AIProvider')
  return ctx
}

async function checkOllama(
  ollamaUrl: string,
  ollamaApiKey?: string,
): Promise<{
  available: boolean
  models: string[]
  error?: string
  viaCloud?: boolean
  usingUserKey?: boolean
  transport: AITransport
  /** Server-effective URL (e.g. https://ollama.com after cloud fallback) */
  effectiveUrl?: string
}> {
  const local = isLocalOrLanOllamaUrl(ollamaUrl)

  // Prefer browser → user's Ollama so App Hosting never talks to "its" localhost
  if (shouldUseBrowserOllama(ollamaUrl)) {
    const browser = await clientCheckHealth(ollamaUrl)
    if (browser.available) {
      return {
        available: true,
        models: browser.models,
        transport: 'browser',
        viaCloud: false,
        effectiveUrl: ollamaUrl,
      }
    }
    // On the user's machine with npm run dev, server proxy can still reach loopback
    // without CORS. Try server only when page is local-ish (not pure cloud fallback).
    const pageIsLocal =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === '[::1]')

    if (pageIsLocal) {
      try {
        const res = await fetch('/api/ai/health', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ollamaUrl,
            noCloudFallback: true,
            ...(ollamaApiKey ? { ollamaApiKey } : {}),
          }),
        })
        if (res.ok) {
          const data = await res.json()
          if (data.available) {
            return {
              available: true,
              models: data.models ?? [],
              transport: 'server',
              viaCloud: false,
              effectiveUrl:
                typeof data.ollamaUrl === 'string' && data.ollamaUrl.length > 0
                  ? data.ollamaUrl
                  : ollamaUrl,
            }
          }
        }
      } catch {
        /* fall through to browser error */
      }
    }

    return {
      available: false,
      models: [],
      transport: 'browser',
      error: browser.error || 'Cannot connect to local Ollama',
    }
  }

  // Cloud / remote via server proxy
  try {
    const res = await fetch('/api/ai/health', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ollamaUrl,
        noCloudFallback: local,
        ...(ollamaApiKey ? { ollamaApiKey } : {}),
      }),
    })
    if (!res.ok) {
      return {
        available: false,
        models: [],
        transport: 'server',
        error: `Server returned ${res.status}`,
      }
    }
    const data = await res.json()
    return {
      available: data.available,
      models: data.models ?? [],
      error: data.error,
      viaCloud: Boolean(data.viaCloud),
      usingUserKey: Boolean(data.usingUserKey),
      transport: 'server',
      effectiveUrl:
        typeof data.ollamaUrl === 'string' && data.ollamaUrl.length > 0
          ? data.ollamaUrl
          : undefined,
    }
  } catch (err) {
    return {
      available: false,
      models: [],
      transport: 'server',
      error: err instanceof Error ? err.message : 'Connection failed',
    }
  }
}

const EMPTY_MODEL_INFO: ModelInfo = { contextLength: null, parameterSize: null, family: null, quantizationLevel: null, format: null, sizeBytes: null }

async function fetchModelInfo(
  ollamaUrl: string,
  modelName: string,
  ollamaApiKey?: string,
  transport: AITransport = 'server',
): Promise<ModelInfo> {
  try {
    if (transport === 'browser' || shouldUseBrowserOllama(ollamaUrl)) {
      const data = await clientShowModel(ollamaUrl, modelName)
      if (!data.available) return EMPTY_MODEL_INFO
      const info = data.model_info ?? data.details ?? {}
      const ctxLen = (info as { context_length?: number; num_ctx?: number }).context_length
        ?? (info as { num_ctx?: number }).num_ctx
        ?? null
      return {
        contextLength: typeof ctxLen === 'number' ? ctxLen : null,
        parameterSize: (data.details as { parameter_size?: string } | undefined)?.parameter_size
          ?? (info as { parameter_size?: string }).parameter_size
          ?? null,
        family: (data.details as { family?: string } | undefined)?.family
          ?? (info as { family?: string }).family
          ?? null,
        quantizationLevel: (data.details as { quantization_level?: string } | undefined)?.quantization_level
          ?? (info as { quantization_level?: string }).quantization_level
          ?? null,
        format: (data.details as { format?: string } | undefined)?.format
          ?? (info as { format?: string }).format
          ?? null,
        sizeBytes: data.size ?? (info as { size?: number }).size ?? null,
      }
    }

    const res = await fetch('/api/ai/show', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ollamaUrl,
        name: modelName,
        ...(ollamaApiKey ? { ollamaApiKey } : {}),
      }),
    })
    if (!res.ok) return EMPTY_MODEL_INFO
    const data = await res.json()
    if (data.available === false) return EMPTY_MODEL_INFO
    const info = data.model_info ?? data.details ?? {}
    const ctxLen = info.context_length ?? info.num_ctx ?? null
    return {
      contextLength: typeof ctxLen === 'number' ? ctxLen : null,
      parameterSize: data.details?.parameter_size ?? info.parameter_size ?? null,
      family: data.details?.family ?? info.family ?? null,
      quantizationLevel: data.details?.quantization_level ?? info.quantization_level ?? null,
      format: data.details?.format ?? info.format ?? null,
      sizeBytes: data.size ?? info.size ?? null,
    }
  } catch {
    return EMPTY_MODEL_INFO
  }
}

export function AIProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [config, setConfig] = useState<AIConfig>(AI_DEFAULTS)
  const [transport, setTransport] = useState<AITransport>('server')
  const [ollamaApiKey, setOllamaApiKeyState] = useState('')
  const [pullProgress, setPullProgress] = useState<{ status: string; progress: number } | null>(null)
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const retryCountRef = useRef(0)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const healthInProgressRef = useRef(false)
  const apiKeyRef = useRef('')
  const transportRef = useRef<AITransport>('server')

  useEffect(() => {
    const saved = loadAIConfig()
    if (saved && Object.keys(saved).length > 0) {
      // Never log secrets — only non-sensitive fields
      console.log('[ai] Restoring saved config:', {
        model: saved.model,
        ollamaUrl: saved.ollamaUrl,
        enabled: saved.enabled,
      })
      setConfig(prev => ({ ...prev, ...saved }))
    }
    const key = loadLocalOllamaApiKey()
    setOllamaApiKeyState(key)
    apiKeyRef.current = key
    setMounted(true)
  }, [])

  // Pull/push API key when user signs in (Firebase ready)
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

  useEffect(() => {
    if (!mounted || !config.ollamaUrl) return

    if (config.status === 'unavailable' || config.status === 'error') {
      if (retryCountRef.current < RETRY_MAX_ATTEMPTS) {
        const delay = RETRY_INTERVAL_MS + Math.min(retryCountRef.current * 2000, 30000)
        console.log(`[ai] Will retry in ${delay / 1000}s (attempt ${retryCountRef.current + 1}/${RETRY_MAX_ATTEMPTS})`)
        retryTimerRef.current = setTimeout(() => {
          retryCountRef.current++
          reconnect()
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
  }, [mounted, config.status, config.ollamaUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!config.enabled && config.status === 'available') {
      console.log(`[ai] Auto-enabling AI mode (model: ${config.model})`)
      setConfig(prev => ({ ...prev, enabled: true }))
    }
  }, [config.status]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mounted) return
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { status: _status, ...toSave } = config
    saveAIConfig(toSave)
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
        console.warn('[ai] Failed to sync API key to Firestore', err instanceof Error ? err.message : err)
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

  const reconnect = useCallback(async () => {
    if (!config.ollamaUrl || healthInProgressRef.current) return
    healthInProgressRef.current = true
    console.log('[ai] Checking connection to', config.ollamaUrl)
    setConfig(prev => ({ ...prev, status: 'checking' as AIStatus }))

    try {
      const result = await checkOllama(config.ollamaUrl, apiKeyRef.current || undefined)
      if (result.available) {
        const model = config.model || pickFirstModel(result.models) || ''
        // Stick to cloud base after fallback so chat/show do not re-hit dead localhost
        const effectiveUrl =
          result.viaCloud && result.effectiveUrl ? result.effectiveUrl : config.ollamaUrl
        const via = result.viaCloud
          ? ' (via Ollama Cloud)'
          : result.transport === 'browser'
            ? ' (browser → your PC)'
            : ''
        console.log(`[ai] Connected to ${effectiveUrl}${via} | models: [${result.models.join(', ')}] | using: ${model || 'none'}`)
        setTransport(result.transport)
        transportRef.current = result.transport
        setConfig(prev => ({
          ...prev,
          ollamaUrl: effectiveUrl,
          status: model ? 'available' as AIStatus : 'unavailable' as AIStatus,
          availableModels: result.models,
          model: model || prev.model,
          error: model
            ? (result.viaCloud
              ? (result.usingUserKey
                ? 'Using Ollama Cloud with your API key'
                : 'Using Ollama Cloud')
              : result.transport === 'browser'
                ? 'Connected to Ollama on this computer (browser)'
                : undefined)
            : 'No models found on this Ollama instance. Run: ollama pull <model>',
        }))
        if (model) {
          const info = await fetchModelInfo(
            effectiveUrl,
            model,
            apiKeyRef.current || undefined,
            result.transport,
          )
          if (info.contextLength ?? info.parameterSize ?? info.family ?? info.quantizationLevel ?? info.format ?? info.sizeBytes) {
            console.log('[ai] Model info:', info)
          }
          setModelInfo(info)
        }
      } else {
        console.warn(`[ai] Cannot connect to ${config.ollamaUrl}:`, result.error)
        setTransport(result.transport)
        transportRef.current = result.transport
        setConfig(prev => ({
          ...prev,
          status: 'unavailable' as AIStatus,
          availableModels: [],
          error: result.error || 'Cannot connect to Ollama',
        }))
        setModelInfo(null)
      }
    } catch (err) {
      console.error('[ai] Health check error:', err)
      setConfig(prev => ({
        ...prev,
        status: 'error' as AIStatus,
        error: err instanceof Error ? err.message : 'Failed to check Ollama',
      }))
      setModelInfo(null)
    } finally {
      healthInProgressRef.current = false
    }
  }, [config.ollamaUrl, config.model])

  const connect = useCallback(async (url: string) => {
    const normalized = normalizeOllamaUrl(url)
    if (!normalized) return
    console.log('[ai] Connecting to', normalized)
    retryCountRef.current = 0
    setConfig(prev => ({ ...prev, ollamaUrl: normalized, status: 'checking' as AIStatus }))

    const result = await checkOllama(normalized, apiKeyRef.current || undefined)
    if (result.available) {
      const model = pickFirstModel(result.models) || ''
      // Only take cloud effectiveUrl when we intentionally used cloud
      const effectiveUrl =
        result.viaCloud && result.effectiveUrl ? result.effectiveUrl : normalized
      const via = result.viaCloud
        ? ' (via Ollama Cloud)'
        : result.transport === 'browser'
          ? ' (browser → your PC)'
          : ''
      console.log(`[ai] Connected to ${effectiveUrl}${via} | models: [${result.models.join(', ')}] | using: ${model || 'none'}`)
      setTransport(result.transport)
      transportRef.current = result.transport
      setConfig(prev => ({
        ...prev,
        ollamaUrl: effectiveUrl,
        status: model ? 'available' as AIStatus : 'unavailable' as AIStatus,
        availableModels: result.models,
        model: model || prev.model,
        enabled: model ? true : prev.enabled,
        error: model
          ? (result.viaCloud
              ? (result.usingUserKey
                ? 'Using Ollama Cloud with your API key'
                : 'Using Ollama Cloud')
              : result.transport === 'browser'
                ? 'Connected to Ollama on this computer (browser)'
                : undefined)
          : 'No models found on this Ollama instance. Run: ollama pull <model>',
      }))
      if (model) {
        const info = await fetchModelInfo(
          effectiveUrl,
          model,
          apiKeyRef.current || undefined,
          result.transport,
        )
        if (info.contextLength ?? info.parameterSize ?? info.family ?? info.quantizationLevel ?? info.format ?? info.sizeBytes) {
          console.log('[ai] Model info:', info)
        }
        setModelInfo(info)
      }
    } else {
      setTransport(result.transport)
      transportRef.current = result.transport
      setConfig(prev => ({
        ...prev,
        ollamaUrl: normalized,
        status: 'unavailable' as AIStatus,
        availableModels: [],
        error: result.error || 'Cannot connect to Ollama',
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
    setTransport('server')
    transportRef.current = 'server'
    setConfig(prev => ({ ...prev, enabled: false, status: 'unknown' as AIStatus, availableModels: [], error: undefined }))
    setModelInfo(null)
  }, [])

  const selectModel = useCallback((model: string) => {
    console.log('[ai] Selecting model:', model)
    setConfig(prev => ({ ...prev, model }))
    if (config.ollamaUrl) {
      fetchModelInfo(
        config.ollamaUrl,
        model,
        apiKeyRef.current || undefined,
        transportRef.current,
      ).then(info => {
        if (info.contextLength ?? info.parameterSize ?? info.family ?? info.quantizationLevel ?? info.format ?? info.sizeBytes) {
          console.log('[ai] New model info:', info)
        }
        setModelInfo(info)
      })
    }
  }, [config.ollamaUrl])

  const pullModelFn = useCallback(async (model: string): Promise<{ success: boolean; error?: string }> => {
    if (!config.ollamaUrl) return { success: false, error: 'No Ollama URL configured' }
    console.log('[ai] Starting model pull:', model)
    setConfig(prev => ({ ...prev, status: 'downloading' as AIStatus }))
    setPullProgress({ status: 'starting', progress: 0 })

    try {
      if (transportRef.current === 'browser' || shouldUseBrowserOllama(config.ollamaUrl)) {
        const result = await clientPullModel(config.ollamaUrl, model, (status, progress) => {
          setPullProgress({ status, progress })
        })
        if (!result.success) {
          setConfig(prev => ({ ...prev, status: 'error' as AIStatus, error: result.error }))
          setPullProgress(null)
          return result
        }
        setPullProgress(null)
        await reconnect()
        return { success: true }
      }

      const res = await fetch('/api/ai/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          ollamaUrl: config.ollamaUrl,
          ...(apiKeyRef.current ? { ollamaApiKey: apiKeyRef.current } : {}),
        }),
      })

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => 'Pull failed')
        setConfig(prev => ({ ...prev, status: 'error' as AIStatus, error: `Pull failed: ${res.status}` }))
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
              setConfig(prev => ({ ...prev, status: 'error' as AIStatus, error: parsed.error }))
              setPullProgress(null)
              return { success: false, error: parsed.error }
            }
            if (parsed.status) {
              setPullProgress({ status: parsed.status, progress: parsed.progress ?? -1 })
            }
          } catch {}
        }
      }

      setPullProgress(null)
      await reconnect()
      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setConfig(prev => ({ ...prev, status: 'error' as AIStatus, error: message }))
      setPullProgress(null)
      return { success: false, error: message }
    }
  }, [config.ollamaUrl, reconnect])

  const askAI = useCallback(async function* (messages: { role: 'system' | 'user' | 'assistant'; content: string }[]): AsyncGenerator<string, void, unknown> {
    if (!config.ollamaUrl) {
      yield '[Error: No Ollama URL configured]'
      return
    }
    const modelToUse = config.model || pickFirstModel(config.availableModels)
    if (!modelToUse) {
      yield '[Error: No model selected. Connect to Ollama and select a model in Settings.]'
      return
    }
    console.log(`[ai-chat] Sending chat | model: ${modelToUse} | messages: ${messages.length} | transport: ${transportRef.current}`)

    const controller = new AbortController()
    abortRef.current = controller

    // Local Ollama on the user's machine — stream from the browser, not App Hosting
    if (transportRef.current === 'browser' || shouldUseBrowserOllama(config.ollamaUrl)) {
      yield* clientGenerateChat(config.ollamaUrl, modelToUse, messages, controller.signal)
      return
    }

    async function* streamTokens() {
      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: modelToUse,
            messages,
            ollamaUrl: config.ollamaUrl,
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
            } catch {}
          }
        }
      } catch (err) {
        if (controller.signal.aborted) return
        yield `[Error: ${err instanceof Error ? err.message : String(err)}]`
      }
    }

    yield* streamTokens()
  }, [config.model, config.availableModels, config.ollamaUrl])

  const value: AIContextValue = {
    ...config,
    mounted,
    modelInfo,
    transport,
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