import type { Schemas } from '@eventkit/sdk';
import { useEventQuery } from '@eventkit/sdk/react';
import { LockIcon, MessageSquareTextIcon } from 'lucide-react';
import { ErrorText } from '@/components/ErrorText';
import { RoundSections } from '@/components/RoundSections';
import { ListSkeleton } from '@/components/Skeletons';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const fmt = (n: number | null) => (n === null ? '—' : Number.isInteger(n) ? n : n.toFixed(2));

/**
 * Who scored a team in a round, criterion by criterion, with remarks: the
 * average, then one card per judge. Judges see it once the round is closed;
 * admins any time.
 */
export function ScoreBreakdownView({ teamId, roundId }: { teamId: string; roundId: string }) {
  const breakdown = useEventQuery('score-breakdown', (e) => e.scoreBreakdown(teamId, roundId), {}, [
    teamId,
    roundId,
  ]);
  const b = breakdown.data;
  if (breakdown.isPending) return <ListSkeleton label="Loading the reviews" rows={3} />;
  if (!b) return <ErrorText error={breakdown.error} />;
  return (
    <div className="grid gap-4">
      <Card className="gap-3 py-4">
        <CardContent className="grid gap-1.5 px-4 text-sm">
          <div className="flex items-baseline justify-between gap-3 font-medium">
            <span>Final score</span>
            <span className="tabular-nums">
              {fmt(b.total)} / {b.maxTotal}
            </span>
          </div>
          {b.criteria.map((c) => (
            <div key={c.id} className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 text-muted-foreground wrap-anywhere">{c.name}</span>
              <span className="shrink-0 tabular-nums">
                {fmt(c.average)} / {c.maxScore}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
      {b.judges.length === 0 ? (
        <p className="text-sm text-muted-foreground">No judge scored this team.</p>
      ) : (
        <ul className="grid gap-3" aria-label="Judges">
          {b.judges.map((j) => (
            <li key={j.judge.id}>
              <Card className="gap-3 py-4">
                <CardHeader className="flex flex-wrap items-baseline justify-between gap-2 px-4">
                  <CardTitle className="min-w-0 text-base wrap-anywhere">{j.judge.name}</CardTitle>
                  <Badge variant="secondary" className="tabular-nums">
                    {j.total} / {b.maxTotal}
                  </Badge>
                </CardHeader>
                <CardContent className="grid gap-2 px-4 text-sm">
                  {j.scores.map((s) => {
                    const c = b.criteria.find((x) => x.id === s.criterionId)!;
                    return (
                      <div key={s.criterionId} className="grid gap-0.5">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="min-w-0 text-muted-foreground wrap-anywhere">
                            {c.name}
                          </span>
                          <span className="shrink-0 tabular-nums">
                            {fmt(s.value)} / {c.maxScore}
                          </span>
                        </div>
                        {s.comment && (
                          <p className="flex gap-1.5 text-xs text-muted-foreground">
                            <MessageSquareTextIcon aria-hidden className="mt-0.5 size-3 shrink-0" />
                            <span className="min-w-0 wrap-anywhere">{s.comment}</span>
                          </p>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type Round = Schemas['Round'];

/**
 * A team's reviews for the chosen round and every round before it, newest
 * first: on Round 3, Round 2 and Round 1 show below it. Judges see a round's
 * reviews once it is closed; admins any time.
 */
export function TeamReviews({
  teamId,
  rounds,
  roundId,
  isAdmin,
}: {
  teamId: string;
  rounds: Round[];
  roundId: string;
  isAdmin: boolean;
}) {
  return (
    <RoundSections rounds={rounds} roundId={roundId}>
      {(r) => <RoundReviews teamId={teamId} round={r} isAdmin={isAdmin} />}
    </RoundSections>
  );
}

function RoundReviews({
  teamId,
  round,
  isAdmin,
}: {
  teamId: string;
  round: Round;
  isAdmin: boolean;
}) {
  if (isAdmin || round.phase === 'closed') {
    return <ScoreBreakdownView teamId={teamId} roundId={round.id} />;
  }
  return (
    <Alert>
      <LockIcon />
      <AlertTitle>Reviews open when the round closes</AlertTitle>
      <AlertDescription>
        Every judge’s marks and remarks show here once the organisers close this round, so scoring
        stays independent.
      </AlertDescription>
    </Alert>
  );
}
