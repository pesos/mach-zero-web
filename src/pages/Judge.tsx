import type { Schemas } from '@eventkit/sdk';
import { useEventMutation, useEventQuery } from '@eventkit/sdk/react';
import { useState } from 'react';
import { ErrorText } from '@/components/ErrorText';
import { StaffOnly } from '@/components/StaffOnly';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

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
  if (criteria.isPending || teams.isPending)
    return <p className="text-muted-foreground">Loading…</p>;
  if (criteria.isError || teams.isError) return <ErrorText error={criteria.error ?? teams.error} />;
  if (criteria.data.length === 0) {
    return <p className="text-muted-foreground">The organisers have not set the rubric yet.</p>;
  }
  if (teams.data.length === 0) {
    return (
      <p className="text-muted-foreground">
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
  const invalid = criteria.some((c) => {
    const v = values[c.id];
    return v !== '' && (!Number.isInteger(Number(v)) || Number(v) < 0 || Number(v) > c.maxScore);
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>{team.name}</CardTitle>
        <CardDescription>{team.members.join(', ')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(undefined);
          }}
        >
          {criteria.map((c) => (
            <div key={c.id} className="grid gap-1">
              <label htmlFor={`${team.id}-${c.id}`} className="text-sm font-medium">
                {c.name} (0–{c.maxScore})
              </label>
              {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
              <div className="flex gap-2">
                <Input
                  id={`${team.id}-${c.id}`}
                  type="number"
                  min={0}
                  max={c.maxScore}
                  className="w-24"
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
          {save.isSuccess && (
            <p role="status" className="text-sm text-muted-foreground">
              Saved.
            </p>
          )}
          <div>
            <Button type="submit" disabled={invalid || save.isPending}>
              Save scores
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
