/**
 * Therapeutic Target Database via free BioThings / NCATS Knowledge Provider API.
 * @see https://biothings.ncats.io/ttd
 * No invented rows — empty when no hits.
 */

export interface TTDTarget {
  id: string
  name: string
  synonym: string[]
  organism: string
  type: string
  function: string
  pathway: string[]
  associatedDiseases: string[]
  drugCount: number
  url: string
}

export interface TTDDrug {
  id: string
  name: string
  synonym: string[]
  type: string
  targets: string[]
  indications: string[]
  url: string
}

export interface TTDResult {
  targets: TTDTarget[]
  drugs: TTDDrug[]
}

const BIOTHINGS_TTD = 'https://biothings.ncats.io/ttd'
const fetchOpts: RequestInit = { next: { revalidate: 86400 } }

type BtHit = {
  _id?: string
  association?: {
    predicate?: string
    moa?: string
    ki?: string
    ic50?: string
    clinical_trial?: Array<{ disease?: string; status?: string }>
    trial_status?: string
  }
  subject?: Record<string, unknown>
  object?: Record<string, unknown>
}

async function queryTtd(q: string, size = 25): Promise<BtHit[]> {
  const url = `${BIOTHINGS_TTD}/query?q=${encodeURIComponent(q)}&size=${size}`
  const res = await fetch(url, fetchOpts)
  if (!res.ok) return []
  const data = (await res.json()) as { hits?: BtHit[] }
  return Array.isArray(data.hits) ? data.hits : []
}

function isProtein(o: Record<string, unknown> | undefined): boolean {
  if (!o) return false
  const t = String(o.type || '')
  return t.includes('Protein') || Boolean(o.ttd_target_id) || Boolean(o.uniprotkb)
}

function isSmallMolecule(o: Record<string, unknown> | undefined): boolean {
  if (!o) return false
  const t = String(o.type || '')
  return t.includes('SmallMolecule') || Boolean(o.pubchem_compound) || Boolean(o.ttd_drug_id)
}

function mapTarget(obj: Record<string, unknown>, assoc?: BtHit['association']): TTDTarget {
  const id = String(obj.ttd_target_id || obj.id || '')
  const diseases: string[] = []
  if (assoc?.clinical_trial) {
    for (const ct of assoc.clinical_trial) {
      if (ct.disease) diseases.push(ct.disease)
    }
  }
  return {
    id,
    name: String(obj.name || id),
    synonym: [],
    organism: 'Homo sapiens',
    type: String(obj.target_type || obj.bioclass || obj.type || 'target'),
    function: [assoc?.moa, assoc?.ki, assoc?.ic50, assoc?.trial_status].filter(Boolean).join(' · '),
    pathway: [],
    associatedDiseases: diseases,
    drugCount: 0,
    url: id
      ? `https://db.idrblab.net/ttd/data/target/details/${encodeURIComponent(id.replace(/^ttd_target_id:/, ''))}`
      : 'https://db.idrblab.net/ttd/',
  }
}

function mapDrug(subj: Record<string, unknown>, targetName?: string, disease?: string): TTDDrug {
  const id = String(subj.ttd_drug_id || subj.id || '')
  const cid = subj.pubchem_compound ? String(subj.pubchem_compound) : ''
  return {
    id,
    name: String(subj.name || id),
    synonym: cid ? [`CID ${cid}`] : [],
    type: String(subj.type || 'small molecule'),
    targets: targetName ? [targetName] : [],
    indications: disease ? [disease] : [],
    url: cid
      ? `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`
      : 'https://db.idrblab.net/ttd/',
  }
}

/**
 * Query TTD associations for a molecule or gene-like name via free BioThings KP.
 */
export async function getTTDData(query: string): Promise<TTDResult> {
  const q = query.trim()
  if (q.length < 2) return { targets: [], drugs: [] }

  try {
    // Prefer drug-as-subject name matches; also try free-text
    const [bySubject, byObject] = await Promise.all([
      queryTtd(`subject.name:${JSON.stringify(q)}`, 30),
      queryTtd(`object.name:${JSON.stringify(q)}`, 20),
    ])
    let hits = bySubject.length > 0 ? bySubject : []
    if (hits.length === 0) {
      hits = await queryTtd(q, 25)
    }
    // Merge object-name hits (gene/target query)
    const seen = new Set(hits.map((h) => h._id))
    for (const h of byObject) {
      if (h._id && !seen.has(h._id)) {
        seen.add(h._id)
        hits.push(h)
      }
    }

    const targetsById = new Map<string, TTDTarget>()
    const drugsById = new Map<string, TTDDrug>()

    for (const hit of hits) {
      const subj = hit.subject
      const obj = hit.object
      const assoc = hit.association

      if (isProtein(obj) && obj) {
        const t = mapTarget(obj, assoc)
        if (t.id || t.name) {
          const key = t.id || t.name
          if (!targetsById.has(key)) targetsById.set(key, t)
        }
      }
      if (isProtein(subj) && subj) {
        const t = mapTarget(subj, assoc)
        if (t.id || t.name) {
          const key = t.id || t.name
          if (!targetsById.has(key)) targetsById.set(key, t)
        }
      }

      if (isSmallMolecule(subj) && subj) {
        const targetName = isProtein(obj) && obj ? String(obj.name || '') : undefined
        const disease =
          isProtein(obj) === false && obj && String(obj.type || '').includes('Disease')
            ? String(obj.name || '')
            : assoc?.clinical_trial?.[0]?.disease
        const d = mapDrug(subj, targetName, disease)
        if (d.id || d.name) {
          const key = d.id || d.name
          const existing = drugsById.get(key)
          if (existing) {
            if (targetName && !existing.targets.includes(targetName)) {
              existing.targets.push(targetName)
            }
            if (disease && !existing.indications.includes(disease)) {
              existing.indications.push(disease)
            }
          } else {
            drugsById.set(key, d)
          }
        }
      }
    }

    // drugCount on targets (Array.from for TS targets without downlevelIteration)
    for (const d of Array.from(drugsById.values())) {
      for (const tn of d.targets) {
        for (const t of Array.from(targetsById.values())) {
          if (t.name === tn) t.drugCount += 1
        }
      }
    }

    return {
      targets: Array.from(targetsById.values()).slice(0, 25),
      drugs: Array.from(drugsById.values()).slice(0, 25),
    }
  } catch (err) {
    console.error('[ttd] BioThings query failed', err instanceof Error ? err.message : err)
    return { targets: [], drugs: [] }
  }
}

export async function searchTTDTargets(query: string): Promise<TTDTarget[]> {
  const r = await getTTDData(query)
  return r.targets
}

export async function searchTTDDrugs(query: string): Promise<TTDDrug[]> {
  const r = await getTTDData(query)
  return r.drugs
}
