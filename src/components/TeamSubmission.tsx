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
  const entry = entries.data?.find((e) => e.team.id === teamId);
  const fields = [...s.fields].sort((a, b) => a.position - b.position);
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <span className="min-w-0 wrap-anywhere">{s.title}</span>
          {entry?.late && <Badge variant="destructive">Late</Badge>}
        </CardTitle>
        <CardDescription>
          {entry
            ? `${entry.submittedBy ? `Saved by ${entry.submittedBy.name} · ` : ''}${formatIST(entry.updatedAt)}`
            : entries.isPending
              ? 'Loading…'
              : 'Not submitted'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ErrorText error={entries.error} />
        {entries.isPending && <ListSkeleton label="Loading the answers" rows={2} />}
        {entries.data && !entry && (
          <p className="text-sm text-muted-foreground">This team hasn’t submitted this form.</p>
        )}
        {entry && (
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
        )}
      </CardContent>
    </Card>
  );
}
