import {
  computeCandidateId,
  hashNormalizedName,
  normalizeCandidateName,
  parseCandidateId,
  preferCandidateId,
  candidateIdsEqual,
  canonicalizeCandidateId,
} from '@/lib/domain/candidateId'
import { sha256Hex } from '@/lib/domain/sha256'

describe('candidateId', () => {
  describe('normalizeCandidateName', () => {
    it('NFKC, trims, collapses space, lower-cases', () => {
      expect(normalizeCandidateName('  Aspirin   Acid  ')).toBe('aspirin acid')
      // fullwidth digits → ascii via NFKC
      expect(normalizeCandidateName('\uFF11\uFF12\uFF13 drug')).toBe('123 drug')
    })
  })

  describe('sha256Hex (isomorphic)', () => {
    it('matches known SHA-256 of empty string and "abc"', () => {
      expect(sha256Hex('')).toBe(
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      )
      expect(sha256Hex('abc')).toBe(
        'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      )
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

    it('ignores garbage chemblId and falls through to CID', () => {
      const id = computeCandidateId({
        chemblId: 'not-chembl',
        pubchemCid: 2244,
        name: 'Aspirin',
      })
      expect(id).toBe('cid:2244')
    })

    it('ignores bare CHEMBL without digits', () => {
      const id = computeCandidateId({
        chemblId: 'CHEMBL',
        pubchemCid: 99,
        name: 'X',
      })
      expect(id).toBe('cid:99')
    })

    it('origins never enter the id (only identity keys matter)', () => {
      // Even if a caller tried to stuff origin-like strings into name, id is pure hash of name
      const a = computeCandidateId({ name: 'aspirin' })
      const b = computeCandidateId({ name: 'aspirin' })
      expect(a).toBe(b)
      expect(a.startsWith('nm:')).toBe(true)
      expect(a).not.toContain('dgidb')
      expect(a).not.toContain('origin')
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
      expect(parseCandidateId('ch:25')?.value).toBe('CHEMBL25')
      expect(parseCandidateId('cid:2244')?.value).toBe('2244')
      const nm = computeCandidateId({ name: 'x' })
      expect(parseCandidateId(nm)?.kind).toBe('nm')
    })

    it('rejects malformed ids including garbage ch:', () => {
      expect(parseCandidateId('')).toBeNull()
      expect(parseCandidateId('nope')).toBeNull()
      expect(parseCandidateId('cid:abc')).toBeNull()
      expect(parseCandidateId('ik:BAD')).toBeNull()
      expect(parseCandidateId('xx:1')).toBeNull()
      expect(parseCandidateId('ch:FOO')).toBeNull()
      expect(parseCandidateId('ch:CHEMBL')).toBeNull()
      expect(parseCandidateId('ch:not-chembl')).toBeNull()
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

    it('preferCandidateId keeps first on equal rank; prefers valid over malformed', () => {
      expect(preferCandidateId('cid:1', 'cid:2')).toBe('cid:1')
      expect(preferCandidateId('cid:1', 'not-an-id')).toBe('cid:1')
      expect(preferCandidateId('garbage', 'cid:5')).toBe('cid:5')
    })

    it('candidateIdsEqual compares strict and canonical forms', () => {
      expect(candidateIdsEqual('cid:1', 'cid:1')).toBe(true)
      expect(candidateIdsEqual('cid:1', 'cid:2')).toBe(false)
      expect(candidateIdsEqual('ch:25', 'ch:CHEMBL25')).toBe(true)
      expect(canonicalizeCandidateId('ch:25')).toBe('ch:CHEMBL25')
    })
  })
})
