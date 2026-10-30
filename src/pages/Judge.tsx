import type { Schemas } from '@eventkit/sdk';
import { useCriteria, useEventMutation, useJudgingTeams, useRounds } from '@eventkit/sdk/react';
import { CheckIcon } from 'lucide-react';
import { useState } from 'react';
import { ErrorText } from '@/components/ErrorText';
import { RoundPicker } from '@/components/RoundPicker';
import { useRoundChoice } from '@/lib/rounds';
import { CardsSkeleton } from '@/components/Skeletons';
import { StaffOnly } from '@/components/StaffOnly';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

export function Judge() {
  return (
    <StaffOnly allowed="judge">
      <JudgePage />
    </StaffOnly>
  );
}

/** Judges (and admins) score teams with a checked-in member, round by round. */
function JudgePage() {
  const rounds = useRounds();
  const [roundId, setRoundId] = useRoundChoice(rounds.data ?? []);
  if (rounds.isPending) return <CardsSkeleton label="Loading the rounds" count={2} />;
  if (rounds.isError) return <ErrorText error={rounds.error} />;
  if (!roundId) {
    return (
      <p className="text-sm text-muted-foreground">The organisers have not set up a round yet.</p>
    );
  }
  return (
    <div className="grid gap-4">
      <RoundPicker rounds={rounds.data} value={roundId} onChange={setRoundId} />
      <RoundTeams key={roundId} roundId={roundId} />
    </div>
  );
}

function RoundTeams({ roundId }: { roundId: string }) {
  const criteria = useCriteria(roundId);
  const teams = useJudgingTeams(roundId);
  if (criteria.isPending || teams.isPending)
    return <CardsSkeleton label="Loading the teams" count={2} />;
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
  return teams.data.map((t) => (
    <ScoreCard key={t.id} team={t} criteria={criteria.data} roundId={roundId} />
  ));
}

function ScoreCard({
  team,
  criteria,
  roundId,
}: {
  roundId: string;
  team: Schemas['JudgingTeam'];
  criteria: Schemas['Criterion'][];
}) {
  const mine = new Map(team.myScores.map((s) => [s.criterionId, s]));
  // Null until the judge gives a score, so untouched criteria are not saved as 0.
  const [values, setValues] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(criteria.map((c) => [c.id, mine.get(c.id)?.value ?? null])),
  );
  const [comments, setComments] = useState<Record<string, string>>(() =>
    Object.fromEntries(criteria.map((c) => [c.id, mine.get(c.id)?.comment ?? ''])),
  );
  const save = useEventMutation((e) =>
    e.judging.saveScores(
      team.id,
      criteria
        .filter((c) => values[c.id] != null)
        .map((c) => ({
          criterionId: c.id,
          value: values[c.id]!,
          comment: comments[c.id]?.trim() || null,
        })),
      roundId,
    ),
  );
  const setScore = (id: string, value: number | null) => {
    if (value !== null && value !== values[id]) navigator.vibrate?.(8);
    setValues((v) => ({ ...v, [id]: value }));
    save.reset();
  };
  const scored = criteria.filter((c) => values[c.id] != null);
  const total = scored.reduce((sum, c) => sum + values[c.id]!, 0);
  const max = criteria.reduce((sum, c) => sum + c.maxScore, 0);
  return (
    <Card>
      <CardHeader className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="grid gap-1.5">
          <CardTitle>{team.name}</CardTitle>
          <CardDescription>{team.members.join(', ')}</CardDescription>
        </div>
        <p className="text-sm text-muted-foreground tabular-nums" aria-label="Total">
          <span className="font-display text-xl text-foreground">
            {scored.length ? total : '–'}
          </span>{' '}
          / {max}
        </p>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(undefined);
          }}
        >
          {criteria.map((c) => (
            <ScoreSlider
              key={c.id}
              id={`${team.id}-${c.id}`}
              criterion={c}
              value={values[c.id] ?? null}
              onChange={(v) => setScore(c.id, v)}
              comment={comments[c.id] ?? ''}
              onComment={(text) => {
                setComments({ ...comments, [c.id]: text });
                save.reset();
              }}
            />
          ))}
          <ErrorText error={save.error} />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={scored.length === 0 || save.isPending}>
              Save scores
            </Button>
            {save.isSuccess && (
              <p role="status" className="flex items-center gap-1 text-sm text-success">
                <CheckIcon className="size-4" aria-hidden />
                Saved.
              </p>
            )}
            {scored.length < criteria.length && !save.isSuccess && (
              <p className="text-xs text-muted-foreground">
                {criteria.length - scored.length} of {criteria.length} not scored yet
              </p>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/** Tap a number under the slider to jump straight to it, when the scale is short enough. */
const TICKS_UP_TO = 10;

function ScoreSlider({
  id,
  criterion: c,
  value,
  onChange,
  comment,
  onComment,
}: {
  id: string;
  criterion: Schemas['Criterion'];
  value: number | null;
  onChange: (value: number | null) => void;
  comment: string;
  onComment: (text: string) => void;
}) {
  const ticks =
    c.maxScore <= TICKS_UP_TO ? Array.from({ length: c.maxScore + 1 }, (_, i) => i) : [];
  return (
    <div className="grid gap-2">
      <div className="flex items-end justify-between gap-3">
        <div className="grid gap-0.5">
          <Label id={`${id}-label`}>{c.name}</Label>
          {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
        </div>
        <output
          htmlFor={id}
          aria-live="polite"
          className="shrink-0 text-sm text-muted-foreground tabular-nums"
        >
          <span
            className={cn('font-display text-2xl', value === null ? 'opacity-40' : 'text-primary')}
          >
            {value ?? '–'}
          </span>{' '}
          / {c.maxScore}
        </output>
      </div>
      <Slider
        id={id}
        min={0}
        max={c.maxScore}
        step={1}
        value={[value ?? 0]}
        onValueChange={([v]) => onChange(v!)}
        // A tap on the start of an unscored slider means 0: Radix sees no change there.
        onPointerDown={() => value === null && onChange(0)}
        thumbLabel={c.name}
        thumbValueText={value === null ? 'Not scored' : `${value} of ${c.maxScore}`}
        className={cn(
          value === null &&
            '[&_[data-slot=slider-range]]:opacity-0 [&_[data-slot=slider-thumb]]:border-muted-foreground/50',
        )}
      />
      {ticks.length > 0 && (
        <div className="-mt-1 flex justify-between px-0.5" aria-hidden>
          {ticks.map((n) => (
            <button
              key={n}
              type="button"
              tabIndex={-1}
              onClick={() => onChange(n)}
              className={cn(
                'grid size-6 place-items-center rounded-full text-xs tabular-nums transition-colors',
                n === value
                  ? 'bg-primary font-semibold text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              {n}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          aria-label={`Comment on ${c.name}`}
          placeholder="Comment (optional)"
          value={comment}
          onChange={(e) => onComment(e.target.value)}
        />
        {value !== null && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 self-center text-muted-foreground"
            onClick={() => onChange(null)}
            aria-label={`Clear ${c.name}`}
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
