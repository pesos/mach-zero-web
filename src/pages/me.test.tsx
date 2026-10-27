import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import {
  asParticipant,
  confirmWith,
  me,
  png,
  poll,
  proof,
  team,
  teamMember,
  uploadTicket,
} from '@/test/fixtures';
import { renderPortal } from '@/test/render';
import { apiError, P, portalEvent, portalInfo, server, token } from '@/test/server';

describe('opening a personal link', () => {
  it('swaps the token for a session and takes it out of the address', async () => {
    let sent: unknown;
    asParticipant();
    server.use(
      http.post(`${P}/access`, async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({
          session: {
            accessToken: token('participant', 'r1'),
            tokenType: 'Bearer',
            expiresIn: '14d',
          },
          me: me(),
        });
      }),
    );
    renderPortal('/me/ek_secret');
    expect(await screen.findByText('Asha')).toBeInTheDocument();
    expect(sent).toEqual({ token: 'ek_secret' });
    expect(window.location.pathname).toBe('/me');
    expect(window.localStorage.getItem('portal.session')).toBe(token('participant', 'r1'));
    expect(
      screen.getByText('Your QR code appears here once your team is confirmed.'),
    ).toBeInTheDocument();
  });

  it.each([
    ['LINK_NOT_FOUND', 404, /it was replaced with a new one/],
    ['ACCESS_EXPIRED', 410, /Access for this event has ended\./],
    ['INTERNAL', 500, /Could not open your link\./],
  ])('explains a link that fails with %s', async (code, status, text) => {
    server.use(http.post(`${P}/access`, () => apiError(status, code, 'No.')));
    renderPortal('/me/ek_old');
    expect(await screen.findByRole('alert')).toHaveTextContent(text);
  });

  it('needs a link when nobody is signed in', async () => {
    renderPortal('/me');
    expect(await screen.findByRole('alert')).toHaveTextContent(/it was replaced with a new one/);
  });

  it('shows an error loading the registration', async () => {
    const session = asParticipant();
    server.use(http.get(`${P}/me`, () => apiError(500, 'INTERNAL', 'Server trouble.')));
    renderPortal('/me', { session });
    expect(await screen.findByRole('alert')).toHaveTextContent('Server trouble.');
  });
});

