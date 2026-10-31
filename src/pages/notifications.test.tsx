import type { Schemas } from '@eventkit/sdk';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { asParticipant, asStaff, notification } from '@/test/fixtures';
import { renderPortal } from '@/test/render';
import { apiError, E, P, server } from '@/test/server';

const channel = (id: string, name: string, canSend: boolean): Schemas['Channel'] => ({
  id,
  name,
  audience: ['admin', 'volunteer', 'judge', 'participant'],
  canSend,
  createdAt: '2026-10-20T10:00:00.000Z',
});

describe('notifications', () => {
  it('asks visitors to open their link or sign in', async () => {
    renderPortal('/notifications');
    expect(
      await screen.findByText(/Open your personal link to see notifications/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /sign in/i })).not.toBeInTheDocument();
  });

  it('shows a participant their feed', async () => {
    const session = asParticipant();
    server.use(
      http.get(`${P}/me/notifications`, () =>
        HttpResponse.json([notification({ priority: 'urgent', body: 'Line one\nLine two' })]),
      ),
    );
    renderPortal('/notifications', { session });
    const feed = await screen.findByRole('region', { name: 'Notifications' });
    expect(await within(feed).findByText('Judging starts at 4')).toBeInTheDocument();
    expect(within(feed).getByRole('tab', { name: /Urgent/ })).toBeInTheDocument();
    expect(within(feed).getByRole('tabpanel')).toHaveTextContent(/Urgent/);
    expect(within(feed).getByText('Everyone')).toBeInTheDocument();
    expect(within(feed).getByText('Organiser')).toBeInTheDocument();
    expect(within(feed).getByText(/ago\)$|just now\)$/)).toBeInTheDocument();
  });

  it('filters the feed to urgent ones, or to a channel picked from a menu', async () => {
    const session = asParticipant();
    server.use(
      http.get(`${P}/me/notifications`, () =>
        HttpResponse.json([
          notification({ id: 'n1', title: 'Lunch is served' }),
          notification({
            id: 'n2',
            title: 'Judging starts at 4',
            priority: 'urgent',
            channel: { id: 'c2', name: 'Judges' },
          }),
        ]),
      ),
    );
    renderPortal('/notifications', { session });
    const feed = await screen.findByRole('region', { name: 'Notifications' });
    expect(await within(feed).findByRole('tab', { name: /All\s*2/ })).toBeInTheDocument();

    await userEvent.click(within(feed).getByRole('tab', { name: 'Urgent' }));
    const urgent = within(feed).getByRole('tabpanel');
    expect(within(urgent).getByText('Judging starts at 4')).toBeInTheDocument();
    expect(within(urgent).queryByText('Lunch is served')).not.toBeInTheDocument();

    await userEvent.click(within(feed).getByRole('button', { name: 'Channels' }));
    await userEvent.click(await screen.findByRole('menuitemradio', { name: /Everyone/ }));
    expect(within(feed).getByRole('button', { name: 'Everyone' })).toBeInTheDocument();
    const channel = within(feed).getByRole('tabpanel');
    expect(within(channel).getByText('Lunch is served')).toBeInTheDocument();
    expect(within(channel).queryByText('Judging starts at 4')).not.toBeInTheDocument();
    expect(within(feed).getByRole('tab', { name: 'Urgent' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('lets staff send to the channels they may use', async () => {
    let sent: { channelId: string; body: unknown } | undefined;
    let feed = [notification()];
    server.use(
      http.get(`${E}/notifications`, () => HttpResponse.json(feed)),
      http.get(`${E}/channels`, () =>
        HttpResponse.json([
          channel('c1', 'Everyone', true),
          channel('c2', 'Volunteers', true),
          channel('c3', 'Judges', false),
        ]),
      ),
      http.post(`${E}/channels/:channelId/notifications`, async ({ request, params }) => {
        sent = { channelId: String(params.channelId), body: await request.json() };
        feed = [notification({ id: 'n2', title: 'Doors open' }), ...feed];
        return HttpResponse.json(feed[0], { status: 201 });
      }),
    );
    renderPortal('/notifications', { session: asStaff('volunteer') });
    const select = await screen.findByLabelText('Channel');
    expect(within(select).queryByRole('option', { name: 'Judges' })).not.toBeInTheDocument();
    await userEvent.selectOptions(select, 'c2');
    await userEvent.type(screen.getByLabelText('Title'), 'Doors open');
    await userEvent.type(screen.getByLabelText('Message'), 'Gate 2 too.');
    await userEvent.click(screen.getByLabelText('Urgent (push to phones)'));
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Sent.');
    expect(sent).toEqual({
      channelId: 'c2',
      body: { title: 'Doors open', body: 'Gate 2 too.', priority: 'urgent' },
    });
    expect(screen.getByLabelText('Title')).toHaveValue('');
    expect(await screen.findByText('Doors open')).toBeInTheDocument();
  });

  it('shows staff a send that was refused, and an empty feed', async () => {
    server.use(
      http.get(`${E}/notifications`, () => HttpResponse.json([])),
      http.get(`${E}/channels`, () => HttpResponse.json([channel('c1', 'Everyone', true)])),
      http.post(`${E}/channels/:channelId/notifications`, () =>
        apiError(403, 'FORBIDDEN', 'You cannot send to this channel.'),
      ),
    );
    renderPortal('/notifications', { session: asStaff('judge') });
    expect(await screen.findByText('No notifications yet.')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Title'), 'Hi');
    await userEvent.type(screen.getByLabelText('Message'), 'There');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('You cannot send to this channel.');
  });

  it('shows an error loading the channels, without a send form', async () => {
    server.use(
      http.get(`${E}/notifications`, () => HttpResponse.json([])),
      http.get(`${E}/channels`, () => apiError(500, 'INTERNAL', 'Channel trouble.')),
    );
    renderPortal('/notifications', { session: asStaff('judge') });
    expect(await screen.findByRole('alert')).toHaveTextContent('Channel trouble.');
    expect(screen.queryByLabelText('Channel')).not.toBeInTheDocument();
  });
});
