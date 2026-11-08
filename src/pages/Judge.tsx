import type { Schemas } from '@eventkit/sdk';
import { useCriteria, useEventMutation, useJudgingTeams, useRounds } from '@eventkit/sdk/react';
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, LockIcon } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { ErrorText } from '@/components/ErrorText';
import { RoundPicker } from '@/components/RoundPicker';
import { ScoreBreakdownView } from '@/components/ScoreBreakdown';
import { SearchInput } from '@/components/SearchInput';
import { CardsSkeleton } from '@/components/Skeletons';
import { StaffOnly } from '@/components/StaffOnly';
import { TeamSubmission } from '@/components/TeamSubmission';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useListFilter } from '@/hooks/useListFilter';
import { useRoundChoice } from '@/lib/rounds';
import { useWho } from '@/lib/staff';
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
      <RoundTeams
        key={roundId}
        roundId={roundId}
        closed={rounds.data.find((r) => r.id === roundId)?.phase === 'closed'}
      />
    </div>
  );
}

function RoundTeams({ roundId, closed }: { roundId: string; closed: boolean }) {
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
  return (
    <TeamWorkspace teams={teams.data} criteria={criteria.data} roundId={roundId} closed={closed} />
  );
}

type Progress = 'done' | 'partial' | 'todo';

/** How much of the rubric this judge has saved for a team. */
function progressOf(team: Schemas['JudgingTeam'], criteria: Schemas['Criterion'][]): Progress {
  const ids = new Set(team.myScores.map((s) => s.criterionId));
  const saved = criteria.filter((c) => ids.has(c.id)).length;
  return saved === 0 ? 'todo' : saved === criteria.length ? 'done' : 'partial';
}

const teamText = (t: Schemas['JudgingTeam']) => [t.name, ...t.members];

/**
 * Teams as tiles (searchable, filtered by how far you got) beside the chosen
 * team: score it, read its submission, and once the round is closed read every
 * judge's review. On phones the list and the team take turns. The team is in
 * the URL, so a reload stays on it; score cards a judge opened stay mounted
 * (hidden), so unsaved scores survive switching away.
 */
