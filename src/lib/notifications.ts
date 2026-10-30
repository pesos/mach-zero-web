import type { Schemas } from '@eventkit/sdk';
import { useEffect, useRef, useSyncExternalStore } from 'react';

const KEY = 'portal.notif.lastSeen';
// Only used when storage is blocked, so the badge still clears.
let memory: string | undefined;

export function readLastSeen(): string | null {
  try {
    const stored = localStorage.getItem(KEY);
    memory = stored ?? undefined;
    return stored;
  } catch {
    return memory ?? null;
  }
}

const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => void listeners.delete(fn);
};

export function writeLastSeen(iso: string) {
  memory = iso;
  try {
    localStorage.setItem(KEY, iso);
  } catch {
    // Private mode or blocked storage: the badge just won't persist.
  }
  listeners.forEach((fn) => fn());
}

const newest = (items: Schemas['Notification'][]) =>
  items.reduce<string | null>((a, n) => (a === null || n.sentAt > a ? n.sentAt : a), null);

/**
 * Unread count (items sent after the stored "last seen" time) and the new
 * arrivals of each poll, for toasts. Nothing is reported on the first load.
 * While `viewing` the notifications page, everything counts as seen.
 */
export function useUnread(
  items: Schemas['Notification'][] | undefined,
  viewing: boolean,
  onArrive: (fresh: Schemas['Notification'][]) => void,
) {
  const lastSeen = useSyncExternalStore(subscribe, readLastSeen);
  const toasted = useRef<string | null | undefined>(undefined);
  const arrive = useRef(onArrive);

  useEffect(() => {
    arrive.current = onArrive;
    if (!items) return;
    const latest = newest(items);
    if (toasted.current === undefined) {
      toasted.current = latest;
    } else if (latest && (toasted.current === null || latest > toasted.current)) {
      const since = toasted.current;
      const fresh = items
        .filter((n) => since === null || n.sentAt > since)
        .sort((a, b) => a.sentAt.localeCompare(b.sentAt));
      toasted.current = latest;
      if (!viewing) arrive.current(fresh);
    }
    if (viewing && latest && (lastSeen === null || latest > lastSeen)) {
      writeLastSeen(latest);
    }
  }, [items, viewing, lastSeen, onArrive]);

  return items ? items.filter((n) => lastSeen === null || n.sentAt > lastSeen).length : 0;
}
