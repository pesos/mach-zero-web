import { usePortalInfo } from '@eventkit/sdk/react';

/**
 * Polls, submissions and the leaderboard reach participants from 00:00 IST
 * on the event's start date (the API refuses them before then too).
 */
export function useActivitiesOpen(now: () => number = Date.now): {
  open: boolean;
  from: string;
} {
  const { event } = usePortalInfo().data!;
  return { open: now() >= Date.parse(event.activitiesFrom), from: event.activitiesFrom };
}
