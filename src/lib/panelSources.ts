import type { ApiMeta } from '@/lib/analytics/api-meta'
import { API_METADATA } from '@/lib/analytics/api-meta'

export interface PanelSourceInfo {
  source: string
  api: string
  description: string
  docs: string
  endpoint: string
}

interface PanelSourceEntry extends PanelSourceInfo {
  _metaKey?: string
}

const ENTRIES: Record<string, PanelSourceEntry> = {
  'companies': { source: 'U.S. FDA', api: 'OpenFDA', description: 'Open data API for FDA drug, device, and food adverse events, recalls, and labeling', docs: 'https://open.fda.gov/api/', endpoint: 'https://api.fda.gov/drug/ndc.json', _metaKey: 'openfda' },
  'ndc': { source: 'U.S. FDA', api: 'OpenFDA NDC', description: 'National Drug Code directory via OpenFDA', docs: 'https://open.fda.gov/apis/drug/ndc/', endpoint: 'https://api.fda.gov/drug/ndc.json', _metaKey: 'fda-ndc' },
  'orange-book': { source: 'U.S. FDA', api: 'Orange Book', description: 'Approved Drug Products with Therapeutic Equivalence Evaluations', docs: 'https://open.fda.gov/apis/drug/ndc/', endpoint: 'https://api.fda.gov/drug/ndc.json', _metaKey: 'orangebook' },
  'nadac': { source: 'CMS', api: 'NADAC', description: 'National Average Drug Acquisition Cost from Medicaid', docs: 'https://data.medicaid.gov/dataset/nadac', endpoint: 'https://data.medicaid.gov/resource/a4y5-998d.json', _metaKey: 'nadac' },
  'drug-interactions': { source: 'NLM (NIH)', api: 'RxNorm', description: 'RxNorm provides normalized names for clinical drugs', docs: 'https://rxnav.nlm.nih.gov/RESTfulInteraction.html', endpoint: 'https://rxnav.nlm.nih.gov/REST', _metaKey: 'rxnorm' },
  'dailymed': { source: 'NLM (NIH)', api: 'DailyMed', description: 'Provides FDA drug labeling information', docs: 'https://dailymed.nlm.nih.gov/dailymed/app-support.cfm#api', endpoint: 'https://dailymed.nlm.nih.gov/dailymed/services/v2', _metaKey: 'dailymed' },
  'atc': { source: 'WHO', api: 'RxClass (ATC)', description: 'ATC drug classification via RxNorm/RxClass', docs: 'https://rxnav.nlm.nih.gov/RxClassIntro.html', endpoint: 'https://rxnav.nlm.nih.gov/REST/rxclass', _metaKey: 'atc' },
  'drugcentral': { source: 'DrugCentral', api: 'DrugCentral', description: 'DrugCentral: online drug information resource', docs: 'https://drugcentral.org/', endpoint: 'https://drugcentral.org/api', _metaKey: 'drugcentral' },
  'gsrs': { source: 'FDA', api: 'GSRS', description: 'Global Substance Registration System (UNII substances)', docs: 'https://gsrs.ncats.nih.gov/api', endpoint: 'https://gsrs.ncats.nih.gov/api', _metaKey: 'gsrs' },
  'pharmgkb': { source: 'Stanford', api: 'PharmGKB', description: 'Pharmacogenomics knowledge base for drug-gene relationships', docs: 'https://www.pharmgkb.org/page/api', endpoint: 'https://api.pharmgkb.org/v1', _metaKey: 'pharmgkb' },
  'cpic': { source: 'CPIC', api: 'CPIC', description: 'Clinical Pharmacogenetics Implementation Consortium guidelines', docs: 'https://cpic.org/', endpoint: 'https://api.cpic.org', _metaKey: 'cpic' },
  'clinical-trials': { source: 'NLM (NIH)', api: 'ClinicalTrials.gov', description: 'ClinicalTrials.gov registry of clinical studies', docs: 'https://clinicaltrials.gov/api/', endpoint: 'https://clinicaltrials.gov/api/v2/studies', _metaKey: 'clinicaltrials' },
  'isrctn': { source: 'ISRCTN', api: 'ISRCTN', description: 'International Standard Randomised Controlled Trial Number registry', docs: 'https://www.isrctn.com/page/api', endpoint: 'https://www.isrctn.com/api', _metaKey: 'isrctn' },
  'adverse-events': { source: 'U.S. FDA', api: 'OpenFDA (FAERS)', description: 'FAERS adverse event reports via OpenFDA', docs: 'https://open.fda.gov/apis/drug/event/', endpoint: 'https://api.fda.gov/drug/event.json', _metaKey: 'adverseevents' },
  'recalls': { source: 'U.S. FDA', api: 'OpenFDA (Enforcement)', description: 'Drug enforcement reports and recalls via OpenFDA', docs: 'https://open.fda.gov/apis/drug/enforcement/', endpoint: 'https://api.fda.gov/drug/enforcement.json', _metaKey: 'recalls' },
  'chembl-indications': { source: 'EMBL-EBI', api: 'ChEMBL Indications', description: 'ChEMBL drug indications data', docs: 'https://chembl.gitbook.io/chembl-interface-documentation/grpc-api', endpoint: 'https://www.ebi.ac.uk/chembl/api/data', _metaKey: 'chembl-indications' },
  'clinvar': { source: 'NCBI (NIH)', api: 'ClinVar', description: 'ClinVar aggregates information about genomic variation and its relationship to human health', docs: 'https://www.ncbi.nlm.nih.gov/clinvar/api/', endpoint: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils', _metaKey: 'clinvar' },
  'drug-shortages': { source: 'U.S. FDA', api: 'FDA Drug Shortages', description: 'FDA current and resolved drug shortage reports', docs: 'https://www.fda.gov/drug-shortages', endpoint: 'https://www.fda.gov/drug-shortages', _metaKey: 'fda-drug-shortages' },
  'gwas': { source: 'EMBL-EBI', api: 'GWAS Catalog', description: 'NHGRI-EBI GWAS Catalog of published genome-wide association studies', docs: 'https://www.ebi.ac.uk/gwas/rest/api', endpoint: 'https://www.ebi.ac.uk/gwas/api/search', _metaKey: 'gwas-catalog' },
  'toxcast': { source: 'EPA', api: 'CompTox (ToxCast)', description: 'ToxCast high-throughput screening data via CompTox Dashboard', docs: 'https://www.epa.gov/comptoxics-tools/exploring-toxcast-data', endpoint: 'https://comptox.epa.gov/dashboard-api/ccdapp1', _metaKey: 'toxcast' },
  'sider': { source: 'Univ. Paris-Saclay', api: 'SIDER', description: 'SIDER side effect resource from FDA drug labels', docs: 'http://sideeffects.embl.de/', endpoint: 'http://sideeffects.embl.de/api', _metaKey: 'sider' },
  'iris': { source: 'EPA', api: 'IRIS', description: 'EPA CompTox chemical hazard data (IRIS assessments)', docs: 'https://www.epa.gov/iris', endpoint: 'https://comptox.epa.gov/dashboard-api/ccdapp1', _metaKey: 'iris' },
  'properties': { source: 'NCBI (NIH)', api: 'PubChem Properties', description: 'PubChem compound physicochemical properties', docs: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/', endpoint: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound', _metaKey: 'pubchem-properties' },
  'hazards': { source: 'NCBI (NIH)', api: 'PubChem Hazards', description: 'PubChem GHS hazard classification data', docs: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/', endpoint: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound', _metaKey: 'pubchem-hazards' },
  'chebi': { source: 'EMBL-EBI', api: 'ChEBI', description: 'Chemical Entities of Biological Interest ontology', docs: 'https://www.ebi.ac.uk/chebi/about', endpoint: 'https://www.ebi.ac.uk/chebi/api/data', _metaKey: 'chebi' },
  'comptox': { source: 'EPA', api: 'CompTox', description: 'CompTox Chemicals Dashboard for environmental and toxicological data', docs: 'https://comptox.epa.gov/dashboard-api/ccdapp1', endpoint: 'https://comptox.epa.gov/dashboard-api/ccdapp1', _metaKey: 'comptox' },
  'synthesis': { source: 'KEGG / Rhea', api: 'KEGG Reaction', description: 'Biosynthesis and reaction pathway data from KEGG and Rhea', docs: 'https://www.kegg.jp/kegg/rest/keggapi.html', endpoint: 'https://rest.kegg.jp', _metaKey: 'synthesis-routes' },
  'metabolomics': { source: 'Metabolomics Workbench', api: 'Metabolomics Workbench', description: 'Metabolomics data repository and analysis', docs: 'https://www.metabolomicsworkbench.org/tools/MWRestAPIv1.0.pdf', endpoint: 'https://www.metabolomicsworkbench.org/rest', _metaKey: 'metabolomics' },
  'mychem': { source: 'MyChem.info', api: 'MyChem', description: 'Integrated chemical annotation data from multiple sources', docs: 'https://mychem.info/v1', endpoint: 'https://mychem.info/v1/query', _metaKey: 'mychem' },
  'hmdb': { source: 'Univ. of Alberta', api: 'HMDB', description: 'Human Metabolome Database of small molecule metabolites', docs: 'https://hmdb.ca/unearth/apidoc', endpoint: 'https://hmdb.ca/unearth', _metaKey: 'hmdb' },
  'massbank': { source: 'MassBank', api: 'MassBank', description: 'Mass spectral database for compound identification', docs: 'https://massbank.eu/MassBank-api', endpoint: 'https://massbank.eu/MassBank-api/records', _metaKey: 'massbank' },
  'chemspider': { source: 'RSC / PubChem', api: 'ChemSpider (via PubChem)', description: 'Chemical structure database via PubChem (ChemSpider requires API key)', docs: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/', endpoint: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound', _metaKey: 'chemspider' },
  'metabolights': { source: 'EMBL-EBI', api: 'MetaboLights', description: 'MetaboLights metabolomics experiments repository', docs: 'https://www.ebi.ac.uk/metabolights/ws', endpoint: 'https://www.ebi.ac.uk/metabolights/ws', _metaKey: 'metabolights' },
  'gnps': { source: 'UC San Diego', api: 'GNPS', description: 'Global Natural Products Social Molecular Networking platform', docs: 'https://gnps.ucsd.edu/ProteoSAFe/static/gnps-theoretical-api.jsp', endpoint: 'https://gnps.ucsd.edu/ProteoSAFe', _metaKey: 'gnps-library' },
  'lipidmaps': { source: 'LIPID MAPS', api: 'LIPID MAPS', description: 'LIPID MAPS comprehensive lipid classification database', docs: 'https://lipidmaps.org/resources/tools/rest-api', endpoint: 'https://www.lipidmaps.org/rest', _metaKey: 'lipidmaps' },
  'unichem': { source: 'EMBL-EBI', api: 'UniChem', description: 'UniChem cross-references between chemical databases', docs: 'https://www.ebi.ac.uk/unichem/info/wsoverview', endpoint: 'https://www.ebi.ac.uk/unichem/api', _metaKey: 'unichem' },
  'foodb': { source: 'Univ. of Alberta', api: 'FooDB', description: 'FooDB database of food constituents and their bioactivities', docs: 'https://foodb.ca/', endpoint: 'https://foodb.ca/api', _metaKey: 'foodb' },
  'chembl': { source: 'EMBL-EBI', api: 'ChEMBL', description: 'ChEMBL bioactivity database for drug discovery', docs: 'https://chembl.gitbook.io/chembl-interface-documentation/grpc-api', endpoint: 'https://www.ebi.ac.uk/chembl/api/data', _metaKey: 'chembl' },
  'bioassay': { source: 'NCBI (NIH)', api: 'PubChem BioAssay', description: 'PubChem BioAssay repository of screening and assay data', docs: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/', endpoint: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/assay', _metaKey: 'bioassay' },
  'chembl-mechanisms': { source: 'EMBL-EBI', api: 'ChEMBL Mechanisms', description: 'ChEMBL mechanism of action data for drugs', docs: 'https://chembl.gitbook.io/chembl-interface-documentation/grpc-api', endpoint: 'https://www.ebi.ac.uk/chembl/api/data/mechanism', _metaKey: 'chembl-mechanisms' },
  'iuphar': { source: 'IUPHAR/BPS', api: 'Guide to Pharmacology', description: 'Guide to Pharmacology database of drug targets and ligands', docs: 'https://www.guidetopharmacology.org/services', endpoint: 'https://www.guidetopharmacology.org/services', _metaKey: 'iuphar' },
  'bindingdb': { source: 'BindingDB', api: 'BindingDB', description: 'BindingDB measured protein-ligand binding affinities', docs: 'https://www.bindingdb.org/bind/chemsearch/marvin/BindingDB-API.pdf', endpoint: 'https://bindingdb.org/bind/chemsearch/marvin/MolsFromName.json', _metaKey: 'bindingdb' },
  'pharos': { source: 'NIH NCATS', api: 'Pharos', description: 'Pharos Illuminating the Druggable Genome target data', docs: 'https://pharos.nih.gov/api', endpoint: 'https://pharos.nih.gov/idg/api/v1', _metaKey: 'pharos' },
  'dgidb': { source: 'DGIdb', api: 'DGIdb v5', description: 'Drug-Gene Interaction Database aggregating drug-target relationships', docs: 'https://www.dgidb.org/api', endpoint: 'https://dgidb.org/api/graphql', _metaKey: 'dgidb' },
  'opentargets': { source: 'Open Targets', api: 'Open Targets', description: 'Open Targets Platform for drug-target-disease associations', docs: 'https://platform.opentargets.org/api', endpoint: 'https://api.platform.opentargets.org/api/v4/graphql', _metaKey: 'opentargets' },
  'ctd': { source: 'NCSU', api: 'CTD', description: 'Comparative Toxicogenomics Database connecting chemicals, genes, and diseases', docs: 'https://ctdbase.org/go/api', endpoint: 'https://ctdbase.org/tools/api', _metaKey: 'ctd' },
  'iedb': { source: 'NIAID (NIH)', api: 'IEDB', description: 'Immune Epitope Database and Analysis Resource', docs: 'https://iedb.org/api', endpoint: 'https://iedb.org/api', _metaKey: 'iedb' },
  'lincs': { source: 'NIH LINCS', api: 'LINCS', description: 'LINCS L1000 Connectivity Map perturbation signatures', docs: 'https://lincsproject.org/', endpoint: 'https://lincsportal.ccs.miami.edu/api/v2', _metaKey: 'lincs' },
  'ttd': { source: 'NIH / SJTU', api: 'TTD', description: 'Therapeutic Target Database for drug target information', docs: 'https://db.idrblab.net/ttd/', endpoint: 'https://db.idrblab.net/ttd/api', _metaKey: 'ttd' },
  'ncats-translator': { source: 'NCATS (NIH)', api: 'NCATS Translator', description: 'NCATS Biomedical Data Translator for reasoning over biomedical data', docs: 'https://ncats.nih.gov/translator', endpoint: 'https://translator.broadinstitute.org', _metaKey: 'ncats-translator' },
  'nci-cadsr': { source: 'NCI (NIH)', api: 'NCI caDSR', description: 'NCI Cancer Data Standards Registry and Repository', docs: 'https://cadsr.nci.nih.gov/', endpoint: 'https://cadsrapi.nci.nih.gov', _metaKey: 'nci-cadsr' },
  'nhgri-anvil': { source: 'NHGRI (NIH)', api: 'AnVIL', description: 'NHGRI Analysis Visualization and Informatics Lab-space', docs: 'https://anvilproject.org/', endpoint: 'https://anvilproject.org/api', _metaKey: 'nhgri-anvil' },
  'niaid-immport': { source: 'NIAID (NIH)', api: 'ImmPort', description: 'NIAID ImmPort immunology database and analysis portal', docs: 'https://www.immport.org/aggregationAPI', endpoint: 'https://www.immport.org/shared/reportersApi', _metaKey: 'niaid-immport' },
  'uniprot': { source: 'EMBL-EBI / SIB', api: 'UniProt', description: 'Universal Protein Resource for protein sequence and function data', docs: 'https://www.uniprot.org/help/api_queries', endpoint: 'https://rest.uniprot.org/uniprotkb', _metaKey: 'uniprot' },
  'uniprot-extended': { source: 'EMBL-EBI / SIB', api: 'UniProt', description: 'UniProt extended protein data', docs: 'https://www.uniprot.org/help/api_queries', endpoint: 'https://rest.uniprot.org/uniprotkb' },
  'alphafold': { source: 'DeepMind / EMBL-EBI', api: 'AlphaFold', description: 'AlphaFold protein structure predictions', docs: 'https://www.alphafold.ebi.ac.uk/api/', endpoint: 'https://alphafold.ebi.ac.uk/api/prediction', _metaKey: 'alphafold' },
  'interpro': { source: 'EMBL-EBI', api: 'InterPro', description: 'InterPro protein domain and family classification', docs: 'https://www.ebi.ac.uk/interpro/api/', endpoint: 'https://www.ebi.ac.uk/interpro/api' },
  'ebi-proteins': { source: 'EMBL-EBI', api: 'Proteins API', description: 'EBI Proteins API variation and feature data', docs: 'https://www.ebi.ac.uk/proteins/api/', endpoint: 'https://www.ebi.ac.uk/proteins/api', _metaKey: 'ebi-proteins' },
  'ebi-proteomics': { source: 'EMBL-EBI', api: 'Proteins API', description: 'EBI Proteins API proteomics data', docs: 'https://www.ebi.ac.uk/proteins/api/', endpoint: 'https://www.ebi.ac.uk/proteins/api' },
  'ebi-crossrefs': { source: 'EMBL-EBI', api: 'Proteins API (Cross-references)', description: 'EBI Proteins API cross-references', docs: 'https://www.ebi.ac.uk/proteins/api/', endpoint: 'https://www.ebi.ac.uk/proteins/api' },
  'protein-atlas': { source: 'Human Protein Atlas', api: 'Protein Atlas', description: 'Human Protein Atlas tissue and cell expression data', docs: 'https://www.proteinatlas.org/about/help/api', endpoint: 'https://www.proteinatlas.org/api', _metaKey: 'protein-atlas' },
  'human-protein-atlas': { source: 'Human Protein Atlas', api: 'Protein Atlas', description: 'Human Protein Atlas tissue and cell expression data', docs: 'https://www.proteinatlas.org/about/help/api', endpoint: 'https://www.proteinatlas.org/api' },
  'quickgo': { source: 'Gene Ontology Consortium / EBI', api: 'QuickGO', description: 'Gene Ontology functional annotation terms via QuickGO', docs: 'https://www.ebi.ac.uk/QuickGO/api/', endpoint: 'https://www.ebi.ac.uk/QuickGO/services/ontology/go' },
  'go': { source: 'Gene Ontology Consortium / EBI', api: 'QuickGO', description: 'Gene Ontology functional annotation terms via QuickGO', docs: 'https://www.ebi.ac.uk/QuickGO/api/', endpoint: 'https://www.ebi.ac.uk/QuickGO/services/ontology/go' },
  'pdb': { source: 'RCSB / wwPDB', api: 'RCSB PDB', description: 'Protein Data Bank 3D structure archive', docs: 'https://data.rcsb.org/', endpoint: 'https://data.rcsb.org/rest/v1/core/entry', _metaKey: 'pdb' },
  'pdbe-ligands': { source: 'EMBL-EBI', api: 'PDBe Ligands', description: 'PDBe ligand and chemical component data', docs: 'https://www.ebi.ac.uk/pdbe/api/', endpoint: 'https://www.ebi.ac.uk/pdbe/api/pdb/entry', _metaKey: 'pdbe-ligands' },
  'peptideatlas': { source: 'ISB', api: 'PeptideAtlas', description: 'PeptideAtlas proteomics repository', docs: 'https://peptideatlas.org/api/', endpoint: 'https://peptideatlas.org/api', _metaKey: 'peptideatlas' },
  'pride': { source: 'EMBL-EBI', api: 'PRIDE', description: 'PRIDE proteomics identification database', docs: 'https://www.ebi.ac.uk/pride/help/archive/rest-api', endpoint: 'https://www.ebi.ac.uk/pride/ws/archive', _metaKey: 'pride' },
  'cath': { source: 'UCL', api: 'CATH', description: 'CATH protein domain classification and Gene3D', docs: 'https://www.cath.info/api/', endpoint: 'http://www.cathdb.info/api/v1', _metaKey: 'cath' },
  'sabdab': { source: 'Oxford', api: 'SAbDab', description: 'Structural Antibody Database', docs: 'https://opig.stats.ox.ac.uk/webapps/sabdab-sabpred/sabdab', endpoint: 'http://opig.stats.ox.ac.uk/webapps/abdb/sabdab-json', _metaKey: 'sabdab' },
  'gene-info': { source: 'NCBI (NIH)', api: 'NCBI Gene', description: 'NCBI Gene database of gene-specific information', docs: 'https://www.ncbi.nlm.nih.gov/gene/', endpoint: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils', _metaKey: 'ncbi-gene' },
  'ensembl': { source: 'EMBL-EBI', api: 'Ensembl', description: 'Ensembl genome browser and annotation', docs: 'https://rest.ensembl.org/', endpoint: 'https://rest.ensembl.org', _metaKey: 'ensembl' },
  'expression-atlas': { source: 'EMBL-EBI', api: 'Expression Atlas', description: 'Expression Atlas gene expression across species and conditions', docs: 'https://www.ebi.ac.uk/gxa/rest', endpoint: 'https://www.ebi.ac.uk/gxa', _metaKey: 'expression-atlas' },
  'gtex': { source: 'Broad Institute', api: 'GTEx', description: 'GTEx tissue-specific gene expression data', docs: 'https://gtexportal.org/home/apiDoc', endpoint: 'https://gtexportal.org/rest/v1', _metaKey: 'gtex' },
  'geo': { source: 'NCBI (NIH)', api: 'GEO', description: 'Gene Expression Omnibus functional genomics repository', docs: 'https://www.ncbi.nlm.nih.gov/geo/info/geo_prolonged.html', endpoint: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils', _metaKey: 'geo' },
  'dbsnp': { source: 'NCBI (NIH)', api: 'dbSNP', description: 'dbSNP database of single nucleotide polymorphisms', docs: 'https://www.ncbi.nlm.nih.gov/snp/', endpoint: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils', _metaKey: 'dbsnp' },
  'clingen': { source: 'NCBI (NIH)', api: 'ClinGen', description: 'ClinGen clinical variant resource', docs: 'https://clinicalgenomics.org/api/', endpoint: 'https://clinicalgenomics.org/api', _metaKey: 'clingen' },
  'medgen': { source: 'NLM (NIH)', api: 'MedGen', description: 'MedGen medical genetics terminology and concepts', docs: 'https://www.ncbi.nlm.nih.gov/medgen/', endpoint: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils', _metaKey: 'medgen' },
  'monarch': { source: 'Monarch Initiative', api: 'Monarch', description: 'Monarch Initiative cross-species phenotype-genotype associations', docs: 'https://monarchinitiative.org/api', endpoint: 'https://api.monarchinitiative.org/api', _metaKey: 'monarch' },
  'nci-thesaurus': { source: 'NCI (NIH)', api: 'NCI Thesaurus', description: 'NCI Thesaurus cancer-related terminology', docs: 'https://evsexplore.semantics.cancer.gov/evs-apex/', endpoint: 'https://evs.nci.nih.gov/api', _metaKey: 'nci-thesaurus' },
  'mesh': { source: 'NLM (NIH)', api: 'MeSH', description: 'Medical Subject Headings controlled vocabulary thesaurus', docs: 'https://www.ncbi.nlm.nih.gov/mesh/', endpoint: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=mesh', _metaKey: 'mesh' },
  'disgenet': { source: 'DisGeNET', api: 'DisGeNET', description: 'DisGeNET gene-disease and variant-disease associations', docs: 'https://www.disgenet.org/api/', endpoint: 'https://www.disgenet.org/api/gda', _metaKey: 'disgenet' },
  'orphanet': { source: 'Orphanet', api: 'Orphanet', description: 'Orphanet rare disease and orphan drug information', docs: 'https://www.orphadata.com/api/', endpoint: 'https://api.orphadata.com', _metaKey: 'orphanet' },
  'mygene': { source: 'MyGene.info', api: 'MyGene', description: 'MyGene.info integrated gene annotation service', docs: 'https://docs.mygene.info/en/v3/', endpoint: 'https://mygene.info/v3/query', _metaKey: 'mygene' },
  'bgee': { source: 'SIB / UNIL', api: 'Bgee', description: 'Bgee gene expression evolution database', docs: 'https://www.bgee.org/', endpoint: 'https://www.bgee.org/api', _metaKey: 'bgee' },
  'omim': { source: 'Johns Hopkins', api: 'OMIM', description: 'Online Mendelian Inheritance in Man genetic disorder catalog', docs: 'https://omim.org/api', endpoint: 'https://api.omim.org/api', _metaKey: 'omim' },
  'hpo': { source: 'JAX', api: 'HPO', description: 'Human Phenotype Ontology for clinical abnormalities', docs: 'https://hpo.jax.org/api/', endpoint: 'https://hpo.jax.org/api/hpo', _metaKey: 'hpo' },
  'ols': { source: 'EMBL-EBI', api: 'OLS', description: 'Ontology Lookup Service for ontology term search', docs: 'https://www.ebi.ac.uk/ols4/help', endpoint: 'https://www.ebi.ac.uk/ols4/api', _metaKey: 'ols' },
  'biomodels': { source: 'EMBL-EBI', api: 'BioModels', description: 'BioModels database of computational models of biological processes', docs: 'https://www.ebi.ac.uk/biomodels/', endpoint: 'https://www.ebi.ac.uk/biomodels', _metaKey: 'biomodels' },
  'biosamples': { source: 'EMBL-EBI', api: 'BioSamples', description: 'BioSamples biological sample metadata repository', docs: 'https://www.ebi.ac.uk/biosamples/docs/api', endpoint: 'https://www.ebi.ac.uk/biosamples/samples', _metaKey: 'biosamples' },
  'massive': { source: 'UC San Diego', api: 'MassIVE', description: 'MassIVE mass spectrometry proteomics data repository', docs: 'https://massive.ucsd.edu/', endpoint: 'https://massive.ucsd.edu/api', _metaKey: 'massive' },
  'string': { source: 'EMBL-EBI', api: 'STRING', description: 'STRING protein-protein interaction network database', docs: 'https://string-db.org/help/api/', endpoint: 'https://string-db.org/api', _metaKey: 'string-db' },
  'stitch': { source: 'EMBL-EBI', api: 'STITCH', description: 'STITCH chemical-protein interaction network database', docs: 'https://stitch-db.org/help/api/', endpoint: 'https://stitch-db.org/api', _metaKey: 'stitch' },
  'intact': { source: 'EMBL-EBI', api: 'IntAct', description: 'IntAct molecular interaction database', docs: 'https://www.ebi.ac.uk/intact/api/', endpoint: 'https://www.ebi.ac.uk/intact/api', _metaKey: 'intact' },
  'reactome': { source: 'Reactome', api: 'Reactome', description: 'Reactome pathway database for biological pathways', docs: 'https://reactome.org/dev/content-service', endpoint: 'https://reactome.org/ContentService', _metaKey: 'reactome' },
  'wikipathways': { source: 'WikiPathways', api: 'WikiPathways', description: 'WikiPathways curated biological pathway database', docs: 'https://webservice.wikipathways.org/', endpoint: 'https://webservice.wikipathways.org', _metaKey: 'wikipathways' },
  'pathway-commons': { source: 'UBC / EMBL-EBI', api: 'Pathway Commons', description: 'Pathway Commons integrated pathway and interaction data', docs: 'https://www.pathwaycommons.org/pc2/', endpoint: 'https://www.pathwaycommons.org/pc2', _metaKey: 'pathway-commons' },
  'biocyc': { source: 'SRI International', api: 'BioCyc', description: 'BioCyc collection of organism-specific pathway/genome databases', docs: 'https://biocyc.org/api/', endpoint: 'https://websvc.biocyc.org', _metaKey: 'biocyc' },
  'smpdb': { source: 'Univ. of Alberta', api: 'SMPDB', description: 'Small Molecule Pathway Database of human metabolic pathways', docs: 'https://smpdb.ca/', endpoint: 'https://smpdb.ca/api', _metaKey: 'smpdb' },
  'ctd-diseases': { source: 'NCSU', api: 'CTD', description: 'Comparative Toxicogenomics Database disease associations', docs: 'https://ctdbase.org/go/api', endpoint: 'http://ctdbase.org' },
  'kegg': { source: 'KEGG / Kyoto University', api: 'KEGG', description: 'Kyoto Encyclopedia of Genes and Genomes pathway database', docs: 'https://www.kegg.jp/kegg/rest/keggapi.html', endpoint: 'https://rest.kegg.jp', _metaKey: 'kegg' },
  'patents': { source: 'USPTO / PatentsView', api: 'PatentsView', description: 'PatentsView patent data for biomedical research', docs: 'https://www.patentsview.org/api/api-inventor/', endpoint: 'https://search.patentsview.org/api/v1/patent', _metaKey: 'patents' },
  'nih-reporter': { source: 'NIH', api: 'NIH RePORTER', description: 'NIH RePORTER extramural research project database', docs: 'https://api.reporter.nih.gov/', endpoint: 'https://api.reporter.nih.gov/v2/projects/search', _metaKey: 'nihreporter' },
  'sec': { source: 'U.S. SEC', api: 'SEC EDGAR', description: 'SEC EDGAR corporate filing data for pharmaceutical companies', docs: 'https://www.sec.gov/edgar/sec-api-documentation', endpoint: 'https://efts.sec.gov/LATEST/search-index', _metaKey: 'secedgar' },
  'semantic-scholar': { source: 'AI2', api: 'Semantic Scholar', description: 'Semantic Scholar academic paper search and citation data', docs: 'https://api.semanticscholar.org/api/v2/', endpoint: 'https://api.semanticscholar.org/graph/v1', _metaKey: 'semantic-scholar' },
  'pubmed': { source: 'NLM (NIH)', api: 'PubMed', description: 'PubMed biomedical literature citation database', docs: 'https://www.ncbi.nlm.nih.gov/books/NBK25501/', endpoint: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed', _metaKey: 'pubmed' },
  'open-alex': { source: 'OurResearch', api: 'OpenAlex', description: 'OpenAlex open scholarly metadata catalog', docs: 'https://docs.openalex.org/', endpoint: 'https://api.openalex.org', _metaKey: 'openalex' },
  'open-citations': { source: 'OpenCitations', api: 'OpenCitations', description: 'OpenCitations open scholarly citation data', docs: 'https://opencitations.net/api', endpoint: 'https://opencitations.net/index/api/v2', _metaKey: 'opencitations' },
  'crossref': { source: 'CrossRef', api: 'CrossRef', description: 'CrossRef DOI metadata and citation data', docs: 'https://api.crossref.org/', endpoint: 'https://api.crossref.org/works', _metaKey: 'crossref' },
  'arxiv': { source: 'Cornell University', api: 'arXiv', description: 'arXiv preprint server for physics, math, and biology', docs: 'https://info.arxiv.org/help/api/', endpoint: 'http://export.arxiv.org/api/query', _metaKey: 'arxiv' },
  'literature': { source: 'EMBL-EBI', api: 'Europe PMC', description: 'Europe PMC life sciences literature database', docs: 'https://www.ebi.ac.uk/europepmc/webservices/rest/search/', endpoint: 'https://www.ebi.ac.uk/europepmc/webservices/rest/search', _metaKey: 'europepmc' },
  'ninds-neurommsig': { source: 'NINDS (NIH)', api: 'NINDS NeuroMMSig', description: 'NINDS molecular mechanistic signature database', docs: 'https://neurmmsig.scai.fraunhofer.de/', endpoint: 'https://stemcells.nindsgenetics.org/api/search', _metaKey: 'ninds-neurommsig' },
}

const PANEL_SOURCE_MAP: Record<string, PanelSourceInfo> = {}

for (const [panelId, entry] of Object.entries(ENTRIES)) {
  const { _metaKey, ...sourceInfo } = entry
  if (_metaKey && API_METADATA[_metaKey]) {
    const meta: ApiMeta = API_METADATA[_metaKey]
    PANEL_SOURCE_MAP[panelId] = {
      ...sourceInfo,
      description: sourceInfo.description || meta.description,
      docs: sourceInfo.docs || meta.apiDocs,
      endpoint: sourceInfo.endpoint || meta.apiEndpoint,
    }
  } else {
    PANEL_SOURCE_MAP[panelId] = sourceInfo
  }
}

export function getPanelSource(panelId: string): PanelSourceInfo | null {
  return PANEL_SOURCE_MAP[panelId] ?? null
}