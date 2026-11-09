import { formatIST, type PollAnswerInput, type Schemas } from '@eventkit/sdk';
import {
  useEventMutation,
  useEventQuery,
  useMyPolls,
  usePortalMutation,
} from '@eventkit/sdk/react';
import { CheckIcon, InfoIcon, VoteIcon } from 'lucide-react';
import { useState } from 'react';
import { ErrorText } from '@/components/ErrorText';
import { CardsSkeleton } from '@/components/Skeletons';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useWho } from '@/lib/staff';
import { cn } from '@/lib/utils';
import { ConfirmedOnly } from '@/components/ConfirmedOnly';
import { PollSetCard, type SetAnswer } from '@/components/PollSetCard';

type Poll = Schemas['Poll'];
type Vote = { poll: string; answer: PollAnswerInput };
type Answer = { optionId?: string; optionIds?: string[]; value?: string | number };

const isChoice = (t: Poll['type']) => t === 'choice' || t === 'dropdown';

/** Polls: a participant's (through their link) or staff's, for the roles each poll is for. */
export function Polls() {
  const who = useWho();
  if (who.kind === 'participant')
    return (
      <ConfirmedOnly what="Polls">
        <ParticipantPolls />
      </ConfirmedOnly>
    );
  if (who.kind) return <StaffPolls />;
  return (
    <Alert>
      <InfoIcon />
      <AlertDescription className="block text-foreground">
        Open your personal link to see polls.
      </AlertDescription>
    </Alert>
  );
}

type SetVote = { group: string; answers: SetAnswer[] };
type SetMutation = {
  mutate: (v: SetVote) => void;
  isPending: boolean;
  isSuccess: boolean;
  error: unknown;
  variables?: SetVote;
};

function ParticipantPolls() {
  const polls = useMyPolls();
  const vote = usePortalMutation((portal, v: Vote) => portal.me.polls.vote(v.poll, v.answer));
  const answerSet = usePortalMutation((portal, v: SetVote) =>
    portal.me.polls.answerGroup(v.group, v.answers),
  );
  return (
    <PollList polls={polls.data} error={polls.error ?? vote.error} vote={vote} sets={answerSet} />
  );
}

function StaffPolls() {
  // Results move while people vote: check every 15 s.
  const polls = useEventQuery('polls', (e) => e.polls.list(), { refetchInterval: 15_000 });
  const vote = useEventMutation((e, v: Vote) => e.polls.vote(v.poll, v.answer));
  const answerSet = useEventMutation((e, v: SetVote) => e.polls.groups.answer(v.group, v.answers));
  return (
    <PollList polls={polls.data} error={polls.error ?? vote.error} vote={vote} sets={answerSet} />
  );
}

function PollList({
  polls,
  error,
  vote,
  sets,
}: {
  polls: Poll[] | undefined;
  error: unknown;
  vote: { mutate: (v: Vote) => void; isPending: boolean; variables?: Vote };
  sets: SetMutation;
}) {
  if (!polls && !error) return <CardsSkeleton label="Loading polls" />;
  // Open polls you can still vote in first, then the rest.
  const sorted = [...(polls ?? [])].sort(
    (a, b) => Number(!a.canVote || a.closed) - Number(!b.canVote || b.closed),
  );
  // A set's questions show together, where its first question would have been.
  const seen = new Set<string>();
  type Item = { kind: 'poll'; poll: Poll } | { kind: 'set'; id: string; questions: Poll[] };
  const items = sorted.flatMap((p): Item[] => {
    if (!p.group) return [{ kind: 'poll', poll: p }];
    if (seen.has(p.group.id)) return [];
    seen.add(p.group.id);
    const questions = sorted
      .filter((q) => q.group?.id === p.group!.id)
      .sort((a, b) => a.group!.position - b.group!.position);
    return [{ kind: 'set', id: p.group.id, questions }];
  });
  return (
    <section aria-label="Polls" className="grid gap-4">
      <ErrorText error={error} />
      {polls?.length === 0 && (
        <div className="grid justify-items-center gap-2 rounded-xl border border-dashed bg-card/70 p-8 text-center">
          <VoteIcon className="size-6 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">No polls right now.</p>
        </div>
      )}
      {items.map((item) => {
        if (item.kind === 'set') {
          const mine = sets.variables?.group === item.id;
          return (
            <PollSetCard
              key={item.id}
              questions={item.questions}
              pending={sets.isPending && mine}
              error={mine ? sets.error : null}
              saved={sets.isSuccess && mine}
              onSubmit={(answers) => sets.mutate({ group: item.id, answers })}
            />
          );
        }
        const p = item.poll;
        return (
          <PollCard
            key={p.id}
            poll={p}
            pending={vote.isPending && vote.variables?.poll === p.id}
            pendingOption={
              vote.isPending &&
              vote.variables?.poll === p.id &&
              typeof vote.variables.answer === 'string'
                ? vote.variables.answer
                : null
            }
            onVote={(answer) => vote.mutate({ poll: p.id, answer })}
          />
        );
      })}
    </section>
  );
}

