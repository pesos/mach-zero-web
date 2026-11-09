import {
  type Draft,
  fieldErrors,
  formatIST,
  isEventKitError,
  type Schemas,
  toAnswers,
  toDraft,
} from '@eventkit/sdk';
import { useMySubmissions, usePortalMutation, useSubmissions } from '@eventkit/sdk/react';
import { CheckIcon, FileTextIcon, InfoIcon, LockIcon, PlusIcon } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { ErrorText } from '@/components/ErrorText';
import { FeedTabs, groupCounts } from '@/components/FeedTabs';
import { FieldInputs } from '@/components/FieldInputs';
import { CardsSkeleton } from '@/components/Skeletons';
import { StaffOnly } from '@/components/StaffOnly';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { hasCode } from '@/lib/eventkit';
import { OpensOnEventDay } from '@/components/OpensOnEventDay';
import { useActivitiesOpen } from '@/lib/event-day';
import { useWho } from '@/lib/staff';
import { cn } from '@/lib/utils';
import { Markdown } from '@/components/Markdown';
import { ConfirmedOnly } from '@/components/ConfirmedOnly';
import { AnswerValue, SubmissionEntries } from './SubmissionEntries';

type Field = Schemas['PortalSubmission']['fields'][number];
/** The form helpers expect a scope, which submission forms do not have. */
const asFields = (fields: Field[]) => fields.map((f) => ({ ...f, scope: 'team' as const }));

/** What a team hands in per round: participants fill the forms, judges and admins read them. */
export function Submissions() {
  const who = useWho();
  if (who.kind === 'participant')
    return (
      <ConfirmedOnly what="Submissions">
        <ParticipantSubmissions />
      </ConfirmedOnly>
    );
  if (who.kind) {
    return (
      <StaffOnly allowed="review">
        <StaffSubmissions />
      </StaffOnly>
    );
  }
  return (
    <Alert>
      <InfoIcon />
      <AlertDescription className="block text-foreground">
        Open your personal link to see your submissions.
      </AlertDescription>
    </Alert>
  );
}

function Empty() {
  return (
    <div className="grid justify-items-center gap-2 rounded-xl border border-dashed bg-card/70 p-8 text-center">
      <FileTextIcon className="size-6 text-muted-foreground" aria-hidden />
      <h2 className="font-semibold">No submissions yet</h2>
      <p className="text-sm text-muted-foreground">
        They appear here once the organisers open a round.
      </p>
    </div>
  );
}

function ParticipantSubmissions() {
  const day = useActivitiesOpen();
  if (!day.open) return <OpensOnEventDay what="Submissions" from={day.from} />;
  return <ParticipantSubmissionList />;
}

function ParticipantSubmissionList() {
  const subs = useMySubmissions();
  if (subs.isPending) return <CardsSkeleton label="Loading your submissions" count={2} />;
  if (subs.isError) return <ErrorText error={subs.error} />;
  if (subs.data.length === 0) return <Empty />;
  const all = subs.data;
  return (
    <FeedTabs
      total={all.length}
      filter="Open"
      groups={{
        label: 'Rounds',
        menuLabel: 'Show a round',
        items: groupCounts(all, (s) => s.round),
      }}
    >
      {(view) =>
        view.kind === 'all' ? (
          <ByRound items={all} />
        ) : view.kind === 'filter' ? (
          <ByRound items={all.filter((s) => s.open)} empty="Nothing open right now." />
        ) : (
          all
            .filter((s) => s.round.id === view.id)
            .map((s) => <SubmissionCard key={s.id} submission={s} />)
        )
      }
    </FeedTabs>
  );
}