function TeamWorkspace({
  teams,
  criteria,
  roundId,
  closed,
}: {
  teams: Schemas['JudgingTeam'][];
  criteria: Schemas['Criterion'][];
  roundId: string;
  closed: boolean;
}) {
  const who = useWho();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState('score');
  const search = useListFilter(teams, teamText);
  const fromUrl = teams.find((t) => t.id === params.get('team'));
  const firstOpen = teams.find((t) => progressOf(t, criteria) !== 'done') ?? teams[0]!;
  const current = fromUrl ?? firstOpen;
  const index = teams.indexOf(current);
  const [opened, setOpened] = useState(() => new Set([current.id]));
  if (!opened.has(current.id)) setOpened(new Set(opened).add(current.id));
  const canReview = who.role === 'admin' || closed;

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
  const back = () =>
    setParams(
      (p) => {
        p.delete('team');
        return p;
      },
      { replace: true },
    );
  const done = teams.filter((t) => progressOf(t, criteria) === 'done').length;
  const prev = teams[index - 1];
  const next = teams[index + 1];

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-start">
      {/* The team list: on phones only until a team is picked. */}
      <section
        aria-label="Teams"
        className={cn('grid gap-3 lg:sticky lg:top-20', fromUrl && 'hidden lg:grid')}
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-medium">Teams</h2>
          <p className="text-xs text-muted-foreground tabular-nums">
            {done} of {teams.length} scored
          </p>
        </div>
        <SearchInput
          label="Search teams"
          placeholder="Search teams"
          value={search.query}
          onChange={search.setQuery}
          className="sm:max-w-none"
        />
        {search.filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No team matches.</p>
        ) : (
          <RadioGroup
            aria-label="Pick a team"
            value={fromUrl?.id ?? ''}
            onValueChange={go}
            className="gap-0.5 rounded-xl border bg-card/80 p-1"
          >
            {search.filtered.map((t) => (
              <Label
                key={t.id}
                htmlFor={`team-${t.id}`}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 font-normal transition-colors hover:bg-accent/60',
                  'has-[[data-state=checked]]:bg-accent has-[[data-state=checked]]:font-medium',
                  !fromUrl && t.id === current.id && 'lg:bg-accent lg:font-medium',
                )}
              >
                <RadioGroupItem id={`team-${t.id}`} value={t.id} className="sr-only" />
                <span className="min-w-0 flex-1 wrap-anywhere">{t.name}</span>
                <ProgressMark progress={progressOf(t, criteria)} />
              </Label>
            ))}
          </RadioGroup>
        )}
      </section>

      {/* The chosen team: on phones only once picked; on wide screens always. */}
      <section
        aria-label={current.name}
        className={cn('grid min-w-0 gap-4', !fromUrl && 'hidden lg:grid')}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" size="sm" className="-ml-2 lg:hidden" onClick={back}>
            <ChevronLeftIcon aria-hidden /> All teams
          </Button>
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Team {index + 1} of {teams.length}
          </p>
        </div>
        <div className="grid gap-2">
          <h2 className="font-display text-2xl leading-tight wrap-anywhere">{current.name}</h2>
          <p className="text-sm text-muted-foreground">
            {current.members.length} {current.members.length === 1 ? 'member' : 'members'}
          </p>
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full sm:w-fit">
            <TabsTrigger value="score" className="flex-1 sm:flex-none">
              Score
            </TabsTrigger>
            <TabsTrigger value="submission" className="flex-1 sm:flex-none">
              Submission
            </TabsTrigger>
            <TabsTrigger value="reviews" className="flex-1 sm:flex-none">
              Reviews
            </TabsTrigger>
          </TabsList>
          {/* Kept mounted (hidden) so unsaved scores survive switching tabs. */}
          <TabsContent value="score" forceMount className="data-[state=inactive]:hidden">
            {teams
              .filter((t) => opened.has(t.id))
              .map((t) => (
                <div key={t.id} hidden={t.id !== current.id}>
                  <ScoreCard
                    team={t}
                    criteria={criteria}
                    roundId={roundId}
                    onNext={next && t.id === current.id ? () => go(next.id) : undefined}
                  />
                </div>
              ))}
          </TabsContent>
          <TabsContent value="submission">
            <TeamSubmission key={current.id} teamId={current.id} roundId={roundId} />
          </TabsContent>
          <TabsContent value="reviews">
            {canReview ? (
              <ScoreBreakdownView key={current.id} teamId={current.id} roundId={roundId} />
            ) : (
              <Alert>
                <LockIcon />
                <AlertTitle>Reviews open when the round closes</AlertTitle>
                <AlertDescription>
                  Every judge’s marks and remarks show here once the organisers close this round, so
                  scoring stays independent.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
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
      </section>
    </div>
  );
}

const PROGRESS: Record<Progress, string> = {
  done: 'Scored',
  partial: 'Partly scored',
  todo: 'Not scored',
};

function ProgressMark({ progress }: { progress: Progress }) {
  if (progress === 'done') {
    return <CheckIcon aria-label={PROGRESS.done} className="size-4 shrink-0 text-success" />;
  }
  return (
    <span
      className={cn(
        'shrink-0 text-xs',
        progress === 'partial' ? 'text-primary' : 'text-muted-foreground',
      )}
    >
      {PROGRESS[progress]}
    </span>
  );
}

function ScoreCard({
  team,
  criteria,
  roundId,
  onNext,
}: {
  roundId: string;
  team: Schemas['JudgingTeam'];
  criteria: Schemas['Criterion'][];
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
      <CardHeader className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="grid min-w-0 gap-1">
          <CardTitle className="text-base">Your scores</CardTitle>
          <CardDescription>
            {scored.length} of {criteria.length} criteria scored
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
