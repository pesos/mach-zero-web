import type { Schemas } from '@eventkit/sdk';
import { useEventMutation, useEventQuery } from '@eventkit/sdk/react';
import { CheckIcon } from 'lucide-react';
import { useState } from 'react';
import { ErrorText } from '@/components/ErrorText';
import { Loading } from '@/components/Loading';
import { StaffOnly } from '@/components/StaffOnly';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function Judge() {
  return (
    <StaffOnly allowed="judge">
      <JudgePage />
    </StaffOnly>
  );
}

/** Judges score teams with a checked-in member, against the organiser's rubric. */
function JudgePage() {
  const criteria = useEventQuery('criteria', (e) => e.criteria.list());
  const teams = useEventQuery('judging-teams', (e) => e.judging.teams());
  if (criteria.isPending || teams.isPending) return <Loading />;
  if (criteria.isError || teams.isError) return <ErrorText error={criteria.error ?? teams.error} />;
  if (criteria.data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">The organisers have not set the rubric yet.</p>
    );
  }
  if (teams.data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No teams to judge yet: a team appears once a member has checked in.
      </p>
    );
  }
  return teams.data.map((t) => <ScoreCard key={t.id} team={t} criteria={criteria.data} />);
}

function ScoreCard({
  team,
  criteria,
}: {
  team: Schemas['JudgingTeam'];
  criteria: Schemas['Criterion'][];
}) {
  const mine = new Map(team.myScores.map((s) => [s.criterionId, s]));
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(criteria.map((c) => [c.id, mine.get(c.id)?.value.toString() ?? ''])),
  );
  const [comments, setComments] = useState<Record<string, string>>(() =>
    Object.fromEntries(criteria.map((c) => [c.id, mine.get(c.id)?.comment ?? ''])),
  );
  const save = useEventMutation((e) =>
    e.judging.saveScores(
      team.id,
      criteria
        .filter((c) => values[c.id] !== '')
        .map((c) => ({
          criterionId: c.id,
          value: Number(values[c.id]),
          comment: comments[c.id]?.trim() || null,
        })),
    ),
  );
  const outOfRange = (c: Schemas['Criterion']) => {
    const v = values[c.id];
    return v !== '' && (!Number.isInteger(Number(v)) || Number(v) < 0 || Number(v) > c.maxScore);
  };
  const invalid = criteria.some(outOfRange);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{team.name}</CardTitle>
        <CardDescription>{team.members.join(', ')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(undefined);
          }}
        >
          {criteria.map((c) => (
            <div key={c.id} className="grid gap-2">
              <div className="grid gap-0.5">
                <Label htmlFor={`${team.id}-${c.id}`}>
                  {c.name} (0–{c.maxScore})
                </Label>
                {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
              </div>
              <div className="flex gap-2">
                <Input
                  id={`${team.id}-${c.id}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={c.maxScore}
                  className="w-24 shrink-0 text-center tabular-nums"
                  aria-invalid={outOfRange(c) || undefined}
                  value={values[c.id]}
                  onChange={(e) => setValues({ ...values, [c.id]: e.target.value })}
                />
                <Input
                  aria-label={`Comment on ${c.name}`}
                  placeholder="Comment (optional)"
                  value={comments[c.id]}
                  onChange={(e) => setComments({ ...comments, [c.id]: e.target.value })}
                />
              </div>
            </div>
          ))}
          <ErrorText error={save.error} />
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={invalid || save.isPending}>
              Save scores
            </Button>
            {save.isSuccess && (
              <p role="status" className="flex items-center gap-1 text-sm text-success">
                <CheckIcon className="size-4" aria-hidden />
                Saved.
              </p>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
