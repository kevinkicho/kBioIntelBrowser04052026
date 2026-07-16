import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { BoardTable } from '@/components/projects/BoardTable'
import type { MoleculeCandidate, Project } from '@/lib/domain'
import { createEmptyScoreVector, createDefaultScoreRubric } from '@/lib/domain'

function makeCandidate(overrides: Partial<MoleculeCandidate> & { name: string }): MoleculeCandidate {
  const name = overrides.name
  const identity = {
    name,
    synonyms: [],
    pubchemCid: 2244 as number | null,
    identityTrust: 'medium' as const,
    alternateCids: [999, 1000],
    ...overrides.identity,
  }
  return {
    candidateId: overrides.candidateId ?? `cid:${identity.pubchemCid ?? name}`,
    identity,
    origins: overrides.origins ?? ['dgidb'],
    evidenceBreadthSources: overrides.evidenceBreadthSources ?? ['DGIdb'],
    links: overrides.links ?? [],
    scores:
      overrides.scores ??
      (() => {
        const v = createEmptyScoreVector('cheap', createDefaultScoreRubric('balanced'))
        return { ...v, composite: 0.72 }
      })(),
    boardStatus: overrides.boardStatus ?? 'untriaged',
  }
}

function makeProject(candidates: MoleculeCandidate[]): Project {
  return {
    schemaVersion: 1,
    id: 'proj-1',
    name: 'Test board',
    targetIds: [],
    packIndex: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    candidates,
  }
}

describe('BoardTable', () => {
  it('renders identity trust badge and alternate CIDs', () => {
    const project = makeProject([
      makeCandidate({
        name: 'Aspirin',
        identity: {
          name: 'Aspirin',
          synonyms: [],
          pubchemCid: 2244,
          identityTrust: 'high',
          inchiKey: 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N',
          alternateCids: [999],
        },
      }),
    ])

    render(
      <BoardTable
        project={project}
        onStatusChange={jest.fn()}
        onRemove={jest.fn()}
      />,
    )

    expect(screen.getByTestId('board-table')).toBeInTheDocument()
    expect(screen.getByText('Aspirin')).toBeInTheDocument()
    const badge = screen.getByTestId('identity-trust-badge')
    expect(badge).toHaveAttribute('data-identity-trust', 'high')
    expect(screen.getByTestId('alternate-cids').textContent).toMatch(/999/)
    expect(screen.getByText(/BSYNRYMUTXBXSQ/)).toBeInTheDocument()
  })

  it('calls status and remove handlers', () => {
    const onStatusChange = jest.fn()
    const onRemove = jest.fn()
    const c = makeCandidate({ name: 'Foo', candidateId: 'cid:1' })
    const project = makeProject([c])

    render(
      <BoardTable
        project={project}
        onStatusChange={onStatusChange}
        onRemove={onRemove}
      />,
    )

    fireEvent.change(screen.getByLabelText(/Board status for Foo/), {
      target: { value: 'promote' },
    })
    expect(onStatusChange).toHaveBeenCalledWith('cid:1', 'promote')

    fireEvent.click(screen.getByTitle('Remove from board'))
    expect(onRemove).toHaveBeenCalledWith('cid:1')
  })
})
