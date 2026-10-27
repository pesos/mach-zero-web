import type { Schemas } from '@eventkit/sdk';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { asStaff } from '@/test/fixtures';
import { renderPortal } from '@/test/render';
import { apiError, E, server } from '@/test/server';

const idea: Schemas['Criterion'] = {
  id: 'c1',
  name: 'Idea',
  description: 'How good is it',
  maxScore: 10,
  position: 0,
};
const build: Schemas['Criterion'] = {
  id: 'c2',
  name: 'Build',
  description: '',
  maxScore: 5,
  position: 1,
};

function judging(teams: Schemas['JudgingTeam'][], criteria = [idea, build]) {
  server.use(
    http.get(`${E}/criteria`, () => HttpResponse.json(criteria)),
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
        return HttpResponse.json([]);
      }),
    );
    renderPortal('/judge', { session: asStaff('judge') });
    expect(await screen.findByRole('heading', { name: 'Byte Club' })).toBeInTheDocument();
    expect(screen.getByText('Asha, Ravi')).toBeInTheDocument();
    expect(screen.getByText('How good is it')).toBeInTheDocument();
    const ideaInput = screen.getByLabelText('Idea (0–10)');
    expect(ideaInput).toHaveValue(6);
    expect(screen.getByLabelText('Comment on Idea')).toHaveValue('Neat');
    const save = screen.getByRole('button', { name: 'Save scores' });

    await userEvent.type(screen.getByLabelText('Build (0–5)'), '7');
    expect(save).toBeDisabled();
    await userEvent.clear(screen.getByLabelText('Build (0–5)'));
    await userEvent.type(screen.getByLabelText('Build (0–5)'), '4');
    await userEvent.clear(screen.getByLabelText('Comment on Idea'));
    await userEvent.click(save);
    expect(await screen.findByRole('status')).toHaveTextContent('Saved.');
    expect(sent).toEqual({
      scores: [
        { criterionId: 'c1', value: 6, comment: null },
        { criterionId: 'c2', value: 4, comment: null },
      ],
    });
  });

  it('shows a save that was refused', async () => {
    judging([{ id: 't1', name: 'Byte Club', members: ['Asha'], myScores: [] }]);
    server.use(
      http.put(`${E}/judging/teams/:teamId/scores`, () =>
        apiError(409, 'JUDGING_CLOSED', 'Judging has closed.'),
      ),
    );
    renderPortal('/judge', { session: asStaff('admin') });
    await userEvent.type(await screen.findByLabelText('Idea (0–10)'), '5');
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
