// GTEx Portal API Client
// https://gtexportal.org/
// Normal tissue gene expression baselines across 54 tissues

const BASE_URL = 'https://gtexportal.org/api/v2'

const fetchOptions: RequestInit = {
  next: { revalidate: 86400 },
}

export interface GTExTissue {
  tissueId: string
  tissueName: string
  tissueCode: string
}

export interface GTExExpression {
  geneId: string
  geneSymbol: string
  tissueName: string
  tissueCode: string
  tpm: number
  tpmSd: number
  nSamples: number
  rank: number
  percentile: number
}

export interface GTExGeneExpression {
  geneId: string
  geneSymbol: string
  biotype: string
  descriptions: string
  expressions: GTExExpression[]
}

export interface GTExEQTL {
  variantId: string
  geneId: string
  geneSymbol: string
  tissueName: string
  slope: number
  tStat: number
  pValue: number
  pValueNominal: number
  qValue: number
}

const tissueMap: Record<string, string> = {
  'Adipose - Subcutaneous': 'Adipose_Subcutaneous',
  'Adipose - Visceral (Omental)': 'Adipose_Visceral_Omentum',
  'Adrenal Gland': 'Adrenal_Gland',
  'Artery - Aorta': 'Artery_Aorta',
  'Artery - Coronary': 'Artery_Coronary',
  'Artery - Tibial': 'Artery_Tibial',
  'Bladder': 'Bladder',
  'Brain - Amygdala': 'Brain_Amygdala',
  'Brain - Anterior cingulate cortex (BA24)': 'Brain_Anterior_cingulate_cortex_BA24',
  'Brain - Caudate (basal ganglia)': 'Brain_Caudate_basal_ganglia',
  'Brain - Cerebellar Hemisphere': 'Brain_Cerebellar_Hemisphere',
  'Brain - Cerebellum': 'Brain_Cerebellum',
  'Brain - Cortex': 'Brain_Cortex',
  'Brain - Frontal Cortex (BA9)': 'Brain_Frontal_Cortex_BA9',
  'Brain - Hippocampus': 'Brain_Hippocampus',
  'Brain - Hypothalamus': 'Brain_Hypothalamus',
  'Brain - Nucleus accumbens (basal ganglia)': 'Brain_Nucleus_accumbens_basal_ganglia',
  'Brain - Putamen (basal ganglia)': 'Brain_Putamen_basal_ganglia',
  'Brain - Spinal cord (cervical c-1)': 'Brain_Spinal_cord_cervical_c1',
  'Brain - Substantia nigra': 'Brain_Substantia_nigra',
  'Breast - Mammary Tissue': 'Breast_Mammary_Tissue',
  'Cells - EBV-transformed lymphocytes': 'Cells_EBV_transformed_lymphocytes',
  'Cells - Cultured fibroblasts': 'Cells_Cultured_fibroblasts',
  'Cervix - Ectocervix': 'Cervix_Ectocervix',
  'Cervix - Endocervix': 'Cervix_Endocervix',
  'Colon - Sigmoid': 'Colon_Sigmoid',
  'Colon - Transverse': 'Colon_Transverse',
  'Esophagus - Gastroesophageal Junction': 'Esophagus_Gastroesophageal_Junction',
  'Esophagus - Mucosa': 'Esophagus_Mucosa',
  'Esophagus - Muscularis': 'Esophagus_Muscularis',
  'Fallopian Tube': 'Fallopian_Tube',
  'Heart - Atrial Appendage': 'Heart_Atrial_Appendage',
  'Heart - Left Ventricle': 'Heart_Left_Ventricle',
  'Kidney - Cortex': 'Kidney_Cortex',
  'Kidney - Medulla': 'Kidney_Medulla',
  'Liver': 'Liver',
  'Lung': 'Lung',
  'Minor Salivary Gland': 'Minor_Salivary_Gland',
  'Muscle - Skeletal': 'Muscle_Skeletal',
  'Nerve - Tibial': 'Nerve_Tibial',
  'Ovary': 'Ovary',
  'Pancreas': 'Pancreas',
  'Pituitary': 'Pituitary',
  'Prostate': 'Prostate',
  'Skin - Not Sun Exposed (Suprapubic)': 'Skin_Not_Sun_Exposed_Suprapubic',
  'Skin - Sun Exposed (Lower leg)': 'Skin_Sun_Exposed_Lower_leg',
  'Small Intestine - Terminal Ileum': 'Small_Intestine_Terminal_Ileum',
  'Spleen': 'Spleen',
  'Stomach': 'Stomach',
  'Testis': 'Testis',
  'Thyroid': 'Thyroid',
  'Uterus': 'Uterus',
  'Vagina': 'Vagina',
  'Whole Blood': 'Whole_Blood',
}

