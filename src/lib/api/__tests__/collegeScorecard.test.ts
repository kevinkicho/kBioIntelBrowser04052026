/**
 * @jest-environment node
 */

import { searchUsCollegesByName } from '../collegeScorecard'

describe('collegeScorecard', () => {
  it('returns empty for short query', async () => {
    await expect(searchUsCollegesByName('a')).resolves.toEqual([])
  })

  it('maps Scorecard API results', async () => {
    // @ts-expect-error mock
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        results: [
          {
            id: 166027,
            'school.name': 'Harvard University',
            'school.city': 'Cambridge',
            'school.state': 'MA',
            'school.zip': '02138',
            'school.school_url': 'www.harvard.edu/',
            'school.ownership': 2,
            'school.degrees_awarded.predominant': 3,
            'latest.student.size': 7601,
          },
        ],
      }),
    }))

    const rows = await searchUsCollegesByName('Harvard')
    expect(rows).toHaveLength(1)
    expect(rows[0].name).toBe('Harvard University')
    expect(rows[0].state).toBe('MA')
    expect(rows[0].ownership).toMatch(/nonprofit/i)
    expect(rows[0].schoolUrl).toMatch(/harvard/)
    expect(rows[0].scorecardUrl).toMatch(/collegescorecard/)
  })
})
