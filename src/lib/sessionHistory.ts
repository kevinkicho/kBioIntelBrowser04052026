export interface SessionMolecule {
  name: string
  searchedAt: string
  contextSnapshot: Record<string, unknown>
  drugData: Record<string, unknown>
}

export class SessionHistory {
  private molecules: Map<string, SessionMolecule> = new Map()
  private order: string[] = []

  addMolecule(name: string, drugData: Record<string, unknown>, contextSnapshot: Record<string, unknown> = {}): void {
    const existing = this.molecules.get(name)
    if (existing) {
      existing.searchedAt = new Date().toISOString()
      existing.contextSnapshot = contextSnapshot
      existing.drugData = drugData
      const idx = this.order.indexOf(name)
      if (idx > -1) {
        this.order.splice(idx, 1)
        this.order.push(name)
      }
    } else {
      this.molecules.set(name, {
        name,
        searchedAt: new Date().toISOString(),
        contextSnapshot,
        drugData,
      })
      this.order.push(name)
    }
  }

  getMolecule(name: string): SessionMolecule | undefined {
    return this.molecules.get(name)
  }

  getAllMolecules(): SessionMolecule[] {
    return this.order.map(name => this.molecules.get(name)!).filter(Boolean)
  }

  getRecentMolecules(limit: number = 10): SessionMolecule[] {
    return this.order
      .slice(-limit)
      .reverse()
      .map(name => this.molecules.get(name)!)
      .filter(Boolean)
  }

  removeMolecule(name: string): boolean {
    if (!this.molecules.has(name)) return false
    this.molecules.delete(name)
    const idx = this.order.indexOf(name)
    if (idx > -1) this.order.splice(idx, 1)
    return true
  }

  clear(): void {
    this.molecules.clear()
    this.order = []
  }

  getCount(): number {
    return this.molecules.size
  }
}

export const sessionHistory = new SessionHistory()