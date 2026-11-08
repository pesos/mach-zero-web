import { useEventQuery } from '@eventkit/sdk/react';
import { MessageSquareTextIcon } from 'lucide-react';
import { ErrorText } from '@/components/ErrorText';
import { ListSkeleton } from '@/components/Skeletons';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

const fmt = (n: number | null) => (n === null ? '—' : Number.isInteger(n) ? n : n.toFixed(2));

/**
 * Who scored a team in a round, criterion by criterion, with remarks. Judges
 * open it once the round is closed; admins any time. One card per judge.
 */
export function ScoreBreakdownSheet({
  team,
  roundId,
  onClose,
}: {
  team: { id: string; name: string } | null;
  roundId: string | undefined;
  onClose: () => void;
}) {
  const breakdown = useEventQuery(
    'score-breakdown',
    (e) => e.scoreBreakdown(team!.id, roundId),
    { enabled: team !== null },
    [team?.id, roundId],
  );
  const b = breakdown.data;
  return (
    <Sheet open={team !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="pr-8 wrap-anywhere">{team?.name}</SheetTitle>
          <SheetDescription>
            {b ? `${b.round.name}: every judge’s marks and remarks.` : 'Judging breakdown'}
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 px-4 pb-6">
          <ErrorText error={breakdown.error} />
          {breakdown.isPending && <ListSkeleton label="Loading the breakdown" rows={3} />}
          {b && (
            <>
              <section aria-label="Average" className="grid gap-1.5 text-sm">
                <div className="flex items-baseline justify-between gap-3 font-medium">
                  <span>Average</span>
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
              </section>
              {b.judges.length === 0 ? (
                <p className="text-sm text-muted-foreground">No judge scored this team.</p>
              ) : (
                <ul className="grid gap-3" aria-label="Judges">
                  {b.judges.map((j) => (
                    <li key={j.judge.id} className="grid gap-2 rounded-lg border bg-card/60 p-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="min-w-0 font-medium wrap-anywhere">{j.judge.name}</span>
                        <Badge variant="secondary" className="tabular-nums">
                          {j.total} / {b.maxTotal}
                        </Badge>
                      </div>
                      <ul className="grid gap-1.5 text-sm">
                        {j.scores.map((s) => {
                          const c = b.criteria.find((x) => x.id === s.criterionId)!;
                          return (
                            <li key={s.criterionId} className="grid gap-0.5">
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
                                  <MessageSquareTextIcon
                                    aria-hidden
                                    className="mt-0.5 size-3 shrink-0"
                                  />
                                  <span className="min-w-0 wrap-anywhere">{s.comment}</span>
                                </p>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
