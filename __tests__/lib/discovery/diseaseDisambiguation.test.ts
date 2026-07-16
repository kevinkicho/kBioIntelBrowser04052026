/**
 * Pure unit coverage for PR6b disease entity mapping helpers.
 */
import { diseaseResultToEntity, UnknownDiseaseIdError } from '@/lib/discovery'
import type { DiseaseResult } from '@/lib/diseaseSearch'

describe('diseaseResultToEntity', () => {
  it('maps Open Targets hit with id to DiseaseEntity', () => {
    const hit: DiseaseResult = {
      id: 'EFO_0000249',
      name: 'Alzheimer disease',
      description: 'desc',
      therapeuticAreas: ['nervous system disease'],
      source: 'Open Targets',
    }
    const entity = diseaseResultToEntity(hit)
    expect(entity.id).toBe('EFO_0000249')
    expect(entity.idNamespace).toBe('ot')
    expect(entity.name).toBe('Alzheimer disease')
    expect(entity.therapeuticAreas).toEqual(['nervous system disease'])
    expect(entity.identityTrust).toBe('medium')
    expect(entity.xrefs).toEqual([{ system: 'Open Targets', id: 'EFO_0000249' }])
  })

  it('falls back to name id when registry id missing', () => {
    const hit: DiseaseResult = {
      id: '',
      name: 'Some phenotype',
      source: 'DisGeNET',
    }
    const entity = diseaseResultToEntity(hit)
    expect(entity.id).toBe('Some phenotype')
    expect(entity.idNamespace).toBe('name')
    expect(entity.identityTrust).toBe('unresolved')
    expect(entity.xrefs).toEqual([])
  })
})

describe('UnknownDiseaseIdError', () => {
  it('carries diseaseId and clear message', () => {
    const err = new UnknownDiseaseIdError('EFO_BAD')
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('UnknownDiseaseIdError')
    expect(err.diseaseId).toBe('EFO_BAD')
    expect(err.message).toMatch(/no fuzzy substitute/i)
  })
})
