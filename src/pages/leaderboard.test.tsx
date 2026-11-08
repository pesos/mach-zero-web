import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { asParticipant, asStaff, round } from '@/test/fixtures';
import { renderPortal } from '@/test/render';
import { apiError, E, P, portalEvent, portalInfo, server } from '@/test/server';

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

  it('shows an empty state until the organisers share it, but keeps it in the menu', async () => {
    renderPortal('/leaderboard', { session: asParticipant() });
    expect(await screen.findByText('No leaderboards released yet')).toBeInTheDocument();
    expect(screen.getByText(/appear here once the organisers release it/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Leaderboard' })).toBeInTheDocument();
  });

  it('shows the same empty state to staff who may not see it yet', async () => {
    renderPortal('/leaderboard', { session: asStaff('volunteer') });
    expect(await screen.findByText('No leaderboards released yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Leaderboard' })).toBeInTheDocument();
  });

  it('shows the empty state when the API says it is hidden', async () => {
    shared();
    server.use(
      http.get(`${P}/me/leaderboard`, () =>
        apiError(403, 'LEADERBOARD_HIDDEN', 'The leaderboard is not public.'),
      ),
    );
    renderPortal('/leaderboard', { session: asParticipant() });
    expect(await screen.findByText('No leaderboards released yet')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
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

  it('lets a participant switch between released rounds', async () => {
    const session = asParticipant();
    shared();
    const asked: (string | null)[] = [];
    const sub = (id: string, name: string, phase: string) => ({
      id: `s-${id}`,
      round: { id, name, phase },
      title: name,
      description: '',
      position: 0,
      fields: [],
      open: false,
      entry: null,
    });
    server.use(
      http.get(`${P}/me/submissions`, () =>
        HttpResponse.json([sub('rd1', 'Round 1', 'closed'), sub('rd2', 'Round 2', 'released')]),
      ),
      http.get(`${P}/me/leaderboard`, ({ request }) => {
        asked.push(new URL(request.url).searchParams.get('roundId'));
        return HttpResponse.json(board(true));
      }),
    );
    renderPortal('/leaderboard', { session });
    const picker = await screen.findByRole('combobox', { name: 'Round' });
    await waitFor(() => expect(asked).toContain('rd2'));
    await userEvent.click(picker);
    await userEvent.click(await screen.findByRole('option', { name: /Round 1/ }));
    await waitFor(() => expect(asked).toContain('rd1'));
  });

  it('lets judges open every judge’s marks once the round is closed, not before', async () => {
    const session = asStaff('judge');
    let phase: 'released' | 'closed' = 'released';
    server.use(
      http.get(`${E}/criteria`, () => HttpResponse.json([])),
      http.get(`${E}/leaderboard`, () =>
        HttpResponse.json({ ...board(false), round: { id: 'rd1', name: 'Round 1', phase } }),
      ),
      http.get(`${E}/judging/teams/t1/breakdown`, () =>
        HttpResponse.json({
          round: { id: 'rd1', name: 'Round 1', phase: 'closed' },
          team: { id: 't1', name: 'Byte Club' },
          inRound: true,
          total: 17.5,
          maxTotal: 20,
          criteria: [{ id: 'c1', name: 'Idea', maxScore: 10, average: 8.5 }],
          judges: [
            {
              judge: { id: 'j2', name: 'Meera' },
              total: 9,
              updatedAt: '2026-10-31T06:00:00.000Z',
              scores: [{ criterionId: 'c1', value: 9, comment: 'Lovely demo' }],
            },
          ],
        }),
      ),
    );
    const first = renderPortal('/leaderboard', { session });
    expect(await screen.findByText('Byte Club')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Byte Club' })).not.toBeInTheDocument();
    first.unmount();

    phase = 'closed';
    renderPortal('/leaderboard', { session });
    await userEvent.click(await screen.findByRole('button', { name: 'Byte Club' }));
    const sheet = await screen.findByRole('dialog', { name: 'Byte Club' });
    expect(await within(sheet).findByText('Meera')).toBeInTheDocument();
    expect(within(sheet).getByText('Lovely demo')).toBeInTheDocument();
  });

  it('lets staff switch rounds', async () => {
    const session = asStaff('judge');
    const asked: (string | null)[] = [];
    server.use(
      http.get(`${E}/rounds`, () =>
        HttpResponse.json([round(), round({ id: 'rd2', name: 'Final', position: 1 })]),
      ),
      http.get(`${E}/criteria`, () => HttpResponse.json([])),
      http.get(`${E}/leaderboard`, ({ request }) => {
        asked.push(new URL(request.url).searchParams.get('roundId'));
        return HttpResponse.json(board(false));
      }),
    );
    renderPortal('/leaderboard', { session });
    const picker = await screen.findByRole('combobox', { name: 'Round' });
    await waitFor(() => expect(asked).toEqual(['rd2']));
    await userEvent.click(picker);
    await userEvent.click(await screen.findByRole('option', { name: /Round 1/ }));
    await waitFor(() => expect(asked).toContain('rd1'));
  });
});

describe('before the event day', () => {
  it('tells participants when it opens', async () => {
    const session = asParticipant();
    server.use(
      http.get(P, () =>
        HttpResponse.json(
          portalInfo({ event: { ...portalEvent, activitiesFrom: '2099-01-01T00:00:00.000Z' } }),
        ),
      ),
    );
    renderPortal('/leaderboard', { session });
    expect(
      await screen.findByRole('heading', {
        name: 'The leaderboard and results open on the day of the event',
      }),
    ).toBeInTheDocument();
  });
});
