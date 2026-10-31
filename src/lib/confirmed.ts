import { portalKeys, useEventKit } from '@eventkit/sdk/react';
import { useQuery } from '@tanstack/react-query';
import { useWho } from './staff';

/**
 * Polls, notifications, submissions and the leaderboard reach participants
 * once their team is confirmed (the API refuses them before then too). Staff
 * are never held back. Shares useMe's cache.
 */
export function useTeamConfirmed(): { confirmed: boolean; loading: boolean } {
  const ek = useEventKit();
  const participant = useWho().kind === 'participant';
  const me = useQuery({
    queryKey: portalKeys.of('me'),
    queryFn: () => ek.portal.me.get(),
    retry: false,
    enabled: participant,
  });
  if (!participant) return { confirmed: true, loading: false };
  return { confirmed: me.data?.confirmed ?? false, loading: me.isPending };
}