/** Submissions under a heading per round, in the order they came. */
function ByRound({ items, empty }: { items: Schemas['PortalSubmission'][]; empty?: string }) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed bg-card/70 p-8 text-center text-sm text-muted-foreground">
        {empty}
      </p>
    );
  }
  const rounds = new Map<string, { name: string; items: typeof items }>();
  for (const s of items) {
    const group = rounds.get(s.round.id) ?? { name: s.round.name, items: [] };
    group.items.push(s);
    rounds.set(s.round.id, group);
  }
  return [...rounds.entries()].map(([id, round]) => (
    <section key={id} aria-label={round.name} className="grid gap-4">
      <h2 className="font-display text-lg">{round.name}</h2>
      {round.items.map((s) => (
        <SubmissionCard key={s.id} submission={s} />
      ))}
    </section>
  ));
}

function saveMessage(error: unknown): string | undefined {
  if (hasCode(error, 'ROUND_CLOSED'))
    return 'This round is closed, so it takes no more submissions.';
  if (hasCode(error, 'SUBMISSION_CLOSED')) return 'This submission has closed.';
  if (hasCode(error, 'ALREADY_SUBMITTED'))
    return 'Your team has already submitted. Ask the organisers if something needs changing.';
  if (hasCode(error, 'TEAM_ELIMINATED')) return 'Your team didn’t go on to this round.';
  if (hasCode(error, 'REGISTRATION_CANCELLED')) {
    return 'Your registration is cancelled, so you cannot submit.';
  }
  return undefined;
}

