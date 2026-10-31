import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { asParticipant, asStaff } from '@/test/fixtures';
import { renderPortal } from '@/test/render';
import { apiError, E, P, portalEvent, portalInfo, server } from '@/test/server';

describe('the event home page', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('describes the event and says how to register while registration is open', async () => {
    vi.stubEnv('VITE_REGISTER_URL', 'https://portal.test/register/reg-token');
    renderPortal('/');
    expect(await screen.findByRole('heading', { name: 'PESOS X Silicon' })).toBeInTheDocument();
    expect(screen.getByText(/Teams of 2–3 · ₹200 per person · 42 places left/)).toBeInTheDocument();
    expect(screen.getByText(/Registration is open until/)).toBeInTheDocument();
    expect(screen.queryByText(/Registered already/)).not.toBeInTheDocument();
    expect(screen.getByText('Registrations open')).toBeInTheDocument();
    const links = screen.getAllByRole('link', { name: /Register your team/ });
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link).toHaveAttribute('href', 'https://portal.test/register/reg-token');
      expect(link).not.toHaveAttribute('target');
    }
    expect(screen.getByRole('list', { name: 'Time left to register' })).toHaveTextContent(
      /\d\dd \d\dh/,
    );
    expect(screen.queryByText(/Attendance compensation/)).not.toBeInTheDocument();
    // Staff sign in is not offered to visitors: organisers share its address.
    expect(screen.queryByRole('navigation', { name: 'Portal' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /sign in/i })).not.toBeInTheDocument();
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
    expect(within(day2).getByText('Event wrap-up and winners')).toBeInTheDocument();
    expect(within(day2).getByText('Final presentations')).toBeInTheDocument();
    expect(screen.getByText('Day 1: 8:00 AM – 7:00 PM')).toBeInTheDocument();
    expect(screen.getByText('Day 2: 7:00 AM – 7:00 PM')).toBeInTheDocument();
    expect(screen.getByText(/At least two CSE students per team/)).toBeInTheDocument();
    const sponsors = screen.getByRole('region', { name: 'Sponsors' });
    expect(within(sponsors).getByRole('img', { name: 'CraftifAI' })).toBeInTheDocument();
    const partners = screen.getByRole('region', { name: 'Partners' });
    expect(
      within(partners)
        .getAllByRole('img')
        .map((i) => i.getAttribute('alt')),
    ).toEqual(['Absurd Industries', 'FOSS United']);
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
    expect(screen.getByText('Registrations closed')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Register your team/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Time left to register' })).not.toBeInTheDocument();
    expect(screen.queryByText(/per person/)).not.toBeInTheDocument();
  });

  it('hides the Register buttons when no registration link is set', async () => {
    vi.stubEnv('VITE_REGISTER_URL', '');
    renderPortal('/');
    expect(await screen.findByText('Registrations open')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Register your team/ })).not.toBeInTheDocument();
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
    expect(await screen.findByRole('heading', { name: 'PESOS X Silicon' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Portal' })).not.toBeInTheDocument();
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
    const page = await screen.findByRole('alert');
    expect(page).toHaveTextContent('Could not load the event');
    expect(page).toHaveTextContent('This API key is not valid.');
    server.use(http.get(P, () => HttpResponse.json(portalInfo())));
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'PESOS X Silicon' })).toBeInTheDocument();
  });

  it('shows an error page when a page breaks, and offers a retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const session = asParticipant();
    server.use(http.get(`${P}/me`, () => HttpResponse.json({})));
    renderPortal('/me', { session });
    const page = await screen.findByRole('alert');
    expect(within(page).getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
    expect(within(page).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
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
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByText('This page does not exist.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Back to the event' }));
    expect(await screen.findByRole('heading', { name: 'PESOS X Silicon' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
  });
});
