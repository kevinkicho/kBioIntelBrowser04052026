export interface Category {
  title: string
  description: string
  molecules: string[]
}

export const CATEGORIES: Record<string, Category> = {
  therapeutics: {
    title: 'Therapeutics',
    description: 'Approved drugs and therapeutic compounds used to treat diseases and conditions.',
    molecules: ['insulin', 'metformin', 'aspirin', 'doxorubicin', 'penicillin', 'ibuprofen', 'amoxicillin', 'omeprazole'],
  },
  enzymes: {
    title: 'Enzymes',
    description: 'Biological catalysts used in research, diagnostics, and industrial manufacturing.',
    molecules: ['amylase', 'trypsin', 'lipase', 'catalase', 'lactase', 'pepsin', 'urease', 'lysozyme'],
  },
  diagnostics: {
    title: 'Diagnostics',
    description: 'Compounds used in medical imaging, laboratory diagnostics, and detection assays.',
    molecules: ['fluorescein', 'gadolinium', 'glucose', 'urea', 'creatinine', 'bilirubin', 'cholesterol'],
  },
  reagents: {
    title: 'Research Reagents',
    description: 'Common laboratory chemicals and reagents used in biological research.',
    molecules: ['ethanol', 'glycerol', 'DMSO', 'formaldehyde', 'acetic acid', 'sodium chloride', 'tris'],
  },
  industrial: {
    title: 'Industrial Biotech',
    description: 'Enzymes and compounds used in industrial manufacturing, food processing, and biofuels.',
    molecules: ['cellulase', 'protease', 'xylanase', 'phytase', 'laccase', 'citric acid', 'ethanol', 'lactic acid'],
  },
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return CATEGORIES[slug]
}
