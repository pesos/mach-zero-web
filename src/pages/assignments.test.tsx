import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { asParticipant, team } from '@/test/fixtures';
import { renderPortal } from '@/test/render';

const assignment = (over: object) => ({
  listId: 'l1',
  listName: 'Problem statement',
  kind: 'options' as const,
  option: null,
  text: null,
  released: true,
  assignedBy: null,
  assignedAt: '2026-10-20T10:00:00.000Z',
  ...over,
});

describe('the assignments tab', () => {
  it('shows what organisers assigned the team, under its own tab', async () => {
    const session = asParticipant(
      { status: 'confirmed' },
      {
        team: team({
          assignments: [
            assignment({
              option: { id: 'o1', title: 'Smart canteen', description: 'Shorter lunch queues' },
            }),
            assignment({ listId: 'l2', listName: 'Table', kind: 'text', text: 'Hall B, table 12' }),
          ],
        }),
      },
    );
    renderPortal('/assignments', { session });
    expect(await screen.findByText('Smart canteen')).toBeInTheDocument();
    expect(screen.getByText('Problem statement')).toBeInTheDocument();
    expect(screen.getByText('Shorter lunch queues')).toBeInTheDocument();
    expect(screen.getByText('Hall B, table 12')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Assignments' })[0]).toHaveAttribute(
      'href',
      '/assignments',
    );
  });

  it('says nothing is assigned yet before organisers release anything', async () => {
    const session = asParticipant({ status: 'confirmed' });
    renderPortal('/assignments', { session });
    expect(await screen.findByText('Nothing assigned yet')).toBeInTheDocument();
  });

  it('asks anyone else to open their personal link', async () => {
    renderPortal('/assignments');
    expect(
      await screen.findByText('Open your personal link to see what your team was assigned.'),
    ).toBeInTheDocument();
  });
});
