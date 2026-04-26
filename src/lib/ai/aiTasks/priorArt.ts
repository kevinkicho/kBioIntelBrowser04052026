/**
 * Post-processor + validator for the `prior_art_query` AI mode.
 *
 * Strips fences/preamble the model may emit despite the strict prompt, then
 * checks: balanced parens, balanced quotes, contains the molecule name (or one
 * of its synonyms).
 */

export interface PriorArtValidationResult {
  ok: boolean
  query: string
  reason?: string
}

/**
 * Try to extract a Boolean query from raw model output. Local 7B models often
 * wrap the result in markdown despite being told not to — we strip common
 * wrappers conservatively.
 */
export function extractPriorArtQuery(rawOutput: string): string {
  if (!rawOutput) return ''
  let text = rawOutput.trim()

  // Strip fenced code blocks if present (```...``` or ```text\n...\n```).
  const fenceMatch = text.match(/```(?:[\w-]*)?\s*([\s\S]*?)\s*```/)
  if (fenceMatch) {
    text = fenceMatch[1].trim()
  }

  // Strip a leading "Query:" / "Search:" prefix on a single line.
  text = text.replace(/^(query|search|boolean query|output)\s*[:\-]\s*/i, '').trim()

  // If the model emitted multiple lines, take the longest one with parentheses;
  // otherwise the first non-empty line.
  if (text.includes('\n')) {
    const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean)
    const withParen = lines.filter(l => l.includes('(') || l.includes('"'))
    text = (withParen.length > 0 ? withParen : lines)
      .reduce((longest, l) => (l.length > longest.length ? l : longest), '')
  }

  // If the entire query is wrapped in matching outer quotes, strip them.
  if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) {
    const inner = text.slice(1, -1)
    // Only strip if there are no other quotes inside, or removing would not
    // unbalance things. Simpler: only strip when inner has no unescaped quote.
    if (!inner.includes('"')) {
      text = inner
    }
  }

  return text.trim()
}

export function validatePriorArtQuery(
  rawOutput: string,
  identity: { name: string; synonyms?: string[] },
): PriorArtValidationResult {
  const query = extractPriorArtQuery(rawOutput)
  if (!query) {
    return { ok: false, query, reason: 'Model returned an empty query.' }
  }

  // Balanced parentheses.
  let depth = 0
  for (const ch of query) {
    if (ch === '(') depth++
    else if (ch === ')') depth--
    if (depth < 0) {
      return { ok: false, query, reason: 'Unbalanced parentheses (unexpected close).' }
    }
  }
  if (depth !== 0) {
    return { ok: false, query, reason: 'Unbalanced parentheses.' }
  }

  // Balanced double quotes (we ignore single quotes — they're not used as
  // string delimiters in patent search syntax).
  const quoteCount = (query.match(/"/g) ?? []).length
  if (quoteCount % 2 !== 0) {
    return { ok: false, query, reason: 'Unmatched double quotes.' }
  }

  // Must contain the molecule name OR one of its synonyms (case-insensitive,
  // matched as a whole-word-ish substring).
  const haystack = query.toLowerCase()
  const candidates = [identity.name, ...(identity.synonyms ?? [])]
    .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    .map(s => s.trim().toLowerCase())
  const found = candidates.some(c => haystack.includes(c))
  if (!found) {
    return {
      ok: false,
      query,
      reason: `Query does not mention "${identity.name}" or any known synonym.`,
    }
  }

  return { ok: true, query }
}
