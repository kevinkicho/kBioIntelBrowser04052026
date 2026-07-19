/**
 * Shared streaming helpers for Copilot / Pack / RH AI surfaces.
 * No product-specific prompt logic.
 */

/** Strip trailing `[Error: …]` tokens that some models embed in the stream body. */
export function extractStreamError(content: string): { content: string; error?: string } {
  const match = content.match(/\[Error: (.+?)\]/)
  if (!match) return { content }
  const errorText = match[1]
  const cleaned = content.replace(/\s*\[Error: .+?\]\s*/g, '').trim()
  return { content: cleaned || '', error: errorText }
}

export type ChatRole = 'system' | 'user' | 'assistant'

export type ChatMessage = { role: ChatRole; content: string }

/** Collect a full stream into a string, optional per-token callback. */
export async function collectStream(
  tokens: AsyncIterable<string>,
  opts?: {
    signal?: AbortSignal
    onToken?: (partial: string) => void
  },
): Promise<string> {
  let full = ''
  for await (const token of tokens) {
    if (opts?.signal?.aborted) break
    full += token
    opts?.onToken?.(full)
  }
  return full
}
