import {
  isUnsafeReactChild,
  safeDisplayString,
} from '@/lib/reactSafe'

describe('reactSafe', () => {
  describe('safeDisplayString', () => {
    it('passes through non-empty strings', () => {
      expect(safeDisplayString('Aspirin')).toBe('Aspirin')
    })

    it('handles null/empty', () => {
      expect(safeDisplayString(null)).toBe('—')
      expect(safeDisplayString('')).toBe('—')
      expect(safeDisplayString('  ')).toBe('—')
      expect(safeDisplayString(undefined, { empty: 'n/a' })).toBe('n/a')
    })

    it('formats numbers and booleans', () => {
      expect(safeDisplayString(42)).toBe('42')
      expect(safeDisplayString(Number.NaN)).toBe('—')
      expect(safeDisplayString(true)).toBe('true')
    })

    it('extracts UniProt proteinDescription shape (React #31 root cause)', () => {
      const nested = {
        recommendedName: { fullName: { value: 'Prothrombin' } },
        alternativeNames: [{ fullName: { value: 'Coagulation factor II' } }],
      }
      expect(safeDisplayString(nested)).toBe('Prothrombin')
      expect(typeof safeDisplayString(nested)).toBe('string')
    })

    it('falls back to alternativeNames', () => {
      expect(
        safeDisplayString({
          alternativeNames: [{ fullName: { value: 'Coagulation factor II' } }],
        }),
      ).toBe('Coagulation factor II')
    })

    it('uses common name keys', () => {
      expect(safeDisplayString({ name: 'TTR' })).toBe('TTR')
      expect(safeDisplayString({ value: 'secreted' })).toBe('secreted')
      expect(safeDisplayString({ fullName: { value: 'X' } })).toBe('X')
    })

    it('never returns a plain object (always string)', () => {
      const out = safeDisplayString({ foo: 1, bar: 2 })
      expect(typeof out).toBe('string')
      expect(out).toBe('—')
    })

    it('respects maxLen', () => {
      expect(safeDisplayString('abcdefghij', { maxLen: 5 })).toBe('abcd…')
    })
  })

  describe('isUnsafeReactChild', () => {
    it('flags plain objects', () => {
      expect(isUnsafeReactChild({ recommendedName: {} })).toBe(true)
    })

    it('allows primitives and null', () => {
      expect(isUnsafeReactChild('ok')).toBe(false)
      expect(isUnsafeReactChild(1)).toBe(false)
      expect(isUnsafeReactChild(null)).toBe(false)
    })

    it('allows arrays (caller should map them)', () => {
      // Arrays are valid React children of elements — not the #31 case
      expect(isUnsafeReactChild(['a'])).toBe(false)
    })
  })
})
