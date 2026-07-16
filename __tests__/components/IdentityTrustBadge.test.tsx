import React from 'react'
import { render, screen } from '@testing-library/react'
import {
  AlternateCids,
  IdentityTrustBadge,
  identityTrustLabel,
} from '@/components/identity'

describe('IdentityTrustBadge', () => {
  it('renders high trust label', () => {
    render(<IdentityTrustBadge level="high" />)
    const badge = screen.getByTestId('identity-trust-badge')
    expect(badge).toHaveAttribute('data-identity-trust', 'high')
    expect(badge.textContent).toMatch(/identity high/i)
  })

  it('renders compact short label', () => {
    render(<IdentityTrustBadge level="medium" compact />)
    expect(screen.getByTestId('identity-trust-badge').textContent).toMatch(/medium/i)
    expect(screen.getByTestId('identity-trust-badge').textContent).not.toMatch(/identity medium/i)
  })

  it('assesses from keys when level omitted', () => {
    render(
      <IdentityTrustBadge
        keys={{ inchiKey: 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N', cid: 2244, name: 'Aspirin' }}
      />,
    )
    expect(screen.getByTestId('identity-trust-badge')).toHaveAttribute(
      'data-identity-trust',
      'high',
    )
  })

  it('defaults to unresolved without props', () => {
    render(<IdentityTrustBadge />)
    expect(screen.getByTestId('identity-trust-badge')).toHaveAttribute(
      'data-identity-trust',
      'unresolved',
    )
  })

  it('includes reasons in title tooltip', () => {
    render(
      <IdentityTrustBadge
        level="medium"
        reasons={['PubChem CID 2244']}
      />,
    )
    expect(screen.getByTestId('identity-trust-badge').getAttribute('title')).toMatch(
      /PubChem CID 2244/,
    )
  })

  it('identityTrustLabel helper', () => {
    expect(identityTrustLabel('high')).toBe('Identity high')
    expect(identityTrustLabel('low', true)).toBe('Low')
  })
})

describe('AlternateCids', () => {
  it('renders nothing when empty', () => {
    const { container } = render(
      <AlternateCids primaryCid={1} alternateCids={[]} />,
    )
    expect(container.querySelector('[data-testid="alternate-cids"]')).toBeNull()
  })

  it('excludes primary and surfaces alternates as links', () => {
    render(
      <AlternateCids primaryCid={1} alternateCids={[1, 2, 3]} />,
    )
    const root = screen.getByTestId('alternate-cids')
    expect(root.textContent).toMatch(/Alternate CIDs/)
    expect(root.textContent).toMatch(/CID 2/)
    expect(root.textContent).toMatch(/CID 3/)
    expect(root.textContent).not.toMatch(/CID 1/)
    const links = root.querySelectorAll('a')
    expect(links[0]).toHaveAttribute('href', '/molecule/2')
  })

  it('compact mode with +N overflow', () => {
    render(
      <AlternateCids
        primaryCid={null}
        alternateCids={[10, 20, 30, 40, 50]}
        compact
        maxVisible={2}
      />,
    )
    const root = screen.getByTestId('alternate-cids')
    expect(root.textContent).toMatch(/Alt/)
    expect(root.textContent).toMatch(/\+3/)
  })
})
