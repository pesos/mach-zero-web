import { formatIST, type Schemas } from '@eventkit/sdk';
import {
  useEventMutation,
  useEventQuery,
  useMyPolls,
  usePortalMutation,
} from '@eventkit/sdk/react';
import { CheckIcon, InfoIcon, VoteIcon } from 'lucide-react';
import { ErrorText } from '@/components/ErrorText';
import { CardsSkeleton } from '@/components/Skeletons';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useWho } from '@/lib/staff';
import { cn } from '@/lib/utils';

type Poll = Schemas['Poll'];
type Vote = { poll: string; option: string };

/** Polls: a participant's (through their link) or staff's, for the roles each poll is for. */
export function Polls() {
  const who = useWho();
  if (who.kind === 'participant') return <ParticipantPolls />;
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

function ParticipantPolls() {
  const polls = useMyPolls();
  const vote = usePortalMutation((portal, v: Vote) => portal.me.polls.vote(v.poll, v.option));
  return <PollList polls={polls.data} error={polls.error ?? vote.error} vote={vote} />;
}

function StaffPolls() {
  // Results move while people vote: check every 15 s.
  const polls = useEventQuery('polls', (e) => e.polls.list(), { refetchInterval: 15_000 });
  const vote = useEventMutation((e, v: Vote) => e.polls.vote(v.poll, v.option));
  return <PollList polls={polls.data} error={polls.error ?? vote.error} vote={vote} />;
}

function PollList({
  polls,
  error,
  vote,
}: {
  polls: Poll[] | undefined;
  error: unknown;
  vote: { mutate: (v: Vote) => void; isPending: boolean; variables?: Vote };
}) {
  if (!polls && !error) return <CardsSkeleton label="Loading polls" />;
  // Open polls you can still vote in first, then the rest.
  const sorted = [...(polls ?? [])].sort(
    (a, b) => Number(!a.canVote || a.closed) - Number(!b.canVote || b.closed),
  );
  return (
    <section aria-label="Polls" className="grid gap-4">
      <ErrorText error={error} />
      {polls?.length === 0 && (
        <div className="grid justify-items-center gap-2 rounded-xl border border-dashed bg-card/70 p-8 text-center">
          <VoteIcon className="size-6 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">No polls right now.</p>
        </div>
      )}
      {sorted.map((p) => (
        <PollCard
          key={p.id}
          poll={p}
          pending={vote.isPending && vote.variables?.poll === p.id ? vote.variables.option : null}
          onVote={(option) => vote.mutate({ poll: p.id, option })}
        />
      ))}
    </section>
  );
}

function PollCard({
  poll: p,
  pending,
  onVote,
}: {
  poll: Poll;
  pending: string | null;
  onVote: (optionId: string) => void;
}) {
  const showResults = p.totalVotes !== null;
  const chosen = pending ?? p.myVote;
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
                ? `Closes ${formatIST(p.closesAt)}. You can change your vote until then.`
                : 'You can change your vote until it closes.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
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
                disabled={!p.canVote || pending !== null}
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
                <span className="flex-1">{o.label}</span>
                {showResults && (
                  <span className="text-muted-foreground tabular-nums">
                    {o.votes} · {share}%
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {p.options.length === 0 && <p className="text-sm text-muted-foreground">No options yet.</p>}
      </CardContent>
    </Card>
  );
}
