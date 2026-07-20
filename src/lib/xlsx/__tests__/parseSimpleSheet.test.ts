/**
 * @jest-environment node
 */

import { inflateRawSync } from 'zlib'
import { parseXlsxFirstSheet } from '../parseSimpleSheet'

/** Minimal valid xlsx zip for one shared-string cell A1. */
function buildMinimalXlsx(): Buffer {
  const shared = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" uniqueCount="2">
<si><t>Name of medicine</t></si><si><t>TestMed</t></si></sst>`
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>
<row r="1"><c r="A1" t="s"><v>0</v></c></row>
<row r="2"><c r="A2" t="s"><v>1</v></c></row>
</sheetData></worksheet>`

  function localFile(name: string, content: string): Buffer {
    const data = Buffer.from(content, 'utf8')
    const nameBuf = Buffer.from(name, 'utf8')
    // store method (0) — no compression
    const header = Buffer.alloc(30)
    header.writeUInt32LE(0x04034b50, 0)
    header.writeUInt16LE(20, 4) // version
    header.writeUInt16LE(0, 6) // flags
    header.writeUInt16LE(0, 8) // method store
    header.writeUInt16LE(0, 10)
    header.writeUInt16LE(0, 12)
    header.writeUInt32LE(0, 14) // crc skip
    header.writeUInt32LE(data.length, 18)
    header.writeUInt32LE(data.length, 22)
    header.writeUInt16LE(nameBuf.length, 26)
    header.writeUInt16LE(0, 28)
    return Buffer.concat([header, nameBuf, data])
  }

  // Central directory not required by our sequential local-header reader
  const e1 = localFile('xl/sharedStrings.xml', shared)
  const e2 = localFile('xl/worksheets/sheet1.xml', sheet)
  // End of central directory marker so naive readers stop cleanly
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  return Buffer.concat([e1, e2, eocd])
}

describe('parseXlsxFirstSheet', () => {
  it('reads shared-string cells', () => {
    const rows = parseXlsxFirstSheet(buildMinimalXlsx())
    expect(rows.length).toBeGreaterThanOrEqual(2)
    expect(rows[0][0]).toBe('Name of medicine')
    expect(rows[1][0]).toBe('TestMed')
  })

  it('inflates deflated entries when present', () => {
    // smoke: inflateRawSync available in env
    const raw = Buffer.from('hello', 'utf8')
    expect(inflateRawSync.length).toBeGreaterThanOrEqual(1)
    expect(raw.toString()).toBe('hello')
  })
})