/**
 * Get all GTEx tissues
 */
export async function getGTExTissues(): Promise<GTExTissue[]> {
  return Object.entries(tissueMap).map(([name, code]) => ({
    tissueId: code,
    tissueName: name,
    tissueCode: code,
  }))
}

/**
 * Get gene expression across all tissues
 */
export async function getGTExGeneExpression(geneId: string): Promise<GTExGeneExpression | null> {
  try {
    const params = new URLSearchParams({
      gencodeId: geneId,
    })
    const url = `${BASE_URL}/expression/gene?${params}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) throw new Error('GTEx expression request failed')
    const data = await res.json()

    const expressionData = data.data?.geneExpression ?? []
    const geneInfo = data.data?.geneInfo ?? {}

    return {
      geneId: geneInfo.gencodeId ?? geneId,
      geneSymbol: geneInfo.symbol ?? '',
      biotype: geneInfo.biotype ?? '',
      descriptions: geneInfo.description ?? '',
      expressions: expressionData.map((exp: Record<string, unknown>) => ({
        geneId,
        geneSymbol: geneInfo.symbol ?? '',
        tissueName: exp.tissueName ?? '',
        tissueCode: exp.tissueSiteDetailId ?? '',
        tpm: exp.tpm ?? 0,
        tpmSd: exp.tpmSd ?? 0,
        nSamples: exp.nSamples ?? 0,
        rank: exp.rank ?? 0,
        percentile: exp.percentile ?? 0,
      })),
    }
  } catch {
    return null
  }
}

/**
 * Get eQTL data for a gene in a specific tissue
 */
export async function getGTExEQTL(
  geneId: string,
  tissueName: string,
): Promise<GTExEQTL[]> {
  try {
    const params = new URLSearchParams({
      geneId,
      tissueName,
    })
    const url = `${BASE_URL}/expression/eQTL?${params}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) throw new Error('GTEx eQTL request failed')
    const data = await res.json()

    return (data.data?.eqtlList ?? []).map((eqtl: Record<string, unknown>) => ({
      variantId: eqtl.variantId ?? '',
      geneId: eqtl.geneId ?? '',
      geneSymbol: eqtl.geneSymbol ?? '',
      tissueName: eqtl.tissueName ?? '',
      slope: eqtl.slope ?? 0,
      tStat: eqtl.tStat ?? 0,
      pValue: eqtl.pValue ?? 0,
      pValueNominal: eqtl.pValueNominal ?? 0,
      qValue: eqtl.qValue ?? 0,
    }))
  } catch {
    return []
  }
}

/**
 * Get tissue-specific expression for a gene
 */
export async function getGTExTissueExpression(
  geneId: string,
  tissueName: string,
): Promise<GTExExpression | null> {
  try {
    const result = await getGTExGeneExpression(geneId)
    if (!result) return null

    const tissueExp = result.expressions.find(
      (exp) => exp.tissueCode === tissueName || exp.tissueName === tissueName,
    )
    return tissueExp ?? null
  } catch {
    return null
  }
}

/**
 * Get top expressed tissues for a gene
 */
export async function getGTExTopTissues(geneId: string, limit = 5): Promise<GTExExpression[]> {
  try {
    const result = await getGTExGeneExpression(geneId)
    if (!result) return []

    return result.expressions
      .sort((a, b) => b.tpm - a.tpm)
      .slice(0, limit)
  } catch {
    return []
  }
}
