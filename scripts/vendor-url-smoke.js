#!/usr/bin/env node
/**
 * Smoke-check Order Compound / supplier catalog URL templates.
 * Uses HEAD (fallback GET) — bot blocks (403) are reported as soft warnings,
 * hard fails are 404/5xx/network on the template path itself.
 *
 * Usage:
 *   node scripts/vendor-url-smoke.js
 *   node scripts/vendor-url-smoke.js --json
 *
 * Exit: 0 if no hard failures; 1 if any 404/5xx/network on templates.
 */

const FIXTURE = {
  name: 'aspirin',
  cas: '50-78-2',
  cid: 2244,
  inchiKey: 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N',
}

/** Mirrors ORDER_PANEL_VENDORS + a few SUPPLIER extras (keep in sync with vendorCatalogLinks.ts). */
const TEMPLATES = [
  {
    name: 'Sigma-Aldrich',
    urlTemplate:
      'https://www.sigmaaldrich.com/US/en/search/{path}?focus=products&page=1&perpage=30&sort=relevance&term={name}&type=product',
  },
  {
    name: 'TCI Chemicals',
    urlTemplate: 'https://www.tcichemicals.com/US/en/search/?text={cas}&resulttype=product',
  },
  {
    name: 'Fisher Scientific',
    urlTemplate: 'https://www.fishersci.com/us/en/catalog/search/products?keyword={cas}',
  },
  {
    name: 'Thermo Fisher',
    urlTemplate:
      'https://www.thermofisher.com/search/results?query={cas}&resultPage=1&resultsPerPage=30',
  },
  {
    name: 'Cayman Chemical',
    urlTemplate: 'https://www.caymanchem.com/search?q={cas}',
  },
  {
    name: 'Selleck Chemicals',
    urlTemplate: 'https://www.selleckchem.com/searchResult.html?searchValue={name}',
  },
  {
    name: 'MedChemExpress',
    urlTemplate: 'https://www.medchemexpress.com/search.html?q={name}&ft=&fa=&f=1',
  },
  {
    name: 'Enamine',
    urlTemplate: 'https://enamine.net/search?q={name}',
  },
  {
    name: 'TargetMol',
    urlTemplate: 'https://www.targetmol.com/search?keyword={name}',
  },
  {
    name: 'eMolecules',
    urlTemplate: 'https://www.emolecules.com/#/search/{path}',
  },
  {
    name: 'Alfa Aesar (via Fisher)',
    urlTemplate:
      'https://www.fishersci.com/us/en/catalog/search/products?keyword=Alfa%20Aesar%20{cas}',
  },
  {
    name: 'PubChem CID',
    urlTemplate: 'https://pubchem.ncbi.nlm.nih.gov/compound/{cid}',
  },
]

function fill(template, vars) {
  const nameEnc = encodeURIComponent(vars.name)
  const casEnc = encodeURIComponent(vars.cas || vars.name)
  const pathSlug = nameEnc
  return template
    .split('{name}')
    .join(nameEnc)
    .split('{cas}')
    .join(casEnc)
    .split('{path}')
    .join(pathSlug)
    .split('{cid}')
    .join(String(vars.cid || ''))
    .split('{inchikey}')
    .join(encodeURIComponent(vars.inchiKey || ''))
    .split('{inchikey_raw}')
    .join(vars.inchiKey || '')
}

async function probe(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12_000)
  try {
    let res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'BioIntel-vendor-smoke/0.1 (research; free-API workbench)',
        Accept: 'text/html,application/xhtml+xml',
      },
    })
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent': 'BioIntel-vendor-smoke/0.1 (research; free-API workbench)',
          Accept: 'text/html,application/xhtml+xml',
          Range: 'bytes=0-0',
        },
      })
    }
    return { status: res.status, ok: res.ok, finalUrl: res.url }
  } catch (err) {
    return {
      status: 0,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  } finally {
    clearTimeout(timer)
  }
}

function classify(result) {
  if (result.error) return 'hard'
  if (result.status === 404 || result.status >= 500) return 'hard'
  // Bot walls / auth walls are soft — user browsers often succeed
  if (result.status === 403 || result.status === 401 || result.status === 429) return 'soft'
  if (result.ok || (result.status >= 200 && result.status < 400)) return 'ok'
  return 'soft'
}

async function main() {
  const asJson = process.argv.includes('--json')
  const rows = []
  for (const t of TEMPLATES) {
    const url = fill(t.urlTemplate, FIXTURE)
    const result = await probe(url)
    const level = classify(result)
    rows.push({
      name: t.name,
      url: url.slice(0, 200),
      status: result.status,
      level,
      error: result.error,
      finalUrl: result.finalUrl ? String(result.finalUrl).slice(0, 200) : undefined,
    })
    if (!asJson) {
      const mark = level === 'ok' ? '✓' : level === 'soft' ? '~' : '✗'
      console.log(
        `${mark} ${t.name.padEnd(28)} ${result.status || 'ERR'} ${result.error || ''}`.trim(),
      )
    }
  }
  const hard = rows.filter((r) => r.level === 'hard')
  const soft = rows.filter((r) => r.level === 'soft')
  if (asJson) {
    console.log(JSON.stringify({ fixture: FIXTURE, rows, hard: hard.length, soft: soft.length }, null, 2))
  } else {
    console.log('')
    console.log(`Summary: ${rows.length - hard.length - soft.length} ok, ${soft.length} soft, ${hard.length} hard`)
    if (hard.length) {
      console.log('Hard failures (fix URL templates):')
      for (const h of hard) console.log(`  - ${h.name}: ${h.status} ${h.error || h.url}`)
    }
  }
  process.exit(hard.length ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