describe('a member’s page', () => {
  it('shows the QR once confirmed, and RSVPs', async () => {
    let status: 'confirmed' | 'attending' = 'confirmed';
    const session = asParticipant();
    server.use(
      http.get(`${P}/me`, () => HttpResponse.json(me({ status }))),
      http.post(`${P}/me/rsvp`, () => {
        status = 'attending';
        return HttpResponse.json(me({ status }));
      }),
      http.post(`${P}/me/unrsvp`, () => {
        status = 'confirmed';
        return HttpResponse.json(me({ status }));
      }),
    );
    renderPortal('/me', { session });
    expect(await screen.findByTitle('Your check-in QR code')).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'I will attend' }));
    expect(await screen.findByText('Attending')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: "I can't attend after all" }));
    expect(await screen.findByRole('button', { name: 'I will attend' })).toBeInTheDocument();
  });

  it('shows an RSVP refusal', async () => {
    const session = asParticipant({ status: 'confirmed' });
    server.use(http.post(`${P}/me/rsvp`, () => apiError(409, 'EVENT_FULL', 'The event is full.')));
    renderPortal('/me', { session });
    await userEvent.click(await screen.findByRole('button', { name: 'I will attend' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The event is full.');
  });

  it('lists the team for a member who does not lead it', async () => {
    renderPortal('/me', { session: asParticipant({ linkLastUsedAt: '2026-10-21T10:00:00.000Z' }) });
    const card = (await screen.findByText('Your team')).closest('div')!.parentElement!;
    expect(await within(card).findByText(/Asha \(leader\) · PX-0001/)).toBeInTheDocument();
    expect(screen.getByText(/Last opened/)).toBeInTheDocument();
  });

  it('says a cancelled registration is cancelled and offers no cancel', async () => {
    renderPortal('/me', { session: asParticipant({ status: 'cancelled' }) });
    expect(await screen.findByText('This registration is cancelled.')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Cancel my registration/ }),
    ).not.toBeInTheDocument();
  });

  it('votes in polls and shows the leaderboard when it is public', async () => {
    let myVote: string | null = null;
    const session = asParticipant(
      {},
      {
        polls: [
          poll(),
          poll({
            id: 'poll2',
            question: 'Venue?',
            closed: true,
            canVote: false,
            totalVotes: 3,
            options: [{ id: 'o3', label: 'Hall', position: 0, votes: 3 }],
          }),
          poll({
            id: 'poll3',
            question: 'Snacks?',
            closesAt: '2026-10-31T10:00:00.000Z',
            options: [],
          }),
        ],
      },
    );
    server.use(
      http.get(P, () =>
        HttpResponse.json(portalInfo({ event: { ...portalEvent, leaderboardVisible: true } })),
      ),
      http.get(`${P}/me/polls`, () =>
        HttpResponse.json([
          poll({ myVote }),
          poll({
            id: 'poll2',
            question: 'Venue?',
            closed: true,
            canVote: false,
            totalVotes: 3,
            options: [{ id: 'o3', label: 'Hall', position: 0, votes: 3 }],
          }),
          poll({
            id: 'poll3',
            question: 'Snacks?',
            closesAt: '2026-10-31T10:00:00.000Z',
            options: [],
          }),
        ]),
      ),
      http.put(`${P}/me/polls/:pollId/vote`, async ({ request }) => {
        myVote = ((await request.json()) as { optionId: string }).optionId;
        return new HttpResponse(null, { status: 204 });
      }),
      http.get(`${P}/me/leaderboard`, () =>
        HttpResponse.json({
          visibleToEveryone: true,
          entries: [
            {
              rank: 1,
              team: { id: 't1', name: 'Byte Club' },
              total: 18,
              maxTotal: 20,
              judges: 2,
              criteria: [],
            },
          ],
        }),
      ),
    );
    renderPortal('/me', { session });
    expect(await screen.findByText('Venue? (closed)')).toBeInTheDocument();
    expect(screen.getByText(/Snacks\? · closes/)).toBeInTheDocument();
    expect(screen.getByText('· 3')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Non-veg' }));
    expect(await screen.findByRole('radio', { name: 'Non-veg' })).toBeChecked();
    expect(myVote).toBe('o2');
    expect(await screen.findByText('1. Byte Club · 18 / 20')).toBeInTheDocument();
    expect(session).toBeTruthy();
  });

  it('replaces a leaked link', async () => {
    const session = asParticipant();
    server.use(
      http.post(`${P}/me/access/reset`, () =>
        HttpResponse.json({
          link: { token: 'ek_new', url: 'https://portal.test/me/ek_new' },
          session: {
            accessToken: token('participant', 'r1'),
            tokenType: 'Bearer',
            expiresIn: '14d',
          },
        }),
      ),
    );
    const confirm = confirmWith(false);
    renderPortal('/me', { session });
    const button = await screen.findByRole('button', { name: 'My link leaked: give me a new one' });
    await userEvent.click(button);
    expect(screen.queryByText(/Your new link/)).not.toBeInTheDocument();
    confirm.mockReturnValue(true);
    await userEvent.click(button);
    expect(await screen.findByText(/Your new link\. Save it/)).toBeInTheDocument();
    expect(screen.getByText('https://portal.test/me/ek_new')).toBeInTheDocument();
  });

  it('cancels only after the email or phone is confirmed', async () => {
    let status: 'registered' | 'cancelled' = 'registered';
    const session = asParticipant();
    server.use(
      http.get(`${P}/me`, () => HttpResponse.json(me({ status }))),
      http.post(`${P}/me/cancel`, async ({ request }) => {
        const sent = (await request.json()) as { confirm: string };
        if (sent.confirm === 'asha@example.com') status = 'cancelled';
        return status === 'cancelled'
          ? HttpResponse.json(me({ status }))
          : apiError(
              403,
              'CONFIRMATION_MISMATCH',
              'That is not the email or phone you registered with.',
            );
      }),
    );
    renderPortal('/me', { session });
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel my registration' }));
    expect(screen.getByText(/This cancels only your registration\./)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Keep it' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel my registration' }));
    const input = screen.getByLabelText('Email or phone to confirm');
    await userEvent.type(input, 'wrong@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel registration' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('That is not the email or phone');
    await userEvent.clear(input);
    await userEvent.type(input, 'asha@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel registration' }));
    expect(await screen.findByText('This registration is cancelled.')).toBeInTheDocument();
  });
});

