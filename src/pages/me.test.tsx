import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { asParticipant, me, png, proof, team, uploadTicket } from '@/test/fixtures';
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
    ['LINK_NOT_FOUND', 404, 'This link does not work any more', /It was replaced with a new one/],
    ['ACCESS_EXPIRED', 410, 'Access has ended', /Access for this event has ended\./],
    ['INTERNAL', 500, 'Could not open your link', /Check your connection and try again\./],
  ])('explains a link that fails with %s', async (code, status, title, text) => {
    server.use(http.post(`${P}/access`, () => apiError(status, code, 'No.')));
    renderPortal('/me/ek_old');
    const page = await screen.findByRole('alert');
    expect(within(page).getByRole('heading', { name: title })).toBeInTheDocument();
    expect(page).toHaveTextContent(text);
  });

  it('offers a way out of a dead link, and to try again', async () => {
    server.use(http.post(`${P}/access`, () => apiError(404, 'LINK_NOT_FOUND', 'No.')));
    renderPortal('/me/ek_old');
    expect(await screen.findByRole('link', { name: 'Go home' })).toHaveAttribute('href', '/');
  });

  it('reloads to try a link again after a network failure', async () => {
    const reload = vi.fn();
    const real = window.location;
    vi.spyOn(window, 'location', 'get').mockReturnValue(
      new Proxy({} as Location, {
        get: (_, k) => (k === 'reload' ? reload : Reflect.get(real, k)),
      }),
    );
    server.use(http.post(`${P}/access`, () => apiError(500, 'INTERNAL', 'No.')));
    renderPortal('/me/ek_old');
    await userEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(reload).toHaveBeenCalled();
  });

  it('needs a link when nobody is signed in', async () => {
    renderPortal('/me');
    expect(await screen.findByRole('alert')).toHaveTextContent(/It was replaced with a new one/);
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

  it('hides the RSVP buttons when RSVPs are off', async () => {
    renderPortal('/me', {
      session: asParticipant({ status: 'confirmed', rsvpEnabled: false }),
    });
    expect(await screen.findByTitle('Your check-in QR code')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'I will attend' })).not.toBeInTheDocument();
  });

  it('explains an RSVP the event has switched off', async () => {
    const session = asParticipant({ status: 'confirmed' });
    server.use(http.post(`${P}/me/rsvp`, () => apiError(409, 'RSVP_DISABLED', 'Off.')));
    renderPortal('/me', { session });
    await userEvent.click(await screen.findByRole('button', { name: 'I will attend' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('RSVPs are off for this event');
  });

  it('shows an RSVP refusal', async () => {
    const session = asParticipant({ status: 'confirmed' });
    server.use(http.post(`${P}/me/rsvp`, () => apiError(409, 'EVENT_FULL', 'The event is full.')));
    renderPortal('/me', { session });
    await userEvent.click(await screen.findByRole('button', { name: 'I will attend' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The event is full.');
  });

  it('lists the team, with its status, above the member’s own card', async () => {
    renderPortal('/me', { session: asParticipant() });
    const asha = (await screen.findByText('PX-0001', { selector: 'li span' })).closest('li')!;
    expect(within(asha).getByText('Leader')).toBeInTheDocument();
    const card = asha.closest<HTMLElement>('[data-slot="card"]')!;
    expect(within(card).getByText('Registered')).toBeInTheDocument();
    expect(card).toHaveTextContent(/^Team Byte Club/);
    // Team first, then the member's own registration; cancelling lives in settings.
    const own = screen.getByText(/Participant ID/).closest('[data-slot="card"]')!;
    expect(card.compareDocumentPosition(own) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: /Cancel my registration/ }),
    ).not.toBeInTheDocument();
  });

  it('says a cancelled registration is cancelled and offers no cancel', async () => {
    renderPortal('/me', { session: asParticipant({ status: 'cancelled' }) });
    expect(await screen.findByText('This registration is cancelled.')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Cancel my registration/ }),
    ).not.toBeInTheDocument();
  });
});

describe('the team leader’s page', () => {
  const leader = { isLeader: true };

  it('shows contacts and link activity, and emails a member a new link', async () => {
    let asked = '';
    const session = asParticipant(leader);
    server.use(
      http.post(`${P}/me/team/members/:registrationId/reissue-link`, ({ params }) => {
        asked = String(params.registrationId);
        return HttpResponse.json({ sent: true });
      }),
    );
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
    const dialog = screen.getByRole('alertdialog', { name: 'Make a new link for Ravi?' });
    expect(dialog).toHaveTextContent(
      "Their old link stops working. The new link is emailed to them; you won't see it.",
    );
    await userEvent.click(screen.getByRole('button', { name: 'Make new link' }));
    expect(await screen.findByText('New link emailed to Ravi')).toBeInTheDocument();
    expect(asked).toBe('r2');
  });

  it.each([
    ['MAILING_OFF', 'Email is off for this event; ask an organiser to send a new link'],
    ['MAIL_FAILED', 'The email could not be sent'],
  ])('explains a new link that fails with %s', async (code, text) => {
    const session = asParticipant(leader);
    server.use(
      http.post(`${P}/me/team/members/:registrationId/reissue-link`, () =>
        apiError(409, code, 'Nope.'),
      ),
    );
    renderPortal('/me', { session });
    await userEvent.click(await screen.findByRole('button', { name: 'New link' }));
    await userEvent.click(screen.getByRole('button', { name: 'Make new link' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(text);
    expect(screen.queryByText(/New link emailed/)).not.toBeInTheDocument();
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

  it('shows an error loading the team', async () => {
    const session = asParticipant(leader);
    server.use(http.get(`${P}/me/team`, () => apiError(500, 'INTERNAL', 'Team trouble.')));
    renderPortal('/me', { session });
    expect(await screen.findByRole('alert')).toHaveTextContent('Team trouble.');
  });
});
