import { BatchClient } from './BatchClient'

export const metadata = {
  title: 'Batch Molecule Lookup | BioIntel Explorer',
  description: 'Compare multiple molecules side by side with key physicochemical properties.',
}

export default function BatchPage() {
  return <BatchClient />
}
