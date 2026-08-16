import fs from 'fs'
import path from 'path'

const readme = fs.readFileSync(path.join(process.cwd(), 'README.md'), 'utf8')

describe('README honesty vs shipped v4', () => {
  it('leads current product with v4 Cloud-only law, not local Ollama fallback', () => {
    expect(readme).toContain('v4 (shipped)')
    expect(readme).toMatch(/no local Ollama/)
    expect(readme).toContain('Historical notes (pre-v4)')
    expect(readme).not.toMatch(/all processed locally via Ollama/)
    expect(readme).not.toMatch(/## Data Sources \(110\+ Free Public APIs\)/)
  })
})
