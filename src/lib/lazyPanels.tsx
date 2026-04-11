import dynamic from 'next/dynamic'
import { PanelSkeleton } from '@/components/ui/PanelSkeleton'

// Loading component for all lazy-loaded panels
const LoadingComponent = () => <PanelSkeleton />

// Lazy-loaded panel components
// These panels are loaded on-demand to reduce initial bundle size

// Pharmaceutical category
export const LazyCompaniesPanel = dynamic(
  () => import('@/components/profile/CompaniesPanel').then(m => ({ default: m.CompaniesPanel })),
  { loading: LoadingComponent }
)

export const LazyNdcPanel = dynamic(
  () => import('@/components/profile/NdcPanel').then(m => ({ default: m.NdcPanel })),
  { loading: LoadingComponent }
)

export const LazyOrangeBookPanel = dynamic(
  () => import('@/components/profile/OrangeBookPanel').then(m => ({ default: m.OrangeBookPanel })),
  { loading: LoadingComponent }
)

export const LazyNadacPanel = dynamic(
  () => import('@/components/profile/NadacPanel').then(m => ({ default: m.NadacPanel })),
  { loading: LoadingComponent }
)

export const LazyDrugInteractionsPanel = dynamic(
  () => import('@/components/profile/DrugInteractionsPanel').then(m => ({ default: m.DrugInteractionsPanel })),
  { loading: LoadingComponent }
)

export const LazyDailyMedPanel = dynamic(
  () => import('@/components/profile/DailyMedPanel').then(m => ({ default: m.DailyMedPanel })),
  { loading: LoadingComponent }
)

export const LazyAtcPanel = dynamic(
  () => import('@/components/profile/AtcPanel').then(m => ({ default: m.AtcPanel })),
  { loading: LoadingComponent }
)

// Clinical category
export const LazyClinicalTrialsPanel = dynamic(
  () => import('@/components/profile/ClinicalTrialsPanel').then(m => ({ default: m.ClinicalTrialsPanel })),
  { loading: LoadingComponent }
)

export const LazyAdverseEventsPanel = dynamic(
  () => import('@/components/profile/AdverseEventsPanel').then(m => ({ default: m.AdverseEventsPanel })),
  { loading: LoadingComponent }
)

export const LazyRecallsPanel = dynamic(
  () => import('@/components/profile/RecallsPanel').then(m => ({ default: m.RecallsPanel })),
  { loading: LoadingComponent }
)

export const LazyChemblIndicationsPanel = dynamic(
  () => import('@/components/profile/ChemblIndicationsPanel').then(m => ({ default: m.ChemblIndicationsPanel })),
  { loading: LoadingComponent }
)

// Research category
export const LazyClinVarPanel = dynamic(
  () => import('@/components/profile/ClinVarPanel').then(m => ({ default: m.ClinVarPanel })),
  { loading: LoadingComponent }
)

export const LazyGwasCatalogPanel = dynamic(
  () => import('@/components/profile/GwasCatalogPanel').then(m => ({ default: m.GwasCatalogPanel })),
  { loading: LoadingComponent }
)

export const LazyNihReporterPanel = dynamic(
  () => import('@/components/profile/NihReporterPanel').then(m => ({ default: m.NihReporterPanel })),
  { loading: LoadingComponent }
)

export const LazyPatentsPanel = dynamic(
  () => import('@/components/profile/PatentsPanel').then(m => ({ default: m.PatentsPanel })),
  { loading: LoadingComponent }
)

export const LazySecEdgarPanel = dynamic(
  () => import('@/components/profile/SecEdgarPanel').then(m => ({ default: m.SecEdgarPanel })),
  { loading: LoadingComponent }
)

export const LazyLiteraturePanel = dynamic(
  () => import('@/components/profile/LiteraturePanel').then(m => ({ default: m.LiteraturePanel })),
  { loading: LoadingComponent }
)

export const LazyPubMedPanel = dynamic(
  () => import('@/components/profile/PubMedPanel').then(m => ({ default: m.PubMedPanel })),
  { loading: LoadingComponent }
)

export const LazySemanticScholarPanel = dynamic(
  () => import('@/components/profile/SemanticScholarPanel').then(m => ({ default: m.SemanticScholarPanel })),
  { loading: LoadingComponent }
)

export const LazyOpenAlexPanel = dynamic(
  () => import('@/components/profile/OpenAlexPanel').then(m => ({ default: m.OpenAlexPanel })),
  { loading: LoadingComponent }
)

