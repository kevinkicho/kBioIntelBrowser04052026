const ALLOWED_TAGS = new Set(['STRONG', 'EM', 'B', 'I', 'BR', 'UL', 'OL', 'LI', 'P', 'SPAN', 'A', 'SUB', 'SUP', 'CODE', 'PRE'])
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  A: new Set(['href', 'target', 'rel']),
  SPAN: new Set(['class']),
  CODE: new Set(['class']),
  PRE: new Set(['class']),
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