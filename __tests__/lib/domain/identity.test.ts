import {
  assessIdentityTrust,
  identityTrustToAxisValue,
  isValidInchiKey,
  mergeAlternateCids,
  normalizeChemblId,
  normalizeCid,
  normalizeInchiKey,
  IDENTITY_TRUST_AXIS_VALUES,
} from '@/lib/domain/identity'

describe('identity trust', () => {
  describe('normalize helpers', () => {
    it('normalizes InChIKey to uppercase', () => {
      expect(normalizeInchiKey('bsynrymutxbxsq-UHFFFAOYSA-n')).toBe(
        'BSYNRYMUTXBXSQ-UHFFFAOYSA-N',
      )
      expect(isValidInchiKey('BSYNRYMUTXBXSQ-UHFFFAOYSA-N')).toBe(true)
      expect(isValidInchiKey('bad')).toBe(false)
    })

    it('normalizes ChEMBL ids and rejects garbage', () => {
      expect(normalizeChemblId('25')).toBe('CHEMBL25')
      expect(normalizeChemblId('chembl25')).toBe('CHEMBL25')
      expect(normalizeChemblId('CHEMBL25')).toBe('CHEMBL25')
      expect(normalizeChemblId('')).toBeUndefined()
      expect(normalizeChemblId('CHEMBL')).toBeUndefined()
      expect(normalizeChemblId('not-chembl')).toBeUndefined()
      expect(normalizeChemblId('FOO')).toBeUndefined()
    })

    it('normalizes CID', () => {
      expect(normalizeCid(2244)).toBe(2244)
      expect(normalizeCid('CID:2244')).toBe(2244)
      expect(normalizeCid(0)).toBeNull()
      expect(normalizeCid(null)).toBeNull()
    })
  })

  describe('assessIdentityTrust', () => {
    it('high when valid InChIKey', () => {
      const a = assessIdentityTrust({
        inchiKey: 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N',
        cid: 2244,
        name: 'Aspirin',
      })
      expect(a.level).toBe('high')
      expect(a.axisValue).toBe(IDENTITY_TRUST_AXIS_VALUES.high)
      expect(a.reasons.some((r) => /InChIKey/i.test(r))).toBe(true)
    })

    it('medium for CID-only', () => {
      const a = assessIdentityTrust({ cid: 2244, name: 'Aspirin' })
      expect(a.level).toBe('medium')
      expect(a.axisValue).toBe(0.66)
    })

    it('medium for ChEMBL-only', () => {
      const a = assessIdentityTrust({ chemblId: 'CHEMBL25', name: 'Aspirin' })
      expect(a.level).toBe('medium')
    })

    it('low for name + smiles only', () => {
      const a = assessIdentityTrust({ name: 'Foo', smiles: 'CCO' })
      expect(a.level).toBe('low')
      expect(a.axisValue).toBe(0.33)
    })

    it('unresolved for name only', () => {
      const a = assessIdentityTrust({ name: 'Mystery compound' })
      expect(a.level).toBe('unresolved')
      expect(a.axisValue).toBe(0)
    })

    it('unresolved when empty', () => {
      const a = assessIdentityTrust({})
      expect(a.level).toBe('unresolved')
    })

    it('low for name + alternate CIDs only', () => {
      const a = assessIdentityTrust({ name: 'Foo', alternateCids: [10, 20] })
      expect(a.level).toBe('low')
      expect(a.axisValue).toBe(0.33)
    })
  })

  describe('identityTrustToAxisValue / alternate CIDs', () => {
    it('maps levels to design axis values', () => {
      expect(identityTrustToAxisValue('high')).toBe(1)
      expect(identityTrustToAxisValue('medium')).toBe(0.66)
      expect(identityTrustToAxisValue('low')).toBe(0.33)
      expect(identityTrustToAxisValue('unresolved')).toBe(0)
    })

    it('mergeAlternateCids excludes primary and dedupes', () => {
      expect(mergeAlternateCids(1, [1, 2, 2], [3, 2])).toEqual([2, 3])
    })
  })
})
