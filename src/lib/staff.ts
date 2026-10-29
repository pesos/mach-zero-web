import type { QueryClient } from '@tanstack/react-query';
import { useEventQuery, usePortalInfo, useSession } from '@eventkit/sdk/react';

/**
 * The signed-in person's place on the portal: a participant (personal link),
 * staff (volunteer or judge) or the event's owner (admin), or nobody.
 */
export function useWho() {
  const { who } = useSession();
  const staffish = who?.kind === 'staff' || who?.kind === 'client';
  // Keyed by the account, so signing in as someone else asks again.
  const event = useEventQuery(`role-${who?.id}`, (e) => e.get(), { enabled: staffish });
  const role = staffish ? (event.data?.role ?? null) : null;
  return {
    kind: who?.kind ?? null,
    role,
    loading: staffish && event.isPending,
    canScan: role === 'admin' || role === 'volunteer',
    canJudge: role === 'admin' || role === 'judge',
  };
}

/**
 * Whether the signed-in person may see the leaderboard now (for the menu):
 * admins and judges always, everyone else once the organisers share it.
 */
export function useLeaderboardVisible() {
  const who = useWho();
  const { event } = usePortalInfo().data!;
  return who.canJudge || (who.kind !== null && event.leaderboardVisible);
}

/** Where staff go after signing in. */
export const homeFor = (role: string) => (role === 'judge' ? '/judge' : '/scan');

/**
 * After signing in or out: forget what the previous session loaded, but keep
 * the portal's own settings (the pages are built from them).
 */
export function forgetSession(queryClient: QueryClient) {
  queryClient.removeQueries({
    predicate: (q) => !(q.queryKey[1] === 'portal' && q.queryKey[2] === 'info'),
  });
}
