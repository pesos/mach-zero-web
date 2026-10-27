import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { asParticipant, asStaff } from '@/test/fixtures';
import { renderPortal } from '@/test/render';
import { apiError, E, P, portalEvent, portalInfo, server } from '@/test/server';

describe('the event home page', () => {
  it('describes the event and says how to register while registration is open', async () => {
    renderPortal('/');
    expect(await screen.findByRole('heading', { name: 'PESOS X Silicon' })).toBeInTheDocument();
    expect(screen.getByText(/Teams of 2–3 · ₹200 per person · 42 places left/)).toBeInTheDocument();
    expect(screen.getByText(/Registration is open until/)).toBeInTheDocument();
    expect(screen.getByText(/Registered already\? Open the personal link/)).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Portal' });
    expect(within(nav).getByRole('link', { name: 'Staff sign in' })).toHaveAttribute(
      'href',
      '/login',
    );
  });

  it('shows the event days, the about text, highlights and the two-day schedule', async () => {
    renderPortal('/');
    expect(await screen.findByText(/Sat, 31 Oct & Sun, 1 Nov/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'About' })).toBeInTheDocument();
    expect(screen.getByText(/two-day open-source contribution spree/)).toBeInTheDocument();
    expect(
      within(screen.getByRole('list', { name: 'At a glance' })).getAllByRole('listitem'),
    ).toHaveLength(4);
    const day1 = screen.getByRole('region', { name: 'Day 1' });
    expect(within(day1).getByText('Round 1')).toBeInTheDocument();
    expect(within(day1).getByRole('heading', { name: 'Day 1 · Sat, 31 Oct' })).toBeInTheDocument();
    const day2 = screen.getByRole('region', { name: 'Day 2' });
    expect(within(day2).getByText('Winners announced, event close')).toBeInTheDocument();
    expect(screen.getByText(/At least two CSE students per team/)).toBeInTheDocument();
  });

  it('says when registration runs if it is closed, and leaves out a missing fee', async () => {
    server.use(
      http.get(P, () =>
        HttpResponse.json(
          portalInfo({ registrationOpen: false, event: { ...portalEvent, registrationFee: null } }),
        ),
      ),
    );
    renderPortal('/');
    expect(await screen.findByText(/Registration is not open\. It runs/)).toBeInTheDocument();
    expect(screen.queryByText(/per person/)).not.toBeInTheDocument();
  });

  it('links a participant to their registration', async () => {
    renderPortal('/', { session: asParticipant() });
    const main = await screen.findByRole('main');
    expect(
      await within(main).findByRole('link', { name: 'Open your registration' }),
    ).toHaveAttribute('href', '/me');
    const nav = screen.getByRole('navigation', { name: 'Portal' });
    expect(within(nav).getByRole('link', { name: 'My registration' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Notifications' })).toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Scan' })).not.toBeInTheDocument();
  });

  it('shows staff the tools for their role and signs them out', async () => {
    renderPortal('/', { session: asStaff('admin') });
    const nav = await screen.findByRole('navigation', { name: 'Portal' });
    expect(await within(nav).findByRole('link', { name: 'Scan' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Judge' })).toBeInTheDocument();
    await userEvent.click(within(nav).getByRole('button', { name: 'Sign out' }));
    // The portal's settings survive signing out: the page is still there.
    const visitorNav = await screen.findByRole('navigation', { name: 'Portal' });
    expect(within(visitorNav).getByRole('link', { name: 'Staff sign in' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'PESOS X Silicon' })).toBeInTheDocument();
    expect(window.localStorage.getItem('portal.session')).toBeNull();
  });

  it('folds the sections behind a menu button on phones', async () => {
    server.use(http.get(`${E}/checkpoints`, () => HttpResponse.json([])));
    renderPortal('/scan', { session: asStaff('volunteer') });
    const menu = await screen.findByRole('button', { name: 'Menu: Scan' });
    expect(menu).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(menu);
    expect(menu).toHaveAttribute('aria-expanded', 'true');
    await userEvent.keyboard('{Escape}');
    expect(menu).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(menu);
    await userEvent.click(screen.getByRole('link', { name: 'Notifications' }));
    expect(await screen.findByRole('button', { name: 'Menu: Notifications' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.queryByRole('button', { name: /^Menu/ })).toBeInTheDocument();
  });

  it('shows the error when the portal cannot load', async () => {
    server.use(http.get(P, () => apiError(401, 'INVALID_API_KEY', 'This API key is not valid.')));
    renderPortal('/');
    expect(await screen.findByRole('alert')).toHaveTextContent('This API key is not valid.');
  });

  it('serves the pages on custom paths set in the console', async () => {
    const custom = {
      register: '/join/{token}',
      staff: '/crew/{token}',
      me: '/{token}',
      notifications: '/news',
    };
    server.use(
      http.get(P, () => HttpResponse.json(portalInfo({ paths: custom }))),
      http.get(`${P}/links/:token`, () =>
        apiError(404, 'LINK_NOT_FOUND', 'This link does not exist.'),
      ),
    );
    renderPortal('/join/abc');
    expect(await screen.findByRole('alert')).toHaveTextContent('This link does not exist.');
  });

  it('has a not-found page', async () => {
    renderPortal('/nowhere');
    expect(await screen.findByText('This page does not exist.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the event' })).toHaveAttribute('href', '/');
  });
});
