/**
 * Minimal loaded-state fixtures for free-API cards.
 * `componentProp` is the React prop name (may differ from category propKey).
 */

export const LOADED_FIXTURES = {
  chembl: {
    componentProp: 'activities',
    data: [
      {
        targetName: 'PTGS1',
        pchemblValue: 6.2,
        activityType: 'IC50',
        activityValue: 500,
        activityUnits: 'nM',
        assayDescription: 'Cyclooxygenase-1 inhibition',
        url: 'https://www.ebi.ac.uk/chembl/explore/compound/CHEMBL25',
      },
    ],
  },
  'clinical-trials': {
    componentProp: 'trials',
    data: [
      {
        nctId: 'NCT00000001',
        title: 'Aspirin for secondary prevention',
        phase: 'PHASE3',
        status: 'COMPLETED',
        conditions: ['Cardiovascular disease'],
        interventions: ['Aspirin'],
        sponsor: 'Acme Pharma',
        url: 'https://clinicaltrials.gov/study/NCT00000001',
      },
    ],
  },
  'adverse-events': {
    componentProp: 'adverseEvents',
    data: [
      {
        reactionName: 'Nausea',
        count: 42,
        seriousCount: 3,
      },
    ],
  },
  uniprot: {
    componentProp: 'entries',
    data: [
      {
        accession: 'P23219',
        proteinName: 'Prostaglandin G/H synthase 1',
        geneName: 'PTGS1',
        organism: 'Homo sapiens',
        functionSummary: 'Converts arachidonate to prostaglandin H2.',
      },
    ],
  },
  dgidb: {
    componentProp: 'interactions',
    data: [
      {
        geneSymbol: 'PTGS2',
        geneName: 'Prostaglandin-endoperoxide synthase 2',
        interactionType: 'inhibitor',
        score: 0.9,
        sources: ['DrugBank'],
        url: 'https://www.dgidb.org/results?searchType=gene&searchTerms=PTGS2',
      },
    ],
  },
  literature: {
    componentProp: 'results',
    data: [
      {
        title: 'Aspirin and platelets',
        year: 2020,
        journal: 'Nature',
        authors: 'Smith et al.',
        pmid: '12345678',
        url: 'https://pubmed.ncbi.nlm.nih.gov/12345678/',
      },
    ],
  },
  'health-canada': {
    componentProp: 'products',
    data: [
      {
        drugCode: 1,
        din: '02212345',
        brandName: 'ASPIRIN',
        companyName: 'Bayer',
        className: 'Human',
        descriptor: '',
        numberOfAis: '1',
        lastUpdateDate: '2020-01-01',
        status: 'Marketed',
        historyDate: '',
        originalMarketDate: '',
        forms: ['Tablet'],
        routes: ['Oral'],
        ingredients: [{ name: 'Acetylsalicylic acid', strength: '325', strengthUnit: 'mg' }],
        url: 'https://health-products.canada.ca/dpd-bdpp/info?lang=eng&code=1',
      },
    ],
  },
  'openaire-projects': {
    componentProp: 'projects',
    data: [
      {
        id: 'openaire::1',
        code: '101000000',
        title: 'Aspirin mechanisms in Europe',
        acronym: 'ASPMECH',
        startDate: '2020-01-01',
        endDate: '2024-12-31',
        funderShort: 'EC',
        funderName: 'European Commission',
        jurisdiction: 'EU',
        fundedAmount: 1_000_000,
        totalCost: 1_200_000,
        url: 'https://explore.openaire.eu/search/project?projectId=1',
        cordisUrl: null,
      },
    ],
  },
  properties: {
    componentProp: 'properties',
    extra: { molecularWeight: 180.16 },
    data: {
      molecularWeight: 180.16,
      xLogP: 1.2,
      hBondDonorCount: 1,
      hBondAcceptorCount: 4,
      rotatableBondCount: 2,
      exactMass: 180.042,
      tpsa: 63.6,
      heavyAtomCount: 13,
      complexity: 212,
      monoisotopicMass: 180.042,
    },
  },
} as const

export type LoadedFixtureId = keyof typeof LOADED_FIXTURES
