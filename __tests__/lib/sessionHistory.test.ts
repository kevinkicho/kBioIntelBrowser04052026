import { SessionHistory } from '@/lib/sessionHistory'

describe('SessionHistory', () => {
  let history: SessionHistory

  beforeEach(() => {
    history = new SessionHistory()
  })

  it('adds and retrieves molecules', () => {
    history.addMolecule('Aspirin', { chemblActivities: [{ targetName: 'COX-1' }] })
    const m = history.getMolecule('Aspirin')
    expect(m).toBeDefined()
    expect(m!.name).toBe('Aspirin')
    expect(m!.drugData).toEqual({ chemblActivities: [{ targetName: 'COX-1' }] })
  })

  it('returns undefined for missing molecule', () => {
    expect(history.getMolecule('None')).toBeUndefined()
  })

  it('counts molecules', () => {
    expect(history.getCount()).toBe(0)
    history.addMolecule('Aspirin', {})
    expect(history.getCount()).toBe(1)
    history.addMolecule('Ibuprofen', {})
    expect(history.getCount()).toBe(2)
  })

  it('updates existing molecule on re-add', () => {
    history.addMolecule('Aspirin', { version: 1 })
    history.addMolecule('Aspirin', { version: 2 })
    expect(history.getCount()).toBe(1)
    expect(history.getMolecule('Aspirin')!.drugData).toEqual({ version: 2 })
  })

  it('getAllMolecules returns in insertion order', () => {
    history.addMolecule('Aspirin', {})
    history.addMolecule('Ibuprofen', {})
    history.addMolecule('Acetaminophen', {})
    const all = history.getAllMolecules()
    expect(all.map(m => m.name)).toEqual(['Aspirin', 'Ibuprofen', 'Acetaminophen'])
  })

  it('getRecentMolecules returns most recent first', () => {
    history.addMolecule('Aspirin', {})
    history.addMolecule('Ibuprofen', {})
    history.addMolecule('Acetaminophen', {})
    const recent = history.getRecentMolecules(2)
    expect(recent.map(m => m.name)).toEqual(['Acetaminophen', 'Ibuprofen'])
  })

  it('re-add moves to end of order', () => {
    history.addMolecule('Aspirin', {})
    history.addMolecule('Ibuprofen', {})
    history.addMolecule('Aspirin', { updated: true })
    const all = history.getAllMolecules()
    expect(all.map(m => m.name)).toEqual(['Ibuprofen', 'Aspirin'])
    expect(history.getMolecule('Aspirin')!.drugData).toEqual({ updated: true })
  })

  it('removeMolecule works', () => {
    history.addMolecule('Aspirin', {})
    history.addMolecule('Ibuprofen', {})
    expect(history.removeMolecule('Aspirin')).toBe(true)
    expect(history.getCount()).toBe(1)
    expect(history.getMolecule('Aspirin')).toBeUndefined()
    expect(history.removeMolecule('None')).toBe(false)
  })

  it('clear empties everything', () => {
    history.addMolecule('Aspirin', {})
    history.addMolecule('Ibuprofen', {})
    history.clear()
    expect(history.getCount()).toBe(0)
    expect(history.getAllMolecules()).toEqual([])
  })

  it('stores and retrieves complex drugData', () => {
    const complexData = {
      adverseEvents: [{ reactionName: 'Nausea', count: 5 }],
      chemblActivities: [{ targetName: 'COX-1', pchemblValue: 8.5 }],
      nested: { deep: { value: 42 } },
    }
    history.addMolecule('Aspirin', complexData)
    const m = history.getMolecule('Aspirin')!
    expect((m.drugData.adverseEvents as { reactionName: string }[])[0].reactionName).toBe('Nausea')
    expect((m.drugData.chemblActivities as { targetName: string }[])[0].targetName).toBe('COX-1')
  })
})