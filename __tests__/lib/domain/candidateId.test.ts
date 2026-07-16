import {
  computeCandidateId,
  hashNormalizedName,
  normalizeCandidateName,
  parseCandidateId,
  preferCandidateId,
  candidateIdsEqual,
} from '@/lib/domain/candidateId'

describe('candidateId', () => {
  describe('normalizeCandidateName', () => {
    it('NFKC, trims, collapses space, lower-cases', () => {
      expect(normalizeCandidateName('  Aspirin   Acid  ')).toBe('aspirin acid')
      // fullwidth digits → ascii via NFKC
      expect(normalizeCandidateName('\uFF11\uFF12\uFF13 drug')).toBe('123 drug')
    })
  })

  describe('computeCandidateId', () => {
    it('prefers valid InChIKey (ik:)', () => {
      const id = computeCandidateId({
        inchiKey: 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N',
        chemblId: 'CHEMBL25',
        pubchemCid: 2244,
        name: 'Aspirin',
      })
      expect(id).toBe('ik:BSYNRYMUTXBXSQ-UHFFFAOYSA-N')
    })

    it('normalizes InChIKey to uppercase', () => {
      const id = computeCandidateId({
        inchiKey: 'bsynrymutxb xsq-UHFFFAOYSA-n'.replace(' ', ''),
        name: 'x',
      })
      // lower-case input still uppercased by normalize
      const id2 = computeCandidateId({
        inchiKey: 'bsynrymutxbxsq-UHFFFAOYSA-n',
        name: 'x',
      })
      expect(id2).toBe('ik:BSYNRYMUTXBXSQ-UHFFFAOYSA-N')
    })

    it('falls back to ChEMBL when no InChIKey', () => {
      const id = computeCandidateId({
        chemblId: '25',
        pubchemCid: 2244,
        name: 'Aspirin',
      })
      expect(id).toBe('ch:CHEMBL25')
    })

    it('falls back to CID when no structure/chembl', () => {
      const id = computeCandidateId({
        pubchemCid: 2244,
        name: 'Aspirin',
      })
      expect(id).toBe('cid:2244')
    })

    it('falls back to name hash (nm:) — stable and origin-free', () => {
      const id = computeCandidateId({ name: 'Aspirin' })
      expect(id).toMatch(/^nm:[a-f0-9]{16}$/)
      expect(id).toBe(`nm:${hashNormalizedName('Aspirin')}`)
      // same name different casing → same id
      expect(computeCandidateId({ name: '  aspirin  ' })).toBe(id)
    })

    it('ignores invalid InChIKey and continues fallback', () => {
      const id = computeCandidateId({
        inchiKey: 'not-a-key',
        pubchemCid: 100,
        name: 'Foo',
      })
      expect(id).toBe('cid:100')
    })
  })

  describe('parseCandidateId', () => {
    it('parses ik/ch/cid/nm', () => {
      expect(parseCandidateId('ik:BSYNRYMUTXBXSQ-UHFFFAOYSA-N')).toEqual({
        kind: 'ik',
        value: 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N',
        raw: 'ik:BSYNRYMUTXBXSQ-UHFFFAOYSA-N',
      })
      expect(parseCandidateId('ch:CHEMBL25')?.kind).toBe('ch')
      expect(parseCandidateId('cid:2244')?.value).toBe('2244')
      const nm = computeCandidateId({ name: 'x' })
      expect(parseCandidateId(nm)?.kind).toBe('nm')
    })

    it('rejects malformed ids', () => {
      expect(parseCandidateId('')).toBeNull()
      expect(parseCandidateId('nope')).toBeNull()
      expect(parseCandidateId('cid:abc')).toBeNull()
      expect(parseCandidateId('ik:BAD')).toBeNull()
      expect(parseCandidateId('xx:1')).toBeNull()
    })
  })

  describe('preferCandidateId / equal', () => {
    it('prefers higher-trust kind', () => {
      const ik = 'ik:BSYNRYMUTXBXSQ-UHFFFAOYSA-N'
      const ch = 'ch:CHEMBL25'
      const cid = 'cid:2244'
      const nm = computeCandidateId({ name: 'aspirin' })
      expect(preferCandidateId(ch, ik)).toBe(ik)
      expect(preferCandidateId(cid, ch)).toBe(ch)
      expect(preferCandidateId(nm, cid)).toBe(cid)
    })

    it('candidateIdsEqual is strict string equality', () => {
      expect(candidateIdsEqual('cid:1', 'cid:1')).toBe(true)
      expect(candidateIdsEqual('cid:1', 'cid:2')).toBe(false)
    })
  })
})