function PollCard({
  poll: p,
  pending,
  pendingOption,
  onVote,
}: {
  poll: Poll;
  pending: boolean;
  pendingOption: string | null;
  onVote: (answer: PollAnswerInput) => void;
}) {
  const showResults = p.totalVotes !== null;
  const chosen = pendingOption ?? p.myVote;
  const options = [...p.options].sort((a, b) => a.position - b.position);
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle id={`${p.id}-question`} className="flex flex-wrap items-center gap-2 text-base">
          {p.question}
          {p.closed && <Badge variant="secondary">Closed</Badge>}
        </CardTitle>
        <CardDescription>
          {showResults && `${p.totalVotes} ${p.totalVotes === 1 ? 'vote' : 'votes'} · `}
          {p.closed
            ? p.myVote
              ? 'Voting has closed. Your vote is marked.'
              : 'Voting has closed.'
            : !p.canVote
              ? 'This poll is not for your role.'
              : p.closesAt
                ? `Closes ${formatIST(p.closesAt)}. You can change your ${isChoice(p.type) ? 'vote' : 'answer'} until then.`
                : `You can change your ${isChoice(p.type) ? 'vote' : 'answer'} until it closes.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isChoice(p.type) ? (
          <div role="radiogroup" aria-labelledby={`${p.id}-question`} className="grid gap-2">
            {options.map((o) => {
              const picked = chosen === o.id;
              const share =
                showResults && p.totalVotes ? Math.round(((o.votes ?? 0) / p.totalVotes) * 100) : 0;
              return (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={picked}
                  disabled={!p.canVote || pending}
                  onClick={() => !picked && onVote(o.id)}
                  className={cn(
                    'relative isolate flex items-center gap-3 overflow-hidden rounded-lg border bg-background/60 px-3 py-2.5 text-left text-sm transition-colors',
                    'enabled:hover:border-primary/40 enabled:active:scale-[0.99] disabled:cursor-default',
                    'focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
                    picked && 'border-primary/60',
                  )}
                >
                  {showResults && (
                    <span
                      aria-hidden
                      className={cn(
                        'absolute inset-y-0 left-0 -z-10 transition-[width] duration-300',
                        picked ? 'bg-primary/20' : 'bg-secondary/70',
                      )}
                      style={{ width: `${share}%` }}
                    />
                  )}
                  <span
                    aria-hidden
                    className={cn(
                      'grid size-5 shrink-0 place-items-center rounded-full border',
                      picked ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
                    )}
                  >
                    {picked && <CheckIcon className="size-3.5" />}
                  </span>
                  <span className="min-w-0 flex-1 wrap-anywhere">{o.label}</span>
                  {showResults && (
                    <span className="text-muted-foreground tabular-nums">
                      {o.votes} · {share}%
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <OtherAnswer poll={p} pending={pending} onVote={onVote} />
        )}
        {isChoice(p.type) && p.options.length === 0 && (
          <p className="text-sm text-muted-foreground">No options yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

/** Multi-select, text, number, date-time and rating polls: an answer, then Save. */
function OtherAnswer({
  poll: p,
  pending,
  onVote,
}: {
  poll: Poll;
  pending: boolean;
  onVote: (answer: Answer) => void;
}) {
  const mine = p.myAnswer;
  const [many, setMany] = useState<string[]>(mine?.optionIds ?? []);
  const [text, setText] = useState(() => {
    const v = mine?.value;
    if (v === null || v === undefined) return '';
    // date-time-local wants "YYYY-MM-DDTHH:mm" in IST.
    return p.type === 'datetime' && typeof v === 'string' ? toIstInput(v) : String(v);
  });
  const showResults = p.totalVotes !== null;
  const locked = !p.canVote || pending;

  if (p.type === 'multi_choice') {
    const options = [...p.options].sort((a, b) => a.position - b.position);
    const changed = [...many].sort().join() !== [...(mine?.optionIds ?? [])].sort().join();
    return (
      <div className="grid gap-3">
        <div role="group" aria-label={p.question} className="grid gap-2">
          {options.map((o) => {
            const on = many.includes(o.id);
            const share =
              showResults && p.totalVotes ? Math.round(((o.votes ?? 0) / p.totalVotes) * 100) : 0;
            return (
              <button
                key={o.id}
                type="button"
                role="checkbox"
                aria-checked={on}
                disabled={locked}
                onClick={() => setMany((m) => (on ? m.filter((x) => x !== o.id) : [...m, o.id]))}
                className={cn(
                  'relative isolate flex items-center gap-3 overflow-hidden rounded-lg border bg-background/60 px-3 py-2.5 text-left text-sm transition-colors',
                  'enabled:hover:border-primary/40 disabled:cursor-default',
                  'focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
                  on && 'border-primary/60',
                )}
              >
                {showResults && (
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 -z-10 bg-secondary/70"
                    style={{ width: `${share}%` }}
                  />
                )}
                <span
                  aria-hidden
                  className={cn(
                    'grid size-5 shrink-0 place-items-center rounded-md border',
                    on ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
                  )}
                >
                  {on && <CheckIcon className="size-3.5" />}
                </span>
                <span className="min-w-0 flex-1 wrap-anywhere">{o.label}</span>
                {showResults && (
                  <span className="text-muted-foreground tabular-nums">{o.votes}</span>
                )}
              </button>
            );
          })}
        </div>
        {p.canVote && (
          <Button
            className="justify-self-start"
            disabled={locked || many.length === 0 || !changed}
            onClick={() => onVote({ optionIds: many })}
          >
            {mine ? 'Change answer' : 'Save answer'}
          </Button>
        )}
      </div>
    );
  }

  const scale = Array.from({ length: p.scaleMax ?? 5 }, (_, i) => i + 1);
  const value =
    p.type === 'number' || p.type === 'rating'
      ? Number(text)
      : p.type === 'datetime'
        ? `${text}+05:30`
        : text.trim();
  return (
    <div className="grid gap-3">
      {p.canVote && (
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            onVote({ value });
          }}
        >
          {p.type === 'rating' ? (
            <div role="radiogroup" aria-label={p.question} className="flex flex-wrap gap-2">
              {scale.map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={text === String(n)}
                  disabled={locked}
                  onClick={() => setText(String(n))}
                  className={cn(
                    'grid size-11 place-items-center rounded-lg border text-base tabular-nums transition-colors',
                    'focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
                    text === String(n)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'bg-background/60 enabled:hover:border-primary/40',
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          ) : p.type === 'long_text' ? (
            <Textarea
              aria-label={p.question}
              rows={4}
              maxLength={5000}
              disabled={locked}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          ) : (
            <Input
              aria-label={p.question}
              type={
                p.type === 'number' ? 'number' : p.type === 'datetime' ? 'datetime-local' : 'text'
              }
              inputMode={p.type === 'number' ? 'decimal' : undefined}
              maxLength={p.type === 'short_text' ? 1000 : undefined}
              disabled={locked}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          )}
          <Button type="submit" className="justify-self-start" disabled={locked || !text.trim()}>
            {mine ? 'Change answer' : 'Save answer'}
          </Button>
        </form>
      )}
      {!p.canVote && mine?.value != null && (
        <p className="text-sm text-muted-foreground">
          Your answer:{' '}
          <span className="text-foreground wrap-anywhere">
            {p.type === 'datetime' ? formatIST(String(mine.value)) : String(mine.value)}
          </span>
        </p>
      )}
      {p.stats && (
        <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          {(
            [
              ['Answers', p.stats.count],
              ['Average', p.stats.average],
              ['Lowest', p.stats.min],
              ['Highest', p.stats.max],
            ] as const
          ).map(([label, v]) => (
            <div key={label} className="rounded-lg border bg-background/60 p-2">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="font-medium tabular-nums">{v ?? '—'}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

/** An ISO date-time as a datetime-local value in IST. */
function toIstInput(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 330 * 60_000);
  return d.toISOString().slice(0, 16);
}
