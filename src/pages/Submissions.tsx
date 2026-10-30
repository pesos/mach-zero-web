import {
  answerText,
  type Draft,
  fieldErrors,
  formatIST,
  isEventKitError,
  type Schemas,
  toAnswers,
  toDraft,
} from '@eventkit/sdk';
import {
  useMySubmissions,
  usePortalMutation,
  useSubmissionEntries,
  useSubmissions,
} from '@eventkit/sdk/react';
import { CheckIcon, FileTextIcon, InfoIcon, LockIcon } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { ErrorText } from '@/components/ErrorText';
import { FieldInputs } from '@/components/FieldInputs';
import { CardsSkeleton } from '@/components/Skeletons';
import { StaffOnly } from '@/components/StaffOnly';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { hasCode } from '@/lib/eventkit';
import { OpensOnEventDay } from '@/components/OpensOnEventDay';
import { useActivitiesOpen } from '@/lib/event-day';
import { useWho } from '@/lib/staff';
import { cn } from '@/lib/utils';

type Field = Schemas['PortalSubmission']['fields'][number];
/** The form helpers expect a scope, which submission forms do not have. */
const asFields = (fields: Field[]) => fields.map((f) => ({ ...f, scope: 'team' as const }));

/** What a team hands in per round: participants fill the forms, judges and admins read them. */
export function Submissions() {
  const who = useWho();
  if (who.kind === 'participant') return <ParticipantSubmissions />;
  if (who.kind) {
    return (
      <StaffOnly allowed="judge">
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
  const rounds = new Map<string, { name: string; items: typeof subs.data }>();
  for (const s of subs.data) {
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
    return 'This round is closed, so answers can no longer change.';
  if (hasCode(error, 'REGISTRATION_CANCELLED')) {
    return 'Your registration is cancelled, so you cannot submit.';
  }
  return undefined;
}

function SubmissionCard({ submission: s }: { submission: Schemas['PortalSubmission'] }) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(s.entry?.answers, s.fields));
  const save = usePortalMutation(
    (portal, answers: Record<string, string | number | string[] | null>) =>
      portal.me.submissions.saveEntry(s.id, answers),
  );
  // When the card opened: whether the deadline had passed by then.
  const [openedAt] = useState(Date.now);
  const pastDeadline = s.deadline !== null && openedAt > Date.parse(s.deadline);
  const problems = isEventKitError(save.error, 'INVALID_ANSWERS')
    ? Object.values(fieldErrors(save.error))
    : [];
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate(toAnswers(asFields(s.fields), draft));
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          {s.title}
          {!s.open && (
            <Badge variant="secondary">
              <LockIcon aria-hidden /> Closed
            </Badge>
          )}
        </CardTitle>
        {s.description && (
          <CardDescription className="whitespace-pre-line">{s.description}</CardDescription>
        )}
        {s.deadline && (
          <p className={cn('text-sm', pastDeadline ? 'text-destructive' : 'text-muted-foreground')}>
            {pastDeadline ? 'Deadline passed' : 'Due'} {formatIST(s.deadline)}
            {pastDeadline && s.open && ': you can still submit, but it will be marked late.'}
          </p>
        )}
        {s.entry && (
          <p className="text-xs text-muted-foreground">
            Submitted {formatIST(s.entry.createdAt)}
            {s.entry.updatedAt !== s.entry.createdAt &&
              ` · last saved ${formatIST(s.entry.updatedAt)}`}
            {s.entry.submittedBy && ` by ${s.entry.submittedBy.name}`}
            {s.entry.late && (
              <Badge variant="destructive" className="ml-2">
                Late
              </Badge>
            )}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <fieldset disabled={!s.open} className="grid gap-4 sm:grid-cols-2">
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
          {!s.open && (
            <p className="text-sm text-muted-foreground">
              Closed: answers can no longer be changed.
            </p>
          )}
          <ErrorText error={save.error} message={saveMessage(save.error)} />
          {problems.length > 0 && (
            <ul className="list-disc pl-5 text-sm text-destructive">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
          {s.open && (
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={save.isPending}>
                Save
              </Button>
              {save.isSuccess && (
                <p role="status" className="flex items-center gap-1 text-sm text-success">
                  <CheckIcon className="size-4" aria-hidden />
                  Saved.
                </p>
              )}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

function StaffSubmissions() {
  const subs = useSubmissions();
  if (subs.isPending) return <CardsSkeleton label="Loading submissions" count={2} />;
  if (subs.isError) return <ErrorText error={subs.error} />;
  if (subs.data.length === 0) return <Empty />;
  return subs.data.map((s) => (
    <Card key={s.id}>
      <CardHeader>
        <CardTitle className="text-base">{s.title}</CardTitle>
        <CardDescription>
          {s.round.name} · {s.entryCount} {s.entryCount === 1 ? 'entry' : 'entries'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Entries id={s.id} fields={s.fields} />
      </CardContent>
    </Card>
  ));
}

function Entries({ id, fields }: { id: string; fields: Pick<Field, 'id' | 'label' | 'type'>[] }) {
  const entries = useSubmissionEntries(id);
  if (entries.isPending) return <p className="text-sm text-muted-foreground">Loading entries…</p>;
  if (entries.isError) return <ErrorText error={entries.error} />;
  if (entries.data.length === 0) {
    return <p className="text-sm text-muted-foreground">No entries yet.</p>;
  }
  return (
    <ul className="grid divide-y">
      {entries.data.map((e) => (
        <li key={e.id} className="grid gap-1 py-3 text-sm first:pt-0 last:pb-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{e.team.name}</span>
            <span className="text-xs text-muted-foreground">{formatIST(e.updatedAt)}</span>
            {e.late && <Badge variant="destructive">Late</Badge>}
          </span>
          <dl className="grid gap-1">
            {fields.map((f) => (
              <div key={f.id} className="grid gap-0.5 sm:grid-cols-[12rem_1fr]">
                <dt className="text-muted-foreground">{f.label}</dt>
                <dd className="break-words whitespace-pre-wrap">
                  {e.answers[f.id] === undefined
                    ? '–'
                    : f.type === 'datetime'
                      ? formatIST(String(e.answers[f.id]))
                      : answerText(e.answers[f.id])}
                </dd>
              </div>
            ))}
          </dl>
        </li>
      ))}
    </ul>
  );
}
