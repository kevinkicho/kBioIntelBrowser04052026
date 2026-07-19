import { renderInsightMarkdown } from '@/lib/sanitize'

describe('renderInsightMarkdown', () => {
  it('formats paragraphs and bold', () => {
    const html = renderInsightMarkdown('Hello **world**')
    expect(html).toContain('<strong>world</strong>')
    expect(html).toContain('insight-p')
  })

  it('formats numbered lists', () => {
    const html = renderInsightMarkdown('1. First item\n2. Second item')
    expect(html).toContain('insight-ol')
    expect(html).toContain('First item')
    expect(html).toContain('Second item')
  })

  it('formats headings', () => {
    const html = renderInsightMarkdown('## Gap analysis')
    expect(html).toMatch(/<h[345] class="insight-h">/)
    expect(html).toContain('Gap analysis')
  })

  it('formats wiring-style lines as mono blocks', () => {
    const html = renderInsightMarkdown('APOE (0.95) ← atorvastatin [pathway]')
    expect(html).toContain('insight-wire')
    expect(html).toContain('APOE')
  })
})
