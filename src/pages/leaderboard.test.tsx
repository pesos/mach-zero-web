import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { asParticipant, asStaff } from '@/test/fixtures';
import { renderPortal } from '@/test/render';
import { E, P, portalEvent, portalInfo, server } from '@/test/server';

const board = (visibleToEveryone: boolean) => ({
  visibleToEveryone,
  entries: [
    {
      rank: 1,
      team: { id: 't1', name: 'Byte Club' },
      total: 17.5,
      maxTotal: 20,
      judges: 2,
      criteria: [
        { criterionId: 'c1', average: 8.5 },
        { criterionId: 'c2', average: 9 },
      ],
    },
  ],
});

const shared = () =>
  server.use(
    http.get(P, () =>
      HttpResponse.json(portalInfo({ event: { ...portalEvent, leaderboardVisible: true } })),
    ),
  );

describe('leaderboard', () => {
  it('shows a participant the leaderboard once it is shared', async () => {
    const session = asParticipant();
    shared();
    server.use(http.get(`${P}/me/leaderboard`, () => HttpResponse.json(board(true))));
    renderPortal('/leaderboard', { session });
    expect(await screen.findByRole('link', { name: 'Leaderboard' })).toBeInTheDocument();
    const list = await screen.findByRole('list', { name: 'Leaderboard' });
    expect(within(list).getByRole('listitem')).toHaveTextContent(/^1Byte Club17\.5 \/ 20$/);
  });

  it('waits until the organisers share it, and leaves it out of the menu', async () => {
    renderPortal('/leaderboard', { session: asParticipant() });
    expect(await screen.findByText(/have not shared the leaderboard yet/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Leaderboard' })).not.toBeInTheDocument();
  });

  it('always shows judges the board with each criterion’s average', async () => {
    server.use(
      http.get(`${E}/leaderboard`, () => HttpResponse.json(board(false))),
      http.get(`${E}/criteria`, () =>
        HttpResponse.json([
          { id: 'c1', name: 'Idea', description: '', maxScore: 10, position: 0 },
          { id: 'c2', name: 'Build', description: '', maxScore: 10, position: 1 },
        ]),
      ),
    );
    renderPortal('/leaderboard', { session: asStaff('judge') });
    expect(await screen.findByText('2 judges · Idea 8.5 · Build 9')).toBeInTheDocument();
    expect(screen.getByText(/Only organisers and judges can see this/)).toBeInTheDocument();
  });

  it('shows volunteers totals only, once shared', async () => {
    shared();
    server.use(http.get(`${E}/leaderboard`, () => HttpResponse.json(board(true))));
    renderPortal('/leaderboard', { session: asStaff('volunteer') });
    const list = await screen.findByRole('list', { name: 'Leaderboard' });
    expect(within(list).queryByText(/judges/)).not.toBeInTheDocument();
  });
});
