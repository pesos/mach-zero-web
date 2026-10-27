import { createEventKit, type EventKit, localStorageSession } from '@eventkit/sdk';

/** The portal's devkit client: this event's id and API key, one session per device. */
export function makeEventKit(env: Record<string, string | undefined> = import.meta.env): EventKit {
  return createEventKit({
    apiUrl: env.VITE_EVENTKIT_API_URL || '/api',
    apiKey: env.VITE_EVENTKIT_API_KEY ?? '',
    eventId: env.VITE_EVENTKIT_EVENT_ID ?? '',
    session: localStorageSession('portal.session'),
  });
}

/** The friendly text of any error (the API's message, or a generic one). */
export function errorText(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'Something went wrong.';
}
