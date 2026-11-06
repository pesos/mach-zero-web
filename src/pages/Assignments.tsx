import { useMyTeam } from '@eventkit/sdk/react';
import { ClipboardListIcon, InfoIcon } from 'lucide-react';
import { ErrorText } from '@/components/ErrorText';
import { CardsSkeleton } from '@/components/Skeletons';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useWho } from '@/lib/staff';

/** What organisers gave the team (problem statement, table, mentor…), once they release it. */
export function Assignments() {
  const who = useWho();
  if (who.kind === 'participant') return <TeamAssignments />;
  return (
    <Alert>
      <InfoIcon />
      <AlertDescription className="block text-foreground">
        Open your personal link to see what your team was assigned.
      </AlertDescription>
    </Alert>
  );
}

function TeamAssignments() {
  const team = useMyTeam();
  if (team.isPending) return <CardsSkeleton />;
  if (team.isError) return <ErrorText error={team.error} />;
  const list = team.data.assignments;
  if (list.length === 0) {
    return (
      <div className="grid justify-items-center gap-2 rounded-xl border border-dashed bg-card/70 p-8 text-center">
        <ClipboardListIcon className="size-6 text-muted-foreground" aria-hidden />
        <h2 className="font-semibold">Nothing assigned yet</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Your problem statement, table and anything else the organisers give your team show up here
          once they share them.
        </p>
      </div>
    );
  }
  return (
    <div className="grid gap-4">
      {list.map((a) => (
        <Card key={a.listId}>
          <CardHeader>
            <CardDescription>{a.listName}</CardDescription>
            <CardTitle className="text-lg">{a.option?.title ?? a.text}</CardTitle>
          </CardHeader>
          {a.option?.description && (
            <CardContent className="whitespace-pre-line text-sm text-muted-foreground">
              {a.option.description}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