export const LazyOpenCitationsPanel = dynamic(
  () => import('@/components/profile/OpenCitationsPanel').then(m => ({ default: m.OpenCitationsPanel })),
  { loading: LoadingComponent }
)

// Bioactivity category
export const LazyPropertiesPanel = dynamic(
  () => import('@/components/profile/PropertiesPanel').then(m => ({ default: m.PropertiesPanel })),
  { loading: LoadingComponent }
)

export const LazyHazardsPanel = dynamic(
  () => import('@/components/profile/HazardsPanel').then(m => ({ default: m.HazardsPanel })),
  { loading: LoadingComponent }
)

export const LazyChebiPanel = dynamic(
  () => import('@/components/profile/ChebiPanel').then(m => ({ default: m.ChebiPanel })),
  { loading: LoadingComponent }
)

export const LazyCompToxPanel = dynamic(
  () => import('@/components/profile/CompToxPanel').then(m => ({ default: m.CompToxPanel })),
  { loading: LoadingComponent }
)

export const LazySynthesisPanel = dynamic(
  () => import('@/components/profile/SynthesisPanel').then(m => ({ default: m.SynthesisPanel })),
  { loading: LoadingComponent }
)

export const LazyChemblPanel = dynamic(
  () => import('@/components/profile/ChemblPanel').then(m => ({ default: m.ChemblPanel })),
  { loading: LoadingComponent }
)

export const LazyBioAssayPanel = dynamic(
  () => import('@/components/profile/BioAssayPanel').then(m => ({ default: m.BioAssayPanel })),
  { loading: LoadingComponent }
)

export const LazyChemblMechanismsPanel = dynamic(
  () => import('@/components/profile/ChemblMechanismsPanel').then(m => ({ default: m.ChemblMechanismsPanel })),
  { loading: LoadingComponent }
)

// Targets category
export const LazyIupharPanel = dynamic(
  () => import('@/components/profile/IupharPanel').then(m => ({ default: m.IupharPanel })),
  { loading: LoadingComponent }
)

export const LazyBindingDbPanel = dynamic(
  () => import('@/components/profile/BindingDbPanel').then(m => ({ default: m.BindingDbPanel })),
  { loading: LoadingComponent }
)

export const LazyPharosPanel = dynamic(
  () => import('@/components/profile/PharosPanel').then(m => ({ default: m.PharosPanel })),
  { loading: LoadingComponent }
)

export const LazyDgidbPanel = dynamic(
  () => import('@/components/profile/DgidbPanel').then(m => ({ default: m.DgidbPanel })),
  { loading: LoadingComponent }
)

export const LazyOpenTargetsPanel = dynamic(
  () => import('@/components/profile/OpenTargetsPanel').then(m => ({ default: m.OpenTargetsPanel })),
  { loading: LoadingComponent }
)

// Proteins category
export const LazyUniprotPanel = dynamic(
  () => import('@/components/profile/UniprotPanel').then(m => ({ default: m.UniprotPanel })),
  { loading: LoadingComponent }
)

export const LazyInterProPanel = dynamic(
  () => import('@/components/profile/InterProPanel').then(m => ({ default: m.InterProPanel })),
  { loading: LoadingComponent }
)

export const LazyEbiProteinsPanel = dynamic(
  () => import('@/components/profile/EbiProteinsPanel').then(m => ({ default: m.EbiProteinsPanel })),
  { loading: LoadingComponent }
)

export const LazyProteinAtlasPanel = dynamic(
  () => import('@/components/profile/ProteinAtlasPanel').then(m => ({ default: m.ProteinAtlasPanel })),
  { loading: LoadingComponent }
)

export const LazyQuickGoPanel = dynamic(
  () => import('@/components/profile/QuickGoPanel').then(m => ({ default: m.QuickGoPanel })),
  { loading: LoadingComponent }
)

export const LazyPdbPanel = dynamic(
  () => import('@/components/profile/PdbPanel').then(m => ({ default: m.PdbPanel })),
  { loading: LoadingComponent }
)

export const LazyPdbeLigandsPanel = dynamic(
  () => import('@/components/profile/PdbeLigandsPanel').then(m => ({ default: m.PdbeLigandsPanel })),
  { loading: LoadingComponent }
)

export const LazyAlphaFoldPanel = dynamic(
  () => import('@/components/profile/AlphaFoldPanel').then(m => ({ default: m.AlphaFoldPanel })),
  { loading: LoadingComponent }
)

// Genomics category
export const LazyGeneInfoPanel = dynamic(
  () => import('@/components/profile/GeneInfoPanel').then(m => ({ default: m.GeneInfoPanel })),
  { loading: LoadingComponent }
)

