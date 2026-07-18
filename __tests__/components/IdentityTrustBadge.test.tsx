/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import {
  IdentityTrustBadge,
  identityIdChips,
} from '@/components/identity/IdentityTrustBadge'

describe('IdentityTrustBadge', () => {
  test('shows known identifiers instead of high/medium/unresolved labels', () => {
    render(
      <IdentityTrustBadge
        keys={{
          inchiKey: 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N',
          cid: 2244,
          chemblId: 'CHEMBL25',
        }}
      />,
    )
    const root = screen.getByTestId('identity-trust-badge')
    expect(root.textContent).not.toMatch(/medium|unresolved|high|low/i)
    expect(screen.getByTestId('identity-id-cid')).toHaveTextContent('CID 2244')
    expect(screen.getByTestId('identity-id-chembl')).toHaveTextContent('CHEMBL25')
    expect(screen.getByTestId('identity-id-inchikey')).toBeInTheDocument()
  })

  test('empty keys show no structure IDs, not unresolved chip', () => {
    render(<IdentityTrustBadge keys={{ name: 'Mystery' }} />)
    const root = screen.getByTestId('identity-trust-badge')
    expect(root.textContent).toMatch(/No structure IDs/i)
    expect(root.textContent).not.toMatch(/unresolved/i)
  })

  test('identityIdChips lists normalized keys', () => {
    const chips = identityIdChips({ cid: 1, chemblId: '25' })
    expect(chips.some((c) => c.kind === 'cid' && c.label === 'CID 1')).toBe(true)
    expect(chips.some((c) => c.kind === 'chembl' && c.label === 'CHEMBL25')).toBe(true)
  })
})
