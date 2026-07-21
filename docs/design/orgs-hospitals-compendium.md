# Research orgs & hospitals compendium (free public data)

**Status:** Active — Waves A–C + research-lab dossier pipeline + claim-bound AI  
**Product law:** Free public APIs only · evidence-first · not clinical referral / “best hospital” language · AI only claim-bound (BYOM Ollama)  
**Role:** Affiliation / site context for trials, grants, literature — not a standalone directory product

## Fit tiers

| Source | Region | Tier | Role |
|--------|--------|------|------|
| **ROR** | Global (US + EU + …) | A | Research universities, institutes, many academic hospitals, funders |
| **CMS Hospital General Information** | US Medicare | A/B | Registered hospitals (name, address, type, rating) |
| **College Scorecard** | US colleges | A | Free `api.data.gov` DEMO_KEY (or `DATA_GOV_API_KEY`) |
| **OpenAlex institutions** | US education | A | **Zero-key** name search fallback when Scorecard empty |
| **Urban IPEDS directory** | US | A | Zero-key **UNITID** enrich (address/phone); not full-text name |
| **EU ROR packs** | Core EU countries | A | Multi-country education/healthcare/facility filters |
| **National EU hospital open data** | Per country | C | Still no single free pan-EU hospital API |

## Shipped code

| Piece | Path |
|-------|------|
| ROR client | `src/lib/api/ror.ts` |
| CMS hospitals | `src/lib/api/cmsHospitals.ts` |
| College Scorecard | `src/lib/api/collegeScorecard.ts` (fallback: OpenAlex + IPEDS) |
| OpenAlex institutions | `src/lib/api/openAlexInstitutions.ts` |
| Urban IPEDS | `src/lib/api/urbanIpeds.ts` |
| EU packs | `src/lib/api/euResearchOrgs.ts` |
| Panels | `ResearchOrgsPanel`, `UsHospitalsPanel`, `UsCollegesPanel` |
| Browse UI | `/orgs` |
| APIs | `/api/ror`, `/api/cms-hospitals`, `/api/us-colleges`, `/api/eu-orgs` |
| Molecule join | Trials → ROR/CMS; grants → ROR/Scorecard; name → EU pack |
| Research-lab pipeline | `src/lib/researchLabs/*`, `GET /api/research-labs?q=` |
| Lab UI + AI | `/orgs` tabs: dossier + claim-bound AI, directory, sponsor joins |
| OpenAlex labs | `searchOpenAlexResearchLabs` (education + facility + healthcare) |

## Research-lab dossier pipeline

1. **Harvest (parallel free APIs):** ROR · EU ROR pack · OpenAlex institutions · Scorecard · CMS · NIH RePORTER · OpenAIRE projects/pubs  
2. **Assemble (pure):** `buildResearchLabDossier` + affiliation joins  
3. **Claims (pure):** `extractClaimsFromResearchLabDossier` → versioned evidence pack  
4. **AI activities (optional BYOM):** affiliation brief · data gaps · next activities · caveats · custom — via `/api/ai/pack` allowlisted claimIds only  

## Language rules

- Prefer: “Medicare-registered hospital record”, “ROR research organization”, “trial sponsor matched to ROR”.  
- Avoid: “best hospital for disease X”, “approved treatment center”, referral language.

## Do not

- Paid hospital rankings / commercial provider DBs  
- Put org directories in Discover rank path  
- Promise complete EU hospital census without national open-data waves  
