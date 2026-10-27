import type { Schemas } from '@eventkit/sdk';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

export const API = 'http://api.test';
export const BUCKET = 'http://bucket.test';
export const EVENT_ID = '22222222-2222-4222-8222-222222222222';
export const E = `${API}/v1/events/${EVENT_ID}`;
export const P = `${API}/v1/portal`;

export const paths: Schemas['PortalPaths'] = {
  register: '/register/{token}',
  staff: '/staff/{token}',
  me: '/me/{token}',
  notifications: '/notifications',
};

export const portalEvent: Schemas['PortalInfo']['event'] = {
  id: EVENT_ID,
  name: 'PESOS X Silicon',
  hostedBy: 'PESOS',
  venue: 'Main Hall',
  startAt: '2026-10-31T03:30:00.000Z',
  endAt: '2026-11-01T12:00:00.000Z',
  registrationStart: '2026-10-01T00:00:00.000Z',
  registrationDeadline: '2026-10-30T00:00:00.000Z',
  minTeamSize: 2,
  maxTeamSize: 3,
  placesLeft: 42,
  paymentMode: 'at_registration',
  registrationFee: 20000,
  feeBasis: 'per_person',
  currency: 'INR',
  paymentDeadline: null,
  paymentInstructions: null,
  leaderboardVisible: false,
};

export function portalInfo(overrides: Partial<Schemas['PortalInfo']> = {}): Schemas['PortalInfo'] {
  return {
    event: portalEvent,
    registrationOpen: true,
    paths,
    fields: [],
    teamRules: [],
    paymentQrUrl: null,
    paymentInstructionsUrl: null,
    ...overrides,
  };
}

/** A session token the devkit can read (it never checks the signature). */
export function token(kind: 'client' | 'staff' | 'participant', id = 'u1'): string {
  const claims = btoa(JSON.stringify({ sub: id, kind, eventId: EVENT_ID }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `h.${claims}.s`;
}

export const apiError = (status: number, code: string, message: string, details?: unknown) =>
  HttpResponse.json({ error: { code, message, ...(details ? { details } : {}) } }, { status });

export const handlers = [
  http.get(P, () => HttpResponse.json(portalInfo())),
  http.get(`${API}/health`, () => HttpResponse.json({ status: 'ok' })),
  http.put(`${BUCKET}/*`, () => new HttpResponse(null, { status: 200 })),
];

export const server = setupServer(...handlers);
