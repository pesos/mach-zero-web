import type { Schemas } from '@eventkit/sdk';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { png, uploadTicket } from '@/test/fixtures';
import { renderPortal } from '@/test/render';
import { apiError, P, portalEvent, portalInfo, server } from '@/test/server';

const regLink = http.get(`${P}/links/:token`, () =>
  HttpResponse.json({
    kind: 'registration',
    role: 'participant',
    label: null,
    requiresPassword: false,
    expiresAt: null,
  }),
);

const department: Schemas['EventField'] = {
  id: 'f-dept',
  scope: 'member',
  label: 'Department',
  help: 'As on your ID card',
  type: 'choice',
  options: ['CSE', 'ECE'],
  required: true,
  unique: false,
  pattern: null,
  position: 0,
};
const idea: Schemas['EventField'] = {
  ...department,
  id: 'f-idea',
  scope: 'team',
  label: 'Idea',
  help: null,
  type: 'long_text',
  options: [],
  required: false,
};
const age: Schemas['EventField'] = {
  ...idea,
  id: 'f-age',
  scope: 'member',
  label: 'Age',
  type: 'number',
};
const rule: Schemas['TeamRule'] = {
  id: 'rule1',
  fieldId: 'f-dept',
  fieldLabel: 'Department',
  value: 'CSE',
  minCount: 1,
  description: 'At least one CSE member',
};

const registered: Schemas['TeamRegistered'] = {
  team: { id: 't1', name: 'Byte Club' },
  members: [
    {
      registrationId: 'r1',
      name: 'Asha',
      email: 'asha@example.com',
      participantCode: 'PX-0001',
      qrToken: 'qr-1',
      isLeader: true,
      link: { token: 'ek_a', url: 'https://portal.test/me/ek_a' },
    },
    {
      registrationId: 'r2',
      name: 'Ravi',
      email: 'ravi@example.com',
      participantCode: 'PX-0002',
      qrToken: 'qr-2',
      isLeader: false,
      link: null,
    },
  ],
  payment: { mode: 'at_registration', amountDue: 40000, currency: 'INR', proof: null },
};

async function fillMember(i: number, name: string, dept = 'CSE') {
  await userEvent.type(document.getElementById(`m${i}-name`)!, name);
  await userEvent.type(
    document.getElementById(`m${i}-email`)!,
    `${name.toLowerCase()}@example.com`,
  );
  await userEvent.selectOptions(document.getElementById(`m${i}-f-dept`)!, dept);
}

