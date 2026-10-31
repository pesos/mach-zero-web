import type { Schemas } from '@eventkit/sdk';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { asParticipant, asStaff } from '@/test/fixtures';
import { renderPortal } from '@/test/render';
import { E, P, server } from '@/test/server';

const field = {
  id: 'f1',
  label: 'Repo link',
  help: null,
  type: 'short_text' as const,
  options: [],
  required: true,
  unique: false,
  pattern: null,
  position: 0,
};

const round1 = { id: 'rd1', name: 'Round 1', phase: 'released' as const };
const round2 = { id: 'rd2', name: 'Round 2', phase: 'released' as const };

const mine = (
  id: string,
  title: string,
  round: typeof round1,
  open: boolean,
): Schemas['PortalSubmission'] => ({
  id,
  round,
  title,
  description: '',
  position: 0,
  deadline: null,
  fields: [field],
  open,
  entry: null,
});

describe('submission tabs', () => {
  it('shows all, only the open ones, or one round picked from a menu', async () => {
    const session = asParticipant();
    server.use(
      http.get(`${P}/me/submissions`, () =>
        HttpResponse.json([
          mine('s1', 'Pitch deck', round1, false),
          mine('s2', 'Repo link', round2, true),
        ]),
      ),
    );
    renderPortal('/submissions', { session });
    expect(await screen.findByRole('tab', { name: /All\s*2/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Round 1' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Open' }));
    let panel = screen.getByRole('tabpanel');
    expect(
      within(panel).getByText('Repo link', { selector: '[data-slot=card-title]' }),
    ).toBeInTheDocument();
    expect(within(panel).queryByText('Pitch deck')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Rounds' }));
    await userEvent.click(await screen.findByRole('menuitemradio', { name: /Round 1/ }));
    expect(screen.getByRole('button', { name: 'Round 1' })).toBeInTheDocument();
    panel = screen.getByRole('tabpanel');
    expect(within(panel).getByText('Pitch deck')).toBeInTheDocument();
    expect(
      within(panel).queryByText('Repo link', { selector: '[data-slot=card-title]' }),
    ).not.toBeInTheDocument();
  });

  it('gives staff all submissions or one round, with no open filter', async () => {
    const session = asStaff('judge');
    const staffSub = (id: string, title: string, round: typeof round1) => ({
      id,
      round,
      title,
      description: '',
      position: 0,
      deadline: null,
      fields: [field],
      entryCount: 0,
      createdAt: '2026-10-20T10:00:00.000Z',
      updatedAt: '2026-10-20T10:00:00.000Z',
    });
    server.use(
      http.get(`${E}/submissions`, () =>
        HttpResponse.json([staffSub('s1', 'Pitch deck', round1), staffSub('s2', 'Demo', round2)]),
      ),
      http.get(`${E}/submissions/:id/entries`, () => HttpResponse.json([])),
    );
    renderPortal('/submissions', { session });
    expect(await screen.findByRole('tab', { name: /All\s*2/ })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Open' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Rounds' }));
    await userEvent.click(await screen.findByRole('menuitemradio', { name: /Round 2/ }));
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByText('Demo')).toBeInTheDocument();
    expect(within(panel).queryByText('Pitch deck')).not.toBeInTheDocument();
  });
});
