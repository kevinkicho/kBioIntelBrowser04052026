/**
 * Aggregate molecule bag used by legacy profiles.
 * Lives separately so domain DTO modules stay free of circular refs.
 */
import type { BaseMoleculeData, MyChemAnnotation } from './molecule'
import type {
  DrugBankDrug,
  DrugBankTarget,
  DrugBankInteraction,
  DrugCentralDrug,
  DrugCentralTarget,
  DrugCentralEnhanced,
  GSRSSubstance,
} from './pharmaceutical'
import type { MetaboliteData, MetabolomicsStudy } from './metabolomics'
import type { ToxCastData } from './toxicology'
import type {
  DisGeNetAssociation,
  OrphanetDisease,
  OMIMEntry,
  IEDBEpitope,
  HPOTerm,
} from './disease'
import type {
  MyGeneAnnotation,
  BgeeExpression,
  CTDInteraction,
  CTDDiseaseAssociation,
  PeptideAtlasEntry,
  ClinVarVariant,
  GOTerm,
  GTExExpression,
} from './geneGenomics'
import type {
  HMDBMetabolite,
  LipidMapsLipid,
  MassIVEDataset,
  UniChemMapping,
  FoodBCompound,
  PhytoHubCompound,
  DFDBFlavonoid,
} from './metabolomics'
import type { SIDERSideEffect, DrugShortage } from './clinicalSafety'
import type {
  UniProtProtein,
  ProteinVariation,
  ProteomicsMapping,
  CrossReference,
  ProteinAtlasData,
} from './proteinStructure'
import type { BioModelsModel, OLSTerm, BioSample } from './systems'
import type { LINCSSignature, TTDTarget, TTDDrug } from './bioactivity'

// Molecule Data (updated)
export interface MoleculeData extends BaseMoleculeData {
  drugbank?: {
    drug: DrugBankDrug | null
    targets: DrugBankTarget[]
    interactions: DrugBankInteraction[]
  }
  drugcentral?: {
    drug: DrugCentralDrug | null
    targets: DrugCentralTarget[]
  }
  metabolomics?: {
    metabolites: MetaboliteData[]
    studies: MetabolomicsStudy[]
  }
  toxcast?: ToxCastData | null
  disgenetAssociations?: DisGeNetAssociation[]
  orphanetDiseases?: OrphanetDisease[]
  myChemAnnotations?: MyChemAnnotation[]
  myGeneAnnotations?: MyGeneAnnotation[]
  bgeeExpressions?: BgeeExpression[]
  ctdInteractions?: CTDInteraction[]
  ctdDiseaseAssociations?: CTDDiseaseAssociation[]
  hmdbMetabolites?: HMDBMetabolite[]
  siderSideEffects?: SIDERSideEffect[]
  omimEntries?: OMIMEntry[]
  iedbEpitopes?: IEDBEpitope[]
  peptideAtlasEntries?: PeptideAtlasEntry[]
  uniprotProteins?: UniProtProtein[]
  clinvarVariants?: ClinVarVariant[]
  goTerms?: GOTerm[]
  hpoTerms?: HPOTerm[]
  gtexExpressions?: GTExExpression[]
  drugShortages?: DrugShortage[]
  lipidMapsLipids?: LipidMapsLipid[]
  bioModelsModels?: BioModelsModel[]
  olsTerms?: OLSTerm[]
  ebiProteinVariations?: ProteinVariation | null
  ebiProteomicsData?: ProteomicsMapping | null
  ebiCrossReferences?: CrossReference | null
  bioSamples?: BioSample[]
  massiveDatasets?: MassIVEDataset[]
  lincsSignatures?: LINCSSignature[]
  humanProteinAtlas?: ProteinAtlasData | null
  ttdTargets?: TTDTarget[]
  ttdDrugs?: TTDDrug[]
  drugCentralEnhanced?: DrugCentralEnhanced | null
  unichemMappings?: UniChemMapping[]
  foodbCompounds?: FoodBCompound[]
  phytohCompounds?: PhytoHubCompound[]
  dfdbFlavonoids?: DFDBFlavonoid[]
  gsrsSubstances?: GSRSSubstance[]
}
