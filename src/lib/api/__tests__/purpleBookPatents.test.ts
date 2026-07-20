/**
 * @jest-environment node
 */

import {
  clearPurpleBookPatentMemoryCache,
  parsePurpleBookPatentHtml,
  usptoPatentUrl,
} from '../purpleBookPatents'

const SAMPLE = `
<table id="patentListTable">
  <thead><tr>
    <th>Reference Product BLA Number</th>
    <th>Applicant Name</th>
    <th>Proprietary Name</th>
    <th>Proper Name</th>
    <th>Patent Number</th>
    <th>Patent Expiration Date</th>
  </tr></thead>
  <tbody>
    <tr valign="top">
      <td>125057</td>
      <td>AbbVie Inc.</td>
      <td><a href="index.cfm?event=productdetails&blaNo=125057">Humira</a></td>
      <td>adalimumab</td>
      <td>11,083,792</td>
      <td>April 4, 2027</td>
    </tr>
    <tr valign="top">
      <td>125057</td>
      <td>AbbVie Inc.</td>
      <td>Humira</td>
      <td>adalimumab</td>
      <td>8,916,153</td>
      <td>April 4, 2027</td>
    </tr>
    <tr valign="top">
      <td>103705</td>
      <td>Genentech, Inc.</td>
      <td>Rituxan</td>
      <td>rituximab</td>
      <td>8,512,983</td>
      <td>January 4, 2031</td>
    </tr>
  </tbody>
</table>
`

describe('purpleBookPatents', () => {
  beforeEach(() => clearPurpleBookPatentMemoryCache())

  it('parses BPPT table rows and normalizes BLA / patent numbers', () => {
    const rows = parsePurpleBookPatentHtml(SAMPLE)
    expect(rows).toHaveLength(3)
    const humira = rows.filter((r) => r.properName === 'adalimumab')
    expect(humira).toHaveLength(2)
    expect(humira[0].blaNumber).toBe('BLA125057')
    expect(humira[0].patentNumber).toBe('11083792')
    expect(humira[0].patentExpirationDate).toMatch(/2027/)
    expect(humira[0].googlePatentsUrl).toMatch(/patents\.google\.com/)
    expect(usptoPatentUrl('11,083,792')).toMatch(/11083792/)
  })
})
