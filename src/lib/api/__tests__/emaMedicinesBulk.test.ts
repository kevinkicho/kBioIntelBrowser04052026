/**
 * @jest-environment node
 */

import { clearEmaBulkMemoryCache, parseEmaMedicinesSheet } from '../emaMedicinesBulk'

describe('emaMedicinesBulk', () => {
  beforeEach(() => clearEmaBulkMemoryCache())

  it('parses header + biosimilar flag rows', () => {
    const rows = [
      ['Content type:', 'Medicine'],
      [
        'Category',
        'Name of medicine',
        'EMA product number',
        'Medicine status',
        'International non-proprietary name (INN) / common name',
        'Active substance',
        'Therapeutic area (MeSH)',
        'ATC code (human)',
        'Biosimilar',
        'Orphan medicine',
        'Generic',
        'Advanced therapy',
        'Conditional approval',
        'Marketing authorisation developer / applicant / holder',
        'Marketing authorisation date',
      ],
      [
        'Human',
        'Amgevita',
        'EMEA/H/C/004212',
        'Authorised',
        'adalimumab',
        'adalimumab',
        'Arthritis',
        'L04AB04',
        'yes',
        'no',
        'no',
        'no',
        'no',
        'Amgen Europe B.V.',
        '2017-03-22',
      ],
      [
        'Human',
        'Humira',
        'EMEA/H/C/000481',
        'Authorised',
        'adalimumab',
        'adalimumab',
        'Arthritis',
        'L04AB04',
        'no',
        'no',
        'no',
        'no',
        'no',
        'AbbVie Deutschland GmbH',
        '2003-09-08',
      ],
    ]
    const cat = parseEmaMedicinesSheet(rows)
    expect(cat.products).toHaveLength(2)
    const amg = cat.products.find((p) => p.name === 'Amgevita')
    const hum = cat.products.find((p) => p.name === 'Humira')
    expect(amg?.biosimilar).toBe(true)
    expect(hum?.biosimilar).toBe(false)
    expect(amg?.inn).toBe('adalimumab')
    expect(amg?.emaProductNumber).toMatch(/004212/)
  })
})
