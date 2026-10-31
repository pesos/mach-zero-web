import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { asParticipant, asStaff, me, team, teamMember } from '@/test/fixtures';
import { renderPortal } from '@/test/render';
import { apiError, P, server, token } from '@/test/server';

describe('settings', () => {
  it('asks visitors to open their link', async () => {
    renderPortal('/settings');
    expect(
      await screen.findByText(/Open your personal link to see your settings/),
    ).toBeInTheDocument();
  });

  it('is not in the menu for staff', async () => {
    renderPortal('/', { session: asStaff('admin') });
    const nav = await screen.findByRole('navigation', { name: 'Portal' });
    expect(within(nav).queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument();
  });

  it('is in the menu for participants, with the link card but no hand-over for a member', async () => {
    renderPortal('/', { session: asParticipant() });
    const nav = await screen.findByRole('navigation', { name: 'Portal' });
    await userEvent.click(within(nav).getByRole('link', { name: 'Settings' }));
    expect(await screen.findByText('Your personal link')).toBeInTheDocument();
    expect(screen.queryByText('Hand over team')).not.toBeInTheDocument();
  });

  it('has no hand-over for a leader with no one to hand to', async () => {
    const session = asParticipant(
      { isLeader: true },
      { team: team({ members: [teamMember('r1', 'Asha', { isLeader: true })] }) },
    );
    renderPortal('/settings', { session });
    expect(await screen.findByText('Your personal link')).toBeInTheDocument();
    expect(screen.queryByText('Hand over team')).not.toBeInTheDocument();
  });

  it('shows errors loading the registration and the team', async () => {
    server.use(http.get(`${P}/me`, () => apiError(500, 'INTERNAL', 'Server trouble.')));
    renderPortal('/settings', { session: token('participant', 'r1') });
    expect(await screen.findByRole('alert')).toHaveTextContent('Server trouble.');
  });

  it('shows an error loading the team for a leader', async () => {
    const session = asParticipant({ isLeader: true });
    server.use(http.get(`${P}/me/team`, () => apiError(500, 'INTERNAL', 'Team trouble.')));
    renderPortal('/settings', { session });
    expect(await screen.findByRole('alert')).toHaveTextContent('Team trouble.');
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
    renderPortal('/settings', { session });
    const button = await screen.findByRole('button', { name: 'My link leaked: give me a new one' });
    await userEvent.click(button);
    await userEvent.click(screen.getByRole('button', { name: 'Keep my link' }));
    expect(screen.queryByText(/Your new link/)).not.toBeInTheDocument();
    await userEvent.click(button);
    await userEvent.click(screen.getByRole('button', { name: 'Replace link' }));
    expect(await screen.findByText(/Your new link\. Save it/)).toBeInTheDocument();
    expect(screen.getByText('https://portal.test/me/ek_new')).toBeInTheDocument();
  });

  it('hands the team to another member', async () => {
    let sent: unknown;
    const session = asParticipant(
      { isLeader: true },
      {
        team: team({
          payment: { mode: 'none', amountDue: null, currency: null, deadline: null, proofs: [] },
          members: [
            teamMember('r1', 'Asha', { isLeader: true }),
            teamMember('r2', 'Ravi'),
            teamMember('r3', 'Gone', { status: 'cancelled' }),
          ],
        }),
      },
    );
    server.use(
      http.post(`${P}/me/team/leader`, async ({ request }) => {
        sent = await request.json();
        return apiError(403, 'CONFIRMATION_MISMATCH', 'That is not your email or phone.');
      }),
    );
    renderPortal('/settings', { session });
    const select = await screen.findByRole('combobox', { name: 'New leader' });
    expect(screen.queryByText('Payment')).not.toBeInTheDocument();
    expect(within(select).queryByRole('option', { name: 'Gone' })).not.toBeInTheDocument();
    const submit = screen.getByRole('button', { name: 'Hand over' });
    expect(submit).toBeDisabled();
    await userEvent.selectOptions(select, 'r2');
    await userEvent.type(screen.getByLabelText('Your email, to confirm'), 'asha@example.com');
    await userEvent.click(submit);
    expect(await screen.findByRole('alert')).toHaveTextContent('That is not your email or phone.');
    expect(sent).toEqual({ registrationId: 'r2', confirm: 'asha@example.com' });
  });

  it('cancels only after the email is confirmed', async () => {
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
    renderPortal('/settings', { session });
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel my registration' }));
    expect(screen.getByText(/This cancels only your registration\./)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Keep it' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel my registration' }));
    const input = screen.getByLabelText('Email to confirm');
    await userEvent.type(input, 'wrong@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel registration' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('That is not the email or phone');
    await userEvent.clear(input);
    await userEvent.type(input, 'asha@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel registration' }));
    await waitFor(() => expect(screen.queryByText('Cancel registration')).not.toBeInTheDocument());
  });

  it('offers the leader to cancel the whole team', async () => {
    renderPortal('/settings', { session: asParticipant({ isLeader: true }) });
    expect(
      await screen.findByRole('button', { name: 'Cancel the team’s registration' }),
    ).toBeInTheDocument();
  });

  it('offers no cancel once the registration is cancelled', async () => {
    renderPortal('/settings', { session: asParticipant({ status: 'cancelled' }) });
    expect(await screen.findByText('Your personal link')).toBeInTheDocument();
    expect(screen.queryByText('Cancel registration')).not.toBeInTheDocument();
  });
});
