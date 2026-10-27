import { render } from '@testing-library/react';
import { App, Providers } from '@/App';
import { makeEventKit } from '@/lib/eventkit';
import { API, EVENT_ID } from './server';

/** Renders the whole portal at `path`, optionally with a stored session `token`. */
export function renderPortal(path: string, { session }: { session?: string } = {}) {
  if (session) window.localStorage.setItem('portal.session', session);
  window.history.replaceState(null, '', path);
  const ek = makeEventKit({
    VITE_EVENTKIT_API_URL: API,
    VITE_EVENTKIT_API_KEY: 'test-event-key',
    VITE_EVENTKIT_EVENT_ID: EVENT_ID,
  });
  const result = render(
    <Providers ek={ek}>
      <App />
    </Providers>,
  );
  return { ...result, ek };
}