describe('registering a team', () => {
  it('charges a per-team fee once and shows how to pay', async () => {
    server.use(
      regLink,
      http.get(P, () =>
        HttpResponse.json(
          portalInfo({
            event: {
              ...portalEvent,
              feeBasis: 'per_team',
              registrationFee: 120000,
              paymentInstructions: 'Bank: Canara, A/c 1234\nor UPI: club@upi',
            },
            paymentInstructionsUrl: 'https://bucket.test/events/e/payment-instructions/i.pdf?sig=1',
          }),
        ),
      ),
    );
    renderPortal('/register/reg-token');
    expect(
      await screen.findByRole('heading', { name: 'Pay ₹1,200 for the team' }),
    ).toBeInTheDocument();
    const how = screen.getByLabelText('How to pay');
    expect(within(how).getByText(/or UPI: club@upi/)).toBeInTheDocument();
    expect(
      within(how).getByRole('link', { name: 'Open the payment instructions (PDF)' }),
    ).toHaveAttribute('href', 'https://bucket.test/events/e/payment-instructions/i.pdf?sig=1');
    expect(within(how).queryByRole('img')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Add a member' }));
    expect(screen.getByRole('heading', { name: 'Pay ₹1,200 for the team' })).toBeInTheDocument();
    expect(screen.getByLabelText('Payment receipt')).toBeInTheDocument();
  });

  it('says when the organisers have not explained how to pay', async () => {
    server.use(regLink);
    renderPortal('/register/reg-token');
    expect(await screen.findByText(/haven't said how to pay yet/)).toBeInTheDocument();
    expect(screen.getByLabelText('Payment receipt')).toBeInTheDocument();
  });

  it('registers the whole team with a receipt and shows each member once', async () => {
    let body: Record<string, unknown> | undefined;
    server.use(
      regLink,
      http.get(P, () =>
        HttpResponse.json(
          portalInfo({
            fields: [department, idea],
            teamRules: [rule],
            paymentQrUrl: 'https://bucket.test/qr.png',
          }),
        ),
      ),
      http.post(`${P}/uploads`, () =>
        HttpResponse.json(uploadTicket('events/e/receipt/k.png'), { status: 201 }),
      ),
      http.post(`${P}/register`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(registered, { status: 201 });
      }),
    );
    renderPortal('/register/reg-token');
    expect(await screen.findByRole('heading', { name: 'Register your team' })).toBeInTheDocument();
    expect(screen.getByText('At least one CSE member')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'UPI QR code to pay' })).toBeInTheDocument();
    const submit = screen.getByRole('button', { name: 'Register team' });
    expect(submit).toBeDisabled();
    const needed = screen.getByRole('list', { name: 'Still needed' });
    expect(within(needed).getByText('Give the team a name.')).toBeInTheDocument();
    expect(within(needed).getByText('Upload the payment receipt.')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Team name'), ' Byte Club ');
    await userEvent.type(screen.getByLabelText('Idea (optional)'), 'Robots');
    await fillMember(0, 'Asha');
    await fillMember(1, 'Ravi', 'ECE');
    // A third member, added then removed again.
    await userEvent.click(screen.getByRole('button', { name: 'Add a member' }));
    expect(screen.getByRole('heading', { name: 'Member 3' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add a member' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pay ₹600' })).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: 'Remove' })[1]!);
    expect(screen.queryByRole('heading', { name: 'Member 3' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pay ₹400' })).toBeInTheDocument();

    expect(submit).toBeDisabled();
    await userEvent.upload(screen.getByLabelText('Payment receipt'), png());
    expect(submit).toBeEnabled();
    await userEvent.click(submit);

    expect(await screen.findByText('Byte Club is registered.')).toBeInTheDocument();
    expect(body).toEqual({
      linkToken: 'reg-token',
      team: { name: 'Byte Club', answers: { 'f-idea': 'Robots' } },
      members: [
        {
          name: 'Asha',
          email: 'asha@example.com',
          answers: { 'f-dept': 'CSE' },
        },
        {
          name: 'Ravi',
          email: 'ravi@example.com',
          answers: { 'f-dept': 'ECE' },
        },
      ],
      receiptKey: 'events/e/receipt/k.png',
    });
    expect(screen.getByText('PX-0001')).toBeInTheDocument();
    expect(screen.getByText('Leader')).toBeInTheDocument();
    expect(screen.getByText('https://portal.test/me/ek_a')).toBeInTheDocument();
    // Members' own links are never shown: they get them by email.
    expect(screen.queryByText('Ravi')).not.toBeInTheDocument();
    expect(screen.getByText('Each member gets their own link by email')).toBeInTheDocument();
    expect(screen.getByText('Your personal link')).toBeInTheDocument();
    expect(screen.queryByText('PX-0002')).not.toBeInTheDocument();
    expect(screen.getByText(/Check the spam/)).toBeInTheDocument();
    // QR codes wait for confirmation.
    expect(screen.queryByTitle(/check-in QR code/)).not.toBeInTheDocument();
  });

  it('copies a personal link', async () => {
    const user = userEvent.setup();
    server.use(
      regLink,
      http.get(P, () =>
        HttpResponse.json(
          portalInfo({ event: { ...portalEvent, paymentMode: 'none', registrationFee: null } }),
        ),
      ),
      http.post(`${P}/register`, () => HttpResponse.json(registered, { status: 201 })),
    );
    renderPortal('/register/reg-token');
    await user.type(await screen.findByLabelText('Team name'), 'Byte Club');
    for (const i of [0, 1]) {
      await user.type(document.getElementById(`m${i}-name`)!, `N${i}`);
      await user.type(document.getElementById(`m${i}-email`)!, `n${i}@example.com`);
    }
    expect(screen.queryByText(/^Pay /)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Register team' }));
    const copy = await screen.findByRole('button', { name: 'Copy link' });
    await user.click(copy);
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();
    expect(await navigator.clipboard.readText()).toBe('https://portal.test/me/ek_a');
  });

  it('asks phone questions with a phone keypad, numbers without spinner arrows', async () => {
    const phone: Schemas['EventField'] = { ...age, id: 'f-phone', label: 'Phone', type: 'phone' };
    server.use(
      regLink,
      http.get(P, () => HttpResponse.json(portalInfo({ fields: [phone, age] }))),
    );
    renderPortal('/register/reg-token');
    const tel = await screen.findByLabelText('Phone (optional)', { selector: '#m0-f-phone' });
    expect(tel).toHaveAttribute('type', 'tel');
    expect(tel).toHaveAttribute('inputmode', 'tel');
    const number = document.getElementById('m0-f-age')!;
    expect(number).toHaveAttribute('type', 'text');
    expect(number).toHaveAttribute('inputmode', 'decimal');
    // No fixed phone field: name and email are the only built-in details.
    expect(document.getElementById('m0-phone')).toBeNull();
  });

  it('shows the field problems the API listed', async () => {
    server.use(
      regLink,
      http.get(P, () =>
        HttpResponse.json(
          portalInfo({ fields: [age], event: { ...portalEvent, paymentMode: 'after_shortlist' } }),
        ),
      ),
      http.post(`${P}/register`, () =>
        apiError(409, 'DUPLICATE_ANSWER', 'Some details are already registered.', [
          { message: 'asha@example.com is already registered.' },
        ]),
      ),
    );
    renderPortal('/register/reg-token');
    await userEvent.type(await screen.findByLabelText('Team name'), 'Byte Club');
    for (const i of [0, 1]) {
      await userEvent.type(document.getElementById(`m${i}-name`)!, `N${i}`);
      await userEvent.type(document.getElementById(`m${i}-email`)!, `n${i}@example.com`);
    }
    await userEvent.type(document.getElementById('m0-f-age')!, '20');
    await userEvent.click(screen.getByRole('button', { name: 'Register team' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Some details are already registered.');
    expect(alert).toHaveTextContent('asha@example.com is already registered.');
  });

  it('says when registration is closed', async () => {
    server.use(
      regLink,
      http.get(P, () => HttpResponse.json(portalInfo({ registrationOpen: false }))),
    );
    renderPortal('/register/reg-token');
    expect(await screen.findByText(/Registration is not open\. It runs/)).toBeInTheDocument();
  });

  it('refuses a staff link and a dead link', async () => {
    server.use(
      http.get(`${P}/links/:token`, ({ params }) =>
        params.token === 'staff'
          ? HttpResponse.json({
              kind: 'staff',
              role: 'volunteer',
              label: null,
              requiresPassword: true,
              expiresAt: null,
            })
          : apiError(404, 'LINK_NOT_FOUND', 'This link does not exist.'),
      ),
    );
    const first = renderPortal('/register/staff');
    expect(await screen.findByRole('alert')).toHaveTextContent('This is not a registration link.');
    first.unmount();
    renderPortal('/register/gone');
    expect(await screen.findByRole('alert')).toHaveTextContent('This link does not exist.');
  });
});
