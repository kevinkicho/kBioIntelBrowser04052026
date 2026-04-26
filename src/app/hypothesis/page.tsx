import { Suspense } from 'react'
import { HypothesisClient } from './HypothesisClient'

export const metadata = {
  title: 'Hypothesis Builder · BioIntel Explorer',
  description:
    'Stack filters across targets, indications, trials, and ATC classes to find molecules matching your hypothesis.',
}

export default function HypothesisPage() {
  return (
    <Suspense fallback={null}>
      <HypothesisClient />
    </Suspense>
  )
}
