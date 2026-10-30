import type { Schemas } from '@eventkit/sdk';
import { http, HttpResponse } from 'msw';
import { BUCKET, E, EVENT_ID, P, portalInfo, server, token } from './server';

const T0 = '2026-10-20T10:00:00.000Z';

export function me(overrides: Partial<Schemas['Me']> = {}): Schemas['Me'] {
  return {
    registrationId: 'r1',
    name: 'Asha',
    email: 'asha@example.com',
    phone: '+91 98450 00001',
    participantCode: 'PX-0001',
    qrToken: 'qr-asha',
    status: 'registered',
    isLeader: false,
    team: { id: 't1', name: 'Byte Club', status: 'registered' },
    registeredAt: T0,
    confirmedAt: null,
    attendingAt: null,
    checkedInAt: null,
    cancelledAt: null,
    linkLastUsedAt: null,
    accessEndsAt: '2026-11-08T12:00:00.000Z',
    rsvpEnabled: true,
    ...overrides,
  };
}

type TeamMember = Schemas['Team']['members'][number];
export const teamMember = (
  registrationId: string,
  name: string,
  overrides: Partial<TeamMember> = {},
): TeamMember => ({
  registrationId,
  name,
  email: `${name.toLowerCase()}@example.com`,
  phone: '+91 98450 00000',
  participantCode: `PX-000${registrationId.slice(-1)}`,
  status: 'registered',
  isLeader: false,
  answers: {},
  linkLastUsedAt: null,
  ...overrides,
});

export function team(overrides: Partial<Schemas['Team']> = {}): Schemas['Team'] {
  return {
    id: 't1',
    name: 'Byte Club',
    leaderRegistrationId: 'r1',
    createdAt: T0,
    status: 'registered',
    belowMinimum: false,
    answers: {},
    members: [
      teamMember('r1', 'Asha', { isLeader: true }),
      teamMember('r2', 'Ravi', { linkLastUsedAt: T0 }),
    ],
    payment: {
      mode: 'at_registration',
      amountDue: 40000,
      currency: 'INR',
      deadline: null,
      proofs: [],
    },
    shortlistedBy: null,
    confirmedBy: null,
    ...overrides,
  };
}

export const proof = (
  status: Schemas['PaymentProofStatus'],
  rejectionNote: string | null = null,
): Schemas['PaymentProof'] => ({
  id: `p-${status}`,
  teamId: 't1',
  status,
  amount: 40000,
  currency: 'INR',
  memberCount: 2,
  uploadedAt: T0,
  verifiedAt: null,
  rejectionNote,
});

export function poll(overrides: Partial<Schemas['Poll']> = {}): Schemas['Poll'] {
  return {
    id: 'poll1',
    question: 'Lunch?',
    audience: ['participant'],
    closesAt: null,
    closed: false,
    resultsVisible: false,
    defaultOptionId: null,
    createdBy: { id: 'u1', name: 'Organiser' },
    createdAt: T0,
    options: [
      { id: 'o1', label: 'Veg', position: 0, votes: null },
      { id: 'o2', label: 'Non-veg', position: 1, votes: null },
    ],
    totalVotes: null,
    myVote: null,
    canVote: true,
    canManage: false,
    optionsLocked: false,
    mealCheckpoints: [],
    ...overrides,
  };
}

export function notification(
  overrides: Partial<Schemas['Notification']> = {},
): Schemas['Notification'] {
  return {
    id: 'n1',
    channel: { id: 'c1', name: 'Everyone' },
    sender: { id: 'u1', name: 'Organiser' },
    title: 'Judging starts at 4',
    body: 'Head to Hall A.',
    priority: 'normal',
    sentAt: T0,
    ...overrides,
  };
}

export function round(overrides: Partial<Schemas['Round']> = {}): Schemas['Round'] {
  return {
    id: 'rd1',
    name: 'Round 1',
    position: 0,
    phase: 'released',
    createdAt: T0,
    updatedAt: T0,
    ...overrides,
  };
}

export const uploadTicket = (key: string) => ({
  key,
  url: `${BUCKET}/${key}?signed=put`,
  method: 'PUT',
  headers: { 'Content-Type': 'image/png' },
  expiresIn: 300,
});

export const png = () =>
  new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'r.png', { type: 'image/png' });

/** A participant whose link is open on this device: returns their session token. */
export function asParticipant(
  m: Partial<Schemas['Me']> = {},
  extra: { team?: Schemas['Team']; polls?: Schemas['Poll'][] } = {},
): string {
  server.use(
    http.get(`${P}/me`, () => HttpResponse.json(me(m))),
    http.get(`${P}/me/team`, () => HttpResponse.json(extra.team ?? team())),
    http.get(`${P}/me/polls`, () => HttpResponse.json(extra.polls ?? [])),
    http.get(`${P}/me/notifications`, () => HttpResponse.json([])),
    http.get(`${P}/me/submissions`, () => HttpResponse.json([])),
  );
  return token('participant', m.registrationId ?? 'r1');
}

/** Staff (or the owner, as admin) signed in on the portal: returns their session token. */
export function asStaff(role: 'admin' | 'volunteer' | 'judge'): string {
  server.use(
    http.get(E, () => HttpResponse.json({ event: { ...portalInfo().event, id: EVENT_ID }, role })),
    http.get(`${E}/rounds`, () => HttpResponse.json([round()])),
  );
  return token(role === 'admin' ? 'client' : 'staff', `user-${role}`);
}
