import type { Schemas } from '@eventkit/sdk';
import { useEventKit, useEventQuery, usePortalInfo } from '@eventkit/sdk/react';
import { useQuery } from '@tanstack/react-query';
import { EyeOffIcon, InfoIcon, TrophyIcon } from 'lucide-react';
import { ErrorText } from '@/components/ErrorText';
import { Loading } from '@/components/Loading';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useWho } from '@/lib/staff';
import { cn } from '@/lib/utils';

/** Averages can be fractional: one decimal at most. */
const fmt = (n: number) => (Math.round(n * 10) / 10).toString();

/**
 * Team totals. Participants and volunteers see them once the organisers make
 * the leaderboard public; admins and judges always, with each criterion's average.
 */
export function Leaderboard() {
  const who = useWho();
  if (who.kind === 'participant') return <ParticipantBoard />;
  if (who.kind) return <StaffBoard />;
  return (
    <Alert>
      <InfoIcon />
      <AlertDescription className="block text-foreground">
        Open your personal link to see the leaderboard.
      </AlertDescription>
    </Alert>
  );
}

function ParticipantBoard() {
  const ek = useEventKit();
  const { event } = usePortalInfo().data!;
  const board = useQuery({
    queryKey: ['eventkit', 'portal', 'leaderboard'],
    queryFn: () => ek.portal.me.leaderboard(),
    enabled: event.leaderboardVisible,
    refetchInterval: 30_000,
  });
  if (!event.leaderboardVisible) return <NotYet />;
  return <Board board={board.data} error={board.error} />;
}

function StaffBoard() {
  const who = useWho();
  const { event } = usePortalInfo().data!;
  const allowed = who.canJudge || event.leaderboardVisible;
  const board = useEventQuery('leaderboard', (e) => e.leaderboard(), {
    enabled: allowed,
    refetchInterval: 30_000,
  });
  const criteria = useEventQuery('criteria', (e) => e.criteria.list(), {
    enabled: allowed && who.canJudge,
  });
  if (!allowed) return <NotYet />;
  return (
    <Board
      board={board.data}
      error={board.error ?? criteria.error}
      criteria={who.canJudge ? criteria.data : undefined}
    />
  );
}

function NotYet() {
  return (
    <div className="grid justify-items-center gap-2 rounded-xl border border-dashed bg-card/70 p-8 text-center">
      <EyeOffIcon className="size-6 text-muted-foreground" aria-hidden />
      <p className="text-sm text-muted-foreground">
        The organisers have not shared the leaderboard yet.
      </p>
    </div>
  );
}

function Board({
  board,
  error,
  criteria,
}: {
  board: Schemas['Leaderboard'] | undefined;
  error: unknown;
  criteria?: Schemas['Criterion'][];
}) {
  if (!board && !error) return <Loading />;
  const names = new Map(criteria?.map((c) => [c.id, c.name]));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrophyIcon className="size-4 text-primary" />
          Leaderboard
        </CardTitle>
        {board && criteria && (
          <CardDescription>
            {board.visibleToEveryone
              ? 'Everyone can see this.'
              : 'Only organisers and judges can see this for now.'}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <ErrorText error={error} />
        {board?.entries.length === 0 && (
          <p className="text-sm text-muted-foreground">No scores yet.</p>
        )}
        {board && board.entries.length > 0 && (
          <ol aria-label="Leaderboard" className="grid divide-y">
            {board.entries.map((e) => (
              <li key={e.team.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span
                  className={cn(
                    'grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold',
                    e.rank === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted',
                  )}
                >
                  {e.rank}
                </span>
                <span className="grid min-w-0 gap-0.5">
                  <span className="font-medium">{e.team.name}</span>
                  {criteria && (
                    <span className="text-xs text-muted-foreground">
                      {e.judges} {e.judges === 1 ? 'judge' : 'judges'}
                      {e.criteria
                        .filter((c) => c.average !== null && names.has(c.criterionId))
                        .map((c) => ` · ${names.get(c.criterionId)} ${fmt(c.average!)}`)
                        .join('')}
                    </span>
                  )}
                </span>
                <span className="ml-auto shrink-0 text-muted-foreground tabular-nums">
                  {fmt(e.total)} / {e.maxTotal}
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
