import { formatIST, type Schemas } from '@eventkit/sdk';
import { useSubmissionEntries, useSubmissions } from '@eventkit/sdk/react';
import { FileTextIcon } from 'lucide-react';
import { ErrorText } from '@/components/ErrorText';
import { RoundSections } from '@/components/RoundSections';
import { ListSkeleton } from '@/components/Skeletons';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AnswerValue } from '@/pages/SubmissionEntries';

type Submission = Schemas['Submission'];
type Round = Schemas['Round'];

/**
 * What one team handed in for the chosen round and every round before it,
 * newest first: on Round 3, Round 2's and Round 1's forms show below it.
 */
export function TeamSubmission({
  teamId,
  rounds,
  roundId,
}: {
  teamId: string;
  rounds: Round[];
  roundId: string;
}) {
  const forms = useSubmissions();
  if (forms.isPending) return <ListSkeleton label="Loading the submission" rows={3} />;
  if (forms.isError) return <ErrorText error={forms.error} />;
  return (
    <RoundSections rounds={rounds} roundId={roundId}>
      {(r) => <RoundForms teamId={teamId} forms={forms.data.filter((s) => s.round.id === r.id)} />}
    </RoundSections>
  );
}

function RoundForms({ teamId, forms }: { teamId: string; forms: Submission[] }) {
  if (forms.length === 0) {
    return (
      <div className="grid justify-items-center gap-2 rounded-xl border border-dashed bg-card/70 p-8 text-center">
        <FileTextIcon className="size-6 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">This round has no submission forms.</p>
      </div>
    );
  }
  return (
    <div className="grid gap-4">
      {[...forms]
        .sort((a, b) => a.position - b.position)
        .map((s) => (
          <FormEntry key={s.id} submission={s} teamId={teamId} />
        ))}
    </div>
  );
}

function FormEntry({ submission: s, teamId }: { submission: Submission; teamId: string }) {
  const entries = useSubmissionEntries(s.id);
  // Every response the team sent, newest first.
  const mine = (entries.data ?? [])
    .filter((e) => e.team.id === teamId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const fields = [...s.fields].sort((a, b) => a.position - b.position);
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <span className="min-w-0 wrap-anywhere">{s.title}</span>
          {mine.length > 1 && <Badge variant="secondary">{mine.length} responses</Badge>}
        </CardTitle>
        <CardDescription>
          {mine[0]
            ? `${mine[0].submittedBy ? `Sent by ${mine[0].submittedBy.name} · ` : ''}${formatIST(mine[0].createdAt)}`
            : entries.isPending
              ? 'Loading…'
              : 'Not submitted'}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <ErrorText error={entries.error} />
        {entries.isPending && <ListSkeleton label="Loading the answers" rows={2} />}
        {entries.data && mine.length === 0 && (
          <p className="text-sm text-muted-foreground">This team hasn’t submitted this form.</p>
        )}
        {mine.map((entry, i) => (
          <section
            key={entry.id}
            aria-label={mine.length > 1 ? `Response ${mine.length - i}` : undefined}
            className="grid gap-3 border-t pt-4 first:border-t-0 first:pt-0"
          >
            {mine.length > 1 && (
              <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Response {mine.length - i}</span>
                {formatIST(entry.createdAt)}
                {entry.late && <Badge variant="destructive">Late</Badge>}
              </p>
            )}
            {mine.length === 1 && entry.late && (
              <Badge variant="destructive" className="justify-self-start">
                Late
              </Badge>
            )}
            <dl className="grid gap-4">
              {fields.map((f) => (
                <div key={f.id} className="grid gap-1">
                  <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {f.label}
                  </dt>
                  <dd className="min-w-0 text-sm">
                    <AnswerValue field={f} value={entry.answers[f.id]} />
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}