describe('the team leader’s page', () => {
  const leader = { isLeader: true };

  it('shows contacts and link activity, and gives a member a new link', async () => {
    let asked = '';
    const session = asParticipant(leader);
    server.use(
      http.post(`${P}/me/team/members/:registrationId/reissue-link`, ({ params }) => {
        asked = String(params.registrationId);
        return HttpResponse.json({ token: 'ek_ravi2', url: null });
      }),
    );
    confirmWith(true);
    renderPortal('/me', { session });
    expect(await screen.findByText('You lead this team.')).toBeInTheDocument();
    expect(
      screen.getByText(/ravi@example.com · \+91 98450 00000 · link last opened/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/asha@example.com · \+91 98450 00000 · link never opened/),
    ).toBeInTheDocument();
    expect(screen.getByText('₹400 for the team.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'New link' }));
    expect(await screen.findByText('New link for Ravi: send it to them.')).toBeInTheDocument();
    expect(screen.getByText('ek_ravi2')).toBeInTheDocument();
    expect(asked).toBe('r2');
    expect(
      screen.getByRole('button', { name: 'Cancel the team’s registration' }),
    ).toBeInTheDocument();
  });

  it('uploads a new receipt after a rejection', async () => {
    let proofs = [proof('rejected', 'Blurry')];
    const session = asParticipant(leader);
    server.use(
      http.get(`${P}/me/team`, () =>
        HttpResponse.json(
          team({ payment: { ...team().payment, deadline: '2026-10-29T00:00:00.000Z', proofs } }),
        ),
      ),
      http.post(`${P}/me/uploads`, () =>
        HttpResponse.json(uploadTicket('events/e/receipt/k2.png'), { status: 201 }),
      ),
      http.post(`${P}/me/team/payment-proofs`, () => {
        proofs = [proof('pending'), ...proofs];
        return HttpResponse.json(proofs[0], { status: 201 });
      }),
    );
    renderPortal('/me', { session });
    expect(await screen.findByText(/rejected \(Blurry\)/)).toBeInTheDocument();
    expect(screen.getByText(/₹400 for the team, by/)).toBeInTheDocument();
    await userEvent.upload(screen.getByLabelText('Upload a new receipt'), png());
    expect(await screen.findByText(/: pending/)).toBeInTheDocument();
    // A receipt under review can't be replaced.
    expect(screen.queryByLabelText(/receipt/)).not.toBeInTheDocument();
  });

  it('shows how to pay above the receipt upload', async () => {
    server.use(
      http.get(P, () =>
        HttpResponse.json(
          portalInfo({
            event: { ...portalEvent, paymentInstructions: 'UPI: club@upi' },
            paymentInstructionsUrl: 'https://bucket.test/events/e/payment-instructions/i.png?sig=1',
          }),
        ),
      ),
    );
    renderPortal('/me', { session: asParticipant(leader) });
    const how = await screen.findByLabelText('How to pay');
    expect(within(how).getByText('UPI: club@upi')).toBeInTheDocument();
    expect(within(how).getByRole('img', { name: 'Payment instructions' })).toBeInTheDocument();
    expect(screen.getByLabelText('Upload the payment receipt')).toBeInTheDocument();
  });

  it('shows a refused receipt upload', async () => {
    const session = asParticipant(leader);
    server.use(
      http.post(`${P}/me/uploads`, () => apiError(409, 'PAYMENT_CLOSED', 'Payments are closed.')),
    );
    renderPortal('/me', { session });
    await userEvent.upload(await screen.findByLabelText('Upload the payment receipt'), png());
    expect(await screen.findByRole('alert')).toHaveTextContent('Payments are closed.');
  });

  it('hands the team to another member', async () => {
    let sent: unknown;
    const session = asParticipant(leader, {
      team: team({
        payment: { mode: 'none', amountDue: null, currency: null, deadline: null, proofs: [] },
        members: [
          teamMember('r1', 'Asha', { isLeader: true }),
          teamMember('r2', 'Ravi'),
          teamMember('r3', 'Gone', { status: 'cancelled' }),
        ],
      }),
    });
    server.use(
      http.post(`${P}/me/team/leader`, async ({ request }) => {
        sent = await request.json();
        return apiError(403, 'CONFIRMATION_MISMATCH', 'That is not your email or phone.');
      }),
    );
    renderPortal('/me', { session });
    const select = await screen.findByRole('combobox', { name: 'New leader' });
    expect(screen.queryByText('Payment')).not.toBeInTheDocument();
    expect(within(select).queryByRole('option', { name: 'Gone' })).not.toBeInTheDocument();
    const submit = screen.getByRole('button', { name: 'Hand over' });
    expect(submit).toBeDisabled();
    await userEvent.selectOptions(select, 'r2');
    await userEvent.type(
      screen.getByLabelText('Your email or phone, to confirm'),
      'asha@example.com',
    );
    await userEvent.click(submit);
    expect(await screen.findByRole('alert')).toHaveTextContent('That is not your email or phone.');
    expect(sent).toEqual({ registrationId: 'r2', confirm: 'asha@example.com' });
  });

  it('shows an error loading the team', async () => {
    const session = asParticipant(leader);
    server.use(http.get(`${P}/me/team`, () => apiError(500, 'INTERNAL', 'Team trouble.')));
    renderPortal('/me', { session });
    expect(await screen.findByRole('alert')).toHaveTextContent('Team trouble.');
  });
});
