import type { Schemas } from '@eventkit/sdk';
import { screen, waitFor, within } from '@testing-library/react';
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
  closesAt: null,
  fields: [field()],
  allowMultiple: false,
  open: true,
  canSubmit: true,
  eliminated: false,
  entry: null,
  responses: [],
  ...over,
});

const response = (over: Partial<Schemas['SubmissionEntry']> = {}): Schemas['SubmissionEntry'] => ({
  id: 'e1',
  submissionId: 's1',
  team: { id: 't1', name: 'Byte Club' },
  answers: { f1: 'https://git.test/old' },
  submittedBy: { registrationId: 'r1', name: 'Asha' },
  late: false,
  createdAt: '2026-10-20T10:00:00.000Z',
  updatedAt: '2026-10-20T10:00:00.000Z',
  ...over,
});

/** A team that has sent `responses` (newest first). */
const sent = (
  responses: Schemas['SubmissionEntry'][],
  over: Partial<Schemas['PortalSubmission']> = {},
) =>
  submission({
    responses,
    entry: responses[0] ?? null,
    canSubmit: over.allowMultiple ?? false,
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

  it('groups by round and submits a response once', async () => {
    const session = asParticipant();
    let body: unknown;
    mine([
      submission(),
      submission({
        id: 's2',
        title: 'Pitch',
        description: '',
        round: { id: 'rd2', name: 'Round 2', phase: 'released' },
      }),
    ]);
    server.use(
      http.post(`${P}/me/submissions/:id/responses`, async ({ request, params }) => {
        body = { id: params.id, ...((await request.json()) as object) };
        return HttpResponse.json({});
      }),
    );
    renderPortal('/submissions', { session });
    expect(await screen.findByRole('heading', { name: 'Round 1' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Round 2' })).toBeInTheDocument();
    expect(screen.getByText('Hand in your repo')).toBeInTheDocument();
    const round1 = screen.getByRole('region', { name: 'Round 1' });
    expect(within(round1).getByText(/submits once, and it can’t be edited/)).toBeInTheDocument();
    await userEvent.type(within(round1).getByLabelText('Repo link'), 'https://git.test/x');
    await userEvent.click(within(round1).getByRole('button', { name: 'Submit' }));
    expect(body).toEqual({ id: 's1', answers: { f1: 'https://git.test/x' } });
  });

  it('shows what the team submitted, and no form, once it has', async () => {
    const session = asParticipant();
    mine([sent([response({ late: true })], { deadline: '2026-10-20T09:00:00.000Z' })]);
    renderPortal('/submissions', { session });
    expect(await screen.findByText('Submitted')).toBeInTheDocument();
    expect(screen.getByText(/Submitted 20 Oct 2026, 3:30 pm IST/)).toBeInTheDocument();
    expect(screen.getByText('by Asha')).toBeInTheDocument();
    expect(screen.getByText('Late')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /git.test\/old/ })).toBeInTheDocument();
    expect(screen.queryByLabelText('Repo link')).not.toBeInTheDocument();
    expect(screen.getByText(/Ask the organisers to remove it/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Submit another/ })).not.toBeInTheDocument();
  });

  it('sends another response when the form allows more, keeping earlier ones', async () => {
    const session = asParticipant();
    let body: unknown;
    mine([
      sent(
        [
          response({ id: 'e2', answers: { f1: 'https://git.test/v2' } }),
          response({ id: 'e1', createdAt: '2026-10-20T09:00:00.000Z' }),
        ],
        { allowMultiple: true },
      ),
    ]);
    server.use(
      http.post(`${P}/me/submissions/:id/responses`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({});
      }),
    );
    renderPortal('/submissions', { session });
    await userEvent.click(await screen.findByRole('button', { name: 'Earlier responses (1)' }));
    expect(screen.getByRole('link', { name: /git.test\/old/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Submit another response' }));
    expect(screen.getByText(/can’t be edited, but your team can send another/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByLabelText('Repo link')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Submit another response' }));
    await userEvent.type(screen.getByLabelText('Repo link'), 'https://git.test/v3');
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Your team’s response is in.');
    expect(body).toEqual({ answers: { f1: 'https://git.test/v3' } });
  });

  it('takes checkbox, multiple-choice and date-time answers, and shows the deadline', async () => {
    const session = asParticipant();
    let body: unknown;
    mine([
      submission({
        deadline: '2026-01-02T12:30:00.000Z',
        closesAt: '2026-01-03T12:30:00.000Z',
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
      }),
    ]);
    server.use(
      http.post(`${P}/me/submissions/:id/responses`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({});
      }),
    );
    renderPortal('/submissions', { session });
    expect(await screen.findByText(/Deadline passed 2 Jan 2026, 6:00 pm IST/)).toBeInTheDocument();
    expect(
      screen.getByText(
        /you can still submit until 3 Jan 2026, 6:00 pm IST, but it will be marked late/,
      ),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Go' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'React' }));
    expect(screen.getByRole('group', { name: 'Track' })).toHaveAccessibleDescription(
      'Pick the closest one',
    );
    await userEvent.click(screen.getByRole('radio', { name: 'Web' }));
    await userEvent.type(screen.getByLabelText('Demo at (optional)'), '2026-10-31T15:00');
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() =>
      expect(body).toEqual({
        answers: { stack: ['Go', 'React'], track: 'Web', demo: '2026-10-31T15:00+05:30' },
      }),
    );
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
    for (const name of ['Submissions', 'Leaderboard']) {
      expect(screen.queryByRole('link', { name })).not.toBeInTheDocument();
    }
    expect(screen.getByRole('link', { name: 'Polls' })).toBeInTheDocument();
  });

  it('says so once the form is closed', async () => {
    const session = asParticipant();
    mine([submission({ open: false, canSubmit: false })]);
    renderPortal('/submissions', { session });
    expect(await screen.findByText('Closed: no more submissions.')).toBeInTheDocument();
    expect(screen.getByText('Closed')).toBeInTheDocument();
    expect(screen.queryByLabelText('Repo link')).not.toBeInTheDocument();
  });

  it('tells a team that didn’t go on to a round', async () => {
    const session = asParticipant();
    mine([submission({ open: false, canSubmit: false, eliminated: true })]);
    renderPortal('/submissions', { session });
    expect(await screen.findByText('Not in this round')).toBeInTheDocument();
    expect(screen.getByText(/didn’t go on to this round/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit' })).not.toBeInTheDocument();
  });

  it.each([
    ['TEAM_ELIMINATED', 409, 'didn’t go on to this round'],
    ['ROUND_CLOSED', 409, 'This round is closed'],
    ['SUBMISSION_CLOSED', 409, 'This submission has closed'],
    ['ALREADY_SUBMITTED', 409, 'already submitted'],
    ['REGISTRATION_CANCELLED', 403, 'Your registration is cancelled'],
  ])('explains a save refused with %s', async (code, status, text) => {
    const session = asParticipant();
    mine([submission()]);
    server.use(http.post(`${P}/me/submissions/:id/responses`, () => apiError(status, code, 'No.')));
    renderPortal('/submissions', { session });
    await userEvent.type(await screen.findByLabelText('Repo link'), 'x');
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(text);
  });

  it('lists the invalid answers', async () => {
    const session = asParticipant();
    mine([submission()]);
    server.use(
      http.post(`${P}/me/submissions/:id/responses`, () =>
        apiError(400, 'INVALID_ANSWERS', 'Some answers are not valid.', [
          { path: 'answers.f1', message: 'Repo link must be a URL' },
        ]),
      ),
    );
    renderPortal('/submissions', { session });
    await userEvent.type(await screen.findByLabelText('Repo link'), 'x');
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
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
      http.get(`${E}/submissions/s1/status`, () =>
        HttpResponse.json({
          submitted: [
            {
              team: { id: 't1', name: 'Byte Club' },
              responses: 1,
              lastAt: '2026-10-20T10:00:00.000Z',
            },
          ],
          pending: [{ id: 't2', name: 'Null Pointers' }],
        }),
      ),
    );
    renderPortal('/submissions', { session });
    expect(await screen.findByText('Project')).toBeInTheDocument();
    expect(screen.getByText('Round 1 · 1 response')).toBeInTheDocument();
    // Who still has to submit, so organisers can chase them.
    await userEvent.click(await screen.findByRole('button', { name: /1 yet to submit/ }));
    expect(
      within(screen.getByRole('list', { name: 'Yet to submit' })).getByText('Null Pointers'),
    ).toBeInTheDocument();
    // Collapsed: the team and its links at a glance; open it for the answers.
    const row = await screen.findByRole('button', { name: /Byte Club/ });
    expect(row).toHaveTextContent('git.test/x');
    await userEvent.click(row);
    const link = await screen.findByRole('link', { name: 'git.test/x' });
    expect(link).toHaveAttribute('href', 'https://git.test/x');
    expect(link).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: 'Judge this team' })).toHaveAttribute(
      'href',
      '/judge?team=t1',
    );
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search Project' }), 'nobody');
    expect(screen.getByText('No entry matches.')).toBeInTheDocument();
  });

  it('shows empty states and errors', async () => {
    const session = asStaff('admin');
    server.use(
      http.get(`${E}/submissions`, () => HttpResponse.json([{ ...adminSub, entryCount: 0 }])),
      http.get(`${E}/submissions/s1/entries`, () => HttpResponse.json([])),
      http.get(`${E}/submissions/s1/status`, () =>
        HttpResponse.json({ submitted: [], pending: [] }),
      ),
    );
    const first = renderPortal('/submissions', { session });
    expect(await screen.findByText('No team has submitted yet.')).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: /0 yet to submit/ }));
    expect(screen.getByText('Every team has submitted.')).toBeInTheDocument();
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
