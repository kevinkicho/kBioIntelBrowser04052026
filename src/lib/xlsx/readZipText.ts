/**
 * Minimal ZIP reader (store + deflate) for reading OOXML .xlsx entries.
 * No external deps — Node zlib only.
 */

import { inflateRawSync } from 'zlib'

function u16(buf: Buffer, off: number): number {
  return buf.readUInt16LE(off)
}
function u32(buf: Buffer, off: number): number {
  return buf.readUInt32LE(off)
}

/**
 * Extract a single file's uncompressed text from a ZIP buffer by exact path.
 */
export function readZipTextEntry(zip: Buffer, entryPath: string): string | null {
  let offset = 0
  const target = entryPath.replace(/\\/g, '/')
  while (offset + 30 <= zip.length) {
    const sig = u32(zip, offset)
    if (sig !== 0x04034b50) break // local file header
    const method = u16(zip, offset + 8)
    const compSize = u32(zip, offset + 18)
    const uncompSize = u32(zip, offset + 22)
    const nameLen = u16(zip, offset + 26)
    const extraLen = u16(zip, offset + 28)
    const nameStart = offset + 30
    const name = zip.subarray(nameStart, nameStart + nameLen).toString('utf8')
    const dataStart = nameStart + nameLen + extraLen
    // ZIP data descriptor / zero sizes: fall back to searching EOCD if needed — skip for EMA xlsx (sizes present)
    const size = compSize
    if (size === 0 && uncompSize === 0) {
      // try next signature scan — rare; skip entry
      offset = dataStart
      continue
    }
    const data = zip.subarray(dataStart, dataStart + size)
    offset = dataStart + size

    if (name.replace(/\\/g, '/') !== target) continue

    if (method === 0) {
      return data.toString('utf8')
    }
    if (method === 8) {
      try {
        return inflateRawSync(data).toString('utf8')
      } catch {
        return null
      }
    }
    return null
  }
  return null
}
