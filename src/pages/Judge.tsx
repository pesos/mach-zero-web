import type { Schemas } from '@eventkit/sdk';
import { useCriteria, useEventMutation, useJudgingTeams, useRounds } from '@eventkit/sdk/react';
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
} from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { ErrorText } from '@/components/ErrorText';
import { RoundPicker } from '@/components/RoundPicker';
import { useRoundChoice } from '@/lib/rounds';
import { CardsSkeleton } from '@/components/Skeletons';
import { StaffOnly } from '@/components/StaffOnly';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
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
    return <CardsSkeleton label="Loading the teams" count={1} />;
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
  return <OneTeamAtATime teams={teams.data} criteria={criteria.data} roundId={roundId} />;
}

type Progress = 'done' | 'partial' | 'todo';

/** How much of the rubric this judge has saved for a team. */
function progressOf(team: Schemas['JudgingTeam'], criteria: Schemas['Criterion'][]): Progress {
  const ids = new Set(team.myScores.map((s) => s.criterionId));
  const saved = criteria.filter((c) => ids.has(c.id)).length;
  return saved === 0 ? 'todo' : saved === criteria.length ? 'done' : 'partial';
}

/**
 * One team on screen, picked from a searchable list or stepped through with
 * Previous / Next. The team is in the URL, so a reload stays on it. Cards a judge
 * has opened stay mounted (hidden), so unsaved scores survive switching away.
 */
