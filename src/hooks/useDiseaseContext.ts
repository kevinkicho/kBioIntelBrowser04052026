'use client'

import { useSearchParams } from 'next/navigation'

export interface DiseaseContext {
  fromDiscover: boolean
  disease: string | null
  rank: number | null
  score: number | null
  confidence: string | null
}

const DISEASE_STOP_WORDS = new Set([
  'disease', 'disorder', 'syndrome', 'condition', 'illness', 'infection',
  'the', 'of', 'a', 'an', 'and', 'or', 'with', 'in', 'for', 'to', 'from',
])

export function normalizeDiseaseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']s/g, '')
    .replace(/[()]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isMatch(text: string, diseaseName: string): boolean {
  const normText = normalizeDiseaseName(text)
  const normDisease = normalizeDiseaseName(diseaseName)
  if (normText.includes(normDisease)) return true
  const diseaseWords = normDisease.split(/\s+/).filter(w => w.length > 2 && !DISEASE_STOP_WORDS.has(w))
  if (diseaseWords.length === 0) return false
  return diseaseWords.every(word => normText.includes(word))
}

export function useDiseaseContext(): DiseaseContext {
  const searchParams = useSearchParams()
  const fromDiscover = searchParams.get('from') === 'discover'
  const disease = searchParams.get('disease')
  const rankParam = searchParams.get('rank')
  const scoreParam = searchParams.get('score')
  const confidence = searchParams.get('confidence')

  return {
    fromDiscover,
    disease,
    rank: rankParam ? parseInt(rankParam, 10) || null : null,
    score: scoreParam ? parseFloat(scoreParam) || null : null,
    confidence,
  }
}