import { getEmaBulkDownloadLinks } from '../emaBulk'

describe('emaBulk', () => {
  it('exposes official EMA download portals', () => {
    const links = getEmaBulkDownloadLinks()
    expect(links.length).toBeGreaterThanOrEqual(3)
    expect(links.some((l) => l.url.includes('download-medicine-data'))).toBe(true)
    expect(links.some((l) => l.id === 'ema-biosimilars-topic')).toBe(true)
  })
})
