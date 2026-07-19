'use client'

import React from 'react'
import Link from 'next/link'
import type { CopilotMessage } from '@/hooks/useAICopilot'
import { renderSimpleMarkdown } from '@/lib/sanitize'

function renderMarkdown(text: string) {
  const parts: React.ReactNode[] = []
  const lines = text.split('\n')
  let inList = false
  let listKey = 0
  let listType: 'ul' | 'ol' | null = null

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    if (/^[-*]\s/.test(raw)) {
      if (!inList || listType !== 'ul') {
        listType = 'ul'
        parts.push(<ul key={`list-${listKey++}`} className="list-disc list-inside space-y-0.5 ml-1" />)
        inList = true
      }
      const content = renderSimpleMarkdown(raw.replace(/^[-*]\s/, ''))
      parts.push(<li key={`li-${i}`} className="ml-2" dangerouslySetInnerHTML={{ __html: content }} />)
    } else if (/^\d+\.\s/.test(raw)) {
      if (!inList || listType !== 'ol') {
        listType = 'ol'
        parts.push(<ol key={`list-${listKey++}`} className="list-decimal list-inside space-y-0.5 ml-1" />)
        inList = true
      }
      const content = renderSimpleMarkdown(raw.replace(/^\d+\.\s/, ''))
      parts.push(<li key={`li-${i}`} className="ml-2" dangerouslySetInnerHTML={{ __html: content }} />)
    } else {
      inList = false
      listType = null
      if (raw.trim() === '') {
        parts.push(<br key={`br-${i}`} />)
      } else {
        const content = renderSimpleMarkdown(raw)
        parts.push(<span key={`line-${i}`} className="block" dangerouslySetInnerHTML={{ __html: content }} />)
      }
    }
  }

  return <>{parts}</>
}

