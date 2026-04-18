'use client'

import { useSearchParams } from 'next/navigation'
import { DiseaseCompareHeader, type CompareCandidateData } from '@/components/compare/DiseaseCompareHeader'

interface DiseaseCompareHeaderWrapperProps {
  dataA: Record<string, unknown>
  dataB: Record<string, unknown>
  cidA: number
  cidB: number
}

const ensureDefault = (d: Record<string, unknown>, key: string): unknown[] => Array.isArray(d[key]) ? d[key] as unknown[] : []

function toCompareData(d: Record<string, unknown>): CompareCandidateData {
  return {
    clinicalTrials: ensureDefault(d, 'clinicalTrials'),
    uniprotEntries: ensureDefault(d, 'uniprotEntries'),
    chemblIndications: ensureDefault(d, 'chemblIndications'),
    chemblMechanisms: ensureDefault(d, 'chemblMechanisms'),
    adverseEvents: ensureDefault(d, 'adverseEvents'),
    ...d,
  }
}

export function DiseaseCompareHeaderWrapper({ dataA, dataB, cidA, cidB }: DiseaseCompareHeaderWrapperProps) {
  const searchParams = useSearchParams()
  const disease = searchParams.get('disease')
  const scoreA = parseFloat(searchParams.get('scoreA') ?? '')
  const scoreB = parseFloat(searchParams.get('scoreB') ?? '')
  const confidenceA = searchParams.get('confidenceA') ?? 'preliminary'
  const confidenceB = searchParams.get('confidenceB') ?? 'preliminary'
  const nameA = searchParams.get('nameA') ?? ''
  const nameB = searchParams.get('nameB') ?? ''

  if (!disease || isNaN(scoreA) || isNaN(scoreB)) return null

  return (
    <DiseaseCompareHeader
      disease={disease}
      nameA={nameA}
      nameB={nameB}
      cidA={cidA}
      cidB={cidB}
      scoreA={scoreA}
      scoreB={scoreB}
      confidenceA={confidenceA}
      confidenceB={confidenceB}
      dataA={toCompareData(dataA)}
      dataB={toCompareData(dataB)}
    />
  )
}