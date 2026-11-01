import { formatIST } from '@eventkit/sdk';
import { useOutside } from '@eventkit/sdk/react';
import { DoorOpenIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ErrorText } from '@/components/ErrorText';
import { ListSkeleton } from '@/components/Skeletons';
import { StaffOnly } from '@/components/StaffOnly';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { timeAgo } from '@/lib/time';

export function Outside() {
  return (
    <StaffOnly allowed="scan">
      <OutsidePage />
    </StaffOnly>
  );
}

/** Everyone who scanned out at an exit and hasn't scanned back in, longest out first. */
function OutsidePage() {
  const outside = useOutside();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const people = outside.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-xl">
          Outside now
          {outside.data && (
            <Badge variant={people.length > 0 ? 'destructive' : 'secondary'}>
              {people.length} outside
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          People who scanned out at an exit and haven&apos;t scanned back in. Refreshes every 15
          seconds.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <ErrorText error={outside.error} />
        {outside.isPending && <ListSkeleton label="Loading who is outside" />}
        {outside.data && people.length === 0 && (
          <div className="grid justify-items-center gap-2 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            <DoorOpenIcon className="size-6" aria-hidden />
            Everyone who left has come back.
          </div>
        )}
        {people.length > 0 && (
          <div className="overflow-x-auto rounded-lg border">
            <Table aria-label="People outside">
              <TableHeader>
                <TableRow>
                  <TableHead>Participant ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Left</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {people.map((p) => (
                  <TableRow key={p.registrationId}>
                    <TableCell className="font-mono text-xs">{p.participantCode}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.teamName}</TableCell>
                    <TableCell>
                      {p.phone ? (
                        <a className="hover:underline" href={`tel:${p.phone.replace(/\s/g, '')}`}>
                          {p.phone}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {p.reason ?? <span className="text-muted-foreground">—</span>}
                      {p.checkpointName && (
                        <div className="text-xs text-muted-foreground">via {p.checkpointName}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span tabIndex={0} className="whitespace-nowrap tabular-nums">
                            {timeAgo(p.outsideSince, now)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{formatIST(p.outsideSince)}</TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