export const LazyEnsemblPanel = dynamic(
  () => import('@/components/profile/EnsemblPanel').then(m => ({ default: m.EnsemblPanel })),
  { loading: LoadingComponent }
)

export const LazyExpressionAtlasPanel = dynamic(
  () => import('@/components/profile/ExpressionAtlasPanel').then(m => ({ default: m.ExpressionAtlasPanel })),
  { loading: LoadingComponent }
)

export const LazyMonarchPanel = dynamic(
  () => import('@/components/profile/MonarchPanel').then(m => ({ default: m.MonarchPanel })),
  { loading: LoadingComponent }
)

export const LazyNciThesaurusPanel = dynamic(
  () => import('@/components/profile/NciThesaurusPanel').then(m => ({ default: m.NciThesaurusPanel })),
  { loading: LoadingComponent }
)

export const LazyMeshPanel = dynamic(
  () => import('@/components/profile/MeshPanel').then(m => ({ default: m.MeshPanel })),
  { loading: LoadingComponent }
)

// Interactions category
export const LazyStringPanel = dynamic(
  () => import('@/components/profile/StringPanel').then(m => ({ default: m.StringPanel })),
  { loading: LoadingComponent }
)

export const LazyStitchPanel = dynamic(
  () => import('@/components/profile/StitchPanel').then(m => ({ default: m.StitchPanel })),
  { loading: LoadingComponent }
)

export const LazyIntActPanel = dynamic(
  () => import('@/components/profile/IntActPanel').then(m => ({ default: m.IntActPanel })),
  { loading: LoadingComponent }
)

// Pathways category
export const LazyReactomePanel = dynamic(
  () => import('@/components/profile/ReactomePanel').then(m => ({ default: m.ReactomePanel })),
  { loading: LoadingComponent }
)

export const LazyWikiPathwaysPanel = dynamic(
  () => import('@/components/profile/WikiPathwaysPanel').then(m => ({ default: m.WikiPathwaysPanel })),
  { loading: LoadingComponent }
)

export const LazyPathwayCommonsPanel = dynamic(
  () => import('@/components/profile/PathwayCommonsPanel').then(m => ({ default: m.PathwayCommonsPanel })),
  { loading: LoadingComponent }
)

// Additional panels
export const LazyDrugCentralPanel = dynamic(
  () => import('@/components/profile/DrugCentralPanel').then(m => ({ default: m.DrugCentralPanel })),
  { loading: LoadingComponent }
)

export const LazyMetabolomicsPanel = dynamic(
  () => import('@/components/profile/MetabolomicsPanel').then(m => ({ default: m.MetabolomicsPanel })),
  { loading: LoadingComponent }
)

export const LazyToxCastPanel = dynamic(
  () => import('@/components/profile/ToxCastPanel').then(m => ({ default: m.ToxCastPanel })),
  { loading: LoadingComponent }
)

export const LazyDisGeNETPanel = dynamic(
  () => import('@/components/profile/DisGeNETPanel').then(m => ({ default: m.DisGeNETPanel })),
  { loading: LoadingComponent }
)

export const LazyOrphanetPanel = dynamic(
  () => import('@/components/profile/OrphanetPanel').then(m => ({ default: m.OrphanetPanel })),
  { loading: LoadingComponent }
)

export const LazyMyChemPanel = dynamic(
  () => import('@/components/profile/MyChemPanel').then(m => ({ default: m.MyChemPanel })),
  { loading: LoadingComponent }
)

export const LazyMyGenePanel = dynamic(
  () => import('@/components/profile/MyGenePanel').then(m => ({ default: m.MyGenePanel })),
  { loading: LoadingComponent }
)

export const LazyBgeePanel = dynamic(
  () => import('@/components/profile/BgeePanel').then(m => ({ default: m.BgeePanel })),
  { loading: LoadingComponent }
)

export const LazyCTDPanel = dynamic(
  () => import('@/components/profile/CTDPanel').then(m => ({ default: m.CTDPanel })),
  { loading: LoadingComponent }
)

export const LazyHMDBPanel = dynamic(
  () => import('@/components/profile/HMDBPanel').then(m => ({ default: m.HMDBPanel })),
  { loading: LoadingComponent }
)

export const LazySIDERPanel = dynamic(
  () => import('@/components/profile/SIDERPanel').then(m => ({ default: m.SIDERPanel })),
  { loading: LoadingComponent }
)

