const ALLOWED_TAGS = new Set([
  'STRONG',
  'EM',
  'B',
  'I',
  'BR',
  'UL',
  'OL',
  'LI',
  'P',
  'SPAN',
  'A',
  'SUB',
  'SUP',
  'CODE',
  'PRE',
  'H3',
  'H4',
  'H5',
])
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  A: new Set(['href', 'target', 'rel']),
  SPAN: new Set(['class']),
  CODE: new Set(['class']),
  PRE: new Set(['class']),
  P: new Set(['class']),
  UL: new Set(['class']),
  OL: new Set(['class']),
  LI: new Set(['class']),
  H3: new Set(['class']),
  H4: new Set(['class']),
  H5: new Set(['class']),
}

const SCHEME_RE = /^(https?|mailto):/i

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

export function sanitizeHtml(dirty: string): string {
  const doc = new DOMParser().parseFromString(dirty, 'text/html')
  const body = doc.body

  function cleanNode(node: Node, parent: Node): void {
    const children = Array.from(node.childNodes)
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as Element
        const tag = el.tagName
        if (ALLOWED_TAGS.has(tag)) {
          const allowed = ALLOWED_ATTRS[tag] || new Set()
          for (const attr of Array.from(el.attributes)) {
            if (!allowed.has(attr.name)) {
              el.removeAttribute(attr.name)
            } else if (attr.name === 'href') {
              if (!SCHEME_RE.test(attr.value)) {
                el.removeAttribute(attr.name)
              }
            }
          }
          cleanNode(child, el)
        } else {
          while (el.firstChild) {
            parent.insertBefore(el.firstChild, el)
          }
          parent.removeChild(el)
        }
      }
    }
  }

  cleanNode(body, body)
  return body.innerHTML
}

export function renderSimpleMarkdown(text: string): string {
  const escaped = escapeHtml(text)
  const withBold = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  const withItalic = withBold.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
  return sanitizeHtml(withItalic)
}

/**
 * Richer markdown for AI insight panels (disease intelligence, copilot).
 * Supports headings, lists, fenced code, bold/italic, paragraphs.
 */
export function renderInsightMarkdown(text: string): string {
  if (!text?.trim()) return ''
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  let i = 0
  let inUl = false
  let inOl = false
  let inPre = false
  let preBuf: string[] = []

  const closeLists = () => {
    if (inUl) {
      out.push('</ul>')
      inUl = false
    }
    if (inOl) {
      out.push('</ol>')
      inOl = false
    }
  }

  const inline = (s: string) => {
    let t = escapeHtml(s)
    t = t.replace(/`([^`]+)`/g, '<code class="insight-code">$1</code>')
    t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    t = t.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    return t
  }

  while (i < lines.length) {
    const raw = lines[i]
    const trimmed = raw.trim()

    if (trimmed.startsWith('```')) {
      if (inPre) {
        closeLists()
        out.push(
          `<pre class="insight-pre"><code>${escapeHtml(preBuf.join('\n'))}</code></pre>`,
        )
        preBuf = []
        inPre = false
      } else {
        closeLists()
        inPre = true
        preBuf = []
      }
      i++
      continue
    }
    if (inPre) {
      preBuf.push(raw)
      i++
      continue
    }

    if (!trimmed) {
      closeLists()
      i++
      continue
    }

    const h = trimmed.match(/^(#{1,3})\s+(.+)$/)
    if (h) {
      closeLists()
      const level = h[1].length
      const tag = level === 1 ? 'h3' : level === 2 ? 'h4' : 'h5'
      out.push(`<${tag} class="insight-h">${inline(h[2])}</${tag}>`)
      i++
      continue
    }

    // Numbered "1. TITLE: body" or "1) body"
    const ol = trimmed.match(/^(\d+)[.)]\s+(.+)$/)
    if (ol) {
      if (inUl) {
        out.push('</ul>')
        inUl = false
      }
      if (!inOl) {
        out.push('<ol class="insight-ol">')
        inOl = true
      }
      out.push(`<li class="insight-li">${inline(ol[2])}</li>`)
      i++
      continue
    }

    const ul = trimmed.match(/^[-*•]\s+(.+)$/)
    if (ul) {
      if (inOl) {
        out.push('</ol>')
        inOl = false
      }
      if (!inUl) {
        out.push('<ul class="insight-ul">')
        inUl = true
      }
      out.push(`<li class="insight-li">${inline(ul[1])}</li>`)
      i++
      continue
    }

    // Wiring diagram lines: "GENE ← drug" or "GENE (0.95) ← drug [path]"
    if (
      /←|->|→/.test(trimmed) ||
      (/^\s{2,}\S/.test(raw) && /\[/.test(trimmed))
    ) {
      closeLists()
      out.push(`<pre class="insight-wire">${escapeHtml(trimmed)}</pre>`)
      i++
      continue
    }

    closeLists()
    out.push(`<p class="insight-p">${inline(trimmed)}</p>`)
    i++
  }

  if (inPre) {
    out.push(`<pre class="insight-pre"><code>${escapeHtml(preBuf.join('\n'))}</code></pre>`)
  }
  closeLists()
  return sanitizeHtml(out.join('\n'))
}