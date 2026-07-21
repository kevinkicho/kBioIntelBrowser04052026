/**
 * Pure aggregator: originator → biosimilar / interchangeable family view.
 * Uses Purple Book license types when present; openFDA BLA heuristics as fallback.
 * Not clinical decision support or interchangeability legal advice.
 */

import type { BiologicLicensedProduct } from '@/lib/api/biologicsLicensed'
import {
  nonproprietaryCore as openFdaCore,
  looksLikeUsBiosimilarName,
} from '@/lib/api/biologicsLicensed'
import type { PurpleBookProduct } from '@/lib/api/purpleBookCache'
import {
  isPurpleBookBiosimilarLicense,
  isPurpleBookInterchangeableLicense,
} from '@/lib/api/purpleBookCache'
import type { PurpleBookPatent } from '@/lib/api/purpleBookPatents'
import type { EmaBulkMedicine } from '@/lib/api/emaMedicinesBulk'

export { nonproprietaryCore } from '@/lib/api/biologicsLicensed'

export type FamilyMemberRole = 'originator' | 'biosimilar' | 'interchangeable' | 'related'

export interface BiosimilarFamilyMember {
  brandName: string
  properName: string
  blaNumber: string
  applicant: string
  licenseType: string
  role: FamilyMemberRole
  approvalDate: string
  patentListProvided: boolean
  source: 'purple-book' | 'openfda-bla'
  drugsAtFdaUrl?: string
}

export interface BiosimilarFamilyView {
  /** Core nonproprietary stem e.g. adalimumab */
  stem: string
  members: BiosimilarFamilyMember[]
  originators: BiosimilarFamilyMember[]
  biosimilars: BiosimilarFamilyMember[]
  interchangeables: BiosimilarFamilyMember[]
  patents: PurpleBookPatent[]
  emaBiosimilars: EmaBulkMedicine[]
  /** Honest empty reasons for UX */
  notes: string[]
  /** Always true so profile panel visibility treats this as loaded */
  ready: true
}

function coreName(s: string): string {
  return openFdaCore(s.replace(/\s+/g, ' ').trim())
}

function roleFromPurpleBook(licenseType: string, properName: string): FamilyMemberRole {
  if (isPurpleBookInterchangeableLicense(licenseType)) return 'interchangeable'
  if (isPurpleBookBiosimilarLicense(licenseType)) return 'biosimilar'
  if (looksLikeUsBiosimilarName(properName.replace(/\s+/g, ''))) return 'biosimilar'
  if (/351\s*\(\s*a\s*\)/i.test(licenseType)) return 'originator'
  return 'related'
}

function roleFromOpenFda(p: BiologicLicensedProduct): FamilyMemberRole {
  if (p.roleGuess === 'likely_biosimilar') return 'biosimilar'
  if (p.roleGuess === 'reference_or_originator') return 'originator'
  if (looksLikeUsBiosimilarName(p.nonproprietaryName.replace(/\s+/g, ''))) return 'biosimilar'
  return 'related'
}

/**
 * Build biosimilar family navigator model from free-panel DTOs.
 */
export function buildBiosimilarFamily(input: {
  moleculeName: string
  purpleBookProducts?: readonly PurpleBookProduct[] | null
  biologicsLicensed?: readonly BiologicLicensedProduct[] | null
  purpleBookPatents?: readonly PurpleBookPatent[] | null
  emaBulkMedicines?: readonly EmaBulkMedicine[] | null
}): BiosimilarFamilyView {
  const stem = coreName(input.moleculeName || '')
  const notes: string[] = []
  const members: BiosimilarFamilyMember[] = []
  const seen = new Set<string>()

  const pb = input.purpleBookProducts ?? []
  for (const p of pb) {
    const proper = p.properName || ''
    const brand = p.proprietaryName || ''
    const key = `${p.blaNumber}|${brand}|${proper}|${p.strength}`
    if (seen.has(key)) continue
    // Keep rows related to stem or ref product stem
    const refCore = coreName(p.refProductProperName || proper)
    const myCore = coreName(proper)
    if (
      stem &&
      myCore.toLowerCase() !== stem.toLowerCase() &&
      refCore.toLowerCase() !== stem.toLowerCase() &&
      !proper.toLowerCase().includes(stem.toLowerCase()) &&
      !brand.toLowerCase().includes(stem.toLowerCase())
    ) {
      continue
    }
    seen.add(key)
    members.push({
      brandName: brand,
      properName: proper,
      blaNumber: p.blaNumber,
      applicant: p.applicant,
      licenseType: p.licenseType,
      role: roleFromPurpleBook(p.licenseType, proper),
      approvalDate: p.approvalDate,
      patentListProvided: /^yes$/i.test(p.patentListProvided || ''),
      source: 'purple-book',
      drugsAtFdaUrl: p.drugsAtFdaUrl,
    })
  }

  if (members.length === 0) {
    const bla = input.biologicsLicensed ?? []
    for (const p of bla) {
      const proper = p.nonproprietaryName || ''
      const brand = p.brandName || ''
      const key = `${p.applicationNumber}|${brand}|${proper}`
      if (seen.has(key)) continue
      seen.add(key)
      members.push({
        brandName: brand,
        properName: proper,
        blaNumber: p.applicationNumber,
        applicant: p.sponsorName,
        licenseType: p.roleGuess,
        role: roleFromOpenFda(p),
        approvalDate: p.approvalDate || '',
        patentListProvided: false,
        source: 'openfda-bla',
        drugsAtFdaUrl: p.drugsAtFdaUrl,
      })
    }
    if (members.length > 0) {
      notes.push('Purple Book empty for this name — family inferred from openFDA BLA records (heuristic roles).')
    }
  }

  const patents = [...(input.purpleBookPatents ?? [])]
  const emaBiosimilars = (input.emaBulkMedicines ?? []).filter((m) => m.biosimilar)

  if (members.length === 0) {
    notes.push('No BLA / Purple Book family members matched. Small molecules usually use Orange Book, not this navigator.')
  }
  if (patents.length === 0 && members.some((m) => m.patentListProvided || m.role === 'originator')) {
    notes.push('No BPPT patent rows loaded — open Purple Book patents panel or search BPPT by brand.')
  }

  const originators = members.filter((m) => m.role === 'originator')
  const biosimilars = members.filter((m) => m.role === 'biosimilar')
  const interchangeables = members.filter((m) => m.role === 'interchangeable')

  // Dedupe display by BLA+brand
  const dedupe = (list: BiosimilarFamilyMember[]) => {
    const s = new Set<string>()
    return list.filter((m) => {
      const k = `${m.blaNumber}|${m.brandName}`
      if (s.has(k)) return false
      s.add(k)
      return true
    })
  }

  return {
    stem: stem || input.moleculeName || '',
    members: dedupe(members),
    originators: dedupe(originators),
    biosimilars: dedupe(biosimilars),
    interchangeables: dedupe(interchangeables),
    patents: patents.slice(0, 40),
    emaBiosimilars: emaBiosimilars.slice(0, 20),
    notes,
    ready: true,
  }
}
