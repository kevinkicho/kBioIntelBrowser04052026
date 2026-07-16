/**
 * Golden fixtures for Core panel DTOs → EvidenceClaim extractors (PR9).
 * Realistic aspirin / liraglutide-shaped records for pure unit tests.
 */

import type {
  AdverseEvent,
  ChemblActivity,
  ChemblMechanism,
  ClinicalTrial,
  DiseaseAssociation,
} from '@/lib/types'
import type { CorePanelEvidenceInput } from '../extractAll'
import type { ClaimExtractorContext } from '../context'

/** Pinned retrieval time for deterministic provenance. */
export const FIXTURE_RETRIEVED_AT = '2026-04-07T12:00:00.000Z'

export const FIXTURE_CANDIDATE_ID = 'ch:CHEMBL25'

export const FIXTURE_CTX: ClaimExtractorContext = {
  retrievedAt: FIXTURE_RETRIEVED_AT,
  subjectCandidateId: FIXTURE_CANDIDATE_ID,
  moleculeName: 'Aspirin',
}

export const FIXTURE_CHEMBL_ACTIVITIES: ChemblActivity[] = [
  {
    activityId: 'ACT_001',
    targetName: 'Cyclooxygenase-2',
    targetOrganism: 'Homo sapiens',
    targetChemblId: 'CHEMBL230',
    chemblId: 'CHEMBL25',
    assayType: 'B',
    standardType: 'IC50',
    standardValue: 0.04,
    standardUnits: 'uM',
    pchemblValue: 7.4,
    activityType: 'IC50',
    activityValue: 0.04,
    activityUnits: 'uM',
    url: 'https://www.ebi.ac.uk/chembl/compound_report_card/CHEMBL25/',
  },
  {
    activityId: 'ACT_002',
    targetName: 'Cyclooxygenase-1',
    targetOrganism: 'Homo sapiens',
    targetChemblId: 'CHEMBL221',
    chemblId: 'CHEMBL25',
    assayType: 'B',
    standardType: 'IC50',
    standardValue: 5.2,
    standardUnits: 'uM',
    pchemblValue: 5.28,
    activityType: 'IC50',
    activityValue: 5.2,
    activityUnits: 'uM',
    url: 'https://www.ebi.ac.uk/chembl/compound_report_card/CHEMBL25/',
  },
]

export const FIXTURE_CHEMBL_MECHANISMS: ChemblMechanism[] = [
  {
    mechanismId: 'MECH_001',
    moleculeName: 'ASPIRIN',
    targetName: 'Cyclooxygenase-1',
    targetChemblId: 'CHEMBL221',
    actionType: 'INHIBITOR',
    mechanismOfAction: 'Cyclooxygenase inhibitor',
    directInteraction: true,
    diseaseEfficacy: true,
    url: 'https://www.ebi.ac.uk/chembl/target_report_card/CHEMBL221/',
    maxPhase: 4,
  },
]

export const FIXTURE_ADVERSE_EVENTS: AdverseEvent[] = [
  {
    id: 'AE_nausea',
    drugName: 'aspirin',
    reactionName: 'nausea',
    reaction: 'nausea',
    serious: 45,
    outcome: 'recovered/resolved',
    reportDate: '2024-01-15',
    count: 1523,
  },
  {
    id: 'AE_gi_bleed',
    drugName: 'aspirin',
    reactionName: 'gastrointestinal haemorrhage',
    reaction: 'gastrointestinal haemorrhage',
    serious: 210,
    outcome: 'other',
    reportDate: '2024-02-01',
    count: 380,
  },
]

export const FIXTURE_CLINICAL_TRIALS: ClinicalTrial[] = [
  {
    nctId: 'NCT01234567',
    title: 'Aspirin for Primary Prevention of Cardiovascular Events',
    status: 'COMPLETED',
    phase: 'Phase 3',
    startDate: '2010-01-01',
    completionDate: '2015-06-30',
    conditions: ['Cardiovascular Diseases', 'Myocardial Infarction'],
    interventions: ['Aspirin', 'Placebo'],
    sponsor: 'NIH',
    enrollment: 12000,
  },
  {
    nctId: 'NCT07654321',
    title: 'Low-Dose Aspirin in Type 2 Diabetes',
    status: 'RECRUITING',
    phase: 'Phase 2',
    startDate: '2023-03-01',
    completionDate: '',
    conditions: ['Type 2 Diabetes Mellitus'],
    interventions: ['Aspirin'],
    sponsor: 'Example University',
    enrollment: 400,
  },
]

export const FIXTURE_DISEASE_ASSOCIATIONS: DiseaseAssociation[] = [
  {
    diseaseId: 'EFO_0001360',
    diseaseName: 'type 2 diabetes mellitus',
    description: 'A metabolic disorder...',
    score: 0.82,
    evidenceCount: 14,
    sources: ['Open Targets'],
    therapeuticAreas: ['metabolic disease'],
  },
  {
    diseaseId: 'EFO_0001645',
    diseaseName: 'coronary artery disease',
    score: 0.71,
    evidenceCount: 9,
    sources: ['Open Targets'],
    therapeuticAreas: ['cardiovascular disease'],
  },
]

/** Full Core panel bag for aggregate extractAll tests. */
export const FIXTURE_CORE_PANELS: CorePanelEvidenceInput = {
  chemblActivities: FIXTURE_CHEMBL_ACTIVITIES,
  chemblMechanisms: FIXTURE_CHEMBL_MECHANISMS,
  adverseEvents: FIXTURE_ADVERSE_EVENTS,
  clinicalTrials: FIXTURE_CLINICAL_TRIALS,
  diseaseAssociations: FIXTURE_DISEASE_ASSOCIATIONS,
}

/** Empty panels — extractors must return []. */
export const FIXTURE_EMPTY_PANELS: CorePanelEvidenceInput = {
  chemblActivities: [],
  chemblMechanisms: [],
  adverseEvents: [],
  clinicalTrials: [],
  diseaseAssociations: [],
}
