import { isEventKitError, type Schemas } from '@eventkit/sdk';
import {
  useEventQuery,
  useMyLeaderboard,
  useMySubmissions,
  usePortalInfo,
  useRounds,
} from '@eventkit/sdk/react';
import { EyeOffIcon, InfoIcon, TrophyIcon } from 'lucide-react';
import { ErrorText } from '@/components/ErrorText';
import { RoundPicker } from '@/components/RoundPicker';
import { useRoundChoice } from '@/lib/rounds';
import { ListSkeleton } from '@/components/Skeletons';
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
  const { event } = usePortalInfo().data!;
  if (!event.leaderboardVisible) return <NotYet />;
  return <ParticipantRounds />;
}

/** Participants learn of rounds through the submission forms they can see. */
function ParticipantRounds() {
  const submissions = useMySubmissions();
  const seen = new Map<string, { id: string; name: string; phase: string }>();
  for (const s of submissions.data ?? []) {
    if (s.round.phase !== 'draft') seen.set(s.round.id, s.round);
  }
  const rounds = [...seen.values()];
  const [roundId, setRoundId] = useRoundChoice(rounds);
  // Without a choice the API picks the latest released or closed round.
  const board = useMyLeaderboard(roundId);
  return (
    <div className="grid gap-4">
      <RoundPicker rounds={rounds} value={roundId ?? board.data?.round?.id} onChange={setRoundId} />
      <Board board={board.data} error={board.error} />
    </div>
  );
}

function StaffBoard() {
  const who = useWho();
  const { event } = usePortalInfo().data!;
  const allowed = who.canJudge || event.leaderboardVisible;
  const rounds = useRounds();
  const [roundId, setRoundId] = useRoundChoice(rounds.data ?? []);
  const board = useEventQuery(
    'leaderboard',
    (e) => e.leaderboard(roundId),
    {
      enabled: allowed && !rounds.isPending,
      refetchInterval: 30_000,
    },
    [roundId],
  );
  const criteria = useEventQuery(
    'criteria',
    (e) => e.criteria.list(roundId),
    {
      enabled: allowed && who.canJudge && !rounds.isPending,
    },
    [roundId],
  );
  if (!allowed) return <NotYet />;
  return (
    <div className="grid gap-4">
      <RoundPicker rounds={rounds.data ?? []} value={roundId} onChange={setRoundId} />
      <Board
        board={board.data}
        error={board.error ?? criteria.error}
        criteria={who.canJudge ? criteria.data : undefined}
      />
    </div>
  );
}

function NotYet() {
  return (
    <div className="grid justify-items-center gap-2 rounded-xl border border-dashed bg-card/70 p-8 text-center">
      <EyeOffIcon className="size-6 text-muted-foreground" aria-hidden />
      <h2 className="font-semibold">No leaderboards released yet</h2>
      <p className="text-sm text-muted-foreground">
        It will appear here once the organisers release it.
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
  if (isEventKitError(error, 'LEADERBOARD_HIDDEN')) return <NotYet />;
  if (!board && !error) return <ListSkeleton label="Loading the leaderboard" rows={5} />;
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
