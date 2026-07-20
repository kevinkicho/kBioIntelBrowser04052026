# Research orgs & hospitals compendium (free public data)

**Status:** Active — Wave A/B shipped (ROR + CMS)  
**Product law:** Free public APIs only · evidence-first · not clinical referral / “best hospital” language  
**Role:** Affiliation / site context for trials, grants, literature — not a standalone directory product

## Fit tiers

| Source | Region | Tier | Role |
|--------|--------|------|------|
| **ROR** | Global (US + EU + …) | A | Research universities, institutes, many academic hospitals, funders |
| **CMS Hospital General Information** | US Medicare | A/B | Registered hospitals (name, address, type, rating) |
| **IPEDS / College Scorecard** | US colleges | B | Optional later (Scorecard API needs free api.data.gov key) |
| **National EU hospital open data** | Per country | C | No single free pan-EU hospital API |

## Shipped code

| Piece | Path |
|-------|------|
| ROR client | `src/lib/api/ror.ts` |
| CMS hospitals | `src/lib/api/cmsHospitals.ts` |
| Panels | `ResearchOrgsPanel`, `UsHospitalsPanel` |
| Browse UI | `/orgs` |
| APIs | `GET /api/ror?q=`, `GET /api/cms-hospitals?q=` |
| Molecule join | Clinical sponsors + facilities → ROR; facility names → CMS |

## Language rules

- Prefer: “Medicare-registered hospital record”, “ROR research organization”, “trial sponsor matched to ROR”.  
- Avoid: “best hospital for disease X”, “approved treatment center”, referral language.

## Do not

- Paid hospital rankings / commercial provider DBs  
- Put org directories in Discover rank path  
- Promise complete EU hospital census without national open-data waves  