export function TaskBubble({ task, rawContent }: { task: NonNullable<CopilotMessage['task']>; rawContent: string }) {
  if (task.kind === 'prior_art') {
    return (
      <div className="rounded-lg px-3 py-2 text-xs leading-relaxed bg-slate-900/40 border border-slate-800/30 text-slate-300">
        <p className="text-[10px] uppercase tracking-wider text-indigo-400 font-semibold mb-1.5">Prior-art query</p>
        <code className="block font-mono text-[11px] bg-slate-950/60 border border-slate-800/40 rounded p-2 text-emerald-300 whitespace-pre-wrap break-words">{task.query}</code>
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={() => { navigator.clipboard?.writeText(task.query).catch(() => {}) }}
            className="text-[10px] text-slate-400 hover:text-indigo-300 transition-colors"
          >
            Copy
          </button>
          <a
            href={`https://patents.google.com/?q=${encodeURIComponent(task.query)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-slate-400 hover:text-indigo-300 transition-colors"
          >
            Google Patents →
          </a>
          <a
            href={`https://europepmc.org/search?query=${encodeURIComponent(task.query)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-slate-400 hover:text-indigo-300 transition-colors"
          >
            EuropePMC →
          </a>
        </div>
      </div>
    )
  }

  if (task.kind === 'diff_safety') {
    return (
      <div className="rounded-lg px-3 py-2 text-xs leading-relaxed bg-slate-900/40 border border-slate-800/30 text-slate-300">
        <p className="text-[10px] uppercase tracking-wider text-indigo-400 font-semibold mb-1.5">
          Differential safety: {task.currentName} vs {task.otherName}
        </p>
        <div className="space-y-2">
          {task.text.split(/\n\s*\n+/).map((p, i) => (
            <p key={i} className="text-xs leading-relaxed">{p}</p>
          ))}
        </div>
      </div>
    )
  }

  if (task.kind === 'suggest_next') {
    return (
      <div className="rounded-lg px-3 py-2 text-xs leading-relaxed bg-slate-900/40 border border-slate-800/30 text-slate-300">
        <p className="text-[10px] uppercase tracking-wider text-indigo-400 font-semibold mb-1.5">Suggested next entities</p>
        <ul className="space-y-1.5">
          {task.entities.map((e, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className={`shrink-0 inline-block px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wider ${
                e.type === 'molecule' ? 'bg-purple-900/40 text-purple-300' :
                e.type === 'gene' ? 'bg-emerald-900/40 text-emerald-300' :
                'bg-cyan-900/40 text-cyan-300'
              }`}>{e.type}</span>
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-200">{e.name}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{e.reason}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  if (task.kind === 'hypothesis_seed') {
    return (
      <div className="rounded-lg px-3 py-2 text-xs leading-relaxed bg-slate-900/40 border border-slate-800/30 text-slate-300">
        <p className="text-[10px] uppercase tracking-wider text-indigo-400 font-semibold mb-1.5">Hypothesis seed</p>
        <ul className="space-y-1 mb-2">
          {task.filters.map((f, i) => (
            <li key={i} className="flex items-center gap-1.5 text-[11px]">
              <span className="text-slate-500 font-mono">{f.axis}</span>
              <span className="text-slate-600">=</span>
              <span className="text-slate-200 font-medium">{f.value}</span>
            </li>
          ))}
        </ul>
        <Link
          href={task.url}
          className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-300 hover:text-indigo-200 transition-colors"
        >
          Run in Hypothesis Builder →
        </Link>
      </div>
    )
  }

  // Fallback (should not happen).
  return <pre className="text-[10px] text-slate-400 whitespace-pre-wrap">{rawContent}</pre>
}

export function MessageBubble({ message, isStreaming }: { message: CopilotMessage; isStreaming: boolean }) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  if (isSystem) {
    return (
      <div className="text-center py-1">
        <span className="text-[9px] text-slate-600 italic">{message.content}</span>
      </div>
    )
  }

  // Plan-06 task message: render the structured payload (the raw model output
  // is hidden behind a "Show raw output" disclosure for debugging).
  if (!isUser && message.task && !isStreaming) {
    return (
      <div className="mr-2">
        <TaskBubble task={message.task} rawContent={message.content} />
        {message.error && (
          <div className="mt-1.5 rounded-md px-3 py-2 text-[11px] leading-relaxed bg-red-950/30 border border-red-800/30 text-red-300">
            <span className="font-semibold">Stream error:</span> {message.error}
          </div>
        )}
      </div>
    )
  }

  // Plan-06 task validation failure: show the polite message instead of raw text.
  if (!isUser && message.validationError && !isStreaming) {
    return (
      <div className="mr-2">
        <div className="rounded-lg px-3 py-2 text-xs leading-relaxed bg-amber-950/30 border border-amber-800/30 text-amber-200">
          {message.validationError}
        </div>
        <details className="mt-1.5 text-[10px] text-slate-500">
          <summary className="cursor-pointer hover:text-slate-300">Show raw output</summary>
          <div className="mt-1 px-3 py-2 rounded-md bg-slate-900/40 border border-slate-800/30 text-slate-400 font-mono whitespace-pre-wrap break-words">
            {message.content || '(empty)'}
          </div>
        </details>
      </div>
    )
  }

  const rendered = isUser
    ? message.content
    : renderMarkdown(message.content || (isStreaming ? '' : '...'))

  return (
    <div className={`${isUser ? 'ml-6' : 'mr-2'}`}>
      {!isUser && message.tools && message.tools.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1" data-testid="copilot-tool-chips">
          {message.tools.map((t, i) => (
            <span
              key={`${t.name}-${i}`}
              title={t.summary}
              className={`text-[9px] px-1.5 py-0.5 rounded border font-mono ${
                t.ok
                  ? 'border-emerald-800/50 bg-emerald-950/40 text-emerald-300'
                  : 'border-red-800/50 bg-red-950/40 text-red-300'
              }`}
            >
              {t.ok ? '✓' : '✗'} {t.name}
            </span>
          ))}
        </div>
      )}
      <div
        className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${
          isUser
            ? 'bg-indigo-600/20 border border-indigo-700/30 text-indigo-200'
            : 'bg-slate-900/40 border border-slate-800/30 text-slate-300'
        }`}
      >
        {isUser ? message.content || (isStreaming ? '' : '...') : rendered}
      </div>
      {message.error && (
        <div className="mt-1.5 mr-2 rounded-md px-3 py-2 text-[11px] leading-relaxed bg-red-950/30 border border-red-800/30 text-red-300">
          <span className="font-semibold">Stream error:</span> {message.error}
        </div>
      )}
      {isStreaming && !message.content && (
        <div className="flex gap-1 mt-1 px-3">
          <span
            className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"
            style={{ animationDelay: '0ms' }}
          />
          <span
            className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"
            style={{ animationDelay: '150ms' }}
          />
          <span
            className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      )}
    </div>
  )
}
