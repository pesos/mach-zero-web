import { isEventKitError, type Schemas } from '@eventkit/sdk';
import {
  useEventQuery,
  useMyLeaderboard,
  useMyLeaderboardResults,
  useMyLeaderboards,
  useMySubmissions,
  usePortalInfo,
  useRounds,
  useSavedLeaderboardResults,
  useSavedLeaderboards,
} from '@eventkit/sdk/react';
import { type ReactNode, useState } from 'react';
import { EyeOffIcon, InfoIcon, TrophyIcon } from 'lucide-react';
import { ErrorText } from '@/components/ErrorText';
import { RoundPicker } from '@/components/RoundPicker';
import { useRoundChoice } from '@/lib/rounds';
import { ListSkeleton } from '@/components/Skeletons';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OpensOnEventDay } from '@/components/OpensOnEventDay';
import { useActivitiesOpen } from '@/lib/event-day';
import { useWho } from '@/lib/staff';
import { cn } from '@/lib/utils';
import { ConfirmedOnly } from '@/components/ConfirmedOnly';
import { SearchInput } from '@/components/SearchInput';
import { useListFilter } from '@/hooks/useListFilter';

/** Averages can be fractional: one decimal at most. */
const fmt = (n: number) => (Math.round(n * 10) / 10).toString();

/**
 * Team totals. Participants and volunteers see them once the organisers make
 * the leaderboard public; admins and judges always, with each criterion's average.
 */
export function Leaderboard() {
  const who = useWho();
  if (who.kind === 'participant')
    return (
      <ConfirmedOnly what="The leaderboard and results">
        <ParticipantBoard />
      </ConfirmedOnly>
    );
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
  const day = useActivitiesOpen();
  if (!day.open) return <OpensOnEventDay what="The leaderboard and results" from={day.from} />;
  return <ParticipantBoards roundsVisible={event.leaderboardVisible} />;
}

/** The organisers' public leaderboards (per track, top teams, overall), then each round's. */
function ParticipantBoards({ roundsVisible }: { roundsVisible: boolean }) {
  const saved = useMyLeaderboards();
  const [picked, setPicked] = useState<string | null>(null);
  const list = saved.data ?? [];
  const chosen = list.find((l) => l.id === picked)?.id ?? list[0]?.id ?? null;
  const results = useMyLeaderboardResults(chosen);
  if (saved.isPending && !roundsVisible)
    return <ListSkeleton label="Loading the leaderboards" rows={5} />;
  if (list.length === 0 && !roundsVisible)
    return saved.isError ? <ErrorText error={saved.error} /> : <NotYet />;
  return (
    <div className="grid gap-6">
      {list.length > 0 && (
        <SavedBoards
          list={list}
          value={chosen}
          onChange={setPicked}
          results={results.data}
          error={results.error}
        />
      )}
      {roundsVisible && <ParticipantRounds />}
    </div>
  );
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
  const allowed = who.canReview || event.leaderboardVisible;
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
      enabled: allowed && who.canReview && !rounds.isPending,
    },
    [roundId],
  );
  if (!allowed) return <StaffSaved fallback={<NotYet />} />;
  return (
    <div className="grid gap-6">
      <StaffSaved />
      <div className="grid gap-4">
        <RoundPicker rounds={rounds.data ?? []} value={roundId} onChange={setRoundId} />
        <Board
          board={board.data}
          error={board.error ?? criteria.error}
          criteria={who.canReview ? criteria.data : undefined}
        />
      </div>
    </div>
  );
}

/** The saved leaderboards this staff member may see, if any. */
function StaffSaved({ fallback = null }: { fallback?: ReactNode }) {
  const saved = useSavedLeaderboards();
  const [picked, setPicked] = useState<string | null>(null);
  const list = saved.data ?? [];
  const chosen = list.find((l) => l.id === picked)?.id ?? list[0]?.id ?? null;
  const results = useSavedLeaderboardResults(chosen);
  if (list.length === 0) return fallback;
  return (
    <SavedBoards
      list={list}
      value={chosen}
      onChange={setPicked}
      results={results.data}
      error={results.error}
    />
  );
}

const METHOD: Record<Schemas['SavedLeaderboard']['method'], string> = {
  sum: 'Totals added up',
  percent: 'Average % of each round',
  average: 'Average of the rounds',
};

/** A saved leaderboard, picked from the ones shown: its ranking over its rounds. */
function SavedBoards({
  list,
  value,
  onChange,
  results,
  error,
}: {
  list: Schemas['SavedLeaderboard'][];
  value: string | null;
  onChange: (id: string) => void;
  results: Schemas['LeaderboardResults'] | undefined;
  error: unknown;
}) {
  const lb = list.find((l) => l.id === value)!;
  const roundName = new Map(lb.rounds.map((r) => [r.round.id, r.round.name]));
  return (
    <Card>
      <CardHeader className="gap-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrophyIcon className="size-4 text-primary" />
          {lb.name}
        </CardTitle>
        {list.length > 1 && (
          <div className="grid gap-2 sm:max-w-xs">
            <Label htmlFor="saved-leaderboard">Leaderboard</Label>
            <Select value={lb.id} onValueChange={onChange}>
              <SelectTrigger id="saved-leaderboard" className="w-full min-w-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {list.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <CardDescription>
          {[
            lb.track?.name,
            lb.topN ? `Top ${lb.topN}` : null,
            lb.rounds.map((r) => r.round.name).join(' + '),
            lb.rounds.length > 1 ? METHOD[lb.method] : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ErrorText error={error} />
        {!results && !error && <ListSkeleton label="Loading the leaderboard" rows={5} />}
        {results?.entries.length === 0 && (
          <p className="text-sm text-muted-foreground">No scores yet.</p>
        )}
        {results && results.entries.length > 0 && (
          <ol aria-label={lb.name} className="grid divide-y">
            {results.entries.map((e) => (
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
                  <span className="font-medium wrap-anywhere">{e.team.name}</span>
                  {e.rounds.length > 1 && (
                    <span className="text-xs text-muted-foreground">
                      {e.rounds
                        .map(
                          (r) =>
                            `${roundName.get(r.roundId)} ${r.total === null ? '—' : fmt(r.total)}`,
                        )
                        .join(' · ')}
                    </span>
                  )}
                </span>
                <span className="ml-auto shrink-0 text-muted-foreground tabular-nums">
                  {fmt(e.total)}
                  {lb.method === 'percent' ? '%' : ` / ${fmt(e.maxTotal)}`}
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
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

const entryText = (e: Schemas['Leaderboard']['entries'][number]) => [e.team.name];

function Board({
  board,
  error,
  criteria,
}: {
  board: Schemas['Leaderboard'] | undefined;
  error: unknown;
  criteria?: Schemas['Criterion'][];
}) {
  const search = useListFilter(board?.entries ?? [], entryText);
  if (isEventKitError(error, 'LEADERBOARD_HIDDEN')) return <NotYet />;
  if (!board && !error) return <ListSkeleton label="Loading the leaderboard" rows={5} />;
  const names = new Map(criteria?.map((c) => [c.id, c.name]));
  const entries = search.filtered;
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
        {board && board.entries.length > 5 && (
          <SearchInput label="Search teams" value={search.query} onChange={search.setQuery} />
        )}
        {search.active && entries.length === 0 && (
          <p className="text-sm text-muted-foreground">No team matches.</p>
        )}
        {entries.length > 0 && (
          <ol aria-label="Leaderboard" className="grid divide-y">
            {entries.map((e) => (
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
                  <span className="font-medium wrap-anywhere">{e.team.name}</span>
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
