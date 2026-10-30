import type { Schemas } from '@eventkit/sdk';
import { screen, waitFor } from '@testing-library/react';
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
    expect(screen.getByText('Asha, Ravi')).toBeInTheDocument();
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

  it('lets an admin pick a round, defaulting to the latest released one', async () => {
    const seen: (string | null)[] = [];
    const session = asStaff('admin');
    server.use(
      http.get(`${E}/rounds`, () =>
        HttpResponse.json([
          round({ id: 'rd1', name: 'Round 1', phase: 'released' }),
          round({ id: 'rd2', name: 'Round 2', phase: 'released', position: 1 }),
          round({ id: 'rd3', name: 'Round 3', phase: 'draft', position: 2 }),
        ]),
      ),
      http.get(`${E}/criteria`, ({ request }) => {
        seen.push(new URL(request.url).searchParams.get('roundId'));
        return HttpResponse.json([idea]);
      }),
      http.get(`${E}/judging/teams`, () => HttpResponse.json([])),
    );
    renderPortal('/judge', { session });
    const picker = await screen.findByLabelText('Round');
    expect(picker).toHaveValue('rd2');
    await userEvent.selectOptions(picker, 'rd1');
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
