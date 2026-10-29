import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { asParticipant, asStaff, poll } from '@/test/fixtures';
import { renderPortal } from '@/test/render';
import { E, P, server } from '@/test/server';

const venue = poll({
  id: 'poll2',
  question: 'Venue?',
  closed: true,
  canVote: false,
  totalVotes: 4,
  options: [
    { id: 'o3', label: 'Hall', position: 0, votes: 3 },
    { id: 'o4', label: 'Lawn', position: 1, votes: 1 },
  ],
});

describe('polls', () => {
  it('asks visitors to open their link', async () => {
    renderPortal('/polls');
    expect(await screen.findByText(/Open your personal link to see polls/)).toBeInTheDocument();
  });

  it('lets a participant vote, change their vote and see results', async () => {
    let myVote: string | null = null;
    const snacks = poll({
      id: 'poll3',
      question: 'Snacks?',
      closesAt: '2026-10-31T10:00:00.000Z',
      options: [],
    });
    const session = asParticipant();
    server.use(
      http.get(`${P}/me/polls`, () => HttpResponse.json([venue, poll({ myVote }), snacks])),
      http.put(`${P}/me/polls/:pollId/vote`, async ({ request }) => {
        myVote = ((await request.json()) as { optionId: string }).optionId;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderPortal('/polls', { session });
    expect(await screen.findByRole('link', { name: 'Polls' })).toBeInTheDocument();
    const lunch = await screen.findByRole('radiogroup', { name: 'Lunch?' });
    await userEvent.click(within(lunch).getByRole('radio', { name: 'Non-veg' }));
    expect(await within(lunch).findByRole('radio', { name: 'Non-veg' })).toBeChecked();
    expect(myVote).toBe('o2');
    await userEvent.click(within(lunch).getByRole('radio', { name: 'Veg' }));
    expect(await within(lunch).findByRole('radio', { name: 'Veg' })).toBeChecked();
    expect(myVote).toBe('o1');

    const closed = screen.getByRole('radiogroup', { name: /Venue\?/ });
    expect(within(closed).getByRole('radio', { name: /Hall/ })).toBeDisabled();
    expect(within(closed).getByRole('radio', { name: /Hall/ })).toHaveTextContent('3 · 75%');
    expect(screen.getByText('4 votes · Voting has closed.')).toBeInTheDocument();
    expect(screen.getByText(/Closes .*You can change your vote until then/)).toBeInTheDocument();
    expect(screen.getByText('No options yet.')).toBeInTheDocument();
  });

  it('lets staff vote in polls for their role', async () => {
    let voted: { poll: string; option: string } | undefined;
    server.use(
      http.get(`${E}/polls`, () =>
        HttpResponse.json([
          venue,
          poll({ id: 'poll4', question: 'Volunteer shirt size?', audience: ['volunteer'] }),
        ]),
      ),
      http.put(`${E}/polls/:pollId/vote`, async ({ request, params }) => {
        const { optionId } = (await request.json()) as { optionId: string };
        voted = { poll: String(params.pollId), option: optionId };
        return HttpResponse.json(poll({ id: 'poll4', myVote: optionId }));
      }),
    );
    renderPortal('/polls', { session: asStaff('volunteer') });
    const shirts = await screen.findByRole('radiogroup', { name: 'Volunteer shirt size?' });
    // Open polls you can vote in come first.
    expect(screen.getAllByRole('radiogroup')[0]).toBe(shirts);
    await userEvent.click(within(shirts).getByRole('radio', { name: 'Veg' }));
    expect(voted).toEqual({ poll: 'poll4', option: 'o1' });
  });

  it('says when there are no polls', async () => {
    server.use(http.get(`${E}/polls`, () => HttpResponse.json([])));
    renderPortal('/polls', { session: asStaff('judge') });
    expect(await screen.findByText('No polls right now.')).toBeInTheDocument();
  });
});
