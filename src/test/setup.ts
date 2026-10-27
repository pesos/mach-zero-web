import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { server } from './server';

// jsdom has no ResizeObserver; Radix (the checkbox) measures itself with one.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Pages load in a chain (portal info → session → page data), so allow a little longer.
configure({ asyncUtilTimeout: 3000 });

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  server.resetHandlers();
  window.localStorage.clear();
  window.history.replaceState(null, '', '/');
});
afterAll(() => server.close());
