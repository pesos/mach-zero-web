import type { Schemas } from '@eventkit/sdk';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { asParticipant, asStaff } from '@/test/fixtures';
import { renderPortal } from '@/test/render';
import { apiError, E, P, portalEvent, portalInfo, server } from '@/test/server';

const field = (over: Partial<Schemas['PortalSubmission']['fields'][number]> = {}) => ({
  id: 'f1',
  label: 'Repo link',
  help: null,
  type: 'short_text' as const,
  options: [],
  required: true,
  unique: false,
  pattern: null,
  position: 0,
  ...over,
});

const submission = (
  over: Partial<Schemas['PortalSubmission']> = {},
): Schemas['PortalSubmission'] => ({
  id: 's1',
  round: { id: 'rd1', name: 'Round 1', phase: 'released' },
  title: 'Project',
  description: 'Hand in your repo',
  position: 0,
  deadline: null,
  fields: [field()],
  open: true,
  entry: null,
  ...over,
});

const mine = (items: Schemas['PortalSubmission'][]) =>
  server.use(http.get(`${P}/me/submissions`, () => HttpResponse.json(items)));

describe('a participant’s submissions', () => {
  it('shows an empty state', async () => {
    renderPortal('/submissions', { session: asParticipant() });
    expect(await screen.findByText('No submissions yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Submissions' })).toBeInTheDocument();
  });

  it('asks visitors to open their link', async () => {
    renderPortal('/submissions');
    expect(await screen.findByText(/Open your personal link/)).toBeInTheDocument();
  });

  it('groups by round, prefills from the entry and saves', async () => {
    const session = asParticipant();
    let sent: unknown;
    mine([
      submission({
        entry: {
          id: 'e1',
          submissionId: 's1',
          team: { id: 't1', name: 'Byte Club' },
          answers: { f1: 'old' },
          submittedBy: null,
          late: false,
          createdAt: '2026-10-20T10:00:00.000Z',
          updatedAt: '2026-10-20T10:00:00.000Z',
        },
      }),
      submission({
        id: 's2',
        title: 'Pitch',
        description: '',
        round: { id: 'rd2', name: 'Round 2', phase: 'released' },
      }),
    ]);
    server.use(
      http.put(`${P}/me/submissions/:id/entry`, async ({ request, params }) => {
        sent = { id: params.id, ...((await request.json()) as object) };
        return HttpResponse.json({});
      }),
    );
    renderPortal('/submissions', { session });
    expect(await screen.findByRole('heading', { name: 'Round 1' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Round 2' })).toBeInTheDocument();
    expect(screen.getByText('Hand in your repo')).toBeInTheDocument();
    const round1 = screen.getByRole('region', { name: 'Round 1' });
    const input = within(round1).getByLabelText('Repo link');
    expect(input).toHaveValue('old');
    await userEvent.clear(input);
    await userEvent.type(input, 'https://git.test/x');
    await userEvent.click(within(round1).getByRole('button', { name: 'Save' }));
    expect(await within(round1).findByText('Saved.')).toBeInTheDocument();
    expect(sent).toEqual({ id: 's1', answers: { f1: 'https://git.test/x' } });
  });

  it('takes checkbox, multiple-choice and date-time answers, and shows the deadline', async () => {
    const session = asParticipant();
    let sent: unknown;
    mine([
      submission({
        deadline: '2026-01-02T12:30:00.000Z',
        fields: [
          field({ id: 'stack', label: 'Stack', type: 'multi_choice', options: ['React', 'Go'] }),
          field({
            id: 'track',
            label: 'Track',
            help: 'Pick the closest one',
            type: 'choice',
            options: ['AI', 'Web'],
          }),
          field({ id: 'demo', label: 'Demo at', type: 'datetime', required: false }),
        ],
        entry: {
          id: 'e1',
          submissionId: 's1',
          team: { id: 't1', name: 'Byte Club' },
          answers: { stack: ['Go'] },
          submittedBy: { registrationId: 'r1', name: 'Asha' },
          late: true,
          createdAt: '2026-01-02T12:00:00.000Z',
          updatedAt: '2026-01-02T13:00:00.000Z',
        },
      }),
    ]);
    server.use(
      http.put(`${P}/me/submissions/:id/entry`, async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({});
      }),
    );
    renderPortal('/submissions', { session });
    expect(await screen.findByText(/Deadline passed 2 Jan 2026, 6:00 pm IST/)).toBeInTheDocument();
    expect(
      screen.getByText(/you can still submit, but it will be marked late/),
    ).toBeInTheDocument();
    expect(screen.getByText('Late')).toBeInTheDocument();
    expect(screen.getByText(/last saved 2 Jan 2026, 6:30 pm IST by Asha/)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Go' })).toBeChecked();
    await userEvent.click(screen.getByRole('checkbox', { name: 'React' }));
    expect(screen.getByRole('group', { name: 'Track' })).toHaveAccessibleDescription(
      'Pick the closest one',
    );
    await userEvent.click(screen.getByRole('radio', { name: 'Web' }));
    await userEvent.type(screen.getByLabelText('Demo at (optional)'), '2026-10-31T15:00');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Saved.')).toBeInTheDocument();
    expect(sent).toEqual({
      answers: { stack: ['Go', 'React'], track: 'Web', demo: '2026-10-31T15:00+05:30' },
    });
  });

  it('waits for the event day', async () => {
    const session = asParticipant();
    server.use(
      http.get(P, () =>
        HttpResponse.json(
          portalInfo({ event: { ...portalEvent, activitiesFrom: '2099-01-01T00:00:00.000Z' } }),
        ),
      ),
    );
    renderPortal('/submissions', { session });
    expect(
      await screen.findByRole('heading', { name: 'Submissions open on the day of the event' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Come back on 1 Jan 2099.')).toBeInTheDocument();
    for (const name of ['Submissions', 'Polls', 'Leaderboard']) {
      expect(screen.queryByRole('link', { name })).not.toBeInTheDocument();
    }
  });

  it('is read-only with a note once the round is closed', async () => {
    const session = asParticipant();
    mine([submission({ open: false })]);
    renderPortal('/submissions', { session });
    expect(await screen.findByLabelText('Repo link')).toBeDisabled();
    expect(screen.getByText('Closed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  });

  it.each([
    ['ROUND_CLOSED', 409, 'This round is closed'],
    ['REGISTRATION_CANCELLED', 403, 'Your registration is cancelled'],
  ])('explains a save refused with %s', async (code, status, text) => {
    const session = asParticipant();
    mine([submission()]);
    server.use(http.put(`${P}/me/submissions/:id/entry`, () => apiError(status, code, 'No.')));
    renderPortal('/submissions', { session });
    await userEvent.type(await screen.findByLabelText('Repo link'), 'x');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(text);
  });

  it('lists the invalid answers', async () => {
    const session = asParticipant();
    mine([submission()]);
    server.use(
      http.put(`${P}/me/submissions/:id/entry`, () =>
        apiError(400, 'INVALID_ANSWERS', 'Some answers are not valid.', [
          { path: 'answers.f1', message: 'Repo link must be a URL' },
        ]),
      ),
    );
    renderPortal('/submissions', { session });
    await userEvent.type(await screen.findByLabelText('Repo link'), 'x');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Some answers are not valid.');
    expect(await screen.findAllByText('Repo link must be a URL')).not.toHaveLength(0);
  });

  it('shows a loading error', async () => {
    const session = asParticipant();
    server.use(
      http.get(`${P}/me/submissions`, () => apiError(500, 'INTERNAL', 'Submissions trouble.')),
    );
    renderPortal('/submissions', { session });
    expect(await screen.findByRole('alert')).toHaveTextContent('Submissions trouble.');
  });
});

describe('submissions for judges and admins', () => {
  const adminSub = {
    id: 's1',
    round: { id: 'rd1', name: 'Round 1', phase: 'released' },
    title: 'Project',
    description: '',
    position: 0,
    fields: [field()],
    entryCount: 1,
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
  };

  it('lists each submission with its teams’ answers', async () => {
    const session = asStaff('judge');
    server.use(
      http.get(`${E}/submissions`, () => HttpResponse.json([adminSub])),
      http.get(`${E}/submissions/s1/entries`, () =>
        HttpResponse.json([
          {
            id: 'e1',
            submissionId: 's1',
            team: { id: 't1', name: 'Byte Club' },
            answers: { f1: 'https://git.test/x' },
            submittedBy: null,
            createdAt: '2026-10-20T10:00:00.000Z',
            updatedAt: '2026-10-20T10:00:00.000Z',
          },
        ]),
      ),
    );
    renderPortal('/submissions', { session });
    expect(await screen.findByText('Project')).toBeInTheDocument();
    expect(await screen.findByText('Byte Club')).toBeInTheDocument();
    expect(screen.getByText('https://git.test/x')).toBeInTheDocument();
    expect(screen.getByText('Round 1 · 1 entry')).toBeInTheDocument();
  });

  it('shows empty states and errors', async () => {
    const session = asStaff('admin');
    server.use(
      http.get(`${E}/submissions`, () => HttpResponse.json([{ ...adminSub, entryCount: 0 }])),
      http.get(`${E}/submissions/s1/entries`, () => HttpResponse.json([])),
    );
    const first = renderPortal('/submissions', { session });
    expect(await screen.findByText('No entries yet.')).toBeInTheDocument();
    first.unmount();
    server.use(http.get(`${E}/submissions`, () => HttpResponse.json([])));
    const second = renderPortal('/submissions', { session });
    expect(await screen.findByText('No submissions yet')).toBeInTheDocument();
    second.unmount();
    server.use(http.get(`${E}/submissions`, () => apiError(500, 'INTERNAL', 'Staff trouble.')));
    renderPortal('/submissions', { session });
    expect(await screen.findByRole('alert')).toHaveTextContent('Staff trouble.');
  });

  it('keeps volunteers out of the nav and the page', async () => {
    renderPortal('/submissions', { session: asStaff('volunteer') });
    expect(await screen.findByText(/Your role can't use this page/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Submissions' })).not.toBeInTheDocument();
  });
});