function SubmissionCard({ submission: s }: { submission: Schemas['PortalSubmission'] }) {
  const blank = () => toDraft(undefined, s.fields);
  const [draft, setDraft] = useState<Draft>(blank);
  // A team that already sent one opens the form again only on purpose.
  const [another, setAnother] = useState(false);
  const save = usePortalMutation(
    (portal, answers: Record<string, string | number | string[] | null>) =>
      portal.me.submissions.sendResponse(s.id, answers),
  );
  // When the card opened: whether the deadline had passed by then.
  const [openedAt] = useState(Date.now);
  const pastDeadline = s.deadline !== null && openedAt > Date.parse(s.deadline);
  const problems = isEventKitError(save.error, 'INVALID_ANSWERS')
    ? Object.values(fieldErrors(save.error))
    : [];
  const [latest, ...earlier] = s.responses;
  const showForm = s.canSubmit && (!latest || another);
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate(toAnswers(asFields(s.fields), draft), {
      onSuccess: () => {
        setAnother(false);
        setDraft(blank());
      },
    });
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base wrap-anywhere">
          {s.title}
          {s.eliminated ? (
            <Badge variant="secondary">Not in this round</Badge>
          ) : latest ? (
            <Badge className="bg-success text-white">
              <CheckIcon aria-hidden /> Submitted
            </Badge>
          ) : (
            !s.open && (
              <Badge variant="secondary">
                <LockIcon aria-hidden /> Closed
              </Badge>
            )
          )}
        </CardTitle>
        {s.description && (
          <CardDescription>
            <Markdown>{s.description}</Markdown>
          </CardDescription>
        )}
        {s.deadline && (
          <p className={cn('text-sm', pastDeadline ? 'text-destructive' : 'text-muted-foreground')}>
            {pastDeadline ? 'Deadline passed' : 'Due'} {formatIST(s.deadline)}
            {pastDeadline &&
              s.canSubmit &&
              (s.closesAt
                ? `: you can still submit until ${formatIST(s.closesAt)}, but it will be marked late.`
                : ': you can still submit, but it will be marked late.')}
          </p>
        )}
        {s.closesAt && s.open && !pastDeadline && (
          <p className="text-sm text-muted-foreground">Closes {formatIST(s.closesAt)}</p>
        )}
      </CardHeader>
      <CardContent className="grid gap-4">
        {latest && <SentResponse entry={latest} fields={s.fields} latest />}
        {earlier.length > 0 && (
          <Accordion type="single" collapsible className="rounded-lg border px-3">
            <AccordionItem value="earlier" className="border-b-0">
              <AccordionTrigger className="py-3 text-sm">
                Earlier responses ({earlier.length})
              </AccordionTrigger>
              <AccordionContent className="grid gap-3">
                {earlier.map((e) => (
                  <SentResponse key={e.id} entry={e} fields={s.fields} />
                ))}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
        {latest && !s.allowMultiple && s.open && (
          <p className="text-sm text-muted-foreground">
            Something wrong? Ask the organisers to remove it so your team can submit again.
          </p>
        )}
        {latest && s.canSubmit && !another && (
          <Button variant="outline" className="justify-self-start" onClick={() => setAnother(true)}>
            <PlusIcon aria-hidden /> Submit another response
          </Button>
        )}
        {!latest && s.eliminated && (
          <p className="text-sm text-muted-foreground">
            Your team didn’t go on to this round, so it can’t submit here.
          </p>
        )}
        {!latest && !s.eliminated && !s.open && (
          <p className="text-sm text-muted-foreground">Closed: no more submissions.</p>
        )}
        {showForm && (
          <form className="grid gap-4" onSubmit={onSubmit}>
            <fieldset disabled={save.isPending} className="grid gap-4 sm:grid-cols-2">
              <FieldInputs
                fields={asFields(s.fields)}
                value={draft}
                onChange={(d) => {
                  setDraft(d);
                  save.reset();
                }}
                prefix={`sub-${s.id}`}
              />
            </fieldset>
            <ErrorText error={save.error} message={saveMessage(save.error)} />
            {problems.length > 0 && (
              <ul className="list-disc pl-5 text-sm text-destructive">
                {problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            )}
            <p className="text-sm text-muted-foreground">
              {s.allowMultiple
                ? 'Once submitted, a response can’t be edited, but your team can send another.'
                : 'Your team submits once, and it can’t be edited afterwards. Check your answers first.'}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={save.isPending}>
                Submit
              </Button>
              {another && (
                <Button type="button" variant="ghost" onClick={() => setAnother(false)}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        )}
        {save.isSuccess && !showForm && (
          <Alert role="status">
            <CheckIcon />
            <AlertTitle>Submitted</AlertTitle>
            <AlertDescription>
              Your team’s response is in. The organisers can see it now.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

/** A response the team sent, read-only: when, by whom, and its answers. */
function SentResponse({
  entry: e,
  fields,
  latest = false,
}: {
  entry: Schemas['SubmissionEntry'];
  fields: Field[];
  latest?: boolean;
}) {
  return (
    <div className={cn('grid gap-3 rounded-lg border p-3', latest && 'bg-success/5')}>
      <p className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">
          {latest ? 'Submitted' : 'Sent'} {formatIST(e.createdAt)}
        </span>
        {e.submittedBy && <span className="text-muted-foreground">by {e.submittedBy.name}</span>}
        {e.late && <Badge variant="destructive">Late</Badge>}
      </p>
      <dl className="grid gap-3">
        {[...fields]
          .sort((a, b) => a.position - b.position)
          .map((f) => (
            <div key={f.id} className="grid gap-0.5">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {f.label}
              </dt>
              <dd className="min-w-0 text-sm">
                <AnswerValue field={f} value={e.answers[f.id]} />
              </dd>
            </div>
          ))}
      </dl>
    </div>
  );
}

function StaffSubmissions() {
  const subs = useSubmissions();
  if (subs.isPending) return <CardsSkeleton label="Loading submissions" count={2} />;
  if (subs.isError) return <ErrorText error={subs.error} />;
  if (subs.data.length === 0) return <Empty />;
  const all = subs.data;
  return (
    <FeedTabs
      total={all.length}
      groups={{
        label: 'Rounds',
        menuLabel: 'Show a round',
        items: groupCounts(all, (s) => s.round),
      }}
    >
      {(view) => (
        <div className="grid gap-4">
          {(view.kind === 'group' ? all.filter((s) => s.round.id === view.id) : all).map((s) => (
            <SubmissionEntries key={s.id} submission={s} />
          ))}
        </div>
      )}
    </FeedTabs>
  );
}