function OneTeamAtATime({
  teams,
  criteria,
  roundId,
}: {
  teams: Schemas['JudgingTeam'][];
  criteria: Schemas['Criterion'][];
  roundId: string;
}) {
  const [params, setParams] = useSearchParams();
  const fromUrl = teams.find((t) => t.id === params.get('team'));
  const firstOpen = teams.find((t) => progressOf(t, criteria) !== 'done') ?? teams[0]!;
  const current = fromUrl ?? firstOpen;
  const index = teams.indexOf(current);
  const [opened, setOpened] = useState(() => new Set([current.id]));
  if (!opened.has(current.id)) setOpened(new Set(opened).add(current.id));

  const go = (id: string) => {
    setParams(
      (p) => {
        p.set('team', id);
        return p;
      },
      { replace: true },
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const done = teams.filter((t) => progressOf(t, criteria) === 'done').length;
  const prev = teams[index - 1];
  const next = teams[index + 1];

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor="team-search">Team</Label>
          <p className="text-xs text-muted-foreground tabular-nums">
            {done} of {teams.length} fully scored
          </p>
        </div>
        <TeamPicker teams={teams} criteria={criteria} value={current.id} onChange={go} />
        <Progress value={(done / teams.length) * 100} aria-label="Teams fully scored" />
      </div>

      {teams
        .filter((t) => opened.has(t.id))
        .map((t) => (
          <div key={t.id} hidden={t.id !== current.id}>
            <ScoreCard
              team={t}
              criteria={criteria}
              roundId={roundId}
              position={`${teams.indexOf(t) + 1} of ${teams.length}`}
              onNext={next && t.id === current.id ? () => go(next.id) : undefined}
            />
          </div>
        ))}

      <nav aria-label="Teams" className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={!prev}
          onClick={() => prev && go(prev.id)}
        >
          <ChevronLeftIcon aria-hidden />
          Previous
        </Button>
        <span className="text-sm text-muted-foreground tabular-nums">
          {index + 1} / {teams.length}
        </span>
        <Button
          type="button"
          variant="outline"
          disabled={!next}
          onClick={() => next && go(next.id)}
        >
          Next
          <ChevronRightIcon aria-hidden />
        </Button>
      </nav>
    </div>
  );
}

const PROGRESS: Record<Progress, { label: string; className: string }> = {
  done: { label: 'Scored', className: 'bg-success/15 text-success' },
  partial: { label: 'Partly scored', className: 'bg-primary/15 text-primary' },
  todo: { label: 'Not scored', className: 'bg-muted text-muted-foreground' },
};

function ProgressPill({ progress }: { progress: Progress }) {
  const { label, className } = PROGRESS[progress];
  return (
    <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', className)}>
      {label}
    </span>
  );
}

/**
 * The current team as a button; it opens a searchable list (by team or member
 * name). A tap outside, Escape or picking a team closes it.
 */
function TeamPicker({
  teams,
  criteria,
  value,
  onChange,
}: {
  teams: Schemas['JudgingTeam'][];
  criteria: Schemas['Criterion'][];
  value: string;
  onChange: (id: string) => void;
}) {
  const current = teams.find((t) => t.id === value)!;
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id="team-search"
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-11 w-full min-w-0 justify-between gap-2 px-3 text-base font-normal"
        >
          <span className="flex min-w-0 items-center gap-2">
            <SearchIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{current.name}</span>
          </span>
          <ChevronDownIcon
            aria-hidden
            className={cn('size-4 shrink-0 transition-transform', open && 'rotate-180')}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) max-w-[calc(100vw-2rem)] p-0"
      >
        <Command loop>
          <CommandInput placeholder="Search a team or member" aria-label="Search teams" />
          <CommandList className="max-h-[min(18rem,50dvh)]">
            <CommandEmpty>No team matches.</CommandEmpty>
            {teams.map((t) => (
              <CommandItem
                key={t.id}
                value={t.id}
                keywords={[t.name, ...t.members]}
                onSelect={() => {
                  onChange(t.id);
                  setOpen(false);
                }}
                className="justify-between gap-3 rounded-lg px-3 py-2"
              >
                <span className="grid min-w-0">
                  <span className="flex items-center gap-1.5 font-medium wrap-anywhere">
                    {t.id === value && (
                      <CheckIcon className="size-3.5 shrink-0 text-primary" aria-hidden />
                    )}
                    {t.name}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {t.members.join(', ')}
                  </span>
                </span>
                <ProgressPill progress={progressOf(t, criteria)} />
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function ScoreCard({
  team,
  criteria,
  roundId,
  position,
  onNext,
}: {
  roundId: string;
  team: Schemas['JudgingTeam'];
  criteria: Schemas['Criterion'][];
  position: string;
  onNext?: () => void;
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
    <Card className="relative gap-5 overflow-hidden pl-1">
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary to-lavender/40"
      />
      <CardHeader className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="grid min-w-0 gap-2">
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Team {position}
          </p>
          <CardTitle className="font-display text-2xl leading-tight break-words">
            {team.name}
          </CardTitle>
          <CardDescription className="flex flex-wrap gap-1.5">
            {team.members.map((m) => (
              <Badge key={m} variant="secondary" className="rounded-full font-normal">
                {m}
              </Badge>
            ))}
          </CardDescription>
        </div>
        <p
          className="grid justify-items-end rounded-xl bg-accent/60 px-4 py-2 text-sm text-muted-foreground tabular-nums"
          aria-label="Total"
        >
          <span>
            <span className="font-display text-3xl text-foreground">
              {scored.length ? total : '–'}
            </span>{' '}
            / {max}
          </span>
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
              <>
                <p role="status" className="flex items-center gap-1 text-sm text-success">
                  <CheckIcon className="size-4" aria-hidden />
                  Saved.
                </p>
                {onNext && (
                  <Button type="button" variant="outline" className="ml-auto" onClick={onNext}>
                    Next team
                    <ChevronRightIcon aria-hidden />
                  </Button>
                )}
              </>
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
        <div className="-mt-1 flex min-w-0 justify-between gap-0.5 px-0.5" aria-hidden>
          {ticks.map((n) => (
            <button
              key={n}
              type="button"
              tabIndex={-1}
              onClick={() => onChange(n)}
              className={cn(
                // Shrinks on narrow phones so eleven ticks (0–10) always fit.
                'grid aspect-square max-w-6 min-w-0 flex-1 basis-0 place-items-center rounded-full text-[0.7rem] tabular-nums transition-colors sm:text-xs',
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