export const LazyOMIMPanel = dynamic(
  () => import('@/components/profile/OMIMPanel').then(m => ({ default: m.OMIMPanel })),
  { loading: LoadingComponent }
)

export const LazyIEDBPanel = dynamic(
  () => import('@/components/profile/IEDBPanel').then(m => ({ default: m.IEDBPanel })),
  { loading: LoadingComponent }
)

export const LazyPeptideAtlasPanel = dynamic(
  () => import('@/components/profile/PeptideAtlasPanel').then(m => ({ default: m.PeptideAtlasPanel })),
  { loading: LoadingComponent }
)

// New API panels
export const LazyGEOPanel = dynamic(
  () => import('@/components/profile/GEOPanel').then(m => ({ default: m.GEOPanel })),
  { loading: LoadingComponent }
)

export const LazyDbSNPPanel = dynamic(
  () => import('@/components/profile/DbSNPPanel').then(m => ({ default: m.DbSNPPanel })),
  { loading: LoadingComponent }
)

export const LazyClinGenPanel = dynamic(
  () => import('@/components/profile/ClinGenPanel').then(m => ({ default: m.ClinGenPanel })),
  { loading: LoadingComponent }
)

export const LazyMedGenPanel = dynamic(
  () => import('@/components/profile/MedGenPanel').then(m => ({ default: m.MedGenPanel })),
  { loading: LoadingComponent }
)

export const LazyPRIDEPanel = dynamic(
  () => import('@/components/profile/PRIDEPanel').then(m => ({ default: m.PRIDEPanel })),
  { loading: LoadingComponent }
)

export const LazyMassBankPanel = dynamic(
  () => import('@/components/profile/MassBankPanel').then(m => ({ default: m.MassBankPanel })),
  { loading: LoadingComponent }
)

export const LazyBioCycPanel = dynamic(
  () => import('@/components/profile/BioCycPanel').then(m => ({ default: m.BioCycPanel })),
  { loading: LoadingComponent }
)

export const LazySMPDBPanel = dynamic(
  () => import('@/components/profile/SMPDBPanel').then(m => ({ default: m.SMPDBPanel })),
  { loading: LoadingComponent }
)

export const LazyCrossRefPanel = dynamic(
  () => import('@/components/profile/CrossRefPanel').then(m => ({ default: m.CrossRefPanel })),
  { loading: LoadingComponent }
)

export const LazyArXivPanel = dynamic(
  () => import('@/components/profile/ArXivPanel').then(m => ({ default: m.ArXivPanel })),
  { loading: LoadingComponent }
)

// Tier 1 API panels
export const LazyPharmGKBPanel = dynamic(
  () => import('@/components/profile/PharmGKBPanel').then(m => ({ default: m.PharmGKBPanel })),
  { loading: LoadingComponent }
)

export const LazyCPICPanel = dynamic(
  () => import('@/components/profile/CPICPanel').then(m => ({ default: m.CPICPanel })),
  { loading: LoadingComponent }
)

export const LazyIRISPanel = dynamic(
  () => import('@/components/profile/IRISPanel').then(m => ({ default: m.IRISPanel })),
  { loading: LoadingComponent }
)

export const LazyKEGGPanel = dynamic(
  () => import('@/components/profile/KEGGPanel').then(m => ({ default: m.KEGGPanel })),
  { loading: LoadingComponent }
)

// Tier 2 API panels
export const LazyISRCTNPanel = dynamic(
  () => import('@/components/profile/ISRCTNPanel').then(m => ({ default: m.ISRCTNPanel })),
  { loading: LoadingComponent }
)

export const LazyChemSpiderPanel = dynamic(
  () => import('@/components/profile/ChemSpiderPanel').then(m => ({ default: m.ChemSpiderPanel })),
  { loading: LoadingComponent }
)

export const LazyCATHPanel = dynamic(
  () => import('@/components/profile/CATHPanel').then(m => ({ default: m.CATHPanel })),
  { loading: LoadingComponent }
)

// Tier 3 API panels
export const LazyMetaboLightsPanel = dynamic(
  () => import('@/components/profile/MetaboLightsPanel').then(m => ({ default: m.MetaboLightsPanel })),
  { loading: LoadingComponent }
)

export const LazyGNPSPanel = dynamic(
  () => import('@/components/profile/GNPSPanel').then(m => ({ default: m.GNPSPanel })),
  { loading: LoadingComponent }
)

export const LazySAbDabPanel = dynamic(
  () => import('@/components/profile/SAbDabPanel').then(m => ({ default: m.SAbDabPanel })),
  { loading: LoadingComponent }
)

