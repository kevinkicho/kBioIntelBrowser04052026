import type { BindingAffinity } from '../types'
import { getChemblActivitiesByName } from './chembl'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * Binding affinities by compound name.
 * Legacy BindingDB JSON name search (MolsFromName.json) is gone (404).
 * Free fallback: ChEMBL activities (Ki/Kd/IC50/EC50) which BindingDB also sources.
 */
export async function getBindingAffinitiesByName(name: string): Promise<BindingAffinity[]> {
  try {
    const q = name?.trim()
    if (!q) return []

    // Prefer ChEMBL free JSON (reliable) for affinity-type rows
    const activities = await getChemblActivitiesByName(q, 25)
    const affinityTypes = new Set(['Ki', 'Kd', 'IC50', 'EC50', 'Ki app', 'IC50 app'])
    const fromChembl: BindingAffinity[] = activities
      .filter(
        (a) =>
          affinityTypes.has(String(a.standardType || a.activityType || '').trim()) ||
          a.standardValue != null,
      )
      .slice(0, 15)
      .map((a) => ({
        ligandId: a.chemblId || '',
        ligandName: name,
        targetName: a.targetName || a.targetChemblId || '',
        affinityType: String(a.standardType || a.activityType || 'IC50'),
        affinityValue: Number(a.standardValue || a.activityValue) || 0,
        affinityUnit: String(a.standardUnits || a.activityUnits || 'nM'),
        affinityUnits: String(a.standardUnits || a.activityUnits || 'nM'),
        source: 'ChEMBL',
        doi: '',
      }))

    if (fromChembl.length > 0) return fromChembl

    // Optional BindingDB REST by UniProt if caller passed accession-like token
    if (/^[OPQ][0-9][A-Z0-9]{3}[0-9]$/i.test(q) || /^[A-NR-Z][0-9]([A-Z][A-Z0-9]{2}[0-9]){1,2}$/i.test(q)) {
      const url = `https://bindingdb.org/rest/getLigandsByUniprot?uniprot=${encodeURIComponent(q)};10000&response=application/json`
      const res = await fetch(url, { ...fetchOptions, signal: AbortSignal.timeout(12_000) })
      if (!res.ok) return []
      const data = await res.json()
      // Response shape varies; best-effort parse
      const rows = Array.isArray(data) ? data : data?.affinities ?? data?.ligands ?? []
      if (!Array.isArray(rows)) return []
      return rows.slice(0, 10).map((r: Record<string, unknown>, i: number) => ({
        ligandId: String(r.monomerid ?? r.ligand_id ?? i),
        ligandName: String(r.ligand_name ?? r.name ?? ''),
        targetName: String(r.target_name ?? q),
        affinityType: String(r.affinity_type ?? 'IC50'),
        affinityValue: Number(r.affinity ?? r.ic50 ?? 0) || 0,
        affinityUnit: 'nM',
        affinityUnits: 'nM',
        source: 'BindingDB',
        doi: '',
      }))
    }

    return []
  } catch {
    return []
  }
}
