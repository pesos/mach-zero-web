import type { Schemas } from '@eventkit/sdk';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { asStaff, round } from '@/test/fixtures';
import { renderPortal } from '@/test/render';
import { apiError, E, server } from '@/test/server';

const idea: Schemas['Criterion'] = {
  id: 'c1',
  roundId: 'rd1',
  name: 'Idea',
  description: 'How good is it',
  maxScore: 10,
  position: 0,
};
const build: Schemas['Criterion'] = {
  id: 'c2',
  roundId: 'rd1',
  name: 'Build',
  description: '',
  maxScore: 5,
  position: 1,
};

const asked: { criteria: string | null; scores?: string | null } = { criteria: null };

function judging(teams: Schemas['JudgingTeam'][], criteria = [idea, build]) {
  server.use(
    http.get(`${E}/criteria`, ({ request }) => {
      asked.criteria = new URL(request.url).searchParams.get('roundId');
      return HttpResponse.json(criteria);
    }),
    http.get(`${E}/judging/teams`, () => HttpResponse.json(teams)),
  );
}

describe('judging', () => {
  it('starts from the judge’s saved scores and saves the filled-in ones', async () => {
    let sent: unknown;
    judging([
      {
        id: 't1',
        name: 'Byte Club',
        members: ['Asha', 'Ravi'],
        myScores: [{ criterionId: 'c1', value: 6, comment: 'Neat' } as Schemas['Score']],
      },
    ]);
    server.use(
      http.put(`${E}/judging/teams/:teamId/scores`, async ({ request }) => {
        sent = await request.json();
        asked.scores = new URL(request.url).searchParams.get('roundId');
        return HttpResponse.json([]);
      }),
    );
    renderPortal('/judge', { session: asStaff('judge') });
    expect(await screen.findByRole('heading', { name: 'Byte Club' })).toBeInTheDocument();
    expect(screen.getByText('2 members')).toBeInTheDocument();
    expect(screen.getByText('How good is it')).toBeInTheDocument();
    const idea = screen.getByRole('slider', { name: 'Idea' });
    expect(idea).toHaveAttribute('aria-valuenow', '6');
    expect(screen.getByLabelText('Comment on Idea')).toHaveValue('Neat');
    const build = screen.getByRole('slider', { name: 'Build' });
    expect(build).toHaveAttribute('aria-valuetext', 'Not scored');
    expect(screen.getByText('1 of 2 not scored yet')).toBeInTheDocument();

    // Arrow keys step by one; the numbers under the slider jump straight there.
    idea.focus();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    expect(idea).toHaveAttribute('aria-valuenow', '8');
    const buildTicks = build.closest('.grid')!.querySelectorAll('button[tabindex="-1"]');
    expect(buildTicks).toHaveLength(6);
    await userEvent.click(buildTicks[4]!);
    expect(build).toHaveAttribute('aria-valuetext', '4 of 5');
    expect(screen.getByLabelText('Total')).toHaveTextContent('12 / 15');
    await userEvent.clear(screen.getByLabelText('Comment on Idea'));
    await userEvent.click(screen.getByRole('button', { name: 'Save scores' }));
    expect(await screen.findByText('Saved.')).toBeInTheDocument();
    expect(sent).toEqual({
      scores: [
        { criterionId: 'c1', value: 8, comment: null },
        { criterionId: 'c2', value: 4, comment: null },
      ],
    });
    expect(asked).toMatchObject({ criteria: 'rd1', scores: 'rd1' });
  });

  it('shows one team at a time, opening on the first one not fully scored', async () => {
    judging([
      {
        id: 't1',
        name: 'Byte Club',
        members: ['Asha'],
        myScores: [
          { criterionId: 'c1', value: 6, comment: null } as Schemas['Score'],
          { criterionId: 'c2', value: 3, comment: null } as Schemas['Score'],
        ],
      },
      { id: 't2', name: 'Null Pointers', members: ['Ravi'], myScores: [] },
      { id: 't3', name: 'Stack Smash', members: ['Meera', 'Kiran'], myScores: [] },
    ]);
    renderPortal('/judge', { session: asStaff('judge') });
    expect(await screen.findByRole('heading', { name: 'Null Pointers' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Byte Club' })).not.toBeInTheDocument();
    expect(screen.getByText('1 of 3 scored')).toBeInTheDocument();
    expect(screen.getByText('2 / 3')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByRole('heading', { name: 'Stack Smash' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(await screen.findByRole('heading', { name: 'Null Pointers' })).toBeVisible();
  });

  it('picks a team from searchable tiles, and keeps unsaved scores when switching', async () => {
    judging([
      { id: 't1', name: 'Byte Club', members: ['Asha'], myScores: [] },
      {
        id: 't2',
        name: 'Null Pointers',
        members: ['Ravi'],
        myScores: [
          { criterionId: 'c1', value: 3, comment: null } as Schemas['Score'],
          { criterionId: 'c2', value: 2, comment: null } as Schemas['Score'],
        ],
      },
    ]);
    renderPortal('/judge', { session: asStaff('judge') });
    const idea = await screen.findByRole('slider', { name: 'Idea' });
    idea.focus();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');

    const tiles = screen.getByRole('radiogroup', { name: 'Pick a team' });
    expect(within(tiles).getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByText('1 of 2 scored')).toBeInTheDocument();
    expect(within(tiles).getByLabelText('Scored')).toBeInTheDocument();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search teams' }), 'ravi');
    expect(within(tiles).getAllByRole('radio')).toHaveLength(1);
    await userEvent.click(within(tiles).getByRole('radio', { name: /Null Pointers/ }));
    expect(await screen.findByRole('heading', { name: 'Null Pointers' })).toBeVisible();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search teams' }), 'zzz');
    expect(screen.getByText('No team matches.')).toBeInTheDocument();
    await userEvent.clear(screen.getByRole('searchbox', { name: 'Search teams' }));
    await userEvent.click(
      within(screen.getByRole('radiogroup', { name: 'Pick a team' })).getByRole('radio', {
        name: /Byte Club/,
      }),
    );
    expect(await screen.findByRole('heading', { name: 'Byte Club' })).toBeVisible();
    expect(screen.getByRole('slider', { name: 'Idea' })).toHaveAttribute('aria-valuenow', '2');
  });

  it('shows the team’s submission for the round', async () => {
    judging([{ id: 't1', name: 'Byte Club', members: ['Asha'], myScores: [] }]);
    server.use(
      http.get(`${E}/submissions`, () =>
        HttpResponse.json([
          {
            id: 's1',
            round: { id: 'rd1', name: 'Round 1', phase: 'released' },
            title: 'Project',
            description: '',
            position: 0,
            deadline: null,
            fields: [
              {
                id: 'f1',
                label: 'Repo',
                help: null,
                type: 'short_text',
                options: [],
                required: true,
                unique: false,
                pattern: null,
                position: 0,
              },
            ],
            entryCount: 1,
            createdAt: '2026-10-31T06:00:00.000Z',
            updatedAt: '2026-10-31T06:00:00.000Z',
          },
        ]),
      ),
      http.get(`${E}/submissions/s1/entries`, () =>
        HttpResponse.json([
          {
            id: 'e1',
            submissionId: 's1',
            team: { id: 't1', name: 'Byte Club' },
            answers: { f1: 'https://git.test/byte' },
            submittedBy: { registrationId: 'r1', name: 'Asha' },
            late: false,
            createdAt: '2026-10-31T06:00:00.000Z',
            updatedAt: '2026-10-31T06:00:00.000Z',
          },
        ]),
      ),
    );
    const first = renderPortal('/judge', { session: asStaff('judge') });
    await userEvent.click(await screen.findByRole('tab', { name: 'Submission' }));
    const link = await screen.findByRole('link', { name: 'git.test/byte' });
    expect(link).toHaveAttribute('href', 'https://git.test/byte');
    expect(screen.getByText(/Saved by Asha/)).toBeInTheDocument();
    first.unmount();

    // On Round 2, Round 1's submission still shows below it.
    const session = asStaff('judge');
    server.use(
      http.get(`${E}/rounds`, () =>
        HttpResponse.json([
          round({ id: 'rd1', name: 'Round 1', phase: 'closed' }),
          round({ id: 'rd2', name: 'Round 2', phase: 'released', position: 1 }),
        ]),
      ),
    );
    renderPortal('/judge', { session });
    await userEvent.click(await screen.findByRole('tab', { name: 'Submission' }));
    expect(await screen.findByRole('button', { name: /Round 2/ })).toBeInTheDocument();
    expect(screen.getByText('This round has no submission forms.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Round 1/ })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'git.test/byte' })).toBeInTheDocument();
  });

  it('opens every judge’s review once the round is closed, not before', async () => {
    judging([{ id: 't1', name: 'Byte Club', members: ['Asha'], myScores: [] }]);
    server.use(
      http.get(`${E}/judging/teams/t1/breakdown`, () =>
        HttpResponse.json({
          round: { id: 'rd1', name: 'Round 1', phase: 'closed' },
          team: { id: 't1', name: 'Byte Club' },
          inRound: true,
          total: 9,
          maxTotal: 15,
          criteria: [{ id: 'c1', name: 'Idea', maxScore: 10, average: 9 }],
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
    const open = renderPortal('/judge', { session: asStaff('judge') });
    await userEvent.click(await screen.findByRole('tab', { name: 'Reviews' }));
    expect(await screen.findByText('Reviews open when the round closes')).toBeInTheDocument();
    open.unmount();

    const session = asStaff('judge');
    server.use(
      http.get(`${E}/rounds`, () =>
        HttpResponse.json([round({ id: 'rd1', name: 'Round 1', phase: 'closed' })]),
      ),
    );
    renderPortal('/judge', { session });
    await userEvent.click(await screen.findByRole('tab', { name: 'Reviews' }));
    expect(await screen.findByText('Meera')).toBeInTheDocument();
    expect(screen.getByText('Lovely demo')).toBeInTheDocument();
  });

  it('shows the reviews of earlier rounds under the current one', async () => {
    judging([{ id: 't1', name: 'Byte Club', members: ['Asha'], myScores: [] }]);
    const asked: (string | null)[] = [];
    const session = asStaff('judge');
    server.use(
      http.get(`${E}/rounds`, () =>
        HttpResponse.json([
          round({ id: 'rd1', name: 'Round 1', phase: 'closed' }),
          round({ id: 'rd2', name: 'Round 2', phase: 'released', position: 1 }),
          round({ id: 'rd3', name: 'Round 3', phase: 'draft', position: 2 }),
        ]),
      ),
      http.get(`${E}/judging/teams/t1/breakdown`, ({ request }) => {
        asked.push(new URL(request.url).searchParams.get('roundId'));
        return HttpResponse.json({
          round: { id: 'rd1', name: 'Round 1', phase: 'closed' },
          team: { id: 't1', name: 'Byte Club' },
          inRound: true,
          total: 9,
          maxTotal: 10,
          criteria: [{ id: 'c1', name: 'Idea', maxScore: 10, average: 9 }],
          judges: [
            {
              judge: { id: 'j2', name: 'Meera' },
              total: 9,
              updatedAt: '2026-10-31T06:00:00.000Z',
              scores: [{ criterionId: 'c1', value: 9, comment: 'Round one remark' }],
            },
          ],
        });
      }),
    );
    renderPortal('/judge', { session });
    await userEvent.click(await screen.findByRole('tab', { name: 'Reviews' }));
    // Round 2 (this round, still open) is locked; Round 1 below it is readable.
    expect(await screen.findByRole('button', { name: /Round 2/ })).toBeInTheDocument();
    expect(screen.getByText('Reviews open when the round closes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Round 1/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Round 3/ })).not.toBeInTheDocument();
    expect(await screen.findByText('Round one remark')).toBeInTheDocument();
    expect(screen.getByText('Final score')).toBeInTheDocument();
    expect(asked).toEqual(['rd1']);
  });

  it('opens the team named in the link', async () => {
    judging([
      { id: 't1', name: 'Byte Club', members: ['Asha'], myScores: [] },
      { id: 't2', name: 'Null Pointers', members: ['Ravi'], myScores: [] },
    ]);
    renderPortal('/judge?team=t2', { session: asStaff('judge') });
    expect(await screen.findByRole('heading', { name: 'Null Pointers' })).toBeInTheDocument();
  });

  it('lets an admin pick a round, defaulting to the first open one', async () => {
    const seen: (string | null)[] = [];
    const session = asStaff('admin');
    server.use(
      http.get(`${E}/rounds`, () =>
        HttpResponse.json([
          round({ id: 'rd1', name: 'Round 1', phase: 'closed' }),
          round({ id: 'rd2', name: 'Round 2', phase: 'released', position: 1 }),
          round({ id: 'rd3', name: 'Round 3', phase: 'released', position: 2 }),
        ]),
      ),
      http.get(`${E}/criteria`, ({ request }) => {
        seen.push(new URL(request.url).searchParams.get('roundId'));
        return HttpResponse.json([idea]);
      }),
      http.get(`${E}/judging/teams`, () => HttpResponse.json([])),
    );
    renderPortal('/judge', { session });
    const picker = await screen.findByRole('combobox', { name: 'Round' });
    expect(picker).toHaveTextContent('Round 2');
    await userEvent.click(picker);
    await userEvent.click(await screen.findByRole('option', { name: 'Round 1 (closed)' }));
    await waitFor(() => expect(seen).toContain('rd1'));
    expect(seen[0]).toBe('rd2');
  });

  it('says so when there are no rounds', async () => {
    const session = asStaff('judge');
    server.use(http.get(`${E}/rounds`, () => HttpResponse.json([])));
    renderPortal('/judge', { session });
    expect(await screen.findByText(/not set up a round/)).toBeInTheDocument();
  });

  it('clears a score so it is not saved', async () => {
    let sent: unknown;
    judging([
      {
        id: 't1',
        name: 'Byte Club',
        members: ['Asha'],
        myScores: [{ criterionId: 'c2', value: 3, comment: null } as Schemas['Score']],
      },
    ]);
    server.use(
      http.put(`${E}/judging/teams/:teamId/scores`, async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json([]);
      }),
    );
    renderPortal('/judge', { session: asStaff('judge') });
    const idea = await screen.findByRole('slider', { name: 'Idea' });
    idea.focus();
    await userEvent.keyboard('{ArrowRight}');
    await userEvent.click(screen.getByRole('button', { name: 'Clear Build' }));
    expect(screen.getByRole('slider', { name: 'Build' })).toHaveAttribute(
      'aria-valuetext',
      'Not scored',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save scores' }));
    await screen.findByText('Saved.');
    expect(sent).toEqual({ scores: [{ criterionId: 'c1', value: 1, comment: null }] });
  });

  it('shows a save that was refused', async () => {
    judging([{ id: 't1', name: 'Byte Club', members: ['Asha'], myScores: [] }]);
    server.use(
      http.put(`${E}/judging/teams/:teamId/scores`, () =>
        apiError(409, 'JUDGING_CLOSED', 'Judging has closed.'),
      ),
    );
    renderPortal('/judge', { session: asStaff('admin') });
    const idea = await screen.findByRole('slider', { name: 'Idea' });
    expect(screen.getByRole('button', { name: 'Save scores' })).toBeDisabled();
    idea.focus();
    await userEvent.keyboard('{End}');
    await userEvent.click(screen.getByRole('button', { name: 'Save scores' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Judging has closed.');
  });

  it('waits for the rubric and for checked-in teams', async () => {
    judging([], []);
    const first = renderPortal('/judge', { session: asStaff('judge') });
    expect(
      await screen.findByText('The organisers have not set the rubric yet.'),
    ).toBeInTheDocument();
    first.unmount();
    judging([]);
    renderPortal('/judge', { session: asStaff('judge') });
    expect(await screen.findByText(/No teams to judge yet/)).toBeInTheDocument();
  });

  it('shows an error loading the teams', async () => {
    judging([]);
    server.use(http.get(`${E}/judging/teams`, () => apiError(500, 'INTERNAL', 'Judging trouble.')));
    renderPortal('/judge', { session: asStaff('judge') });
    expect(await screen.findByRole('alert')).toHaveTextContent('Judging trouble.');
  });
});