// New APIs (2026-04-09)
export const LazyUniProtExtendedPanel = dynamic(
  () => import('@/components/profile/UniProtExtendedPanel').then(m => ({ default: m.UniProtExtendedPanel })),
  { loading: LoadingComponent }
)

export const LazyGeneOntologyPanel = dynamic(
  () => import('@/components/profile/GeneOntologyPanel').then(m => ({ default: m.GeneOntologyPanel })),
  { loading: LoadingComponent }
)

export const LazyHPOPanel = dynamic(
  () => import('@/components/profile/HPOPanel').then(m => ({ default: m.HPOPanel })),
  { loading: LoadingComponent }
)

export const LazyGTExPanel = dynamic(
  () => import('@/components/profile/GTExPanel').then(m => ({ default: m.GTExPanel })),
  { loading: LoadingComponent }
)

export const LazyDrugShortagesPanel = dynamic(
  () => import('@/components/profile/DrugShortagesPanel').then(m => ({ default: m.DrugShortagesPanel })),
  { loading: LoadingComponent }
)

// Additional ontology and database panels
export const LazyLipidMapsPanel = dynamic(
  () => import('@/components/profile/LipidMapsPanel').then(m => ({ default: m.LipidMapsPanel })),
  { loading: LoadingComponent }
)

export const LazyBioModelsPanel = dynamic(
  () => import('@/components/profile/BioModelsPanel').then(m => ({ default: m.BioModelsPanel })),
  { loading: LoadingComponent }
)

export const LazyOLSPanel = dynamic(
  () => import('@/components/profile/OLSPanel').then(m => ({ default: m.OLSPanel })),
  { loading: LoadingComponent }
)

// New APIs (2026-04-09 continuation)
export const LazyBioSamplesPanel = dynamic(
  () => import('@/components/profile/BioSamplesPanel').then(m => ({ default: m.BioSamplesPanel })),
  { loading: LoadingComponent }
)

export const LazyMassivePanel = dynamic(
  () => import('@/components/profile/MassivePanel').then(m => ({ default: m.MassivePanel })),
  { loading: LoadingComponent }
)

export const LazyLINCSPanel = dynamic(
  () => import('@/components/profile/LINCSPanel').then(m => ({ default: m.LINCSPanel })),
  { loading: LoadingComponent }
)

export const LazyHumanProteinAtlasPanel = dynamic(
  () => import('@/components/profile/HumanProteinAtlasPanel').then(m => ({ default: m.HumanProteinAtlasPanel })),
  { loading: LoadingComponent }
)

export const LazyTTDPanel = dynamic(
  () => import('@/components/profile/TTDPanel').then(m => ({ default: m.TTDPanel })),
  { loading: LoadingComponent }
)

// UniChem (chemical cross-referencing)
export const LazyUniChemPanel = dynamic(
  () => import('@/components/profile/UniChemPanel').then(m => ({ default: m.UniChemPanel })),
  { loading: LoadingComponent }
)

// FooDB (food compounds)
export const LazyFooDBPanel = dynamic(
  () => import('@/components/profile/FooDBPanel').then(m => ({ default: m.FooDBPanel })),
  { loading: LoadingComponent }
)

// GSRS (FDA UNII registry)
export const LazyGSRSPanel = dynamic(
  () => import('@/components/profile/GSRSPanel').then(m => ({ default: m.GSRSPanel })),
  { loading: LoadingComponent }
)

// NIH High-Impact APIs
export const LazyNciCadsrPanel = dynamic(
  () => import('@/components/profile/NciCadsrPanel').then(m => ({ default: m.NciCadsrPanel })),
  { loading: LoadingComponent }
)

export const LazyNcatsTranslatorPanel = dynamic(
  () => import('@/components/profile/NcatsTranslatorPanel').then(m => ({ default: m.NcatsTranslatorPanel })),
  { loading: LoadingComponent }
)

export const LazyNhgriAnvilPanel = dynamic(
  () => import('@/components/profile/NhgriAnvilPanel').then(m => ({ default: m.NhgriAnvilPanel })),
  { loading: LoadingComponent }
)

export const LazyNiaidImmportPanel = dynamic(
  () => import('@/components/profile/NiaidImmportPanel').then(m => ({ default: m.NiaidImmportPanel })),
  { loading: LoadingComponent }
)

export const LazyNindsNeurommsigPanel = dynamic(
  () => import('@/components/profile/NindsNeurommsigPanel').then(m => ({ default: m.NindsNeurommsigPanel })),
  { loading: LoadingComponent }
)