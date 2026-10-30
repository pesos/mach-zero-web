import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { asParticipant, asStaff, notification } from '@/test/fixtures';
import { renderPortal } from '@/test/render';
import { E, P, server } from '@/test/server';

// sonner keeps its toasts in a module-level store that outlives each test's
// render, so check what the bell asks it to show.
const shown = vi.hoisted(() => ({ normal: vi.fn(), error: vi.fn() }));
vi.mock('sonner', async (original) => ({
  ...(await original<typeof import('sonner')>()),
  toast: Object.assign(shown.normal, { error: shown.error }),
}));

const KEY = 'portal.notif.lastSeen';
const old = notification({ id: 'n1', title: 'Old news', sentAt: '2026-10-20T10:00:00.000Z' });
const fresh = notification({
  id: 'n2',
  title: 'Doors open',
  body: 'Come in.',
  sentAt: '2026-10-21T10:00:00.000Z',
});
const roll = notification({ id: 'n4', title: 'Roll call', sentAt: '2026-10-23T10:00:00.000Z' });
const urgent = notification({
  id: 'n3',
  title: 'Fire drill',
  body: 'Exit now.',
  priority: 'urgent',
  sentAt: '2026-10-22T10:00:00.000Z',
});

describe('notification bell', () => {
  beforeEach(() =>
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['setInterval', 'clearInterval'] }),
  );
  afterEach(() => vi.useRealTimers());

  const poll = () => act(() => vi.advanceTimersByTimeAsync(30_000));

  it('is not shown to visitors', async () => {
    renderPortal('/');
    await screen.findByRole('heading', { name: 'PESOS X Silicon' });
    expect(screen.queryByRole('button', { name: /^Notifications/ })).not.toBeInTheDocument();
  });

  it('counts what is newer than the last time seen, and clears on visiting the page', async () => {
    window.localStorage.setItem(KEY, '2026-10-20T12:00:00.000Z');
    const session = asParticipant();
    server.use(http.get(`${P}/me/notifications`, () => HttpResponse.json([fresh, old])));
    renderPortal('/', { session });
    const bell = await screen.findByRole('button', { name: 'Notifications, 1 unread' });
    expect(within(bell).getByTestId('unread-count')).toHaveTextContent('1');
    await userEvent.click(bell);
    expect(await screen.findByRole('region', { name: 'Notifications' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Notifications' })).toBeInTheDocument();
    expect(window.localStorage.getItem(KEY)).toBe(fresh.sentAt);
  });

  it('shows 9+ for many, and everything is unread before anything was seen', async () => {
    const many = Array.from({ length: 11 }, (_, i) =>
      notification({ id: `m${i}`, sentAt: `2026-10-21T10:00:${String(i).padStart(2, '0')}.000Z` }),
    );
    server.use(http.get(`${E}/notifications`, () => HttpResponse.json(many)));
    renderPortal('/', { session: asStaff('volunteer') });
    expect(await screen.findByTestId('unread-count')).toHaveTextContent('9+');
  });

  it('still works when storage is blocked', async () => {
    const { getItem, setItem } = Storage.prototype;
    const blocked = (key: string) => {
      if (key === KEY) throw new Error('blocked');
    };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key) {
      blocked(key);
      return getItem.call(this, key);
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      blocked(key);
      setItem.call(this, key, value);
    });
    const session = asParticipant();
    server.use(http.get(`${P}/me/notifications`, () => HttpResponse.json([fresh])));
    renderPortal('/', { session });
    await userEvent.click(await screen.findByRole('button', { name: 'Notifications, 1 unread' }));
    expect(await screen.findByRole('button', { name: 'Notifications' })).toBeInTheDocument();
  });

  it('toasts new arrivals after the first load, not the first load itself', async () => {
    shown.normal.mockClear();
    shown.error.mockClear();
    let feed = [old];
    const session = asParticipant();
    server.use(http.get(`${P}/me/notifications`, () => HttpResponse.json(feed)));
    renderPortal('/', { session });
    await screen.findByRole('button', { name: /^Notifications/ });
    expect(shown.normal).not.toHaveBeenCalled();
    expect(shown.error).not.toHaveBeenCalled();
    feed = [urgent, fresh, old];
    await poll();
    await waitFor(() => expect(shown.error).toHaveBeenCalledTimes(1));
    expect(shown.normal).toHaveBeenCalledTimes(1);
    expect(shown.normal).toHaveBeenCalledWith(
      'Doors open',
      expect.objectContaining({ description: 'Come in.' }),
    );
    expect(shown.error).toHaveBeenCalledWith(
      'Fire drill',
      expect.objectContaining({ description: 'Exit now.' }),
    );
    // Clicking a toast's action goes to the notifications page.
    shown.normal.mock.calls[0]![1].action.onClick();
    expect(await screen.findByRole('region', { name: 'Notifications' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/notifications');
  });

  it('toasts staff arrivals, but stays quiet on the notifications page', async () => {
    shown.normal.mockClear();
    let feed = [old];
    server.use(
      http.get(`${E}/notifications`, () => HttpResponse.json(feed)),
      http.get(`${E}/channels`, () => HttpResponse.json([])),
    );
    renderPortal('/notifications', { session: asStaff('admin') });
    expect(await screen.findByText('Old news')).toBeInTheDocument();
    feed = [roll, old];
    await poll();
    expect(await screen.findByText('Roll call')).toBeInTheDocument();
    expect(shown.normal).not.toHaveBeenCalled();
  });

  it('toasts staff arrivals away from the page', async () => {
    shown.normal.mockClear();
    let feed: ReturnType<typeof notification>[] = [];
    server.use(http.get(`${E}/notifications`, () => HttpResponse.json(feed)));
    renderPortal('/', { session: asStaff('volunteer') });
    await screen.findByRole('button', { name: /^Notifications/ });
    feed = [fresh];
    await poll();
    await waitFor(() => expect(shown.normal).toHaveBeenCalledWith('Doors open', expect.anything()));
  });
});
