import { timedFetch } from './timedFetch'

const BASE_URL = 'https://gtexportal.org/rest/v1'

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
 * GTEx harvest leaf. HTTP / HTML / timeout are not EMPTY.
 * True 404 / missing gene / zero-hit JSON remains null / [].
 * v2 404 falls through to v1; if both fail with HTTP errors, throw.
 */
function isAbsentStatus(status: number): boolean {
  return status === 404
}

function throwIfHttpFailed(res: Response, source: string): void {
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  const contentType = (res.headers?.get?.('content-type') || '').toLowerCase()
  if (contentType.includes('text/html')) {
    throw new Error(`HTML response from ${source}`)
  }
}

async function resolveGeneSymbol(symbol: string): Promise<string | null> {
  const url = `${BASE_URL}/reference/gene?geneSymbol=${encodeURIComponent(symbol)}`
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(res.status)) return null
  throwIfHttpFailed(res, 'GTEx')
  const data = await res.json()
  const genes = data?.data ?? data
  if (Array.isArray(genes) && genes.length > 0) {
    return String(genes[0]?.gencodeId ?? genes[0]?.geneId ?? '') || null
  }
  if (genes?.gencodeId) return String(genes.gencodeId)
  if (genes?.geneId) return String(genes.geneId)
  return null
}

function mapGeneExpression(data: Record<string, unknown>, gencodeId: string): GTExGeneExpression {
  const expressionData =
    (data as { data?: { geneExpression?: unknown[] }; geneExpression?: unknown[] })?.data?.geneExpression ??
    (data as { geneExpression?: unknown[] })?.geneExpression ??
    []
  const geneInfo =
    (data as { data?: { geneInfo?: Record<string, unknown> }; geneInfo?: Record<string, unknown> })?.data?.geneInfo ??
    (data as { geneInfo?: Record<string, unknown> })?.geneInfo ??
    {}

  return {
    geneId: gencodeId,
    geneSymbol: String(geneInfo.symbol ?? geneInfo.geneSymbol ?? ''),
    biotype: String(geneInfo.biotype ?? ''),
    descriptions: String(geneInfo.description ?? ''),
    expressions: (expressionData as Record<string, unknown>[]).map((exp) => ({
      geneId: gencodeId,
      geneSymbol: String(geneInfo.symbol ?? geneInfo.geneSymbol ?? ''),
      tissueName: String(exp.tissueName ?? exp.tissueSiteDetail ?? ''),
      tissueCode: String(exp.tissueSiteDetailId ?? exp.tissueSiteDetail ?? ''),
      tpm: Number(exp.tpm ?? 0),
      tpmSd: Number(exp.tpmSd ?? 0),
      nSamples: Number(exp.nSamples ?? 0),
      rank: Number(exp.rank ?? 0),
      percentile: Number(exp.percentile ?? 0),
    })),
  }
}

export async function getGTExTissues(): Promise<GTExTissue[]> {
  return Object.entries(tissueMap).map(([name, code]) => ({
    tissueId: code,
    tissueName: name,
    tissueCode: code,
  }))
}

export async function getGTExGeneExpression(geneId: string): Promise<GTExGeneExpression | null> {
  let gencodeId = geneId
  if (!geneId.startsWith('ENSG')) {
    const resolved = await resolveGeneSymbol(geneId)
    if (!resolved) return null
    gencodeId = resolved
  }

  const v2Url = `https://gtexportal.org/api/v2/expression/gene?gencodeId=${encodeURIComponent(gencodeId)}`
  const v2 = await timedFetch(v2Url, { ...fetchOptions, timeoutMs: 8000 })
  if (v2.ok) {
    throwIfHttpFailed(v2, 'GTEx')
    return mapGeneExpression(await v2.json(), gencodeId)
  }

  const v1Url = `${BASE_URL}/expression/geneExpression?gencodeId=${encodeURIComponent(gencodeId)}`
  const v1 = await timedFetch(v1Url, { ...fetchOptions, timeoutMs: 8000 })
  if (v1.ok) {
    throwIfHttpFailed(v1, 'GTEx')
    return mapGeneExpression(await v1.json(), gencodeId)
  }
  if (isAbsentStatus(v2.status) && isAbsentStatus(v1.status)) return null
  throwIfHttpFailed(v2.status >= 500 ? v2 : v1, 'GTEx')
  return null
}

export async function getGTExEQTL(
  geneId: string,
  tissueName: string,
): Promise<GTExEQTL[]> {
  let gencodeId = geneId
  if (!geneId.startsWith('ENSG')) {
    const resolved = await resolveGeneSymbol(geneId)
    if (!resolved) return []
    gencodeId = resolved
  }

  const params = new URLSearchParams({
    gencodeId,
    tissueSiteDetailId: tissueName,
  })
  const url = `${BASE_URL}/association/eQTL?${params}`
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(res.status)) return []
  throwIfHttpFailed(res, 'GTEx')
  const data = await res.json()

  return (data?.data?.eqtlList ?? data?.eqtlList ?? []).map((eqtl: Record<string, unknown>) => ({
    variantId: eqtl.variantId ?? '',
    geneId: gencodeId,
    geneSymbol: eqtl.geneSymbol ?? '',
    tissueName: eqtl.tissueName ?? tissueName,
    slope: eqtl.slope ?? 0,
    tStat: eqtl.tStat ?? 0,
    pValue: eqtl.pValue ?? 0,
    pValueNominal: eqtl.pValueNominal ?? 0,
    qValue: eqtl.qValue ?? 0,
  }))
}

export async function getGTExTissueExpression(
  geneId: string,
  tissueName: string,
): Promise<GTExExpression | null> {
  const result = await getGTExGeneExpression(geneId)
  if (!result) return null

  const tissueExp = result.expressions.find(
    (exp) => exp.tissueCode === tissueName || exp.tissueName === tissueName,
  )
  return tissueExp ?? null
}

export async function getGTExTopTissues(geneId: string, limit = 5): Promise<GTExExpression[]> {
  const result = await getGTExGeneExpression(geneId)
  if (!result) return []

  return result.expressions
    .sort((a, b) => b.tpm - a.tpm)
    .slice(0, limit)
}
