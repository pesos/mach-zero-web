import { formatDateIST } from '@eventkit/sdk';
import { CalendarClockIcon } from 'lucide-react';

/** Shown to participants before the event day, in place of polls, submissions or the leaderboard. */
export function OpensOnEventDay({ what, from }: { what: string; from: string }) {
  return (
    <div className="grid justify-items-center gap-2 rounded-xl border border-dashed bg-card/70 p-8 text-center">
      <CalendarClockIcon className="size-6 text-muted-foreground" aria-hidden />
      <h2 className="font-semibold">{what} open on the day of the event</h2>
      <p className="text-sm text-muted-foreground">Come back on {formatDateIST(from)}.</p>
    </div>
  );
}
