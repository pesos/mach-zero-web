import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { asStaff } from '@/test/fixtures';
import { renderPortal } from '@/test/render';
import { apiError, E, P, server, token } from '@/test/server';

const staffLink = (role: 'volunteer' | 'judge') =>
  http.get(`${P}/links/:token`, () =>
    HttpResponse.json({
      kind: 'staff',
      role,
      label: null,
      requiresPassword: true,
      expiresAt: null,
    }),
  );

const signedIn = (role: 'admin' | 'volunteer' | 'judge') => ({
  user: {
    id: `user-${role}`,
    email: 'v@example.com',
    name: 'Vik',
    phone: null,
    createdAt: '2026-10-01T00:00:00.000Z',
  },
  role,
  token: {
    accessToken: token(role === 'admin' ? 'client' : 'staff', `user-${role}`),
    tokenType: 'Bearer',
    expiresIn: '7d',
  },
});

describe('staff sign-up through a staff link', () => {
  it('creates the account with the link password and opens the scanner', async () => {
    let sent: unknown;
    server.use(
      staffLink('volunteer'),
      http.post(`${P}/staff/signup`, async ({ request }) => {
        sent = await request.json();
        asStaff('volunteer');
        server.use(http.get(`${E}/checkpoints`, () => HttpResponse.json([])));
        return HttpResponse.json(signedIn('volunteer'), { status: 201 });
      }),
    );
    renderPortal('/staff/staff-token');
    expect(await screen.findByRole('heading', { name: 'Join as a volunteer' })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Link password (from the organiser)'), 'gate-pass');
    await userEvent.type(screen.getByLabelText('Your name'), 'Vik');
    await userEvent.type(screen.getByLabelText('Email'), 'v@example.com');
    await userEvent.type(screen.getByLabelText('Choose a password (8+ characters)'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByLabelText('Checkpoint')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/scan');
    expect(sent).toEqual({
      linkToken: 'staff-token',
      linkPassword: 'gate-pass',
      name: 'Vik',
      email: 'v@example.com',
      password: 'password123',
    });
  });

  it('shows why sign-up was refused', async () => {
    server.use(
      staffLink('judge'),
      http.post(`${P}/staff/signup`, () =>
        apiError(403, 'WRONG_PASSWORD', 'The link password is wrong.'),
      ),
    );
    renderPortal('/staff/staff-token');
    expect(await screen.findByRole('heading', { name: 'Join as a judge' })).toBeInTheDocument();
    for (const label of ['Link password (from the organiser)', 'Your name', 'Email']) {
      await userEvent.type(screen.getByLabelText(label), label === 'Email' ? 'j@example.com' : 'x');
    }
    await userEvent.type(screen.getByLabelText('Choose a password (8+ characters)'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The link password is wrong.');
  });

  it('refuses a registration link and a dead link', async () => {
    server.use(
      http.get(`${P}/links/:token`, ({ params }) =>
        params.token === 'reg'
          ? HttpResponse.json({
              kind: 'registration',
              role: 'participant',
              label: null,
              requiresPassword: false,
              expiresAt: null,
            })
          : apiError(404, 'LINK_NOT_FOUND', 'This link does not exist.'),
      ),
    );
    const first = renderPortal('/staff/reg');
    expect(await screen.findByRole('alert')).toHaveTextContent('This is not a staff link.');
    first.unmount();
    renderPortal('/staff/gone');
    expect(await screen.findByRole('alert')).toHaveTextContent('This link does not exist.');
  });
});

describe('staff sign-in', () => {
  it('sends a judge to judging', async () => {
    server.use(
      http.post(`${P}/login`, () => {
        asStaff('judge');
        server.use(
          http.get(`${E}/criteria`, () => HttpResponse.json([])),
          http.get(`${E}/judging/teams`, () => HttpResponse.json([])),
        );
        return HttpResponse.json(signedIn('judge'));
      }),
    );
    renderPortal('/login');
    await userEvent.type(await screen.findByLabelText('Email'), 'j@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(
      await screen.findByText('The organisers have not set the rubric yet.'),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe('/judge');
  });

  it('shows a wrong password', async () => {
    server.use(
      http.post(`${P}/login`, () =>
        apiError(401, 'INVALID_CREDENTIALS', 'Wrong email or password.'),
      ),
    );
    renderPortal('/login');
    await userEvent.type(await screen.findByLabelText('Email'), 'j@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'nope-nope');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong email or password.');
  });
});

describe('staff-only pages', () => {
  it('ask anyone else to sign in', async () => {
    renderPortal('/scan');
    expect(await screen.findByText(/This page is for the event's staff\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
  });

  it("tell staff when their role can't use the page", async () => {
    renderPortal('/judge', { session: asStaff('volunteer') });
    expect(await screen.findByText("Your role can't use this page.")).toBeInTheDocument();
  });
});
